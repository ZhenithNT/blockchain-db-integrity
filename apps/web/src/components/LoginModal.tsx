import React, { useState } from "react";
import { api } from "../api";
import type { User } from "../types";

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [tab, setTab] = useState<"LOGIN" | "REGISTER">("LOGIN");

  // Login form state
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@123");

  // Register form state
  const [regRole, setRegRole] = useState<"STUDENT" | "LECTURER">("STUDENT");
  const [regFullName, setRegFullName] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regExtra, setRegExtra] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!regUsername || !regPassword || !regFullName) {
      setError("Vui lòng điền đầy đủ họ tên, tên đăng nhập và mật khẩu.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.register({
        username: regUsername,
        password: regPassword,
        fullName: regFullName,
        role: regRole,
        code: regCode || undefined,
        email: regEmail || undefined,
        extraInfo: regExtra || undefined,
      });

      setSuccessMsg("Đăng ký tài khoản thành công! Đang tự động đăng nhập...");
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e1e24 0%, #2b0c0d 50%, #1f2937 100%)",
        padding: "1.5rem",
      }}
    >
      <div
        className="ptit-card"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "2.25rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          borderRadius: "16px",
          background: "#ffffff",
        }}
      >
        {/* PTIT Branding Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "14px",
              background: "var(--primary-ptit)",
              color: "#ffffff",
              fontSize: "1.5rem",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.75rem auto",
              boxShadow: "0 6px 16px rgba(152, 27, 30, 0.35)",
            }}
          >
            PTIT
          </div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary-ptit)", textTransform: "uppercase" }}>
            HỆ THỐNG QUẢN LÝ ĐÀO TẠO
          </h2>
          <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.25rem" }}>
            Học viện Công nghệ Bưu chính Viễn thông
          </p>
        </div>

        {/* Tab Switcher: Đăng nhập vs Đăng ký */}
        <div
          style={{
            display: "flex",
            background: "#f1f5f9",
            borderRadius: "8px",
            padding: "4px",
            marginBottom: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab("LOGIN");
              setError(null);
            }}
            style={{
              flex: 1,
              padding: "0.55rem 0",
              border: "none",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              background: tab === "LOGIN" ? "#ffffff" : "transparent",
              color: tab === "LOGIN" ? "var(--primary-ptit)" : "#64748b",
              boxShadow: tab === "LOGIN" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("REGISTER");
              setError(null);
            }}
            style={{
              flex: 1,
              padding: "0.55rem 0",
              border: "none",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              background: tab === "REGISTER" ? "#ffffff" : "transparent",
              color: tab === "REGISTER" ? "var(--primary-ptit)" : "#64748b",
              boxShadow: tab === "REGISTER" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            Đăng ký tài khoản
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "var(--invalid-bg)",
              border: "1px solid var(--invalid-border)",
              color: "var(--invalid)",
              padding: "0.75rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: "var(--valid-bg)",
              border: "1px solid var(--valid-border)",
              color: "var(--valid)",
              padding: "0.75rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* --- FORM ĐĂNG NHẬP --- */}
        {tab === "LOGIN" && (
          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Tên đăng nhập:</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Mật khẩu:</label>
              <input
                type="password"
                className="form-input"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                marginTop: "0.5rem",
                padding: "0.75rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                borderRadius: "8px",
              }}
              disabled={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            {/* Tài khoản mẫu tiện thử nghiệm */}
            <div style={{ marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: "0.5rem" }}>
                Tài khoản mẫu dùng thử:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => fillQuickDemo("admin", "Admin@123")}
                  style={{
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    background: "#f8fafc",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <strong>Quản trị viên (ADMIN)</strong>: <code>admin</code> / <code>Admin@123</code>
                </button>
                <div style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.4 }}>
                  Bạn có thể tạo tài khoản Sinh viên hoặc Giảng viên tại tab "Đăng ký tài khoản" ở trên.
                </div>
              </div>
            </div>
          </form>
        )}

        {/* --- FORM ĐĂNG KÝ TÀI KHOẢN MỚI --- */}
        {tab === "REGISTER" && (
          <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Bạn là:</label>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="regRole"
                    checked={regRole === "STUDENT"}
                    onChange={() => setRegRole("STUDENT")}
                  />
                  <span>Sinh viên</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="regRole"
                    checked={regRole === "LECTURER"}
                    onChange={() => setRegRole("LECTURER")}
                  />
                  <span>Giảng viên</span>
                </label>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Họ và tên:</label>
              <input
                type="text"
                className="form-input"
                placeholder={regRole === "STUDENT" ? "Ví dụ: Nguyễn Văn An" : "Ví dụ: Trần Văn Bình"}
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  {regRole === "STUDENT" ? "Mã sinh viên:" : "Mã giảng viên:"}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={regRole === "STUDENT" ? "Ví dụ: B23DCAT001" : "Ví dụ: GV001"}
                  value={regCode}
                  onChange={(e) => setRegCode(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  {regRole === "STUDENT" ? "Lớp sinh hoạt:" : "Khoa / Bộ môn:"}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={regRole === "STUDENT" ? "Ví dụ: D23CQAT01-B" : "Ví dụ: Khoa CNTT 1"}
                  value={regExtra}
                  onChange={(e) => setRegExtra(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Tên đăng nhập:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tên đăng nhập"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Mật khẩu:</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Mật khẩu tối thiểu 6 ký tự"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Email liên hệ:</label>
              <input
                type="email"
                className="form-input"
                placeholder="email@ptit.edu.vn"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                marginTop: "0.5rem",
                padding: "0.75rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                borderRadius: "8px",
              }}
              disabled={loading}
            >
              {loading ? "Đang đăng ký..." : "Đăng ký tài khoản"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
