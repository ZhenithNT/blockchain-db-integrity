import { z } from "zod";

export type Hex = `0x${string}`;

export enum Action {
  CREATE = 0,
  UPDATE = 1,
  DELETE = 2,
}

export const ActionNames: Record<Action, "CREATE" | "UPDATE" | "DELETE"> = {
  [Action.CREATE]: "CREATE",
  [Action.UPDATE]: "UPDATE",
  [Action.DELETE]: "DELETE",
};

export type ScoreStatus = "ACTIVE" | "DELETED";

export type BlockchainStatus = "CONFIRMED" | "PENDING" | "FAILED";

export type IntegrityResultStatus = "VALID" | "INVALID" | "PENDING" | "ERROR";

export type IntegrityMismatchReason =
  | "HASH_MISMATCH"
  | "VERSION_MISMATCH"
  | "MISSING_ON_CHAIN"
  | "MISSING_IN_DATABASE"
  | "ACTION_MISMATCH";

export type UserRole = "ADMIN" | "LECTURER" | "AUDITOR";

export interface CanonicalScoreData {
  studentId: string;
  courseCode: string;
  semester: string;
  score: string | number;
  version: number | bigint;
  status: ScoreStatus | string;
}

export interface CanonicalRecordKeyData {
  studentId: string;
  courseCode: string;
  semester: string;
}

export interface EvidenceOnChain {
  dataHash: Hex;
  actorHash: Hex;
  version: bigint;
  timestamp: bigint;
  action: Action;
  writerAddress: string;
}

export interface IntegrityCheckDetail {
  scoreId: number;
  studentId: string;
  courseCode: string;
  semester: string;
  recordKey: Hex;
  databaseScore: string;
  databaseVersion: number;
  databaseHash: Hex;
  databaseStatus: string;
  blockchainHash: Hex | null;
  blockchainVersion: number | null;
  blockchainAction: string | null;
  blockchainTimestamp: string | null;
  writerAddress: string | null;
  result: IntegrityResultStatus;
  reason?: IntegrityMismatchReason;
  message: string;
  checkedAt: string;
  historyChecks?: HistoryVersionCheck[];
}

export interface HistoryVersionCheck {
  version: number;
  databaseHash: Hex;
  blockchainHash: Hex | null;
  databaseAction: string;
  blockchainAction: string | null;
  matches: boolean;
  reason?: IntegrityMismatchReason;
}

export const createScoreSchema = z.object({
  studentId: z.string().trim().min(1, "Mã sinh viên không được rỗng"),
  courseCode: z.string().trim().min(1, "Mã môn học không được rỗng"),
  semester: z.string().trim().min(1, "Học kỳ không được rỗng"),
  score: z.coerce
    .number()
    .min(0, "Điểm phải >= 0")
    .max(10, "Điểm phải <= 10"),
});

export const updateScoreSchema = z.object({
  score: z.coerce
    .number()
    .min(0, "Điểm phải >= 0")
    .max(10, "Điểm phải <= 10"),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Tên đăng nhập không được rỗng"),
  password: z.string().min(1, "Mật khẩu không được rỗng"),
});
