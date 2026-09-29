import React, { useState } from "react";
import { api } from "../api";
import type { StudentScoreRow } from "../types";

interface CreateChangeRequestModalProps {
  studentScore: StudentScoreRow;
  courseName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateChangeRequestModal: React.FC<CreateChangeRequestModalProps> = ({
  studentScore,
  courseName,
  onClose,
  onSuccess,
}) => {
  const [attendance, setAttendance] = useState<number | string>(studentScore.attendanceScore ?? "");
  const [midterm, setMidterm] = useState<number | string>(studentScore.midtermScore ?? "");
  const [finalScore, setFinalScore] = useState<number | string>(studentScore.finalScore ?? "");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState("bien_ban_phuc_khao.pdf");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute live total score
  const cc = typeof attendance === "number" ? attendance : parseFloat(String(attendance)) || 0;
  const gk = typeof midterm === "number" ? midterm : parseFloat(String(midterm)) || 0;
  const ck = typeof finalScore === "number" ? finalScore : parseFloat(String(finalScore)) || 0;
  const proposedTotal = (cc * 0.1 + gk * 0.2 + ck * 0.7).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentScore.scoreId) {
      setError("Sinh viên chưa có bản ghi điểm hợp lệ.");
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do điều chỉnh điểm.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.createChangeRequest({
        scoreId: studentScore.scoreId,
        proposedScore: proposedTotal,
        proposedAttendance: attendance !== "" ? Number(attendance) : undefined,
        proposedMidterm: midterm !== "" ? Number(midterm) : undefined,
        proposedFinal: finalScore !== "" ? Number(finalScore) : undefined,
        reason: reason.trim(),
        evidenceAttachment: attachment.trim() || undefined,
      });
      alert("Đã gửi đề xuất điều chỉnh điểm tới Phòng Đào tạo!");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Gửi đề xuất thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ color: "var(--primary-ptit)", fontSize: "1.05rem" }}>
            Đề xuất điều chỉnh điểm (Sau khóa sổ)
          </h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕ Đóng
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", fontSize: "0.82rem" }}>
              <div><strong>Sinh viên:</strong> {studentScore.fullName} ({studentScore.studentCode})</div>
              <div><strong>Môn học:</strong> {courseName}</div>
              <div><strong>Điểm hiện tại:</strong> <span style={{ color: "var(--primary-ptit)", fontWeight: 700 }}>{studentScore.score}</span></div>
            </div>

            {error && (
              <div style={{ background: "var(--invalid-bg)", color: "var(--invalid)", padding: "0.6rem", borderRadius: "6px", fontSize: "0.8rem" }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.65rem" }}>
              <div className="form-group">
                <label className="form-label">Chuyên cần (10%):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  className="form-input"
                  value={attendance}
                  onChange={(e) => setAttendance(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Giữa kỳ (20%):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  className="form-input"
                  value={midterm}
                  onChange={(e) => setMidterm(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cuối kỳ (70%):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  className="form-input"
                  value={finalScore}
                  onChange={(e) => setFinalScore(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ background: "var(--accent-rose)", padding: "0.65rem 0.85rem", borderRadius: "6px", fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}>
              <span>Điểm tổng kết đề xuất mới:</span>
              <strong style={{ color: "var(--primary-ptit)", fontSize: "1.05rem" }}>{proposedTotal}</strong>
            </div>

            <div className="form-group">
              <label className="form-label">Lý do điều chỉnh (Biên bản phúc khảo/sửa sai sót):</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Nhập lý do chi tiết..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tệp đính kèm / Minh chứng:</label>
              <input
                type="text"
                className="form-input"
                placeholder="Tên tệp minh chứng hoặc URL scan..."
                value={attachment}
                onChange={(e) => setAttachment(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Đang gửi đề xuất..." : "Gửi yêu cầu phê duyệt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
