import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { CourseOffering, CourseOfferingDetail, StudentScoreRow, User } from "../types";
import { CreateChangeRequestModal } from "./CreateChangeRequestModal";
import { EvidenceModal } from "./EvidenceModal";

interface GradingSheetViewProps {
  user: User;
}

export const GradingSheetView: React.FC<GradingSheetViewProps> = ({ user }) => {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<number | null>(null);
  const [offeringDetail, setOfferingDetail] = useState<CourseOfferingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student score edits map: enrollmentId -> { cc, gk, ck }
  const [scoreEdits, setScoreEdits] = useState<
    Record<number, { attendanceScore: number | string; midtermScore: number | string; finalScore: number | string }>
  >({});

  // Modals
  const [selectedEvidenceScore, setSelectedEvidenceScore] = useState<StudentScoreRow | null>(null);
  const [selectedChangeRequestScore, setSelectedChangeRequestScore] = useState<StudentScoreRow | null>(null);

  // Load offerings list
  const loadOfferings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOfferings({
        myClasses: user.role === "LECTURER",
      });
      setOfferings(data);
      if (data.length > 0 && !selectedOfferingId) {
        setSelectedOfferingId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Tải danh sách lớp học phần thất bại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfferings();
  }, [user]);

  // Load single offering detail
  const loadOfferingDetail = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOfferingById(id);
      setOfferingDetail(data);

      // Initialize score edits
      const initialEdits: Record<number, any> = {};
      data.students.forEach((s) => {
        initialEdits[s.enrollmentId] = {
          attendanceScore: s.attendanceScore ?? "",
          midtermScore: s.midtermScore ?? "",
          finalScore: s.finalScore ?? "",
        };
      });
      setScoreEdits(initialEdits);
    } catch (err: any) {
      setError(err.message || "Tải chi tiết lớp thất bại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOfferingId) {
      loadOfferingDetail(selectedOfferingId);
    }
  }, [selectedOfferingId]);

  // Helpers for calculation
  const calculateTotal = (ccVal: any, gkVal: any, ckVal: any) => {
    const cc = typeof ccVal === "number" ? ccVal : parseFloat(String(ccVal)) || 0;
    const gk = typeof gkVal === "number" ? gkVal : parseFloat(String(gkVal)) || 0;
    const ck = typeof ckVal === "number" ? ckVal : parseFloat(String(ckVal)) || 0;
    return Number((cc * 0.1 + gk * 0.2 + ck * 0.7).toFixed(2));
  };

  const getLetter = (total: number) => {
    if (total >= 9.0) return "A+";
    if (total >= 8.5) return "A";
    if (total >= 8.0) return "B+";
    if (total >= 7.0) return "B";
    if (total >= 6.5) return "C+";
    if (total >= 5.5) return "C";
    if (total >= 5.0) return "D+";
    if (total >= 4.0) return "D";
    return "F";
  };

  const getGpa4 = (total: number) => {
    if (total >= 9.0) return "4.0";
    if (total >= 8.5) return "3.7";
    if (total >= 8.0) return "3.5";
    if (total >= 7.0) return "3.0";
    if (total >= 6.5) return "2.5";
    if (total >= 5.5) return "2.0";
    if (total >= 5.0) return "1.5";
    if (total >= 4.0) return "1.0";
    return "0.0";
  };

  const handleScoreChange = (enrollmentId: number, field: "attendanceScore" | "midtermScore" | "finalScore", val: string) => {
    setScoreEdits((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: val,
      },
    }));
  };

  // Save scores (draft or submit)
  const handleSaveGrades = async (isDraft: boolean) => {
    if (!offeringDetail) return;
    setSaving(true);
    setError(null);
    try {
      const payloadScores = offeringDetail.students.map((s) => {
        const edit = scoreEdits[s.enrollmentId] || {};
        return {
          enrollmentId: s.enrollmentId,
          studentCode: s.studentCode,
          attendanceScore: edit.attendanceScore !== "" && edit.attendanceScore !== undefined ? Number(edit.attendanceScore) : undefined,
          midtermScore: edit.midtermScore !== "" && edit.midtermScore !== undefined ? Number(edit.midtermScore) : undefined,
          finalScore: edit.finalScore !== "" && edit.finalScore !== undefined ? Number(edit.finalScore) : undefined,
        };
      });

      await api.saveClassScores(offeringDetail.id, payloadScores, isDraft);
      alert(isDraft ? "Đã lưu bản nháp thành công!" : "Đã nộp điểm lên Phòng Đào tạo để phê duyệt!");
      await loadOfferingDetail(offeringDetail.id);
      await loadOfferings();
    } catch (err: any) {
      setError(err.message || "Lưu điểm thất bại.");
    } finally {
      setSaving(false);
    }
  };

  // Admin approves and triggers blockchain anchor
  const handleApproveClass = async () => {
    if (!offeringDetail) return;
    if (!window.confirm("Xác nhận phê duyệt bảng điểm và ghi bằng chứng lên Hardhat Blockchain?")) {
      return;
    }
    setApproving(true);
    setError(null);
    try {
      const res = await api.approveClassScores(offeringDetail.id);
      alert(`Phê duyệt thành công! Đã neo ${res.confirmedCount} bản ghi điểm lên Blockchain.`);
      await loadOfferingDetail(offeringDetail.id);
      await loadOfferings();
    } catch (err: any) {
      setError(err.message || "Phê duyệt thất bại.");
    } finally {
      setApproving(false);
    }
  };

  const canEdit =
    (user.role === "LECTURER" || user.role === "ADMIN") &&
    offeringDetail?.status === "DRAFT";

  const isLocked = offeringDetail?.status === "LOCKED" || offeringDetail?.status === "APPROVED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Banner & Offering Selector */}
      <div className="ptit-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="ptit-card-title">
              <span>📚</span>
              <span>BẢNG ĐIỂM LỚP HỌC PHẦN (CHẤM ĐIỂM & ĐỐI SOÁT BLOCKCHAIN)</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.25rem" }}>
              Nghiệp vụ: Giảng viên chấm điểm theo thành phần • Đào tạo duyệt và neo Smart Contract • Khóa sổ dữ liệu
            </div>
          </div>

          {/* Offering Selector Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>Chọn Lớp Học Phần:</label>
            <select
              className="form-select"
              style={{ width: "280px" }}
              value={selectedOfferingId ?? ""}
              onChange={(e) => setSelectedOfferingId(Number(e.target.value))}
            >
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.offeringCode} - {o.courseName} ({o.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--invalid-bg)", border: "1px solid var(--invalid-border)", color: "var(--invalid)", padding: "0.85rem", borderRadius: "8px", fontSize: "0.85rem" }}>
          ⚠️ {error}
        </div>
      )}

      {loading && !offeringDetail ? (
        <div className="ptit-card" style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
          Đang tải thông tin lớp học phần...
        </div>
      ) : offeringDetail ? (
        <div className="ptit-card">
          {/* Class Metadata */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              marginBottom: "1.25rem",
              fontSize: "0.82rem",
            }}
          >
            <div>
              <span style={{ color: "#64748b" }}>Môn học:</span>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                {offeringDetail.courseName} ({offeringDetail.courseCode})
              </div>
              <div style={{ color: "#64748b" }}>{offeringDetail.credits} Tín chỉ</div>
            </div>

            <div>
              <span style={{ color: "#64748b" }}>Giảng viên phụ trách:</span>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>
                {offeringDetail.lecturers[0]?.name || "Chưa phân công"}
              </div>
              <div style={{ color: "#64748b" }}>
                Mã GV: {offeringDetail.lecturers[0]?.code || "N/A"}
              </div>
            </div>

            <div>
              <span style={{ color: "#64748b" }}>Học kỳ / Phòng học:</span>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>
                {offeringDetail.semesterName}
              </div>
              <div style={{ color: "#64748b" }}>Phòng: {offeringDetail.room} • Sĩ số: {offeringDetail.students.length} sinh viên</div>
            </div>

            <div>
              <span style={{ color: "#64748b" }}>Trạng thái sổ điểm:</span>
              <div style={{ marginTop: "0.25rem" }}>
                <span
                  className={`badge ${
                    offeringDetail.status === "LOCKED"
                      ? "badge-locked"
                      : offeringDetail.status === "APPROVED" || offeringDetail.status === "PUBLISHED"
                      ? "badge-valid"
                      : offeringDetail.status === "SUBMITTED"
                      ? "badge-info"
                      : "badge-pending"
                  }`}
                  style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
                >
                  {offeringDetail.status === "LOCKED" && "🔒 ĐÃ KHÓA SỔ"}
                  {offeringDetail.status === "APPROVED" && "✅ ĐÃ PHÊ DUYỆT (ON-CHAIN)"}
                  {offeringDetail.status === "PUBLISHED" && "📢 ĐÃ CÔNG BỐ"}
                  {offeringDetail.status === "SUBMITTED" && "📤 ĐÃ NỘP - CHỜ DUYỆT"}
                  {offeringDetail.status === "DRAFT" && "📝 ĐANG SOẠN THẢO (DRAFT)"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ fontSize: "0.85rem", color: "#475569" }}>
              Danh sách: <strong>{offeringDetail.students.length} sinh viên</strong>
              {canEdit && <span style={{ color: "var(--valid)", marginLeft: "0.5rem" }}>● Chế độ nhập điểm đang mở</span>}
              {isLocked && <span style={{ color: "#7c3aed", marginLeft: "0.5rem" }}>● Điểm đã được niêm phong trên Smart Contract</span>}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              {canEdit && (
                <>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleSaveGrades(true)}
                    disabled={saving}
                  >
                    💾 Lưu nháp
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSaveGrades(false)}
                    disabled={saving}
                  >
                    📤 {saving ? "Đang gửi..." : "Nộp điểm cho Phòng Đào tạo"}
                  </button>
                </>
              )}

              {user.role === "ADMIN" && offeringDetail.status === "SUBMITTED" && (
                <button
                  className="btn btn-success"
                  onClick={handleApproveClass}
                  disabled={approving}
                >
                  ⚡ {approving ? "Đang ghi Blockchain..." : "Duyệt & Neo Smart Contract"}
                </button>
              )}

              <button
                className="btn btn-outline btn-sm"
                onClick={() => loadOfferingDetail(offeringDetail.id)}
                title="Làm mới bảng điểm"
              >
                🔄 Tải lại
              </button>
            </div>
          </div>

          {/* Spreadsheet Table */}
          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                  <th>Mã Sinh Viên</th>
                  <th>Họ và Tên</th>
                  <th>Lớp</th>
                  <th style={{ textAlign: "center", width: "90px" }}>CC (10%)</th>
                  <th style={{ textAlign: "center", width: "90px" }}>GK (20%)</th>
                  <th style={{ textAlign: "center", width: "90px" }}>Thi (70%)</th>
                  <th style={{ textAlign: "center", width: "95px" }}>Tổng kết</th>
                  <th style={{ textAlign: "center", width: "70px" }}>Điểm chữ</th>
                  <th style={{ textAlign: "center", width: "65px" }}>Hệ 4</th>
                  <th style={{ textAlign: "center", width: "160px" }}>Bằng chứng Blockchain</th>
                  {isLocked && user.role === "LECTURER" && (
                    <th style={{ textAlign: "center", width: "130px" }}>Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {offeringDetail.students.map((student, idx) => {
                  const edit = scoreEdits[student.enrollmentId] || {
                    attendanceScore: student.attendanceScore ?? "",
                    midtermScore: student.midtermScore ?? "",
                    finalScore: student.finalScore ?? "",
                  };

                  const liveTotal = calculateTotal(edit.attendanceScore, edit.midtermScore, edit.finalScore);
                  const liveLetter = getLetter(liveTotal);
                  const liveGpa4 = getGpa4(liveTotal);

                  return (
                    <tr key={student.enrollmentId}>
                      <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                      <td>
                        <strong className="mono" style={{ color: "var(--primary-ptit)" }}>
                          {student.studentCode}
                        </strong>
                      </td>
                      <td style={{ fontWeight: 600 }}>{student.fullName}</td>
                      <td style={{ color: "#64748b" }}>{student.className}</td>

                      {/* CC 10% */}
                      <td style={{ textAlign: "center" }}>
                        {canEdit ? (
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={edit.attendanceScore}
                            onChange={(e) =>
                              handleScoreChange(student.enrollmentId, "attendanceScore", e.target.value)
                            }
                          />
                        ) : (
                          <span style={{ fontWeight: 500 }}>{student.attendanceScore ?? "-"}</span>
                        )}
                      </td>

                      {/* GK 20% */}
                      <td style={{ textAlign: "center" }}>
                        {canEdit ? (
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={edit.midtermScore}
                            onChange={(e) =>
                              handleScoreChange(student.enrollmentId, "midtermScore", e.target.value)
                            }
                          />
                        ) : (
                          <span style={{ fontWeight: 500 }}>{student.midtermScore ?? "-"}</span>
                        )}
                      </td>

                      {/* CK 70% */}
                      <td style={{ textAlign: "center" }}>
                        {canEdit ? (
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={edit.finalScore}
                            onChange={(e) =>
                              handleScoreChange(student.enrollmentId, "finalScore", e.target.value)
                            }
                          />
                        ) : (
                          <span style={{ fontWeight: 500 }}>{student.finalScore ?? "-"}</span>
                        )}
                      </td>

                      {/* Tổng kết (10) */}
                      <td style={{ textAlign: "center" }}>
                        <strong style={{ color: "var(--primary-ptit)", fontSize: "0.95rem" }}>
                          {canEdit ? liveTotal.toFixed(2) : student.score || "-"}
                        </strong>
                      </td>

                      {/* Điểm chữ */}
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: "#1e293b" }}>
                          {canEdit ? liveLetter : student.letterScore || "-"}
                        </span>
                      </td>

                      {/* Hệ 4 */}
                      <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                        {canEdit ? liveGpa4 : (student.score ? getGpa4(parseFloat(student.score)) : "-")}
                      </td>

                      {/* Bằng chứng Blockchain */}
                      <td style={{ textAlign: "center" }}>
                        {student.blockchainStatus === "CONFIRMED" ? (
                          <button
                            className="badge badge-valid"
                            style={{ cursor: "pointer", border: "1px solid var(--valid-border)" }}
                            onClick={() => setSelectedEvidenceScore(student)}
                            title="Bấm để xem mã băm SHA-256 và giao dịch on-chain"
                          >
                            <span>⛓️ Đã xác thực (V{student.version || 1})</span>
                          </button>
                        ) : student.scoreId ? (
                          <span className="badge badge-pending">
                            {student.blockchainStatus || "Chưa xác thực"}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Chưa có điểm</span>
                        )}
                      </td>

                      {/* Đề xuất sửa điểm sau khóa */}
                      {isLocked && user.role === "LECTURER" && (
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setSelectedChangeRequestScore(student)}
                            title="Tạo đề xuất điều chỉnh điểm kèm minh chứng"
                          >
                            ✍️ Đề xuất sửa
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Blockchain Evidence Details Modal */}
      {selectedEvidenceScore && offeringDetail && (
        <EvidenceModal
          score={selectedEvidenceScore}
          courseCode={offeringDetail.courseCode}
          semesterCode={offeringDetail.semesterCode}
          onClose={() => setSelectedEvidenceScore(null)}
        />
      )}

      {/* Create Change Request Modal */}
      {selectedChangeRequestScore && offeringDetail && (
        <CreateChangeRequestModal
          studentScore={selectedChangeRequestScore}
          courseName={offeringDetail.courseName}
          onClose={() => setSelectedChangeRequestScore(null)}
          onSuccess={() => {
            setSelectedChangeRequestScore(null);
            loadOfferingDetail(offeringDetail.id);
          }}
        />
      )}
    </div>
  );
};
