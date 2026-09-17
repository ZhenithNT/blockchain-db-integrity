import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { IntegrityCheckDetail, Score, User } from "../types";

interface DemoAttackViewProps {
  user: User | null;
}

export const DemoAttackView: React.FC<DemoAttackViewProps> = ({ user }) => {
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedScoreId, setSelectedScoreId] = useState<number | null>(null);
  const [tamperValue, setTamperValue] = useState("10.00");
  const [loading, setLoading] = useState(false);
  const [attacked, setAttacked] = useState(false);
  const [checkResult, setCheckResult] = useState<IntegrityCheckDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const loadScores = async () => {
    try {
      const list = await api.getScores({ status: "ACTIVE" });
      setScores(list);
      if (list.length > 0 && !selectedScoreId) {
        // Ưu tiên chọn SV001
        const sv001 = list.find((s) => s.studentId === "SV001") || list[0];
        setSelectedScoreId(sv001.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadScores();
  }, []);

  const selectedScore = scores.find((s) => s.id === selectedScoreId);

  const handleTamper = async () => {
    if (!selectedScoreId) return;
    if (!isAdmin) {
      alert("Chỉ tài khoản ADMIN mới có quyền thực hiện mô phỏng tấn công CSDL.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await api.demoTamper(selectedScoreId, tamperValue);
      setAttacked(true);
      setMessage(
        `🚨 ĐÃ GIẢ MẠO ĐIỂM TRỰC TIẾP TRONG MYSQL: ${res.originalScore} ➔ ${res.tamperedScore} (Bỏ qua Smart Contract!).`
      );
      await loadScores();
      // Tự động chạy kiểm tra để thấy ngay kết quả INVALID
      const check = await api.checkIntegrity(selectedScoreId);
      setCheckResult(check);
    } catch (err: any) {
      setMessage(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedScoreId) return;
    setLoading(true);
    try {
      const check = await api.checkIntegrity(selectedScoreId);
      setCheckResult(check);
      await loadScores();
    } catch (err: any) {
      alert(`Lỗi kiểm tra: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedScoreId) return;
    if (!isAdmin) {
      alert("Chỉ tài khoản ADMIN mới có quyền thực hiện khôi phục.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await api.demoRestore(selectedScoreId);
      setAttacked(false);
      setMessage(`✓ ${res.message} (Điểm hiện tại: ${res.score.score}).`);
      await loadScores();
      // Kiểm tra lại tính toàn vẹn
      const check = await api.checkIntegrity(selectedScoreId);
      setCheckResult(check);
    } catch (err: any) {
      setMessage(`Lỗi khôi phục: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>⚡</span>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
            Kịch Bản Thuyết Trình: Mô Phỏng Tấn Công & Phát Hiện Giả Mạo
          </h1>
        </div>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          Trực quan hóa cách Blockchain bảo vệ dữ liệu trước hành vi sửa lén CSDL từ quản trị viên bất chính hoặc hacker xâm nhập MySQL
        </p>
      </div>

      {/* Warning Banner */}
      <div style={{ background: "rgba(234, 179, 8, 0.1)", border: "1px solid #eab308", borderRadius: "10px", padding: "1rem", color: "#fef08a", fontSize: "0.85rem" }}>
        ⚠️ <strong>Cảnh Báo Thử Nghiệm:</strong> Tính năng này chỉ hoạt động khi <code>ENABLE_DEMO_ATTACKS=true</code> trong file <code>.env</code> và người dùng đăng nhập tài khoản <code>ADMIN</code>. Mọi thao tác đều được ghi vết vào bảng <code>audit_logs</code>.
      </div>

      {message && (
        <div style={{ background: attacked ? "rgba(239, 68, 68, 0.15)" : "#1e293b", border: `1px solid ${attacked ? "#ef4444" : "#10b981"}`, color: attacked ? "#fca5a5" : "#6ee7b7", padding: "0.85rem 1.25rem", borderRadius: "8px", fontSize: "0.9rem", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* 3 Steps Visual Flow */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* Step 1 */}
        <div className="card" style={{ borderTop: "4px solid #38bdf8" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>Bước 1: Chọn Bản Ghi Mục Tiêu</div>
          <div style={{ marginTop: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
              Bản ghi điểm:
            </label>
            <select
              className="input-field"
              value={selectedScoreId || ""}
              onChange={(e) => {
                setSelectedScoreId(Number(e.target.value));
                setCheckResult(null);
                setMessage(null);
              }}
            >
              {scores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.studentId} | {s.courseCode} ({s.semester}) — Hiện tại: {s.score}
                </option>
              ))}
            </select>
          </div>

          {selectedScore && (
            <div style={{ background: "#0f172a", padding: "0.75rem", borderRadius: "6px", border: "1px solid #334155", marginTop: "0.75rem", fontSize: "0.75rem" }}>
              <div>SV: <strong>{selectedScore.studentId}</strong></div>
              <div>Môn: <strong>{selectedScore.courseCode}</strong></div>
              <div>Điểm CSDL: <strong style={{ color: "#38bdf8", fontSize: "1rem" }}>{selectedScore.score}</strong> (v{selectedScore.version})</div>
            </div>
          )}
        </div>

        {/* Step 2 */}
        <div className="card" style={{ borderTop: "4px solid #ef4444" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#ef4444", textTransform: "uppercase" }}>Bước 2: Tấn Công Giả Mạo MySQL</div>
          <div style={{ marginTop: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
              Điểm số sửa lén thành:
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              className="input-field"
              value={tamperValue}
              onChange={(e) => setTamperValue(e.target.value)}
            />
          </div>

          <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.5rem" }}>
            Hành vi: Cố tình UPDATE MySQL nhưng KHÔNG gửi giao dịch đến Blockchain, KHÔNG tăng version.
          </p>

          <button
            className="btn btn-danger"
            style={{ width: "100%", marginTop: "0.75rem" }}
            onClick={handleTamper}
            disabled={loading || !isAdmin}
          >
            {loading ? "⏳ Đang thực hiện..." : "💥 Kích Hoạt Tấn Công (Sửa MySQL)"}
          </button>
        </div>

        {/* Step 3 */}
        <div className="card" style={{ borderTop: "4px solid #10b981" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>Bước 3: Đối Soát & Khôi Phục</div>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Checker tính lại SHA-256 từ CSDL và so khớp với Smart Contract để vạch trần dữ liệu giả mạo.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              className="btn btn-primary"
              onClick={handleVerify}
              disabled={loading}
            >
              🔍 Đối Soát Với Blockchain
            </button>

            <button
              className="btn btn-success"
              onClick={handleRestore}
              disabled={loading || !isAdmin}
            >
              🔄 Khôi Phục Lại Dữ Liệu Hợp Lệ
            </button>
          </div>
        </div>
      </div>

      {/* Verification Result Display */}
      {checkResult && (
        <div
          className="card"
          style={{
            background: checkResult.result === "VALID" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.12)",
            border: `2px solid ${checkResult.result === "VALID" ? "#10b981" : "#ef4444"}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.5rem" }}>
                {checkResult.result === "VALID" ? "🛡️" : "🚨"}
              </span>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: checkResult.result === "VALID" ? "#34d399" : "#f87171" }}>
                  KẾT QUẢ ĐỐI SOÁT: {checkResult.result}
                </h3>
                {checkResult.reason && (
                  <span className="badge badge-invalid" style={{ marginTop: "0.2rem" }}>
                    Lý do: {checkResult.reason}
                  </span>
                )}
              </div>
            </div>

            <span className={`badge ${checkResult.result === "VALID" ? "badge-valid" : "badge-invalid"}`} style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
              {checkResult.result}
            </span>
          </div>

          <p style={{ fontSize: "0.95rem", color: checkResult.result === "VALID" ? "#d1fae5" : "#fecaca", lineHeight: 1.6 }}>
            {checkResult.message}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem", fontSize: "0.78rem" }}>
            <div style={{ background: "#0f172a", padding: "0.75rem", borderRadius: "8px", border: "1px solid #334155" }}>
              <strong style={{ color: "#38bdf8" }}>Hash được tính lại từ MySQL hiện tại:</strong>
              <div className="mono" style={{ color: "#e2e8f0", wordBreak: "break-all", marginTop: "0.2rem" }}>
                {checkResult.databaseHash}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.7rem", marginTop: "0.25rem" }}>
                Dữ liệu input: {checkResult.studentId}|{checkResult.courseCode}|{checkResult.semester}|{checkResult.databaseScore}|{checkResult.databaseVersion}|{checkResult.databaseStatus}
              </div>
            </div>

            <div style={{ background: "#0f172a", padding: "0.75rem", borderRadius: "8px", border: "1px solid #334155" }}>
              <strong style={{ color: checkResult.result === "VALID" ? "#34d399" : "#f87171" }}>
                Hash lưu trên Blockchain (Bất biến):
              </strong>
              <div className="mono" style={{ color: checkResult.result === "VALID" ? "#34d399" : "#f87171", wordBreak: "break-all", marginTop: "0.2rem" }}>
                {checkResult.blockchainHash || "N/A"}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.7rem", marginTop: "0.25rem" }}>
                Phiên bản trên chain: v{checkResult.blockchainVersion ?? "N/A"} | Hành động: {checkResult.blockchainAction || "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
