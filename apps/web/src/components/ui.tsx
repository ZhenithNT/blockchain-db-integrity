import React from "react";
import type { SignerIdentity } from "../types";

/** Rút gọn hash hoặc địa chỉ: 0x1234ab…cdef */
export function shortHash(value: string | null | undefined, head = 8, tail = 4): string {
  if (!value) return "N/A";
  return value.length > head + tail + 2 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
}

export const REASON_LABEL: Record<string, string> = {
  HASH_MISMATCH: "Dữ liệu đã bị sửa",
  VERSION_MISMATCH: "Lệch phiên bản",
  MISSING_ON_CHAIN: "Chưa có bằng chứng trên chain",
  MISSING_IN_DATABASE: "Bản ghi đã bị xóa khỏi MySQL",
  FORGED_VERSION: "Có phiên bản giả",
  HISTORY_MISSING: "Mất dòng lịch sử",
  TX_MISMATCH: "Mã giao dịch sai",
  UNKNOWN_SIGNER: "Ví ký lạ",
};

export const Hash: React.FC<{ value: string | null | undefined; head?: number; tail?: number }> = ({
  value,
  head,
  tail,
}) => (
  <span className="hash" title={value || ""}>
    {shortHash(value, head, tail)}
  </span>
);

/** Hiển thị AI đã ký: tên admin kèm địa chỉ ví rút gọn. */
export const Signer: React.FC<{ signer: SignerIdentity | null | undefined; compact?: boolean }> = ({
  signer,
  compact,
}) => {
  if (!signer) return <span className="muted">—</span>;
  const unknown = !signer.username;
  return (
    <span title={signer.address} style={{ lineHeight: 1.25 }}>
      <strong style={{ color: unknown ? "var(--invalid)" : "var(--text-primary)" }}>{signer.fullName}</strong>
      {!compact && (
        <span className="mono muted" style={{ display: "block", fontSize: "0.7rem" }}>
          {shortHash(signer.address, 8, 6)}
        </span>
      )}
    </span>
  );
};

export function resultBadge(result: string) {
  const cls = result === "VALID" ? "badge-valid" : result === "INVALID" ? "badge-invalid" : "badge-pending";
  const label = result === "VALID" ? "Hợp lệ" : result === "INVALID" ? "Sai lệch" : "Lỗi";
  return <span className={`badge ${cls}`}>{label}</span>;
}
