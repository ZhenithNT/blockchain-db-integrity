import React, { useState } from "react";
import { clearAuthSession, getStoredUser } from "./api";
import { AddEditScoreModal } from "./components/AddEditScoreModal";
import { AuditLogsView } from "./components/AuditLogsView";
import { IntegrityCheckView } from "./components/IntegrityCheckView";
import { LoginModal } from "./components/LoginModal";
import { Navbar } from "./components/Navbar";
import { ScoreDetailModal } from "./components/ScoreDetailModal";
import { ScoreListView } from "./components/ScoreListView";
import { Sidebar, type TabKey } from "./components/Sidebar";
import { WalletsView } from "./components/WalletsView";
import type { Score, User } from "./types";

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [activeTab, setActiveTab] = useState<TabKey>("scores");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [scoreToEdit, setScoreToEdit] = useState<Score | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [listKey, setListKey] = useState(0);

  const logout = () => {
    clearAuthSession();
    setUser(null);
  };

  return (
    <div className="app-layout">
      <Navbar user={user} onLogout={logout} />

      {!user ? (
        <LoginModal
          onLoginSuccess={(u) => {
            setUser(u);
            setActiveTab("scores");
          }}
        />
      ) : (
        <div className="app-body">
          <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

          <main className="app-main">
            {activeTab === "scores" && (
              <ScoreListView
                key={listKey}
                onViewDetail={(s) => setDetailId(s.id)}
                onAddScore={() => {
                  setScoreToEdit(null);
                  setIsAddOpen(true);
                }}
                onEditScore={(s) => {
                  setScoreToEdit(s);
                  setIsAddOpen(true);
                }}
              />
            )}
            {activeTab === "integrity" && <IntegrityCheckView onViewDetail={(id) => setDetailId(id)} />}
            {activeTab === "wallets" && <WalletsView />}
            {activeTab === "audit-logs" && <AuditLogsView />}
          </main>
        </div>
      )}

      {isAddOpen && (
        <AddEditScoreModal
          scoreToEdit={scoreToEdit}
          onClose={() => {
            setIsAddOpen(false);
            setScoreToEdit(null);
          }}
          onSuccess={() => {
            setIsAddOpen(false);
            setScoreToEdit(null);
            setListKey((k) => k + 1);
          }}
        />
      )}

      {detailId !== null && <ScoreDetailModal scoreId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
};
