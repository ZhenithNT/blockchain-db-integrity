import cors from "cors";
import express from "express";
import { isBlockchainAvailable } from "./blockchain.js";
import { prisma } from "./db.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { changeRequestRouter } from "./routes/change-request.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { demoRouter } from "./routes/demo.routes.js";
import { integrityRouter } from "./routes/integrity.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { offeringRouter } from "./routes/offering.routes.js";
import { scoreRouter } from "./routes/score.routes.js";
import { academicRouter } from "./routes/academic.routes.js";
import { auditRouter } from "./routes/audit.routes.js";

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
app.use("/api/offerings", offeringRouter);
app.use("/api/scores", scoreRouter);
app.use("/api/change-requests", changeRequestRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/integrity", integrityRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/demo", demoRouter);
app.use("/api/academic", academicRouter);
app.use("/api/audit-logs", auditRouter);

// Middleware xử lý lỗi tập trung
app.use(errorHandler);
