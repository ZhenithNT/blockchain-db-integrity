import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { CourseItem, CourseOffering, LecturerItem, SemesterItem, StudentItem, User } from "../types";

interface AcademicManagementViewProps {
  user: User;
}

export const AcademicManagementView: React.FC<AcademicManagementViewProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<"COURSES" | "OFFERINGS" | "LECTURERS" | "STUDENTS">("COURSES");

  // Data states
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [lecturers, setLecturers] = useState<LecturerItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals state
  const [showCreateOfferingModal, setShowCreateOfferingModal] = useState(false);
  const [showAddLecturerModal, setShowAddLecturerModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAssignLecturerModal, setShowAssignLecturerModal] = useState<number | null>(null); // offeringId
  const [showEnrollStudentModal, setShowEnrollStudentModal] = useState<number | null>(null); // offeringId
  const [returnToOfferingModal, setReturnToOfferingModal] = useState(false);

  // Forms state
  // 1. Offering
  const [newOfferingCode, setNewOfferingCode] = useState("");
  const [newOfferingCourseCode, setNewOfferingCourseCode] = useState("");
  const [newOfferingSemester, setNewOfferingSemester] = useState("");
  const [newOfferingRoom, setNewOfferingRoom] = useState("A2-301");
  const [newOfferingMax, setNewOfferingMax] = useState(60);

  // 2. Lecturer
  const [newLecturerCode, setNewLecturerCode] = useState("");
  const [newLecturerName, setNewLecturerName] = useState("");
  const [newLecturerFaculty, setNewLecturerFaculty] = useState("Khoa Công nghệ Thông tin 1");
  const [newLecturerEmail, setNewLecturerEmail] = useState("");
  const [newLecturerUsername, setNewLecturerUsername] = useState("");
  const [newLecturerPassword, setNewLecturerPassword] = useState("Lecturer@123");

  // 3. Student
  const [newStudentCode, setNewStudentCode] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentClass, setNewStudentClass] = useState("D23CQAT01-B");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentUsername, setNewStudentUsername] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("Student@123");

  // 4. Course
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCredits, setNewCourseCredits] = useState(3);
  const [newCourseDept, setNewCourseDept] = useState("Khoa Công nghệ Thông tin 1");

  // 5. Assign Lecturer
  const [selectedLecturerCode, setSelectedLecturerCode] = useState("");

  // 6. Enroll Student
  const [selectedStudentCode, setSelectedStudentCode] = useState("");

  // Load all initial data
  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [offData, lecData, stuData, crsData, semData] = await Promise.all([
        api.getOfferings(),
        api.getLecturers(),
        api.getStudents(),
        api.getCourses(),
        api.getSemesters(),
      ]);

      setOfferings(offData);
      setLecturers(lecData);
      setStudents(stuData);
      setCourses(crsData);
      setSemesters(semData);

      if (crsData.length > 0 && (!newOfferingCourseCode || !crsData.some((c) => c.code === newOfferingCourseCode))) {
        setNewOfferingCourseCode(crsData[0].code);
      }
      if (semData.length > 0 && (!newOfferingSemester || !semData.some((s) => s.code === newOfferingSemester))) {
        setNewOfferingSemester(semData.find((s) => s.isCurrent)?.code || semData[0].code);
      }
      if (lecData.length > 0 && (!selectedLecturerCode || !lecData.some((l) => l.lecturerCode === selectedLecturerCode))) {
        setSelectedLecturerCode(lecData[0].lecturerCode);
      }
      if (stuData.length > 0 && (!selectedStudentCode || !stuData.some((s) => s.studentCode === selectedStudentCode))) {
        setSelectedStudentCode(stuData[0].studentCode);
      }
    } catch (err: any) {
      setError(err.message || "Tải dữ liệu đào tạo thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Handlers
  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createOffering({
        offeringCode: newOfferingCode,
        courseCode: newOfferingCourseCode,
        semesterCode: newOfferingSemester,
        room: newOfferingRoom,
        maxStudents: newOfferingMax,
      });
      setSuccess(`Tạo lớp học phần ${newOfferingCode} thành công!`);
      setShowCreateOfferingModal(false);
      setNewOfferingCode("");
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLecturer({
        lecturerCode: newLecturerCode,
        fullName: newLecturerName,
        faculty: newLecturerFaculty,
        email: newLecturerEmail || undefined,
        username: newLecturerUsername || undefined,
        password: newLecturerPassword || undefined,
      });
      setSuccess(`Thêm giảng viên ${newLecturerName} (${newLecturerCode}) thành công!`);
      setShowAddLecturerModal(false);
      setNewLecturerCode("");
      setNewLecturerName("");
      setNewLecturerUsername("");
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createStudent({
        studentCode: newStudentCode,
        fullName: newStudentName,
        className: newStudentClass,
        email: newStudentEmail || undefined,
        username: newStudentUsername || undefined,
        password: newStudentPassword || undefined,
      });
      setSuccess(`Thêm sinh viên ${newStudentName} (${newStudentCode}) thành công!`);
      setShowAddStudentModal(false);
      setNewStudentCode("");
      setNewStudentName("");
      setNewStudentUsername("");
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createdCode = newCourseCode.trim().toUpperCase();
      await api.createCourse({
        code: createdCode,
        name: newCourseName,
        credits: newCourseCredits,
        department: newCourseDept,
      });
      setSuccess(`Thêm môn học ${newCourseName} (${createdCode}) thành công!`);
      setShowAddCourseModal(false);
      setNewCourseCode("");
      setNewCourseName("");
      await loadAll();
      setNewOfferingCourseCode(createdCode);
      if (returnToOfferingModal) {
        setShowCreateOfferingModal(true);
        setReturnToOfferingModal(false);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAssignLecturer = async (offeringId: number) => {
    if (!selectedLecturerCode) return;
    try {
      await api.assignLecturer(offeringId, {
        lecturerCode: selectedLecturerCode,
        role: "PRIMARY",
        canGrade: true,
      });
      setSuccess("Phân công giảng viên thành công!");
      setShowAssignLecturerModal(null);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEnrollStudent = async (offeringId: number) => {
    if (!selectedStudentCode) return;
    try {
      await api.enrollStudent(offeringId, selectedStudentCode);
      setSuccess(`Đã thêm sinh viên ${selectedStudentCode} vào lớp học phần!`);
      setShowEnrollStudentModal(null);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Banner */}
      <div className="ptit-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="ptit-card-title">
              <span>🏛️</span>
              <span>QUẢN LÝ ĐÀO TẠO & HỌC VỤ (ADMIN)</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.25rem" }}>
              Nghiệp vụ: Quản lý danh mục Giảng viên, Sinh viên, Môn học, Lớp học phần và Phân công giảng dạy
            </div>
          </div>

          {/* Quick Refresh */}
          <button className="btn btn-outline btn-sm" onClick={loadAll} disabled={loading}>
            🔄 Tải lại dữ liệu
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--invalid-bg)", border: "1px solid var(--invalid-border)", color: "var(--invalid)", padding: "0.85rem", borderRadius: "8px", fontSize: "0.85rem" }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ background: "var(--valid-bg)", border: "1px solid var(--valid-border)", color: "var(--valid)", padding: "0.85rem", borderRadius: "8px", fontSize: "0.85rem" }}>
          ✓ {success}
        </div>
      )}

      {/* Onboarding Guide if DB is completely fresh */}
      {courses.length === 0 && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "1rem", borderRadius: "8px", fontSize: "0.85rem", color: "#1e40af" }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🚀</span>
            <span>Hệ thống CSDL đang trắng tinh (Sẵn sàng nhập mới)!</span>
          </div>
          <div style={{ color: "#1e3a8a", lineHeight: 1.5 }}>
            Để bắt đầu khởi tạo dữ liệu đào tạo, vui lòng thực hiện theo 3 bước:
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span className="badge" style={{ background: "#dbeafe", color: "#1e40af", padding: "0.4rem 0.6rem", fontWeight: 700 }}>
                1. Thêm Môn Học (Tab Môn Học)
              </span>
              <span style={{ color: "#94a3b8" }}>➔</span>
              <span className="badge" style={{ background: "#dbeafe", color: "#1e40af", padding: "0.4rem 0.6rem", fontWeight: 700 }}>
                2. Thêm Giảng Viên & Sinh Viên
              </span>
              <span style={{ color: "#94a3b8" }}>➔</span>
              <span className="badge" style={{ background: "#dbeafe", color: "#1e40af", padding: "0.4rem 0.6rem", fontWeight: 700 }}>
                3. Mở Lớp Học Phần & Gán GV/SV
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.5rem" }}>
        <button
          className={`btn ${activeSubTab === "COURSES" ? "btn-primary" : "btn-outline"}`}
          onClick={() => { setActiveSubTab("COURSES"); setError(null); setSuccess(null); }}
        >
          📖 Môn Học ({courses.length})
        </button>
        <button
          className={`btn ${activeSubTab === "OFFERINGS" ? "btn-primary" : "btn-outline"}`}
          onClick={() => { setActiveSubTab("OFFERINGS"); setError(null); setSuccess(null); }}
        >
          📚 Lớp Học Phần ({offerings.length})
        </button>
        <button
          className={`btn ${activeSubTab === "LECTURERS" ? "btn-primary" : "btn-outline"}`}
          onClick={() => { setActiveSubTab("LECTURERS"); setError(null); setSuccess(null); }}
        >
          👨‍🏫 Giảng Viên ({lecturers.length})
        </button>
        <button
          className={`btn ${activeSubTab === "STUDENTS" ? "btn-primary" : "btn-outline"}`}
          onClick={() => { setActiveSubTab("STUDENTS"); setError(null); setSuccess(null); }}
        >
          🎓 Sinh Viên ({students.length})
        </button>
      </div>

      {/* --- TAB: LỚP HỌC PHẦN --- */}
      {activeSubTab === "OFFERINGS" && (
        <div className="ptit-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Danh sách Lớp Học Phần Đã Mở</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateOfferingModal(true)}>
              ➕ Mở Lớp Học Phần Mới
            </button>
          </div>

          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                  <th>Mã Lớp HP</th>
                  <th>Môn Học</th>
                  <th>Học Kỳ</th>
                  <th>Phòng</th>
                  <th style={{ textAlign: "center" }}>Sĩ Số (Hiện tại/Max)</th>
                  <th>Giảng Viên Phụ Trách</th>
                  <th style={{ textAlign: "center" }}>Trạng Thái</th>
                  <th style={{ textAlign: "center", width: "220px" }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {offerings.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📚</div>
                      <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "0.25rem" }}>Chưa có lớp học phần nào được mở</div>
                      <div style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                        {courses.length === 0 
                          ? "Lưu ý: Bạn cần tạo ít nhất 1 Môn học trước khi có thể mở lớp học phần." 
                          : "Bấm nút bên dưới để mở lớp học phần mới cho môn học."}
                      </div>
                      {courses.length === 0 ? (
                        <button className="btn btn-primary btn-sm" onClick={() => { setActiveSubTab("COURSES"); setShowAddCourseModal(true); }}>
                          📖 Thêm Môn Học Trước
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateOfferingModal(true)}>
                          ➕ Mở Lớp Học Phần Mới
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  offerings.map((o, idx) => (
                    <tr key={o.id}>
                      <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                      <td><strong className="mono" style={{ color: "var(--primary-ptit)" }}>{o.offeringCode}</strong></td>
                      <td>
                        <strong>{o.courseName}</strong> ({o.courseCode}) - {o.credits} TC
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>{o.semesterName}</td>
                      <td>{o.room}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className="badge" style={{ background: "#f1f5f9", color: "#334155" }}>
                          {o.enrolledCount} / {o.maxStudents} SV
                        </span>
                      </td>
                      <td>
                        {o.lecturers.length > 0 ? (
                          o.lecturers.map((l) => l.name).join(", ")
                        ) : (
                          <span style={{ color: "#ef4444", fontSize: "0.78rem" }}>Chưa phân công</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${o.status === "APPROVED" ? "badge-valid" : o.status === "SUBMITTED" ? "badge-info" : "badge-pending"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                            onClick={() => setShowAssignLecturerModal(o.id)}
                            title="Phân công giảng viên cho lớp này"
                          >
                            👨‍🏫 Gán GV
                          </button>
                          <button
                            className="btn btn-outline-primary btn-sm"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                            onClick={() => setShowEnrollStudentModal(o.id)}
                            title="Thêm sinh viên vào lớp này"
                          >
                            🎓 Thêm SV
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: GIẢNG VIÊN --- */}
      {activeSubTab === "LECTURERS" && (
        <div className="ptit-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Danh Sách Giảng Viên Học Viện</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddLecturerModal(true)}>
              ➕ Thêm Giảng Viên Mới
            </button>
          </div>

          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                  <th>Mã GV</th>
                  <th>Họ và Tên</th>
                  <th>Khoa / Bộ Môn</th>
                  <th>Email</th>
                  <th>Tài Khoản Đăng Nhập</th>
                  <th style={{ textAlign: "center" }}>Số Lớp Đang Dạy</th>
                </tr>
              </thead>
              <tbody>
                {lecturers.map((l, idx) => (
                  <tr key={l.id}>
                    <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                    <td><strong className="mono" style={{ color: "var(--primary-ptit)" }}>{l.lecturerCode}</strong></td>
                    <td style={{ fontWeight: 600 }}>{l.fullName}</td>
                    <td>{l.faculty}</td>
                    <td style={{ color: "#64748b" }}>{l.email || "-"}</td>
                    <td><code>{l.username || "-"}</code></td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-valid">{l.teachingOfferingsCount} lớp</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: SINH VIÊN --- */}
      {activeSubTab === "STUDENTS" && (
        <div className="ptit-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Danh Sách Sinh Viên</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddStudentModal(true)}>
              ➕ Thêm Sinh Viên Mới
            </button>
          </div>

          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                  <th>Mã Sinh Viên</th>
                  <th>Họ và Tên</th>
                  <th>Lớp Sinh Hoạt</th>
                  <th>Email</th>
                  <th>Tài Khoản Đăng Nhập</th>
                  <th style={{ textAlign: "center" }}>Lớp Đã Đăng Ký</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                    <td><strong className="mono" style={{ color: "var(--primary-ptit)" }}>{s.studentCode}</strong></td>
                    <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                    <td>{s.className}</td>
                    <td style={{ color: "#64748b" }}>{s.email || "-"}</td>
                    <td><code>{s.username || "-"}</code></td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-info">{s.enrolledOfferingsCount} lớp</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: MÔN HỌC --- */}
      {activeSubTab === "COURSES" && (
        <div className="ptit-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Danh Mục Môn Học</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddCourseModal(true)}>
              ➕ Thêm Môn Học Mới
            </button>
          </div>

          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                  <th>Mã Môn</th>
                  <th>Tên Môn Học</th>
                  <th style={{ textAlign: "center" }}>Số Tín Chỉ</th>
                  <th>Khoa Phụ Trách</th>
                  <th style={{ textAlign: "center" }}>Số Lớp HP Đã Mở</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c, idx) => (
                  <tr key={c.id}>
                    <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                    <td><strong className="mono" style={{ color: "var(--primary-ptit)" }}>{c.code}</strong></td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ textAlign: "center" }}><strong>{c.credits}</strong></td>
                    <td>{c.department}</td>
                    <td style={{ textAlign: "center" }}>{c._count?.offerings || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* 1. Modal Tạo Lớp Học Phần Mới */}
      {showCreateOfferingModal && (
        <div className="modal-overlay" onClick={() => setShowCreateOfferingModal(false)}>
          <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--primary-ptit)" }}>📚 Mở Lớp Học Phần Mới</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCreateOfferingModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateOffering} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "1.25rem 0" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Chọn Môn Học:</label>
                <select
                  className="form-select"
                  value={newOfferingCourseCode}
                  onChange={(e) => setNewOfferingCourseCode(e.target.value)}
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code} - {c.name} ({c.credits} TC)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mã Lớp Học Phần:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: INT1313-02 hoặc ATWEB-01"
                  value={newOfferingCode}
                  onChange={(e) => setNewOfferingCode(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phòng Học:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newOfferingRoom}
                    onChange={(e) => setNewOfferingRoom(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Sĩ Số Tối Đa:</label>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    className="form-input"
                    value={newOfferingMax}
                    onChange={(e) => setNewOfferingMax(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Học Kỳ:</label>
                <select
                  className="form-select"
                  value={newOfferingSemester}
                  onChange={(e) => setNewOfferingSemester(e.target.value)}
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
                Tạo Lớp Học Phần
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Thêm Giảng Viên Mới */}
      {showAddLecturerModal && (
        <div className="modal-overlay" onClick={() => setShowAddLecturerModal(false)}>
          <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--primary-ptit)" }}>👨‍🏫 Thêm Giảng Viên Mới</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAddLecturerModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateLecturer} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "1.25rem 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mã GV:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: GV003"
                    value={newLecturerCode}
                    onChange={(e) => setNewLecturerCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Họ và Tên Giảng Viên:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: TS. Nguyễn Hoàng Nam"
                    value={newLecturerName}
                    onChange={(e) => setNewLecturerName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Khoa / Bộ Môn:</label>
                <input
                  type="text"
                  className="form-input"
                  value={newLecturerFaculty}
                  onChange={(e) => setNewLecturerFaculty(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tên Đăng Nhập:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Mặc định là mã GV"
                    value={newLecturerUsername}
                    onChange={(e) => setNewLecturerUsername(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mật Khẩu Khởi Tạo:</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newLecturerPassword}
                    onChange={(e) => setNewLecturerPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
                Tạo Hồ Sơ & Tài Khoản Giảng Viên
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Thêm Sinh Viên Mới */}
      {showAddStudentModal && (
        <div className="modal-overlay" onClick={() => setShowAddStudentModal(false)}>
          <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--primary-ptit)" }}>🎓 Thêm Sinh Viên Mới</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAddStudentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateStudent} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "1.25rem 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mã SV:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: B23DCAT099"
                    value={newStudentCode}
                    onChange={(e) => setNewStudentCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Họ và Tên Sinh Viên:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Phạm Thị Hoa"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Lớp Sinh Hoạt:</label>
                <input
                  type="text"
                  className="form-input"
                  value={newStudentClass}
                  onChange={(e) => setNewStudentClass(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tên Đăng Nhập:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Mặc định là mã SV"
                    value={newStudentUsername}
                    onChange={(e) => setNewStudentUsername(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mật Khẩu Khởi Tạo:</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
                Tạo Hồ Sơ & Tài Khoản Sinh Viên
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Thêm Môn Học Mới */}
      {showAddCourseModal && (
        <div className="modal-overlay" onClick={() => setShowAddCourseModal(false)}>
          <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--primary-ptit)" }}>📖 Thêm Môn Học Mới</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAddCourseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCourse} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "1.25rem 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mã Môn:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: BAS1204"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tên Môn Học:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Giải tích 1"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Số Tín Chỉ:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-input"
                    value={newCourseCredits}
                    onChange={(e) => setNewCourseCredits(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Khoa / Bộ Môn:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCourseDept}
                    onChange={(e) => setNewCourseDept(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
                Thêm Môn Học
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Phân Công Giảng Viên */}
      {showAssignLecturerModal && (
        <div className="modal-overlay" onClick={() => setShowAssignLecturerModal(null)}>
          <div className="modal-content" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--primary-ptit)" }}>👨‍🏫 Phân Công Giảng Viên</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAssignLecturerModal(null)}>✕</button>
            </div>
            <div style={{ padding: "1.25rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Chọn Giảng Viên Phụ Trách:</label>
                <select
                  className="form-select"
                  value={selectedLecturerCode}
                  onChange={(e) => setSelectedLecturerCode(e.target.value)}
                >
                  {lecturers.map((l) => (
                    <option key={l.id} value={l.lecturerCode}>
                      {l.lecturerCode} - {l.fullName} ({l.faculty})
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleAssignLecturer(showAssignLecturerModal)}
              >
                Xác Nhận Phân Công
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Thêm Sinh Viên Vào Lớp */}
      {showEnrollStudentModal && (
        <div className="modal-overlay" onClick={() => setShowEnrollStudentModal(null)}>
          <div className="modal-content" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--primary-ptit)" }}>🎓 Thêm Sinh Viên Vào Lớp</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowEnrollStudentModal(null)}>✕</button>
            </div>
            <div style={{ padding: "1.25rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Chọn Sinh Viên Ghi Danh:</label>
                <select
                  className="form-select"
                  value={selectedStudentCode}
                  onChange={(e) => setSelectedStudentCode(e.target.value)}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.studentCode}>
                      {s.studentCode} - {s.fullName} ({s.className})
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleEnrollStudent(showEnrollStudentModal)}
              >
                Ghi Danh Vào Lớp Học Phần
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
