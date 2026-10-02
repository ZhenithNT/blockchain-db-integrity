import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { DashboardData } from "../types";

interface DashboardViewProps {
  onNavigateToScores: () => void;
  onNavigateToIntegrity: () => void;
  onNavigateToDemo: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToScores,
  onNavigateToIntegrity,
  onNavigateToDemo,
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAll, setCheckingAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [dash, hl] = await Promise.all([
        api.getDashboard(),
        api.getHealth(),
      ]);
      setData(dash);
      setHealth(hl);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckAll = async () => {
    setCheckingAll(true);
    setMessage(null);
    try {
      const res = await api.checkAllIntegrity();
      setMessage(`Đã quét xong ${res.total} bản ghi: ${res.valid} HỢP LỆ, ${res.invalid} GIẢ MẠO, ${res.pending} CHỜ.`);
      await loadData();
    } catch (err: any) {
      setMessage(`Lỗi quét: ${err.message}`);
    } finally {
      setCheckingAll(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "3rem 0", textAlign: "center", color: "#94a3b8" }}>Đang tải dữ liệu tổng quan...</div>;
  }

  const summary = data?.summary || {
    totalScores: 0,
    validCount: 0,
    invalidCount: 0,
    pendingCount: 0,
    errorCount: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Top Banner & Health */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Bảng Điều Khiển Hệ Thống</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            Giám sát tính toàn vẹn thời gian thực giữa CSDL MySQL và Smart Contract IntegrityRegistry
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#1e293b", padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "0.75rem", border: "1px solid #334155" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: health?.database === "connected" ? "#10b981" : "#ef4444" }} />
            <span>MySQL: <strong>{health?.database || "..."}</strong></span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#1e293b", padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "0.75rem", border: "1px solid #334155" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: health?.blockchain === "connected" ? "#10b981" : "#ef4444" }} />
            <span>Hardhat EVM: <strong>{health?.blockchain || "..."}</strong></span>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleCheckAll}
            disabled={checkingAll}
          >
            {checkingAll ? "⏳ Đang quét..." : "🔍 Quét toàn bộ CSDL"}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ background: "#1e293b", border: "1px solid #3b82f6", color: "#93c5fd", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.875rem" }}>
          ℹ️ {message}
        </div>
      )}

      {/* 4 Primary Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {/* Total */}
        <div className="card" style={{ borderLeft: "4px solid #3b82f6", cursor: "pointer" }} onClick={onNavigateToScores}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Tổng Bản Ghi Điểm</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f8fafc", marginTop: "0.25rem" }}>{summary.totalScores}</div>
          <div style={{ fontSize: "0.75rem", color: "#60a5fa", marginTop: "0.3rem" }}>Xem danh sách chi tiết →</div>
        </div>

        {/* Valid */}
        <div className="card" style={{ borderLeft: "4px solid #10b981", background: "rgba(16, 185, 129, 0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#34d399", textTransform: "uppercase", fontWeight: 700 }}>Toàn Vẹn (VALID)</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981", marginTop: "0.25rem" }}>{summary.validCount}</div>
          <div style={{ fontSize: "0.75rem", color: "#34d399", marginTop: "0.3rem" }}>✓ Khớp 100% với Blockchain</div>
        </div>

        {/* Invalid */}
        <div className="card" style={{ borderLeft: "4px solid #ef4444", background: summary.invalidCount > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.03)" }}>
          <div style={{ fontSize: "0.75rem", color: "#f87171", textTransform: "uppercase", fontWeight: 700 }}>Giả Mạo (INVALID)</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#ef4444", marginTop: "0.25rem" }}>{summary.invalidCount}</div>
          <div style={{ fontSize: "0.75rem", color: summary.invalidCount > 0 ? "#fca5a5" : "#94a3b8", marginTop: "0.3rem" }}>
            {summary.invalidCount > 0 ? "🚨 Phát hiện sai lệch dữ liệu!" : "Không có vi phạm"}
          </div>
        </div>

        {/* Pending */}
        <div className="card" style={{ borderLeft: "4px solid #f59e0b", background: "rgba(245, 158, 11, 0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#fbbf24", textTransform: "uppercase", fontWeight: 700 }}>Chờ Quét (PENDING)</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f59e0b", marginTop: "0.25rem" }}>{summary.pendingCount}</div>
          <div style={{ fontSize: "0.75rem", color: "#fbbf24", marginTop: "0.3rem" }}>Cần chạy đối soát</div>
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions & Audit Logs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Recent Blockchain Transactions */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>⛓️ Giao Dịch Blockchain Gần Nhất</h3>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Hợp đồng IntegrityRegistry</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {data?.recentTransactions && data.recentTransactions.length > 0 ? (
              data.recentTransactions.map((tx) => (
                <div key={tx.id} style={{ background: "#1e293b", padding: "0.75rem", borderRadius: "8px", border: "1px solid #334155", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <span><strong>{tx.studentId}</strong> - Môn: {tx.courseCode}</span>
                    <span className={`badge ${tx.action === "CREATE" ? "badge-valid" : tx.action === "UPDATE" ? "badge-pending" : "badge-invalid"}`} style={{ fontSize: "0.65rem" }}>
                      {tx.action} (v{tx.version})
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: "0.7rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Tx: {tx.transactionHash}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#64748b", marginTop: "0.3rem" }}>
                    <span>Block #{tx.blockNumber || "..."}</span>
                    <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>Chưa có giao dịch nào được ghi.</div>
            )}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>📜 Nhật Ký Kiểm Toán (Audit Logs)</h3>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>MySQL audit_logs</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {data?.recentAuditLogs && data.recentAuditLogs.length > 0 ? (
              data.recentAuditLogs.map((log) => (
                <div key={log.id} style={{ background: "#1e293b", padding: "0.75rem", borderRadius: "8px", border: "1px solid #334155", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                    <span>Actor: <strong>{log.actor}</strong></span>
                    <span style={{ fontWeight: 600, color: log.action.includes("TAMPER") ? "#f87171" : "#38bdf8" }}>{log.action}</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Target: {log.target}</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.2rem" }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>Chưa có bản ghi nhật ký nào.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
