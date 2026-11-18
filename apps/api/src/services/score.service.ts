import {
  Action,
  type Hex,
  computeDataHash,
  computeRecordKey,
  normalizeScore,
} from "@integrity/shared";
import { getHistoryFromChain, sendTx } from "../blockchain.js";
import { prisma } from "../db.js";
import { getAddressBook, getSigner, resolveSigner } from "./wallet.service.js";

/**
 * GHI ĐIỂM
 *
 * Thứ tự: (1) ký và ghi bằng chứng lên blockchain bằng ví của admin đang đăng nhập,
 *         (2) chỉ khi chain thành công mới ghi vào MySQL.
 * Điểm thật nằm ở MySQL. Blockchain chỉ giữ hash và ví đã ký.
 */

async function writeAudit(actor: string, action: string, target: string, before: unknown, after: unknown, ip: string) {
  await prisma.auditLog.create({
    data: {
      actor,
      action,
      target,
      beforeData: before ? JSON.stringify(before) : null,
      afterData: after ? JSON.stringify(after) : null,
      ip,
    },
  });
}

export async function getCatalog() {
  const [students, courses, semesters] = await Promise.all([
    prisma.student.findMany({ orderBy: { studentCode: "asc" } }),
    prisma.course.findMany({ orderBy: { code: "asc" } }),
    prisma.semester.findMany({ orderBy: { code: "desc" } }),
  ]);
  return { students, courses, semesters };
}

export async function getScores(filter: { search?: string; semester?: string } = {}) {
  const where: any = {};
  if (filter.semester) where.semester = filter.semester;
  if (filter.search) {
    where.OR = [
      { studentId: { contains: filter.search } },
      { courseCode: { contains: filter.search } },
    ];
  }

  const [rows, students] = await Promise.all([
    prisma.score.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { integrityChecks: { orderBy: { checkedAt: "desc" }, take: 1 } },
    }),
    prisma.student.findMany(),
  ]);
  const names = new Map(students.map((s) => [s.studentCode, s.fullName]));

  return rows.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    studentName: names.get(s.studentId) || null,
    courseCode: s.courseCode,
    semester: s.semester,
    score: s.score,
    version: s.version,
    recordKey: s.recordKey,
    dataHash: s.dataHash,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    latestCheck: s.integrityChecks[0]
      ? {
          result: s.integrityChecks[0].result,
          reason: s.integrityChecks[0].reason,
          checkedAt: s.integrityChecks[0].checkedAt,
        }
      : null,
  }));
}

/** Chi tiết một điểm kèm lịch sử. Người ký của từng phiên bản lấy từ blockchain. */
export async function getScoreById(id: number) {
  const score = await prisma.score.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: "asc" } } },
  });
  if (!score) throw { statusCode: 404, message: `Không tìm thấy điểm ID ${id}` };

  const [book, chain] = await Promise.all([
    getAddressBook(),
    getHistoryFromChain(score.recordKey as Hex).catch(() => []),
  ]);

  const student = await prisma.student.findUnique({ where: { studentCode: score.studentId } });

  return {
    ...score,
    studentName: student?.fullName || null,
    versions: score.versions.map((v) => {
      const ev = chain[v.version - 1];
      return {
        ...v,
        blockNumber: v.blockNumber !== null ? v.blockNumber.toString() : null,
        signer: ev ? resolveSigner(book, ev.writer) : null,
        blockchainTimestamp: ev ? new Date(Number(ev.timestamp) * 1000).toISOString() : null,
      };
    }),
  };
}

export async function createScore(
  data: { studentId: string; courseCode: string; semester: string; score: string | number },
  username: string,
  ip = "127.0.0.1"
) {
  const studentId = data.studentId.trim();
  const courseCode = data.courseCode.trim();
  const semester = data.semester.trim();
  const score = normalizeScore(data.score);

  const [student, course, sem] = await Promise.all([
    prisma.student.findUnique({ where: { studentCode: studentId } }),
    prisma.course.findUnique({ where: { code: courseCode } }),
    prisma.semester.findUnique({ where: { code: semester } }),
  ]);
  if (!student) throw { statusCode: 400, message: `Không có sinh viên ${studentId}.` };
  if (!course) throw { statusCode: 400, message: `Không có môn ${courseCode}.` };
  if (!sem) throw { statusCode: 400, message: `Không có học kỳ ${semester}.` };

  const existing = await prisma.score.findUnique({
    where: { unique_student_course_semester: { studentId, courseCode, semester } },
  });
  if (existing) {
    throw { statusCode: 400, message: `Điểm của ${studentId} môn ${courseCode} kỳ ${semester} đã tồn tại.` };
  }

  const recordKey = computeRecordKey({ studentId, courseCode, semester });
  const dataHash = computeDataHash({ studentId, courseCode, semester, score, version: 1 });

  const signer = await getSigner(username);
  const tx = await sendTx(signer, "appendEvidence", [recordKey, dataHash, 1n, Action.CREATE]);

  const created = await prisma.score.create({
    data: {
      studentId,
      courseCode,
      semester,
      score,
      version: 1,
      recordKey,
      dataHash,
      versions: {
        create: {
          version: 1,
          score,
          action: "CREATE",
          dataHash,
          transactionHash: tx.transactionHash,
          blockNumber: tx.blockNumber,
        },
      },
    },
  });

  await writeAudit(username, "CREATE_SCORE", `scores:${created.id}`, null, { studentId, courseCode, semester, score, version: 1 }, ip);
  return { score: created, transactionHash: tx.transactionHash, signer: signer.address };
}

export async function updateScore(id: number, newScoreInput: string | number, username: string, ip = "127.0.0.1") {
  const current = await prisma.score.findUnique({ where: { id } });
  if (!current) throw { statusCode: 404, message: `Không tìm thấy điểm ID ${id}` };

  const newScore = normalizeScore(newScoreInput);
  if (newScore === current.score) {
    throw { statusCode: 400, message: "Điểm mới trùng điểm hiện tại." };
  }

  // Phiên bản kế tiếp tính theo blockchain (nguồn sự thật), không tin cột version trong MySQL.
  const chain = await getHistoryFromChain(current.recordKey as Hex);
  if (chain.length === 0) {
    throw { statusCode: 409, message: "Bản ghi chưa có bằng chứng trên blockchain." };
  }
  const nextVersion = chain.length + 1;

  const { studentId, courseCode, semester, recordKey } = current;
  const dataHash = computeDataHash({ studentId, courseCode, semester, score: newScore, version: nextVersion });

  const signer = await getSigner(username);
  const tx = await sendTx(signer, "appendEvidence", [recordKey as Hex, dataHash, BigInt(nextVersion), Action.UPDATE]);

  const updated = await prisma.$transaction(async (db) => {
    const row = await db.score.update({
      where: { id },
      data: { score: newScore, version: nextVersion, dataHash },
    });
    await db.scoreVersion.upsert({
      where: { unique_score_version: { scoreId: id, version: nextVersion } },
      update: { score: newScore, action: "UPDATE", dataHash, transactionHash: tx.transactionHash, blockNumber: tx.blockNumber },
      create: {
        scoreId: id,
        version: nextVersion,
        score: newScore,
        action: "UPDATE",
        dataHash,
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
      },
    });
    return row;
  });

  await writeAudit(
    username,
    "UPDATE_SCORE",
    `scores:${id}`,
    { score: current.score, version: current.version },
    { score: newScore, version: nextVersion },
    ip
  );
  return { score: updated, transactionHash: tx.transactionHash, signer: signer.address };
}
