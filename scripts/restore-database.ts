import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================================");
  console.log("🔄 [KHÔI PHỤC DỮ LIỆU DEMO] TRẢ VỀ DỮ LIỆU CHÍNH THỨC TỪ LỊCH SỬ");
  console.log("=================================================================\n");

  const studentId = "SV001";
  const score = await prisma.score.findFirst({
    where: { studentId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!score) {
    throw new Error(`Không tìm thấy bản ghi điểm của ${studentId}.`);
  }

  const legitVersion = score.versions[0];
  if (!legitVersion) {
    throw new Error("Không có phiên bản lịch sử để khôi phục.");
  }

  console.log(`📌 Khôi phục bản ghi: ID ${score.id} | SV: ${score.studentId}`);
  console.log(`   - Điểm bị giả mạo:       ${score.score}`);
  console.log(`   - Điểm hợp lệ (Version ${legitVersion.version}): ${legitVersion.score}`);
  console.log(`   - Hash hợp lệ:           ${legitVersion.dataHash}`);

  const restored = await prisma.score.update({
    where: { id: score.id },
    data: {
      score: legitVersion.score,
      dataHash: legitVersion.dataHash,
      version: legitVersion.version,
      status: legitVersion.status,
      blockchainStatus: "CONFIRMED",
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: "ADMIN_RECOVERY",
      action: "RESTORE_DATABASE",
      target: `scores:${score.id}`,
      beforeData: JSON.stringify({ score: score.score }),
      afterData: JSON.stringify({ score: legitVersion.score }),
      ip: "127.0.0.1",
    },
  });

  console.log("\n✅ DỮ LIỆU ĐÃ ĐƯỢC KHÔI PHỤC VỀ TRẠNG THÁI HỢP LỆ TRÊN BLOCKCHAIN!");
  console.log(`   - Điểm hiện tại: ${restored.score}`);
  console.log(`   - Hash CSDL:     ${restored.dataHash}`);
}

main()
  .catch((err) => {
    console.error("❌ Lỗi khi khôi phục:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
