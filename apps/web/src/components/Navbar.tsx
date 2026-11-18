import React from "react";
import type { User } from "../types";
import { shortHash } from "./ui";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => (
  <header
    style={{
      background: "var(--bg-header)",
      color: "#ffffff",
      height: "60px",
      padding: "0 1.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
      position: "sticky",
      top: 0,
      zIndex: 60,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          color: "var(--primary-ptit)",
        }}
      >
        PT
      </div>
      <div>
        <div style={{ fontSize: "0.98rem", fontWeight: 700, textTransform: "uppercase" }}>
          Toàn vẹn điểm bằng blockchain
        </div>
        <div style={{ fontSize: "0.72rem", opacity: 0.85 }}>Học viện Công nghệ Bưu chính Viễn thông</div>
      </div>
    </div>

    {user && (
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ textAlign: "right", lineHeight: 1.25 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{user.fullName}</div>
          <div className="mono" style={{ fontSize: "0.72rem", opacity: 0.9 }} title={user.walletAddress || ""}>
            ví {user.walletAddress ? shortHash(user.walletAddress, 8, 6) : "chưa có"}
          </div>
        </div>
        <button className="btn btn-sm" onClick={onLogout} style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
          Đăng xuất
        </button>
      </div>
    )}
  </header>
);
