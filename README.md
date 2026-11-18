# Áp dụng Blockchain trong bảo mật cơ sở dữ liệu

Hệ thống quản lý điểm, tập trung vào hai chức năng:

1. **Kiểm tra toàn vẹn**: phát hiện điểm trong MySQL bị sửa trái phép bằng cách đối chiếu với bằng chứng trên blockchain.
2. **Truy xuất nguồn gốc**: cho biết **ai** đã ghi hoặc sửa từng phiên bản điểm, dựa vào chữ ký ví của admin.

## Ý tưởng

- MySQL giữ điểm thật. Blockchain (smart contract `IntegrityRegistry`) giữ **hash của điểm** và **địa chỉ ví đã ký**.
- Có hai admin, mỗi người một ví. Chỉ ví được owner cấp quyền mới ghi được bằng chứng.
- Hacker sửa MySQL không có khóa ví nên không sửa được bằng chứng. Lần kiểm tra sau, hash tính lại từ MySQL sẽ lệch với hash trên chain.
- Địa chỉ ví đọc từ chain không giả được, nên biết chính xác admin nào đã ký từng phiên bản.

## Kiến trúc

```text
Trình duyệt (React :3000)  <->  API Express (:4000)  <->  MySQL (:3306)
                                     |
                                     +--- viem / RPC ---> Hardhat node (:8545) + contract IntegrityRegistry
```

## Dữ liệu

**MySQL** (`prisma/schema.prisma`): `users`, `user_wallets`, `students`, `courses`, `semesters`, `scores`, `score_versions`, `integrity_checks`, `audit_logs`.

**Blockchain**, mỗi phiên bản điểm là một `Evidence`:

| Trường | Ý nghĩa |
| :-- | :-- |
| `dataHash` | SHA-256 của `mã SV\|mã môn\|học kỳ\|điểm\|phiên bản` |
| `version` | 1, 2, 3... tăng liên tục |
| `action` | `CREATE` (v1) hoặc `UPDATE` |
| `timestamp` | giờ của khối |
| `writer` | địa chỉ ví đã ký, contract tự ghi |

Điểm, tên sinh viên, mã môn **không** nằm trên chain, chỉ có hash. Định danh bản ghi: `recordKey = SHA256(mã SV|mã môn|học kỳ)`.

## Smart contract

[contracts/IntegrityRegistry.sol](contracts/IntegrityRegistry.sol):

- `addWriter` / `removeWriter`: chỉ owner cấp hoặc thu hồi quyền ghi. Owner không tự ghi điểm.
- `appendEvidence(recordKey, dataHash, version, action)`: chỉ ví được cấp quyền gọi được. Version phải tăng liên tục, lần đầu là CREATE, các lần sau là UPDATE. Không có hàm sửa hay xóa bằng chứng.
- Đọc (miễn phí): `getHistory`, `getLatestEvidence`, `getVersionCount`, `exists`, `getAllRecordKeys`, `getWriters`.

## Cài đặt và chạy (Windows PowerShell)

Cần Node.js 20 trở lên và MySQL 8 hoặc XAMPP.

```powershell
npm.cmd install                      # cài thư viện và tự build gói shared
Copy-Item .env.example .env          # sửa DATABASE_URL nếu cần
npm.cmd run db:init                  # tạo bảng MySQL
npm.cmd run blockchain:node          # cửa sổ riêng, để chạy suốt
npm.cmd run demo:fresh               # biên dịch, deploy contract, nạp dữ liệu mẫu
npm.cmd run dev                      # API :4000 và web :3000
```

Mở <http://localhost:3000>. Tài khoản mẫu: `admin` và `admin2`, mật khẩu `Admin@123`. Mỗi tài khoản tự có ví ở lần đăng nhập đầu tiên.

Lưu ý: tắt Hardhat node là mất toàn bộ chain, phải chạy lại `npm run demo:fresh` rồi khởi động lại API. Khởi động lại API thì cần đăng nhập lại để mở khóa ví.

## Các lệnh

| Lệnh | Làm gì |
| :-- | :-- |
| `npm run blockchain:node` | Chạy Hardhat node |
| `npm run blockchain:deploy` | Deploy contract, ghi `CONTRACT_ADDRESS` vào `.env` |
| `npm run db:seed` | Nạp danh mục mẫu và hai admin (xóa điểm cũ) |
| `npm run demo:fresh` | Deploy contract mới rồi seed |
| `npm run integrity:check` | Kiểm tra toàn vẹn từ dòng lệnh |
| `npm run measure:gas` | Đo gas deploy, addWriter, CREATE, UPDATE |

## Cách dùng để demo

1. Đăng nhập `admin`, thêm một điểm (ví dụ 8.5). Giao dịch được ký bằng ví của admin.
2. Đăng xuất, đăng nhập `admin2`, sửa điểm thành 9.0. Phiên bản 2 do ví của admin2 ký.
3. Mở **Chi tiết** của điểm: thấy v1 do Phòng Đào tạo ký, v2 do Phòng Khảo thí ký.
4. Đóng vai hacker: tự chạy các câu lệnh SQL trong [docs/KICH_BAN_SQL.md](docs/KICH_BAN_SQL.md) vào MySQL (sửa điểm, sửa cả hash, đưa về phiên bản cũ, chèn bản ghi giả, xóa bản ghi, sửa lịch sử, đổi mã giao dịch). Sau mỗi lần, vào **Kiểm tra toàn vẹn** để thấy hệ thống phát hiện.
5. Chạy `npm run demo:fresh` để làm lại từ đầu.

## Kết quả kiểm tra

| Tấn công vào MySQL | Kết quả |
| :-- | :-- |
| Sửa điểm | `HASH_MISMATCH` |
| Sửa điểm và tính lại hash | `HASH_MISMATCH` |
| Đưa về phiên bản cũ | `VERSION_MISMATCH` |
| Sửa lịch sử | `HASH_MISMATCH` ở phiên bản bị sửa |
| Đổi mã giao dịch | `TX_MISMATCH` |
| Chèn bản ghi giả | `MISSING_ON_CHAIN` |
| Xóa bản ghi | `MISSING_IN_DATABASE` (đối soát hai chiều) |
| Xóa một dòng lịch sử | `HISTORY_MISSING` |
| Ví lạ ghi bằng chứng giả (gọi contract bằng ví chưa cấp quyền) | Contract từ chối (`not a writer`) |

## Giới hạn

- Hardhat local chỉ có một node, chưa chứng minh được tính phân tán.
- Backend giữ khóa ký của admin trong bộ nhớ khi họ đăng nhập. Nếu backend bị chiếm lúc đang chạy thì lấy được khóa. Thực tế nên để admin tự giữ khóa (MetaMask, ví phần cứng); contract không cần đổi vì chỉ kiểm tra người ký.
- Ví owner (khóa trong `.env`) cấp quyền ghi. Nếu lộ khóa này, kẻ tấn công cấp quyền cho ví lạ được; giao diện **Ví và người ký** sẽ hiện ví lạ.
- Blockchain chỉ **phát hiện**, không ngăn sửa MySQL. Nó cũng không biết điểm ban đầu có đúng với thực tế không.
- Hash công khai của điểm (chỉ có 1001 giá trị) có thể bị dò ngược ra điểm. Hệ thống không dùng salt nên chấp nhận điều này; nếu cần bí mật thì thêm salt ngẫu nhiên vào `dataHash`.
- Danh tính "ai sửa MySQL trực tiếp" không có trên blockchain (hacker không ký gì). Muốn biết cần trigger hoặc audit của MySQL.
