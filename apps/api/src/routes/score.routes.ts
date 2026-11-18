import { Router } from "express";
import { createScoreSchema, updateScoreSchema } from "@integrity/shared";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createScore, getCatalog, getScoreById, getScores, updateScore } from "../services/score.service.js";

export const scoreRouter = Router();

scoreRouter.use(authenticate);

// Danh mục sinh viên, môn, học kỳ để chọn khi nhập điểm
scoreRouter.get("/catalog", async (_req, res, next) => {
  try {
    res.json(await getCatalog());
  } catch (err) {
    next(err);
  }
});

scoreRouter.get("/", async (req, res, next) => {
  try {
    const { search, semester } = req.query;
    res.json(
      await getScores({
        search: search ? String(search) : undefined,
        semester: semester ? String(semester) : undefined,
      })
    );
  } catch (err) {
    next(err);
  }
});

scoreRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getScoreById(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
});

scoreRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createScoreSchema.parse(req.body);
    res.status(201).json(await createScore(parsed, req.user!.username, req.ip || "127.0.0.1"));
  } catch (err) {
    next(err);
  }
});

scoreRouter.put("/:id", async (req, res, next) => {
  try {
    const parsed = updateScoreSchema.parse(req.body);
    res.json(await updateScore(Number(req.params.id), parsed.score, req.user!.username, req.ip || "127.0.0.1"));
  } catch (err) {
    next(err);
  }
});
