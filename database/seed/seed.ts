import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function runSeed() {
  console.log("🌱 Khởi tạo dữ liệu nền tảng ban đầu (Môn học, Giảng viên, Sinh viên B23DCAT111)...");

  // 1. Dọn sạch toàn bộ điểm, lớp học phần, phân công và nhật ký cũ để người dùng tự thao tác từ đầu
  console.log("  🧹 Dọn sạch dữ liệu lớp học phần, điểm và nhật ký cũ...");
  await prisma.integrityCheck.deleteMany({});
  await prisma.scoreVersion.deleteMany({});
  await prisma.scoreChangeRequest.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.lecturerAssignment.deleteMany({});
  await prisma.courseOffering.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // 2. Học kỳ (Semester)
  await prisma.semester.upsert({
    where: { code: "2025-2026.1" },
    update: {
      name: "Học kỳ 1 năm học 2025-2026",
      isCurrent: true,
    },
    create: {
      code: "2025-2026.1",
      name: "Học kỳ 1 năm học 2025-2026",
      isCurrent: true,
      startDate: new Date("2025-08-15"),
      endDate: new Date("2026-01-15"),
    },
  });
  console.log("  ✓ Đã khởi tạo học kỳ: 2025-2026.1 (Học kỳ 1 năm học 2025-2026)");

  // 3. Môn học (Course) - BAS1111 Giải tích 1
  await prisma.course.upsert({
    where: { code: "BAS1111" },
    update: {
      name: "Giải tích 1",
      credits: 3,
      department: "Khoa Cơ bản",
    },
    create: {
      code: "BAS1111",
      name: "Giải tích 1",
      credits: 3,
      department: "Khoa Cơ bản",
    },
  });
  console.log("  ✓ Đã khởi tạo môn học: BAS1111 - Giải tích 1");

  // 4. Giảng viên (Lecturer) - GV001 ThS. Nguyễn Hoài Nam
  await prisma.lecturer.upsert({
    where: { lecturerCode: "GV001" },
    update: {
      fullName: "Nguyễn Hoài Nam",
      faculty: "Khoa Cơ bản",
      email: "namnh@ptit.edu.vn",
    },
    create: {
      lecturerCode: "GV001",
      fullName: "Nguyễn Hoài Nam",
      faculty: "Khoa Cơ bản",
      email: "namnh@ptit.edu.vn",
    },
  });
  console.log("  ✓ Đã khởi tạo giảng viên: GV001 - ThS. Nguyễn Hoài Nam");

  // 5. Sinh viên (Student) - B23DCAT111 Nguyễn Văn A
  await prisma.student.upsert({
    where: { studentCode: "B23DCAT111" },
    update: {
      fullName: "Nguyễn Văn A",
      className: "D23CQAT01-B",
      email: "anv@stu.ptit.edu.vn",
      phone: "0901234567",
    },
    create: {
      studentCode: "B23DCAT111",
      fullName: "Nguyễn Văn A",
      className: "D23CQAT01-B",
      email: "anv@stu.ptit.edu.vn",
      phone: "0901234567",
    },
  });
  console.log("  ✓ Đã khởi tạo sinh viên: B23DCAT111 - Nguyễn Văn A (Lớp D23CQAT01-B)");

  // 6. Tài khoản người dùng (Users)
  const defaultSalt = await bcrypt.genSalt(10);
  const usersData = [
    {
      username: "admin",
      password: "Admin@123",
      fullName: "Ban Quản trị Đào tạo",
      role: "ADMIN",
      email: "daotao@ptit.edu.vn",
    },
    {
      username: "lecturer",
      password: "Lecturer@123",
      fullName: "ThS. Nguyễn Hoài Nam",
      role: "LECTURER",
      email: "namnh@ptit.edu.vn",
      lecturerCode: "GV001",
    },
    {
      username: "sv_a",
      password: "Student@123",
      fullName: "Nguyễn Văn A",
      role: "STUDENT",
      email: "anv@stu.ptit.edu.vn",
      studentCode: "B23DCAT111",
    },
    {
      username: "auditor",
      password: "Auditor@123",
      fullName: "Kiểm toán viên Độc lập",
      role: "AUDITOR",
      email: "kiemtoan@moet.edu.vn",
    },
  ];

  for (const u of usersData) {
    const passwordHash = await bcrypt.hash(u.password, defaultSalt);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        role: u.role,
        studentCode: u.studentCode || null,
        lecturerCode: u.lecturerCode || null,
      },
      create: {
        username: u.username,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        email: u.email,
        studentCode: u.studentCode || null,
        lecturerCode: u.lecturerCode || null,
      },
    });
  }
  console.log("  ✓ Đã khởi tạo các tài khoản: admin, lecturer, sv_a, auditor");

  // 7. Thông báo đào tạo mẫu
  const notificationsData = [
    {
      title: "Thông báo kế hoạch đào tạo Học kỳ 1 năm học 2025-2026",
      content: "Phòng Giáo vụ và Đào tạo thông báo kế hoạch mở lớp học phần và tiếp nhận kết quả học tập cho Học kỳ 1 năm học 2025-2026.",
      sender: "Phòng Giáo vụ & Đào tạo",
      targetRole: "ALL",
      isUrgent: false,
      createdAt: new Date(),
    },
  ];

  await prisma.notification.deleteMany({});
  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }

  console.log("\n✅ KHỞI TẠO HOÀN TẤT!");
  console.log("👉 Chưa có bất kỳ lớp học phần hoặc bản ghi điểm nào. Bạn có thể tự do tạo lớp học phần, ghi danh và nhập điểm theo ý mình!");
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  runSeed()
    .catch((err) => {
      console.error("❌ Lỗi khi seed dữ liệu:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
