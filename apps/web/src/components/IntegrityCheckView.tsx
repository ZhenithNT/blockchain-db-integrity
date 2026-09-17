import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { IntegrityCheckDetail } from "../types";

export const IntegrityCheckView: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<IntegrityCheckDetail[]>([]);
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
      await loadHistory();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Top Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Trung Tâm Kiểm Tra Toàn Vẹn CSDL</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            Đối soát toàn bộ dữ liệu MySQL bằng cách tính lại SHA-256 độc lập và so sánh với Evidence trên Smart Contract
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ padding: "0.75rem 1.5rem", fontSize: "0.95rem" }}
          onClick={handleRunCheckAll}
          disabled={running}
        >
          {running ? "⏳ Đang quét đối soát..." : "🚀 Chạy Kiểm Tra Toàn Bộ CSDL"}
        </button>
      </div>

      {/* Summary Box if run */}
      {summary && (
        <div className="card" style={{ background: summary.invalid > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)", border: `1px solid ${summary.invalid > 0 ? "#ef4444" : "#10b981"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: summary.invalid > 0 ? "#f87171" : "#34d399" }}>
                {summary.invalid > 0 ? "🚨 PHÁT HIỆN DỮ LIỆU BỊ CAN THIỆP GIẢ MẠO!" : "✨ TẤT CẢ DỮ LIỆU ĐỀU TOÀN VẸN VÀ KHỚP 100% VỚI BLOCKCHAIN"}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "0.25rem" }}>
                Tổng số bản ghi: <strong>{summary.total}</strong> | Hợp lệ: <strong style={{ color: "#34d399" }}>{summary.valid}</strong> | Giả mạo: <strong style={{ color: "#f87171" }}>{summary.invalid}</strong> | Chờ: <strong style={{ color: "#fbbf24" }}>{summary.pending}</strong>
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span className="badge badge-valid">VALID: {summary.valid}</span>
              <span className="badge badge-invalid">INVALID: {summary.invalid}</span>
            </div>
          </div>
        </div>
      )}

      {/* Fresh Run Results */}
      {results.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>
            📋 Kết Quả Đối Soát Mới Nhất ({results.length} bản ghi)
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {results.map((r) => {
              const isOk = r.result === "VALID";

              return (
                <div
                  key={r.scoreId}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderLeft: `5px solid ${isOk ? "#10b981" : "#ef4444"}`,
                    borderRadius: "8px",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <strong style={{ fontSize: "1rem", color: "#f8fafc" }}>
                        {r.studentId}
                      </strong>{" "}
                      — Môn: <strong>{r.courseCode}</strong> | Học kỳ: <strong>{r.semester}</strong> | Điểm CSDL: <strong style={{ color: "#38bdf8" }}>{r.databaseScore}</strong> (v{r.databaseVersion})
                    </div>
                    <span className={`badge ${isOk ? "badge-valid" : "badge-invalid"}`}>
                      {r.result} {r.reason ? `(${r.reason})` : ""}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.85rem", color: isOk ? "#a7f3d0" : "#fca5a5", marginTop: "0.4rem" }}>
                    {r.message}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem", fontSize: "0.75rem" }}>
                    <div style={{ background: "#0f172a", padding: "0.5rem", borderRadius: "6px", border: "1px solid #334155" }}>
                      <span style={{ color: "#94a3b8" }}>Database Hash (Tính từ MySQL):</span>
                      <div className="mono" style={{ color: "#e2e8f0", wordBreak: "break-all", marginTop: "0.15rem" }}>
                        {r.databaseHash}
                      </div>
                    </div>

                    <div style={{ background: "#0f172a", padding: "0.5rem", borderRadius: "6px", border: "1px solid #334155" }}>
                      <span style={{ color: "#94a3b8" }}>Blockchain Hash (Lấy từ Evidence):</span>
                      <div className="mono" style={{ color: isOk ? "#34d399" : "#f87171", wordBreak: "break-all", marginTop: "0.15rem" }}>
                        {r.blockchainHash || "Không có bằng chứng trên chain"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History of Previous Checks */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>
            🕒 Lịch Sử Các Lần Kiểm Tra Trước (Bảng integrity_checks)
          </h3>
          <button className="btn btn-outline btn-sm" onClick={loadHistory}>
            Làm mới lịch sử
          </button>
        </div>

        {loadingHistory ? (
          <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>Đang tải lịch sử...</div>
        ) : recentChecks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>Chưa có lần kiểm tra nào được ghi nhận. Hãy bấm nút chạy kiểm tra ở trên.</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Thời Gian</th>
                  <th>Sinh Viên</th>
                  <th>Môn Học</th>
                  <th>Điểm</th>
                  <th>Hash CSDL</th>
                  <th>Hash Blockchain</th>
                  <th>Kết Quả</th>
                </tr>
              </thead>
              <tbody>
                {recentChecks.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      {new Date(c.checkedAt).toLocaleString()}
                    </td>
                    <td><strong>{c.studentId}</strong></td>
                    <td>{c.courseCode}</td>
                    <td><strong>{c.score}</strong></td>
                    <td className="mono" style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                      {c.databaseHash ? `${c.databaseHash.slice(0, 10)}...` : "N/A"}
                    </td>
                    <td className="mono" style={{ fontSize: "0.7rem", color: c.result === "VALID" ? "#34d399" : "#f87171" }}>
                      {c.blockchainHash ? `${c.blockchainHash.slice(0, 10)}...` : "N/A"}
                    </td>
                    <td>
                      <span className={`badge ${c.result === "VALID" ? "badge-valid" : c.result === "INVALID" ? "badge-invalid" : "badge-pending"}`} style={{ fontSize: "0.65rem" }}>
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
