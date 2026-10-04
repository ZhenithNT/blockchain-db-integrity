import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { Score, User } from "../types";

interface ScoreListViewProps {
  user: User | null;
  onViewDetail: (score: Score) => void;
  onAddScore: () => void;
  onEditScore: (score: Score) => void;
}

export const ScoreListView: React.FC<ScoreListViewProps> = ({
  user,
  onViewDetail,
  onAddScore,
  onEditScore,
}) => {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canEdit = user?.role === "ADMIN" || user?.role === "LECTURER";

  const loadScores = async () => {
    try {
      const list = await api.getScores({
        search: search || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        semester: semesterFilter || undefined,
      });
      setScores(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, [statusFilter, semesterFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadScores();
  };

  const handleCheckSingle = async (score: Score) => {
    setCheckingId(score.id);
    setMessage(null);
    try {
      const res = await api.checkIntegrity(score.id);
      setMessage(`[${score.studentId}] Kết quả: ${res.result} - ${res.message}`);
      await loadScores();
    } catch (err: any) {
      setMessage(`Lỗi kiểm tra: ${err.message}`);
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async (score: Score) => {
    if (!confirm(`Xác nhận xóa điểm môn ${score.courseCode} của sinh viên ${score.studentId}?`)) {
      return;
    }

    setDeletingId(score.id);
    setMessage(null);
    try {
      await api.deleteScore(score.id);
      setMessage(`Đã xóa điểm môn ${score.courseCode} của sinh viên ${score.studentId}.`);
      await loadScores();
    } catch (err: any) {
      setMessage(`Không thể xóa: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700 }}>Quản lý điểm sinh viên</h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
            Danh sách điểm học phần đã ghi nhận trong hệ thống đào tạo
          </p>
        </div>

        {canEdit && (
          <button className="btn btn-primary" onClick={onAddScore}>
            ➕ Thêm điểm
          </button>
        )}
      </div>

      {message && (
        <div
          style={{
            background:
              message.includes("VALID") || message.includes("Hợp lệ")
                ? "var(--valid-bg)"
                : message.includes("INVALID") || message.includes("Sai lệch") || message.includes("Lỗi")
                ? "var(--invalid-bg)"
                : "var(--info-bg)",
            border: `1px solid ${
              message.includes("VALID") || message.includes("Hợp lệ")
                ? "var(--valid-border)"
                : message.includes("INVALID") || message.includes("Sai lệch") || message.includes("Lỗi")
                ? "var(--invalid-border)"
                : "var(--info-border)"
            }`,
            color:
              message.includes("VALID") || message.includes("Hợp lệ")
                ? "var(--valid)"
                : message.includes("INVALID") || message.includes("Sai lệch") || message.includes("Lỗi")
                ? "var(--invalid)"
                : "var(--info)",
            padding: "0.85rem 1rem",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          {message.includes("VALID") || message.includes("Hợp lệ")
            ? "✓ "
            : message.includes("INVALID") || message.includes("Sai lệch") || message.includes("Lỗi")
            ? "⚠️ "
            : "ℹ️ "}
          {message}
        </div>
      )}

      {/* Filters bar */}
      <div className="ptit-card" style={{ padding: "1rem", marginBottom: 0 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 240px" }}>
            <input
              type="text"
              className="ptit-input"
              placeholder="Tìm theo Mã SV, Mã môn, Học kỳ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ width: "180px" }}>
            <select
              className="ptit-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang dùng (ACTIVE)</option>
              <option value="DELETED">Đã xóa (DELETED)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            Tìm kiếm
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
              setSemesterFilter("");
              loadScores();
            }}
          >
            Làm mới
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="ptit-card">
        <div className="ptit-table-container">
          <table className="ptit-table">
            <thead>
              <tr>
                <th style={{ width: "50px", textAlign: "center" }}>STT</th>
                <th>Mã sinh viên</th>
                <th>Mã môn</th>
                <th>Học kỳ</th>
                <th style={{ textAlign: "center" }}>Điểm</th>
                <th style={{ textAlign: "center" }}>Lần sửa</th>
                <th style={{ textAlign: "center" }}>Trạng thái</th>
                <th style={{ textAlign: "center" }}>Tính toàn vẹn</th>
                <th style={{ textAlign: "center", width: "220px" }}>Thao tác</th>
              </tr>
            </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                  Đang tải danh sách điểm...
                </td>
              </tr>
            ) : scores.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                  Chưa có điểm nào.
                </td>
              </tr>
            ) : (
              scores.map((sc, idx) => {
                const latestCheck = sc.latestCheck;
                const result = latestCheck?.result || "PENDING";

                return (
                  <tr key={sc.id}>
                    <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                    <td><strong style={{ color: "var(--primary-ptit)" }}>{sc.studentId}</strong></td>
                    <td>{sc.courseCode}</td>
                    <td>{sc.semester}</td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "1.05rem", fontWeight: 700, color: Number(sc.score) >= 5 ? "#059669" : "#dc2626" }}>
                        {sc.score}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge" style={{ background: "#f1f5f9", color: "#475569" }}>
                        v{sc.version}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${sc.status === "ACTIVE" ? "badge-valid" : "badge-invalid"}`}>
                        {sc.status === "ACTIVE" ? "Đang dùng" : "Đã xóa"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${result === "VALID" ? "badge-valid" : result === "INVALID" ? "badge-invalid" : "badge-pending"}`}>
                        {result === "VALID" ? "Hợp lệ" : result === "INVALID" ? "Sai lệch" : "Chờ kiểm tra"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => onViewDetail(sc)}
                          title="Xem chi tiết điểm"
                        >
                          Chi tiết
                        </button>

                        <button
                          className="btn btn-sm btn-primary"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => handleCheckSingle(sc)}
                          disabled={checkingId === sc.id}
                          title="Kiểm tra đối soát tính toàn vẹn"
                        >
                          {checkingId === sc.id ? "..." : "Kiểm tra"}
                        </button>

                        {canEdit && sc.status === "ACTIVE" && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => onEditScore(sc)}
                            title="Chỉnh sửa điểm"
                          >
                            Sửa
                          </button>
                        )}

                        {canEdit && sc.status === "ACTIVE" && (
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ padding: "0.25rem 0.5rem" }}
                            onClick={() => handleDelete(sc)}
                            disabled={deletingId === sc.id}
                            title="Xóa điểm"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
};
