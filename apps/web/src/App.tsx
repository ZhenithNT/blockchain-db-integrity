import React, { useState } from "react";
import { api, clearAuthSession, getStoredUser } from "./api";
import { AddEditScoreModal } from "./components/AddEditScoreModal";
import { DashboardView } from "./components/DashboardView";
import { DemoAttackView } from "./components/DemoAttackView";
import { IntegrityCheckView } from "./components/IntegrityCheckView";
import { LoginModal } from "./components/LoginModal";
import { Navbar } from "./components/Navbar";
import { ScoreDetailModal } from "./components/ScoreDetailModal";
import { ScoreListView } from "./components/ScoreListView";
import type { Score, User } from "./types";

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [activeTab, setActiveTab] = useState<"dashboard" | "scores" | "integrity" | "demo">("dashboard");

  // Modal states
  const [detailScore, setDetailScore] = useState<Score | null>(null);
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [isAddingScore, setIsAddingScore] = useState(false);

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
  };

  const handleSwitchRole = async (roleName: string) => {
    const passwords: Record<string, string> = {
      admin: "Admin@123",
      lecturer: "Lecturer@123",
      auditor: "Auditor@123",
    };

    try {
      const res = await api.login(roleName, passwords[roleName] || "Admin@123");
      setUser(res.user);
    } catch (err: any) {
      alert(`Đổi vai trò thất bại: ${err.message}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
      />

      <main className="container" style={{ flex: 1, padding: "2rem 1.5rem" }}>
        {!user ? (
          <LoginModal onLoginSuccess={(u) => setUser(u)} />
        ) : (
          <>
            {activeTab === "dashboard" && (
              <DashboardView
                onNavigateToScores={() => setActiveTab("scores")}
                onNavigateToIntegrity={() => setActiveTab("integrity")}
                onNavigateToDemo={() => setActiveTab("demo")}
              />
            )}

            {activeTab === "scores" && (
              <ScoreListView
                user={user}
                onViewDetail={(sc) => setDetailScore(sc)}
                onAddScore={() => setIsAddingScore(true)}
                onEditScore={(sc) => setEditingScore(sc)}
              />
            )}

            {activeTab === "integrity" && <IntegrityCheckView />}

            {activeTab === "demo" && <DemoAttackView user={user} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", background: "#0f172a", padding: "1.25rem 0", textAlign: "center", fontSize: "0.8rem", color: "#64748b" }}>
        <div className="container">
          Đề tài nghiên cứu: <strong>Ứng dụng Blockchain trong kiểm tra tính toàn vẹn cơ sở dữ liệu</strong> | Hardhat 3 • Solidity 0.8.34 • Viem • Express • MySQL • React Vite
        </div>
      </footer>

      {/* Modals */}
      {detailScore && (
        <ScoreDetailModal
          score={detailScore}
          onClose={() => setDetailScore(null)}
        />
      )}

      {(isAddingScore || editingScore) && (
        <AddEditScoreModal
          scoreToEdit={editingScore}
          onClose={() => {
            setIsAddingScore(false);
            setEditingScore(null);
          }}
          onSuccess={() => {
            setIsAddingScore(false);
            setEditingScore(null);
            // Refresh view
            setActiveTab("scores");
          }}
        />
      )}
    </div>
  );
};
