import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function runSeed() {
  console.log("Khởi tạo dữ liệu mẫu...");

  // Xóa điểm, lịch sử, kết quả kiểm tra và nhật ký cũ để bắt đầu sạch.
  await prisma.integrityCheck.deleteMany({});
  await prisma.scoreVersion.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.auditLog.deleteMany({});

  const semesters = [
    { code: "2025-2026.1", name: "Học kỳ 1 năm học 2025-2026" },
    { code: "2025-2026.2", name: "Học kỳ 2 năm học 2025-2026" },
  ];
  for (const s of semesters) {
    await prisma.semester.upsert({ where: { code: s.code }, update: { name: s.name }, create: s });
  }

  const courses = [
    { code: "BAS1111", name: "Giải tích 1", credits: 3 },
    { code: "INT1313", name: "Cơ sở dữ liệu", credits: 3 },
    { code: "INT14105", name: "An toàn ứng dụng web và cơ sở dữ liệu", credits: 3 },
  ];
  for (const c of courses) {
    await prisma.course.upsert({ where: { code: c.code }, update: { name: c.name, credits: c.credits }, create: c });
  }

  const students = [
    { studentCode: "B23DCAT111", fullName: "Nguyễn Văn A" },
    { studentCode: "B23DCAT211", fullName: "Nguyễn Trung Nghĩa" },
    { studentCode: "B23DCAT013", fullName: "Nguyễn Lê Kỳ Anh" },
    { studentCode: "B23DCAT086", fullName: "Khuất Quang Hải" },
  ];
  for (const s of students) {
    await prisma.student.upsert({ where: { studentCode: s.studentCode }, update: { fullName: s.fullName }, create: s });
  }

  // Hai admin, mỗi người một ví (ví được tạo ở lần đăng nhập đầu tiên).
  const users = [
    { username: "admin", password: "Admin@123", fullName: "Phòng Đào tạo" },
    { username: "admin2", password: "Admin@123", fullName: "Phòng Khảo thí" },
  ];
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { fullName: u.fullName },
      create: { username: u.username, passwordHash, fullName: u.fullName },
    });
  }

  // Chỉ giữ đúng các tài khoản mẫu (xóa tài khoản cũ cùng ví của chúng).
  await prisma.user.deleteMany({ where: { username: { notIn: users.map((u) => u.username) } } });

  console.log("Đã nạp: 2 học kỳ, 3 môn, 4 sinh viên, tài khoản admin và admin2.");
  console.log("Chưa có điểm nào. Đăng nhập để nhập điểm.");
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  runSeed()
    .catch((err) => {
      console.error("Lỗi khi nạp dữ liệu:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
