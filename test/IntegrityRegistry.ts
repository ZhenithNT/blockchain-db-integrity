import assert from "node:assert/strict";
import { describe, it } from "node:test";

import hre from "hardhat";

const { viem, networkHelpers } = await hre.network.create();

type Hex = `0x${string}`;

const RECORD_KEY = `0x${"11".repeat(32)}` as Hex;
const DATA_HASH_V1 = `0x${"22".repeat(32)}` as Hex;
const DATA_HASH_V2 = `0x${"33".repeat(32)}` as Hex;
const DATA_HASH_V3 = `0x${"44".repeat(32)}` as Hex;
const ACTOR_HASH = `0x${"55".repeat(32)}` as Hex;

const CREATE = 0;
const UPDATE = 1;
const DELETE = 2;
const RESTORE = 3;

describe("IntegrityRegistry", function () {
  async function deployRegistryFixture() {
    const registry = await viem.deployContract("IntegrityRegistry");

    const [ownerWallet, otherWallet] =
      await viem.getWalletClients();

    return {
      registry,
      ownerWallet,
      otherWallet,
    };
  }

  it("Should create the first evidence with version 1", async function () {
    const { registry, ownerWallet } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V1,
      ACTOR_HASH,
      1n,
      CREATE,
    ]);

    const exists = await registry.read.exists([RECORD_KEY]);
    const versionCount =
      await registry.read.getVersionCount([RECORD_KEY]);

    const evidence =
      await registry.read.getLatestEvidence([RECORD_KEY]);

    assert.equal(exists, true);
    assert.equal(versionCount, 1n);

    assert.equal(evidence.dataHash, DATA_HASH_V1);
    assert.equal(evidence.actorHash, ACTOR_HASH);
    assert.equal(evidence.version, 1n);
    assert.equal(evidence.action, CREATE);
    assert.equal(
      evidence.writerAddress.toLowerCase(),
      ownerWallet.account.address.toLowerCase(),
    );

    assert.ok(evidence.timestamp > 0n);
  });

  it("Should require CREATE as the first action", async function () {
    const { registry } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await viem.assertions.revertWith(
      registry.write.appendEvidence([
        RECORD_KEY,
        DATA_HASH_V1,
        ACTOR_HASH,
        1n,
        UPDATE,
      ]),
      "first action must be CREATE",
    );
  });

  it("Should append UPDATE as version 2", async function () {
    const { registry } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V1,
      ACTOR_HASH,
      1n,
      CREATE,
    ]);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V2,
      ACTOR_HASH,
      2n,
      UPDATE,
    ]);

    const versionCount =
      await registry.read.getVersionCount([RECORD_KEY]);

    const latest =
      await registry.read.getLatestEvidence([RECORD_KEY]);

    const versionOne =
      await registry.read.getEvidenceByVersion([
        RECORD_KEY,
        1n,
      ]);

    assert.equal(versionCount, 2n);

    assert.equal(versionOne.version, 1n);
    assert.equal(versionOne.dataHash, DATA_HASH_V1);
    assert.equal(versionOne.action, CREATE);

    assert.equal(latest.version, 2n);
    assert.equal(latest.dataHash, DATA_HASH_V2);
    assert.equal(latest.action, UPDATE);
  });

  it("Should reject a version that is not continuous", async function () {
    const { registry } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V1,
      ACTOR_HASH,
      1n,
      CREATE,
    ]);

    await viem.assertions.revertWith(
      registry.write.appendEvidence([
        RECORD_KEY,
        DATA_HASH_V2,
        ACTOR_HASH,
        3n,
        UPDATE,
      ]),
      "invalid version",
    );
  });

  it("Should reject CREATE when the record already exists", async function () {
    const { registry } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V1,
      ACTOR_HASH,
      1n,
      CREATE,
    ]);

    await viem.assertions.revertWith(
      registry.write.appendEvidence([
        RECORD_KEY,
        DATA_HASH_V2,
        ACTOR_HASH,
        2n,
        CREATE,
      ]),
      "record already exists",
    );
  });

  it("Should reject updates after DELETE", async function () {
    const { registry } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V1,
      ACTOR_HASH,
      1n,
      CREATE,
    ]);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V2,
      ACTOR_HASH,
      2n,
      UPDATE,
    ]);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V3,
      ACTOR_HASH,
      3n,
      DELETE,
    ]);

    const deletedEvidence =
      await registry.read.getLatestEvidence([RECORD_KEY]);

    assert.equal(deletedEvidence.version, 3n);
    assert.equal(deletedEvidence.action, DELETE);

    // Khi đã xóa, không được phép UPDATE tiếp
    await viem.assertions.revertWith(
      registry.write.appendEvidence([
        RECORD_KEY,
        DATA_HASH_V3,
        ACTOR_HASH,
        4n,
        UPDATE,
      ]),
      "record deleted, only RESTORE allowed",
    );

    // Nhưng được phép RESTORE thành version 4
    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V2,
      ACTOR_HASH,
      4n,
      RESTORE,
    ]);

    const restoredEvidence =
      await registry.read.getLatestEvidence([RECORD_KEY]);

    assert.equal(restoredEvidence.version, 4n);
    assert.equal(restoredEvidence.action, RESTORE);
    assert.equal(restoredEvidence.dataHash, DATA_HASH_V2);
  });

  it("Should reject writes from a non-owner account", async function () {
    const { registry, otherWallet } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await viem.assertions.revertWith(
      registry.write.appendEvidence(
        [
          RECORD_KEY,
          DATA_HASH_V1,
          ACTOR_HASH,
          1n,
          CREATE,
        ],
        {
          account: otherWallet.account,
        },
      ),
      "only owner can write",
    );
  });

  it("Should register each recordKey only once", async function () {
    const { registry } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V1,
      ACTOR_HASH,
      1n,
      CREATE,
    ]);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V2,
      ACTOR_HASH,
      2n,
      UPDATE,
    ]);

    const recordKeyCount =
      await registry.read.getRecordKeyCount();

    const firstRecordKey =
      await registry.read.getRecordKeyAt([0n]);

    const allKeys =
      await registry.read.getAllRecordKeys();

    assert.equal(recordKeyCount, 1n);
    assert.equal(firstRecordKey, RECORD_KEY);
    assert.equal(allKeys.length, 1);
    assert.equal(allKeys[0], RECORD_KEY);
  });

  it("Should reject RESTORE when record is currently ACTIVE", async function () {
    const { registry } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.appendEvidence([
      RECORD_KEY,
      DATA_HASH_V1,
      ACTOR_HASH,
      1n,
      CREATE,
    ]);

    await viem.assertions.revertWith(
      registry.write.appendEvidence([
        RECORD_KEY,
        DATA_HASH_V2,
        ACTOR_HASH,
        2n,
        RESTORE,
      ]),
      "record active, cannot RESTORE",
    );
  });
});