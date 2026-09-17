import { app } from "./app.js";
import { config } from "./config.js";

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Blockchain DB Integrity API Server đang chạy!`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`⛓️  Blockchain RPC: ${config.blockchainRpcUrl}`);
  console.log(`📜 Contract Address: ${config.contractAddress}`);
  console.log(`🛡️  Mô phỏng tấn công demo: ${config.enableDemoAttacks ? "BẬT" : "TẮT"}`);
  console.log(`=======================================================`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("API Server đã dừng.");
    process.exit(0);
  });
});
