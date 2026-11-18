import { checkAllScoresIntegrity } from "../apps/api/src/services/integrity.service.js";
import { prisma } from "../apps/api/src/db.js";

async function main() {
  const start = Date.now();
  const report = await checkAllScoresIntegrity();
  const { summary } = report;

  console.log("KIỂM TRA TOÀN VẸN: MySQL so với blockchain");
  console.log("------------------------------------------");
  console.log(`Tổng: ${summary.total} | Hợp lệ: ${summary.valid} | Sai lệch: ${summary.invalid} | Lỗi: ${summary.errors} | Bị xóa: ${summary.missing}`);
  console.log(`Thời gian: ${Date.now() - start} ms\n`);

  for (const r of report.results) {
    const who = r.writer ? `${r.writer.fullName} (${r.writer.address.slice(0, 8)}…)` : "—";
    console.log(`[${r.result}] ${r.studentId} | ${r.courseCode} | ${r.semester} | điểm ${r.databaseScore} v${r.databaseVersion} | người ký gần nhất: ${who}`);
    if (r.result !== "VALID") console.log(`    ${r.reason ?? ""} ${r.message}`);
  }
  for (const m of report.missing) {
    console.log(`[MISSING_IN_DATABASE] ${m.recordKey.slice(0, 14)}… v${m.blockchainVersion} người ký: ${m.writer?.fullName ?? "—"}`);
  }
  if (report.chainError) console.log(`Lỗi đọc blockchain: ${report.chainError}`);
}

main()
  .catch((err) => {
    console.error("Lỗi:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
