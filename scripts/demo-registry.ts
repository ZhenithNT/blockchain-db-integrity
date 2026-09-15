import { createHash } from "node:crypto";

import hre from "hardhat";

type Hex = `0x${string}`;

const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3" as Hex;

const CREATE = 0;

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

// Dữ liệu nghiệp vụ mẫu
const studentId = "SV001";
const courseCode = "ATWEB";
const semester = "2026-1";
const score = "8.50";
const version = 1n;
const status = "ACTIVE";
const actorId = "GV001";

// Chuỗi định danh cố định của bản ghi
const recordKeyInput =
  `${studentId}|${courseCode}|${semester}`;

// Chuỗi nội dung của version 1
const dataHashInput =
  `${studentId}|${courseCode}|${semester}|${score}|${version}|${status}`;

const recordKey = sha256(recordKeyInput);
const dataHash = sha256(dataHashInput);
const actorHash = sha256(actorId);

console.log("=== DỮ LIỆU ĐẦU VÀO ===");
console.log("Sinh viên:", studentId);
console.log("Môn học:", courseCode);
console.log("Học kỳ:", semester);
console.log("Điểm:", score);
console.log("Version:", version.toString());
console.log("Trạng thái:", status);

console.log("\n=== HASH SERVICE ===");
console.log("recordKey input:", recordKeyInput);
console.log("recordKey:", recordKey);
console.log("dataHash input:", dataHashInput);
console.log("dataHash:", dataHash);
console.log("actorHash:", actorHash);

console.log("\n=== BLOCKCHAIN ===");
console.log("Contract:", CONTRACT_ADDRESS);
console.log("Ví gửi:", ownerWallet.account.address);

const contractOwner = await registry.read.owner();
console.log("Contract owner:", contractOwner);

const alreadyExists =
  await registry.read.exists([recordKey]);

if (!alreadyExists) {
  console.log("\nĐang ghi Evidence version 1...");

  const transactionHash =
    await registry.write.appendEvidence(
      [
        recordKey,
        dataHash,
        actorHash,
        version,
        CREATE,
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
    "\nRecord đã tồn tại, bỏ qua bước ghi và chỉ đọc lại.",
  );
}

const versionCount =
  await registry.read.getVersionCount([recordKey]);

const evidence =
  await registry.read.getLatestEvidence([recordKey]);

const actionNames = [
  "CREATE",
  "UPDATE",
  "DELETE",
];

console.log("\n=== EVIDENCE ĐỌC TỪ BLOCKCHAIN ===");
console.log("Version count:", versionCount.toString());
console.log("Data hash:", evidence.dataHash);
console.log("Actor hash:", evidence.actorHash);
console.log("Version:", evidence.version.toString());
console.log(
  "Action:",
  actionNames[Number(evidence.action)],
);
console.log(
  "Timestamp:",
  evidence.timestamp.toString(),
);
console.log(
  "Thời gian:",
  new Date(
    Number(evidence.timestamp) * 1000,
  ).toISOString(),
);
console.log(
  "Writer address:",
  evidence.writerAddress,
);

console.log("\n=== KIỂM TRA ===");

const hashMatches =
  evidence.dataHash.toLowerCase() ===
  dataHash.toLowerCase();

const versionMatches =
  evidence.version === version;

const writerMatches =
  evidence.writerAddress.toLowerCase() ===
  ownerWallet.account.address.toLowerCase();

console.log("Data hash khớp:", hashMatches);
console.log("Version khớp:", versionMatches);
console.log("Writer khớp owner:", writerMatches);

if (
  hashMatches &&
  versionMatches &&
  writerMatches
) {
  console.log("KẾT QUẢ: VALID");
} else {
  console.log("KẾT QUẢ: INVALID");
}