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
    fullName: user.fullName || user.username,
    role: user.role as UserRole,
    studentCode: user.studentCode,
    lecturerCode: user.lecturerCode,
    avatarUrl: user.avatarUrl,
  };

  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: "24h",
  });

  return {
    token,
    user: payload,
  };
}

export async function registerUser(data: {
  username: string;
  password: string;
  fullName: string;
  role: "STUDENT" | "LECTURER";
  code?: string;
  email?: string;
  extraInfo?: string;
}) {
  const username = data.username.trim().toLowerCase();
  const password = data.password.trim();
  const fullName = data.fullName.trim();
  const role = data.role;
  const code = (data.code || username).trim().toUpperCase();
  const email = data.email?.trim() || `${username}@ptit.edu.vn`;

  if (!username || !password || !fullName) {
    throw { statusCode: 400, message: "Vui lòng điền đầy đủ tên đăng nhập, mật khẩu và họ tên." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUser) {
    throw { statusCode: 400, message: `Tên đăng nhập '${username}' đã tồn tại.` };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.$transaction(async (tx) => {
    if (role === "STUDENT") {
      await tx.student.upsert({
        where: { studentCode: code },
        update: { fullName, email },
        create: {
          studentCode: code,
          fullName,
          className: data.extraInfo || "D23CQAT01-B",
          email,
        },
      });

      return await tx.user.create({
        data: {
          username,
          passwordHash,
          fullName,
          role: "STUDENT",
          email,
          studentCode: code,
        },
      });
    } else {
      await tx.lecturer.upsert({
        where: { lecturerCode: code },
        update: { fullName, email },
        create: {
          lecturerCode: code,
          fullName,
          faculty: data.extraInfo || "Khoa Công nghệ Thông tin 1",
          email,
        },
      });

      return await tx.user.create({
        data: {
          username,
          passwordHash,
          fullName,
          role: "LECTURER",
          email,
          lecturerCode: code,
        },
      });
    }
  });

  const payload = {
    id: newUser.id,
    username: newUser.username,
    fullName: newUser.fullName,
    role: newUser.role as UserRole,
    studentCode: newUser.studentCode,
    lecturerCode: newUser.lecturerCode,
    avatarUrl: newUser.avatarUrl,
  };

  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: "24h",
  });

  return {
    token,
    user: payload,
  };
}
