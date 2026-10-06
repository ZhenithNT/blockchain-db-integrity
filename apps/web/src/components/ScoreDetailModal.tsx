import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { IntegrityCheckDetail, Score, ScoreVersion } from "../types";

interface ScoreDetailModalProps {
  score: Score;
  onClose: () => void;
}

function extractCheckDetail(sc: Score | null): IntegrityCheckDetail | null {
  if (!sc) return null;
  if (sc.latestCheck?.details) {
    try {
      const parsed = JSON.parse(sc.latestCheck.details);
      if (parsed && typeof parsed === "object" && parsed.result) {
        return parsed as IntegrityCheckDetail;
      }
    } catch {
      // ignore JSON parse error
    }
  }
  if (sc.latestCheck) {
    return {
      scoreId: sc.id,
      studentId: sc.studentId,
      courseCode: sc.courseCode,
      semester: sc.semester,
      recordKey: sc.recordKey,
      databaseScore: sc.score,
      databaseVersion: sc.version,
      databaseHash: sc.dataHash,
      databaseStatus: sc.status,
      blockchainHash: sc.latestCheck.blockchainHash,
      blockchainVersion: sc.latestCheck.blockchainVersion,
      blockchainAction:
        sc.latestCheck.result === "VALID"
          ? sc.version === 1
            ? "CREATE"
            : "UPDATE"
          : null,
      blockchainTimestamp: sc.latestCheck.checkedAt,
      writerAddress: null,
      result: sc.latestCheck.result,
      message:
        sc.latestCheck.result === "VALID"
          ? "Dữ liệu CSDL khớp hoàn toàn với Bằng chứng toàn vẹn trên Blockchain."
          : "Dữ liệu hoặc lịch sử có dấu hiệu không khớp với Bằng chứng Blockchain.",
      checkedAt: sc.latestCheck.checkedAt,
    };
  }
  return null;
}

export const ScoreDetailModal: React.FC<ScoreDetailModalProps> = ({ score, onClose }) => {
  const [detail, setDetail] = useState<Score | null>(score);
  const [versions, setVersions] = useState<ScoreVersion[]>(score.versions || []);
  const [checkResult, setCheckResult] = useState<IntegrityCheckDetail | null>(() =>
    extractCheckDetail(score)
  );
  const [checking, setChecking] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await api.checkIntegrity(score.id);
      setCheckResult(res);
    } catch (err: any) {
      console.error("Lỗi khi kiểm tra tính toàn vẹn:", err);
    } finally {
      setChecking(false);
    }
  };

  const loadDetail = async () => {
    try {
      const [fullRes, historyRes] = await Promise.allSettled([
        api.getScoreById(score.id),
        api.getScoreHistory(score.id),
      ]);

      let fullData: Score | null = null;
      if (fullRes.status === "fulfilled") {
        fullData = fullRes.value;
        setDetail(fullData);
        if (fullData.versions && fullData.versions.length > 0) {
          setVersions(fullData.versions);
        }
        const extracted = extractCheckDetail(fullData);
        if (extracted) {
          setCheckResult(extracted);
        }
      }

      if (historyRes.status === "fulfilled" && historyRes.value && historyRes.value.length > 0) {
        setVersions(historyRes.value);
      }

      // Nếu chưa có kết quả kiểm tra nào, tự động kiểm tra ngay
      if (!checkResult && (!fullData || !fullData.latestCheck)) {
        await runCheck();
      }
    } catch (err: any) {
      console.error("Lỗi khi tải chi tiết điểm:", err);
      if (!checkResult) {
        await runCheck();
      }
    }
  };

  useEffect(() => {
    loadDetail();
  }, [score.id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const s = detail || score;
  const isMatch = checkResult?.result === "VALID";
  const isInvalid = checkResult?.result === "INVALID";

  // Fallback values when confirmed on chain
  const displayBcVersion =
    checkResult?.blockchainVersion != null
      ? checkResult.blockchainVersion
      : s.blockchainStatus === "CONFIRMED"
      ? s.version
      : null;

  const displayBcAction =
    checkResult?.blockchainAction ||
    (s.blockchainStatus === "CONFIRMED"
      ? s.status === "ACTIVE"
        ? s.version === 1
          ? "CREATE"
          : "UPDATE"
        : "DELETE"
      : null);

  const displayBcTimestamp =
    checkResult?.blockchainTimestamp
      ? new Date(checkResult.blockchainTimestamp).toLocaleString("vi-VN")
      : s.blockchainStatus === "CONFIRMED"
      ? new Date(s.updatedAt || s.createdAt).toLocaleString("vi-VN")
      : null;

  const displayBcHash =
    checkResult?.blockchainHash ||
    (isMatch
      ? s.dataHash
      : s.blockchainStatus === "CONFIRMED" && !isInvalid
      ? s.dataHash
      : null);

  // Tổng hợp danh sách phiên bản hiển thị an toàn
  const displayVersions: {
    id: number | string;
    version: number;
    score: string;
    action: string;
    dataHash: string;
    transactionHash: string | null;
    blockNumber: string | null;
    createdAt: string;
    isValid?: boolean;
    isInvalid?: boolean;
  }[] = [];

  if (versions.length > 0) {
    versions.forEach((v) => {
      const histCheck = checkResult?.historyChecks?.find((h) => h.version === v.version);
      const isHistValid = histCheck ? histCheck.matches : isMatch && v.version === s.version;
      const isHistInvalid = histCheck ? !histCheck.matches : isInvalid && v.version === s.version;
      displayVersions.push({
        id: v.id,
        version: v.version,
        score: v.score,
        action: v.action,
        dataHash: v.dataHash,
        transactionHash: v.transactionHash,
        blockNumber: v.blockNumber,
        createdAt: v.createdAt,
        isValid: isHistValid,
        isInvalid: isHistInvalid,
      });
    });
  } else if (checkResult?.historyChecks && checkResult.historyChecks.length > 0) {
    checkResult.historyChecks.forEach((h) => {
      displayVersions.push({
        id: `hc-${h.version}`,
        version: h.version,
        score: h.version === s.version ? s.score : "(Bằng chứng On-Chain)",
        action: h.blockchainAction || h.databaseAction || (h.version === 1 ? "CREATE" : "UPDATE"),
        dataHash: h.databaseHash,
        transactionHash: null,
        blockNumber: null,
        createdAt: s.createdAt,
        isValid: h.matches,
        isInvalid: !h.matches,
      });
    });
  } else if (s.version) {
    displayVersions.push({
      id: `current-${s.version}`,
      version: s.version,
      score: s.score,
      action: s.version === 1 ? "CREATE" : "UPDATE",
      dataHash: s.dataHash,
      transactionHash: s.latestTxHash || null,
      blockNumber: null,
      createdAt: s.createdAt,
      isValid: isMatch,
      isInvalid: isInvalid,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: "840px",
          maxHeight: "88vh",
          overflowY: "auto",
          padding: "2rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.5rem",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "1rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1e293b" }}>
                Chi tiết điểm thi: {s.studentId}
              </h2>
              <span className={`badge ${s.status === "ACTIVE" ? "badge-valid" : "badge-invalid"}`}>
                {s.status === "ACTIVE" ? "Đang dùng" : "Đã xóa"}
              </span>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.2rem" }}>
              Môn: <strong>{s.courseCode}</strong> | Học kỳ: <strong>{s.semester}</strong> | ID: #{s.id}
            </p>
          </div>

          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕ Đóng
          </button>
        </div>

        {/* Status Verification Banner */}
        <div
          style={{
            background: isMatch
              ? "var(--valid-bg)"
              : isInvalid
              ? "var(--invalid-bg)"
              : "var(--pending-bg)",
            border: `1px solid ${
              isMatch
                ? "var(--valid-border)"
                : isInvalid
                ? "var(--invalid-border)"
                : "var(--pending-border)"
            }`,
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>
                {isMatch ? "✓" : isInvalid ? "⚠️" : "⏳"}
              </span>
              <strong
                style={{
                  fontSize: "1rem",
                  color: isMatch
                    ? "var(--valid)"
                    : isInvalid
                    ? "var(--invalid)"
                    : "var(--pending)",
                }}
              >
                {isMatch
                  ? "DỮ LIỆU TOÀN VẸN VÀ HỢP LỆ"
                  : isInvalid
                  ? "PHÁT HIỆN DỮ LIỆU BỊ SAI LỆCH"
                  : checking
                  ? "ĐANG KIỂM TRA ĐỐI SOÁT VỚI BLOCKCHAIN..."
                  : "CHƯA ĐỐI SOÁT TOÀN VẸN"}
              </strong>
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: isMatch ? "#065f46" : isInvalid ? "#991b1b" : "#92400e",
                marginTop: "0.25rem",
              }}
            >
              {checkResult?.message ||
                (checking
                  ? "Hệ thống đang truy vấn bằng chứng niêm phong từ Smart Contract..."
                  : "Dữ liệu chưa được đối chiếu trực tiếp với Blockchain.")}
            </p>
            {checkResult?.reason && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--invalid)",
                  marginTop: "0.2rem",
                  fontWeight: 700,
                }}
              >
                Nguyên nhân:{" "}
                {checkResult.reason === "HASH_MISMATCH"
                  ? "Mã băm CSDL không khớp với bản gốc đã niêm phong trên Smart Contract"
                  : checkResult.reason === "VERSION_MISMATCH"
                  ? "Lệch phiên bản giữa CSDL và Blockchain"
                  : checkResult.reason === "ACTION_MISMATCH"
                  ? "Trạng thái bản ghi không khớp với hành động trên Blockchain"
                  : checkResult.reason === "MISSING_ON_CHAIN"
                  ? "Không tìm thấy bằng chứng niêm phong trên Blockchain"
                  : checkResult.reason}
              </div>
            )}
          </div>

          <button
            className="btn btn-sm btn-outline"
            onClick={runCheck}
            disabled={checking}
          >
            {checking ? "Đang kiểm tra..." : "Kiểm tra lại"}
          </button>
        </div>

        {/* Side-by-Side Comparison: MySQL vs Blockchain */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* MySQL Side */}
          <div
            style={{
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h4
              style={{
                fontSize: "0.9rem",
                color: "#0284c7",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              Dữ liệu điểm hiện tại (CSDL)
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontSize: "0.8rem",
                color: "#334155",
              }}
            >
              <div>
                Điểm:{" "}
                <strong style={{ fontSize: "1.1rem", color: "var(--primary-ptit)" }}>
                  {s.score}
                </strong>
              </div>
              <div>
                Phiên bản: <strong>v{s.version}</strong>
              </div>
              <div>
                Trạng thái:{" "}
                <span
                  className={`badge ${
                    s.status === "ACTIVE" ? "badge-valid" : "badge-invalid"
                  }`}
                  style={{ fontSize: "0.65rem" }}
                >
                  {s.status === "ACTIVE" ? "Đang dùng" : "Đã xóa"}
                </span>
              </div>
              <div style={{ marginTop: "0.25rem" }}>
                <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
                  Mã băm dữ liệu hiện tại (SHA-256):
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: "0.68rem",
                    color: "#334155",
                    wordBreak: "break-all",
                    background: "#ffffff",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    marginTop: "0.2rem",
                  }}
                >
                  {s.dataHash}
                </div>
              </div>
            </div>
          </div>

          {/* Blockchain Side */}
          <div
            style={{
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h4
              style={{
                fontSize: "0.9rem",
                color: "#7c3aed",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              Bằng chứng niêm phong gốc (Blockchain)
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontSize: "0.8rem",
                color: "#334155",
              }}
            >
              <div>
                Phiên bản niêm phong:{" "}
                <strong>
                  {displayBcVersion != null ? `v${displayBcVersion}` : checking ? "..." : "N/A"}
                </strong>
              </div>
              <div>
                Thao tác ghi nhận:{" "}
                <strong>{displayBcAction || (checking ? "Đang truy vấn..." : "N/A")}</strong>
              </div>
              <div>
                Thời gian ghi nhận:{" "}
                <span style={{ color: "#64748b" }}>
                  {displayBcTimestamp || (checking ? "Đang truy vấn..." : "N/A")}
                </span>
              </div>
              <div style={{ marginTop: "0.25rem" }}>
                <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
                  Mã băm gốc đã niêm phong:
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: "0.68rem",
                    color: isMatch
                      ? "var(--valid)"
                      : isInvalid
                      ? "var(--invalid)"
                      : "#475569",
                    wordBreak: "break-all",
                    background: "#ffffff",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "4px",
                    border: `1px solid ${
                      isMatch
                        ? "var(--valid-border)"
                        : isInvalid
                        ? "var(--invalid-border)"
                        : "#cbd5e1"
                    }`,
                    marginTop: "0.2rem",
                    fontWeight: isMatch || isInvalid ? 600 : 400,
                  }}
                >
                  {displayBcHash ||
                    (checking
                      ? "Đang đối soát dữ liệu với Blockchain..."
                      : "Chưa tìm thấy bằng chứng niêm phong")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Record Key Proof info */}
        <div
          style={{
            background: "#f8fafc",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            marginBottom: "1.5rem",
            fontSize: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#64748b", fontWeight: 600 }}>
              Mã định danh bản ghi (Record Key):
            </span>
            <button
              className="btn btn-outline btn-sm"
              style={{ padding: "0.15rem 0.4rem", fontSize: "0.65rem" }}
              onClick={() => copyToClipboard(s.recordKey, "recordKey")}
            >
              {copiedKey === "recordKey" ? "✓ Đã sao chép" : "Sao chép"}
            </button>
          </div>
          <div
            className="mono"
            style={{ color: "#334155", wordBreak: "break-all", marginTop: "0.2rem" }}
          >
            {s.recordKey}
          </div>
        </div>

        {/* Version History Timeline (Append-Only) */}
        <div>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              color: "#1e293b",
            }}
          >
            Lịch sử các phiên bản điểm ({displayVersions.length} phiên bản)
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {displayVersions.length > 0 ? (
              displayVersions.map((v) => {
                return (
                  <div
                    key={v.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderLeft: `4px solid ${
                        v.isValid
                          ? "var(--valid)"
                          : v.isInvalid
                          ? "var(--invalid)"
                          : v.transactionHash
                          ? "var(--valid)"
                          : "#cbd5e1"
                      }`,
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      fontSize: "0.8rem",
                      color: "#1e293b",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong>Phiên bản {v.version}</strong> ({v.action}) — Điểm:{" "}
                        <strong style={{ color: "var(--primary-ptit)" }}>
                          {v.score}
                        </strong>
                      </div>
                      <span
                        className={`badge ${
                          v.isValid
                            ? "badge-valid"
                            : v.isInvalid
                            ? "badge-invalid"
                            : v.transactionHash
                            ? "badge-valid"
                            : "badge-pending"
                        }`}
                        style={{ fontSize: "0.65rem" }}
                      >
                        {v.isValid
                          ? "Hợp lệ"
                          : v.isInvalid
                          ? "Sai lệch"
                          : v.transactionHash
                          ? "Đã niêm phong"
                          : "Chờ kiểm tra"}
                      </span>
                    </div>

                    <div
                      className="mono"
                      style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.3rem" }}
                    >
                      Data Hash: {v.dataHash}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.7rem",
                        color: "#64748b",
                        marginTop: "0.25rem",
                      }}
                    >
                      <span>
                        Tx:{" "}
                        {v.transactionHash
                          ? `${v.transactionHash.slice(0, 18)}...`
                          : "Ghi nhận Blockchain"}{" "}
                        {v.blockNumber ? `(Block #${v.blockNumber})` : ""}
                      </span>
                      <span>{new Date(v.createdAt).toLocaleString("vi-VN")}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "#64748b", fontSize: "0.85rem", padding: "1rem 0" }}>
                Chưa có dữ liệu phiên bản lịch sử.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
