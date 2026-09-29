import { Router } from "express";
import { loginSchema } from "@integrity/shared";
import { loginUser, registerUser } from "../services/auth.service.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await loginUser(parsed.username, parsed.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
