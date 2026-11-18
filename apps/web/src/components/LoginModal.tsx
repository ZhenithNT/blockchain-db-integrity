import React, { useState } from "react";
import { api } from "../api";
import type { User } from "../types";

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "4rem 1rem" }}>
      <form className="ptit-card" onSubmit={submit} style={{ width: "100%", maxWidth: 400 }}>
        <div className="ptit-card-header">
          <div className="ptit-card-title">ĐĂNG NHẬP</div>
        </div>

        {error && (
          <div className="badge badge-invalid" style={{ marginBottom: "1rem", whiteSpace: "normal" }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Tên đăng nhập</label>
          <input
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Mật khẩu</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <div className="muted" style={{ marginTop: "1rem", lineHeight: 1.6 }}>
          Tài khoản mẫu: <span className="mono">admin</span> hoặc <span className="mono">admin2</span>, mật khẩu{" "}
          <span className="mono">Admin@123</span>. Mỗi tài khoản có ví blockchain riêng, tạo ở lần đăng nhập đầu.
        </div>
      </form>
    </div>
  );
};
