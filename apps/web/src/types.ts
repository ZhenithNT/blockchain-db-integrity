export interface User {
  id: number;
  username: string;
  fullName: string;
  walletAddress: string | null;
}

/** Người ký, suy ra từ địa chỉ ví đọc trên blockchain. */
export interface SignerIdentity {
  address: string;
  username: string | null;
  fullName: string;
}

export interface LatestCheck {
  result: string;
  reason: string | null;
  checkedAt: string;
}

export interface Score {
  id: number;
  studentId: string;
  studentName: string | null;
  courseCode: string;
  semester: string;
  score: string;
  version: number;
  recordKey: string;
  dataHash: string;
  createdAt: string;
  updatedAt: string;
  latestCheck: LatestCheck | null;
}

export interface ScoreVersion {
  id: number;
  scoreId: number;
  version: number;
  score: string;
  action: string;
  dataHash: string;
  transactionHash: string | null;
  blockNumber: string | null;
  createdAt: string;
  signer: SignerIdentity | null;
  blockchainTimestamp: string | null;
}

export interface ScoreDetail extends Omit<Score, "latestCheck"> {
  versions: ScoreVersion[];
}

export interface HistoryVersionCheck {
  version: number;
  databaseHash: string | null;
  blockchainHash: string | null;
  writer: SignerIdentity | null;
  txOk: boolean | null;
  matches: boolean;
  reason?: string;
}

export interface IntegrityCheckDetail {
  scoreId: number;
  studentId: string;
  courseCode: string;
  semester: string;
  recordKey: string;
  databaseScore: string;
  databaseVersion: number;
  databaseHash: string;
  blockchainHash: string | null;
  blockchainVersion: number | null;
  blockchainTimestamp: string | null;
  writer: SignerIdentity | null;
  result: "VALID" | "INVALID" | "ERROR";
  reason?: string;
  message: string;
  checkedAt: string;
  historyChecks: HistoryVersionCheck[];
}

export interface MissingRecord {
  recordKey: string;
  blockchainVersion: number;
  blockchainHash: string;
  timestamp: string;
  writer: SignerIdentity | null;
}

export interface CheckAllResult {
  summary: { total: number; valid: number; invalid: number; errors: number; missing: number };
  results: IntegrityCheckDetail[];
  missing: MissingRecord[];
  chainError: string | null;
  checkedAt: string;
}

export interface RecentCheck {
  id: number;
  scoreId: number | null;
  studentId: string | null;
  courseCode: string | null;
  semester: string | null;
  result: string;
  reason: string | null;
  databaseVersion: number | null;
  blockchainVersion: number | null;
  checkedAt: string;
}

export interface WalletRow {
  address: string;
  username: string;
  fullName: string;
  status: string;
  onChainWriter: boolean;
  unlocked: boolean;
  kind: "ADMIN" | "ROGUE";
}

export interface Catalog {
  students: { studentCode: string; fullName: string; className: string }[];
  courses: { code: string; name: string; credits: number }[];
  semesters: { code: string; name: string }[];
}

export interface AuditLogItem {
  id: number;
  actor: string;
  action: string;
  target: string;
  beforeData: string | null;
  afterData: string | null;
  ip: string | null;
  timestamp: string;
}
