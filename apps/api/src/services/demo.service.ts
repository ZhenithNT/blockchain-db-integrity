import {
  Action,
  computeActorHash,
  computeDataHash,
  normalizeScore,
} from "@integrity/shared";
import {
  appendEvidenceOnChain,
  getEvidenceByVersionFromChain,
  getLatestEvidenceFromChain,
} from "../blockchain.js";
import { config } from "../config.js";
import { prisma } from "../db.js";

/**
 * Giả mạo điểm hiện tại trong MySQL (Sửa trực tiếp cột score không qua Blockchain)
 */
export async function tamperScore(
  scoreId: number,
  tamperedScoreValue: string | number,
  actorId: string,
  clientIp = "127.0.0.1"
) {
  if (!config.enableDemoAttacks) {
    throw {
      statusCode: 403,
      message:
        "Tính năng tấn công giả lập bị tắt (ENABLE_DEMO_ATTACKS != true).",
    };
  }

  const score = await prisma.score.findUnique({
    where: { id: scoreId },
  });

  if (!score) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${scoreId}` };
  }

  const formattedTamperedScore = normalizeScore(tamperedScoreValue);
  const oldScore = score.score;

  // Tính hash mới của dữ liệu giả mạo
  const tamperedDataHash = computeDataHash({
    studentId: score.studentId,
    courseCode: score.courseCode,
    semester: score.semester,
    score: formattedTamperedScore,
    version: score.version,
    status: score.status,
  });

  // Trực tiếp update MySQL: KHÔNG gọi Smart Contract, KHÔNG tăng version
  const updatedScore = await prisma.score.update({
    where: { id: scoreId },
    data: {
      score: formattedTamperedScore,
      dataHash: tamperedDataHash,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: `${actorId} (ATTACKER_SIMULATION)`,
      action: "TAMPER_DATABASE",
      target: `scores:${scoreId}`,
      beforeData: JSON.stringify({ score: oldScore, version: score.version }),
      afterData: JSON.stringify({
        score: formattedTamperedScore,
        version: score.version,
        tampered: true,
      }),
      ip: clientIp,
    },
  });

  return {
    warning: "⚠️ Dữ liệu điểm trong MySQL đã bị can thiệp trực tiếp mà không thông qua Blockchain!",
    score: updatedScore,
    originalScore: oldScore,
    tamperedScore: formattedTamperedScore,
  };
}

/**
 * Giả mạo dữ liệu lịch sử trong score_versions để chứng minh kiểm tra Level 2 phát hiện được
 */
export async function tamperHistory(
  scoreId: number,
  version: number,
  tamperedScoreValue: string | number,
  actorId: string,
  clientIp = "127.0.0.1"
) {
  if (!config.enableDemoAttacks) {
    throw {
      statusCode: 403,
      message: "Tính năng tấn công giả lập bị tắt.",
    };
  }

  const scoreVer = await prisma.scoreVersion.findUnique({
    where: {
      unique_score_version: {
        scoreId,
        version,
      },
    },
  });

  if (!scoreVer) {
    throw { statusCode: 404, message: `Không tìm thấy phiên bản Version ${version} của điểm ${scoreId}` };
  }

  const formattedTamperedScore = normalizeScore(tamperedScoreValue);
  const oldScore = scoreVer.score;

  const updatedVer = await prisma.scoreVersion.update({
    where: { id: scoreVer.id },
    data: {
      score: formattedTamperedScore,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: `${actorId} (ATTACKER_SIMULATION)`,
      action: "TAMPER_HISTORY_VERSION",
      target: `score_versions:${scoreVer.id}`,
      beforeData: JSON.stringify({ version, score: oldScore }),
      afterData: JSON.stringify({ version, score: formattedTamperedScore }),
      ip: clientIp,
    },
  });

  return {
    warning: `⚠️ Đã sửa lén phiên bản lịch sử Version ${version} trong bảng score_versions!`,
    versionRow: updatedVer,
    originalScore: oldScore,
    tamperedScore: formattedTamperedScore,
  };
}

/**
 * Xóa vật lý trực tiếp dòng trong MySQL để chứng minh Blockchain phát hiện MISSING_IN_DATABASE
 */
export async function tamperPhysicalDelete(
  scoreId: number,
  actorId: string,
  clientIp = "127.0.0.1"
) {
  if (!config.enableDemoAttacks) {
    throw {
      statusCode: 403,
      message: "Tính năng tấn công giả lập bị tắt.",
    };
  }

  const score = await prisma.score.findUnique({
    where: { id: scoreId },
  });

  if (!score) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${scoreId}` };
  }

  // Xóa vật lý khỏi MySQL
  await prisma.score.delete({
    where: { id: scoreId },
  });

  await prisma.auditLog.create({
    data: {
      actor: `${actorId} (ATTACKER_SIMULATION)`,
      action: "PHYSICAL_DELETE_DATABASE",
      target: `scores:${scoreId}`,
      beforeData: JSON.stringify({ recordKey: score.recordKey, studentId: score.studentId }),
      ip: clientIp,
    },
  });

  return {
    warning: `💥 Đã xóa vật lý bản ghi điểm ID ${scoreId} (Khóa ${score.recordKey.slice(0, 14)}...) khỏi MySQL!`,
    recordKey: score.recordKey,
  };
}

/**
 * Khôi phục an toàn: Đối chiếu với bằng chứng Smart Contract trước khi ghi đè lại MySQL
 */
export async function restoreScore(
  scoreId: number,
  actorId: string,
  clientIp = "127.0.0.1"
) {
  const score = await prisma.score.findUnique({
    where: { id: scoreId },
    include: {
      versions: {
        orderBy: { version: "desc" },
      },
    },
  });

  if (!score) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${scoreId}` };
  }

  // Tìm phiên bản lịch sử hợp lệ nhất mà hash tính lại khớp với Blockchain
  let matchedVersion: (typeof score.versions)[0] | null = null;

  for (const ver of score.versions) {
    try {
      const chainEvidence = await getEvidenceByVersionFromChain(
        score.recordKey as `0x${string}`,
        BigInt(ver.version)
      );

      const recomputedHash = computeDataHash({
        studentId: score.studentId,
        courseCode: score.courseCode,
        semester: score.semester,
        score: ver.score,
        version: ver.version,
        status: ver.status,
      });

      if (recomputedHash.toLowerCase() === chainEvidence.dataHash.toLowerCase()) {
        matchedVersion = ver;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!matchedVersion) {
    // Fallback sang lấy phiên bản mới nhất từ Smart Contract
    const latestChainEvidence = await getLatestEvidenceFromChain(score.recordKey as `0x${string}`);
    const ver = score.versions.find((v) => BigInt(v.version) === latestChainEvidence.version);
    if (ver) {
      matchedVersion = ver;
    } else {
      throw {
        statusCode: 400,
        message: "Không tìm thấy phiên bản lịch sử nào thỏa mãn tính toàn vẹn với Blockchain.",
      };
    }
  }

  const currentTamperedScore = score.score;

  // Nếu bản ghi hiện tại đang bị DELETED nhưng cần khôi phục lại (RESTORE)
  let nextVersion = matchedVersion.version;
  let nextStatus = matchedVersion.status;
  let finalTxHash = matchedVersion.transactionHash;

  if (score.status === "DELETED") {
    nextVersion = score.version + 1;
    nextStatus = "ACTIVE";

    const restoreHash = computeDataHash({
      studentId: score.studentId,
      courseCode: score.courseCode,
      semester: score.semester,
      score: matchedVersion.score,
      version: nextVersion,
      status: nextStatus,
    });

    const actorHash = computeActorHash(actorId);

    // Ghi nhận hành động RESTORE trên Blockchain
    const receipt = await appendEvidenceOnChain(
      score.recordKey as `0x${string}`,
      restoreHash,
      actorHash,
      BigInt(nextVersion),
      Action.RESTORE
    );

    finalTxHash = receipt.transactionHash;

    await prisma.scoreVersion.create({
      data: {
        scoreId: score.id,
        version: nextVersion,
        score: matchedVersion.score,
        attendanceScore: matchedVersion.attendanceScore,
        midtermScore: matchedVersion.midtermScore,
        finalScore: matchedVersion.finalScore,
        status: "ACTIVE",
        action: "RESTORE",
        dataHash: restoreHash,
        actorHash,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        blockchainTimestamp: receipt.blockchainTimestamp,
        syncStatus: "CONFIRMED",
      },
    });
  }

  const restoredScore = await prisma.score.update({
    where: { id: scoreId },
    data: {
      score: matchedVersion.score,
      attendanceScore: matchedVersion.attendanceScore,
      midtermScore: matchedVersion.midtermScore,
      finalScore: matchedVersion.finalScore,
      version: nextVersion,
      status: nextStatus,
      dataHash: matchedVersion.dataHash,
      blockchainStatus: "CONFIRMED",
      latestTxHash: finalTxHash,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: actorId,
      action: "RESTORE_DATABASE",
      target: `scores:${scoreId}`,
      beforeData: JSON.stringify({ score: currentTamperedScore }),
      afterData: JSON.stringify({
        score: matchedVersion.score,
        version: nextVersion,
        restoredFrom: matchedVersion.version,
      }),
      ip: clientIp,
    },
  });

  return {
    message: "✓ Đã khôi phục dữ liệu CSDL về trạng thái chuẩn xác thực với Blockchain.",
    score: restoredScore,
    restoredFromVersion: matchedVersion.version,
  };
}
