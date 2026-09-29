import {
  Action,
  computeActorHash,
  computeDataHash,
  normalizeScore,
  calculateLetterGrade,
} from "@integrity/shared";
import { appendEvidenceOnChain } from "../blockchain.js";
import { prisma } from "../db.js";

export async function createChangeRequest(data: {
  scoreId: number;
  proposedScore: number | string;
  proposedAttendance?: number;
  proposedMidterm?: number;
  proposedFinal?: number;
  reason: string;
  evidenceAttachment?: string;
  requestedBy: string;
}) {
  const score = await prisma.score.findUnique({
    where: { id: data.scoreId },
    include: {
      enrollmentRef: {
        include: {
          studentRef: true,
          offeringRef: true,
        },
      },
    },
  });

  if (!score) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${data.scoreId}` };
  }

  const offering = score.enrollmentRef?.offeringRef;
  const student = score.enrollmentRef?.studentRef;

  const formattedProposed = normalizeScore(data.proposedScore);

  const request = await prisma.scoreChangeRequest.create({
    data: {
      scoreId: score.id,
      offeringId: offering?.id || null,
      studentCode: score.studentId,
      studentName: student?.fullName || score.studentId,
      currentScore: score.score,
      proposedScore: formattedProposed,
      proposedAttendance: data.proposedAttendance ?? score.attendanceScore,
      proposedMidterm: data.proposedMidterm ?? score.midtermScore,
      proposedFinal: data.proposedFinal ?? score.finalScore,
      reason: data.reason.trim(),
      evidenceAttachment: data.evidenceAttachment?.trim() || null,
      requestedBy: data.requestedBy,
      status: "PENDING",
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: data.requestedBy,
      action: "CREATE_SCORE_CHANGE_REQUEST",
      target: `score_change_requests:${request.id}`,
      beforeData: JSON.stringify({ currentScore: score.score }),
      afterData: JSON.stringify({ proposedScore: formattedProposed, reason: data.reason }),
      ip: "127.0.0.1",
    },
  });

  return request;
}

export async function getChangeRequests(filter?: {
  status?: string;
  requestedBy?: string;
}) {
  const where: any = {};
  if (filter?.status && filter.status !== "ALL") {
    where.status = filter.status.toUpperCase();
  }
  if (filter?.requestedBy) {
    where.requestedBy = filter.requestedBy;
  }

  const requests = await prisma.scoreChangeRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    include: {
      scoreRef: true,
      offeringRef: {
        include: {
          courseRef: true,
        },
      },
    },
  });

  return requests.map((r) => ({
    id: r.id,
    scoreId: r.scoreId,
    offeringId: r.offeringId,
    offeringCode: r.offeringRef?.offeringCode || null,
    courseName: r.offeringRef?.courseRef?.name || null,
    studentCode: r.studentCode,
    studentName: r.studentName,
    currentScore: r.currentScore,
    proposedScore: r.proposedScore,
    reason: r.reason,
    evidenceAttachment: r.evidenceAttachment,
    requestedBy: r.requestedBy,
    requestedAt: r.requestedAt,
    status: r.status,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt,
    reviewNote: r.reviewNote,
  }));
}

export async function reviewChangeRequest(
  requestId: number,
  decision: "APPROVED" | "REJECTED",
  reviewNote: string | undefined,
  adminUsername: string
) {
  const request = await prisma.scoreChangeRequest.findUnique({
    where: { id: requestId },
    include: {
      scoreRef: true,
    },
  });

  if (!request) {
    throw { statusCode: 404, message: `Không tìm thấy yêu cầu sửa điểm với ID ${requestId}` };
  }

  if (request.status !== "PENDING") {
    throw {
      statusCode: 400,
      message: `Yêu cầu này đã được xử lý trước đó với trạng thái: ${request.status}`,
    };
  }

  if (decision === "REJECTED") {
    const updated = await prisma.scoreChangeRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedBy: adminUsername,
        reviewedAt: new Date(),
        reviewNote: reviewNote || "Từ chối điều chỉnh điểm.",
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: adminUsername,
        action: "REJECT_SCORE_CHANGE_REQUEST",
        target: `score_change_requests:${requestId}`,
        afterData: JSON.stringify(updated),
        ip: "127.0.0.1",
      },
    });

    return updated;
  }

  // Phê duyệt và ghi Evidence lên Blockchain
  const currentScore = request.scoreRef;
  const nextVersion = currentScore.version + 1;
  const formattedNewScore = normalizeScore(request.proposedScore);
  const newLetterScore = calculateLetterGrade(formattedNewScore);

  const newDataHash = computeDataHash({
    studentId: currentScore.studentId,
    courseCode: currentScore.courseCode,
    semester: currentScore.semester,
    score: formattedNewScore,
    version: nextVersion,
    status: currentScore.status,
  });

  const actorHash = computeActorHash(adminUsername);

  // 1. Tạo tác vụ outbox PENDING
  const outboxOp = await prisma.blockchainOperation.create({
    data: {
      operationType: "APPEND_EVIDENCE",
      recordKey: currentScore.recordKey,
      expectedVersion: nextVersion,
      dataHash: newDataHash,
      actorHash,
      action: "UPDATE",
      status: "PENDING",
    },
  });

  // 2. Gửi transaction lên Blockchain
  let txReceipt: { transactionHash: `0x${string}`; blockNumber: bigint; blockchainTimestamp: Date };
  try {
    txReceipt = await appendEvidenceOnChain(
      currentScore.recordKey as `0x${string}`,
      newDataHash,
      actorHash,
      BigInt(nextVersion),
      Action.UPDATE
    );
  } catch (bcError: any) {
    await prisma.blockchainOperation.update({
      where: { id: outboxOp.id },
      data: { status: "FAILED", error: bcError.message || String(bcError) },
    });
    throw {
      statusCode: 502,
      message: `Ghi phê duyệt lên Blockchain thất bại: ${bcError.message || bcError}`,
    };
  }

  // 3. Đánh dấu BLOCKCHAIN_CONFIRMED và hoàn tất cập nhật MySQL
  await prisma.$transaction(async (tx) => {
    await tx.blockchainOperation.update({
      where: { id: outboxOp.id },
      data: {
        status: "COMPLETED",
        transactionHash: txReceipt.transactionHash,
        blockNumber: txReceipt.blockNumber,
      },
    });

    await tx.score.update({
      where: { id: currentScore.id },
      data: {
        score: formattedNewScore,
        attendanceScore: request.proposedAttendance,
        midtermScore: request.proposedMidterm,
        finalScore: request.proposedFinal,
        letterScore: newLetterScore,
        version: nextVersion,
        dataHash: newDataHash,
        blockchainStatus: "CONFIRMED",
        latestTxHash: txReceipt.transactionHash,
      },
    });

    await tx.scoreVersion.create({
      data: {
        scoreId: currentScore.id,
        version: nextVersion,
        score: formattedNewScore,
        attendanceScore: request.proposedAttendance,
        midtermScore: request.proposedMidterm,
        finalScore: request.proposedFinal,
        status: currentScore.status,
        action: "UPDATE",
        dataHash: newDataHash,
        actorHash,
        transactionHash: txReceipt.transactionHash,
        blockNumber: txReceipt.blockNumber,
        blockchainTimestamp: txReceipt.blockchainTimestamp,
        syncStatus: "CONFIRMED",
        changeRequestId: request.id,
      },
    });

    await tx.scoreChangeRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedBy: adminUsername,
        reviewedAt: new Date(),
        reviewNote: reviewNote || "Đã phê duyệt và neo phiên bản mới lên Blockchain.",
      },
    });

    await tx.auditLog.create({
      data: {
        actor: adminUsername,
        action: "APPROVE_SCORE_CHANGE_REQUEST",
        target: `score_change_requests:${requestId}`,
        beforeData: JSON.stringify({ score: currentScore.score, version: currentScore.version }),
        afterData: JSON.stringify({
          score: formattedNewScore,
          version: nextVersion,
          txHash: txReceipt.transactionHash,
        }),
        ip: "127.0.0.1",
      },
    });
  });

  return {
    success: true,
    message: `Đã duyệt yêu cầu sửa điểm và tạo phiên bản mới (Version ${nextVersion}) trên Blockchain.`,
    transactionHash: txReceipt.transactionHash,
    version: nextVersion,
    newScore: formattedNewScore,
  };
}
