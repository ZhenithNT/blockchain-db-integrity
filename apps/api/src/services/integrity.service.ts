import {
  Action,
  ActionNames,
  type EvidenceOnChain,
  type Hex,
  type HistoryVersionCheck,
  type IntegrityCheckDetail,
  type IntegrityMismatchReason,
  type IntegrityResultStatus,
  computeDataHash,
} from "@integrity/shared";
import {
  getEvidenceByVersionFromChain,
  getLatestEvidenceFromChain,
  getVersionCountFromChain,
  recordExistsOnChain,
} from "../blockchain.js";
import { prisma } from "../db.js";

export async function checkScoreIntegrity(
  scoreId: number
): Promise<IntegrityCheckDetail> {
  const score = await prisma.score.findUnique({
    where: { id: scoreId },
    include: {
      versions: {
        orderBy: { version: "asc" },
      },
    },
  });

  if (!score) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${scoreId}` };
  }

  const recordKey = score.recordKey as Hex;

  // Tính lại hash độc lập từ trạng thái thực tế hiện tại trong MySQL
  const computedDatabaseHash = computeDataHash({
    studentId: score.studentId,
    courseCode: score.courseCode,
    semester: score.semester,
    score: score.score,
    version: score.version,
    status: score.status,
  });

  let blockchainEvidence: EvidenceOnChain | null = null;
  let result: IntegrityResultStatus = "VALID";
  let reason: IntegrityMismatchReason | undefined;
  let message = "Dữ liệu CSDL khớp hoàn toàn với Bằng chứng toàn vẹn trên Blockchain.";
  const historyChecks: HistoryVersionCheck[] = [];

  try {
    const exists = await recordExistsOnChain(recordKey);

    if (!exists) {
      result = "INVALID";
      reason = "MISSING_ON_CHAIN";
      message = "Không tìm thấy bất kỳ Bằng chứng nào của bản ghi này trên Blockchain.";
    } else {
      blockchainEvidence = await getLatestEvidenceFromChain(recordKey);

      // 1. Kiểm tra version
      if (Number(blockchainEvidence.version) !== score.version) {
        result = "INVALID";
        reason = "VERSION_MISMATCH";
        message = `Lệch phiên bản: CSDL đang ở version ${score.version} nhưng Blockchain ghi nhận version ${blockchainEvidence.version}.`;
      }
      // 2. Kiểm tra Data Hash
      else if (
        computedDatabaseHash.toLowerCase() !==
        blockchainEvidence.dataHash.toLowerCase()
      ) {
        result = "INVALID";
        reason = "HASH_MISMATCH";
        message = `Dữ liệu trong MySQL đã bị can thiệp trái phép! Hash tính từ CSDL (${computedDatabaseHash.slice(0, 10)}...) không khớp với Evidence trên Blockchain (${blockchainEvidence.dataHash.slice(0, 10)}...).`;
      }
      // 3. Kiểm tra Action / Status
      else {
        const chainActionName = ActionNames[blockchainEvidence.action];
        if (score.status === "DELETED" && blockchainEvidence.action !== Action.DELETE) {
          result = "INVALID";
          reason = "ACTION_MISMATCH";
          message = "Trạng thái trong CSDL là DELETED nhưng Blockchain không ghi nhận hành động DELETE.";
        } else if (score.status === "ACTIVE" && blockchainEvidence.action === Action.DELETE) {
          result = "INVALID";
          reason = "ACTION_MISMATCH";
          message = "Trạng thái trong CSDL là ACTIVE nhưng Blockchain đã đánh dấu DELETE.";
        }
      }

      // Kiểm tra toàn bộ lịch sử (Level 2)
      const onChainCount = await getVersionCountFromChain(recordKey);

      for (const verRow of score.versions) {
        let chainVerEvidence: EvidenceOnChain | null = null;
        let matches = false;
        let vReason: IntegrityMismatchReason | undefined;

        if (BigInt(verRow.version) <= onChainCount) {
          try {
            chainVerEvidence = await getEvidenceByVersionFromChain(
              recordKey,
              BigInt(verRow.version)
            );

            const hashMatch =
              verRow.dataHash.toLowerCase() ===
              chainVerEvidence.dataHash.toLowerCase();
            const actionMatch =
              verRow.action.toUpperCase() ===
              ActionNames[chainVerEvidence.action];

            if (!hashMatch) {
              matches = false;
              vReason = "HASH_MISMATCH";
            } else if (!actionMatch) {
              matches = false;
              vReason = "ACTION_MISMATCH";
            } else {
              matches = true;
            }
          } catch {
            matches = false;
            vReason = "MISSING_ON_CHAIN";
          }
        } else {
          matches = false;
          vReason = "MISSING_ON_CHAIN";
        }

        historyChecks.push({
          version: verRow.version,
          databaseHash: verRow.dataHash as Hex,
          blockchainHash: chainVerEvidence?.dataHash || null,
          databaseAction: verRow.action,
          blockchainAction: chainVerEvidence ? ActionNames[chainVerEvidence.action] : null,
          matches,
          reason: vReason,
        });
      }
    }
  } catch (error: any) {
    result = "ERROR";
    message = `Không thể kết nối hoặc truy vấn Blockchain: ${error.message || error}`;
  }

  const checkDetail: IntegrityCheckDetail = {
    scoreId: score.id,
    studentId: score.studentId,
    courseCode: score.courseCode,
    semester: score.semester,
    recordKey,
    databaseScore: score.score,
    databaseVersion: score.version,
    databaseHash: computedDatabaseHash,
    databaseStatus: score.status,
    blockchainHash: blockchainEvidence?.dataHash || null,
    blockchainVersion: blockchainEvidence ? Number(blockchainEvidence.version) : null,
    blockchainAction: blockchainEvidence ? ActionNames[blockchainEvidence.action] : null,
    blockchainTimestamp: blockchainEvidence
      ? new Date(Number(blockchainEvidence.timestamp) * 1000).toISOString()
      : null,
    writerAddress: blockchainEvidence?.writerAddress || null,
    result,
    reason,
    message,
    checkedAt: new Date().toISOString(),
    historyChecks,
  };

  // Lưu lịch sử kiểm tra vào bảng integrity_checks
  await prisma.integrityCheck.create({
    data: {
      scoreId: score.id,
      databaseHash: computedDatabaseHash,
      blockchainHash: blockchainEvidence?.dataHash || null,
      databaseVersion: score.version,
      blockchainVersion: blockchainEvidence ? Number(blockchainEvidence.version) : null,
      result,
      details: JSON.stringify(checkDetail),
      checkedAt: new Date(),
    },
  });

  return checkDetail;
}

export async function checkAllScoresIntegrity() {
  const scores = await prisma.score.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const results: IntegrityCheckDetail[] = [];
  let valid = 0;
  let invalid = 0;
  let pending = 0;
  let error = 0;

  for (const s of scores) {
    const detail = await checkScoreIntegrity(s.id);
    results.push(detail);

    if (detail.result === "VALID") valid++;
    else if (detail.result === "INVALID") invalid++;
    else if (detail.result === "PENDING") pending++;
    else error++;
  }

  return {
    total: scores.length,
    valid,
    invalid,
    pending,
    error,
    results,
  };
}

export async function getRecentCheckResults(limit = 20) {
  const checks = await prisma.integrityCheck.findMany({
    take: limit,
    orderBy: { checkedAt: "desc" },
    include: {
      scoreRef: true,
    },
  });

  return checks.map((c) => ({
    id: c.id,
    scoreId: c.scoreId,
    studentId: c.scoreRef.studentId,
    courseCode: c.scoreRef.courseCode,
    semester: c.scoreRef.semester,
    score: c.scoreRef.score,
    databaseHash: c.databaseHash,
    blockchainHash: c.blockchainHash,
    databaseVersion: c.databaseVersion,
    blockchainVersion: c.blockchainVersion,
    result: c.result,
    checkedAt: c.checkedAt,
    details: JSON.parse(c.details),
  }));
}
