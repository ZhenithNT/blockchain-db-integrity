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
              <span>NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.25rem" }}>
              Theo dõi và lưu vết các thao tác thay đổi dữ liệu trên hệ thống đào tạo.
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadLogs} disabled={loading}>
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        {/* Filter bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="text"
            className="ptit-input"
            style={{ flex: 1, minWidth: "220px", fontSize: "0.82rem" }}
            placeholder="Tìm kiếm theo người thực hiện, đối tượng tác động..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="ptit-select"
            style={{ width: "220px", fontSize: "0.82rem" }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">Tất cả thao tác</option>
            <option value="CREATE_SCORE">Thêm mới điểm</option>
            <option value="UPDATE_SCORE">Cập nhật điểm</option>
            <option value="DELETE_SCORE">Xóa điểm</option>
            <option value="RESTORE_DATABASE">Khôi phục điểm</option>
            <option value="APPROVE_OFFERING">Duyệt bảng điểm</option>
          </select>
          <button type="submit" className="btn btn-primary btn-sm">
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="ptit-card">
        <div className="ptit-card-header">
          <div className="ptit-card-title">
            <span>DANH SÁCH NHẬT KÝ HOẠT ĐỘNG ({total} bản ghi)</span>
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
              color: "#64748b",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px dashed #cbd5e1",
            }}
          >
            <strong style={{ fontSize: "0.95rem" }}>Chưa có bản ghi nhật ký nào.</strong>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.35rem" }}>
              Hệ thống chưa ghi nhận thao tác phù hợp với điều kiện tìm kiếm hiện tại.
            </p>
          </div>
        ) : (
          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>ID</th>
                  <th style={{ width: "160px" }}>Thời gian</th>
                  <th style={{ width: "140px" }}>Người thực hiện</th>
                  <th style={{ width: "140px", textAlign: "center" }}>Thao tác</th>
                  <th style={{ width: "140px" }}>Đối tượng</th>
                  <th>Dữ liệu trước thay đổi</th>
                  <th>Dữ liệu sau thay đổi</th>
                  <th style={{ width: "110px" }}>Địa chỉ IP</th>
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
