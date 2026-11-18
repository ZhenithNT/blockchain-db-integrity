import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { Score } from "../types";
import { REASON_LABEL, formatTime } from "./ui";

interface ScoreListViewProps {
  onViewDetail: (score: Score) => void;
  onAddScore: () => void;
  onEditScore: (score: Score) => void;
}

export const ScoreListView: React.FC<ScoreListViewProps> = ({ onViewDetail, onAddScore, onEditScore }) => {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    try {
      setScores(await api.getScores({ search: search || undefined }));
    } catch (err: any) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const checkOne = async (s: Score) => {
    setCheckingId(s.id);
    setMessage(null);
    try {
      const r = await api.checkIntegrity(s.id);
      setMessage({
        ok: r.result === "VALID",
        text: `${s.studentId} môn ${s.courseCode}: ${r.result === "VALID" ? "Hợp lệ" : r.message}`,
      });
      await load();
    } catch (err: any) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setCheckingId(null);
    }
  };

  const statusBadge = (s: Score) => {
    const c = s.latestCheck;
    if (!c) return <span className="badge badge-pending">Chưa kiểm tra</span>;
    if (c.result === "VALID") return <span className="badge badge-valid">Hợp lệ</span>;
    return (
      <span className="badge badge-invalid" title={c.reason ? REASON_LABEL[c.reason] : ""}>
        {c.reason ? REASON_LABEL[c.reason] || c.reason : "Sai lệch"}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700 }}>Quản lý điểm</h1>
          <p className="muted">Mỗi lần nhập hoặc sửa điểm được ký bằng ví của admin đang đăng nhập.</p>
        </div>
        <button className="btn btn-primary" onClick={onAddScore}>
          Thêm điểm
        </button>
      </div>

      {message && (
        <div className={`badge ${message.ok ? "badge-valid" : "badge-invalid"}`} style={{ whiteSpace: "normal", padding: "0.7rem 1rem" }}>
          {message.text}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        style={{ display: "flex", gap: "0.5rem", maxWidth: 420 }}
      >
        <input
          className="form-input"
          placeholder="Tìm theo mã sinh viên hoặc mã môn"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-outline" type="submit">
          Tìm
        </button>
      </form>

      <div className="ptit-card">
        <div className="ptit-table-container">
          <table className="ptit-table">
            <thead>
              <tr>
                <th>Sinh viên</th>
                <th>Môn</th>
                <th>Học kỳ</th>
                <th style={{ textAlign: "center" }}>Điểm</th>
                <th style={{ textAlign: "center" }}>Phiên bản</th>
                <th>Cập nhật</th>
                <th>Kiểm tra</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center", padding: "2rem" }}>
                    Đang tải...
                  </td>
                </tr>
              ) : scores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center", padding: "2rem" }}>
                    Chưa có điểm nào.
                  </td>
                </tr>
              ) : (
                scores.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.studentId}</strong>
                      <div className="muted">{s.studentName || ""}</div>
                    </td>
                    <td>{s.courseCode}</td>
                    <td>{s.semester}</td>
                    <td style={{ textAlign: "center" }}>
                      <strong className="sd-score">{s.score}</strong>
                    </td>
                    <td style={{ textAlign: "center" }}>v{s.version}</td>
                    <td className="muted">{formatTime(s.updatedAt)}</td>
                    <td>{statusBadge(s)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn btn-outline btn-sm" onClick={() => onViewDetail(s)}>
                        Chi tiết
                      </button>{" "}
                      <button className="btn btn-outline btn-sm" onClick={() => checkOne(s)} disabled={checkingId === s.id}>
                        {checkingId === s.id ? "..." : "Kiểm tra"}
                      </button>{" "}
                      <button className="btn btn-outline btn-sm" onClick={() => onEditScore(s)}>
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
