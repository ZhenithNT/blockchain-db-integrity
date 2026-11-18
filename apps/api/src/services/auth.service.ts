import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { unlockWallet } from "./wallet.service.js";

export async function loginUser(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username: username.trim() } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    throw { statusCode: 401, message: "Tên đăng nhập hoặc mật khẩu không chính xác." };
  }

  // Mở khóa ví của admin này để ký giao dịch (tạo ví ở lần đăng nhập đầu).
  let walletAddress: string | null = null;
  try {
    const wallet = await unlockWallet(user, password);
    walletAddress = wallet?.address ?? null;
  } catch (err: any) {
    console.warn(`Không mở được ví của ${user.username}: ${err?.message || err}`);
  }

  const payload = {
    id: user.id,
    username: user.username,
    fullName: user.fullName || user.username,
    walletAddress,
  };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "24h" });
  return { token, user: payload };
}
