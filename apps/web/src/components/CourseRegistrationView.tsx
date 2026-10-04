import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { CourseOffering, StudentTranscriptItem, User } from "../types";

interface CourseRegistrationViewProps {
  user: User;
}

export const CourseRegistrationView: React.FC<CourseRegistrationViewProps> = ({ user }) => {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [myGrades, setMyGrades] = useState<StudentTranscriptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [offList, myGradeList] = await Promise.all([
        api.getOfferings(),
        api.getMyGrades(),
      ]);
      setOfferings(offList);
      setMyGrades(myGradeList);
    } catch (err: any) {
      setError(err.message || "Tải danh sách đăng ký môn học thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const enrolledOfferingCodes = new Set(myGrades.map((g) => g.offeringCode));

  const handleEnroll = async (offeringId: number, code: string) => {
    setActionLoadingId(offeringId);
    setError(null);
    setSuccess(null);
    try {
      await api.studentEnroll(offeringId);
      setSuccess(`Đăng ký thành công lớp học phần ${code}!`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnenroll = async (offeringId: number, code: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy đăng ký lớp ${code}?`)) return;
    setActionLoadingId(offeringId);
    setError(null);
    setSuccess(null);
    try {
      await api.studentUnenroll(offeringId);
      setSuccess(`Đã hủy đăng ký lớp học phần ${code}!`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Banner */}
      <div className="ptit-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="ptit-card-title">
              <span>ĐĂNG KÝ HỌC PHẦN</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.25rem" }}>
              Sinh viên: <strong>{user.fullName}</strong> ({user.studentCode || user.username}) • Lựa chọn các lớp học phần trong học kỳ.
            </div>
          </div>

          <button className="btn btn-outline btn-sm" onClick={loadData} disabled={loading}>
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--invalid-bg)", border: "1px solid var(--invalid-border)", color: "var(--invalid)", padding: "0.85rem", borderRadius: "8px", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: "var(--valid-bg)", border: "1px solid var(--valid-border)", color: "var(--valid)", padding: "0.85rem", borderRadius: "8px", fontSize: "0.85rem" }}>
          {success}
        </div>
      )}

      {/* Danh sách lớp học phần đang mở */}
      <div className="ptit-card">
        <div className="ptit-card-header">
          <div className="ptit-card-title">
            <span>DANH SÁCH LỚP HỌC PHẦN MỞ ĐĂNG KÝ</span>
          </div>
        </div>

        <div className="ptit-table-container">
          <table className="ptit-table">
            <thead>
              <tr>
                <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                <th>Mã Lớp HP</th>
                <th>Môn Học</th>
                <th style={{ textAlign: "center" }}>Tín Chỉ</th>
                <th>Học Kỳ</th>
                <th>Giảng Viên</th>
                <th>Phòng Học</th>
                <th style={{ textAlign: "center" }}>Sĩ Số</th>
                <th style={{ textAlign: "center" }}>Trạng Thái</th>
                <th style={{ textAlign: "center", width: "160px" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {offerings.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    Hiện chưa có lớp học phần nào được mở trong học kỳ này.
                  </td>
                </tr>
              ) : (
                offerings.map((o, idx) => {
                  const isEnrolled = enrolledOfferingCodes.has(o.offeringCode);
                  const isFull = o.enrolledCount >= o.maxStudents;
                  const isActionLoading = actionLoadingId === o.id;

                  return (
                    <tr key={o.id} style={{ background: isEnrolled ? "rgba(16, 185, 129, 0.04)" : "transparent" }}>
                      <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                      <td>
                        <strong className="mono" style={{ color: "var(--primary-ptit)" }}>
                          {o.offeringCode}
                        </strong>
                      </td>
                      <td>
                        <strong>{o.courseName}</strong> ({o.courseCode})
                      </td>
                      <td style={{ textAlign: "center" }}><strong>{o.credits}</strong></td>
                      <td style={{ fontSize: "0.82rem" }}>{o.semesterName}</td>
                      <td>
                        {o.lecturers.length > 0 ? (
                          o.lecturers.map((l) => l.name).join(", ")
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>Đang xếp GV</span>
                        )}
                      </td>
                      <td>{o.room}</td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className="badge"
                          style={{
                            background: isFull ? "#fee2e2" : "#f1f5f9",
                            color: isFull ? "#dc2626" : "#334155",
                          }}
                        >
                          {o.enrolledCount} / {o.maxStudents}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isEnrolled ? (
                          <span className="badge badge-valid">Đã đăng ký</span>
                        ) : isFull ? (
                          <span className="badge badge-invalid">Đã đầy</span>
                        ) : (
                          <span className="badge badge-pending">Còn chỗ</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isEnrolled ? (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: "#ef4444", borderColor: "#fca5a5" }}
                            onClick={() => handleUnenroll(o.id, o.offeringCode)}
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? "Đang xử lý..." : "Hủy đăng ký"}
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleEnroll(o.id, o.offeringCode)}
                            disabled={isFull || isActionLoading}
                          >
                            {isActionLoading ? "Đang xử lý..." : "Đăng ký"}
                          </button>
                        )}
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
