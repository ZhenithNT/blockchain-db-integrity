import {
  type Account,
  createPublicClient,
  createWalletClient,
  getContract,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { localhost } from "viem/chains";
import {
  Action,
  type EvidenceOnChain,
  type Hex,
  IntegrityRegistryABI,
} from "@integrity/shared";
import { config } from "./config.js";

let publicClientInstance: any = null;
let walletClientInstance: any = null;
let accountInstance: Account | null = null;
let simulatedViem: any = null;

async function getClients() {
  if (publicClientInstance && (walletClientInstance || simulatedViem)) {
    return {
      publicClient: publicClientInstance,
      walletClient: walletClientInstance,
      account: accountInstance,
      simulatedViem,
    };
  }

  // 1. Kiểm tra xem Hardhat node HTTP (127.0.0.1:8545) có đang chạy không
  try {
    const testClient = createPublicClient({
      chain: localhost,
      transport: http(config.blockchainRpcUrl, { timeout: 1500 }),
    });
    await testClient.getBlockNumber();

    // RPC hoạt động bình thường
    accountInstance = privateKeyToAccount(config.deployerPrivateKey);
    walletClientInstance = createWalletClient({
      account: accountInstance,
      chain: localhost,
      transport: http(config.blockchainRpcUrl),
    });
    publicClientInstance = testClient;

    return {
      publicClient: publicClientInstance,
      walletClient: walletClientInstance,
      account: accountInstance,
      simulatedViem: null,
    };
  } catch (_rpcErr) {
    // 2. Nếu Hardhat node chưa chạy, fallback sang in-process Hardhat network (rất tiện cho test & demo độc lập)
    try {
      const hre = await import("hardhat");
      const { viem } = (await hre.default.network.create()) as any;
      publicClientInstance = await viem.getPublicClient();
      const [ownerWallet] = await viem.getWalletClients();
      walletClientInstance = ownerWallet;
      accountInstance = ownerWallet.account;
      simulatedViem = viem;

      return {
        publicClient: publicClientInstance,
        walletClient: walletClientInstance,
        account: accountInstance,
        simulatedViem,
      };
    } catch (inProcessErr) {
      throw new Error(
        `Không thể kết nối đến Blockchain RPC (${config.blockchainRpcUrl}) hoặc Hardhat runtime: ${inProcessErr}`
      );
    }
  }
}

let deployedInstance: any = null;

async function getContractInstance() {
  const { publicClient, walletClient, simulatedViem } = await getClients();

  if (simulatedViem) {
    if (deployedInstance) {
      return deployedInstance;
    }

    const bytecode = await publicClient.getBytecode({
      address: config.contractAddress,
    });

    if (!bytecode || bytecode === "0x") {
      deployedInstance = await simulatedViem.deployContract("IntegrityRegistry");
      config.contractAddress = deployedInstance.address;
      return deployedInstance;
    }

    deployedInstance = await simulatedViem.getContractAt(
      "IntegrityRegistry",
      config.contractAddress
    );
    return deployedInstance;
  }

  return getContract({
    address: config.contractAddress,
    abi: IntegrityRegistryABI,
    client: {
      public: publicClient,
      wallet: walletClient,
    },
  });
}

export async function isBlockchainAvailable(): Promise<boolean> {
  try {
    const { publicClient } = await getClients();
    await publicClient.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}

export async function appendEvidenceOnChain(
  recordKey: Hex,
  dataHash: Hex,
  actorHash: Hex,
  expectedVersion: bigint,
  action: Action
): Promise<{
  transactionHash: Hex;
  blockNumber: bigint;
  blockchainTimestamp: Date;
}> {
  const { publicClient, walletClient, account } = await getClients();
  const contract = await getContractInstance();

  const txHash = await contract.write.appendEvidence(
    [recordKey, dataHash, actorHash, expectedVersion, action],
    { account }
  );

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  const block = await publicClient.getBlock({
    blockNumber: receipt.blockNumber,
  });

  const blockchainTimestamp = new Date(Number(block.timestamp) * 1000);

  return {
    transactionHash: txHash,
    blockNumber: receipt.blockNumber,
    blockchainTimestamp,
  };
}

export async function getLatestEvidenceFromChain(
  recordKey: Hex
): Promise<EvidenceOnChain> {
  const contract = await getContractInstance();
  const evidence = await contract.read.getLatestEvidence([recordKey]);

  return {
    dataHash: evidence.dataHash as Hex,
    actorHash: evidence.actorHash as Hex,
    version: BigInt(evidence.version),
    timestamp: BigInt(evidence.timestamp),
    action: Number(evidence.action) as Action,
    writerAddress: evidence.writerAddress,
  };
}

export async function getEvidenceByVersionFromChain(
  recordKey: Hex,
  version: bigint
): Promise<EvidenceOnChain> {
  const contract = await getContractInstance();
  const evidence = await contract.read.getEvidenceByVersion([
    recordKey,
    version,
  ]);

  return {
    dataHash: evidence.dataHash as Hex,
    actorHash: evidence.actorHash as Hex,
    version: BigInt(evidence.version),
    timestamp: BigInt(evidence.timestamp),
    action: Number(evidence.action) as Action,
    writerAddress: evidence.writerAddress,
  };
}

export async function getVersionCountFromChain(
  recordKey: Hex
): Promise<bigint> {
  const contract = await getContractInstance();
  const count = await contract.read.getVersionCount([recordKey]);
  return BigInt(count);
}

export async function recordExistsOnChain(recordKey: Hex): Promise<boolean> {
  const contract = await getContractInstance();
  return await contract.read.exists([recordKey]);
}
