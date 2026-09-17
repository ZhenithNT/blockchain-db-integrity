import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  checkAllScoresIntegrity,
  checkScoreIntegrity,
  getRecentCheckResults,
} from "../services/integrity.service.js";

export const integrityRouter = Router();

// Mọi vai trò đã đăng nhập (ADMIN, LECTURER, AUDITOR) đều được tra cứu và kiểm tra toàn vẹn
integrityRouter.use(authenticate);

integrityRouter.post("/check/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await checkScoreIntegrity(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

integrityRouter.post("/check-all", async (_req, res, next) => {
  try {
    const result = await checkAllScoresIntegrity();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

integrityRouter.get("/results", async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const results = await getRecentCheckResults(limit);
    res.json(results);
  } catch (err) {
    next(err);
  }
});
