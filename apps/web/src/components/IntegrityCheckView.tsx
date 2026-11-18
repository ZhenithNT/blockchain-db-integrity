import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { CheckAllResult, RecentCheck } from "../types";
import { REASON_LABEL, Signer, formatTime, resultBadge, shortHash } from "./ui";

interface Props {
  onViewDetail: (scoreId: number) => void;
}

export const IntegrityCheckView: React.FC<Props> = ({ onViewDetail }) => {
  const [report, setReport] = useState<CheckAllResult | null>(null);
  const [recent, setRecent] = useState<RecentCheck[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecent = () => api.getRecentChecks().then(setRecent).catch(() => undefined);

  useEffect(() => {
    loadRecent();
  }, []);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      setReport(await api.checkAll());
      await loadRecent();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const s = report?.summary;
  const hasProblem = s ? s.invalid + s.errors + s.missing > 0 : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="ptit-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div className="ptit-card-title">KIỂM TRA TOÀN VẸN</div>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              Tính lại hash từ MySQL, so với blockchain, và cho biết ai đã ghi từng phiên bản.
            </p>
          </div>
          <button className="btn btn-primary" onClick={run} disabled={running}>
            {running ? "Đang kiểm tra..." : "Kiểm tra toàn bộ"}
          </button>
        </div>
      </div>

      {error && <div className="badge badge-invalid" style={{ whiteSpace: "normal" }}>{error}</div>}
      {report?.chainError && (
        <div className="badge badge-invalid" style={{ whiteSpace: "normal" }}>
          Không đọc được blockchain: {report.chainError}
        </div>
      )}

      {s && (
        <div className={`sd-banner ${hasProblem ? "invalid" : "valid"}`}>
          <div>
            <strong>{hasProblem ? "Có dữ liệu sai lệch so với blockchain" : "Toàn bộ dữ liệu khớp blockchain"}</strong>
            <p>
              Tổng {s.total} · Hợp lệ {s.valid} · Sai lệch {s.invalid} · Bị xóa khỏi MySQL {s.missing}
              {s.errors > 0 ? ` · Lỗi ${s.errors}` : ""}
            </p>
          </div>
        </div>
      )}

      {report && report.results.length > 0 && (
        <div className="ptit-card">
          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th>Sinh viên</th>
                  <th>Môn</th>
                  <th style={{ textAlign: "center" }}>Điểm</th>
                  <th>Người ký gần nhất</th>
                  <th>Kết quả</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {report.results.map((r) => (
                  <tr key={r.scoreId}>
                    <td>
                      <strong>{r.studentId}</strong>
                      <div className="muted">{r.semester}</div>
                    </td>
                    <td>{r.courseCode}</td>
                    <td style={{ textAlign: "center" }}>
                      {r.databaseScore} <span className="muted">v{r.databaseVersion}</span>
                    </td>
                    <td>
                      <Signer signer={r.writer} compact />
                    </td>
                    <td>
                      {resultBadge(r.result)}
                      {r.reason && <div className="muted">{REASON_LABEL[r.reason] || r.reason}</div>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-outline btn-sm" onClick={() => onViewDetail(r.scoreId)}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report && report.missing.length > 0 && (
        <div className="ptit-card" style={{ borderLeft: "4px solid var(--invalid)" }}>
          <div style={{ color: "var(--invalid)", fontWeight: 700, marginBottom: "0.5rem" }}>
            Bản ghi có trên blockchain nhưng đã bị xóa khỏi MySQL
          </div>
          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th>Record key</th>
                  <th>Phiên bản cuối</th>
                  <th>Người ký</th>
                  <th>Thời gian ghi</th>
                </tr>
              </thead>
              <tbody>
                {report.missing.map((m) => (
                  <tr key={m.recordKey}>
                    <td className="mono">{shortHash(m.recordKey, 12, 6)}</td>
                    <td>v{m.blockchainVersion}</td>
                    <td>
                      <Signer signer={m.writer} compact />
                    </td>
                    <td className="muted">{formatTime(m.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="ptit-card">
        <div className="ptit-card-title" style={{ marginBottom: "0.75rem" }}>
          LẦN KIỂM TRA GẦN ĐÂY
        </div>
        {recent.length === 0 ? (
          <p className="muted">Chưa có lần kiểm tra nào.</p>
        ) : (
          <div className="ptit-table-container">
            <table className="ptit-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Bản ghi</th>
                  <th>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id}>
                    <td className="muted">{formatTime(c.checkedAt)}</td>
                    <td>{c.studentId ? `${c.studentId} · ${c.courseCode}` : "đã xóa"}</td>
                    <td>
                      {resultBadge(c.result)}{" "}
                      {c.reason && <span className="muted">{REASON_LABEL[c.reason] || c.reason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
