import { computeDataHash, normalizeScore } from "@integrity/shared";
import { config } from "../config.js";
import { prisma } from "../db.js";

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
        "Tính năng tấn công giả lập bị tắt (ENABLE_DEMO_ATTACKS != true). Không thể thực hiện thay đổi trực tiếp.",
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

  // Tính hash mới của dữ liệu giả mạo (để chứng minh CSDL lưu hash giả mạo hoặc khác với blockchain)
  const tamperedDataHash = computeDataHash({
    studentId: score.studentId,
    courseCode: score.courseCode,
    semester: score.semester,
    score: formattedTamperedScore,
    version: score.version,
    status: score.status,
  });

  // Cố tình sửa trực tiếp trong MySQL:
  // - KHÔNG tăng version
  // - KHÔNG tạo Evidence trên blockchain
  // - KHÔNG gọi Smart Contract
  const updatedScore = await prisma.score.update({
    where: { id: scoreId },
    data: {
      score: formattedTamperedScore,
      dataHash: tamperedDataHash,
      // version giữ nguyên!
      // blockchainStatus giữ nguyên!
    },
  });

  // Ghi nhật ký tấn công vào audit_logs
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
        take: 1,
      },
    },
  });

  if (!score) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${scoreId}` };
  }

  const latestLegitimateVersion = score.versions[0];
  if (!latestLegitimateVersion) {
    throw { statusCode: 400, message: "Không tìm thấy phiên bản hợp lệ trong lịch sử để khôi phục." };
  }

  const currentTamperedScore = score.score;

  // Khôi phục lại đúng dữ liệu của phiên bản đã được neo trên Blockchain
  const restoredScore = await prisma.score.update({
    where: { id: scoreId },
    data: {
      score: latestLegitimateVersion.score,
      version: latestLegitimateVersion.version,
      status: latestLegitimateVersion.status,
      dataHash: latestLegitimateVersion.dataHash,
      blockchainStatus: "CONFIRMED",
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: actorId,
      action: "RESTORE_DATABASE",
      target: `scores:${scoreId}`,
      beforeData: JSON.stringify({ score: currentTamperedScore }),
      afterData: JSON.stringify({ score: latestLegitimateVersion.score }),
      ip: clientIp,
    },
  });

  return {
    message: "✓ Đã khôi phục dữ liệu CSDL về trạng thái khớp với Blockchain.",
    score: restoredScore,
    restoredFromVersion: latestLegitimateVersion.version,
  };
}
