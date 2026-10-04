import React, { useState } from "react";
import { api } from "../api";
import type { NotificationItem } from "../types";

interface AnnouncementViewProps {
  notifications: NotificationItem[];
  onRefresh: () => void;
}

export const AnnouncementView: React.FC<AnnouncementViewProps> = ({
  notifications,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [selectedItem, setSelectedItem] = useState<NotificationItem | null>(null);

  const filteredList = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.isRead;
    return true;
  });

  const handleItemClick = async (item: NotificationItem) => {
    setSelectedItem(item);
    if (!item.isRead) {
      try {
        await api.markNotificationAsRead(item.id);
        onRefresh();
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="ptit-card" style={{ maxWidth: "1050px", margin: "0 auto" }}>
      {/* Header matching screenshot */}
      <div className="ptit-card-header">
        <div className="ptit-card-title">
          <span>THÔNG BÁO</span>
        </div>
      </div>

      {/* Filter Tabs matching screenshot */}
      <div className="ptit-tab-container">
        <button
          className={`ptit-tab-pill ${filter === "ALL" ? "active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          Tất cả
        </button>
        <button
          className={`ptit-tab-pill ${filter === "UNREAD" ? "active" : ""}`}
          onClick={() => setFilter("UNREAD")}
        >
          Chưa đọc
        </button>
      </div>

      {/* Notification List matching screenshot */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {filteredList.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontStyle: "italic" }}>
            Không có thông báo nào trong mục này.
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className="ptit-noti-item"
              onClick={() => handleItemClick(item)}
            >
              <div className="ptit-noti-left">
                <div className={`ptit-noti-title ${!item.isRead ? "unread" : ""}`}>
                  {item.title}
                </div>
                <div className="ptit-noti-date">{formatDate(item.createdAt)}</div>
              </div>

              {!item.isRead && <div className="ptit-noti-dot" title="Chưa đọc" />}
            </div>
          ))
        )}
      </div>

      {/* Announcement Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--primary-ptit)", fontSize: "1.05rem" }}>
                Chi tiết thông báo
              </h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedItem(null)}
              >
                ✕ Đóng
              </button>
            </div>
            <div className="modal-body">
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem" }}>
                {selectedItem.title}
              </h4>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: "1rem" }}>
                Ngày đăng: {formatDate(selectedItem.createdAt)} • Chuyên mục: {selectedItem.category}
              </div>
              <div
                style={{
                  background: "#f9fafb",
                  padding: "1.25rem",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  lineHeight: 1.6,
                  color: "#374151",
                  whiteSpace: "pre-line",
                  fontSize: "0.9rem",
                }}
              >
                {selectedItem.content}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setSelectedItem(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
