import { Router } from "express";
import {
  createScoreSchema,
  updateScoreSchema,
} from "@integrity/shared";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import {
  createScore,
  deleteScore,
  getScoreById,
  getScoreHistory,
  getScores,
  getStudentScores,
  updateScore,
} from "../services/score.service.js";

export const scoreRouter = Router();

// Tất cả các route điểm đều yêu cầu đăng nhập
scoreRouter.use(authenticate);

scoreRouter.get("/", async (req, res, next) => {
  try {
    const { search, status, semester } = req.query;
    const scores = await getScores({
      search: search ? String(search) : undefined,
      status: status ? String(status) : undefined,
      semester: semester ? String(semester) : undefined,
    });
    res.json(scores);
  } catch (err) {
    next(err);
  }
});

scoreRouter.get("/student/:studentCode", async (req, res, next) => {
  try {
    const studentCode = req.params.studentCode;
    const scores = await getStudentScores(studentCode);
    res.json(scores);
  } catch (err) {
    next(err);
  }
});

scoreRouter.get("/my-grades", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
    const studentCode = user.username.startsWith("sv_") ? "B23DCAT211" : user.username;
    const scores = await getStudentScores(studentCode);
    res.json(scores);
  } catch (err) {
    next(err);
  }
});

scoreRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const score = await getScoreById(id);
    res.json(score);
  } catch (err) {
    next(err);
  }
});

scoreRouter.get("/:id/history", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const history = await getScoreHistory(id);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// Chỉ ADMIN và LECTURER được tạo điểm mới
scoreRouter.post("/", requireRole("ADMIN", "LECTURER"), async (req, res, next) => {
  try {
    const parsed = createScoreSchema.parse(req.body);
    const actorId = req.user?.username || "unknown";
    const clientIp = req.ip || "127.0.0.1";

    const result = await createScore(parsed, actorId, clientIp);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Chỉ ADMIN và LECTURER được cập nhật điểm
scoreRouter.put("/:id", requireRole("ADMIN", "LECTURER"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = updateScoreSchema.parse(req.body);
    const actorId = req.user?.username || "unknown";
    const clientIp = req.ip || "127.0.0.1";

    const result = await updateScore(id, parsed.score, actorId, clientIp);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Chỉ ADMIN và LECTURER được xóa (soft delete) điểm
scoreRouter.delete("/:id", requireRole("ADMIN", "LECTURER"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const actorId = req.user?.username || "unknown";
    const clientIp = req.ip || "127.0.0.1";

    const result = await deleteScore(id, actorId, clientIp);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
