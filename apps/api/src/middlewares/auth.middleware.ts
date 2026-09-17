import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@integrity/shared";
import { config } from "../config.js";

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: true,
      message: "Yêu cầu xác thực. Vui lòng cung cấp Authorization token hợp lệ.",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (_err) {
    return res.status(401).json({
      error: true,
      message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
    });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: "Chưa xác thực người dùng.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: `Từ chối truy cập. Vai trò '${req.user.role}' không có quyền thực hiện thao tác này. Cần quyền: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}
