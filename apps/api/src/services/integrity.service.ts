import {
  type HistoryVersionCheck,
  type Hex,
  type IntegrityCheckDetail,
  type IntegrityMismatchReason,
  type SignerIdentity,
  computeDataHash,
  sameHash,
} from "@integrity/shared";
import { getAllRecordKeysFromChain, getHistoryFromChain, txProvesEvidence } from "../blockchain.js";
import { prisma } from "../db.js";
import { getAddressBook, resolveSigner } from "./wallet.service.js";

/**
 * KIỂM TRA TOÀN VẸN
 *
 * Với mỗi bản ghi: tính lại hash từ nội dung THẬT trong MySQL (không tin cột data_hash),
 * rồi so với bằng chứng trên blockchain. Đồng thời xác minh từng phiên bản lịch sử,
 * mã giao dịch và người ký (địa chỉ ví đọc từ chain, không giả được).
 */

type Book = Map<string, SignerIdentity>;

const ts = (t: bigint) => new Date(Number(t) * 1000).toISOString();

async function checkOne(scoreId: number, book: Book): Promise<IntegrityCheckDetail> {
  const row = await prisma.score.findUnique({
    where: { id: scoreId },
    include: { versions: { orderBy: { version: "asc" } } },
  });
  if (!row) throw { statusCode: 404, message: `Không tìm thấy điểm ID ${scoreId}` };

  const recordKey = row.recordKey as Hex;
  const base = { studentId: row.studentId, courseCode: row.courseCode, semester: row.semester };
  const currentHash = computeDataHash({ ...base, score: row.score, version: row.version });

  let result: IntegrityCheckDetail["result"] = "VALID";
  let reason: IntegrityMismatchReason | undefined;
  let message = "Khớp với bằng chứng trên blockchain.";
  let latest: Awaited<ReturnType<typeof getHistoryFromChain>>[number] | null = null;
  const historyChecks: HistoryVersionCheck[] = [];

  try {
    const chain = await getHistoryFromChain(recordKey);
    latest = chain.length > 0 ? chain[chain.length - 1] : null;

    // 1. Điểm hiện tại so với bằng chứng mới nhất
    if (!latest) {
      result = "INVALID";
      reason = "MISSING_ON_CHAIN";
      message = "Blockchain không có bằng chứng cho bản ghi này. Có thể bản ghi bị chèn trực tiếp vào MySQL.";
    } else if (Number(latest.version) !== row.version) {
      result = "INVALID";
      reason = "VERSION_MISMATCH";
      message = `MySQL ở v${row.version}, blockchain ở v${latest.version}.`;
    } else if (!sameHash(currentHash, latest.dataHash)) {
      result = "INVALID";
      reason = "HASH_MISMATCH";
      message = `Hash tính từ MySQL (${currentHash.slice(0, 10)}…) khác hash trên blockchain (${latest.dataHash.slice(0, 10)}…).`;
    }

    // 2. Từng phiên bản lịch sử
    const maxVersion = Math.max(chain.length, ...row.versions.map((v) => v.version), 0);
    for (let version = 1; version <= maxVersion; version++) {
      const v = row.versions.find((x) => x.version === version) || null;
      const ev = chain[version - 1] || null;
      const dbHash = v ? computeDataHash({ ...base, score: v.score, version: v.version }) : null;
      const writer = ev ? resolveSigner(book, ev.writer) : null;

      let txOk: boolean | null = null;
      if (v?.transactionHash && ev) {
        txOk = await txProvesEvidence(v.transactionHash as Hex, recordKey, version);
      }

      let vReason: IntegrityMismatchReason | undefined;
      if (!ev) vReason = "FORGED_VERSION";
      else if (!v) vReason = "HISTORY_MISSING";
      else if (!sameHash(dbHash, ev.dataHash)) vReason = "HASH_MISMATCH";
      else if (txOk === false) vReason = "TX_MISMATCH";
      else if (writer && writer.username === null) vReason = "UNKNOWN_SIGNER";

      historyChecks.push({
        version,
        databaseHash: dbHash,
        blockchainHash: ev?.dataHash ?? null,
        writer,
        txOk,
        matches: !vReason,
        reason: vReason,
      });
    }

    const failed = historyChecks.find((h) => !h.matches);
    if (failed && result === "VALID") {
      result = "INVALID";
      reason = failed.reason;
      message =
        failed.reason === "FORGED_VERSION"
          ? `v${failed.version} chưa từng được ghi lên blockchain.`
          : failed.reason === "HISTORY_MISSING"
            ? `v${failed.version} đã bị xóa khỏi MySQL, blockchain vẫn còn bằng chứng.`
            : failed.reason === "TX_MISMATCH"
              ? `Mã giao dịch của v${failed.version} không trỏ tới đúng bằng chứng.`
              : failed.reason === "UNKNOWN_SIGNER"
                ? `v${failed.version} do một ví lạ ký (không thuộc admin nào).`
                : `Lịch sử v${failed.version} không khớp bằng chứng trên blockchain.`;
    }
  } catch (err: any) {
    result = "ERROR";
    reason = undefined;
    message = `Không truy vấn được blockchain: ${err?.message || err}`;
  }

  const detail: IntegrityCheckDetail = {
    scoreId: row.id,
    ...base,
    recordKey,
    databaseScore: row.score,
    databaseVersion: row.version,
    databaseHash: currentHash,
    blockchainHash: latest?.dataHash ?? null,
    blockchainVersion: latest ? Number(latest.version) : null,
    blockchainTimestamp: latest ? ts(latest.timestamp) : null,
    writer: latest ? resolveSigner(book, latest.writer) : null,
    result,
    reason,
    message,
    checkedAt: new Date().toISOString(),
    historyChecks,
  };

  await prisma.integrityCheck.create({
    data: {
      scoreId: row.id,
      recordKey,
      databaseHash: currentHash,
      blockchainHash: latest?.dataHash ?? null,
      databaseVersion: row.version,
      blockchainVersion: latest ? Number(latest.version) : null,
      result,
      reason: reason ?? null,
      details: JSON.stringify(detail),
    },
  });
  return detail;
}

export async function checkScoreIntegrity(scoreId: number) {
  return checkOne(scoreId, await getAddressBook());
}

/** Quét toàn bộ MySQL, rồi đối soát ngược từ blockchain để tìm bản ghi bị xóa vật lý. */
export async function checkAllScoresIntegrity() {
  const book = await getAddressBook();
  const scores = await prisma.score.findMany({ select: { id: true, recordKey: true } });
  const results: IntegrityCheckDetail[] = [];
  for (const s of scores) {
    results.push(await checkOne(s.id, book));
  }

  // Chiều ngược: recordKey có trên chain nhưng không còn trong MySQL.
  const missing: Array<{
    recordKey: Hex;
    blockchainVersion: number;
    blockchainHash: Hex;
    timestamp: string;
    writer: SignerIdentity | null;
  }> = [];
  let chainError: string | null = null;
  try {
    const inDb = new Set(scores.map((s) => s.recordKey.toLowerCase()));
    for (const key of await getAllRecordKeysFromChain()) {
      if (inDb.has(key.toLowerCase())) continue;
      const history = await getHistoryFromChain(key);
      const last = history[history.length - 1];
      missing.push({
        recordKey: key,
        blockchainVersion: Number(last.version),
        blockchainHash: last.dataHash,
        timestamp: ts(last.timestamp),
        writer: resolveSigner(book, last.writer),
      });
    }
  } catch (err: any) {
    chainError = err?.message || String(err);
  }

  const valid = results.filter((r) => r.result === "VALID").length;
  const invalid = results.filter((r) => r.result === "INVALID").length;
  const errors = results.filter((r) => r.result === "ERROR").length;

  return {
    summary: { total: results.length, valid, invalid, errors, missing: missing.length },
    results,
    missing,
    chainError,
    checkedAt: new Date().toISOString(),
  };
}

export async function getRecentCheckResults(limit = 20) {
  const rows = await prisma.integrityCheck.findMany({
    orderBy: { checkedAt: "desc" },
    take: Math.min(limit, 200),
    include: { scoreRef: { select: { studentId: true, courseCode: true, semester: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    scoreId: r.scoreId,
    studentId: r.scoreRef?.studentId ?? null,
    courseCode: r.scoreRef?.courseCode ?? null,
    semester: r.scoreRef?.semester ?? null,
    result: r.result,
    reason: r.reason,
    databaseVersion: r.databaseVersion,
    blockchainVersion: r.blockchainVersion,
    checkedAt: r.checkedAt,
  }));
}
