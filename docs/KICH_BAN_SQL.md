# Kịch bản tấn công bằng SQL

Hệ thống không có chức năng tấn công. Kẻ tấn công được mô phỏng bằng cách **tự chạy câu lệnh SQL thẳng vào MySQL** (phpMyAdmin hoặc dòng lệnh), không đi qua ứng dụng. Các câu lệnh dưới đây đã được kiểm chứng trong `apps/api/test/api.test.ts`.

## Chuẩn bị

1. Chạy hệ thống, đăng nhập `admin`, thêm một điểm (ví dụ 8.5). Đăng xuất, đăng nhập `admin2`, sửa điểm thành 9. Như vậy bản ghi có 2 phiên bản do 2 ví ký.
2. Mở MySQL, chọn database của dự án (mặc định `blockchain_db_integrity`, hoặc tên trong `DATABASE_URL`).

```sql
SELECT id, student_id, course_code, semester, score, version, data_hash FROM scores;
SELECT score_id, version, score, action, transaction_hash FROM score_versions;
```

3. Chọn một `id` để thử (các ví dụ dưới dùng `id = 1`).
4. Sau mỗi kịch bản: vào web, mục **Kiểm tra toàn vẹn** (hoặc nút **Kiểm tra** ở danh sách điểm) để xem kết quả. Chạy `npm run demo:fresh` để làm lại từ đầu (xóa hết điểm và deploy contract mới; sau đó khởi động lại API).

Công thức băm: `data_hash = SHA256(mã SV|mã môn|học kỳ|điểm|phiên bản)`, có tiền tố `0x`. Trong MySQL: `CONCAT('0x', SHA2(CONCAT(...), 256))`.

## Các kịch bản

### 1. Sửa điểm
```sql
UPDATE scores SET score = '10.00' WHERE id = 1;
```
Kết quả: `HASH_MISMATCH`. Hash tính lại từ điểm 10.00 khác hash trên chain.

### 2. Sửa điểm và tính lại hash cho khớp
Kẻ tấn công biết công thức băm nên sửa luôn cột `data_hash`.
```sql
UPDATE scores
SET score = '10.00',
    data_hash = CONCAT('0x', SHA2(CONCAT(student_id,'|',course_code,'|',semester,'|10.00|',version), 256))
WHERE id = 1;
```
Kết quả: vẫn `HASH_MISMATCH`, vì checker không tin cột `data_hash` mà tính lại, rồi so với chain.

### 3. Đưa về phiên bản cũ
Cần bản ghi từ v2 trở lên.
```sql
UPDATE scores s JOIN score_versions v ON v.score_id = s.id AND v.version = 1
SET s.score = v.score, s.version = 1, s.data_hash = v.data_hash
WHERE s.id = 1;
```
Kết quả: `VERSION_MISMATCH`. Dữ liệu v1 vốn hợp lệ, nhưng chain đã ở v2.

### 4. Sửa lịch sử
```sql
UPDATE score_versions v JOIN scores s ON s.id = v.score_id
SET v.score = '9.50',
    v.data_hash = CONCAT('0x', SHA2(CONCAT(s.student_id,'|',s.course_code,'|',s.semester,'|9.50|',v.version), 256))
WHERE v.score_id = 1 AND v.version = 1;
```
Kết quả: `HASH_MISMATCH` ở v1. Điểm hiện tại không đổi nên chỉ kiểm tra từng phiên bản mới thấy.

### 5. Xóa một dòng lịch sử
```sql
DELETE FROM score_versions WHERE score_id = 1 AND version = 1;
```
Kết quả: `HISTORY_MISSING`.

### 6. Đổi mã giao dịch
```sql
UPDATE score_versions
SET transaction_hash = '0x1212121212121212121212121212121212121212121212121212121212121212'
WHERE score_id = 1 AND version = 2;
```
Kết quả: `TX_MISMATCH`. Biên lai của mã giả không có event `EvidenceAdded` đúng bản ghi.

### 7. Chèn bản ghi giả
Đổi mã sinh viên, môn, học kỳ cho một tổ hợp chưa có điểm.
```sql
INSERT INTO scores (student_id, course_code, semester, score, version, record_key, data_hash, created_at, updated_at)
VALUES ('B23DCAT211', 'INT1313', '2025-2026.1', '10.00', 1,
  CONCAT('0x', SHA2('B23DCAT211|INT1313|2025-2026.1', 256)),
  CONCAT('0x', SHA2('B23DCAT211|INT1313|2025-2026.1|10.00|1', 256)),
  NOW(), NOW());
```
Kết quả: `MISSING_ON_CHAIN`. Hash đúng công thức nhưng chain không có bằng chứng.

### 8. Xóa bản ghi
```sql
DELETE FROM scores WHERE id = 1;
```
Kết quả: bản ghi biến mất khỏi danh sách, nhưng **Kiểm tra toàn bộ** vẫn báo `MISSING_IN_DATABASE` vì chain còn `recordKey` này (đối soát hai chiều).

### 9. Xóa nhật ký rồi sửa điểm
```sql
UPDATE scores SET score = '10.00' WHERE id = 1;
DELETE FROM audit_logs;
```
Kết quả: vẫn `HASH_MISMATCH`. Bằng chứng nằm ngoài MySQL nên xóa nhật ký không che được.

## Kịch bản không làm bằng SQL: ví lạ ghi bằng chứng

Hacker tự tạo ví rồi gọi `appendEvidence`: contract từ chối (`not a writer`) vì ví chưa được owner cấp quyền. Ca này được kiểm chứng ở `apps/api/test/api.test.ts` (nhóm "Hacker dùng ví tự tạo") và `test/IntegrityRegistry.ts`.

## Lưu ý khi giải thích kết quả

- Hacker không ký gì nên **không xuất hiện trên chain**. Hệ thống phát hiện qua việc MySQL không khớp, chứ không biết hacker là ai.
- Cột "Người ký" trong kết quả luôn là admin đã ghi **bằng chứng gốc**, đọc từ chain. Hacker sửa MySQL không đổi được cột này.
