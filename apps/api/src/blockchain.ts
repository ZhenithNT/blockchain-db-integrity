import {
  type Account,
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import {
  type EvidenceOnChain,
  type Hex,
  IntegrityRegistryABI,
} from "@integrity/shared";
import { config } from "./config.js";

const transport = http(config.blockchainRpcUrl);

export const publicClient = createPublicClient({ chain: hardhat, transport });

/** Ví hệ thống (owner): cấp quyền ghi và cấp gas. Không ghi điểm. */
export const ownerAccount = privateKeyToAccount(config.ownerPrivateKey);

export type TxResult = { transactionHash: Hex; blockNumber: bigint };

/** Lấy lý do revert dễ đọc từ lỗi của viem. */
export function revertReason(err: any): string {
  const found = err?.walk?.((e: any) => typeof e?.reason === "string");
  return found?.reason || err?.shortMessage || err?.message || String(err);
}

export async function isBlockchainAvailable(): Promise<boolean> {
  try {
    await publicClient.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}

/** Báo lỗi rõ ràng khi chưa deploy contract hoặc node đã bị khởi động lại. */
async function assertContractDeployed() {
  const code = await publicClient.getBytecode({ address: config.contractAddress });
  if (!code || code === "0x") {
    throw {
      statusCode: 503,
      message: `Chưa có contract tại ${config.contractAddress}. Chạy: npm run blockchain:deploy`,
    };
  }
}

// Mỗi ví gửi tuần tự để tránh trùng nonce.
const queues = new Map<string, Promise<unknown>>();
function serial<T>(address: string, job: () => Promise<T>): Promise<T> {
  const key = address.toLowerCase();
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.then(job, job);
  queues.set(key, next.catch(() => undefined));
  return next;
}

/** Gửi một giao dịch gọi hàm của contract, ký bằng khóa của `signer`. */
export async function sendTx(
  signer: Account,
  functionName: string,
  args: readonly unknown[]
): Promise<TxResult> {
  await assertContractDeployed();
  return serial(signer.address, async () => {
    try {
      const wallet = createWalletClient({ account: signer, chain: hardhat, transport });
      const { request } = await publicClient.simulateContract({
        address: config.contractAddress,
        abi: IntegrityRegistryABI,
        functionName: functionName as any,
        args: args as any,
        account: signer,
      });
      const hash = await wallet.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error(`Giao dịch ${hash} bị revert`);
      }
      return { transactionHash: hash, blockNumber: receipt.blockNumber };
    } catch (err: any) {
      throw { statusCode: 502, message: `Ghi lên blockchain thất bại: ${revertReason(err)}` };
    }
  });
}

// ---------------------------------------------------------------------------
// Đọc từ contract (miễn phí)
// ---------------------------------------------------------------------------

function toEvidence(e: any): EvidenceOnChain {
  return {
    dataHash: e.dataHash as Hex,
    version: BigInt(e.version),
    timestamp: BigInt(e.timestamp),
    action: Number(e.action),
    writer: e.writer as Hex,
  };
}

/** Toàn bộ lịch sử bằng chứng của một recordKey (rỗng nếu chưa có). */
export async function getHistoryFromChain(recordKey: Hex): Promise<EvidenceOnChain[]> {
  await assertContractDeployed();
  const list = (await publicClient.readContract({
    address: config.contractAddress,
    abi: IntegrityRegistryABI,
    functionName: "getHistory",
    args: [recordKey],
  })) as readonly any[];
  return list.map(toEvidence);
}

export async function getAllRecordKeysFromChain(): Promise<Hex[]> {
  await assertContractDeployed();
  const keys = await publicClient.readContract({
    address: config.contractAddress,
    abi: IntegrityRegistryABI,
    functionName: "getAllRecordKeys",
  });
  return [...keys] as Hex[];
}

export async function isWriterOnChain(address: Hex): Promise<boolean> {
  await assertContractDeployed();
  return (await publicClient.readContract({
    address: config.contractAddress,
    abi: IntegrityRegistryABI,
    functionName: "isWriter",
    args: [address],
  })) as boolean;
}

export async function getWritersFromChain(): Promise<Hex[]> {
  await assertContractDeployed();
  const list = await publicClient.readContract({
    address: config.contractAddress,
    abi: IntegrityRegistryABI,
    functionName: "getWriters",
  });
  return [...list] as Hex[];
}

/**
 * Kiểm tra mã giao dịch có thật sự là giao dịch ghi bằng chứng `version` của `recordKey`
 * trên contract này hay không (đọc event EvidenceAdded trong biên lai).
 */
export async function txProvesEvidence(txHash: Hex, recordKey: Hex, version: number): Promise<boolean> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") return false;
    return receipt.logs.some(
      (log) =>
        log.address.toLowerCase() === config.contractAddress.toLowerCase() &&
        log.topics[1]?.toLowerCase() === recordKey.toLowerCase() &&
        log.topics[2] !== undefined &&
        BigInt(log.topics[2]) === BigInt(version)
    );
  } catch {
    return false;
  }
}

/** Mã giao dịch và số khối của từng phiên bản, đọc từ event EvidenceAdded. */
export async function getEvidenceTxs(recordKey: Hex) {
  const logs = await publicClient.getContractEvents({
    address: config.contractAddress,
    abi: IntegrityRegistryABI,
    eventName: "EvidenceAdded",
    args: { recordKey },
    fromBlock: 0n,
    toBlock: "latest",
  });
  const map = new Map<number, { transactionHash: Hex; blockNumber: bigint }>();
  for (const l of logs) {
    map.set(Number((l as any).args.version), {
      transactionHash: l.transactionHash as Hex,
      blockNumber: l.blockNumber as bigint,
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Việc của ví hệ thống (owner)
// ---------------------------------------------------------------------------

export async function getBalance(address: Hex): Promise<bigint> {
  return publicClient.getBalance({ address });
}

/** Cấp gas cho ví admin mới (mạng local). */
export async function fundWallet(address: Hex): Promise<void> {
  const wallet = createWalletClient({ account: ownerAccount, chain: hardhat, transport });
  await serial(ownerAccount.address, async () => {
    const hash = await wallet.sendTransaction({
      to: address,
      value: parseEther(config.walletFundingEth),
    });
    await publicClient.waitForTransactionReceipt({ hash });
  });
}

export async function grantWriter(address: Hex): Promise<void> {
  await sendTx(ownerAccount, "addWriter", [address]);
}

export async function revokeWriter(address: Hex): Promise<void> {
  await sendTx(ownerAccount, "removeWriter", [address]);
}
