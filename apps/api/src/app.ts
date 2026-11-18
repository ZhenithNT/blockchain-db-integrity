import cors from "cors";
import express from "express";
import { isBlockchainAvailable } from "./blockchain.js";
import { prisma } from "./db.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { integrityRouter } from "./routes/integrity.routes.js";
import { scoreRouter } from "./routes/score.routes.js";
import { auditRouter } from "./routes/audit.routes.js";
import { walletRouter } from "./routes/wallet.routes.js";

export const app = express();

// Tự động serialize BigInt sang string để tránh lỗi TypeError: Do not know how to serialize a BigInt
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

app.use(cors());
app.use(express.json());

// Endpoint kiểm tra trạng thái sức khỏe của API, CSDL và Blockchain
app.get("/api/health", async (_req, res) => {
  let dbOk = false;
  let bcOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  bcOk = await isBlockchainAvailable();

  res.json({
    status: dbOk && bcOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbOk ? "connected" : "disconnected",
    blockchain: bcOk ? "connected" : "disconnected",
  });
});

// Các nhóm route API
app.use("/api/auth", authRouter);
app.use("/api/scores", scoreRouter);
app.use("/api/integrity", integrityRouter);
app.use("/api/wallets", walletRouter);
app.use("/api/audit-logs", auditRouter);

// Middleware xử lý lỗi tập trung
app.use(errorHandler);
