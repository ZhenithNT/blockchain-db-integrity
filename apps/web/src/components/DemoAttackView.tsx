import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { IntegrityCheckDetail, Score, User } from "../types";

interface DemoAttackViewProps {
  user: User | null;
}

export const DemoAttackView: React.FC<DemoAttackViewProps> = ({ user }) => {
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedScoreId, setSelectedScoreId] = useState<number | null>(null);
  const [attackType, setAttackType] = useState<"SCORE" | "HISTORY" | "DELETE">("SCORE");
  const [tamperValue, setTamperValue] = useState("10.00");
  const [historyVersion, setHistoryVersion] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<IntegrityCheckDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const loadScores = async () => {
    try {
      const list = await api.getScores({ status: "ACTIVE" });
      setScores(list);
      if (list.length > 0 && !selectedScoreId) {
        const nghia = list.find((s) => s.studentId === "B23DCAT211") || list[0];
        setSelectedScoreId(nghia.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadScores();
  }, []);

  const selectedScore = scores.find((s) => s.id === selectedScoreId);

  const handleExecuteAttack = async () => {
    if (!selectedScoreId) return;
    if (!isAdmin) {
      alert("Chỉ tài khoản ADMIN (Phòng Đào tạo) mới được phép thực hiện mô phỏng tấn công.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setCheckResult(null);

    try {
      if (attackType === "SCORE") {
        const res = await api.demoTamper(selectedScoreId, tamperValue);
        setMessage(`🚨 TẤN CÔNG 1 THÀNH CÔNG: Đã sửa lén điểm trong MySQL thành ${res.tamperedScore} (Bỏ qua Smart Contract!).`);
      } else if (attackType === "HISTORY") {
        const res = await api.demoTamperHistory(selectedScoreId, historyVersion, tamperValue);
        setMessage(`🚨 TẤN CÔNG 2 THÀNH CÔNG: Đã sửa lén bảng lịch sử score_versions (Version ${res.version}) thành ${res.tamperedScore}!`);
      } else if (attackType === "DELETE") {
        const res = await api.demoTamperDelete(selectedScoreId);
        setMessage(`🚨 TẤN CÔNG 3 THÀNH CÔNG: Đã XÓA VẬT LÝ hoàn toàn bản ghi khỏi MySQL!`);
      }

      await loadScores();

      // Automatically run integrity check to reveal detection
      try {
        const check = await api.checkIntegrity(selectedScoreId);
        setCheckResult(check);
      } catch (checkErr: any) {
        setMessage((prev) => `${prev} • Kết quả quét phát hiện: ${checkErr.message}`);
      }
    } catch (err: any) {
      setMessage(`Lỗi tấn công: ${err.message}`);
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
    } catch (err: any) {
      alert(`Lỗi đối soát: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedScoreId) return;
    if (!isAdmin) {
      alert("Chỉ tài khoản ADMIN mới có quyền khôi phục dữ liệu.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await api.demoRestore(selectedScoreId);
      setMessage(`✅ KHÔI PHỤC THÀNH CÔNG: ${res.message} (Điểm hiện tại: ${res.score.score}).`);
      await loadScores();
      const check = await api.checkIntegrity(selectedScoreId);
      setCheckResult(check);
    } catch (err: any) {
      setMessage(`Lỗi khôi phục: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Banner */}
      <div className="ptit-card">
        <div className="ptit-card-header">
          <div>
            <div className="ptit-card-title">
              <span>⚡</span>
              <span>PHÒNG THÍ NGHIỆM TẤN CÔNG & KHÔI PHỤC TOÀN VẸN (DEMO ATTACK LAB)</span>
            </div>
            <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: "0.25rem" }}>
              Mục tiêu: Chứng minh cơ chế Blockchain phát hiện được mọi can thiệp trực tiếp vào MySQL (sửa điểm, sửa lịch sử, xóa vật lý hàng) và khôi phục dữ liệu hợp lệ.
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div style={{ background: "var(--pending-bg)", border: "1px solid var(--pending-border)", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.82rem", color: "#92400e" }}>
          ⚠️ <strong>Lưu ý kiểm thử:</strong> Tính năng này giả lập các tình huống kẻ tấn công chiếm quyền Root MySQL hoặc DBA sửa lén CSDL. Hệ thống sẽ bỏ qua mọi lớp bảo vệ thông thường và chọc thẳng vào MySQL để kiểm chứng khả năng phát hiện của Smart Contract.
        </div>

        {message && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: message.includes("THÀNH CÔNG") && !message.includes("🚨") ? "var(--valid-bg)" : "var(--invalid-bg)",
              border: `1px solid ${message.includes("THÀNH CÔNG") && !message.includes("🚨") ? "var(--valid-border)" : "var(--invalid-border)"}`,
              color: message.includes("THÀNH CÔNG") && !message.includes("🚨") ? "var(--valid)" : "var(--invalid)",
            }}
          >
            {message}
          </div>
        )}
      </div>

      {/* 3 Attack Scenarios Selection Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* Step 1: Target Selection */}
        <div className="ptit-card" style={{ borderTop: "4px solid #0284c7" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0284c7", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Bước 1: Chọn Bản Ghi Mục Tiêu
          </div>
          <div className="form-group">
            <label className="form-label">Bản ghi điểm sinh viên:</label>
            <select
              className="form-select"
              value={selectedScoreId ?? ""}
              onChange={(e) => {
                setSelectedScoreId(Number(e.target.value));
                setCheckResult(null);
                setMessage(null);
              }}
            >
              {scores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.studentId} | {s.courseCode} ({s.semester}) — Điểm: {s.score}
                </option>
              ))}
            </select>
          </div>

          {selectedScore && (
            <div style={{ background: "#f8fafc", padding: "0.65rem", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.78rem" }}>
              <div>SV: <strong>{selectedScore.studentId}</strong></div>
              <div>Môn: <strong>{selectedScore.courseCode}</strong> ({selectedScore.semester})</div>
              <div>Điểm MySQL: <strong style={{ color: "var(--primary-ptit)", fontSize: "0.95rem" }}>{selectedScore.score}</strong> (v{selectedScore.version})</div>
              <div className="mono" style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "0.2rem", wordBreak: "break-all" }}>
                Key: {selectedScore.recordKey}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Choose Attack Scenario */}
        <div className="ptit-card" style={{ borderTop: "4px solid var(--invalid)" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--invalid)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Bước 2: Chọn Phương Thức Tấn Công
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "0.75rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="attackType"
                checked={attackType === "SCORE"}
                onChange={() => setAttackType("SCORE")}
              />
              <span>1. Sửa trực tiếp điểm trong bảng <code>scores</code></span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="attackType"
                checked={attackType === "HISTORY"}
                onChange={() => setAttackType("HISTORY")}
              />
              <span>2. Sửa lén bản ghi lịch sử <code>score_versions</code></span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="attackType"
                checked={attackType === "DELETE"}
                onChange={() => setAttackType("DELETE")}
              />
              <span>3. Xóa vật lý bản ghi khỏi MySQL (Physical DELETE)</span>
            </label>
          </div>

          {attackType !== "DELETE" && (
            <div className="form-group">
              <label className="form-label">Giá trị điểm sửa lén thành:</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                className="form-input"
                value={tamperValue}
                onChange={(e) => setTamperValue(e.target.value)}
              />
            </div>
          )}

          {attackType === "HISTORY" && (
            <div className="form-group">
              <label className="form-label">Chọn phiên bản lịch sử cần can thiệp:</label>
              <input
                type="number"
                min="1"
                max="10"
                className="form-input"
                value={historyVersion}
                onChange={(e) => setHistoryVersion(Number(e.target.value))}
              />
            </div>
          )}

          <button
            className="btn btn-danger"
            style={{ width: "100%", marginTop: "0.25rem" }}
            onClick={handleExecuteAttack}
            disabled={loading || !isAdmin}
          >
            {loading ? "⏳ Đang thực thi..." : "💥 Kích Hoạt Tấn Công MySQL"}
          </button>
        </div>

        {/* Step 3: Verification & Restore */}
        <div className="ptit-card" style={{ borderTop: "4px solid var(--valid)" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--valid)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Bước 3: Đối Soát & Khôi Phục Dữ Liệu
          </div>
          <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.85rem" }}>
            Checker tính lại SHA-256 từ các giá trị thô và so sánh với bằng chứng bất biến trên Hardhat Blockchain. Khôi phục sẽ đồng bộ lại trạng thái từ on-chain evidence.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            <button
              className="btn btn-primary"
              onClick={handleVerify}
              disabled={loading || !selectedScoreId}
            >
              🔍 Đối Soát Với Blockchain Ngay
            </button>

            <button
              className="btn btn-success"
              onClick={handleRestore}
              disabled={loading || !isAdmin || !selectedScoreId}
            >
              🔄 1-Click Khôi Phục Dữ Liệu Hợp Lệ
            </button>
          </div>
        </div>
      </div>

      {/* Verification Result Card */}
      {checkResult && (
        <div
          className="ptit-card"
          style={{
            borderLeft: `6px solid ${checkResult.result === "VALID" ? "var(--valid)" : "var(--invalid)"}`,
            background: checkResult.result === "VALID" ? "var(--valid-bg)" : "var(--invalid-bg)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.4rem" }}>
                {checkResult.result === "VALID" ? "🛡️" : "🚨"}
              </span>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: checkResult.result === "VALID" ? "var(--valid)" : "var(--invalid)" }}>
                  KẾT QUẢ ĐỐI SOÁT: {checkResult.result}
                </h3>
                {checkResult.reason && (
                  <span className="badge badge-invalid" style={{ marginTop: "0.2rem" }}>
                    Lỗi: {checkResult.reason}
                  </span>
                )}
              </div>
            </div>

            <span className={`badge ${checkResult.result === "VALID" ? "badge-valid" : "badge-invalid"}`} style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}>
              {checkResult.result}
            </span>
          </div>

          <p style={{ fontSize: "0.9rem", color: "#1f2937", lineHeight: 1.5 }}>
            {checkResult.message}
          </p>

          {/* Comparison Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.85rem", fontSize: "0.78rem" }}>
            <div style={{ background: "#ffffff", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong style={{ color: "#0284c7" }}>Hash tính lại từ dữ liệu MySQL:</strong>
              <div className="mono" style={{ color: "#1e293b", wordBreak: "break-all", marginTop: "0.2rem" }}>
                {checkResult.databaseHash}
              </div>
              <div style={{ color: "#64748b", fontSize: "0.72rem", marginTop: "0.25rem" }}>
                Điểm: {checkResult.databaseScore} • Version: {checkResult.databaseVersion} • Trạng thái: {checkResult.databaseStatus}
              </div>
            </div>

            <div style={{ background: "#ffffff", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong style={{ color: checkResult.result === "VALID" ? "var(--valid)" : "var(--invalid)" }}>
                Hash lưu trên Blockchain Smart Contract (Bất biến):
              </strong>
              <div className="mono" style={{ color: checkResult.result === "VALID" ? "var(--valid)" : "var(--invalid)", wordBreak: "break-all", marginTop: "0.2rem", fontWeight: 700 }}>
                {checkResult.blockchainHash || "N/A"}
              </div>
              <div style={{ color: "#64748b", fontSize: "0.72rem", marginTop: "0.25rem" }}>
                Phiên bản trên Chain: v{checkResult.blockchainVersion ?? "N/A"} • Hành động: {checkResult.blockchainAction || "N/A"}
              </div>
            </div>
          </div>

          {/* Level 2 History Checks */}
          {checkResult.historyChecks && checkResult.historyChecks.length > 0 && (
            <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed #cbd5e1" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                Kết quả kiểm tra từng phiên bản lịch sử (Level 2 Deep Check):
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {checkResult.historyChecks.map((h) => (
                  <span
                    key={h.version}
                    className={`badge ${h.matches ? "badge-valid" : "badge-invalid"}`}
                    style={{ fontSize: "0.72rem" }}
                  >
                    v{h.version}: {h.matches ? "VALID" : "INVALID"} ({h.databaseAction})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
