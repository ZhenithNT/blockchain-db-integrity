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
    if (!confirm(`Xác nhận xóa (Soft-delete) điểm môn ${score.courseCode} của sinh viên ${score.studentId}? Thao tác này sẽ neo sự kiện DELETE lên Blockchain!`)) {
      return;
    }

    setDeletingId(score.id);
    setMessage(null);
    try {
      const res = await api.deleteScore(score.id);
      setMessage(`✓ Đã soft-delete thành công! Tx: ${res.transactionHash}`);
      await loadScores();
    } catch (err: any) {
      setMessage(`Lỗi xóa: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Quản Lý Điểm Sinh Viên</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            Dữ liệu điểm được lưu trữ trong CSDL MySQL và neo mã băm toàn vẹn trên Blockchain
          </p>
        </div>

        {canEdit && (
          <button className="btn btn-primary" onClick={onAddScore}>
            ➕ Thêm Bản Ghi Điểm
          </button>
        )}
      </div>

      {message && (
        <div style={{ background: "#1e293b", border: "1px solid #3b82f6", color: "#93c5fd", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.875rem" }}>
          ℹ️ {message}
        </div>
      )}

      {/* Filters bar */}
      <div className="card" style={{ padding: "1rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 240px" }}>
            <input
              type="text"
              className="input-field"
              placeholder="🔍 Tìm theo Mã SV, Mã môn, Học kỳ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ width: "160px" }}>
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Chỉ bản ghi ACTIVE</option>
              <option value="DELETED">Đã xóa (DELETED)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-outline btn-sm">
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
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Mã SV</th>
              <th>Mã Môn</th>
              <th>Học Kỳ</th>
              <th>Điểm Số</th>
              <th>Version</th>
              <th>Trạng Thái</th>
              <th>Toàn Vẹn Blockchain</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                  Đang tải danh sách điểm...
                </td>
              </tr>
            ) : scores.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                  Không tìm thấy bản ghi điểm nào.
                </td>
              </tr>
            ) : (
              scores.map((sc) => {
                const latestCheck = sc.latestCheck;
                const result = latestCheck?.result || "PENDING";

                return (
                  <tr key={sc.id}>
                    <td>#{sc.id}</td>
                    <td><strong style={{ color: "#38bdf8" }}>{sc.studentId}</strong></td>
                    <td>{sc.courseCode}</td>
                    <td>{sc.semester}</td>
                    <td>
                      <span style={{ fontSize: "1.1rem", fontWeight: 700, color: Number(sc.score) >= 5 ? "#10b981" : "#ef4444" }}>
                        {sc.score}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: "#1e293b", color: "#94a3b8" }}>
                        v{sc.version}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${sc.status === "ACTIVE" ? "badge-valid" : "badge-invalid"}`}>
                        {sc.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${result === "VALID" ? "badge-valid" : result === "INVALID" ? "badge-invalid" : "badge-pending"}`}>
                        {result === "VALID" ? "✓ VALID" : result === "INVALID" ? "❌ INVALID" : "⏳ " + result}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => onViewDetail(sc)}
                          title="Xem đối chiếu chi tiết CSDL vs Blockchain"
                        >
                          👁️ Chi tiết
                        </button>

                        <button
                          className="btn btn-sm btn-primary"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => handleCheckSingle(sc)}
                          disabled={checkingId === sc.id}
                          title="Chạy đối chiếu hash với Smart Contract ngay"
                        >
                          {checkingId === sc.id ? "⏳" : "🔍 Kiểm tra"}
                        </button>

                        {canEdit && sc.status === "ACTIVE" && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => onEditScore(sc)}
                            title="Cập nhật điểm mới (tạo version mới)"
                          >
                            ✏️ Sửa
                          </button>
                        )}

                        {canEdit && sc.status === "ACTIVE" && (
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ padding: "0.25rem 0.5rem" }}
                            onClick={() => handleDelete(sc)}
                            disabled={deletingId === sc.id}
                            title="Soft delete (neo DELETE lên chain)"
                          >
                            🗑️
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
  );
};
