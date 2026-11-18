import React from "react";

export type TabKey = "scores" | "integrity" | "wallets" | "audit-logs";

const ITEMS: { key: TabKey; label: string }[] = [
  { key: "scores", label: "Quản lý điểm" },
  { key: "integrity", label: "Kiểm tra toàn vẹn" },
  { key: "wallets", label: "Ví và người ký" },
  { key: "audit-logs", label: "Nhật ký hệ thống" },
];

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => (
  <aside className="app-sidebar">
    <div className="sidebar-category">
      <span>Chức năng</span>
    </div>
    <div style={{ display: "flex", flexDirection: "column" }}>
      {ITEMS.map((item) => (
        <div
          key={item.key}
          className={`sidebar-menu-item ${activeTab === item.key ? "active" : ""}`}
          onClick={() => onSelectTab(item.key)}
        >
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  </aside>
);
