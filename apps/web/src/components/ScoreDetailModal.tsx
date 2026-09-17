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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "1px solid #334155", paddingBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>
                Chi Tiết Bản Ghi Điểm: {s.studentId}
              </h2>
              <span className={`badge ${s.status === "ACTIVE" ? "badge-valid" : "badge-invalid"}`}>
                {s.status}
              </span>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.2rem" }}>
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
            background: isMatch ? "rgba(16, 185, 129, 0.12)" : checkResult ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.1)",
            border: `1px solid ${isMatch ? "#10b981" : checkResult ? "#ef4444" : "#f59e0b"}`,
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
              <span style={{ fontSize: "1.2rem" }}>{isMatch ? "🛡️" : "🚨"}</span>
              <strong style={{ fontSize: "1rem", color: isMatch ? "#34d399" : "#f87171" }}>
                KẾT QUẢ KIỂM TRA: {checkResult?.result || "ĐANG KIỂM TRA..."}
              </strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: isMatch ? "#a7f3d0" : "#fca5a5", marginTop: "0.25rem" }}>
              {checkResult?.message || "Đang truy vấn bằng chứng từ Smart Contract..."}
            </p>
            {checkResult?.reason && (
              <div style={{ fontSize: "0.75rem", color: "#fecaca", marginTop: "0.2rem", fontWeight: 700 }}>
                Nguyên nhân: {checkResult.reason}
              </div>
            )}
          </div>

          <button
            className="btn btn-sm btn-outline"
            onClick={runCheck}
            disabled={checking}
          >
            {checking ? "⏳ Đang tính toán..." : "🔄 Kiểm tra lại"}
          </button>
        </div>

        {/* Side-by-Side Comparison: MySQL vs Blockchain */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          {/* MySQL Side */}
          <div style={{ background: "#1e293b", padding: "1rem", borderRadius: "8px", border: "1px solid #334155" }}>
            <h4 style={{ fontSize: "0.9rem", color: "#38bdf8", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              🗄️ Dữ Liệu Trong CSDL (MySQL)
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem" }}>
              <div>Điểm hiện tại: <strong style={{ fontSize: "1.1rem", color: "#f8fafc" }}>{s.score}</strong></div>
              <div>Phiên bản (Version): <strong>v{s.version}</strong></div>
              <div>Trạng thái: <span className={`badge ${s.status === "ACTIVE" ? "badge-valid" : "badge-invalid"}`} style={{ fontSize: "0.65rem" }}>{s.status}</span></div>
              <div style={{ marginTop: "0.25rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Mã băm tính từ CSDL (Data Hash):</div>
                <div className="mono" style={{ fontSize: "0.68rem", color: "#cbd5e1", wordBreak: "break-all", background: "#0f172a", padding: "0.3rem", borderRadius: "4px", border: "1px solid #334155", marginTop: "0.2rem" }}>
                  {s.dataHash}
                </div>
              </div>
            </div>
          </div>

          {/* Blockchain Side */}
          <div style={{ background: "#1e293b", padding: "1rem", borderRadius: "8px", border: "1px solid #334155" }}>
            <h4 style={{ fontSize: "0.9rem", color: "#a855f7", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              ⛓️ Bằng Chứng Toàn Vẹn (Smart Contract)
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem" }}>
              <div>Evidence Version: <strong>v{checkResult?.blockchainVersion ?? "N/A"}</strong></div>
              <div>Action đã ghi: <strong>{checkResult?.blockchainAction || "N/A"}</strong></div>
              <div>Thời gian ghi block: <span style={{ color: "#94a3b8" }}>{checkResult?.blockchainTimestamp ? new Date(checkResult.blockchainTimestamp).toLocaleString() : "N/A"}</span></div>
              <div style={{ marginTop: "0.25rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Mã băm neo trên Blockchain (Data Hash):</div>
                <div className="mono" style={{ fontSize: "0.68rem", color: isMatch ? "#34d399" : "#f87171", wordBreak: "break-all", background: "#0f172a", padding: "0.3rem", borderRadius: "4px", border: `1px solid ${isMatch ? "#059669" : "#dc2626"}`, marginTop: "0.2rem" }}>
                  {checkResult?.blockchainHash || "Chưa tìm thấy Evidence trên Blockchain"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Record Key Proof info */}
        <div style={{ background: "#0f172a", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #334155", marginBottom: "1.5rem", fontSize: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8" }}>
              Định danh bất biến (recordKey = SHA256(studentId|courseCode|semester)):
            </span>
            <button
              className="btn btn-outline btn-sm"
              style={{ padding: "0.15rem 0.4rem", fontSize: "0.65rem" }}
              onClick={() => copyToClipboard(s.recordKey, "recordKey")}
            >
              {copiedKey === "recordKey" ? "✓ Đã copy" : "Copy"}
            </button>
          </div>
          <div className="mono" style={{ color: "#e2e8f0", wordBreak: "break-all", marginTop: "0.2rem" }}>
            {s.recordKey}
          </div>
        </div>

        {/* Version History Timeline (Append-Only) */}
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            📜 Lịch Sử Phiên Bản (Append-Only Evidence History)
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
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderLeft: `4px solid ${isHistValid ? "#10b981" : histCheck ? "#ef4444" : "#3b82f6"}`,
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>Version {v.version}</strong> ({v.action}) — Điểm:{" "}
                        <strong style={{ color: "#38bdf8" }}>{v.score}</strong>
                      </div>
                      <span className={`badge ${isHistValid ? "badge-valid" : histCheck ? "badge-invalid" : "badge-pending"}`} style={{ fontSize: "0.65rem" }}>
                        {isHistValid ? "✓ KHỚP BLOCKCHAIN" : histCheck ? "❌ SAI LỆCH" : "CHƯA KIỂM TRA"}
                      </span>
                    </div>

                    <div className="mono" style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.3rem" }}>
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
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Đang tải lịch sử version...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
