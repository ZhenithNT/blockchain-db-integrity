import assert from "node:assert/strict";

const API_BASE = "http://localhost:4000/api";

async function request<T = any>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(
      `Request failed [${response.status} ${response.statusText}] ${path}: ${
        json.message || json.error || JSON.stringify(json)
      }`
    );
  }
  return json as T;
}

async function main() {
  console.log("===============================================================");
  console.log("🎯 BẮT ĐẦU KIỂM CHỨNG TOÀN BỘ HỆ THỐNG END-TO-END QUA HTTP API");
  console.log("===============================================================\n");

  // 1. Kiểm tra Health
  console.log("--- BƯỚC 1: Kiểm tra API Health ---");
  const health = await request<{
    status: string;
    timestamp: string;
    database: string;
    blockchain: string;
  }>("/health");
  console.log("✓ API Health response:", health);
  assert.equal(health.status, "ok", "API status must be ok");
  assert.equal(health.database, "connected", "Database must be connected");
  assert.equal(health.blockchain, "connected", "Blockchain must be connected");
  console.log("✓ Backend API, MySQL và Blockchain RPC kết nối hoàn toàn thông suốt!\n");

  // 2. Đăng nhập
  console.log("--- BƯỚC 2: Đăng nhập hệ thống ---");
  const lecturerLogin = await request<{ token: string; user: any }>("/auth/login", {
    method: "POST",
    body: { username: "lecturer", password: "Lecturer@123" },
  });
  const lecturerToken = lecturerLogin.token;
  console.log(`✓ Giảng viên đăng nhập thành công: ${lecturerLogin.user.username} (${lecturerLogin.user.role})`);

  const adminLogin = await request<{ token: string; user: any }>("/auth/login", {
    method: "POST",
    body: { username: "admin", password: "Admin@123" },
  });
  const adminToken = adminLogin.token;
  console.log(`✓ Quản trị viên đăng nhập thành công: ${adminLogin.user.username} (${adminLogin.user.role})\n`);

  // 3. Tạo điểm Version 1
  console.log("--- BƯỚC 3: Tạo điểm sinh viên mới (Version 1) ---");
  const testStudentId = `SV_LIVE_${Date.now().toString().slice(-6)}`;
  const createdRes = await request<any>("/scores", {
    method: "POST",
    token: lecturerToken,
    body: {
      studentId: testStudentId,
      courseCode: "ATWEB",
      semester: "2026-1",
      score: 8.5,
    },
  });
  const createdScore = createdRes.score;
  console.log(`✓ Đã tạo điểm cho sinh viên [${testStudentId}]`);
  console.log(`  - Record ID: ${createdScore.id}`);
  console.log(`  - Record Key: ${createdScore.recordKey}`);
  console.log(`  - Version hiện tại: ${createdScore.version}`);
  console.log(`  - Điểm số: ${createdScore.score}`);
  console.log(`  - Data Hash v1: ${createdScore.dataHash}`);
  console.log(`  - On-chain Tx Hash: ${createdRes.transactionHash}`);
  assert.equal(createdScore.version, 1, "Initial version must be 1");
  assert.equal(createdScore.score, "8.50", "Initial score must be 8.50");
  assert.ok(createdRes.transactionHash, "Must have on-chain transaction hash");
  console.log();

  // 4. Cập nhật điểm Version 2
  console.log("--- BƯỚC 4: Giảng viên cập nhật điểm thành 9.00 (Version 2) ---");
  const updatedRes = await request<any>(`/scores/${createdScore.id}`, {
    method: "PUT",
    token: lecturerToken,
    body: {
      score: 9.0,
    },
  });
  const updatedScore = updatedRes.score;
  console.log(`✓ Đã cập nhật điểm thành công lên Blockchain`);
  console.log(`  - Version mới: ${updatedScore.version}`);
  console.log(`  - Điểm mới: ${updatedScore.score}`);
  console.log(`  - Data Hash v2: ${updatedScore.dataHash}`);
  console.log(`  - On-chain Tx Hash v2: ${updatedRes.transactionHash}`);
  assert.equal(updatedScore.version, 2, "Updated version must be 2");
  assert.equal(updatedScore.score, "9.00", "Updated score must be 9.00");
  assert.notEqual(createdScore.dataHash, updatedScore.dataHash, "Hashes must differ between versions");
  console.log();

  // 5. Kiểm tra tính toàn vẹn (Kỳ vọng: VALID)
  console.log("--- BƯỚC 5: Kiểm tra tính toàn vẹn cấp 1 & cấp 2 (Kỳ vọng: VALID) ---");
  const checkData1 = await request<any>(`/integrity/check/${createdScore.id}`, {
    method: "POST",
    token: lecturerToken,
  });
  console.log(`  - Trạng thái kiểm tra: [${checkData1.result}]`);
  console.log(`  - MySQL Hash:          ${checkData1.databaseHash}`);
  console.log(`  - Blockchain Hash:     ${checkData1.blockchainHash}`);
  console.log(`  - Khớp Hash:           ${checkData1.databaseHash === checkData1.blockchainHash}`);
  console.log(`  - Số phiên bản lịch sử đã kiểm tra: ${checkData1.historyChecks?.length || 0}`);
  assert.equal(checkData1.result, "VALID", "Integrity check must return VALID");
  assert.equal(checkData1.databaseHash, checkData1.blockchainHash, "Hashes must match between MySQL and Blockchain");
  console.log("  => KẾT QUẢ: HỆ THỐNG TOÀN VẸN (VALID) ✅\n");

  // 6. Giả mạo trực tiếp cơ sở dữ liệu MySQL (Tấn công nội bộ)
  console.log("--- BƯỚC 6: Mô phỏng tấn công DB - Giả mạo trực tiếp MySQL (Sửa điểm 9.00 -> 10.00) ---");
  const tamperData = await request<any>("/demo/tamper", {
    method: "POST",
    token: adminToken,
    body: {
      scoreId: createdScore.id,
      score: 10.0,
    },
  });
  console.log(`✓ Đã tiêm mã sửa trực tiếp trong bảng MySQL 'scores':`);
  console.log(`  - Điểm gốc: ${tamperData.originalScore}`);
  console.log(`  - Điểm bị giả mạo: ${tamperData.tamperedScore}`);
  console.log(`  - Hash sau khi sửa trong MySQL: ${tamperData.score.dataHash}`);
  console.log("  ⚠️ Chú ý: Dữ liệu MySQL đã bị đổi nhưng Smart Contract Blockchain KHÔNG hề có giao dịch mới!\n");

  // 7. Kiểm tra lại tính toàn vẹn (Kỳ vọng: INVALID)
  console.log("--- BƯỚC 7: Hệ thống Audit quét lại tính toàn vẹn (Kỳ vọng: INVALID / HASH_MISMATCH) ---");
  const checkData2 = await request<any>(`/integrity/check/${createdScore.id}`, {
    method: "POST",
    token: lecturerToken,
  });
  console.log(`  - Trạng thái kiểm tra: [${checkData2.result}]`);
  console.log(`  - Lý do phát hiện:     [${checkData2.reason}]`);
  console.log(`  - MySQL Hash tính lại: ${checkData2.databaseHash}`);
  console.log(`  - Blockchain Hash gốc: ${checkData2.blockchainHash}`);
  console.log(`  - Thông điệp cảnh báo: ${checkData2.message}`);
  assert.equal(checkData2.result, "INVALID", "Integrity check must detect tampering and return INVALID");
  assert.equal(checkData2.reason, "HASH_MISMATCH", "Reason must be HASH_MISMATCH");
  assert.notEqual(checkData2.databaseHash, checkData2.blockchainHash, "Hashes must not match");
  console.log("  => KẾT QUẢ: PHÁT HIỆN DỮ LIỆU ĐÃ BỊ THAY ĐỔI TRÁI PHÉP (INVALID) 🚨\n");

  // 8. Khôi phục lại dữ liệu chuẩn từ phiên bản lịch sử
  console.log("--- BƯỚC 8: Khôi phục lại dữ liệu chuẩn trong MySQL ---");
  const restoreData = await request<any>(`/demo/restore`, {
    method: "POST",
    token: adminToken,
    body: {
      scoreId: createdScore.id,
    },
  });
  console.log(`✓ Đã khôi phục dữ liệu MySQL theo phiên bản gốc:`);
  console.log(`  - Khôi phục từ phiên bản: Version ${restoreData.restoredFromVersion}`);
  console.log(`  - Điểm sau khôi phục:     ${restoreData.score.score}`);
  console.log(`  - Hash sau khôi phục:     ${restoreData.score.dataHash}\n`);

  // 9. Kiểm tra lại lần cuối (Kỳ vọng: VALID)
  console.log("--- BƯỚC 9: Kiểm tra lại tính toàn vẹn sau khôi phục (Kỳ vọng: VALID) ---");
  const checkData3 = await request<any>(`/integrity/check/${createdScore.id}`, {
    method: "POST",
    token: lecturerToken,
  });
  console.log(`  - Trạng thái kiểm tra: [${checkData3.result}]`);
  console.log(`  - MySQL Hash:          ${checkData3.databaseHash}`);
  console.log(`  - Blockchain Hash:     ${checkData3.blockchainHash}`);
  console.log(`  - Khớp Hash:           ${checkData3.databaseHash === checkData3.blockchainHash}`);
  assert.equal(checkData3.result, "VALID", "Integrity check must return VALID after restore");
  assert.equal(checkData3.databaseHash, checkData3.blockchainHash, "Hashes must match after restore");
  console.log("  => KẾT QUẢ: DỮ LIỆU ĐÃ KHÔI PHỤC VÀ ĐẢM BẢO TÍNH TOÀN VẸN (VALID) ✅\n");

  console.log("===============================================================");
  console.log("🎉 TẤT CẢ CÁC BƯỚC KIỂM CHỨNG END-TO-END ĐỀU HOÀN THÀNH XUẤT SẮC 100%!");
  console.log("===============================================================");
}

main().catch((err) => {
  console.error("❌ Lỗi trong quá trình kiểm chứng E2E:", err);
  process.exit(1);
});
