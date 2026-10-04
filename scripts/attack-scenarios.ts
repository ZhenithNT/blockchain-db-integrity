import { PrismaClient } from "@prisma/client";
import { computeDataHash, normalizeScore } from "../packages/shared/src/index.js";

const prisma = new PrismaClient();

const usage = `
=============================================================================
🛠️  TOOL GIẢ LẬP KẺ TẤN CÔNG / DBA CAN THIỆP TRỰC TIẾP MYSQL
(Bypass hoàn toàn ứng dụng Web, không cần đăng nhập, không ghi Audit Log)
=============================================================================

Cú pháp:
  npx tsx scripts/attack-scenarios.ts <lệnh> [tham số...]

Danh sách lệnh hỗ trợ:
-----------------------------------------------------------------------------
[NGƯỜI 1: TÍNH TOÀN VẸN DỮ LIỆU HIỆN TẠI]
  1. tamper-score <studentId> [newScore=10.00]
     -> Sửa trực tiếp điểm trong scores thành newScore (giữ nguyên dataHash cũ)

  2. tamper-both <studentId> [newScore=10.00]
     -> Che giấu: Sửa cả điểm VÀ tự tính lại dataHash mới trong MySQL

  3. rollback-v1 <studentId>
     -> Quay về phiên bản cũ: Gán lại điểm và dataHash của v1 vào scores hiện tại

  4. inject-fake <studentId> <courseCode> [score=10.00]
     -> Chèn bản ghi điểm giả trực tiếp vào MySQL (chưa từng neo Blockchain)

  5. delete-score <studentId>
     -> Xóa vật lý bản ghi điểm khỏi MySQL (trong khi Evidence vẫn còn on-chain)

-----------------------------------------------------------------------------
[NGƯỜI 2: TRUY XUẤT NGUỒN GỐC & LỊCH SỬ]
  6. tamper-history <studentId> <version> [newScore=9.50]
     -> Sửa điểm của một phiên bản cũ trong score_versions

  7. delete-history <studentId> <version>
     -> Xóa một phiên bản ở giữa trong score_versions (gây đứt chuỗi lịch sử)

  8. spoof-actor <studentId> <version> [fakeActor=ADMIN_MOCK]
     -> Gán sai người thao tác (actor) trong score_versions

  9. spoof-tx <studentId> <version>
     -> Gán sai mã transactionHash trong score_versions thành mã hash rác

-----------------------------------------------------------------------------
[NGƯỜI 3: AUDIT LOG VS BLOCKCHAIN]
  10. clear-audit-log [studentId]
     -> Xóa sạch nhật ký trong bảng audit_logs để phi tang dấu vết

-----------------------------------------------------------------------------
[LỆNH KHÔI PHỤC DỮ LIỆU SAU DEMO]
  11. restore <studentId>
     -> Khôi phục điểm MySQL về phiên bản hợp lệ gần nhất dựa trên Blockchain!
=============================================================================
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(usage);
    process.exit(0);
  }

  switch (command) {
    case "tamper-score": {
      const studentId = args[1] || "B23DCAT111";
      const newScore = normalizeScore(args[2] || "10.00");
      const score = await prisma.score.findFirst({ where: { studentId } });
      if (!score) throw new Error(`Không tìm thấy điểm của sinh viên ${studentId}`);
      
      const oldScore = score.score;
      await prisma.score.update({
        where: { id: score.id },
        data: { score: newScore },
      });
      console.log(`💥 [ATTACK] Đã sửa trực tiếp điểm SV ${studentId} từ ${oldScore} -> ${newScore} trong bảng scores!`);
      console.log(`   (Giữ nguyên dataHash cũ: ${score.dataHash})`);
      console.log(`👉 Mở Web -> Bấm 'Kiểm tra toàn vẹn CSDL' để xem hệ thống phát hiện HASH_MISMATCH!`);
      break;
    }

    case "tamper-both": {
      const studentId = args[1] || "B23DCAT111";
      const newScore = normalizeScore(args[2] || "10.00");
      const score = await prisma.score.findFirst({ where: { studentId } });
      if (!score) throw new Error(`Không tìm thấy điểm của sinh viên ${studentId}`);

      const tamperedHash = computeDataHash({
        studentId: score.studentId,
        courseCode: score.courseCode,
        semester: score.semester,
        score: newScore,
        version: score.version,
        status: score.status,
      });

      await prisma.score.update({
        where: { id: score.id },
        data: { score: newScore, dataHash: tamperedHash },
      });
      console.log(`💥 [ATTACK] Che giấu tinh vi: Đã sửa điểm thành ${newScore} VÀ cập nhật luôn dataHash mới trong MySQL!`);
      console.log(`   dataHash mới: ${tamperedHash}`);
      console.log(`👉 Mở Web -> Bấm 'Kiểm tra toàn vẹn': Blockchain vẫn phát hiện vì hash trên Chain không khớp!`);
      break;
    }

    case "rollback-v1": {
      const studentId = args[1] || "B23DCAT111";
      const score = await prisma.score.findFirst({ where: { studentId } });
      if (!score) throw new Error(`Không tìm thấy điểm của sinh viên ${studentId}`);

      const v1 = await prisma.scoreVersion.findFirst({
        where: { scoreId: score.id, version: 1 },
      });
      if (!v1) throw new Error(`Không tìm thấy version 1 của ${studentId}`);

      await prisma.score.update({
        where: { id: score.id },
        data: {
          score: v1.score,
          version: 1,
          dataHash: v1.dataHash,
        },
      });
      console.log(`💥 [ATTACK] Rollback Attack: Đã đưa điểm hiện tại về dữ liệu Version 1 (Score: ${v1.score}, Version: 1)!`);
      console.log(`👉 Mở Web -> Bấm 'Kiểm tra toàn vẹn': Phát hiện lỗi STALE_VERSION vì Chain đã ở Version cao hơn!`);
      break;
    }

    case "inject-fake": {
      const studentId = args[1] || "B23DCAT999";
      const courseCode = args[2] || "BAS1111";
      const fakeScore = normalizeScore(args[3] || "10.00");

      const fakeHash = "0x" + "99".repeat(32);
      const fakeKey = "0x" + "88".repeat(32);

      const created = await prisma.score.create({
        data: {
          studentId,
          courseCode,
          semester: "2025-2026.1",
          score: fakeScore,
          version: 1,
          status: "ACTIVE",
          recordKey: fakeKey,
          dataHash: fakeHash,
          blockchainStatus: "NOT_REGISTERED",
        },
      });
      console.log(`💥 [ATTACK] Chèn dữ liệu giả: Đã INSERT điểm ${fakeScore} cho SV ${studentId} (ID: ${created.id}) trực tiếp vào MySQL!`);
      console.log(`👉 Mở Web -> Bấm 'Kiểm tra toàn vẹn': Hệ thống phát hiện UNREGISTERED_RECORD / NOT_ON_CHAIN!`);
      break;
    }

    case "delete-score": {
      const studentId = args[1] || "B23DCAT111";
      const score = await prisma.score.findFirst({ where: { studentId } });
      if (!score) throw new Error(`Không tìm thấy điểm của sinh viên ${studentId}`);

      await prisma.score.delete({ where: { id: score.id } });
      console.log(`💥 [ATTACK] Xóa vật lý: Đã DELETE toàn bộ bản ghi điểm của ${studentId} khỏi bảng scores!`);
      console.log(`👉 Mở Web -> Bấm 'Kiểm tra toàn vẹn': Thuật toán quét ngược phát hiện MISSING_RECORD trong DB!`);
      break;
    }

    case "tamper-history": {
      const studentId = args[1] || "B23DCAT111";
      const version = Number(args[2] || 1);
      const newScore = normalizeScore(args[3] || "9.50");

      const score = await prisma.score.findFirst({ where: { studentId } });
      if (!score) throw new Error(`Không tìm thấy điểm của ${studentId}`);

      const hist = await prisma.scoreVersion.findFirst({
        where: { scoreId: score.id, version },
      });
      if (!hist) throw new Error(`Không tìm thấy lịch sử version ${version} của ${studentId}`);

      await prisma.scoreVersion.update({
        where: { id: hist.id },
        data: { score: newScore },
      });
      console.log(`💥 [ATTACK] Đã sửa lén điểm ở Version ${version} trong quá khứ thành ${newScore}!`);
      console.log(`👉 Mở Web -> Xem lịch sử/Bằng chứng: Hệ thống chỉ đích danh Version ${version} bị GIẢ MẠO!`);
      break;
    }

    case "delete-history": {
      const studentId = args[1] || "B23DCAT111";
      const version = Number(args[2] || 1);

      const score = await prisma.score.findFirst({ where: { studentId } });
      if (!score) throw new Error(`Không tìm thấy điểm của ${studentId}`);

      const hist = await prisma.scoreVersion.findFirst({
        where: { scoreId: score.id, version },
      });
      if (!hist) throw new Error(`Không tìm thấy lịch sử version ${version} của ${studentId}`);

      await prisma.scoreVersion.delete({ where: { id: hist.id } });
      console.log(`💥 [ATTACK] Đã XÓA MẤT Version ${version} trong bảng score_versions!`);
      console.log(`👉 Mở Web -> Kiểm tra lịch sử: Phát hiện chuỗi version bị đứt gãy so với Blockchain!`);
      break;
    }

    case "spoof-actor": {
      const studentId = args[1] || "B23DCAT111";
      const version = Number(args[2] || 1);
      const fakeActor = args[3] || "HACKER_ADMIN_MOCK";

      const score = await prisma.score.findFirst({ where: { studentId } });
      if (!score) throw new Error(`Không tìm thấy điểm của ${studentId}`);

      const hist = await prisma.scoreVersion.findFirst({
        where: { scoreId: score.id, version },
      });
      if (!hist) throw new Error(`Không tìm thấy lịch sử version ${version} của ${studentId}`);

      const fakeActorHash = "0x" + "77".repeat(32);
      await prisma.scoreVersion.update({
        where: { id: hist.id },
        data: { actorHash: fakeActorHash },
      });
      console.log(`💥 [ATTACK] Mạo danh người thao tác: Đã thay actorHash của Version ${version} thành hash giả mạo!`);
      console.log(`👉 Mở Web -> Bằng chứng Blockchain: Phát hiện actorHash không khớp với người ký on-chain!`);
      break;
    }

    case "spoof-tx": {
      const studentId = args[1] || "B23DCAT111";
      const version = Number(args[2] || 1);
      const fakeTx = "0x" + "12".repeat(32);

      const score = await prisma.score.findFirst({ where: { studentId } });
      if (!score) throw new Error(`Không tìm thấy điểm của ${studentId}`);

      const hist = await prisma.scoreVersion.findFirst({
        where: { scoreId: score.id, version },
      });
      if (!hist) throw new Error(`Không tìm thấy lịch sử version ${version} của ${studentId}`);

      await prisma.scoreVersion.update({
        where: { id: hist.id },
        data: { transactionHash: fakeTx },
      });
      console.log(`💥 [ATTACK] Gán sai giao dịch: Đã đổi transactionHash của Version ${version} thành ${fakeTx}!`);
      console.log(`👉 Mở Web -> Kiểm tra: TxHash này không trỏ đến sự kiện hợp lệ trên Smart Contract!`);
      break;
    }

    case "clear-audit-log": {
      const targetParam = args[1];
      if (targetParam) {
        await prisma.auditLog.deleteMany({
          where: { target: { contains: targetParam } },
        });
        console.log(`💥 [ATTACK] Đã XÓA TOÀN BỘ nhật ký audit_logs liên quan đến '${targetParam}'!`);
      } else {
        await prisma.auditLog.deleteMany({});
        console.log(`💥 [ATTACK] Đã XÓA SẠCH 100% dữ liệu trong bảng audit_logs!`);
      }
      console.log(`   (Bảng audit_logs hiện hoàn toàn trắng xóa, không còn lưu vết ai đã sửa gì)`);
      console.log(`👉 Mở Web -> Mục Audit Log: Trắng tinh!`);
      console.log(`👉 Bấm 'Kiểm tra toàn vẹn Blockchain': Bằng chứng trên Smart Contract vẫn còn nguyên vẹn 100%!`);
      break;
    }

    case "restore": {
      const studentId = args[1] || "B23DCAT111";
      const score = await prisma.score.findFirst({
        where: { studentId },
        include: {
          versions: {
            orderBy: { version: "desc" },
          },
        },
      });
      if (!score) throw new Error(`Không tìm thấy điểm của sinh viên ${studentId}`);
      if (score.versions.length === 0) throw new Error(`Không có phiên bản lịch sử để khôi phục`);

      const legit = score.versions[0];
      const oldScore = score.score;
      const restored = await prisma.score.update({
        where: { id: score.id },
        data: {
          score: legit.score,
          attendanceScore: legit.attendanceScore,
          midtermScore: legit.midtermScore,
          finalScore: legit.finalScore,
          version: legit.version,
          status: legit.status,
          dataHash: legit.dataHash,
          blockchainStatus: "CONFIRMED",
        },
      });

      await prisma.auditLog.create({
        data: {
          actor: "ADMIN_RECOVERY",
          action: "RESTORE_DATABASE",
          target: `scores:${score.id}`,
          beforeData: JSON.stringify({ score: oldScore }),
          afterData: JSON.stringify({ score: legit.score, version: legit.version }),
          ip: "127.0.0.1",
        },
      });

      console.log(`✅ [RESTORE] Đã khôi phục thành công điểm của SV ${studentId}!`);
      console.log(`   - Điểm đã hoàn nguyên từ ${oldScore} về ${restored.score} (Version ${legit.version})`);
      console.log(`   - dataHash: ${restored.dataHash}`);
      console.log(`👉 Mở Web -> Bấm 'Kiểm tra toàn vẹn CSDL': Trở lại trạng thái XANH (VALID) 100%!`);
      break;
    }

    default:
      console.log(`❌ Lệnh không hợp lệ: '${command}'`);
      console.log(usage);
      process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("❌ Lỗi thực thi tấn công:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
