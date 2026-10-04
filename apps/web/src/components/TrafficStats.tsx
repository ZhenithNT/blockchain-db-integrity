import React, { useState } from "react";

export const TrafficStats: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      {/* Traffic Stats Box */}
      <div className="traffic-stats-widget">
        <div className="traffic-stats-title">THỐNG KÊ TRUY CẬP</div>
        <div className="traffic-stats-row">
          <span>Đang truy cập:</span>
          <span className="traffic-stats-badge">174</span>
        </div>
        <div className="traffic-stats-row">
          <span>Sinh viên:</span>
          <span className="traffic-stats-badge">95</span>
        </div>
        <div className="traffic-stats-row">
          <span>Giảng viên:</span>
          <span className="traffic-stats-badge">2</span>
        </div>
      </div>

      {/* Floating Phone/Support Button */}
      <div
        className="floating-phone-btn"
        onClick={() => setShowHelp(!showHelp)}
        title="Thông tin liên hệ hỗ trợ"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
        </svg>
      </div>

      {/* Quick Help Dialog */}
      {showHelp && (
        <div
          style={{
            position: "fixed",
            bottom: "5rem",
            right: "18rem",
            background: "#ffffff",
            borderRadius: "10px",
            padding: "1rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            border: "1px solid #e5e7eb",
            zIndex: 60,
            width: "280px",
            fontSize: "0.82rem",
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--primary-ptit)", marginBottom: "0.5rem" }}>
            Thông tin hỗ trợ đào tạo
          </div>
          <p style={{ color: "#4b5563", marginBottom: "0.4rem" }}>
            Hotline Phòng Đào tạo: <strong>024.3756.2186</strong>
          </p>
          <p style={{ color: "#4b5563", marginBottom: "0.4rem" }}>
            Hỗ trợ kỹ thuật: <strong>daotao@ptit.edu.vn</strong>
          </p>
          <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "#f8fafc", borderRadius: "6px", fontSize: "0.75rem", color: "#64748b" }}>
            Thời gian hỗ trợ: 08:00 - 17:00 từ Thứ Hai đến Thứ Sáu.
          </div>
        </div>
      )}
    </>
  );
};
