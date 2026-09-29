import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { IntegrityCheckDetail, MissingRecordItem } from "../types";

export const IntegrityCheckView: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<IntegrityCheckDetail[]>([]);
  const [missingRecords, setMissingRecords] = useState<MissingRecordItem[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
    pending: number;
    error: number;
  } | null>(null);
  const [recentChecks, setRecentChecks] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    try {
      const hist = await api.getRecentIntegrityResults(15);
      setRecentChecks(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRunCheckAll = async () => {
    setRunning(true);
    try {
      const res = await api.checkAllIntegrity();
      setSummary({
        total: res.total,
        valid: res.valid,
        invalid: res.invalid,
        pending: res.pending,
        error: res.error,
      });
      setResults(res.results);
      setMissingRecords(res.missingInDb || []);
      await loadHistory();
    } catch (err: any) {
      alert(`Lỗi kiểm tra toàn vẹn: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Banner */}
      <div className="ptit-card">
        <div className="ptit-card-header">
          <div>
            <div className="ptit-card-title">
              <span>🔍</span>
              <span>TRUNG TÂM KIỂM ĐỊNH TOÀN VẸN CƠ SỞ DỮ LIỆU & BLOCKCHAIN</span>
            </div>
            <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: "0.25rem" }}>
              Cơ chế kiểm định đa tầng: Tính lại băm SHA-256 động từ MySQL • So khớp với Evidence trên Smart Contract • Quét ngược tìm bản ghi bị xóa vật lý
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.9rem" }}
            onClick={handleRunCheckAll}
            disabled={running}
          >
            {running ? "⏳ Đang quét toàn diện..." : "🚀 Chạy Kiểm Tra Toàn Bộ CSDL"}
          </button>
        </div>

        {/* Summary Card */}
        {summary && (
          <div
            style={{
              background: summary.invalid > 0 || missingRecords.length > 0 ? "var(--invalid-bg)" : "var(--valid-bg)",
              border: `1px solid ${summary.invalid > 0 || missingRecords.length > 0 ? "var(--invalid-border)" : "var(--valid-border)"}`,
              borderRadius: "8px",
              padding: "1rem",
              marginTop: "0.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: summary.invalid > 0 || missingRecords.length > 0 ? "var(--invalid)" : "var(--valid)" }}>
                  {summary.invalid > 0 || missingRecords.length > 0
                    ? "🚨 PHÁT HIỆN DỮ LIỆU BỊ XÂM PHẠM HOẶC KHÔNG KHỚP VỚI BLOCKCHAIN!"
                    : "✨ TOÀN VẸN 100%: TẤT CẢ DỮ LIỆU ĐỀU KHỚP VỚI BẰNG CHỨNG ON-CHAIN"}
                </h3>
                <div style={{ fontSize: "0.82rem", color: "#334155", marginTop: "0.2rem" }}>
                  Tổng số bản ghi: <strong>{summary.total}</strong> | Hợp lệ: <strong style={{ color: "var(--valid)" }}>{summary.valid}</strong> | Bị sửa đổi/Lỗi: <strong style={{ color: "var(--invalid)" }}>{summary.invalid}</strong> | Bị xóa vật lý trong MySQL: <strong style={{ color: "var(--invalid)" }}>{missingRecords.length}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.4rem" }}>
                <span className="badge badge-valid">VALID: {summary.valid}</span>
                <span className="badge badge-invalid">INVALID: {summary.invalid}</span>
                {missingRecords.length > 0 && (
                  <span className="badge badge-invalid">MISSING IN DB: {missingRecords.length}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Missing In Database Alert (Reverse Scan Result) */}
      {missingRecords.length > 0 && (
        <div className="ptit-card" style={{ borderLeft: "5px solid var(--invalid)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--invalid)", fontWeight: 700, marginBottom: "0.5rem" }}>
            <span>⚠️</span>
            <span>PHÁT HIỆN BẢN GHI ĐÃ TỒN TẠI TRÊN BLOCKCHAIN NHƯNG BỊ XÓA MẤT KHỎI MYSQL (PHYSICAL DELETION)</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "#475569", marginBottom: "0.75rem" }}>
            Kẻ tấn công có quyền root DB đã xóa trực tiếp hàng trong bảng <code>scores</code>. Cơ chế đối soát ngược từ hàm <code>getAllRecordKeys()</code> của Smart Contract đã phát hiện:
          </p>

          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th>Record Key trên Blockchain</th>
                  <th>Phiên bản on-chain</th>
                  <th>Hash trên Blockchain</th>
                  <th>Hành động cuối</th>
                  <th>Chẩn đoán</th>
                </tr>
              </thead>
              <tbody>
                {missingRecords.map((m, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: "0.75rem" }}>{m.recordKey}</td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>Version {m.blockchainVersion}</td>
                    <td className="mono" style={{ fontSize: "0.75rem", color: "var(--invalid)" }}>{m.blockchainHash}</td>
                    <td><span className="badge badge-pending">{m.blockchainAction}</span></td>
                    <td style={{ color: "var(--invalid)", fontWeight: 600, fontSize: "0.8rem" }}>{m.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fresh Run Detailed Results */}
      {results.length > 0 && (
        <div className="ptit-card">
          <div className="ptit-card-header">
            <div className="ptit-card-title">
              <span>📋</span>
              <span>KẾT QUẢ ĐỐI SOÁT CHI TIẾT THEO TỪNG BẢN GHI ({results.length} bản ghi)</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {results.map((r) => {
              const isOk = r.result === "VALID";

              return (
                <div
                  key={r.scoreId}
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--border-light)",
                    borderLeft: `5px solid ${isOk ? "var(--valid)" : "var(--invalid)"}`,
                    borderRadius: "8px",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <strong style={{ fontSize: "0.95rem", color: "var(--primary-ptit)" }}>
                        {r.studentId}
                      </strong>{" "}
                      — Môn: <strong>{r.courseCode}</strong> | Kỳ: <strong>{r.semester}</strong> | Điểm CSDL: <strong>{r.databaseScore}</strong> (Version {r.databaseVersion})
                    </div>
                    <span className={`badge ${isOk ? "badge-valid" : "badge-invalid"}`}>
                      {r.result} {r.reason ? `(${r.reason})` : ""}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.82rem", color: isOk ? "#065f46" : "#991b1b", marginTop: "0.35rem", fontWeight: 500 }}>
                    {r.message}
                  </div>

                  {/* Hash Comparison Box */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.65rem", fontSize: "0.75rem" }}>
                    <div style={{ background: "#f8fafc", padding: "0.5rem 0.65rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <span style={{ color: "#64748b", fontWeight: 600 }}>Database Hash (Tính lại từ các cột trong MySQL):</span>
                      <div className="mono" style={{ color: "#1e293b", wordBreak: "break-all", marginTop: "0.15rem" }}>
                        {r.databaseHash}
                      </div>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "0.5rem 0.65rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <span style={{ color: "#64748b", fontWeight: 600 }}>Blockchain Hash (Lấy từ Smart Contract):</span>
                      <div className="mono" style={{ color: isOk ? "var(--valid)" : "var(--invalid)", wordBreak: "break-all", marginTop: "0.15rem", fontWeight: 700 }}>
                        {r.blockchainHash || "Chưa có bằng chứng trên Blockchain"}
                      </div>
                    </div>
                  </div>

                  {/* History Checks Chain */}
                  {r.historyChecks && r.historyChecks.length > 0 && (
                    <div style={{ marginTop: "0.65rem", paddingTop: "0.65rem", borderTop: "1px dashed #e2e8f0", fontSize: "0.78rem" }}>
                      <div style={{ fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                        Chuỗi xác thực các phiên bản lịch sử (Level 2 Deep Check):
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {r.historyChecks.map((h) => (
                          <span
                            key={h.version}
                            className={`badge ${h.matches ? "badge-valid" : "badge-invalid"}`}
                            style={{ fontSize: "0.72rem" }}
                            title={`DB Hash: ${h.databaseHash}\nChain Hash: ${h.blockchainHash || "N/A"}`}
                          >
                            v{h.version}: {h.matches ? "KHỚP" : "GIẢ MẠO"} ({h.databaseAction})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History of Previous Checks */}
      <div className="ptit-card">
        <div className="ptit-card-header">
          <div className="ptit-card-title">
            <span>🕒</span>
            <span>NHẬT KÝ ĐỐI SOÁT CƠ SỞ DỮ LIỆU (BẢNG INTEGRITY_CHECKS)</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadHistory}>
            Làm mới nhật ký
          </button>
        </div>

        {loadingHistory ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Đang tải nhật ký...</div>
        ) : recentChecks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontStyle: "italic" }}>
            Chưa có lần kiểm tra nào được lưu trữ.
          </div>
        ) : (
          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th>Thời gian kiểm</th>
                  <th>Sinh viên</th>
                  <th>Môn học</th>
                  <th>Điểm</th>
                  <th>Hash CSDL</th>
                  <th>Hash Blockchain</th>
                  <th style={{ textAlign: "center" }}>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {recentChecks.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {new Date(c.checkedAt).toLocaleString("vi-VN")}
                    </td>
                    <td><strong>{c.studentId}</strong></td>
                    <td>{c.courseCode}</td>
                    <td><strong style={{ color: "var(--primary-ptit)" }}>{c.score}</strong></td>
                    <td className="mono" style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      {c.databaseHash ? `${c.databaseHash.slice(0, 12)}...` : "N/A"}
                    </td>
                    <td className="mono" style={{ fontSize: "0.72rem", color: c.result === "VALID" ? "var(--valid)" : "var(--invalid)" }}>
                      {c.blockchainHash ? `${c.blockchainHash.slice(0, 12)}...` : "N/A"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        className={`badge ${c.result === "VALID" ? "badge-valid" : "badge-invalid"}`}
                      >
                        {c.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
