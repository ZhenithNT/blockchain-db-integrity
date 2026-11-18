import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getWalletRoster } from "../services/wallet.service.js";

export const walletRouter = Router();

walletRouter.use(authenticate);

// Danh sách ví admin và trạng thái quyền ghi trên contract
walletRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await getWalletRoster());
  } catch (err) {
    next(err);
  }
});
