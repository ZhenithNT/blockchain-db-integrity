import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { IntegrityCheckDetail, Score } from "../types";

interface ScoreDetailModalProps {
  score: Score;
  onClose: () => void;
}

export const ScoreDetailModal: React.FC<ScoreDetailModalProps> = ({ score, onClose }) => {
  const [detail, setDetail] = useState<Score | null>(null);
  const [checkResult, setCheckResult] = useState<IntegrityCheckDetail | null>(null);
  const [checking, setChecking] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadDetail = async () => {
    try {
      const full = await api.getScoreById(score.id);
      setDetail(full);
      // Chạy kiểm tra tính toàn vẹn ngay
      await runCheck();
    } catch (err: any) {
      console.error(err);
    }
  };

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await api.checkIntegrity(score.id);
      setCheckResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [score.id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const s = detail || score;
  const isMatch = checkResult?.result === "VALID";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "820px", padding: "2rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1e293b" }}>
                Chi tiết điểm thi: {s.studentId}
              </h2>
              <span className={`badge ${s.status === "ACTIVE" ? "badge-valid" : "badge-invalid"}`}>
                {s.status === "ACTIVE" ? "Đang dùng" : "Đã xóa"}
              </span>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.2rem" }}>
              Môn: <strong>{s.courseCode}</strong> | Học kỳ: <strong>{s.semester}</strong> | ID: #{s.id}
            </p>
          </div>

          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕ Đóng
          </button>
        </div>

        {/* Status Verification Banner */}
        <div
          style={{
            background: isMatch ? "var(--valid-bg)" : checkResult ? "var(--invalid-bg)" : "var(--pending-bg)",
            border: `1px solid ${isMatch ? "var(--valid-border)" : checkResult ? "var(--invalid-border)" : "var(--pending-border)"}`,
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>{isMatch ? "✓" : "⚠️"}</span>
              <strong style={{ fontSize: "1rem", color: isMatch ? "var(--valid)" : checkResult ? "var(--invalid)" : "var(--pending)" }}>
                {isMatch ? "DỮ LIỆU TOÀN VẸN VÀ HỢP LỆ" : checkResult?.result ? "PHÁT HIỆN DỮ LIỆU BỊ SAI LỆCH" : "ĐANG KIỂM TRA..."}
              </strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: isMatch ? "#065f46" : checkResult ? "#991b1b" : "#92400e", marginTop: "0.25rem" }}>
              {checkResult?.message || "Đang đối soát dữ liệu..."}
            </p>
            {checkResult?.reason && (
              <div style={{ fontSize: "0.75rem", color: "var(--invalid)", marginTop: "0.2rem", fontWeight: 700 }}>
                Nguyên nhân: {checkResult.reason === "HASH_MISMATCH" ? "Mã băm không khớp với bản gốc đã niêm phong" : checkResult.reason}
              </div>
            )}
          </div>

          <button
            className="btn btn-sm btn-outline"
            onClick={runCheck}
            disabled={checking}
          >
            {checking ? "Đang kiểm tra..." : "Kiểm tra lại"}
          </button>
        </div>

        {/* Side-by-Side Comparison: MySQL vs Blockchain */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          {/* MySQL Side */}
          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ fontSize: "0.9rem", color: "#0284c7", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              Dữ liệu điểm hiện tại
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", color: "#334155" }}>
              <div>Điểm: <strong style={{ fontSize: "1.1rem", color: "var(--primary-ptit)" }}>{s.score}</strong></div>
              <div>Phiên bản: <strong>v{s.version}</strong></div>
              <div>Trạng thái: <span className={`badge ${s.status === "ACTIVE" ? "badge-valid" : "badge-invalid"}`} style={{ fontSize: "0.65rem" }}>{s.status === "ACTIVE" ? "Đang dùng" : "Đã xóa"}</span></div>
              <div style={{ marginTop: "0.25rem" }}>
                <div style={{ color: "#64748b", fontSize: "0.72rem" }}>Mã băm dữ liệu hiện tại (SHA-256):</div>
                <div className="mono" style={{ fontSize: "0.68rem", color: "#334155", wordBreak: "break-all", background: "#ffffff", padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1", marginTop: "0.2rem" }}>
                  {s.dataHash}
                </div>
              </div>
            </div>
          </div>

          {/* Blockchain Side */}
          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ fontSize: "0.9rem", color: "#7c3aed", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              Bằng chứng niêm phong gốc
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", color: "#334155" }}>
              <div>Phiên bản niêm phong: <strong>v{checkResult?.blockchainVersion ?? "N/A"}</strong></div>
              <div>Thao tác ghi nhận: <strong>{checkResult?.blockchainAction || "N/A"}</strong></div>
              <div>Thời gian ghi nhận: <span style={{ color: "#64748b" }}>{checkResult?.blockchainTimestamp ? new Date(checkResult.blockchainTimestamp).toLocaleString("vi-VN") : "N/A"}</span></div>
              <div style={{ marginTop: "0.25rem" }}>
                <div style={{ color: "#64748b", fontSize: "0.72rem" }}>Mã băm gốc đã niêm phong:</div>
                <div className="mono" style={{ fontSize: "0.68rem", color: isMatch ? "var(--valid)" : "var(--invalid)", wordBreak: "break-all", background: "#ffffff", padding: "0.35rem 0.5rem", borderRadius: "4px", border: `1px solid ${isMatch ? "var(--valid-border)" : "var(--invalid-border)"}`, marginTop: "0.2rem", fontWeight: 600 }}>
                  {checkResult?.blockchainHash || "Chưa tìm thấy bằng chứng niêm phong"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Record Key Proof info */}
        <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1.5rem", fontSize: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#64748b", fontWeight: 600 }}>
              Mã định danh bản ghi (Record Key):
            </span>
            <button
              className="btn btn-outline btn-sm"
              style={{ padding: "0.15rem 0.4rem", fontSize: "0.65rem" }}
              onClick={() => copyToClipboard(s.recordKey, "recordKey")}
            >
              {copiedKey === "recordKey" ? "✓ Đã sao chép" : "Sao chép"}
            </button>
          </div>
          <div className="mono" style={{ color: "#334155", wordBreak: "break-all", marginTop: "0.2rem" }}>
            {s.recordKey}
          </div>
        </div>

        {/* Version History Timeline (Append-Only) */}
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "#1e293b" }}>
            Lịch sử các phiên bản điểm
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {detail?.versions && detail.versions.length > 0 ? (
              detail.versions.map((v) => {
                const histCheck = checkResult?.historyChecks?.find((h) => h.version === v.version);
                const isHistValid = histCheck?.matches;

                return (
                  <div
                    key={v.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderLeft: `4px solid ${isHistValid ? "var(--valid)" : histCheck ? "var(--invalid)" : "#3b82f6"}`,
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      fontSize: "0.8rem",
                      color: "#1e293b",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>Phiên bản {v.version}</strong> ({v.action}) — Điểm:{" "}
                        <strong style={{ color: "var(--primary-ptit)" }}>{v.score}</strong>
                      </div>
                      <span className={`badge ${isHistValid ? "badge-valid" : histCheck ? "badge-invalid" : "badge-pending"}`} style={{ fontSize: "0.65rem" }}>
                        {isHistValid ? "Hợp lệ" : histCheck ? "Sai lệch" : "Chưa kiểm tra"}
                      </span>
                    </div>

                    <div className="mono" style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.3rem" }}>
                      Data Hash: {v.dataHash}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#64748b", marginTop: "0.25rem" }}>
                      <span>Tx: {v.transactionHash ? `${v.transactionHash.slice(0, 18)}...` : "Chưa có"} (Block #{v.blockNumber || "..."})</span>
                      <span>{new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "#64748b", fontSize: "0.85rem" }}>Đang tải lịch sử...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
