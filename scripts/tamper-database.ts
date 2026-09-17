import { PrismaClient } from "@prisma/client";
import { computeDataHash, normalizeScore } from "../packages/shared/src/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================================");
  console.log("⚡ [KỊCH BẢN DEMO TẤN CÔNG] GIẢ MẠO DỮ LIỆU TRỰC TIẾP TRONG MYSQL");
  console.log("=================================================================\n");

  // Tìm bản ghi của sinh viên SV001
  const studentId = "SV001";
  const score = await prisma.score.findFirst({
    where: { studentId },
  });

  if (!score) {
    throw new Error(
      `Không tìm thấy bản ghi điểm của ${studentId}. Hãy chạy 'npm run db:seed' trước.`
    );
  }

  const oldScore = score.score;
  const newScore = "10.00";
  const formattedNewScore = normalizeScore(newScore);

  console.log(`📌 Bản ghi mục tiêu: ID ${score.id} | SV: ${score.studentId} | Môn: ${score.courseCode}`);
  console.log(`   - Điểm gốc trong MySQL: ${oldScore}`);
  console.log(`   - Điểm sẽ sửa thành:    ${formattedNewScore}`);
  console.log(`   - Version hiện tại:     ${score.version}`);
  console.log(`   - Hash ban đầu:         ${score.dataHash}`);

  // Tính hash mới của dữ liệu giả mạo
  const tamperedHash = computeDataHash({
    studentId: score.studentId,
    courseCode: score.courseCode,
    semester: score.semester,
    score: formattedNewScore,
    version: score.version,
    status: score.status,
  });

  console.log("\n⚠️  ĐANG THỰC HIỆN CAN THIỆP TRỰC TIẾP VÀO CSDL MYSQL:");
  console.log("   ❌ KHÔNG gọi Smart Contract Blockchain");
  console.log("   ❌ KHÔNG tạo transaction hash");
  console.log("   ❌ KHÔNG tăng version");

  // Trực tiếp update MySQL
  const updated = await prisma.score.update({
    where: { id: score.id },
    data: {
      score: formattedNewScore,
      dataHash: tamperedHash,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: "ATTACKER_DIRECT_MYSQL_ACCESS",
      action: "TAMPER_DATABASE",
      target: `scores:${score.id}`,
      beforeData: JSON.stringify({ score: oldScore, version: score.version }),
      afterData: JSON.stringify({ score: formattedNewScore, version: score.version }),
      ip: "127.0.0.1",
    },
  });

  console.log("\n💥 DỮ LIỆU ĐÃ BỊ SỬA LÉN TRONG MYSQL!");
  console.log(`   - Điểm hiện tại trong CSDL: ${updated.score}`);
  console.log(`   - Hash mới trong CSDL:      ${updated.dataHash}`);
  console.log("\n👉 Hãy chạy 'npm run integrity:check' để chứng kiến Blockchain phát hiện giả mạo!");
}

main()
  .catch((err) => {
    console.error("❌ Lỗi khi thực hiện tamper:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
