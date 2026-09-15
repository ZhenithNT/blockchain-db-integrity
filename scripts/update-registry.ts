import { createHash } from "node:crypto";

import hre from "hardhat";

type Hex = `0x${string}`;

const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3" as Hex;

const UPDATE = 1;

function sha256(value: string): Hex {
  return `0x${createHash("sha256")
    .update(value, "utf8")
    .digest("hex")}`;
}

const { viem } = await hre.network.create();

const publicClient = await viem.getPublicClient();
const [ownerWallet] = await viem.getWalletClients();

const registry = await viem.getContractAt(
  "IntegrityRegistry",
  CONTRACT_ADDRESS,
);

// Bản ghi cần cập nhật
const studentId = "SV001";
const courseCode = "ATWEB";
const semester = "2026-1";

const oldScore = "8.50";
const newScore = "9.00";

const newVersion = 2n;
const status = "ACTIVE";
const actorId = "GV001";

const recordKeyInput =
  `${studentId}|${courseCode}|${semester}`;

const versionOneInput =
  `${studentId}|${courseCode}|${semester}|${oldScore}|1|ACTIVE`;

const versionTwoInput =
  `${studentId}|${courseCode}|${semester}|${newScore}|${newVersion}|${status}`;

const recordKey = sha256(recordKeyInput);
const expectedHashV1 = sha256(versionOneInput);
const dataHashV2 = sha256(versionTwoInput);
const actorHash = sha256(actorId);

console.log("=== CẬP NHẬT ĐIỂM ===");
console.log("Sinh viên:", studentId);
console.log("Điểm cũ:", oldScore);
console.log("Điểm mới:", newScore);
console.log("Version mới:", newVersion.toString());

console.log("\n=== HASH VERSION 2 ===");
console.log("Canonical data:", versionTwoInput);
console.log("dataHash version 2:", dataHashV2);

const versionBefore =
  await registry.read.getVersionCount([recordKey]);

console.log(
  "\nVersion count trước cập nhật:",
  versionBefore.toString(),
);

if (versionBefore === 0n) {
  throw new Error(
    "Chưa có version 1. Hãy chạy demo-registry.ts trước.",
  );
}

if (versionBefore === 1n) {
  console.log("\nĐang ghi Evidence version 2...");

  const transactionHash =
    await registry.write.appendEvidence(
      [
        recordKey,
        dataHashV2,
        actorHash,
        newVersion,
        UPDATE,
      ],
      {
        account: ownerWallet.account,
      },
    );

  console.log("Transaction hash:", transactionHash);

  const receipt =
    await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
    });

  console.log("Transaction status:", receipt.status);
  console.log(
    "Block number:",
    receipt.blockNumber.toString(),
  );
  console.log(
    "Gas used:",
    receipt.gasUsed.toString(),
  );
} else {
  console.log(
    "\nVersion 2 đã tồn tại, bỏ qua bước ghi.",
  );
}

const versionAfter =
  await registry.read.getVersionCount([recordKey]);

const evidenceV1 =
  await registry.read.getEvidenceByVersion([
    recordKey,
    1n,
  ]);

const evidenceV2 =
  await registry.read.getEvidenceByVersion([
    recordKey,
    2n,
  ]);

const actionNames = [
  "CREATE",
  "UPDATE",
  "DELETE",
];

console.log("\n=== LỊCH SỬ BLOCKCHAIN ===");

console.log("\n--- VERSION 1 ---");
console.log("Điểm tương ứng:", oldScore);
console.log("Data hash:", evidenceV1.dataHash);
console.log(
  "Version:",
  evidenceV1.version.toString(),
);
console.log(
  "Action:",
  actionNames[Number(evidenceV1.action)],
);
console.log(
  "Writer:",
  evidenceV1.writerAddress,
);

console.log("\n--- VERSION 2 ---");
console.log("Điểm tương ứng:", newScore);
console.log("Data hash:", evidenceV2.dataHash);
console.log(
  "Version:",
  evidenceV2.version.toString(),
);
console.log(
  "Action:",
  actionNames[Number(evidenceV2.action)],
);
console.log(
  "Writer:",
  evidenceV2.writerAddress,
);

console.log("\n=== KIỂM TRA LƯU VẾT ===");

const versionOnePreserved =
  evidenceV1.dataHash.toLowerCase() ===
  expectedHashV1.toLowerCase();

const versionTwoMatches =
  evidenceV2.dataHash.toLowerCase() ===
  dataHashV2.toLowerCase();

const versionsAreContinuous =
  evidenceV1.version === 1n &&
  evidenceV2.version === 2n;

const actionsAreCorrect =
  Number(evidenceV1.action) === 0 &&
  Number(evidenceV2.action) === 1;

console.log(
  "Tổng số version:",
  versionAfter.toString(),
);
console.log(
  "Version 1 còn nguyên:",
  versionOnePreserved,
);
console.log(
  "Hash version 2 khớp:",
  versionTwoMatches,
);
console.log(
  "Version liên tục 1 → 2:",
  versionsAreContinuous,
);
console.log(
  "Action CREATE → UPDATE:",
  actionsAreCorrect,
);

if (
  versionOnePreserved &&
  versionTwoMatches &&
  versionsAreContinuous &&
  actionsAreCorrect
) {
  console.log("KẾT QUẢ: LƯU VẾT HỢP LỆ");
} else {
  console.log("KẾT QUẢ: LỊCH SỬ KHÔNG HỢP LỆ");
}