import { checkAllScoresIntegrity } from "../apps/api/src/services/integrity.service.js";
import { prisma } from "../apps/api/src/db.js";

async function main() {
  console.log("=================================================================");
  console.log("🔍 [INTEGRITY CHECKER] KIỂM TRA TÍNH TOÀN VẸN CSDL VỚI BLOCKCHAIN");
  console.log("=================================================================\n");

  const startTime = Date.now();
  const summary = await checkAllScoresIntegrity();
  const duration = Date.now() - startTime;

  console.log("BẢNG TỔNG HỢP KIỂM TRA:");
  console.log("-----------------------------------------------------------------");
  console.log(` Tổng số bản ghi kiểm tra: ${summary.total}`);
  console.log(` ✅ Hợp lệ (VALID):        ${summary.valid}`);
  console.log(` ❌ Giả mạo (INVALID):     ${summary.invalid}`);
  console.log(` ⏳ Chờ xử lý (PENDING):   ${summary.pending}`);
  console.log(` ⚠️  Lỗi truy vấn (ERROR):   ${summary.error}`);
  console.log(` Thời gian thực thi:       ${duration} ms`);
  console.log("-----------------------------------------------------------------\n");

  console.log("CHI TIẾT TỪNG BẢN GHI:");
  for (const item of summary.results) {
    const icon =
      item.result === "VALID"
        ? "✅ VALID"
        : item.result === "INVALID"
        ? "❌ INVALID"
        : "⚠️ " + item.result;

    console.log(`\n[ID ${item.scoreId}] ${item.studentId} | Môn: ${item.courseCode} | HK: ${item.semester}`);
    console.log(`   - Kết quả kiểm tra:     ${icon}`);
    if (item.reason) {
      console.log(`   - Lý do vi phạm:        ${item.reason}`);
    }
    console.log(`   - Thông điệp:           ${item.message}`);
    console.log(`   - Điểm CSDL:            ${item.databaseScore} (Version: ${item.databaseVersion})`);
    console.log(`   - Hash trong CSDL:      ${item.databaseHash}`);
    console.log(`   - Hash trên Blockchain: ${item.blockchainHash || "N/A"} (Version: ${item.blockchainVersion || "N/A"})`);
    if (item.blockchainAction) {
      console.log(`   - Action trên Chain:    ${item.blockchainAction}`);
    }
  }

  console.log("\n=================================================================");
  if (summary.invalid > 0) {
    console.log(`🚨 CẢNH BÁO: PHÁT HIỆN ${summary.invalid} BẢN GHI BỊ GIẢ MẠO HOẶC SAI LỆCH VỚI BLOCKCHAIN!`);
  } else {
    console.log("✨ TẤT CẢ DỮ LIỆU ĐỀU TOÀN VẸN VÀ KHỚP 100% VỚI BLOCKCHAIN!");
  }
  console.log("=================================================================\n");
}

main()
  .catch((err) => {
    console.error("❌ Lỗi khi chạy integrity checker:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
