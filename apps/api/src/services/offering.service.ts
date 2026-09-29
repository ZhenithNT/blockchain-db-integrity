import { prisma } from "../db.js";

export async function getOfferings(filter: {
  semesterCode?: string;
  lecturerUsername?: string;
  status?: string;
}) {
  const where: any = {};

  if (filter.semesterCode) {
    where.semesterCode = filter.semesterCode;
  }

  if (filter.status && filter.status !== "ALL") {
    where.status = filter.status.toUpperCase();
  }

  if (filter.lecturerUsername) {
    const user = await prisma.user.findUnique({
      where: { username: filter.lecturerUsername },
    });
    if (user?.lecturerCode) {
      where.assignments = {
        some: {
          lecturerCode: user.lecturerCode,
        },
      };
    }
  }

  const offerings = await prisma.courseOffering.findMany({
    where,
    orderBy: { offeringCode: "asc" },
    include: {
      courseRef: true,
      semesterRef: true,
      assignments: {
        include: {
          lecturerRef: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });

  return offerings.map((o) => ({
    id: o.id,
    offeringCode: o.offeringCode,
    courseCode: o.courseCode,
    courseName: o.courseRef.name,
    credits: o.courseRef.credits,
    semesterCode: o.semesterCode,
    semesterName: o.semesterRef.name,
    room: o.room,
    maxStudents: o.maxStudents,
    enrolledCount: o._count.enrollments,
    status: o.status,
    submittedAt: o.submittedAt,
    approvedAt: o.approvedAt,
    publishedAt: o.publishedAt,
    lockedAt: o.lockedAt,
    approvedBy: o.approvedBy,
    lecturers: o.assignments.map((a) => ({
      code: a.lecturerCode,
      name: a.lecturerRef.fullName,
      role: a.role,
      canGrade: a.canGrade,
    })),
  }));
}

export async function getOfferingById(id: number) {
  const o = await prisma.courseOffering.findUnique({
    where: { id },
    include: {
      courseRef: true,
      semesterRef: true,
      assignments: {
        include: {
          lecturerRef: true,
        },
      },
      enrollments: {
        include: {
          studentRef: true,
          scoreRef: {
            include: {
              integrityChecks: {
                orderBy: { checkedAt: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          studentCode: "asc",
        },
      },
    },
  });

  if (!o) {
    throw { statusCode: 404, message: `Không tìm thấy lớp học phần với ID ${id}` };
  }

  const students = o.enrollments.map((enr, index) => {
    const sc = enr.scoreRef;
    const latestCheck = sc?.integrityChecks[0] || null;

    return {
      index: index + 1,
      enrollmentId: enr.id,
      studentCode: enr.studentCode,
      fullName: enr.studentRef.fullName,
      className: enr.studentRef.className,
      email: enr.studentRef.email,
      scoreId: sc?.id || null,
      attendanceScore: sc?.attendanceScore != null ? Number(sc.attendanceScore) : null,
      midtermScore: sc?.midtermScore != null ? Number(sc.midtermScore) : null,
      finalScore: sc?.finalScore != null ? Number(sc.finalScore) : null,
      score: sc?.score || null,
      letterScore: sc?.letterScore || null,
      version: sc?.version || 1,
      status: sc?.status || "ACTIVE",
      blockchainStatus: sc?.blockchainStatus || "PENDING",
      latestTxHash: sc?.latestTxHash || null,
      recordKey: sc?.recordKey || null,
      dataHash: sc?.dataHash || null,
      latestIntegrityResult: latestCheck?.result || (sc?.blockchainStatus === "CONFIRMED" ? "VALID" : "PENDING"),
      latestIntegrityReason: latestCheck?.reason || null,
    };
  });

  return {
    id: o.id,
    offeringCode: o.offeringCode,
    courseCode: o.courseCode,
    courseName: o.courseRef.name,
    credits: o.courseRef.credits,
    semesterCode: o.semesterCode,
    semesterName: o.semesterRef.name,
    room: o.room,
    status: o.status,
    submittedAt: o.submittedAt,
    approvedAt: o.approvedAt,
    publishedAt: o.publishedAt,
    lockedAt: o.lockedAt,
    approvedBy: o.approvedBy,
    lecturers: o.assignments.map((a) => ({
      code: a.lecturerCode,
      name: a.lecturerRef.fullName,
      role: a.role,
      canGrade: a.canGrade,
    })),
    students,
  };
}

export async function updateOfferingStatus(
  offeringId: number,
  newStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED" | "LOCKED",
  actorUsername: string
) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
  });

  if (!offering) {
    throw { statusCode: 404, message: `Không tìm thấy lớp học phần với ID ${offeringId}` };
  }

  const updateData: any = { status: newStatus };
  const now = new Date();

  if (newStatus === "SUBMITTED") updateData.submittedAt = now;
  if (newStatus === "APPROVED") {
    updateData.approvedAt = now;
    updateData.approvedBy = actorUsername;
  }
  if (newStatus === "PUBLISHED") updateData.publishedAt = now;
  if (newStatus === "LOCKED") updateData.lockedAt = now;

  const updated = await prisma.courseOffering.update({
    where: { id: offeringId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      actor: actorUsername,
      action: `OFFERING_STATUS_${newStatus}`,
      target: `course_offerings:${offeringId}`,
      beforeData: JSON.stringify({ status: offering.status }),
      afterData: JSON.stringify({ status: newStatus }),
      ip: "127.0.0.1",
    },
  });

  return updated;
}
