import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("⚠️  BẮT ĐẦU XÓA SẠCH TOÀN BỘ DỮ LIỆU ĐỂ BẮT ĐẦU LẠI TỪ CON SỐ 0...");

  // Xóa theo đúng thứ tự ràng buộc khóa ngoại (Foreign Keys)
  await prisma.scoreVersion.deleteMany({});
  await prisma.integrityCheck.deleteMany({});
  await prisma.scoreChangeRequest.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.lecturerAssignment.deleteMany({});
  await prisma.courseOffering.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.blockchainOperation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.lecturer.deleteMany({});
  await prisma.course.deleteMany({});

  console.log("✓ Đã xóa sạch: Điểm số, Lịch sử băm, Nhật ký kiểm toán");
  console.log("✓ Đã xóa sạch: Toàn bộ Lớp học phần, Phân công giảng viên, Ghi danh sinh viên");
  console.log("✓ Đã xóa sạch: Danh mục Môn học, Giảng viên, Sinh viên cũ");

  // Khởi tạo 1 học kỳ mặc định (để sẵn sàng tạo lớp học phần)
  await prisma.semester.upsert({
    where: { code: "2025-2026.1" },
    update: { isCurrent: true },
    create: {
      code: "2025-2026.1",
      name: "Học kỳ 1 năm học 2025-2026",
      isCurrent: true,
      startDate: new Date("2025-08-15"),
      endDate: new Date("2026-01-15"),
    },
  });
  console.log("✓ Đã khởi tạo học kỳ mặc định: 2025-2026.1 (Học kỳ 1 năm học 2025-2026)");

  // Khởi tạo tài khoản Quản trị viên (ADMIN) duy nhất để người dùng đăng nhập vào hệ thống
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: adminPasswordHash,
      fullName: "Ban Quản Trị Đào Tạo",
      role: "ADMIN",
      email: "daotao@ptit.edu.vn",
    },
  });

  console.log(`✓ Đã tạo tài khoản Quản trị viên duy nhất: username '${adminUser.username}' / pass 'Admin@123'`);
  console.log("\n=================================================================");
  console.log("✨ HỆ THỐNG ĐÃ SẠCH 100%! BÂY GIỜ BẠN CÓ THỂ TỰ NHẬP MỚI TOÀN BỘ TỪ ĐẦU:");
  console.log("   1. Môn học:          0 môn (Tự thêm tại menu Quản lý Đào tạo)");
  console.log("   2. Giảng viên:        0 GV (Tự thêm hoặc Đăng ký từ màn hình đăng nhập)");
  console.log("   3. Sinh viên:         0 SV (Tự thêm hoặc Đăng ký từ màn hình đăng nhập)");
  console.log("   4. Lớp học phần:     0 lớp (Tự mở và phân công GV/SV)");
  console.log("   5. Điểm số:           0 bản ghi (Tự chấm và neo Blockchain)");
  console.log("=================================================================\n");
}

main()
  .catch((err) => {
    console.error("❌ Lỗi khi reset CSDL:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
