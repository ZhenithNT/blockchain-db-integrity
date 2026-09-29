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
  getAllRecordKeysFromChain,
  getEvidenceByVersionFromChain,
  getLatestEvidenceFromChain,
  getVersionCountFromChain,
  recordExistsOnChain,
} from "../blockchain.js";
import { prisma } from "../db.js";

/**
 * Kiểm tra tính toàn vẹn chuyên sâu cho một bản ghi điểm:
 * 1. Tính lại hash hiện tại từ cột scores
 * 2. Tính lại hash của TỪNG phiên bản lịch sử từ nội dung score_versions
 * 3. Nếu bất kỳ version nào sai -> toàn bộ kết quả là INVALID
 */
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

  // 1. Tính lại hash độc lập từ trạng thái thực tế hiện tại trong MySQL
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

      // A. Kiểm tra version hiện tại
      if (Number(blockchainEvidence.version) !== score.version) {
        result = "INVALID";
        reason = "VERSION_MISMATCH";
        message = `Lệch phiên bản: CSDL đang ở version ${score.version} nhưng Blockchain ghi nhận version ${blockchainEvidence.version}.`;
      }
      // B. Kiểm tra Data Hash tính lại từ MySQL vs Blockchain Evidence
      else if (
        computedDatabaseHash.toLowerCase() !==
        blockchainEvidence.dataHash.toLowerCase()
      ) {
        result = "INVALID";
        reason = "HASH_MISMATCH";
        message = `Dữ liệu trong MySQL đã bị can thiệp trái phép! Hash tính từ CSDL (${computedDatabaseHash.slice(0, 10)}...) không khớp với Evidence trên Blockchain (${blockchainEvidence.dataHash.slice(0, 10)}...).`;
      }
      // C. Kiểm tra Action / Status
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

      // D. Kiểm tra toàn bộ lịch sử (Level 2 History Check)
      // TÍNH LẠI HASH TỪ NỘI DUNG TỪNG DÒNG, KHÔNG DÙNG HASH LƯU SẴN
      const onChainCount = await getVersionCountFromChain(recordKey);

      for (const verRow of score.versions) {
        let chainVerEvidence: EvidenceOnChain | null = null;
        let matches = false;
        let vReason: IntegrityMismatchReason | undefined;

        // Tính lại hash độc lập từ nội dung thực tế của phiên bản lịch sử
        const recomputedVerHash = computeDataHash({
          studentId: score.studentId,
          courseCode: score.courseCode,
          semester: score.semester,
          score: verRow.score,
          version: verRow.version,
          status: verRow.status,
        });

        if (BigInt(verRow.version) <= onChainCount) {
          try {
            chainVerEvidence = await getEvidenceByVersionFromChain(
              recordKey,
              BigInt(verRow.version)
            );

            const hashMatch =
              recomputedVerHash.toLowerCase() ===
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
          databaseHash: recomputedVerHash as Hex,
          blockchainHash: chainVerEvidence?.dataHash || null,
          databaseAction: verRow.action,
          blockchainAction: chainVerEvidence ? ActionNames[chainVerEvidence.action] : null,
          matches,
          reason: vReason,
        });
      }

      // E. Tổng hợp: Chỉ cần 1 version lịch sử sai, TOÀN BỘ kết quả phải là INVALID!
      const failedHistory = historyChecks.find((h) => !h.matches);
      if (failedHistory && result === "VALID") {
        result = "INVALID";
        reason = failedHistory.reason || "HASH_MISMATCH";
        message = `Phát hiện can thiệp lịch sử tại Version ${failedHistory.version}! Dữ liệu lịch sử trong CSDL không khớp với Bằng chứng Blockchain.`;
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
    offeringCode: score.offeringCode || undefined,
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

  // Lưu kết quả vào bảng integrity_checks
  await prisma.integrityCheck.create({
    data: {
      scoreId: score.id,
      recordKey,
      databaseHash: computedDatabaseHash,
      blockchainHash: blockchainEvidence?.dataHash || null,
      databaseVersion: score.version,
      blockchainVersion: blockchainEvidence ? Number(blockchainEvidence.version) : null,
      result,
      reason,
      details: JSON.stringify(checkDetail),
    },
  });

  return checkDetail;
}

/**
 * Quét toàn bộ CSDL và đối chiếu ngược từ Blockchain (Phát hiện cả xóa vật lý)
 */
export async function checkAllScoresIntegrity() {
  const scores = await prisma.score.findMany({
    select: { id: true, recordKey: true },
  });

  const dbRecordKeys = new Set(scores.map((s) => s.recordKey.toLowerCase()));
  const results: IntegrityCheckDetail[] = [];

  // 1. Quét từng bản ghi hiện có trong MySQL
  for (const s of scores) {
    try {
      const detail = await checkScoreIntegrity(s.id);
      results.push(detail);
    } catch (err: any) {
      results.push({
        scoreId: s.id,
        studentId: "UNKNOWN",
        courseCode: "UNKNOWN",
        semester: "UNKNOWN",
        recordKey: s.recordKey as Hex,
        databaseScore: "0.00",
        databaseVersion: 0,
        databaseHash: "0x" as Hex,
        databaseStatus: "UNKNOWN",
        blockchainHash: null,
        blockchainVersion: null,
        blockchainAction: null,
        blockchainTimestamp: null,
        writerAddress: null,
        result: "ERROR",
        message: err.message || String(err),
        checkedAt: new Date().toISOString(),
      });
    }
  }

  // 2. Đối chiếu ngược từ Blockchain để PHÁT HIỆN XÓA VẬT LÝ (MISSING_IN_DATABASE)
  try {
    const chainRecordKeys = await getAllRecordKeysFromChain();

    for (const chainKey of chainRecordKeys) {
      if (!dbRecordKeys.has(chainKey.toLowerCase())) {
        // Khóa tồn tại trên Blockchain nhưng đã bị DROP/DELETE vật lý khỏi MySQL!
        const chainEvidence = await getLatestEvidenceFromChain(chainKey);

        const missingAlert: IntegrityCheckDetail = {
          scoreId: 0,
          studentId: "BẢN GHI BỊ XÓA KHỎI CSDL",
          courseCode: "UNKNOWN",
          semester: "UNKNOWN",
          recordKey: chainKey,
          databaseScore: "N/A",
          databaseVersion: 0,
          databaseHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
          databaseStatus: "MISSING_IN_DATABASE",
          blockchainHash: chainEvidence.dataHash,
          blockchainVersion: Number(chainEvidence.version),
          blockchainAction: ActionNames[chainEvidence.action],
          blockchainTimestamp: new Date(Number(chainEvidence.timestamp) * 1000).toISOString(),
          writerAddress: chainEvidence.writerAddress,
          result: "INVALID",
          reason: "MISSING_IN_DATABASE",
          message: `🚨 PHÁT HIỆN XÓA VẬT LÝ: Bản ghi định danh ${chainKey.slice(0, 14)}... có bằng chứng trên Blockchain (Version ${chainEvidence.version}) nhưng đã biến mất hoàn toàn khỏi MySQL!`,
          checkedAt: new Date().toISOString(),
          historyChecks: [],
        };

        results.push(missingAlert);

        await prisma.integrityCheck.create({
          data: {
            recordKey: chainKey,
            result: "INVALID",
            reason: "MISSING_IN_DATABASE",
            blockchainHash: chainEvidence.dataHash,
            blockchainVersion: Number(chainEvidence.version),
            details: JSON.stringify(missingAlert),
          },
        });
      }
    }
  } catch (chainErr) {
    console.warn("Không thể quét danh sách recordKey trên Blockchain:", chainErr);
  }

  const validCount = results.filter((r) => r.result === "VALID").length;
  const invalidCount = results.filter((r) => r.result === "INVALID").length;
  const pendingCount = results.filter((r) => r.result === "PENDING").length;
  const errorCount = results.filter((r) => r.result === "ERROR").length;

  return {
    total: results.length,
    valid: validCount,
    invalid: invalidCount,
    pending: pendingCount,
    error: errorCount,
    checkedAt: new Date().toISOString(),
    results,
  };
}

export async function getRecentCheckResults(limit = 20) {
  return await prisma.integrityCheck.findMany({
    orderBy: { checkedAt: "desc" },
    take: limit,
    include: {
      scoreRef: {
        select: {
          studentId: true,
          courseCode: true,
          semester: true,
          offeringCode: true,
          score: true,
        },
      },
    },
  });
}
