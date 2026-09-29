import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import {
  restoreScore,
  tamperHistory,
  tamperPhysicalDelete,
  tamperScore,
} from "../services/demo.service.js";

export const demoRouter = Router();

demoRouter.use(authenticate);

// Chỉ ADMIN được chạy các demo tấn công giả lập
demoRouter.post("/tamper", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const scoreId = Number(req.body.scoreId);
    const tamperedScore = req.body.score;
    const actorId = req.user?.username || "admin";
    const clientIp = req.ip || "127.0.0.1";

    if (!scoreId || tamperedScore === undefined) {
      return res.status(400).json({
        error: true,
        message: "Thiếu scoreId hoặc điểm thay đổi (score).",
      });
    }

    const result = await tamperScore(scoreId, tamperedScore, actorId, clientIp);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

demoRouter.post("/tamper-history", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const scoreId = Number(req.body.scoreId);
    const version = Number(req.body.version);
    const tamperedScore = req.body.score;
    const actorId = req.user?.username || "admin";
    const clientIp = req.ip || "127.0.0.1";

    if (!scoreId || !version || tamperedScore === undefined) {
      return res.status(400).json({
        error: true,
        message: "Thiếu scoreId, version hoặc score cần sửa lén.",
      });
    }

    const result = await tamperHistory(scoreId, version, tamperedScore, actorId, clientIp);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

demoRouter.post("/tamper-delete", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const scoreId = Number(req.body.scoreId);
    const actorId = req.user?.username || "admin";
    const clientIp = req.ip || "127.0.0.1";

    if (!scoreId) {
      return res.status(400).json({
        error: true,
        message: "Thiếu scoreId cần xóa vật lý.",
      });
    }

    const result = await tamperPhysicalDelete(scoreId, actorId, clientIp);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

demoRouter.post("/restore", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const scoreId = Number(req.body.scoreId);
    const actorId = req.user?.username || "admin";
    const clientIp = req.ip || "127.0.0.1";

    if (!scoreId) {
      return res.status(400).json({
        error: true,
        message: "Thiếu scoreId để khôi phục.",
      });
    }

    const result = await restoreScore(scoreId, actorId, clientIp);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
