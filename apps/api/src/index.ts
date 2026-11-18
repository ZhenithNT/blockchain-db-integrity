import { app } from "./app.js";
import { config } from "./config.js";

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`API đang chạy`);
  console.log(`URL: http://localhost:${config.port}`);
  console.log(`Blockchain RPC: ${config.blockchainRpcUrl}`);
  console.log(`Contract: ${config.contractAddress}`);
  console.log(`=======================================================`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("API Server đã dừng.");
    process.exit(0);
  });
});
