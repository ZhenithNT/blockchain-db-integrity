import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { WalletRow } from "../types";
import { Hash } from "./ui";

export const WalletsView: React.FC = () => {
  const [rows, setRows] = useState<WalletRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api
      .getWallets()
      .then(setRows)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="ptit-card">
      <div className="ptit-card-header">
        <div className="ptit-card-title">VÍ VÀ NGƯỜI KÝ</div>
      </div>
      <p className="muted" style={{ marginBottom: "1rem", lineHeight: 1.6 }}>
        Mỗi admin có một ví. Contract chỉ cho các ví trong danh sách dưới đây ghi bằng chứng, và lưu lại ví nào đã ký từng
        phiên bản. Khóa riêng được mã hóa bằng mật khẩu của chính admin, nên người đọc được MySQL cũng không ký thay được.
      </p>
      {error && <div className="badge badge-invalid">{error}</div>}
      <div className="ptit-table-container">
        <table className="ptit-table">
          <thead>
            <tr>
              <th>Admin</th>
              <th>Địa chỉ ví</th>
              <th>Quyền ghi trên contract</th>
              <th>Khóa ký</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted" style={{ textAlign: "center", padding: "1.5rem" }}>
                  Chưa có ví nào. Ví được tạo khi admin đăng nhập lần đầu.
                </td>
              </tr>
            ) : (
              rows.map((w) => (
                <tr key={w.address}>
                  <td>
                    <strong>{w.fullName}</strong>
                    <div className="muted">{w.username || "không thuộc admin nào"}</div>
                  </td>
                  <td>
                    <Hash value={w.address} head={10} tail={6} />
                  </td>
                  <td>
                    {w.onChainWriter ? (
                      <span className={`badge ${w.kind === "ROGUE" ? "badge-invalid" : "badge-valid"}`}>
                        {w.kind === "ROGUE" ? "Có quyền, ví lạ" : "Được ghi"}
                      </span>
                    ) : (
                      <span className="badge badge-pending">Chưa có quyền</span>
                    )}
                  </td>
                  <td className="muted">{w.kind === "ROGUE" ? "—" : w.unlocked ? "Đang mở" : "Đã khóa"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
