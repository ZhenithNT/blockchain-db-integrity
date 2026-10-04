import React, { useEffect, useState } from "react";
import { api } from "../api";
import { AuditLogItem } from "../types";

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        search: search.trim() || undefined,
        action: actionFilter || undefined,
        limit: 100,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: any) {
      console.error("Lỗi tải audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes("CREATE")) return "badge-valid";
    if (action.includes("UPDATE")) return "badge-pending";
    if (action.includes("DELETE")) return "badge-invalid";
    if (action.includes("RESTORE")) return "badge-valid";
    if (action.includes("APPROVE")) return "badge-valid";
    return "badge-pending";
  };

  const formatJson = (data: string | null) => {
    if (!data) return "-";
    try {
      const parsed = JSON.parse(data);
      if (parsed.score !== undefined) {
        return `Điểm: ${parsed.score}${parsed.version ? ` (v${parsed.version})` : ""}`;
      }
      return JSON.stringify(parsed);
    } catch {
      return data;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div className="ptit-card">
        <div className="ptit-card-header" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="ptit-card-title">
              <span>📜</span>
              <span>NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOGS TRONG MYSQL)</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.25rem" }}>
              Lưu vết toàn bộ thao tác do ứng dụng Backend ghi nhận vào bảng <code>audit_logs</code>.
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadLogs} disabled={loading}>
            {loading ? "⏳ Đang tải..." : "🔄 Làm mới nhật ký"}
          </button>
        </div>

        {/* Audit Explanation Callout */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderLeft: "4px solid #16a34a",
            padding: "0.85rem 1rem",
            borderRadius: "6px",
            fontSize: "0.82rem",
            color: "#166534",
            lineHeight: 1.5,
          }}
        >
          <strong>💡 Cơ chế hoạt động & Đánh giá an ninh:</strong>
          <ul style={{ margin: "0.4rem 0 0 1.2rem", padding: 0 }}>
            <li>
              <strong>Khả năng:</strong> Ghi nhận chi tiết <em>Ai làm (Actor)</em>, <em>Làm gì (Action)</em>, <em>Thời gian</em>, <em>Dữ liệu trước/sau (Before/After)</em> và <em>Địa chỉ IP</em> khi người dùng thao tác qua ứng dụng.
            </li>
            <li>
              <strong>Hạn chế cốt tử:</strong> Nhật ký này được ghi bởi <strong>Backend</strong> và lưu trong <strong>MySQL</strong>. Nếu kẻ tấn công hoặc DBA có quyền truy cập trực tiếp MySQL (qua Workbench/phpMyAdmin), họ có thể <u>bỏ qua ứng dụng để sửa điểm (log không hề hay biết)</u> hoặc <u>xóa sạch bảng audit_logs này</u> để phi tang dấu vết!
            </li>
          </ul>
        </div>

        {/* Filter bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <input
            type="text"
            className="ptit-input"
            style={{ flex: 1, minWidth: "220px", fontSize: "0.82rem" }}
            placeholder="Tìm kiếm theo Người thao tác (Actor), Đối tượng (Target)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="ptit-select"
            style={{ width: "200px", fontSize: "0.82rem" }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">-- Tất cả hành động --</option>
            <option value="CREATE_SCORE">Tạo điểm mới (CREATE_SCORE)</option>
            <option value="UPDATE_SCORE">Cập nhật điểm (UPDATE_SCORE)</option>
            <option value="DELETE_SCORE">Xóa điểm (DELETE_SCORE)</option>
            <option value="RESTORE_DATABASE">Khôi phục điểm (RESTORE_DATABASE)</option>
            <option value="APPROVE_OFFERING">Duyệt bảng điểm (APPROVE_OFFERING)</option>
          </select>
          <button type="submit" className="btn btn-primary btn-sm">
            🔍 Tìm kiếm
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="ptit-card">
        <div className="ptit-card-header">
          <div className="ptit-card-title">
            <span>📋</span>
            <span>DANH SÁCH BẢN GHI NHẬT KÝ KIỂM TOÁN ({total} bản ghi)</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
            Đang tải dữ liệu nhật ký...
          </div>
        ) : logs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2.5rem",
              color: "#991b1b",
              background: "#fef2f2",
              borderRadius: "8px",
              border: "1px dashed #f87171",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⚠️</div>
            <strong style={{ fontSize: "0.95rem" }}>Bảng audit_logs hiện đang trống hoặc đã bị xóa sạch!</strong>
            <p style={{ fontSize: "0.82rem", color: "#475569", marginTop: "0.35rem" }}>
              Nếu vừa thực hiện xóa dấu vết trong MySQL, nhật ký đã bị phi tang hoàn toàn.
              <br />
              👉 Chuyển sang mục <strong>🔍 Kiểm tra toàn vẹn CSDL</strong>: Bằng chứng trên Blockchain vẫn tồn tại độc lập để đối chiếu!
            </p>
          </div>
        ) : (
          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>ID</th>
                  <th style={{ width: "160px" }}>Thời gian</th>
                  <th style={{ width: "130px" }}>Người thao tác (Actor)</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Hành động (Action)</th>
                  <th style={{ width: "140px" }}>Đối tượng (Target)</th>
                  <th>Dữ liệu Trước (Before)</th>
                  <th>Dữ liệu Sau (After)</th>
                  <th style={{ width: "100px" }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ textAlign: "center", color: "#64748b", fontSize: "0.78rem" }}>
                      #{log.id}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "#475569" }}>
                      {new Date(log.timestamp).toLocaleString("vi-VN")}
                    </td>
                    <td>
                      <strong style={{ color: "var(--primary-ptit)" }}>{log.actor}</strong>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${getActionBadgeClass(log.action)}`} style={{ fontSize: "0.72rem" }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: "0.78rem" }}>
                      {log.target}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {formatJson(log.beforeData)}
                    </td>
                    <td style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1e293b" }}>
                      {formatJson(log.afterData)}
                    </td>
                    <td className="mono" style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {log.ip || "127.0.0.1"}
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
