import React, { useState } from "react";
import { api } from "../api";
import type { Score } from "../types";

interface AddEditScoreModalProps {
  scoreToEdit: Score | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddEditScoreModal: React.FC<AddEditScoreModalProps> = ({
  scoreToEdit,
  onClose,
  onSuccess,
}) => {
  const isEdit = !!scoreToEdit;

  const [studentId, setStudentId] = useState(scoreToEdit?.studentId || "");
  const [courseCode, setCourseCode] = useState(scoreToEdit?.courseCode || "");
  const [semester, setSemester] = useState(scoreToEdit?.semester || "2026-1");
  const [scoreVal, setScoreVal] = useState(scoreToEdit ? scoreToEdit.score : "8.50");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const numScore = Number.parseFloat(scoreVal);
    if (Number.isNaN(numScore) || numScore < 0 || numScore > 10) {
      setError("Điểm số phải là số thực từ 0.00 đến 10.00");
      setLoading(false);
      return;
    }

    try {
      if (isEdit && scoreToEdit) {
        await api.updateScore(scoreToEdit.id, numScore);
      } else {
        await api.createScore({
          studentId: studentId.trim(),
          courseCode: courseCode.trim(),
          semester: semester.trim(),
          score: numScore,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Lỗi thao tác");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "520px", padding: "1.75rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #334155", paddingBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
            {isEdit ? `✏️ Cập Nhật Điểm: ${scoreToEdit.studentId}` : "➕ Thêm Bản Ghi Điểm Mới"}
          </h2>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#fca5a5", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem" }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
              Mã Sinh Viên
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: SV001"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={isEdit}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                Mã Môn Học
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="VD: ATWEB"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                disabled={isEdit}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                Học Kỳ
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="VD: 2026-1"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                disabled={isEdit}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.3rem" }}>
              {isEdit ? `Điểm Mới (Hiện tại: ${scoreToEdit.score} -> Version ${scoreToEdit.version + 1})` : "Điểm Số (0.00 - 10.00)"}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              className="input-field"
              value={scoreVal}
              onChange={(e) => setScoreVal(e.target.value)}
              required
            />
          </div>

          <div style={{ background: "#1e293b", padding: "0.75rem", borderRadius: "8px", border: "1px solid #334155", fontSize: "0.75rem", color: "#94a3b8" }}>
            ⛓️ <strong>Lưu ý Blockchain:</strong> Khi bấm lưu, backend sẽ tính mã băm chuẩn SHA-256 và gửi giao dịch tới Smart Contract. Bản ghi chỉ được lưu vào MySQL sau khi Blockchain xác nhận receipt.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "⏳ Đang ghi lên Blockchain..." : isEdit ? "Cập Nhật Version Mới" : "Tạo Bản Ghi & Neo Blockchain"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
