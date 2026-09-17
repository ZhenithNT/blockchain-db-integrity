import React from "react";
import type { User } from "../types";

interface NavbarProps {
  user: User | null;
  activeTab: "dashboard" | "scores" | "integrity" | "demo";
  setActiveTab: (tab: "dashboard" | "scores" | "integrity" | "demo") => void;
  onLogout: () => void;
  onSwitchRole: (username: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  onSwitchRole,
}) => {
  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "#0f172a", position: "sticky", top: 0, zIndex: 40 }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "70px" }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }} onClick={() => setActiveTab("dashboard")}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", boxShadow: "0 0 12px rgba(59, 130, 246, 0.5)" }}>
            ⛓️
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em", color: "#f8fafc" }}>
              Blockchain DB Integrity
            </div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              Bảo vệ toàn vẹn CSDL bằng Smart Contract
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              className={`btn btn-sm ${activeTab === "dashboard" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActiveTab("dashboard")}
            >
              📊 Tổng quan
            </button>
            <button
              className={`btn btn-sm ${activeTab === "scores" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActiveTab("scores")}
            >
              🎓 Quản lý Điểm
            </button>
            <button
              className={`btn btn-sm ${activeTab === "integrity" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActiveTab("integrity")}
            >
              🔍 Kiểm tra Toàn vẹn
            </button>
            <button
              className={`btn btn-sm ${activeTab === "demo" ? "btn-warning" : "btn-outline"}`}
              onClick={() => setActiveTab("demo")}
              style={{ fontWeight: 700 }}
            >
              ⚡ Demo Tấn công
            </button>
          </nav>
        )}

        {/* User Info & Role Switcher */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                <strong>{user.username}</strong>
              </span>
              <span className={`badge ${user.role === "ADMIN" ? "badge-role" : user.role === "LECTURER" ? "badge-valid" : "badge-pending"}`}>
                {user.role}
              </span>
            </div>

            {/* Quick Demo Switch */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "#1e293b", padding: "0.25rem", borderRadius: "8px", border: "1px solid #334155" }}>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8", padding: "0 0.3rem" }}>Đổi vai:</span>
              <button
                className="btn btn-sm"
                style={{ padding: "0.2rem 0.45rem", fontSize: "0.7rem", background: user.role === "ADMIN" ? "#3b82f6" : "transparent" }}
                onClick={() => onSwitchRole("admin")}
                title="Đăng nhập tài khoản ADMIN"
              >
                Admin
              </button>
              <button
                className="btn btn-sm"
                style={{ padding: "0.2rem 0.45rem", fontSize: "0.7rem", background: user.role === "LECTURER" ? "#3b82f6" : "transparent" }}
                onClick={() => onSwitchRole("lecturer")}
                title="Đăng nhập tài khoản GIẢNG VIÊN"
              >
                Giảng viên
              </button>
              <button
                className="btn btn-sm"
                style={{ padding: "0.2rem 0.45rem", fontSize: "0.7rem", background: user.role === "AUDITOR" ? "#3b82f6" : "transparent" }}
                onClick={() => onSwitchRole("auditor")}
                title="Đăng nhập tài khoản KIỂM TOÁN VIÊN"
              >
                Kiểm toán
              </button>
            </div>

            <button className="btn btn-outline btn-sm" onClick={onLogout} title="Đăng xuất">
              Đăng xuất
            </button>
          </div>
        ) : (
          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Chưa đăng nhập</span>
        )}
      </div>
    </header>
  );
};
