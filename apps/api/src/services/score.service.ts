import {
  Action,
  type Hex,
  computeActorHash,
  computeDataHash,
  computeRecordKey,
  normalizeScore,
} from "@integrity/shared";
import { appendEvidenceOnChain } from "../blockchain.js";
import { prisma } from "../db.js";

export async function getScores(filters: {
  search?: string;
  status?: string;
  semester?: string;
}) {
  const where: any = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status.toUpperCase();
  }

  if (filters.semester) {
    where.semester = filters.semester;
  }

  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { studentId: { contains: s } },
      { courseCode: { contains: s } },
      { semester: { contains: s } },
    ];
  }

  const scores = await prisma.score.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      integrityChecks: {
        orderBy: { checkedAt: "desc" },
        take: 1,
      },
    },
  });

  return scores.map((sc) => ({
    ...sc,
    latestCheck: sc.integrityChecks[0] || null,
  }));
}

export async function getScoreById(id: number) {
  const score = await prisma.score.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { version: "asc" },
      },
      integrityChecks: {
        orderBy: { checkedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!score) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${id}` };
  }

  return {
    ...score,
    versions: score.versions.map((v) => ({
      ...v,
      blockNumber: v.blockNumber !== null ? v.blockNumber.toString() : null,
    })),
  };
}

export async function getScoreHistory(id: number) {
  const score = await prisma.score.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { version: "asc" },
      },
    },
  });

  if (!score) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${id}` };
  }

  return score.versions.map((v) => ({
    ...v,
    blockNumber: v.blockNumber !== null ? v.blockNumber.toString() : null,
  }));
}

export async function createScore(
  data: {
    studentId: string;
    courseCode: string;
    semester: string;
    score: string | number;
  },
  actorId: string,
  clientIp = "127.0.0.1"
) {
  const studentId = data.studentId.trim();
  const courseCode = data.courseCode.trim();
  const semester = data.semester.trim();
  const formattedScore = normalizeScore(data.score);

  // Kiểm tra trùng bản ghi trong database
  const existing = await prisma.score.findUnique({
    where: {
      unique_student_course_semester: {
        studentId,
        courseCode,
        semester,
      },
    },
  });

  if (existing) {
    if (existing.status === "DELETED") {
      throw {
        statusCode: 400,
        message:
          "Bản ghi này đã tồn tại và đã bị xóa (soft delete) trên Blockchain. Theo nguyên tắc bất biến, không thể tạo lại cùng một định danh.",
      };
    }
    throw {
      statusCode: 400,
      message: `Bản ghi điểm của sinh viên '${studentId}' cho môn '${courseCode}' học kỳ '${semester}' đã tồn tại.`,
    };
  }

  const recordKey = computeRecordKey({ studentId, courseCode, semester });
  const version = 1;
  const status = "ACTIVE";

  const dataHash = computeDataHash({
    studentId,
    courseCode,
    semester,
    score: formattedScore,
    version,
    status,
  });

  const actorHash = computeActorHash(actorId);

  // 1. Ghi bằng chứng lên Smart Contract trước
  let txReceipt: { transactionHash: Hex; blockNumber: bigint; blockchainTimestamp: Date };
  try {
    txReceipt = await appendEvidenceOnChain(
      recordKey,
      dataHash,
      actorHash,
      BigInt(version),
      Action.CREATE
    );
  } catch (bcError: any) {
    throw {
      statusCode: 502,
      message: `Ghi bằng chứng lên Blockchain thất bại: ${bcError.message || bcError}`,
    };
  }

  // 2. Ghi dữ liệu vào MySQL sau khi Blockchain đã xác nhận
  const createdScore = await prisma.$transaction(async (tx) => {
    const scoreRow = await tx.score.create({
      data: {
        studentId,
        courseCode,
        semester,
        score: formattedScore,
        version,
        status,
        recordKey,
        dataHash,
        blockchainStatus: "CONFIRMED",
      },
    });

    await tx.scoreVersion.create({
      data: {
        scoreId: scoreRow.id,
        version,
        score: formattedScore,
        status,
        action: "CREATE",
        dataHash,
        actorHash,
        transactionHash: txReceipt.transactionHash,
        blockNumber: txReceipt.blockNumber,
        blockchainTimestamp: txReceipt.blockchainTimestamp,
        syncStatus: "CONFIRMED",
      },
    });

    await tx.auditLog.create({
      data: {
        actor: actorId,
        action: "CREATE",
        target: `scores:${scoreRow.id}`,
        afterData: JSON.stringify(scoreRow),
        ip: clientIp,
      },
    });

    return scoreRow;
  });

  return {
    score: createdScore,
    transactionHash: txReceipt.transactionHash,
    blockNumber: txReceipt.blockNumber.toString(),
    blockchainTimestamp: txReceipt.blockchainTimestamp,
  };
}

export async function updateScore(
  id: number,
  newScoreValue: string | number,
  actorId: string,
  clientIp = "127.0.0.1"
) {
  const currentScore = await prisma.score.findUnique({
    where: { id },
  });

  if (!currentScore) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${id}` };
  }

  if (currentScore.status === "DELETED") {
    throw {
      statusCode: 400,
      message: "Không thể cập nhật bản ghi đã bị xóa (DELETED).",
    };
  }

  const formattedNewScore = normalizeScore(newScoreValue);
  const nextVersion = currentScore.version + 1;
  const status = "ACTIVE";

  const newDataHash = computeDataHash({
    studentId: currentScore.studentId,
    courseCode: currentScore.courseCode,
    semester: currentScore.semester,
    score: formattedNewScore,
    version: nextVersion,
    status,
  });

  const actorHash = computeActorHash(actorId);

  // 1. Ghi bằng chứng phiên bản mới lên Blockchain
  let txReceipt: { transactionHash: Hex; blockNumber: bigint; blockchainTimestamp: Date };
  try {
    txReceipt = await appendEvidenceOnChain(
      currentScore.recordKey as Hex,
      newDataHash,
      actorHash,
      BigInt(nextVersion),
      Action.UPDATE
    );
  } catch (bcError: any) {
    throw {
      statusCode: 502,
      message: `Ghi cập nhật lên Blockchain thất bại: ${bcError.message || bcError}`,
    };
  }

  // 2. Cập nhật trạng thái hiện tại và thêm dòng lịch sử append-only trong MySQL
  const updatedScore = await prisma.$transaction(async (tx) => {
    const updated = await tx.score.update({
      where: { id },
      data: {
        score: formattedNewScore,
        version: nextVersion,
        dataHash: newDataHash,
        blockchainStatus: "CONFIRMED",
      },
    });

    await tx.scoreVersion.create({
      data: {
        scoreId: id,
        version: nextVersion,
        score: formattedNewScore,
        status,
        action: "UPDATE",
        dataHash: newDataHash,
        actorHash,
        transactionHash: txReceipt.transactionHash,
        blockNumber: txReceipt.blockNumber,
        blockchainTimestamp: txReceipt.blockchainTimestamp,
        syncStatus: "CONFIRMED",
      },
    });

    await tx.auditLog.create({
      data: {
        actor: actorId,
        action: "UPDATE",
        target: `scores:${id}`,
        beforeData: JSON.stringify(currentScore),
        afterData: JSON.stringify(updated),
        ip: clientIp,
      },
    });

    return updated;
  });

  return {
    score: updatedScore,
    transactionHash: txReceipt.transactionHash,
    blockNumber: txReceipt.blockNumber.toString(),
    blockchainTimestamp: txReceipt.blockchainTimestamp,
  };
}

export async function deleteScore(
  id: number,
  actorId: string,
  clientIp = "127.0.0.1"
) {
  const currentScore = await prisma.score.findUnique({
    where: { id },
  });

  if (!currentScore) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${id}` };
  }

  if (currentScore.status === "DELETED") {
    throw {
      statusCode: 400,
      message: "Bản ghi này đã ở trạng thái DELETED.",
    };
  }

  const nextVersion = currentScore.version + 1;
  const status = "DELETED";

  const deleteDataHash = computeDataHash({
    studentId: currentScore.studentId,
    courseCode: currentScore.courseCode,
    semester: currentScore.semester,
    score: currentScore.score,
    version: nextVersion,
    status,
  });

  const actorHash = computeActorHash(actorId);

  // 1. Neo sự kiện DELETE lên Blockchain
  let txReceipt: { transactionHash: Hex; blockNumber: bigint; blockchainTimestamp: Date };
  try {
    txReceipt = await appendEvidenceOnChain(
      currentScore.recordKey as Hex,
      deleteDataHash,
      actorHash,
      BigInt(nextVersion),
      Action.DELETE
    );
  } catch (bcError: any) {
    throw {
      statusCode: 502,
      message: `Ghi soft delete lên Blockchain thất bại: ${bcError.message || bcError}`,
    };
  }

  // 2. Soft delete trong database (không xóa vật lý)
  const deletedScore = await prisma.$transaction(async (tx) => {
    const updated = await tx.score.update({
      where: { id },
      data: {
        status: "DELETED",
        version: nextVersion,
        dataHash: deleteDataHash,
        blockchainStatus: "CONFIRMED",
      },
    });

    await tx.scoreVersion.create({
      data: {
        scoreId: id,
        version: nextVersion,
        score: currentScore.score,
        status: "DELETED",
        action: "DELETE",
        dataHash: deleteDataHash,
        actorHash,
        transactionHash: txReceipt.transactionHash,
        blockNumber: txReceipt.blockNumber,
        blockchainTimestamp: txReceipt.blockchainTimestamp,
        syncStatus: "CONFIRMED",
      },
    });

    await tx.auditLog.create({
      data: {
        actor: actorId,
        action: "DELETE",
        target: `scores:${id}`,
        beforeData: JSON.stringify(currentScore),
        afterData: JSON.stringify(updated),
        ip: clientIp,
      },
    });

    return updated;
  });

  return {
    score: deletedScore,
    transactionHash: txReceipt.transactionHash,
    blockNumber: txReceipt.blockNumber.toString(),
    blockchainTimestamp: txReceipt.blockchainTimestamp,
  };
}
