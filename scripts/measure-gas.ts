import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, http, parseEther, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { Action, IntegrityRegistryABI, computeDataHash, computeRecordKey } from "../packages/shared/src/index.js";

/**
 * Đo gas thật của từng thao tác trên Hardhat local.
 * Chạy: npm run measure:gas (cần Hardhat node đang chạy). Hợp đồng được deploy riêng để đo.
 */
async function main() {
  const rpc = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  const owner = privateKeyToAccount(
    (process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as Hex
  );
  const admin = privateKeyToAccount(generatePrivateKey());

  const pub = createPublicClient({ chain: hardhat, transport: http(rpc) });
  const ownerWallet = createWalletClient({ account: owner, chain: hardhat, transport: http(rpc) });
  const adminWallet = createWalletClient({ account: admin, chain: hardhat, transport: http(rpc) });

  const gasOf = async (hash: Hex) => (await pub.waitForTransactionReceipt({ hash })).gasUsed;

  const artifact = JSON.parse(
    fs.readFileSync(path.resolve("artifacts/contracts/IntegrityRegistry.sol/IntegrityRegistry.json"), "utf8")
  );

  const deployHash = await ownerWallet.deployContract({ abi: IntegrityRegistryABI, bytecode: artifact.bytecode });
  const deployReceipt = await pub.waitForTransactionReceipt({ hash: deployHash });
  const address = deployReceipt.contractAddress!;

  await gasOf(await ownerWallet.sendTransaction({ to: admin.address, value: parseEther("10") }));
  const addWriterGas = await gasOf(
    await ownerWallet.writeContract({ address, abi: IntegrityRegistryABI, functionName: "addWriter", args: [admin.address] })
  );

  const N = 10;
  const create: bigint[] = [];
  const update: bigint[] = [];
  for (let i = 0; i < N; i++) {
    const base = { studentId: `SV${i}`, courseCode: "BAS1111", semester: "2025-2026.1" };
    const key = computeRecordKey(base);
    create.push(
      await gasOf(
        await adminWallet.writeContract({
          address,
          abi: IntegrityRegistryABI,
          functionName: "appendEvidence",
          args: [key, computeDataHash({ ...base, score: "8.50", version: 1 }), 1n, Action.CREATE],
        })
      )
    );
    update.push(
      await gasOf(
        await adminWallet.writeContract({
          address,
          abi: IntegrityRegistryABI,
          functionName: "appendEvidence",
          args: [key, computeDataHash({ ...base, score: "9.00", version: 2 }), 2n, Action.UPDATE],
        })
      )
    );
  }

  const avg = (xs: bigint[]) => xs.reduce((a, b) => a + b, 0n) / BigInt(xs.length);
  const report = {
    contractAddress: address,
    samples: N,
    gas: {
      deploy: deployReceipt.gasUsed.toString(),
      addWriter: addWriterGas.toString(),
      createAvg: avg(create).toString(),
      updateAvg: avg(update).toString(),
    },
    note: "Đọc dữ liệu (getHistory, getLatestEvidence...) không tốn gas.",
  };

  console.log(JSON.stringify(report, null, 2));
  fs.writeFileSync("gas-report.json", JSON.stringify(report, null, 2));
  console.log("\nĐã lưu gas-report.json");
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
