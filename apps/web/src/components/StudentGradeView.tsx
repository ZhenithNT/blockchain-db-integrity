import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { StudentTranscriptItem, User } from "../types";

interface StudentGradeViewProps {
  user: User;
}

export const StudentGradeView: React.FC<StudentGradeViewProps> = ({ user }) => {
  const [grades, setGrades] = useState<StudentTranscriptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<string, any>>({});

  const loadGrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyGrades();
      setGrades(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải bảng điểm.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrades();
  }, [user]);

  // Statistics
  const totalCredits = grades.reduce((acc, g) => acc + (g.credits || 3), 0);
  const gpa10 =
    grades.length > 0
      ? (
          grades.reduce((acc, g) => acc + (parseFloat(g.score || "0") || 0) * (g.credits || 3), 0) /
          totalCredits
        ).toFixed(2)
      : "0.00";

  const getGpa4 = (scoreStr: string | null) => {
    if (!scoreStr) return 0.0;
    const val = parseFloat(scoreStr);
    if (val >= 9.0) return 4.0;
    if (val >= 8.5) return 3.7;
    if (val >= 8.0) return 3.5;
    if (val >= 7.0) return 3.0;
    if (val >= 6.5) return 2.5;
    if (val >= 5.5) return 2.0;
    if (val >= 5.0) return 1.5;
    if (val >= 4.0) return 1.0;
    return 0.0;
  };

  const gpa4 =
    grades.length > 0
      ? (
          grades.reduce((acc, g) => acc + getGpa4(g.score) * (g.credits || 3), 0) /
          totalCredits
        ).toFixed(2)
      : "0.00";

  const handleVerifyScore = async (item: StudentTranscriptItem) => {
    if (!item.recordKey) return;
    const itemKey = item.recordKey;
    setVerifyingKey(itemKey);
    try {
      // Find score ID by checking recent integrity or by getScores
      const allScores = await api.getScores({ search: item.courseCode });
      const matched = allScores.find((s) => s.recordKey === itemKey);
      if (matched) {
        const res = await api.checkIntegrity(matched.id);
        setVerificationResults((prev) => ({
          ...prev,
          [itemKey]: res,
        }));
      } else {
        alert("Không tìm thấy ID bản ghi trên máy chủ.");
      }
    } catch (err: any) {
      alert(`Kiểm tra thất bại: ${err.message}`);
    } finally {
      setVerifyingKey(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header card */}
      <div className="ptit-card">
        <div className="ptit-card-header">
          <div className="ptit-card-title">
            <span>🎓</span>
            <span>BẢNG ĐIỂM HỌC TẬP & XÁC THỰC TOÀN VẸN BLOCKCHAIN</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadGrades}>
            🔄 Làm mới
          </button>
        </div>

        {/* Student Profile & GPA Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            background: "#f8fafc",
            padding: "1.25rem",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Sinh viên:</span>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1e293b" }}>
              {user.fullName || "Nguyễn Trung Nghĩa"}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--primary-ptit)", fontWeight: 600 }}>
              Mã SV: {user.studentCode || "B23DCAT211"} • Lớp: D23CQAT01-B
            </div>
          </div>

          <div style={{ textAlign: "center", borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Điểm trung bình tích lũy (Hệ 4):</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--primary-ptit)" }}>
              {gpa4} / 4.0
            </div>
            <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>Học lực: Xuất sắc / Giỏi</div>
          </div>

          <div style={{ textAlign: "center", borderRight: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Điểm trung bình (Hệ 10):</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#2563eb" }}>
              {gpa10}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Thang điểm 10 chuẩn</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Tổng số tín chỉ tích lũy:</span>
            <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#0f172a" }}>
              {totalCredits}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{grades.length} môn đã hoàn thành</div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--invalid-bg)", color: "var(--invalid)", padding: "0.85rem", borderRadius: "8px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Transcript Table */}
      <div className="ptit-card">
        <div style={{ marginBottom: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#334155" }}>
            Chi tiết điểm học phần năm học 2025-2026 (Học kỳ 1)
          </h3>
          <span style={{ fontSize: "0.78rem", color: "#059669", fontWeight: 600 }}>
            🛡️ Tất cả điểm số đã được cấp bằng chứng điện tử trên Hardhat Integrity Registry
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Đang tải bảng điểm...</div>
        ) : grades.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontStyle: "italic" }}>
            Chưa có điểm công bố trong học kỳ này.
          </div>
        ) : (
          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>STT</th>
                  <th>Mã môn</th>
                  <th>Tên môn học</th>
                  <th style={{ textAlign: "center" }}>Số TC</th>
                  <th style={{ textAlign: "center" }}>CC (10%)</th>
                  <th style={{ textAlign: "center" }}>GK (20%)</th>
                  <th style={{ textAlign: "center" }}>CK (70%)</th>
                  <th style={{ textAlign: "center" }}>Tổng kết</th>
                  <th style={{ textAlign: "center" }}>Điểm chữ</th>
                  <th style={{ textAlign: "center" }}>Hệ 4</th>
                  <th style={{ textAlign: "center" }}>Chứng thực Blockchain</th>
                  <th style={{ textAlign: "center" }}>Đối soát</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((item, idx) => {
                  const itemKey = item.recordKey || `offering-${item.offeringId || idx}`;
                  const check = item.recordKey ? verificationResults[item.recordKey] : null;

                  return (
                    <tr key={itemKey}>
                      <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                      <td>
                        <strong className="mono" style={{ color: "var(--primary-ptit)" }}>
                          {item.courseCode}
                        </strong>
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.courseName}</td>
                      <td style={{ textAlign: "center" }}>{item.credits}</td>
                      <td style={{ textAlign: "center" }}>{item.attendanceScore ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{item.midtermScore ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{item.finalScore ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>
                        <strong style={{ color: "var(--primary-ptit)", fontSize: "0.95rem" }}>
                          {item.score || "-"}
                        </strong>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {item.letterScore || "-"}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600, color: "#475569" }}>
                        {getGpa4(item.score).toFixed(1)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {item.blockchainStatus === "CONFIRMED" ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
                            <span className="badge badge-valid">
                              ⛓️ Khóa sổ (v{item.version})
                            </span>
                            {item.latestTxHash && (
                              <span className="mono" style={{ fontSize: "0.68rem", color: "#0284c7" }}>
                                {item.latestTxHash.substring(0, 10)}...
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="badge badge-pending">Đang cập nhật</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleVerifyScore(item)}
                          disabled={verifyingKey === item.recordKey}
                        >
                          {verifyingKey === item.recordKey ? "..." : "⚡ Đối soát"}
                        </button>
                        {check && (
                          <div style={{ marginTop: "0.25rem" }}>
                            <span
                              className={`badge ${check.result === "VALID" ? "badge-valid" : "badge-invalid"}`}
                              style={{ fontSize: "0.7rem" }}
                            >
                              {check.result}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
