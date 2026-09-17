import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@integrity/shared";
import { config } from "../config.js";
import { prisma } from "../db.js";

export async function loginUser(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
  });

  if (!user) {
    throw { statusCode: 401, message: "Tên đăng nhập hoặc mật khẩu không chính xác." };
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw { statusCode: 401, message: "Tên đăng nhập hoặc mật khẩu không chính xác." };
  }

  const payload = {
    id: user.id,
    username: user.username,
    role: user.role as UserRole,
  };

  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: "24h",
  });

  return {
    token,
    user: payload,
  };
}
