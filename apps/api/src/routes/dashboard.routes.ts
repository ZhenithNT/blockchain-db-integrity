import { Router } from "express";
import { prisma } from "../db.js";
import { authenticate } from "../middlewares/auth.middleware.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get("/", async (_req, res, next) => {
  try {
    const totalScores = await prisma.score.count();

    // Lấy trạng thái kiểm tra mới nhất của từng điểm
    const allScores = await prisma.score.findMany({
      include: {
        integrityChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
    });

    let validCount = 0;
    let invalidCount = 0;
    let pendingCount = 0;
    let errorCount = 0;

    for (const sc of allScores) {
      const latest = sc.integrityChecks[0];
      if (!latest) {
        pendingCount++;
      } else if (latest.result === "VALID") {
        validCount++;
      } else if (latest.result === "INVALID") {
        invalidCount++;
      } else if (latest.result === "PENDING") {
        pendingCount++;
      } else {
        errorCount++;
      }
    }

    // Các giao dịch Blockchain gần nhất
    const recentTransactions = await prisma.scoreVersion.findMany({
      where: {
        transactionHash: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        scoreRef: true,
      },
    });

    // Các vết kiểm toán audit log gần nhất
    const recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    res.json({
      summary: {
        totalScores,
        validCount,
        invalidCount,
        pendingCount,
        errorCount,
      },
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        scoreId: tx.scoreId,
        studentId: tx.scoreRef.studentId,
        courseCode: tx.scoreRef.courseCode,
        version: tx.version,
        action: tx.action,
        score: tx.score,
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber !== null ? tx.blockNumber.toString() : null,
        timestamp: tx.blockchainTimestamp || tx.createdAt,
      })),
      recentAuditLogs,
    });
  } catch (err) {
    next(err);
  }
});
