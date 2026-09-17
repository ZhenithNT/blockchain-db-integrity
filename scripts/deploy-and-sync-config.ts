import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";

async function main() {
  console.log("🚀 Đang deploy IntegrityRegistry smart contract...");

  const { viem } = await hre.network.create();
  const [deployer] = await viem.getWalletClients();

  console.log("  Ví deployer:", deployer.account.address);

  const registry = await viem.deployContract("IntegrityRegistry");
  const contractAddress = registry.address;

  console.log("✅ Deploy thành công!");
  console.log("  Địa chỉ hợp đồng (CONTRACT_ADDRESS):", contractAddress);

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
    deployerAddress: deployer.account.address,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), "utf-8");
  console.log("  ✓ Đã lưu thông tin vào deployment-info.json");
}

main().catch((err) => {
  console.error("❌ Lỗi deploy:", err);
  process.exit(1);
});
