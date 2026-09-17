import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

dotenv.config();

async function main() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  console.log(`🚀 Đang deploy IntegrityRegistry smart contract lên ${rpcUrl}...`);

  const artifactPath = path.resolve(
    process.cwd(),
    "artifacts/contracts/IntegrityRegistry.sol/IntegrityRegistry.json"
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Chưa tìm thấy artifact biên dịch. Hãy chạy npx hardhat build trước.");
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const privateKey = (process.env.DEPLOYER_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as `0x${string}`;

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http(rpcUrl),
  });

  console.log("  Ví deployer:", account.address);

  // Gửi transaction deploy contract
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    account,
  });

  console.log("  Transaction hash:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  if (!contractAddress) {
    throw new Error("Không nhận được địa chỉ contract từ transaction receipt.");
  }

  console.log("✅ Deploy thành công!");
  console.log("  Địa chỉ hợp đồng (CONTRACT_ADDRESS):", contractAddress);
  console.log("  Block number:", receipt.blockNumber.toString());

  // Cập nhật file .env tự động nếu tồn tại
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS="${contractAddress}"`
      );
    } else {
      envContent += `\nCONTRACT_ADDRESS="${contractAddress}"\n`;
    }
    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log("  ✓ Đã cập nhật CONTRACT_ADDRESS vào file .env");
  }

  // Ghi thêm vào file deployment-info.json để các ứng dụng dễ đọc
  const infoPath = path.resolve(process.cwd(), "deployment-info.json");
  const info = {
    contractAddress,
    deployerAddress: account.address,
    transactionHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), "utf-8");
  console.log("  ✓ Đã lưu thông tin vào deployment-info.json");
}

main().catch((err) => {
  console.error("❌ Lỗi deploy:", err);
  process.exit(1);
});
