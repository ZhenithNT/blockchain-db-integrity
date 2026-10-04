import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { ScoreChangeRequest, User } from "../types";

interface ChangeRequestsViewProps {
  user: User;
}

export const ChangeRequestsView: React.FC<ChangeRequestsViewProps> = ({ user }) => {
  const [requests, setRequests] = useState<ScoreChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Review modal
  const [reviewingItem, setReviewingItem] = useState<ScoreChangeRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNote, setReviewNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getChangeRequests({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        myRequests: user.role === "LECTURER",
      });
      setRequests(data);
    } catch (err: any) {
      setError(err.message || "Tải danh sách đề xuất thất bại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter, user]);

  const handleOpenReview = (item: ScoreChangeRequest, decision: "APPROVED" | "REJECTED") => {
    setReviewingItem(item);
    setReviewDecision(decision);
    setReviewNote(
      decision === "APPROVED"
        ? "Đồng ý điều chỉnh điểm theo biên bản phúc khảo. Tiến hành neo Blockchain."
        : "Từ chối yêu cầu do không đủ minh chứng hợp lệ."
    );
  };

  const handleConfirmReview = async () => {
    if (!reviewingItem) return;
    setSubmittingReview(true);
    setError(null);
    try {
      const res = await api.reviewChangeRequest(reviewingItem.id, reviewDecision, reviewNote);
      alert(res.message);
      setReviewingItem(null);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || "Xử lý yêu cầu thất bại.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("vi-VN");
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div className="ptit-card">
        <div className="ptit-card-header">
          <div className="ptit-card-title">
            <span>QUẢN LÝ YÊU CẦU ĐIỀU CHỈNH ĐIỂM</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadRequests}>
            Làm mới
          </button>
        </div>

        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
          Xem và xử lý các yêu cầu điều chỉnh điểm học phần hoặc phúc khảo bài thi.
        </div>

        {/* Status Filter Tabs */}
        <div className="ptit-tab-container">
          <button
            className={`ptit-tab-pill ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            Tất cả
          </button>
          <button
            className={`ptit-tab-pill ${statusFilter === "PENDING" ? "active" : ""}`}
            onClick={() => setStatusFilter("PENDING")}
          >
            Chờ duyệt
          </button>
          <button
            className={`ptit-tab-pill ${statusFilter === "APPROVED" ? "active" : ""}`}
            onClick={() => setStatusFilter("APPROVED")}
          >
            Đã duyệt
          </button>
          <button
            className={`ptit-tab-pill ${statusFilter === "REJECTED" ? "active" : ""}`}
            onClick={() => setStatusFilter("REJECTED")}
          >
            Đã từ chối
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--invalid-bg)", color: "var(--invalid)", padding: "0.85rem", borderRadius: "8px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Requests Table */}
      <div className="ptit-card">
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            Đang tải danh sách yêu cầu...
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontStyle: "italic" }}>
            Không có yêu cầu điều chỉnh điểm nào.
          </div>
        ) : (
          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>ID</th>
                  <th>Sinh viên</th>
                  <th>Lớp / Môn học</th>
                  <th style={{ textAlign: "center" }}>Điểm cũ</th>
                  <th style={{ textAlign: "center" }}>Điểm mới</th>
                  <th>Lý do & Minh chứng</th>
                  <th>Người đề xuất</th>
                  <th>Thời gian</th>
                  <th style={{ textAlign: "center" }}>Trạng thái</th>
                  {user.role === "ADMIN" && (
                    <th style={{ textAlign: "center", width: "160px" }}>Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td style={{ textAlign: "center", color: "#64748b" }}>#{r.id}</td>
                    <td>
                      <div><strong>{r.studentName}</strong></div>
                      <div className="mono" style={{ fontSize: "0.75rem", color: "var(--primary-ptit)" }}>
                        {r.studentCode}
                      </div>
                    </td>
                    <td>
                      <div><strong>{r.offeringCode || "Lớp chung"}</strong></div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.courseName || "-"}</div>
                    </td>
                    <td style={{ textAlign: "center", color: "#64748b", textDecoration: "line-through" }}>
                      {r.currentScore}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <strong style={{ color: "var(--primary-ptit)", fontSize: "1rem" }}>
                        {r.proposedScore}
                      </strong>
                    </td>
                    <td style={{ maxWidth: "250px" }}>
                      <div style={{ fontWeight: 500, color: "#1f2937" }}>{r.reason}</div>
                      {r.evidenceAttachment && (
                        <div style={{ fontSize: "0.75rem", color: "#0284c7", marginTop: "0.2rem" }}>
                          📎 {r.evidenceAttachment}
                        </div>
                      )}
                      {r.reviewNote && (
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem", fontStyle: "italic" }}>
                          Phản hồi: {r.reviewNote} ({r.reviewedBy})
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{r.requestedBy}</span>
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {formatDate(r.requestedAt)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        className={`badge ${
                          r.status === "APPROVED"
                            ? "badge-valid"
                            : r.status === "REJECTED"
                            ? "badge-invalid"
                            : "badge-pending"
                        }`}
                      >
                        {r.status === "APPROVED" && "Đã duyệt"}
                        {r.status === "REJECTED" && "Đã từ chối"}
                        {r.status === "PENDING" && "Chờ duyệt"}
                      </span>
                    </td>
                    {user.role === "ADMIN" && (
                      <td style={{ textAlign: "center" }}>
                        {r.status === "PENDING" ? (
                          <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center" }}>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleOpenReview(r, "APPROVED")}
                            >
                              Duyệt
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleOpenReview(r, "REJECTED")}
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Đã xử lý</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Confirmation Modal */}
      {reviewingItem && (
        <div className="modal-overlay" onClick={() => setReviewingItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: reviewDecision === "APPROVED" ? "var(--valid)" : "var(--invalid)", fontSize: "1.05rem" }}>
                {reviewDecision === "APPROVED" ? "Phê duyệt điều chỉnh điểm" : "Từ chối yêu cầu điều chỉnh"}
              </h3>
              <button className="btn btn-outline btn-sm" onClick={() => setReviewingItem(null)}>
                ✕ Đóng
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "6px", fontSize: "0.85rem" }}>
                <div><strong>Sinh viên:</strong> {reviewingItem.studentName} ({reviewingItem.studentCode})</div>
                <div><strong>Điểm thay đổi:</strong> {reviewingItem.currentScore} ➔ <strong style={{ color: "var(--primary-ptit)" }}>{reviewingItem.proposedScore}</strong></div>
                <div><strong>Lý do:</strong> {reviewingItem.reason}</div>
              </div>

              {reviewDecision === "APPROVED" && (
                <div style={{ background: "var(--valid-bg)", border: "1px solid var(--valid-border)", padding: "0.75rem", borderRadius: "6px", fontSize: "0.82rem", color: "var(--valid)" }}>
                  Khi phê duyệt, hệ thống sẽ tự động cập nhật điểm mới và lưu vết xác thực dữ liệu.
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Ý kiến phản hồi / Ghi chú:</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setReviewingItem(null)} disabled={submittingReview}>
                Hủy
              </button>
              <button
                className={`btn ${reviewDecision === "APPROVED" ? "btn-success" : "btn-danger"}`}
                onClick={handleConfirmReview}
                disabled={submittingReview}
              >
                {submittingReview ? "Đang xử lý..." : reviewDecision === "APPROVED" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
