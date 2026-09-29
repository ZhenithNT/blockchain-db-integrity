import path from "node:path";
import dotenv from "dotenv";

// Tải .env từ thư mục gốc hoặc thư mục hiện tại (tự động reload khi đổi contract)
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });
dotenv.config({ override: true });

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "demo-blockchain-db-integrity-jwt-secret-key-2026",
  databaseUrl: process.env.DATABASE_URL || "mysql://root:@localhost:3306/blockchain_db_integrity",
  blockchainRpcUrl: process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
  contractAddress: (process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`,
  deployerPrivateKey: (process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as `0x${string}`,
  enableDemoAttacks: process.env.ENABLE_DEMO_ATTACKS === "true",
  nodeEnv: process.env.NODE_ENV || "development",
};
