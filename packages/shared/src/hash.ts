import { createHash } from "node:crypto";
import type { CanonicalRecordKeyData, CanonicalScoreData, Hex } from "./types.js";

/** Điểm luôn có đúng 2 chữ số thập phân: "8.50", "9.00". */
export function normalizeScore(score: string | number): string {
  const numeric = typeof score === "number" ? score : Number.parseFloat(String(score).trim());
  if (Number.isNaN(numeric)) {
    throw new Error(`Điểm không hợp lệ: ${score}`);
  }
  return numeric.toFixed(2);
}

/** Chuỗi đầu vào của recordKey: studentId|courseCode|semester */
export function buildRecordKeyInput(data: CanonicalRecordKeyData): string {
  const studentId = data.studentId.trim();
  const courseCode = data.courseCode.trim();
  const semester = data.semester.trim();

  if (!studentId || !courseCode || !semester) {
    throw new Error("studentId, courseCode và semester không được rỗng");
  }
  return `${studentId}|${courseCode}|${semester}`;
}

/** Chuỗi đầu vào của dataHash: studentId|courseCode|semester|score|version */
export function buildDataHashInput(data: CanonicalScoreData): string {
  const base = buildRecordKeyInput(data);
  const score = normalizeScore(data.score);
  const version = BigInt(data.version).toString();
  return `${base}|${score}|${version}`;
}

export function sha256(value: string): Hex {
  return `0x${createHash("sha256").update(value, "utf8").digest("hex").toLowerCase()}` as Hex;
}

/** recordKey = SHA256(studentId|courseCode|semester) */
export function computeRecordKey(data: CanonicalRecordKeyData): Hex {
  return sha256(buildRecordKeyInput(data));
}

/** dataHash = SHA256(studentId|courseCode|semester|score|version) */
export function computeDataHash(data: CanonicalScoreData): Hex {
  return sha256(buildDataHashInput(data));
}

export function sameHash(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}
