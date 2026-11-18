import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface AuthUser {
  id: number;
  username: string;
  fullName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Mọi tài khoản trong hệ thống đều là admin, nên chỉ cần kiểm tra đã đăng nhập. */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Cần đăng nhập." });
  }
  try {
    req.user = jwt.verify(header.split(" ")[1], config.jwtSecret) as AuthUser;
    next();
  } catch {
    return res.status(401).json({ error: true, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
  }
}
