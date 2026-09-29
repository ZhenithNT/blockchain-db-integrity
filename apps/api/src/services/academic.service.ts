import bcrypt from "bcryptjs";
import { prisma } from "../db.js";

const DEFAULT_SALT_ROUNDS = 10;

// --- 1. QUẢN LÝ GIẢNG VIÊN ---
export async function getLecturers() {
  const lecturers = await prisma.lecturer.findMany({
    orderBy: { lecturerCode: "asc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
      },
      assignments: {
        include: {
          offeringRef: {
            include: {
              courseRef: true,
            },
          },
        },
      },
    },
  });

  return lecturers.map((l) => ({
    id: l.id,
    lecturerCode: l.lecturerCode,
    fullName: l.fullName,
    faculty: l.faculty,
    email: l.email,
    username: l.user?.username || null,
    teachingOfferingsCount: l.assignments.length,
    offerings: l.assignments.map((a) => ({
      offeringCode: a.offeringRef.offeringCode,
      courseName: a.offeringRef.courseRef.name,
    })),
    createdAt: l.createdAt,
  }));
}

export async function createLecturer(data: {
  lecturerCode: string;
  fullName: string;
  faculty?: string;
  email?: string;
  username?: string;
  password?: string;
}) {
  const code = data.lecturerCode.trim().toUpperCase();
  const name = data.fullName.trim();
  const faculty = data.faculty?.trim() || "Khoa Công nghệ Thông tin 1";
  const email = data.email?.trim() || `${code.toLowerCase()}@ptit.edu.vn`;
  const username = (data.username || code).trim().toLowerCase();
  const password = data.password || "Lecturer@123";

  // Kiểm tra trùng mã GV hoặc username
  const existingLecturer = await prisma.lecturer.findUnique({
    where: { lecturerCode: code },
  });
  if (existingLecturer) {
    throw { statusCode: 400, message: `Mã giảng viên '${code}' đã tồn tại trong hệ thống.` };
  }

  const existingUser = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUser) {
    throw { statusCode: 400, message: `Tên đăng nhập '${username}' đã tồn tại.` };
  }

  const passwordHash = await bcrypt.hash(password, DEFAULT_SALT_ROUNDS);

  return await prisma.$transaction(async (tx) => {
    const lecturer = await tx.lecturer.create({
      data: {
        lecturerCode: code,
        fullName: name,
        faculty,
        email,
      },
    });

    const user = await tx.user.create({
      data: {
        username,
        passwordHash,
        fullName: name,
        role: "LECTURER",
        email,
        lecturerCode: code,
      },
    });

    return {
      lecturer,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  });
}

// --- 2. QUẢN LÝ SINH VIÊN ---
export async function getStudents() {
  const students = await prisma.student.findMany({
    orderBy: { studentCode: "asc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
      },
      enrollments: {
        include: {
          offeringRef: {
            include: {
              courseRef: true,
            },
          },
          scoreRef: true,
        },
      },
    },
  });

  return students.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    fullName: s.fullName,
    className: s.className,
    email: s.email,
    username: s.user?.username || null,
    enrolledOfferingsCount: s.enrollments.length,
    enrollments: s.enrollments.map((e) => ({
      offeringCode: e.offeringRef.offeringCode,
      courseName: e.offeringRef.courseRef.name,
      score: e.scoreRef?.score || null,
      status: e.status,
    })),
    createdAt: s.createdAt,
  }));
}

export async function createStudent(data: {
  studentCode: string;
  fullName: string;
  className?: string;
  email?: string;
  username?: string;
  password?: string;
}) {
  const code = data.studentCode.trim().toUpperCase();
  const name = data.fullName.trim();
  const className = data.className?.trim() || "D23CQAT01-B";
  const email = data.email?.trim() || `${code.toLowerCase()}@stu.ptit.edu.vn`;
  const username = (data.username || code).trim().toLowerCase();
  const password = data.password || "Student@123";

  // Kiểm tra trùng mã SV hoặc username
  const existingStudent = await prisma.student.findUnique({
    where: { studentCode: code },
  });
  if (existingStudent) {
    throw { statusCode: 400, message: `Mã sinh viên '${code}' đã tồn tại trong hệ thống.` };
  }

  const existingUser = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUser) {
    throw { statusCode: 400, message: `Tên đăng nhập '${username}' đã tồn tại.` };
  }

  const passwordHash = await bcrypt.hash(password, DEFAULT_SALT_ROUNDS);

  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        studentCode: code,
        fullName: name,
        className,
        email,
      },
    });

    const user = await tx.user.create({
      data: {
        username,
        passwordHash,
        fullName: name,
        role: "STUDENT",
        email,
        studentCode: code,
      },
    });

    return {
      student,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  });
}

// --- 3. QUẢN LÝ MÔN HỌC ---
export async function getCourses() {
  return await prisma.course.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: {
        select: { offerings: true },
      },
    },
  });
}

export async function createCourse(data: {
  code: string;
  name: string;
  credits?: number;
  department?: string;
}) {
  const code = data.code.trim().toUpperCase();
  const name = data.name.trim();
  const credits = Number(data.credits) || 3;
  const department = data.department?.trim() || "Khoa Công nghệ Thông tin 1";

  const existing = await prisma.course.findUnique({
    where: { code },
  });
  if (existing) {
    throw { statusCode: 400, message: `Môn học có mã '${code}' đã tồn tại.` };
  }

  return await prisma.course.create({
    data: {
      code,
      name,
      credits,
      department,
    },
  });
}

// --- 4. QUẢN LÝ HỌC KỲ ---
export async function getSemesters() {
  return await prisma.semester.findMany({
    orderBy: { code: "desc" },
  });
}

export async function createSemester(data: {
  code: string;
  name: string;
  isCurrent?: boolean;
}) {
  const code = data.code.trim();
  const name = data.name.trim();
  const isCurrent = !!data.isCurrent;

  const existing = await prisma.semester.findUnique({
    where: { code },
  });
  if (existing) {
    throw { statusCode: 400, message: `Học kỳ '${code}' đã tồn tại.` };
  }

  if (isCurrent) {
    await prisma.semester.updateMany({
      data: { isCurrent: false },
    });
  }

  return await prisma.semester.create({
    data: {
      code,
      name,
      isCurrent,
    },
  });
}

// --- 5. TẠO LỚP HỌC PHẦN & PHÂN CÔNG & ĐĂNG KÝ HỌC ---
export async function createCourseOffering(data: {
  offeringCode: string;
  courseCode: string;
  semesterCode?: string;
  room?: string;
  maxStudents?: number;
}) {
  const offeringCode = data.offeringCode.trim().toUpperCase();
  const courseCode = data.courseCode.trim().toUpperCase();
  let semesterCode = data.semesterCode?.trim();

  // Nếu không chỉ định học kỳ, lấy học kỳ hiện tại
  if (!semesterCode) {
    const currentSem = await prisma.semester.findFirst({
      where: { isCurrent: true },
    });
    semesterCode = currentSem?.code || "2025-2026.1";
  }

  // Kiểm tra tồn tại môn học & học kỳ
  const course = await prisma.course.findUnique({ where: { code: courseCode } });
  if (!course) {
    throw { statusCode: 404, message: `Môn học '${courseCode}' không tồn tại.` };
  }

  const existing = await prisma.courseOffering.findUnique({
    where: { offeringCode },
  });
  if (existing) {
    throw { statusCode: 400, message: `Lớp học phần '${offeringCode}' đã tồn tại.` };
  }

  return await prisma.courseOffering.create({
    data: {
      offeringCode,
      courseCode,
      semesterCode,
      room: data.room?.trim() || "A2-301",
      maxStudents: Number(data.maxStudents) || 60,
      status: "DRAFT",
    },
    include: {
      courseRef: true,
      semesterRef: true,
    },
  });
}

export async function assignLecturerToOffering(data: {
  offeringId: number;
  lecturerCode: string;
  role?: string;
  canGrade?: boolean;
}) {
  const { offeringId } = data;
  const lecturerCode = data.lecturerCode.trim().toUpperCase();

  const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering) throw { statusCode: 404, message: "Lớp học phần không tồn tại." };

  const lecturer = await prisma.lecturer.findUnique({ where: { lecturerCode } });
  if (!lecturer) throw { statusCode: 404, message: `Giảng viên '${lecturerCode}' không tồn tại.` };

  return await prisma.lecturerAssignment.upsert({
    where: {
      unique_offering_lecturer: {
        offeringId,
        lecturerCode,
      },
    },
    update: {
      role: data.role || "PRIMARY",
      canGrade: data.canGrade !== undefined ? data.canGrade : true,
    },
    create: {
      offeringId,
      lecturerCode,
      role: data.role || "PRIMARY",
      canGrade: data.canGrade !== undefined ? data.canGrade : true,
    },
  });
}

export async function enrollStudentToOffering(data: {
  offeringId: number;
  studentCode: string;
}) {
  const { offeringId } = data;
  const studentCode = data.studentCode.trim().toUpperCase();

  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      _count: { select: { enrollments: true } },
    },
  });
  if (!offering) throw { statusCode: 404, message: "Lớp học phần không tồn tại." };

  const student = await prisma.student.findUnique({ where: { studentCode } });
  if (!student) throw { statusCode: 404, message: `Sinh viên '${studentCode}' không tồn tại.` };

  if (offering._count.enrollments >= offering.maxStudents) {
    throw { statusCode: 400, message: "Lớp học phần đã đạt sĩ số tối đa." };
  }

  return await prisma.enrollment.upsert({
    where: {
      unique_offering_student: {
        offeringId,
        studentCode,
      },
    },
    update: { status: "ENROLLED" },
    create: {
      offeringId,
      studentCode,
      status: "ENROLLED",
    },
  });
}

export async function studentSelfEnroll(offeringId: number, studentUsername: string) {
  const user = await prisma.user.findUnique({
    where: { username: studentUsername },
  });

  if (!user || user.role !== "STUDENT" || !user.studentCode) {
    throw { statusCode: 403, message: "Chỉ tài khoản sinh viên mới được đăng ký môn học." };
  }

  return await enrollStudentToOffering({
    offeringId,
    studentCode: user.studentCode,
  });
}

export async function studentSelfUnenroll(offeringId: number, studentUsername: string) {
  const user = await prisma.user.findUnique({
    where: { username: studentUsername },
  });

  if (!user || user.role !== "STUDENT" || !user.studentCode) {
    throw { statusCode: 403, message: "Chỉ sinh viên mới được hủy đăng ký." };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      unique_offering_student: {
        offeringId,
        studentCode: user.studentCode,
      },
    },
    include: { scoreRef: true },
  });

  if (!enrollment) {
    throw { statusCode: 404, message: "Bạn chưa đăng ký lớp học phần này." };
  }

  if (enrollment.scoreRef && enrollment.scoreRef.score !== null) {
    throw { statusCode: 400, message: "Lớp học phần đã có điểm số, không thể hủy đăng ký." };
  }

  return await prisma.enrollment.delete({
    where: { id: enrollment.id },
  });
}
