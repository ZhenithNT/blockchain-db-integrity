import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { IntegrityCheckDetail, StudentScoreRow } from "../types";

interface EvidenceModalProps {
  score: StudentScoreRow;
  courseCode: string;
  semesterCode: string;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  score,
  courseCode,
  semesterCode,
  onClose,
}) => {
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<IntegrityCheckDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunVerify = async () => {
    if (!score.scoreId) return;
    setChecking(true);
    setError(null);
    try {
      const res = await api.checkIntegrity(score.scoreId);
      setCheckResult(res);
    } catch (err: any) {
      setError(err.message || "Kiểm tra toàn vẹn thất bại.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (score.scoreId) {
      handleRunVerify();
    }
  }, [score.scoreId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h3 style={{ color: "var(--primary-ptit)", fontSize: "1.05rem" }}>
              Chi tiết xác thực toàn vẹn dữ liệu
            </h3>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕ Đóng
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Student & Course Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.75rem",
              background: "#f8fafc",
              padding: "0.85rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "0.82rem",
            }}
          >
            <div>
              <span style={{ color: "#64748b" }}>Sinh viên:</span>
              <div style={{ fontWeight: 700, color: "#1e293b" }}>{score.fullName} ({score.studentCode})</div>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Môn học / Kỳ:</span>
              <div style={{ fontWeight: 700, color: "#1e293b" }}>{courseCode} ({semesterCode})</div>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Điểm tổng kết:</span>
              <div style={{ fontWeight: 800, color: "var(--primary-ptit)", fontSize: "1rem" }}>
                {score.score} (Điểm chữ: {score.letterScore || "N/A"})
              </div>
            </div>
          </div>

          {/* Cryptographic Hashes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
                Mã định danh bản ghi (Record Key):
              </label>
              <div
                className="mono"
                style={{
                  background: "#f1f5f9",
                  padding: "0.45rem 0.65rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  wordBreak: "break-all",
                  border: "1px solid #cbd5e1",
                }}
              >
                {score.recordKey || "Chưa khởi tạo"}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
                Mã băm dữ liệu (Data Hash):
              </label>
              <div
                className="mono"
                style={{
                  background: "#f1f5f9",
                  padding: "0.45rem 0.65rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  wordBreak: "break-all",
                  border: "1px solid #cbd5e1",
                }}
              >
                {score.dataHash || "Chưa có băm"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
                  Trạng thái xác thực:
                </label>
                <div style={{ marginTop: "0.2rem" }}>
                  <span
                    className={`badge ${
                      score.blockchainStatus === "CONFIRMED"
                        ? "badge-valid"
                        : score.blockchainStatus === "FAILED"
                        ? "badge-invalid"
                        : "badge-pending"
                    }`}
                  >
                    {score.blockchainStatus === "CONFIRMED" ? "Đã xác thực" : score.blockchainStatus || "Chờ xác thực"}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
                  Phiên bản dữ liệu:
                </label>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", marginTop: "0.2rem" }}>
                  Phiên bản {score.version || 1}
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
                Mã giao dịch xác thực (Transaction Hash):
              </label>
              <div
                className="mono"
                style={{
                  background: "#f8fafc",
                  padding: "0.45rem 0.65rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  wordBreak: "break-all",
                  border: "1px solid #e2e8f0",
                  color: "#0284c7",
                }}
              >
                {score.latestTxHash || "Chưa có giao dịch"}
              </div>
            </div>
          </div>

          {/* Real-time Verification Section */}
          <div
            style={{
              borderTop: "1px dashed #cbd5e1",
              paddingTop: "0.85rem",
              marginTop: "0.4rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                Đối soát trực tiếp dữ liệu:
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleRunVerify}
                disabled={checking || !score.scoreId}
              >
                {checking ? "Đang kiểm tra..." : "Kiểm tra ngay"}
              </button>
            </div>

            {error && (
              <div style={{ background: "var(--invalid-bg)", color: "var(--invalid)", padding: "0.6rem", borderRadius: "6px", fontSize: "0.8rem" }}>
                {error}
              </div>
            )}

            {checkResult && (
              <div
                style={{
                  background: checkResult.result === "VALID" ? "var(--valid-bg)" : "var(--invalid-bg)",
                  border: `1px solid ${checkResult.result === "VALID" ? "var(--valid-border)" : "var(--invalid-border)"}`,
                  padding: "0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <strong style={{ color: checkResult.result === "VALID" ? "var(--valid)" : "var(--invalid)" }}>
                    KẾT QUẢ KIỂM TRA: {checkResult.result === "VALID" ? "HỢP LỆ" : "SAI LỆCH"}
                  </strong>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{checkResult.checkedAt}</span>
                </div>
                <div style={{ color: "#334155", marginBottom: "0.4rem" }}>{checkResult.message}</div>
                {checkResult.historyChecks && (
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Đã kiểm tra qua {checkResult.historyChecks.length} phiên bản lịch sử.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
