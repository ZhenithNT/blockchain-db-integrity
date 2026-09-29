import { z } from "zod";

export type Hex = `0x${string}`;

export enum Action {
  CREATE = 0,
  UPDATE = 1,
  DELETE = 2,
  RESTORE = 3,
}

export const ActionNames: Record<Action, "CREATE" | "UPDATE" | "DELETE" | "RESTORE"> = {
  [Action.CREATE]: "CREATE",
  [Action.UPDATE]: "UPDATE",
  [Action.DELETE]: "DELETE",
  [Action.RESTORE]: "RESTORE",
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

export type UserRole = "ADMIN" | "LECTURER" | "AUDITOR" | "STUDENT";

export type OfferingStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED" | "LOCKED";

export type ChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CanonicalScoreData {
  studentId: string;
  courseCode: string;
  semester: string;
  score: string | number;
  version: number | bigint;
  status: ScoreStatus | string;
  offeringCode?: string;
}

export interface CanonicalRecordKeyData {
  studentId: string;
  courseCode: string;
  semester: string;
  offeringCode?: string;
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
  offeringCode?: string;
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

// Schemas
export const createScoreSchema = z.object({
  studentId: z.string().trim().min(1, "Mã sinh viên không được rỗng"),
  courseCode: z.string().trim().min(1, "Mã môn học không được rỗng"),
  semester: z.string().trim().min(1, "Học kỳ không được rỗng"),
  offeringCode: z.string().trim().optional(),
  attendanceScore: z.coerce.number().min(0).max(10).optional(),
  midtermScore: z.coerce.number().min(0).max(10).optional(),
  finalScore: z.coerce.number().min(0).max(10).optional(),
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
  attendanceScore: z.coerce.number().min(0).max(10).optional(),
  midtermScore: z.coerce.number().min(0).max(10).optional(),
  finalScore: z.coerce.number().min(0).max(10).optional(),
});

export const batchSaveScoresSchema = z.object({
  offeringId: z.number().int().positive(),
  scores: z.array(
    z.object({
      enrollmentId: z.number().int().positive().optional(),
      studentCode: z.string().trim().min(1).optional(),
      attendanceScore: z.coerce.number().min(0).max(10).nullable().optional(),
      midtermScore: z.coerce.number().min(0).max(10).nullable().optional(),
      finalScore: z.coerce.number().min(0).max(10).nullable().optional(),
      score: z.coerce.number().min(0).max(10).nullable().optional(),
    }).refine((data) => Boolean(data.studentCode || data.enrollmentId), {
      message: "Phải cung cấp studentCode hoặc enrollmentId",
    })
  ),
  isDraft: z.boolean().default(true),
});

export const createChangeRequestSchema = z.object({
  scoreId: z.number().int().positive(),
  proposedScore: z.coerce.number().min(0).max(10),
  proposedAttendance: z.coerce.number().min(0).max(10).optional(),
  proposedMidterm: z.coerce.number().min(0).max(10).optional(),
  proposedFinal: z.coerce.number().min(0).max(10).optional(),
  reason: z.string().trim().min(5, "Lý do điều chỉnh phải có ít nhất 5 ký tự"),
  evidenceAttachment: z.string().trim().optional(),
});

export const reviewChangeRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Tên đăng nhập không được rỗng"),
  password: z.string().min(1, "Mật khẩu không được rỗng"),
});
