import React from "react";
import type { User } from "../types";

export type TabKey =
  | "announcements"
  | "my-grades"
  | "offerings"
  | "academic"
  | "scores"
  | "change-requests"
  | "integrity"
  | "audit-logs"
  | "demo-attack"
  | "program"
  | "register"
  | "timetable"
  | "tuition";

interface SidebarProps {
  user: User;
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, onSelectTab }) => {
  const role = user.role;

  return (
    <aside className="app-sidebar">
      {/* Home Category Header */}
      <div className="sidebar-category">
        <span style={{ fontSize: "1.1rem" }}>🏠</span>
        <span>Trang chủ</span>
      </div>

      {/* Menu items */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* All roles have announcements */}
        <div
          className={`sidebar-menu-item ${activeTab === "announcements" ? "active" : ""}`}
          onClick={() => onSelectTab("announcements")}
        >
          <span>📢</span>
          <span>Thông báo</span>
        </div>

        {/* Student Specific */}
        {role === "STUDENT" && (
          <>
            <div
              className={`sidebar-menu-item ${activeTab === "my-grades" ? "active" : ""}`}
              onClick={() => onSelectTab("my-grades")}
            >
              <span>🎓</span>
              <span>Bảng điểm cá nhân</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "program" ? "active" : ""}`}
              onClick={() => onSelectTab("program")}
            >
              <span>📋</span>
              <span>Chương trình đào tạo</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "register" ? "active" : ""}`}
              onClick={() => onSelectTab("register")}
            >
              <span>📝</span>
              <span>Đăng ký môn học</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "tuition" ? "active" : ""}`}
              onClick={() => onSelectTab("tuition")}
            >
              <span>💳</span>
              <span>Học phí</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "timetable" ? "active" : ""}`}
              onClick={() => onSelectTab("timetable")}
            >
              <span>📅</span>
              <span>Thời khóa biểu</span>
            </div>
          </>
        )}

        {/* Lecturer Specific */}
        {role === "LECTURER" && (
          <>
            <div
              className={`sidebar-menu-item ${activeTab === "offerings" ? "active" : ""}`}
              onClick={() => onSelectTab("offerings")}
            >
              <span>📚</span>
              <span>Lớp học phần</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "scores" ? "active" : ""}`}
              onClick={() => onSelectTab("scores")}
            >
              <span>📝</span>
              <span>Quản lý điểm thi</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "change-requests" ? "active" : ""}`}
              onClick={() => onSelectTab("change-requests")}
            >
              <span>✍️</span>
              <span>Yêu cầu sửa điểm</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "integrity" ? "active" : ""}`}
              onClick={() => onSelectTab("integrity")}
            >
              <span>🔍</span>
              <span>Kiểm tra toàn vẹn điểm</span>
            </div>
          </>
        )}

        {/* Admin Specific */}
        {role === "ADMIN" && (
          <>
            <div
              className={`sidebar-menu-item ${activeTab === "academic" ? "active" : ""}`}
              onClick={() => onSelectTab("academic")}
            >
              <span>🏛️</span>
              <span>Quản lý đào tạo</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "offerings" ? "active" : ""}`}
              onClick={() => onSelectTab("offerings")}
            >
              <span>📚</span>
              <span>Lớp học phần & duyệt điểm</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "scores" ? "active" : ""}`}
              onClick={() => onSelectTab("scores")}
            >
              <span>📝</span>
              <span>Quản lý điểm thi</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "change-requests" ? "active" : ""}`}
              onClick={() => onSelectTab("change-requests")}
            >
              <span>✍️</span>
              <span>Duyệt yêu cầu sửa điểm</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "integrity" ? "active" : ""}`}
              onClick={() => onSelectTab("integrity")}
            >
              <span>🔍</span>
              <span>Kiểm tra toàn vẹn điểm</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "audit-logs" ? "active" : ""}`}
              onClick={() => onSelectTab("audit-logs")}
            >
              <span>📜</span>
              <span>Nhật ký hệ thống</span>
            </div>
          </>
        )}

        {/* Auditor Specific */}
        {role === "AUDITOR" && (
          <>
            <div
              className={`sidebar-menu-item ${activeTab === "integrity" ? "active" : ""}`}
              onClick={() => onSelectTab("integrity")}
            >
              <span>🔍</span>
              <span>Kiểm tra toàn vẹn điểm</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "audit-logs" ? "active" : ""}`}
              onClick={() => onSelectTab("audit-logs")}
            >
              <span>📜</span>
              <span>Nhật ký hệ thống</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "offerings" ? "active" : ""}`}
              onClick={() => onSelectTab("offerings")}
            >
              <span>📚</span>
              <span>Bảng điểm theo lớp</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "scores" ? "active" : ""}`}
              onClick={() => onSelectTab("scores")}
            >
              <span>📝</span>
              <span>Bảng điểm sinh viên</span>
            </div>
            <div
              className={`sidebar-menu-item ${activeTab === "change-requests" ? "active" : ""}`}
              onClick={() => onSelectTab("change-requests")}
            >
              <span>✍️</span>
              <span>Yêu cầu sửa điểm</span>
            </div>
          </>
        )}
      </div>

      {/* Sidebar Footer matching PTIT portal */}
      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "var(--primary-ptit)",
              color: "#ffffff",
              fontSize: "0.75rem",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            PTIT
          </div>
          <div style={{ textAlign: "left", lineHeight: 1.1 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--primary-ptit)" }}>
              HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG
            </div>
            <div style={{ fontSize: "0.62rem", color: "#6b7280" }}>
              CỔNG THÔNG TIN QUẢN LÝ ĐÀO TẠO
            </div>
          </div>
        </div>
        <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>
          BCVT V 2026.09H.17<br />Design by aqtech.vn & Blockchain Core
        </div>
      </div>
    </aside>
  );
};
