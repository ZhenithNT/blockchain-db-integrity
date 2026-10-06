import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  parseAbiItem,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { IntegrityRegistryAbi } from "../packages/shared/src/abi.js";
import { Action, computeDataHash, computeRecordKey, computeActorHash } from "../packages/shared/src/index.js";
import fs from "fs";
import path from "path";

async function main() {
  console.log("===============================================================");
  console.log("📊 BẮT ĐẦU ĐO LƯỜNG CHI PHÍ GAS THỰC TẾ (BẢNG 5.14 CHƯƠNG 3)");
  console.log("===============================================================\n");

  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  const privateKey = (process.env.DEPLOYER_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as Hex;

  const account = privateKeyToAccount(privateKey);
  const client = createPublicClient({
    chain: hardhat,
    transport: http(rpcUrl),
  });

  const wallet = createWalletClient({
    account,
    chain: hardhat,
    transport: http(rpcUrl),
  });

  // 1. Đo lường Gas Triển khai Hợp đồng (Deploy Contract)
  console.log("1. Đang đo lường phí Gas khi Triển khai Hợp đồng...");
  const artifactPath = path.resolve("artifacts/contracts/IntegrityRegistry.sol/IntegrityRegistry.json");
  let bytecode: Hex = "0x";
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    bytecode = artifact.bytecode;
  } else {
    throw new Error("Không tìm thấy artifact biên dịch tại " + artifactPath);
  }

  const deployTxHash = await wallet.deployContract({
    abi: IntegrityRegistryAbi,
    bytecode,
  });
  const deployReceipt = await client.waitForTransactionReceipt({ hash: deployTxHash });
  const deployGas = deployReceipt.gasUsed;
  const contractAddress = deployReceipt.contractAddress!;
  console.log(`   ✓ Deploy thành công tại: ${contractAddress}`);
  console.log(`   ✓ Gas sử dụng cho Deploy: ${deployGas.toString()} gas\n`);

  const NUM_SAMPLES = 10;
  const stats = {
    deploy: [deployGas],
    create: [] as bigint[],
    update: [] as bigint[],
    delete: [] as bigint[],
    restore: [] as bigint[],
  };

  console.log(`2. Đang thực hiện ${NUM_SAMPLES} lượt mẫu cho từng loại giao dịch (CREATE, UPDATE, DELETE, RESTORE)...`);

  for (let i = 1; i <= NUM_SAMPLES; i++) {
    const studentId = `SV_BENCH_${i.toString().padStart(3, "0")}`;
    const courseCode = "INT14105";
    const semester = "2025-2026.1";
    const recordKey = computeRecordKey({ studentId, courseCode, semester });
    const actorHash = computeActorHash("bench_admin");

    // A. CREATE (v1)
    const hashV1 = computeDataHash({
      studentId,
      courseCode,
      semester,
      score: "8.50",
      version: 1,
      status: "ACTIVE",
    });

    const createTx = await wallet.writeContract({
      address: contractAddress,
      abi: IntegrityRegistryAbi,
      functionName: "appendEvidence",
      args: [recordKey, hashV1, actorHash, 1n, Action.CREATE],
    });
    const createReceipt = await client.waitForTransactionReceipt({ hash: createTx });
    stats.create.push(createReceipt.gasUsed);

    // B. UPDATE (v2)
    const hashV2 = computeDataHash({
      studentId,
      courseCode,
      semester,
      score: "9.00",
      version: 2,
      status: "ACTIVE",
    });

    const updateTx = await wallet.writeContract({
      address: contractAddress,
      abi: IntegrityRegistryAbi,
      functionName: "appendEvidence",
      args: [recordKey, hashV2, actorHash, 2n, Action.UPDATE],
    });
    const updateReceipt = await client.waitForTransactionReceipt({ hash: updateTx });
    stats.update.push(updateReceipt.gasUsed);

    // C. DELETE (v3)
    const hashV3 = computeDataHash({
      studentId,
      courseCode,
      semester,
      score: "9.00",
      version: 3,
      status: "DELETED",
    });

    const deleteTx = await wallet.writeContract({
      address: contractAddress,
      abi: IntegrityRegistryAbi,
      functionName: "appendEvidence",
      args: [recordKey, hashV3, actorHash, 3n, Action.DELETE],
    });
    const deleteReceipt = await client.waitForTransactionReceipt({ hash: deleteTx });
    stats.delete.push(deleteReceipt.gasUsed);

    // D. RESTORE (v4)
    const hashV4 = computeDataHash({
      studentId,
      courseCode,
      semester,
      score: "9.00",
      version: 4,
      status: "ACTIVE",
    });

    const restoreTx = await wallet.writeContract({
      address: contractAddress,
      abi: IntegrityRegistryAbi,
      functionName: "appendEvidence",
      args: [recordKey, hashV4, actorHash, 4n, Action.RESTORE],
    });
    const restoreReceipt = await client.waitForTransactionReceipt({ hash: restoreTx });
    stats.restore.push(restoreReceipt.gasUsed);

    process.stdout.write(`   [Mẫu ${i}/${NUM_SAMPLES}] Đã đo xong 4 thao tác\r`);
  }

  console.log("\n\n===============================================================");
  console.log("📋 KẾT QUẢ ĐO LƯỜNG CHI PHÍ GAS CHO BÁO CÁO (BẢNG 5.14)");
  console.log("===============================================================\n");

  function calcMetrics(arr: bigint[]) {
    const min = arr.reduce((m, x) => (x < m ? x : m), arr[0]);
    const max = arr.reduce((m, x) => (x > m ? x : m), arr[0]);
    const sum = arr.reduce((s, x) => s + x, 0n);
    const avg = Number(sum) / arr.length;
    return {
      count: arr.length,
      min: min.toLocaleString("en-US"),
      max: max.toLocaleString("en-US"),
      avg: Math.round(avg).toLocaleString("en-US"),
    };
  }

  const deployMetrics = calcMetrics(stats.deploy);
  const createMetrics = calcMetrics(stats.create);
  const updateMetrics = calcMetrics(stats.update);
  const deleteMetrics = calcMetrics(stats.delete);
  const restoreMetrics = calcMetrics(stats.restore);

  console.log("| Thao tác | Số mẫu | Gas trung bình | Gas nhỏ nhất | Gas lớn nhất |");
  console.log("| :--- | :---: | :---: | :---: | :---: |");
  console.log(`| **Triển khai hợp đồng** | ${deployMetrics.count} | ${deployMetrics.avg} | ${deployMetrics.min} | ${deployMetrics.max} |`);
  console.log(`| **CREATE** | ${createMetrics.count} | ${createMetrics.avg} | ${createMetrics.min} | ${createMetrics.max} |`);
  console.log(`| **UPDATE** | ${updateMetrics.count} | ${updateMetrics.avg} | ${updateMetrics.min} | ${updateMetrics.max} |`);
  console.log(`| **DELETE** | ${deleteMetrics.count} | ${deleteMetrics.avg} | ${deleteMetrics.min} | ${deleteMetrics.max} |`);
  console.log(`| **RESTORE** | ${restoreMetrics.count} | ${restoreMetrics.avg} | ${restoreMetrics.min} | ${restoreMetrics.max} |`);

  console.log("\n💡 Gợi ý nhận xét cho Báo cáo:");
  console.log("1. Chi phí triển khai hợp đồng là chi phí cố định thực hiện 1 lần duy nhất.");
  console.log("2. Thao tác CREATE tiêu tốn gas cao nhất trong các thao tác nghiệp vụ (khoảng " + createMetrics.avg + " gas) do phải khởi tạo mảng lịch sử mới và đăng ký recordKey vào danh sách lưu trữ.");
  console.log("3. Các thao tác UPDATE, DELETE, RESTORE chủ yếu bổ sung thêm phần tử vào mảng đã có, tiêu tốn lượng gas ổn định (khoảng " + updateMetrics.avg + " gas).");
}

main().catch((err) => {
  console.error("❌ Lỗi đo lường gas:", err);
  process.exit(1);
});
