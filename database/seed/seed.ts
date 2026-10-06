import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function runSeed() {
  console.log("🌱 Khởi tạo dữ liệu cơ bản phục vụ thực nghiệm (Môn học, Giảng viên, Sinh viên B23DCAT111)...");

  // 1. Dọn sạch các bảng điểm và nhật ký cũ nếu có để người dùng tự nhập mới hoàn toàn
  console.log("  🧹 Dọn sạch dữ liệu điểm cũ để chuẩn bị thực nghiệm mới...");
  await prisma.integrityCheck.deleteMany({});
  await prisma.scoreVersion.deleteMany({});
  await prisma.scoreChangeRequest.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // 2. Học kỳ (Semester)
  const semester = await prisma.semester.upsert({
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
  console.log("  ✓ Đã khởi tạo học kỳ 2025-2026.1");

  // 3. Môn học (Course) - Giải tích 1 (BAS1111)
  const course = await prisma.course.upsert({
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
  const lecturer = await prisma.lecturer.upsert({
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
  console.log("  ✓ Đã khởi tạo giảng viên: GV001 - Nguyễn Hoài Nam");

  // 5. Sinh viên (Student) - B23DCAT111 Nguyễn Văn A
  const student = await prisma.student.upsert({
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
  console.log("  ✓ Đã khởi tạo các tài khoản: admin, lecturer (GV Nguyễn Hoài Nam), sv_a (SV Nguyễn Văn A), auditor");

  // 7. Lớp học phần (CourseOffering) - MH001 Giải tích 1
  const offering = await prisma.courseOffering.upsert({
    where: { offeringCode: "MH001" },
    update: {
      courseCode: "BAS1111",
      semesterCode: "2025-2026.1",
      room: "A2-301",
      maxStudents: 60,
      status: "APPROVED",
    },
    create: {
      offeringCode: "MH001",
      courseCode: "BAS1111",
      semesterCode: "2025-2026.1",
      room: "A2-301",
      maxStudents: 60,
      status: "APPROVED",
    },
  });
  console.log("  ✓ Đã khởi tạo lớp học phần: MH001 (Giải tích 1, Phòng A2-301)");

  // 8. Phân công giảng dạy
  await prisma.lecturerAssignment.upsert({
    where: {
      unique_offering_lecturer: {
        offeringId: offering.id,
        lecturerCode: "GV001",
      },
    },
    update: { canGrade: true },
    create: {
      offeringId: offering.id,
      lecturerCode: "GV001",
      role: "PRIMARY",
      canGrade: true,
    },
  });
  console.log("  ✓ Đã phân công GV Nguyễn Hoài Nam (GV001) phụ trách lớp MH001");

  // 9. Đăng ký học phần (Enrollment) cho SV B23DCAT111 vào lớp MH001
  await prisma.enrollment.upsert({
    where: {
      unique_offering_student: {
        offeringId: offering.id,
        studentCode: "B23DCAT111",
      },
    },
    update: { status: "ENROLLED" },
    create: {
      offeringId: offering.id,
      studentCode: "B23DCAT111",
      status: "ENROLLED",
    },
  });
  console.log("  ✓ Đã ghi danh sinh viên B23DCAT111 (Nguyễn Văn A) vào lớp MH001");

  // 10. Thông báo đào tạo mẫu
  const notificationsData = [
    {
      title: "Thông báo về việc nhập điểm học phần Giải tích 1 (BAS1111) Học kỳ 1 năm học 2025-2026",
      content: "Đề nghị giảng viên phụ trách hoàn tất nhập điểm học phần Giải tích 1 (MH001) đúng thời hạn quy định.",
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
  console.log("👉 Bảng điểm hiện đang TRỐNG. Bạn có thể đăng nhập tài khoản 'lecturer' (Lecturer@123) hoặc 'admin' (Admin@123) để tự tay thêm điểm 8.50 cho sinh viên B23DCAT111 theo đúng kịch bản thực nghiệm!");
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
