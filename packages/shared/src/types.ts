import { z } from "zod";

export type Hex = `0x${string}`;

export enum Action {
  CREATE = 0,
  UPDATE = 1,
}

export const ActionNames: Record<Action, "CREATE" | "UPDATE"> = {
  [Action.CREATE]: "CREATE",
  [Action.UPDATE]: "UPDATE",
};

export type IntegrityResultStatus = "VALID" | "INVALID" | "ERROR";

export type IntegrityMismatchReason =
  | "HASH_MISMATCH" // điểm trong MySQL khác bằng chứng
  | "VERSION_MISMATCH" // phiên bản khác
  | "MISSING_ON_CHAIN" // MySQL có bản ghi nhưng chain không có
  | "MISSING_IN_DATABASE" // chain có bằng chứng nhưng MySQL mất bản ghi
  | "FORGED_VERSION" // MySQL có phiên bản chưa từng ghi lên chain
  | "HISTORY_MISSING" // MySQL mất một dòng lịch sử
  | "TX_MISMATCH" // mã giao dịch không trỏ tới đúng bằng chứng
  | "UNKNOWN_SIGNER"; // ví ký không thuộc admin nào

export interface CanonicalRecordKeyData {
  studentId: string;
  courseCode: string;
  semester: string;
}

export interface CanonicalScoreData extends CanonicalRecordKeyData {
  score: string | number;
  version: number | bigint;
}

/** Bằng chứng đọc từ blockchain. */
export interface EvidenceOnChain {
  dataHash: Hex;
  version: bigint;
  timestamp: bigint;
  action: Action;
  writer: Hex;
}

/** Người ký, suy ra từ địa chỉ ví. */
export interface SignerIdentity {
  address: string;
  username: string | null;
  fullName: string;
}

export interface HistoryVersionCheck {
  version: number;
  databaseHash: Hex | null;
  blockchainHash: Hex | null;
  writer: SignerIdentity | null;
  txOk: boolean | null; // null = DB không lưu mã giao dịch
  matches: boolean;
  reason?: IntegrityMismatchReason;
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
  blockchainHash: Hex | null;
  blockchainVersion: number | null;
  blockchainTimestamp: string | null;
  writer: SignerIdentity | null;
  result: IntegrityResultStatus;
  reason?: IntegrityMismatchReason;
  message: string;
  checkedAt: string;
  historyChecks: HistoryVersionCheck[];
}

// ---------- Schemas ----------

const scoreField = z.coerce.number().min(0, "Điểm phải >= 0").max(10, "Điểm phải <= 10");

export const createScoreSchema = z.object({
  studentId: z.string().trim().min(1, "Mã sinh viên không được rỗng"),
  courseCode: z.string().trim().min(1, "Mã môn học không được rỗng"),
  semester: z.string().trim().min(1, "Học kỳ không được rỗng"),
  score: scoreField,
});

export const updateScoreSchema = z.object({
  score: scoreField,
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Tên đăng nhập không được rỗng"),
  password: z.string().min(1, "Mật khẩu không được rỗng"),
});
