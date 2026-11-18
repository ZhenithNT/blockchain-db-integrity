import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { IntegrityCheckDetail, ScoreDetail } from "../types";
import { Hash, REASON_LABEL, Signer, formatTime, shortHash } from "./ui";

interface Props {
  scoreId: number;
  onClose: () => void;
}

export const ScoreDetailModal: React.FC<Props> = ({ scoreId, onClose }) => {
  const [detail, setDetail] = useState<ScoreDetail | null>(null);
  const [check, setCheck] = useState<IntegrityCheckDetail | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setChecking(true);
    try {
      setCheck(await api.checkIntegrity(scoreId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    api
      .getScoreById(scoreId)
      .then(setDetail)
      .catch((e) => setError(e.message));
    runCheck();
  }, [scoreId]);

  const tone = check?.result === "VALID" ? "valid" : check?.result === "INVALID" ? "invalid" : "pending";
  const headline = check
    ? check.result === "VALID"
      ? "Dữ liệu khớp với blockchain"
      : check.result === "INVALID"
        ? "Dữ liệu không khớp với blockchain"
        : "Không kiểm tra được"
    : checking
      ? "Đang kiểm tra…"
      : "Chưa kiểm tra";

  const Mark: React.FC<{ ok: boolean | undefined }> = ({ ok }) =>
    ok === undefined ? (
      <span className="sd-mark">—</span>
    ) : ok ? (
      <span className="sd-mark ok">✓</span>
    ) : (
      <span className="sd-mark bad">✗</span>
    );

  const hashOk = check?.blockchainHash ? check.blockchainHash.toLowerCase() === check.databaseHash.toLowerCase() : undefined;
  const versionOk = check?.blockchainVersion != null ? check.blockchainVersion === check.databaseVersion : undefined;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sd-head">
          <div>
            <h2>{detail?.studentId ?? "..."}</h2>
            <p>
              {detail ? `${detail.studentName ?? ""} · ${detail.courseCode} · ${detail.semester}` : ""}
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Đóng
          </button>
        </div>

        {error && <div className="badge badge-invalid" style={{ marginBottom: "1rem", whiteSpace: "normal" }}>{error}</div>}

        <div className={`sd-banner ${tone}`}>
          <div>
            <strong>{headline}</strong>
            {check?.result === "INVALID" && check.reason && (
              <span className="sd-reason">{REASON_LABEL[check.reason] || check.reason}</span>
            )}
            {check && check.result !== "VALID" && <p>{check.message}</p>}
          </div>
          <button className="btn btn-sm btn-outline" onClick={runCheck} disabled={checking}>
            {checking ? "Đang kiểm tra…" : "Kiểm tra lại"}
          </button>
        </div>

        {check && (
          <table className="sd-compare">
            <thead>
              <tr>
                <th></th>
                <th>MySQL</th>
                <th>Blockchain</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Điểm</td>
                <td>
                  <strong className="sd-score">{check.databaseScore}</strong>
                </td>
                <td className="muted">chỉ lưu mã băm</td>
                <td></td>
              </tr>
              <tr>
                <td>Phiên bản</td>
                <td>v{check.databaseVersion}</td>
                <td>{check.blockchainVersion != null ? `v${check.blockchainVersion}` : "—"}</td>
                <td>
                  <Mark ok={versionOk} />
                </td>
              </tr>
              <tr>
                <td>Mã băm</td>
                <td>
                  <Hash value={check.databaseHash} head={10} tail={6} />
                </td>
                <td>{check.blockchainHash ? <Hash value={check.blockchainHash} head={10} tail={6} /> : "—"}</td>
                <td>
                  <Mark ok={hashOk} />
                </td>
              </tr>
              <tr>
                <td>Người ghi gần nhất</td>
                <td className="muted">không lưu</td>
                <td>
                  <Signer signer={check.writer} />
                </td>
                <td></td>
              </tr>
              <tr>
                <td>Thời gian ghi</td>
                <td className="muted">—</td>
                <td>{formatTime(check.blockchainTimestamp)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}

        <h3 className="sd-title">Ai đã ghi từng phiên bản</h3>
        {!check || check.historyChecks.length === 0 ? (
          <p className="muted">Chưa có lịch sử.</p>
        ) : (
          <div className="sd-versions">
            {check.historyChecks.map((h) => {
              const row = detail?.versions.find((v) => v.version === h.version);
              const tone = h.matches ? "valid" : "invalid";
              return (
                <details key={h.version} className={`sd-version ${tone}`}>
                  <summary>
                    <span className="sd-v">v{h.version}</span>
                    <span className="sd-act">{row?.action ?? "—"}</span>
                    <strong className="sd-score">{row?.score ?? "?"}</strong>
                    <span className="sd-who">{h.writer ? h.writer.fullName : "—"}</span>
                    <span className="sd-time">{row ? new Date(row.createdAt).toLocaleDateString("vi-VN") : ""}</span>
                    <span className={`badge badge-${tone}`}>{h.matches ? "Hợp lệ" : REASON_LABEL[h.reason || ""] || "Sai lệch"}</span>
                  </summary>
                  <dl className="sd-more">
                    <dt>Người ký</dt>
                    <dd>
                      <Signer signer={h.writer} />
                    </dd>
                    <dt>Thời gian</dt>
                    <dd>{formatTime(row?.blockchainTimestamp)}</dd>
                    <dt>Hash MySQL</dt>
                    <dd className="mono">{h.databaseHash || "—"}</dd>
                    <dt>Hash chain</dt>
                    <dd className="mono">{h.blockchainHash || "—"}</dd>
                    <dt>Giao dịch</dt>
                    <dd className="mono">
                      {row?.transactionHash ? shortHash(row.transactionHash, 14, 8) : "—"}
                      {row?.blockNumber ? ` · khối ${row.blockNumber}` : ""}
                      {h.txOk === true && <span className="badge badge-valid">Khớp bằng chứng</span>}
                      {h.txOk === false && <span className="badge badge-invalid">Không khớp</span>}
                    </dd>
                  </dl>
                </details>
              );
            })}
          </div>
        )}

        {detail && (
          <details className="sd-tech">
            <summary>Thông tin kỹ thuật</summary>
            <div className="sd-tech-row">
              <span>Record key</span>
              <span className="mono">{detail.recordKey}</span>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};
