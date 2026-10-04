import { Router } from "express";
import { prisma } from "../db.js";

export const auditRouter = Router();

/**
 * GET /api/audit-logs
 * Lấy danh sách nhật ký kiểm toán với bộ lọc tìm kiếm
 */
auditRouter.get("/", async (req, res, next) => {
  try {
    const { search, actor, action, limit = "100" } = req.query;
    const take = Math.min(parseInt(limit as string, 10) || 100, 500);

    const where: any = {};
    if (search) {
      where.OR = [
        { actor: { contains: search as string } },
        { target: { contains: search as string } },
        { action: { contains: search as string } },
      ];
    }
    if (actor) where.actor = actor as string;
    if (action) where.action = action as string;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take,
      }),
    ]);

    res.json({ total, logs });
  } catch (err) {
    next(err);
  }
});
