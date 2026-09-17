import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDataHashInput,
  buildRecordKeyInput,
  computeActorHash,
  computeDataHash,
  computeRecordKey,
  normalizeScore,
  sha256,
} from "../src/hash.js";

describe("Canonicalization & Hash Service", () => {
  it("should normalize scores correctly to exactly 2 decimal places", () => {
    assert.equal(normalizeScore(8.5), "8.50");
    assert.equal(normalizeScore("8.5"), "8.50");
    assert.equal(normalizeScore(9), "9.00");
    assert.equal(normalizeScore("9"), "9.00");
    assert.equal(normalizeScore(10), "10.00");
    assert.equal(normalizeScore(" 8.50 "), "8.50");
  });

  it("should generate canonical inputs matching demo-registry.ts and update-registry.ts", () => {
    const recordKeyInput = buildRecordKeyInput({
      studentId: "  SV001  ",
      courseCode: "ATWEB",
      semester: "2026-1",
    });
    assert.equal(recordKeyInput, "SV001|ATWEB|2026-1");

    const v1Input = buildDataHashInput({
      studentId: "SV001",
      courseCode: "ATWEB",
      semester: "2026-1",
      score: "8.50",
      version: 1,
      status: "active",
    });
    assert.equal(v1Input, "SV001|ATWEB|2026-1|8.50|1|ACTIVE");

    const v2Input = buildDataHashInput({
      studentId: "SV001",
      courseCode: "ATWEB",
      semester: "2026-1",
      score: 9,
      version: 2n,
      status: "ACTIVE",
    });
    assert.equal(v2Input, "SV001|ATWEB|2026-1|9.00|2|ACTIVE");
  });

  it("should compute deterministic SHA-256 hashes with 0x prefix", () => {
    const recordKey = computeRecordKey({
      studentId: "SV001",
      courseCode: "ATWEB",
      semester: "2026-1",
    });
    assert.equal(recordKey.startsWith("0x"), true);
    assert.equal(recordKey.length, 66); // 0x + 64 hex characters

    const dataHashV1 = computeDataHash({
      studentId: "SV001",
      courseCode: "ATWEB",
      semester: "2026-1",
      score: "8.50",
      version: 1,
      status: "ACTIVE",
    });

    const manualV1 = sha256("SV001|ATWEB|2026-1|8.50|1|ACTIVE");
    assert.equal(dataHashV1, manualV1);

    const actorHash = computeActorHash("GV001");
    const manualActor = sha256("GV001");
    assert.equal(actorHash, manualActor);
  });

  it("should produce a different hash when score is tampered from 9.00 to 10.00", () => {
    const legitimateHash = computeDataHash({
      studentId: "SV001",
      courseCode: "ATWEB",
      semester: "2026-1",
      score: "9.00",
      version: 2,
      status: "ACTIVE",
    });

    const tamperedHash = computeDataHash({
      studentId: "SV001",
      courseCode: "ATWEB",
      semester: "2026-1",
      score: "10.00",
      version: 2,
      status: "ACTIVE",
    });

    assert.notEqual(legitimateHash, tamperedHash);
  });
});
