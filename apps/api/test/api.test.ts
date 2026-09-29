import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/db.js";
import {
  checkScoreIntegrity,
} from "../src/services/integrity.service.js";
import {
  createScore,
  deleteScore,
  updateScore,
} from "../src/services/score.service.js";
import {
  restoreScore,
  tamperScore,
} from "../src/services/demo.service.js";

let server: Server;
let baseUrl: string;

describe("Backend API & Integrity Verification Integration", () => {
  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === "object" && addr ? addr.port : 4001;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  });

  describe("Authentication & RBAC", () => {
    it("should reject invalid login credentials", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "admin",
          password: "WrongPassword!",
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, true);
    });

    it("should login successfully and return JWT for ADMIN, LECTURER, AUDITOR", async () => {
      const roles = [
        { u: "admin", p: "Admin@123", expectedRole: "ADMIN" },
        { u: "lecturer", p: "Lecturer@123", expectedRole: "LECTURER" },
        { u: "auditor", p: "Auditor@123", expectedRole: "AUDITOR" },
      ];

      for (const item of roles) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: item.u, password: item.p }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.ok(data.token);
        assert.equal(data.user.role, item.expectedRole);
      }
    });

    it("should reject LECTURER/AUDITOR restricted actions when unauthorized", async () => {
      // 1. Auditor token
      const auditorRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "auditor", password: "Auditor@123" }),
      });
      const { token: auditorToken } = await auditorRes.json();

      // Auditor cố tình tạo điểm -> Phải trả về 403 Forbidden
      const createRes = await fetch(`${baseUrl}/api/scores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auditorToken}`,
        },
        body: JSON.stringify({
          studentId: "SV999",
          courseCode: "TEST",
          semester: "2026-1",
          score: 8.0,
        }),
      });

      assert.equal(createRes.status, 403);
    });
  });

  describe("Score Lifecycle & Integrity Verification", () => {
    const testStudentId = `TEST_${Date.now()}`;
    const testCourse = "BM01";
    const testSemester = "2026-1";
    let createdScoreId: number;

    it("should create score with version 1 and confirmed blockchain evidence", async () => {
      const result = await createScore(
        {
          studentId: testStudentId,
          courseCode: testCourse,
          semester: testSemester,
          score: 8.5,
        },
        "lecturer",
        "127.0.0.1"
      );

      assert.ok(result.score);
      assert.equal(result.score.version, 1);
      assert.equal(result.score.score, "8.50");
      assert.equal(result.score.blockchainStatus, "CONFIRMED");
      assert.ok(result.transactionHash);

      createdScoreId = result.score.id;
    });

    it("should verify legitimately created score as VALID", async () => {
      const checkResult = await checkScoreIntegrity(createdScoreId);

      assert.equal(checkResult.result, "VALID");
      assert.equal(checkResult.databaseVersion, 1);
      assert.equal(checkResult.blockchainVersion, 1);
      assert.equal(
        checkResult.databaseHash.toLowerCase(),
        checkResult.blockchainHash?.toLowerCase()
      );
    });

    it("should update score to version 2 without overwriting version 1", async () => {
      const updateResult = await updateScore(
        createdScoreId,
        9.0,
        "lecturer",
        "127.0.0.1"
      );

      assert.equal(updateResult.score.version, 2);
      assert.equal(updateResult.score.score, "9.00");

      const checkResult = await checkScoreIntegrity(createdScoreId);
      assert.equal(checkResult.result, "VALID");
      assert.equal(checkResult.databaseVersion, 2);
      assert.equal(checkResult.blockchainVersion, 2);
      assert.equal(checkResult.historyChecks?.length, 2);
      assert.equal(checkResult.historyChecks?.every((h) => h.matches), true);
    });

    it("should detect direct MySQL tampering and flag INVALID with HASH_MISMATCH", async () => {
      // Giả lập hacker can thiệp CSDL sửa điểm 9.00 -> 10.00
      await tamperScore(createdScoreId, "10.00", "attacker");

      // Checker tính lại hash và so sánh với Blockchain
      const checkResult = await checkScoreIntegrity(createdScoreId);

      assert.equal(checkResult.result, "INVALID");
      assert.equal(checkResult.reason, "HASH_MISMATCH");
      assert.notEqual(
        checkResult.databaseHash.toLowerCase(),
        checkResult.blockchainHash?.toLowerCase()
      );
    });

    it("should restore tampered score back to VALID", async () => {
      await restoreScore(createdScoreId, "admin");

      const checkResult = await checkScoreIntegrity(createdScoreId);
      assert.equal(checkResult.result, "VALID");
      assert.equal(checkResult.databaseScore, "9.00");
    });

    it("should perform soft-delete as version 3 with action DELETE", async () => {
      const deleteResult = await deleteScore(
        createdScoreId,
        "admin",
        "127.0.0.1"
      );

      assert.equal(deleteResult.score.status, "DELETED");
      assert.equal(deleteResult.score.version, 3);

      const checkResult = await checkScoreIntegrity(createdScoreId);
      assert.equal(checkResult.result, "VALID");
      assert.equal(checkResult.blockchainAction, "DELETE");
    });

    it("should restore deleted score as version 4 with action RESTORE", async () => {
      const restoreResult = await restoreScore(createdScoreId, "admin");

      assert.equal(restoreResult.score.status, "ACTIVE");
      assert.equal(restoreResult.score.version, 4);

      const checkResult = await checkScoreIntegrity(createdScoreId);
      assert.equal(checkResult.result, "VALID");
      assert.equal(checkResult.blockchainAction, "RESTORE");
      assert.equal(checkResult.databaseVersion, 4);
    });

    it("should handle score change request workflow on approved classes", async () => {
      // Giảng viên gửi yêu cầu sửa điểm
      const lecturerRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "lecturer", password: "Lecturer@123" }),
      });
      const { token: lecturerToken } = await lecturerRes.json();

      const reqRes = await fetch(`${baseUrl}/api/change-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lecturerToken}`,
        },
        body: JSON.stringify({
          scoreId: createdScoreId,
          proposedScore: 9.5,
          reason: "Chấm sót câu 4 phần thi cuối kỳ",
        }),
      });
      assert.equal(reqRes.status, 201);
      const reqData = await reqRes.json();
      assert.equal(reqData.status, "PENDING");

      // Admin duyệt yêu cầu -> tự động tạo version 5 trên Blockchain
      const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "Admin@123" }),
      });
      const { token: adminToken } = await adminRes.json();

      const reviewRes = await fetch(`${baseUrl}/api/change-requests/${reqData.id}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "APPROVED",
          reviewNote: "Đã kiểm tra bài thi gốc và đồng ý điều chỉnh",
        }),
      });
      assert.equal(reviewRes.status, 200);

      // Kiểm tra điểm đã được cập nhật lên 9.50 (Version 5) và khớp trên Blockchain
      const checkResult = await checkScoreIntegrity(createdScoreId);
      assert.equal(checkResult.result, "VALID");
      assert.equal(checkResult.databaseVersion, 5);
      assert.equal(checkResult.databaseScore, "9.50");
    });
  });
});
