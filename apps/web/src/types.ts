export type UserRole = "ADMIN" | "LECTURER" | "AUDITOR";

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

export interface ScoreVersion {
  id: number;
  scoreId: number;
  version: number;
  score: string;
  status: string;
  action: string;
  dataHash: string;
  actorHash: string;
  transactionHash: string | null;
  blockNumber: string | null;
  blockchainTimestamp: string | null;
  syncStatus: string;
  createdAt: string;
}

export interface IntegrityCheckRecord {
  id: number;
  scoreId: number;
  databaseHash: string;
  blockchainHash: string | null;
  databaseVersion: number;
  blockchainVersion: number | null;
  result: "VALID" | "INVALID" | "PENDING" | "ERROR";
  details: string;
  checkedAt: string;
}

export interface Score {
  id: number;
  studentId: string;
  courseCode: string;
  semester: string;
  score: string;
  version: number;
  status: "ACTIVE" | "DELETED";
  recordKey: string;
  dataHash: string;
  blockchainStatus: "CONFIRMED" | "PENDING" | "FAILED";
  createdAt: string;
  updatedAt: string;
  latestCheck?: IntegrityCheckRecord | null;
  versions?: ScoreVersion[];
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
  databaseStatus: string;
  blockchainHash: string | null;
  blockchainVersion: number | null;
  blockchainAction: string | null;
  blockchainTimestamp: string | null;
  writerAddress: string | null;
  result: "VALID" | "INVALID" | "PENDING" | "ERROR";
  reason?: string;
  message: string;
  checkedAt: string;
  historyChecks?: {
    version: number;
    databaseHash: string;
    blockchainHash: string | null;
    databaseAction: string;
    blockchainAction: string | null;
    matches: boolean;
    reason?: string;
  }[];
}

export interface DashboardData {
  summary: {
    totalScores: number;
    validCount: number;
    invalidCount: number;
    pendingCount: number;
    errorCount: number;
  };
  recentTransactions: {
    id: number;
    scoreId: number;
    studentId: string;
    courseCode: string;
    version: number;
    action: string;
    score: string;
    transactionHash: string;
    blockNumber: string | null;
    timestamp: string;
  }[];
  recentAuditLogs: {
    id: number;
    actor: string;
    action: string;
    target: string;
    beforeData: string | null;
    afterData: string | null;
    ip: string | null;
    timestamp: string;
  }[];
}
