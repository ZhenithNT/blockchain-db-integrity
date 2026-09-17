import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  Action,
  computeActorHash,
  computeDataHash,
  computeRecordKey,
} from "../../packages/shared/src/index.js";
import {
  appendEvidenceOnChain,
  recordExistsOnChain,
} from "../../apps/api/src/blockchain.js";

const prisma = new PrismaClient();

export async function runSeed() {
  console.log("🌱 Bắt đầu khởi tạo dữ liệu mẫu (Seed Data)...");

  // 1. Khởi tạo người dùng
  const users = [
    {
      username: "admin",
      password: "Admin@123",
      role: "ADMIN",
    },
    {
      username: "lecturer",
      password: "Lecturer@123",
      role: "LECTURER",
    },
    {
      username: "auditor",
      password: "Auditor@123",
      role: "AUDITOR",
    },
  ];

  for (const u of users) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(u.password, salt);

    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        passwordHash,
        role: u.role,
      },
      create: {
        username: u.username,
        passwordHash,
        role: u.role,
      },
    });
    console.log(`  ✓ Đã tạo/cập nhật tài khoản: ${u.username} (${u.role})`);
  }

  // 2. Khởi tạo điểm mẫu: SV001 - ATWEB - 2026-1 - 8.50
  const sampleScores = [
    {
      studentId: "SV001",
      courseCode: "ATWEB",
      semester: "2026-1",
      score: "8.50",
      actorId: "lecturer",
    },
    {
      studentId: "SV002",
      courseCode: "ATWEB",
      semester: "2026-1",
      score: "7.00",
      actorId: "lecturer",
    },
    {
      studentId: "SV003",
      courseCode: "CSDLNC",
      semester: "2026-1",
      score: "9.25",
      actorId: "lecturer",
    },
  ];

  for (const item of sampleScores) {
    const recordKey = computeRecordKey({
      studentId: item.studentId,
      courseCode: item.courseCode,
      semester: item.semester,
    });

    const dataHash = computeDataHash({
      studentId: item.studentId,
      courseCode: item.courseCode,
      semester: item.semester,
      score: item.score,
      version: 1,
      status: "ACTIVE",
    });

    const actorHash = computeActorHash(item.actorId);

    const existingScore = await prisma.score.findUnique({
      where: {
        unique_student_course_semester: {
          studentId: item.studentId,
          courseCode: item.courseCode,
          semester: item.semester,
        },
      },
    });

    let scoreRow = existingScore;

    if (!scoreRow) {
      let txHash: string | null = null;
      let blockNum: bigint | null = null;
      let bcTime: Date | null = null;
      let bcStatus = "PENDING";

      try {
        const onChain = await recordExistsOnChain(recordKey);
        if (!onChain) {
          const receipt = await appendEvidenceOnChain(
            recordKey,
            dataHash,
            actorHash,
            1n,
            Action.CREATE
          );
          txHash = receipt.transactionHash;
          blockNum = receipt.blockNumber;
          bcTime = receipt.blockchainTimestamp;
          bcStatus = "CONFIRMED";
        } else {
          bcStatus = "CONFIRMED";
        }
      } catch (_err) {
        bcStatus = "PENDING";
      }

      scoreRow = await prisma.score.create({
        data: {
          studentId: item.studentId,
          courseCode: item.courseCode,
          semester: item.semester,
          score: item.score,
          version: 1,
          status: "ACTIVE",
          recordKey,
          dataHash,
          blockchainStatus: bcStatus,
        },
      });

      await prisma.scoreVersion.create({
        data: {
          scoreId: scoreRow.id,
          version: 1,
          score: item.score,
          status: "ACTIVE",
          action: "CREATE",
          dataHash,
          actorHash,
          transactionHash: txHash,
          blockNumber: blockNum,
          blockchainTimestamp: bcTime,
          syncStatus: bcStatus,
        },
      });

      await prisma.auditLog.create({
        data: {
          actor: item.actorId,
          action: "CREATE",
          target: `scores:${scoreRow.id}`,
          afterData: JSON.stringify(scoreRow),
          ip: "127.0.0.1",
        },
      });

      console.log(`  ✓ Đã tạo điểm mẫu: ${item.studentId} | ${item.courseCode} | ${item.score} [Blockchain: ${bcStatus}]`);
    } else {
      try {
        const onChain = await recordExistsOnChain(recordKey);
        if (!onChain) {
          const receipt = await appendEvidenceOnChain(
            recordKey,
            dataHash,
            actorHash,
            1n,
            Action.CREATE
          );
          await prisma.score.update({
            where: { id: existingScore.id },
            data: { blockchainStatus: "CONFIRMED" },
          });
          await prisma.scoreVersion.updateMany({
            where: { scoreId: existingScore.id, version: 1 },
            data: {
              transactionHash: receipt.transactionHash,
              blockNumber: receipt.blockNumber,
              blockchainTimestamp: receipt.blockchainTimestamp,
              syncStatus: "CONFIRMED",
            },
          });
          console.log(`  ✓ Đã đồng bộ điểm mẫu lên Blockchain: ${item.studentId} | ${item.courseCode}`);
        } else {
          console.log(`  ℹ Điểm mẫu đã tồn tại và đã có trên Blockchain: ${item.studentId} | ${item.courseCode}`);
        }
      } catch {
        console.log(`  ℹ Điểm mẫu đã tồn tại: ${item.studentId} | ${item.courseCode}`);
      }
    }
  }

  console.log("✅ Khởi tạo dữ liệu mẫu hoàn tất!");
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
