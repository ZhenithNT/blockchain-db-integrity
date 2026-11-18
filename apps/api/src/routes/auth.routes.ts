import { Router } from "express";
import { loginSchema } from "@integrity/shared";
import { loginUser } from "../services/auth.service.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    res.json(await loginUser(parsed.username, parsed.password));
  } catch (err) {
    next(err);
  }
});
