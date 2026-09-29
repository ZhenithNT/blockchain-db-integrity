import { normalizeScore } from "./hash.js";

/**
 * Tính điểm tổng kết hệ 10 từ các điểm thành phần:
 * Chuyên cần (10%), Giữa kỳ (20%), Cuối kỳ (70%)
 */
export function calculateTotalScore(
  attendance: number | null | undefined,
  midterm: number | null | undefined,
  finalExam: number | null | undefined
): string {
  if (attendance == null || midterm == null || finalExam == null) {
    return "0.00";
  }
  const att = Math.max(0, Math.min(10, attendance));
  const mid = Math.max(0, Math.min(10, midterm));
  const fin = Math.max(0, Math.min(10, finalExam));

  const total = att * 0.1 + mid * 0.2 + fin * 0.7;
  return normalizeScore(total);
}

/**
 * Quy đổi điểm hệ 10 sang điểm chữ theo quy chế đào tạo tín chỉ
 */
export function calculateLetterGrade(scoreVal: string | number): string {
  const numeric = typeof scoreVal === "number" ? scoreVal : Number.parseFloat(scoreVal);
  if (Number.isNaN(numeric)) return "F";

  if (numeric >= 9.0) return "A+";
  if (numeric >= 8.5) return "A";
  if (numeric >= 8.0) return "B+";
  if (numeric >= 7.0) return "B";
  if (numeric >= 6.5) return "C+";
  if (numeric >= 5.5) return "C";
  if (numeric >= 5.0) return "D+";
  if (numeric >= 4.0) return "D";
  return "F";
}

/**
 * Quy đổi sang thang điểm 4
 */
export function calculateGpa4(scoreVal: string | number): number {
  const numeric = typeof scoreVal === "number" ? scoreVal : Number.parseFloat(scoreVal);
  if (Number.isNaN(numeric)) return 0;

  if (numeric >= 9.0) return 4.0;
  if (numeric >= 8.5) return 3.7;
  if (numeric >= 8.0) return 3.5;
  if (numeric >= 7.0) return 3.0;
  if (numeric >= 6.5) return 2.5;
  if (numeric >= 5.5) return 2.0;
  if (numeric >= 5.0) return 1.5;
  if (numeric >= 4.0) return 1.0;
  return 0.0;
}
