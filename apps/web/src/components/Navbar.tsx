import React, { useState } from "react";
import type { NotificationItem, User } from "../types";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  notifications,
  onOpenNotifications,
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
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
      {/* Brand / Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "6px",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: "1.1rem",
            color: "var(--primary-ptit)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          PT
        </div>
        <div>
          <div style={{ fontSize: "0.98rem", fontWeight: 700, letterSpacing: "0.01em", textTransform: "uppercase" }}>
            CỔNG THÔNG TIN QUẢN LÝ ĐÀO TẠO
          </div>
          <div style={{ fontSize: "0.72rem", opacity: 0.85 }}>
            Học viện Công nghệ Bưu chính Viễn thông
          </div>
        </div>
      </div>

      {/* User Section */}
      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* User profile pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              background: "rgba(0, 0, 0, 0.12)",
              padding: "0.3rem 0.75rem",
              borderRadius: "9999px",
            }}
          >
            {/* Avatar Circle */}
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#ffffff",
                color: "var(--primary-ptit)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.85rem",
                overflow: "hidden",
                border: "2px solid #ffffff",
              }}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                user.fullName ? user.fullName.charAt(0) : user.username.charAt(0).toUpperCase()
              )}
            </div>

            {/* Name & Code */}
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                {user.fullName || user.username}
              </span>
              <span style={{ fontSize: "0.72rem", opacity: 0.9 }}>
                {user.studentCode || user.lecturerCode || user.role}
              </span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: "0.35rem",
                padding: "4px",
              }}
              title="Thông báo"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-4px",
                    background: "#ffffff",
                    color: "var(--primary-ptit)",
                    borderRadius: "50%",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    width: "15px",
                    height: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                padding: "4px",
                opacity: 0.85,
              }}
              title="Đăng xuất"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Hệ thống quản lý đào tạo</span>
      )}
    </header>
  );
};
