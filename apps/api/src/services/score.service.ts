import {
  Action,
  type Hex,
  computeActorHash,
  computeDataHash,
  computeRecordKey,
  normalizeScore,
  calculateLetterGrade,
  calculateTotalScore,
} from "@integrity/shared";
import { appendEvidenceOnChain } from "../blockchain.js";
import { prisma } from "../db.js";

export async function getScores(filters: {
  search?: string;
  status?: string;
  semester?: string;
  offeringCode?: string;
}) {
  const where: any = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status.toUpperCase();
  }

  if (filters.semester) {
    where.semester = filters.semester;
  }

  if (filters.offeringCode) {
    where.offeringCode = filters.offeringCode;
  }

  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { studentId: { contains: s } },
      { courseCode: { contains: s } },
      { semester: { contains: s } },
      { offeringCode: { contains: s } },
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
      enrollmentRef: {
        include: {
          studentRef: true,
          offeringRef: {
            include: {
              courseRef: true,
            },
          },
        },
      },
    },
  });

  return scores.map((sc) => ({
    id: sc.id,
    studentId: sc.studentId,
    studentName: sc.enrollmentRef?.studentRef?.fullName || sc.studentId,
    courseCode: sc.courseCode,
    courseName: sc.enrollmentRef?.offeringRef?.courseRef?.name || sc.courseCode,
    offeringCode: sc.offeringCode,
    semester: sc.semester,
    attendanceScore: sc.attendanceScore != null ? Number(sc.attendanceScore) : null,
    midtermScore: sc.midtermScore != null ? Number(sc.midtermScore) : null,
    finalScore: sc.finalScore != null ? Number(sc.finalScore) : null,
    score: sc.score,
    letterScore: sc.letterScore,
    version: sc.version,
    status: sc.status,
    recordKey: sc.recordKey,
    dataHash: sc.dataHash,
    blockchainStatus: sc.blockchainStatus,
    latestTxHash: sc.latestTxHash,
    createdAt: sc.createdAt,
    updatedAt: sc.updatedAt,
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
        take: 1,
      },
      enrollmentRef: {
        include: {
          studentRef: true,
          offeringRef: {
            include: {
              courseRef: true,
              assignments: {
                include: {
                  lecturerRef: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!score) {
    throw { statusCode: 404, message: `Không tìm thấy bản ghi điểm với ID ${id}` };
  }

  return {
    ...score,
    attendanceScore: score.attendanceScore !== null ? Number(score.attendanceScore) : null,
    midtermScore: score.midtermScore !== null ? Number(score.midtermScore) : null,
    finalScore: score.finalScore !== null ? Number(score.finalScore) : null,
    studentName: score.enrollmentRef?.studentRef?.fullName || score.studentId,
    courseName: score.enrollmentRef?.offeringRef?.courseRef?.name || score.courseCode,
    lecturers: score.enrollmentRef?.offeringRef?.assignments.map((a) => a.lecturerRef.fullName) || [],
    latestCheck: score.integrityChecks[0] || null,
    versions: score.versions.map((v) => ({
      ...v,
      blockNumber: v.blockNumber !== null ? v.blockNumber.toString() : null,
      attendanceScore: v.attendanceScore !== null ? Number(v.attendanceScore) : null,
      midtermScore: v.midtermScore !== null ? Number(v.midtermScore) : null,
      finalScore: v.finalScore !== null ? Number(v.finalScore) : null,
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
    attendanceScore: v.attendanceScore !== null ? Number(v.attendanceScore) : null,
    midtermScore: v.midtermScore !== null ? Number(v.midtermScore) : null,
    finalScore: v.finalScore !== null ? Number(v.finalScore) : null,
  }));
}

export async function getStudentScores(studentCode: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentCode },
    include: {
      offeringRef: {
        include: {
          courseRef: true,
          semesterRef: true,
          assignments: {
            include: {
              lecturerRef: true,
            },
          },
        },
      },
      scoreRef: {
        include: {
          integrityChecks: {
            orderBy: { checkedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  return enrollments.map((enr) => {
    const sc = enr.scoreRef;
    const latestCheck = sc?.integrityChecks[0] || null;

    return {
      offeringId: enr.offeringId,
      offeringCode: enr.offeringRef.offeringCode,
      courseCode: enr.offeringRef.courseCode,
      courseName: enr.offeringRef.courseRef.name,
      credits: enr.offeringRef.courseRef.credits,
      semesterCode: enr.offeringRef.semesterCode,
      semesterName: enr.offeringRef.semesterRef.name,
      lecturerNames: enr.offeringRef.assignments.map((a) => a.lecturerRef.fullName).join(", "),
      scoreId: sc?.id || null,
      attendanceScore: sc?.attendanceScore != null ? Number(sc.attendanceScore) : null,
      midtermScore: sc?.midtermScore != null ? Number(sc.midtermScore) : null,
      finalScore: sc?.finalScore != null ? Number(sc.finalScore) : null,
      score: sc?.score || null,
      letterScore: sc?.letterScore || null,
      version: sc?.version || null,
      offeringStatus: enr.offeringRef.status,
      blockchainStatus: sc?.blockchainStatus || "PENDING",
      latestTxHash: sc?.latestTxHash || null,
      recordKey: sc?.recordKey || null,
      integrityResult: latestCheck?.result || (sc?.blockchainStatus === "CONFIRMED" ? "VALID" : "PENDING"),
    };
  });
}

/**
 * Giảng viên lưu bảng điểm (nháp hoặc nộp duyệt)
 */
export async function saveClassScores(
  offeringId: number,
  scoresData: Array<{
    studentCode?: string;
    enrollmentId?: number;
    attendanceScore?: number | null;
    midtermScore?: number | null;
    finalScore?: number | null;
    score?: number | null;
  }>,
  isDraft: boolean,
  lecturerUsername: string
) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      assignments: true,
      enrollments: true,
    },
  });

  if (!offering) {
    throw { statusCode: 404, message: `Không tìm thấy lớp học phần với ID ${offeringId}` };
  }

  // Kiểm tra quyền giảng viên
  const user = await prisma.user.findUnique({
    where: { username: lecturerUsername },
  });

  if (user?.role === "LECTURER") {
    const isAssigned = offering.assignments.some(
      (a) => a.lecturerCode === user.lecturerCode && a.canGrade
    );
    if (!isAssigned) {
      throw {
        statusCode: 403,
        message: `Bạn không được phân công chấm điểm cho lớp học phần ${offering.offeringCode}.`,
      };
    }
  }

  if (offering.status === "LOCKED") {
    throw {
      statusCode: 400,
      message: `Bảng điểm của lớp ${offering.offeringCode} đã bị KHÓA. Không thể sửa trực tiếp, vui lòng tạo Yêu cầu điều chỉnh điểm.`,
    };
  }

  // Cập nhật từng dòng điểm trong CSDL
  for (const item of scoresData) {
    const enrollment = offering.enrollments.find(
      (e) =>
        (item.studentCode && e.studentCode === item.studentCode) ||
        (item.enrollmentId && e.id === item.enrollmentId)
    );
    if (!enrollment) continue;

    const studentCode = item.studentCode || enrollment.studentCode;

    // Tính điểm tổng kết
    let finalTotal = item.score != null ? normalizeScore(item.score) : "0.00";
    if (item.attendanceScore != null && item.midtermScore != null && item.finalScore != null) {
      finalTotal = calculateTotalScore(item.attendanceScore, item.midtermScore, item.finalScore);
    }
    const letter = calculateLetterGrade(finalTotal);

    const recordKey = computeRecordKey({
      studentId: studentCode,
      courseCode: offering.courseCode,
      semester: offering.semesterCode,
    });

    const dataHash = computeDataHash({
      studentId: studentCode,
      courseCode: offering.courseCode,
      semester: offering.semesterCode,
      score: finalTotal,
      version: 1,
      status: "ACTIVE",
    });

    await prisma.score.upsert({
      where: {
        unique_student_course_semester: {
          studentId: studentCode,
          courseCode: offering.courseCode,
          semester: offering.semesterCode,
        },
      },
      update: {
        attendanceScore: item.attendanceScore,
        midtermScore: item.midtermScore,
        finalScore: item.finalScore,
        score: finalTotal,
        letterScore: letter,
        offeringCode: offering.offeringCode,
        dataHash,
      },
      create: {
        enrollmentId: enrollment.id,
        studentId: studentCode,
        courseCode: offering.courseCode,
        offeringCode: offering.offeringCode,
        semester: offering.semesterCode,
        attendanceScore: item.attendanceScore,
        midtermScore: item.midtermScore,
        finalScore: item.finalScore,
        score: finalTotal,
        letterScore: letter,
        version: 1,
        status: "ACTIVE",
        recordKey,
        dataHash,
        blockchainStatus: "PENDING",
      },
    });
  }

  // Cập nhật trạng thái lớp học phần
  const newOfferingStatus = isDraft ? "DRAFT" : "SUBMITTED";
  const updatedOffering = await prisma.courseOffering.update({
    where: { id: offeringId },
    data: {
      status: newOfferingStatus,
      submittedAt: isDraft ? offering.submittedAt : new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: lecturerUsername,
      action: isDraft ? "SAVE_GRADE_SHEET_DRAFT" : "SUBMIT_GRADE_SHEET",
      target: `course_offerings:${offeringId}`,
      afterData: JSON.stringify({ count: scoresData.length, isDraft }),
      ip: "127.0.0.1",
    },
  });

  return {
    success: true,
    offeringStatus: newOfferingStatus,
    message: isDraft
      ? "Đã lưu bản nháp bảng điểm thành công."
      : "Đã nộp bảng điểm thành công, đang chờ đào tạo phê duyệt và neo bằng chứng Blockchain.",
  };
}

/**
 * Đào tạo phê duyệt bảng điểm và tự động neo bằng chứng lên Blockchain
 */
export async function approveClassScores(offeringId: number, adminUsername: string) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      enrollments: {
        include: {
          scoreRef: true,
        },
      },
    },
  });

  if (!offering) {
    throw { statusCode: 404, message: `Không tìm thấy lớp học phần với ID ${offeringId}` };
  }

  const results: any[] = [];
  const actorHash = computeActorHash(adminUsername);

  for (const enr of offering.enrollments) {
    const sc = enr.scoreRef;
    if (!sc) continue;

    const recordKey = sc.recordKey as Hex;
    const version = sc.version;
    const dataHash = sc.dataHash as Hex;

    try {
      const receipt = await appendEvidenceOnChain(
        recordKey,
        dataHash,
        actorHash,
        BigInt(version),
        Action.CREATE
      );

      await prisma.score.update({
        where: { id: sc.id },
        data: {
          blockchainStatus: "CONFIRMED",
          latestTxHash: receipt.transactionHash,
        },
      });

      await prisma.scoreVersion.upsert({
        where: {
          unique_score_version: {
            scoreId: sc.id,
            version: sc.version,
          },
        },
        update: {
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          blockchainTimestamp: receipt.blockchainTimestamp,
          syncStatus: "CONFIRMED",
        },
        create: {
          scoreId: sc.id,
          version: sc.version,
          score: sc.score,
          attendanceScore: sc.attendanceScore,
          midtermScore: sc.midtermScore,
          finalScore: sc.finalScore,
          status: sc.status,
          action: "CREATE",
          dataHash: sc.dataHash,
          actorHash,
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          blockchainTimestamp: receipt.blockchainTimestamp,
          syncStatus: "CONFIRMED",
        },
      });

      results.push({
        studentCode: sc.studentId,
        status: "CONFIRMED",
        txHash: receipt.transactionHash,
      });
    } catch (bcErr: any) {
      console.warn(`Lỗi khi neo điểm trên blockchain cho ${sc.studentId}:`, bcErr.message || bcErr);
      results.push({
        studentCode: sc.studentId,
        status: "FAILED",
        error: bcErr.message,
      });
    }
  }

  // Khóa bảng điểm và công bố
  await prisma.courseOffering.update({
    where: { id: offeringId },
    data: {
      status: "PUBLISHED",
      approvedAt: new Date(),
      publishedAt: new Date(),
      approvedBy: adminUsername,
    },
  });

  return {
    success: true,
    message: `Đã phê duyệt bảng điểm và neo ${results.filter((r) => r.status === "CONFIRMED").length}/${results.length} bằng chứng lên Blockchain.`,
    results,
  };
}

// Cung cấp tương thích ngược cho createScore / updateScore / deleteScore
export async function createScore(
  data: {
    studentId: string;
    courseCode: string;
    semester: string;
    score: string | number;
    offeringCode?: string;
    attendanceScore?: number;
    midtermScore?: number;
    finalScore?: number;
  },
  actorId: string,
  clientIp = "127.0.0.1"
) {
  const studentId = data.studentId.trim();
  const courseCode = data.courseCode.trim();
  const semester = data.semester.trim();
  const formattedScore = normalizeScore(data.score);
  const letterScore = calculateLetterGrade(formattedScore);

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
          "Bản ghi này đã tồn tại và đã bị xóa trên Blockchain. Hãy dùng chức năng khôi phục (RESTORE).",
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

  // 1. Ghi bằng chứng lên Smart Contract
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

  // 2. Ghi dữ liệu vào MySQL
  const createdScore = await prisma.$transaction(async (tx) => {
    const scoreRow = await tx.score.create({
      data: {
        studentId,
        courseCode,
        semester,
        offeringCode: data.offeringCode,
        attendanceScore: data.attendanceScore,
        midtermScore: data.midtermScore,
        finalScore: data.finalScore,
        score: formattedScore,
        letterScore,
        version,
        status,
        recordKey,
        dataHash,
        blockchainStatus: "CONFIRMED",
        latestTxHash: txReceipt.transactionHash,
      },
    });

    await tx.scoreVersion.create({
      data: {
        scoreId: scoreRow.id,
        version,
        score: formattedScore,
        attendanceScore: data.attendanceScore,
        midtermScore: data.midtermScore,
        finalScore: data.finalScore,
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
  clientIp = "127.0.0.1",
  components?: { attendance?: number; midterm?: number; final?: number }
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
      message: "Bản ghi này đã bị xóa (soft delete), không thể cập nhật điểm.",
    };
  }

  const nextVersion = currentScore.version + 1;
  const formattedNewScore = normalizeScore(newScoreValue);
  const letterScore = calculateLetterGrade(formattedNewScore);
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

  const updatedScore = await prisma.$transaction(async (tx) => {
    const updated = await tx.score.update({
      where: { id },
      data: {
        score: formattedNewScore,
        attendanceScore: components?.attendance ?? currentScore.attendanceScore,
        midtermScore: components?.midterm ?? currentScore.midtermScore,
        finalScore: components?.final ?? currentScore.finalScore,
        letterScore,
        version: nextVersion,
        dataHash: newDataHash,
        blockchainStatus: "CONFIRMED",
        latestTxHash: txReceipt.transactionHash,
      },
    });

    await tx.scoreVersion.create({
      data: {
        scoreId: id,
        version: nextVersion,
        score: formattedNewScore,
        attendanceScore: components?.attendance ?? currentScore.attendanceScore,
        midtermScore: components?.midterm ?? currentScore.midtermScore,
        finalScore: components?.final ?? currentScore.finalScore,
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
    throw { statusCode: 400, message: "Bản ghi này đã bị xóa trước đó." };
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
      message: `Ghi xóa lên Blockchain thất bại: ${bcError.message || bcError}`,
    };
  }

  const deletedScore = await prisma.$transaction(async (tx) => {
    const updated = await tx.score.update({
      where: { id },
      data: {
        status: "DELETED",
        version: nextVersion,
        dataHash: deleteDataHash,
        blockchainStatus: "CONFIRMED",
        latestTxHash: txReceipt.transactionHash,
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
