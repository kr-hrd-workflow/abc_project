import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildNationalTrafficSignalSnapshotFile } from "./build-national-traffic-signal-snapshot.mjs";

describe("National traffic signal snapshot builder", () => {
  test("builds a LiveSignalSnapshot from a selected tl_drct_info row", async () => {
    const written = new Map();
    const result = await buildNationalTrafficSignalSnapshotFile({
      responsePath: "national-signal-response.json",
      outputPath: "signal-snapshot.json",
      crsrdId: "2904",
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false,
      readFile: async (filePath, encoding) => {
        assert.equal(filePath, "national-signal-response.json");
        assert.equal(encoding, "utf8");
        return JSON.stringify({
          response: {
            body: {
              items: {
                item: [
                  {
                    stdgCd: "1100000000",
                    lclgvNm: "서울특별시",
                    crsrdId: "2904",
                    crsrdNm: "시청",
                    totDt: "20260703114701",
                    ntStsgRmndCs: "1250",
                    stStsgRmndCs: 830
                  }
                ]
              }
            }
          }
        });
      },
      writeFile: async (filePath, contents, encoding) => {
        assert.equal(filePath, "signal-snapshot.json");
        assert.equal(encoding, "utf8");
        written.set(filePath, contents);
      }
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.summary.currentPhase, "north_priority");
    assert.match(result.output, /sourceField=ntStsgRmndCs/);
    assert.deepEqual(JSON.parse(written.get("signal-snapshot.json")), {
      controllerId: "national-traffic-signal:1100000000:2904",
      capturedAt: "2026-07-03T02:47:01.000Z",
      currentPhase: "north_priority",
      remainingSeconds: 13,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    });
  });

  test("requires operator supplied replay fields instead of inventing defaults", async () => {
    const result = await buildNationalTrafficSignalSnapshotFile({
      responsePath: "national-signal-response.json",
      outputPath: "signal-snapshot.json",
      crsrdId: "2904",
      nextPhase: undefined,
      controllerMode: "adaptive",
      manualOverride: false,
      readFile: async () => JSON.stringify({}),
      writeFile: async () => {
        throw new Error("write should not be called");
      }
    });

    assert.equal(result.exitCode, 2);
    assert.match(
      result.output,
      /Usage: npm run real-sample:build-national-signal-snapshot/
    );
  });
});
