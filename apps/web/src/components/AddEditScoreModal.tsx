import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { Catalog, Score } from "../types";

interface Props {
  scoreToEdit: Score | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddEditScoreModal: React.FC<Props> = ({ scoreToEdit, onClose, onSuccess }) => {
  const isEdit = scoreToEdit !== null;
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [studentId, setStudentId] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [semester, setSemester] = useState("");
  const [score, setScore] = useState(isEdit ? scoreToEdit!.score : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) return;
    api
      .getCatalog()
      .then((c) => {
        setCatalog(c);
        setStudentId(c.students[0]?.studentCode || "");
        setCourseCode(c.courses[0]?.code || "");
        setSemester(c.semesters[0]?.code || "");
      })
      .catch((e) => setError(e.message));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await api.updateScore(scoreToEdit!.id, Number(score));
      } else {
        await api.createScore({ studentId, courseCode, semester, score: Number(score) });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 460, padding: "1.5rem 1.75rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>
          {isEdit ? `Sửa điểm ${scoreToEdit!.studentId} môn ${scoreToEdit!.courseCode}` : "Thêm điểm"}
        </h3>

        {error && (
          <div className="badge badge-invalid" style={{ marginBottom: "1rem", whiteSpace: "normal" }}>
            {error}
          </div>
        )}

        {!isEdit && (
          <>
            <div className="form-group">
              <label className="form-label">Sinh viên</label>
              <select className="form-input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {catalog?.students.map((s) => (
                  <option key={s.studentCode} value={s.studentCode}>
                    {s.studentCode} - {s.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Môn học</label>
              <select className="form-input" value={courseCode} onChange={(e) => setCourseCode(e.target.value)}>
                {catalog?.courses.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Học kỳ</label>
              <select className="form-input" value={semester} onChange={(e) => setSemester(e.target.value)}>
                {catalog?.semesters.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label">{isEdit ? `Điểm mới (hiện tại ${scoreToEdit!.score})` : "Điểm (0 đến 10)"}</label>
          <input
            className="form-input"
            type="number"
            step="0.01"
            min="0"
            max="10"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
            autoFocus
          />
        </div>

        <p className="muted" style={{ marginBottom: "1rem" }}>
          Điểm được ghi lên blockchain, ký bằng ví của bạn.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Đang ghi..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
};
