import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  checkAllScoresIntegrity,
  checkScoreIntegrity,
  getRecentCheckResults,
} from "../services/integrity.service.js";

export const integrityRouter = Router();

integrityRouter.use(authenticate);

integrityRouter.post("/check/:id", async (req, res, next) => {
  try {
    res.json(await checkScoreIntegrity(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
});

integrityRouter.post("/check-all", async (_req, res, next) => {
  try {
    res.json(await checkAllScoresIntegrity());
  } catch (err) {
    next(err);
  }
});

integrityRouter.get("/results", async (req, res, next) => {
  try {
    res.json(await getRecentCheckResults(req.query.limit ? Number(req.query.limit) : 20));
  } catch (err) {
    next(err);
  }
});
