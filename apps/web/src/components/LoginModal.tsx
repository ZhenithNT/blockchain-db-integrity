import React, { useState } from "react";
import { api } from "../api";
import type { User } from "../types";

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(username, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "480px", padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⛓️ 🛡️</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f8fafc" }}>
            Hệ Thống Kiểm Tra Toàn Vẹn CSDL
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem" }}>
            Ứng dụng công nghệ Blockchain bảo vệ dữ liệu điểm sinh viên
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#fca5a5", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.35rem" }}>
              Tên đăng nhập
            </label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.35rem" }}>
              Mật khẩu
            </label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem", padding: "0.75rem" }}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đăng Nhập"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid #334155" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.6rem", textAlign: "center" }}>
            ⚡ Chọn nhanh tài khoản demo mẫu:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickSelect("admin", "Admin@123")}
              style={{ fontSize: "0.75rem", display: "flex", flexDirection: "column", padding: "0.4rem" }}
            >
              <strong>ADMIN</strong>
              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Toàn quyền</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickSelect("lecturer", "Lecturer@123")}
              style={{ fontSize: "0.75rem", display: "flex", flexDirection: "column", padding: "0.4rem" }}
            >
              <strong>LECTURER</strong>
              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Tạo & Sửa điểm</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickSelect("auditor", "Auditor@123")}
              style={{ fontSize: "0.75rem", display: "flex", flexDirection: "column", padding: "0.4rem" }}
            >
              <strong>AUDITOR</strong>
              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Chỉ kiểm toán</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
