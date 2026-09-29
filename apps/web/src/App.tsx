import React, { useEffect, useState } from "react";
import { api, clearAuthSession, getStoredUser } from "./api";
import { AnnouncementView } from "./components/AnnouncementView";
import { ChangeRequestsView } from "./components/ChangeRequestsView";
import { DemoAttackView } from "./components/DemoAttackView";
import { GradingSheetView } from "./components/GradingSheetView";
import { IntegrityCheckView } from "./components/IntegrityCheckView";
import { LoginModal } from "./components/LoginModal";
import { Navbar } from "./components/Navbar";
import { Sidebar, type TabKey } from "./components/Sidebar";
import { StudentGradeView } from "./components/StudentGradeView";
import { TrafficStats } from "./components/TrafficStats";
import { ScoreListView } from "./components/ScoreListView";
import { AddEditScoreModal } from "./components/AddEditScoreModal";
import { ScoreDetailModal } from "./components/ScoreDetailModal";
import { AcademicManagementView } from "./components/AcademicManagementView";
import { CourseRegistrationView } from "./components/CourseRegistrationView";
import type { NotificationItem, Score, User } from "./types";

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [activeTab, setActiveTab] = useState<TabKey>("announcements");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isAddScoreOpen, setIsAddScoreOpen] = useState(false);
  const [scoreToEdit, setScoreToEdit] = useState<Score | null>(null);
  const [scoreDetail, setScoreDetail] = useState<Score | null>(null);
  const [scoreListKey, setScoreListKey] = useState(0);

  // Load notifications
  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
  };

  const handleLoginSuccess = (u: User) => {
    setUser(u);
    if (u.role === "STUDENT") {
      setActiveTab("announcements");
    } else if (u.role === "LECTURER") {
      setActiveTab("offerings");
    } else if (u.role === "ADMIN") {
      setActiveTab("academic");
    } else {
      setActiveTab("integrity");
    }
  };

  return (
    <div className="app-layout">
      {/* Top Header matching PTIT */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        notifications={notifications}
        onOpenNotifications={() => setShowNotificationModal(true)}
      />

      {/* Main Body */}
      {!user ? (
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="app-body">
          {/* Left Sidebar matching PTIT */}
          <Sidebar
            user={user}
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
          />

          {/* Right Main Content */}
          <main className="app-main">
            {activeTab === "announcements" && (
              <AnnouncementView
                notifications={notifications}
                onRefresh={loadNotifications}
              />
            )}

            {activeTab === "academic" && (
              <AcademicManagementView user={user} />
            )}

            {activeTab === "offerings" && (
              <GradingSheetView user={user} />
            )}

            {activeTab === "scores" && (
              <ScoreListView
                key={scoreListKey}
                user={user}
                onViewDetail={(score) => setScoreDetail(score)}
                onAddScore={() => {
                  setScoreToEdit(null);
                  setIsAddScoreOpen(true);
                }}
                onEditScore={(score) => {
                  setScoreToEdit(score);
                  setIsAddScoreOpen(true);
                }}
              />
            )}

            {activeTab === "my-grades" && (
              <StudentGradeView user={user} />
            )}

            {activeTab === "change-requests" && (
              <ChangeRequestsView user={user} />
            )}

            {activeTab === "integrity" && (
              <IntegrityCheckView />
            )}

            {activeTab === "demo-attack" && (
              <DemoAttackView user={user} />
            )}

            {/* Mocked academic items from PTIT portal */}
            {activeTab === "program" && (
              <div className="ptit-card">
                <div className="ptit-card-header">
                  <div className="ptit-card-title">📖 CHƯƠNG TRÌNH ĐÀO TẠO KỸ SƯ AN TOÀN THÔNG TIN</div>
                </div>
                <p style={{ color: "#475569", fontSize: "0.85rem", lineHeight: 1.6 }}>
                  Ngành đào tạo: <strong>An toàn thông tin (7480202)</strong> • Khoa: An toàn thông tin • Khóa: D23CQAT • Tổng tín chỉ yêu cầu: 152 tín chỉ.
                </p>
                <div style={{ marginTop: "1rem", padding: "1rem", background: "#f8fafc", borderRadius: "8px", fontSize: "0.82rem" }}>
                  💡 Điểm các học phần cơ sở ngành (Cơ sở dữ liệu, C++) đã được ghi nhận vào sổ điểm điện tử được bảo vệ bởi Blockchain.
                </div>
              </div>
            )}

            {activeTab === "register" && (
              <CourseRegistrationView user={user} />
            )}

            {activeTab === "timetable" && (
              <div className="ptit-card">
                <div className="ptit-card-header">
                  <div className="ptit-card-title">📅 THỜI KHÓA BIỂU TUẦN HIỆN TẠI</div>
                </div>
                <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
                  Học kỳ 1 năm học 2025-2026 • Lớp D23CQAT01-B: Đã hoàn thành các đợt thi kết thúc học phần.
                </div>
              </div>
            )}

            {activeTab === "tuition" && (
              <div className="ptit-card">
                <div className="ptit-card-header">
                  <div className="ptit-card-title">💳 THÔNG TIN HỌC PHÍ & HÓA ĐƠN ĐIỆN TỬ</div>
                </div>
                <div style={{ padding: "1.5rem", textAlign: "center", color: "#059669", fontSize: "0.95rem", fontWeight: 600 }}>
                  ✅ Sinh viên đã hoàn thành 100% học phí Học kỳ 1 năm học 2025-2026.
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Access stats footer widget matching PTIT screenshot */}
      <TrafficStats />

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--primary-ptit)", fontSize: "1.05rem" }}>
                🔔 Thông báo mới nhất
              </h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowNotificationModal(false)}
              >
                ✕ Đóng
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: "0.88rem", color: "#1f2937" }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem" }}>
                    {new Date(n.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowNotificationModal(false);
                  setActiveTab("announcements");
                }}
              >
                Xem tất cả thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddScoreOpen && (
        <AddEditScoreModal
          scoreToEdit={scoreToEdit}
          onClose={() => {
            setIsAddScoreOpen(false);
            setScoreToEdit(null);
          }}
          onSuccess={() => {
            setIsAddScoreOpen(false);
            setScoreToEdit(null);
            setScoreListKey((k) => k + 1);
          }}
        />
      )}

      {scoreDetail && (
        <ScoreDetailModal
          score={scoreDetail}
          onClose={() => setScoreDetail(null)}
        />
      )}
    </div>
  );
};
