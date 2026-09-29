import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Đang dọn sạch toàn bộ dữ liệu điểm số, lịch sử và đối soát...");

  // 1. Xóa các bảng liên quan đến điểm số, giao dịch và bằng chứng
  const deletedAudit = await prisma.auditLog.deleteMany({});
  const deletedChecks = await prisma.integrityCheck.deleteMany({});
  const deletedReqs = await prisma.scoreChangeRequest.deleteMany({});
  const deletedOps = await prisma.blockchainOperation.deleteMany({});
  const deletedVersions = await prisma.scoreVersion.deleteMany({});
  const deletedScores = await prisma.score.deleteMany({});

  // 2. Đưa tất cả các lớp học phần về trạng thái DRAFT (Chưa có điểm, sẵn sàng để người dùng tự gõ)
  const updatedOfferings = await prisma.courseOffering.updateMany({
    data: {
      status: "DRAFT",
      approvedBy: null,
      approvedAt: null,
      submittedAt: null,
      publishedAt: null,
      lockedAt: null,
    },
  });

  console.log(`✓ Đã xóa ${deletedScores.count} bản ghi điểm trong bảng scores.`);
  console.log(`✓ Đã xóa ${deletedVersions.count} bản ghi trong bảng score_versions.`);
  console.log(`✓ Đã xóa ${deletedChecks.count} bản ghi trong bảng integrity_checks.`);
  console.log(`✓ Đã xóa ${deletedOps.count} bản ghi trong bảng blockchain_operations.`);
  console.log(`✓ Đã xóa ${deletedAudit.count} nhật ký kiểm toán trong audit_logs.`);
  console.log(`✓ Đã xóa ${deletedReqs.count} đề xuất điều chỉnh điểm.`);
  console.log(`✓ Đã chuyển ${updatedOfferings.count} lớp học phần về trạng thái DRAFT (sẵn sàng nhập điểm từ Web).`);
  console.log("\n✨ CSDL BÂY GIỜ ĐÃ HOÀN TOÀN SẠCH ĐIỂM SỐ! Người dùng có thể tự nhập liệu từ Front-end.");
}

main()
  .catch((err) => {
    console.error("❌ Lỗi khi dọn CSDL:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
