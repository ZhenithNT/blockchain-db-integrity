import { createHash } from "node:crypto";
import type {
  CanonicalRecordKeyData,
  CanonicalScoreData,
  Hex,
} from "./types.js";

/**
 * Định dạng điểm số luôn có đúng 2 chữ số thập phân, ví dụ "8.50", "9.00".
 * Đảm bảo tính nhất quán độc lập với cài đặt ngôn ngữ (locale) của hệ điều hành.
 */
export function normalizeScore(score: string | number): string {
  const numeric = typeof score === "number" ? score : Number.parseFloat(String(score).trim());
  if (Number.isNaN(numeric)) {
    throw new Error(`Điểm số không hợp lệ: ${score}`);
  }
  return numeric.toFixed(2);
}

/**
 * Tạo chuỗi chuẩn hóa (canonical string) cho recordKey:
 * studentId|courseCode|semester
 */
export function buildRecordKeyInput(data: CanonicalRecordKeyData): string {
  const studentId = data.studentId.trim();
  const courseCode = data.courseCode.trim();
  const semester = data.semester.trim();

  if (!studentId || !courseCode || !semester) {
    throw new Error("studentId, courseCode và semester không được rỗng khi tạo recordKey");
  }

  return `${studentId}|${courseCode}|${semester}`;
}

/**
 * Tạo chuỗi chuẩn hóa (canonical string) cho dataHash:
 * studentId|courseCode|semester|score|version|status
 */
export function buildDataHashInput(data: CanonicalScoreData): string {
  const studentId = data.studentId.trim();
  const courseCode = data.courseCode.trim();
  const semester = data.semester.trim();
  const score = normalizeScore(data.score);
  const version = BigInt(data.version).toString();
  const status = data.status.trim().toUpperCase();

  if (!studentId || !courseCode || !semester) {
    throw new Error("studentId, courseCode và semester không được rỗng khi tạo dataHash");
  }

  return `${studentId}|${courseCode}|${semester}|${score}|${version}|${status}`;
}

/**
 * Băm chuỗi đầu vào UTF-8 bằng thuật toán SHA-256, trả về chuỗi Hex bắt đầu bằng 0x.
 */
export function sha256(value: string): Hex {
  return `0x${createHash("sha256").update(value, "utf8").digest("hex").toLowerCase()}` as Hex;
}

/**
 * Tính recordKey từ thông tin định danh sinh viên, môn học, học kỳ.
 */
export function computeRecordKey(data: CanonicalRecordKeyData): Hex {
  return sha256(buildRecordKeyInput(data));
}

/**
 * Tính dataHash từ toàn bộ thông tin phiên bản điểm.
 */
export function computeDataHash(data: CanonicalScoreData): Hex {
  return sha256(buildDataHashInput(data));
}

/**
 * Tính actorHash từ định danh người thực hiện (userId / username).
 */
export function computeActorHash(actorId: string): Hex {
  const normalized = actorId.trim();
  if (!normalized) {
    throw new Error("actorId không được để trống khi tính actorHash");
  }
  return sha256(normalized);
}
