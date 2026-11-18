import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { parseEther } from "viem";
import { generatePrivateKey, type PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import type { Hex, SignerIdentity } from "@integrity/shared";
import {
  fundWallet,
  getBalance,
  getWritersFromChain,
  grantWriter,
  isWriterOnChain,
  ownerAccount,
} from "../blockchain.js";
import { config } from "../config.js";
import { prisma } from "../db.js";

/**
 * VÍ CỦA TỪNG ADMIN
 *
 * - Mỗi admin có một ví riêng, tạo ở lần đăng nhập đầu tiên.
 * - Khóa riêng được mã hóa bằng MẬT KHẨU của chính admin đó (scrypt + AES-256-GCM)
 *   rồi mới lưu vào MySQL. Người chỉ đọc được MySQL không giải mã được khóa.
 * - Đăng nhập thì giải mã và giữ khóa trong bộ nhớ (24 giờ) để ký giao dịch.
 * - Địa chỉ ví là danh tính trên blockchain: contract ghi lại ví nào đã ký từng bằng chứng.
 */

interface Envelope {
  v: 1;
  kdf: "scrypt";
  salt: string;
  iv: string;
  tag: string;
  ct: string;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map<string, { account: PrivateKeyAccount; expiresAt: number }>();
const provisioned = new Set<string>();

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
}

export function encryptPrivateKey(privateKey: Hex, password: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(password, salt), iv);
  const ct = Buffer.concat([cipher.update(privateKey.slice(2), "hex"), cipher.final()]);
  const envelope: Envelope = {
    v: 1,
    kdf: "scrypt",
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    ct: ct.toString("hex"),
  };
  return JSON.stringify(envelope);
}

export function decryptPrivateKey(encrypted: string, password: string): Hex {
  const env = JSON.parse(encrypted) as Envelope;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(password, Buffer.from(env.salt, "hex")),
    Buffer.from(env.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(env.tag, "hex"));
  const pk = Buffer.concat([decipher.update(Buffer.from(env.ct, "hex")), decipher.final()]);
  return `0x${pk.toString("hex")}` as Hex;
}

/** Tạo ví cho admin nếu chưa có (cần mật khẩu dạng rõ, chỉ có lúc đăng nhập). */
async function ensureWallet(user: { id: number; username: string }, password: string) {
  const existing = await prisma.userWallet.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return prisma.userWallet.create({
    data: {
      userId: user.id,
      address: account.address,
      encryptedKey: encryptPrivateKey(privateKey, password),
      status: "ACTIVE",
    },
  });
}

/** Bảo đảm ví có gas và được contract cấp quyền ghi (tự xử lý khi contract mới được deploy). */
async function provision(address: Hex) {
  const key = `${config.contractAddress.toLowerCase()}:${address.toLowerCase()}`;
  if (provisioned.has(key)) return;

  if ((await getBalance(address)) < parseEther("1")) {
    await fundWallet(address);
  }
  if (!(await isWriterOnChain(address))) {
    await grantWriter(address);
  }
  provisioned.add(key);
}

/** Đăng nhập: giải mã khóa bằng mật khẩu, đưa vào phiên ký, cấp quyền on-chain nếu cần. */
export async function unlockWallet(
  user: { id: number; username: string },
  password: string
): Promise<{ address: Hex } | null> {
  const wallet = await ensureWallet(user, password);

  let account: PrivateKeyAccount;
  try {
    account = privateKeyToAccount(decryptPrivateKey(wallet.encryptedKey, password));
  } catch {
    return null;
  }

  sessions.set(user.username, { account, expiresAt: Date.now() + SESSION_TTL_MS });

  if (wallet.status === "ACTIVE") {
    try {
      await provision(account.address);
    } catch (err: any) {
      console.warn(`Chưa cấp quyền on-chain cho ví ${account.address}: ${err?.message || err}`);
    }
  }
  return { address: account.address };
}

/** Lấy người ký của admin đang đăng nhập. */
export async function getSigner(username: string): Promise<PrivateKeyAccount> {
  const session = sessions.get(username);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(username);
    throw {
      statusCode: 401,
      message: "Khóa ký chưa được mở (máy chủ khởi động lại hoặc phiên hết hạn). Hãy đăng nhập lại.",
    };
  }
  const wallet = await prisma.userWallet.findFirst({ where: { user: { username } } });
  if (!wallet || wallet.status !== "ACTIVE") {
    throw { statusCode: 403, message: "Ví của tài khoản này không có quyền ký." };
  }
  await provision(session.account.address);
  return session.account;
}

// ---------------------------------------------------------------------------
// Từ địa chỉ ví suy ra "AI đã ký"
// ---------------------------------------------------------------------------

export async function getAddressBook(): Promise<Map<string, SignerIdentity>> {
  const wallets = await prisma.userWallet.findMany({ include: { user: true } });
  const book = new Map<string, SignerIdentity>();
  for (const w of wallets) {
    book.set(w.address.toLowerCase(), {
      address: w.address,
      username: w.user.username,
      fullName: w.user.fullName || w.user.username,
    });
  }
  book.set(ownerAccount.address.toLowerCase(), {
    address: ownerAccount.address,
    username: "system",
    fullName: "Ví hệ thống (owner)",
  });
  return book;
}

export function resolveSigner(
  book: Map<string, SignerIdentity>,
  address: string | null | undefined
): SignerIdentity | null {
  if (!address) return null;
  return book.get(address.toLowerCase()) || { address, username: null, fullName: "Ví lạ" };
}

/** Danh sách ví: đối chiếu MySQL với danh sách ví được ghi trên contract. */
export async function getWalletRoster() {
  const [wallets, writers] = await Promise.all([
    prisma.userWallet.findMany({ include: { user: true }, orderBy: { id: "asc" } }),
    getWritersFromChain(),
  ]);
  const known = new Set(wallets.map((w) => w.address.toLowerCase()));

  const rows = await Promise.all(
    wallets.map(async (w) => ({
      address: w.address,
      username: w.user.username,
      fullName: w.user.fullName,
      status: w.status,
      onChainWriter: await isWriterOnChain(w.address as Hex),
      unlocked: Boolean(sessions.get(w.user.username) && sessions.get(w.user.username)!.expiresAt > Date.now()),
      kind: "ADMIN" as const,
    }))
  );

  // Ví có quyền ghi trên contract nhưng không thuộc admin nào: đáng ngờ.
  for (const address of writers) {
    if (known.has(address.toLowerCase())) continue;
    rows.push({
      address,
      username: "",
      fullName: "Ví lạ",
      status: "UNKNOWN",
      onChainWriter: await isWriterOnChain(address),
      unlocked: false,
      kind: "ROGUE" as any,
    });
  }
  return rows;
}
