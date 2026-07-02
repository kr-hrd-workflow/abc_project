import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildSeoulV2xSignalSnapshotFile } from "./build-seoul-v2x-signal-snapshot.mjs";

describe("Seoul V2X signal snapshot builder", () => {
  test("builds a LiveSignalSnapshot from the latest cardinal T-DATA response row", async () => {
    const written = new Map();
    const result = await buildSeoulV2xSignalSnapshotFile({
      responsePath: "seoul-v2x-response.json",
      outputPath: "signal-snapshot.json",
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false,
      readFile: async (filePath, encoding) => {
        assert.equal(filePath, "seoul-v2x-response.json");
        assert.equal(encoding, "utf8");
        return JSON.stringify([
          {
            dataId: "SPAT-CIB1000020300-1782956865-28300",
            trsmUtcTime: "1782962310000",
            itstId: "4765",
            eqmnId: "CIB1000020300",
            etStsgRmdrCs: "800",
            wtStsgRmdrCs: null
          },
          {
            dataId: "SPAT-CIB1000020300-1782956865-28319",
            trsmUtcTime: "1782962312146",
            itstId: "4765",
            eqmnId: "CIB1000020300",
            etStsgRmdrCs: "1120",
            wtStsgRmdrCs: "640"
          }
        ]);
      },
      writeFile: async (filePath, contents, encoding) => {
        assert.equal(filePath, "signal-snapshot.json");
        assert.equal(encoding, "utf8");
        written.set(filePath, contents);
      }
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.summary.outputPath, "signal-snapshot.json");
    assert.equal(result.summary.currentPhase, "east_priority");
    assert.match(result.output, /wrote=signal-snapshot.json/);

    assert.deepEqual(JSON.parse(written.get("signal-snapshot.json")), {
      controllerId: "CIB1000020300",
      capturedAt: "2026-07-02T03:18:32.146Z",
      currentPhase: "east_priority",
      remainingSeconds: 112,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    });
  });

  test("rejects T-DATA rows that only contain unsupported diagonal phases", async () => {
    const result = await buildSeoulV2xSignalSnapshotFile({
      responsePath: "seoul-v2x-response.json",
      outputPath: "signal-snapshot.json",
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false,
      readFile: async () =>
        JSON.stringify([
          {
            dataId: "SPAT-CIB1130047200-1782952627-45853",
            trsmUtcTime: "1782961446684",
            itstId: "23665",
            eqmnId: "CIB1130047200",
            seStsgRmdrCs: 45,
            nwStsgRmdrCs: 45
          }
        ]),
      writeFile: async () => {
        throw new Error("write should not be called");
      }
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.summary, null);
    assert.match(result.output, /cardinal straight signal remaining time is required/);
  });

  test("requires operator supplied signal fields instead of inventing defaults", async () => {
    const result = await buildSeoulV2xSignalSnapshotFile({
      responsePath: "seoul-v2x-response.json",
      outputPath: "signal-snapshot.json",
      nextPhase: undefined,
      controllerMode: "adaptive",
      manualOverride: false,
      readFile: async () => JSON.stringify([]),
      writeFile: async () => {
        throw new Error("write should not be called");
      }
    });

    assert.equal(result.exitCode, 2);
    assert.match(
      result.output,
      /Usage: npm run real-sample:build-signal-snapshot/
    );
  });
});
