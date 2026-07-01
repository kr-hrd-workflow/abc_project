import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { checkRealSampleDropInFile } from "./real-sample-drop-in-check.mjs";

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    }
  };
}

describe("real sample drop-in file check", () => {
  test("posts a local live-input envelope file to the drop-in endpoint", async () => {
    const calls = [];
    const result = await checkRealSampleDropInFile({
      filePath: "authorized-sample.json",
      endpointUrl: "http://web.local/api/real-sample-drop-in",
      readFile: async (filePath, encoding) => {
        assert.equal(filePath, "authorized-sample.json");
        assert.equal(encoding, "utf8");
        return JSON.stringify({ schemaVersion: "live-input.v1" });
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url, options });
        assert.equal(url, "http://web.local/api/real-sample-drop-in");
        assert.equal(options.method, "POST");
        assert.equal(options.headers["Content-Type"], "application/json");
        assert.deepEqual(JSON.parse(options.body), {
          schemaVersion: "live-input.v1"
        });
        return jsonResponse(200, {
          source: "real_sample_drop_in_validation",
          accepted: true,
          replayStatus: "replay_input_ready",
          recommendation: "emergency_priority",
          operatorWorkflowStatus: "approval_review_ready",
          operatorWorkflow: {
            selectedPolicy: "emergency_clearance",
            confidence: "high",
            requiredInputs: [],
            blockedReasons: []
          },
          validationErrors: []
        });
      }
    });

    assert.equal(calls.length, 1);
    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.summary, {
      accepted: true,
      replayStatus: "replay_input_ready",
      recommendation: "emergency_priority",
      operatorWorkflowStatus: "approval_review_ready",
      selectedPolicy: "emergency_clearance",
      confidence: "high",
      requiredInputs: [],
      validationErrors: []
    });
    assert.match(result.output, /accepted=true/);
    assert.match(result.output, /selectedPolicy=emergency_clearance/);
  });

  test("returns a nonzero exit code for manual-review validation", async () => {
    const result = await checkRealSampleDropInFile({
      filePath: "stale-sample.json",
      endpointUrl: "http://web.local/api/real-sample-drop-in",
      readFile: async () => JSON.stringify({ schemaVersion: "live-input.v1" }),
      fetchImpl: async () =>
        jsonResponse(400, {
          source: "real_sample_drop_in_validation",
          accepted: false,
          replayStatus: "replay_input_ready",
          recommendation: null,
          operatorWorkflowStatus: "manual_review_required",
          operatorWorkflow: {
            selectedPolicy: "safety_hold",
            confidence: "low",
            requiredInputs: ["fresh_signal_snapshot"],
            blockedReasons: ["signal snapshot older than 30 seconds"]
          },
          validationErrors: ["signal snapshot older than 30 seconds"]
        })
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.summary.operatorWorkflowStatus, "manual_review_required");
    assert.deepEqual(result.summary.requiredInputs, ["fresh_signal_snapshot"]);
    assert.match(result.output, /accepted=false/);
    assert.match(result.output, /validationErrors=signal snapshot older than 30 seconds/);
  });

  test("validates replay-ready envelope shape offline without calling fetch", async () => {
    const result = await checkRealSampleDropInFile({
      filePath: "authorized-sample.json",
      offline: true,
      readFile: async () => JSON.stringify(buildAuthorizedEnvelope()),
      fetchImpl: async () => {
        throw new Error("fetch should not be called in offline mode");
      }
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.summary.validationMode, "offline_shape_check");
    assert.equal(result.summary.accepted, true);
    assert.equal(result.summary.replayStatus, "replay_input_ready");
    assert.equal(result.summary.recommendation, null);
    assert.equal(result.summary.operatorWorkflowStatus, "approval_review_ready");
    assert.equal(result.summary.selectedPolicy, "offline_shape_check");
    assert.deepEqual(result.summary.requiredInputs, []);
    assert.deepEqual(result.summary.validationErrors, []);
    assert.match(result.output, /validationMode=offline_shape_check/);
  });

  test("rejects fixture or synthetic identifiers offline", async () => {
    const fixtureEnvelope = buildAuthorizedEnvelope();
    fixtureEnvelope.intersectionId = "INT-SYNTHETIC-FIXTURE-0001";

    const result = await checkRealSampleDropInFile({
      filePath: "fixture-sample.json",
      offline: true,
      readFile: async () => JSON.stringify(fixtureEnvelope),
      fetchImpl: async () => {
        throw new Error("fetch should not be called in offline mode");
      }
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.summary.validationMode, "offline_shape_check");
    assert.equal(result.summary.accepted, false);
    assert.equal(result.summary.operatorWorkflowStatus, "manual_review_required");
    assert.equal(result.summary.selectedPolicy, "safety_hold");
    assert.deepEqual(result.summary.requiredInputs, [
      "authorized_real_sample_identifiers"
    ]);
    assert.deepEqual(result.summary.validationErrors, [
      "fixture_or_synthetic_sample_not_allowed"
    ]);
  });
});

function buildAuthorizedEnvelope() {
  return {
    schemaVersion: "live-input.v1",
    intersectionId: "INT-REAL-SAMPLE-0001",
    receivedAt: "2026-07-01T09:10:01.000Z",
    cameraFrames: [
      {
        cameraId: "authorized-cctv-east-01",
        frameId: "authorized-frame-0001",
        capturedAt: "2026-07-01T09:10:00.000Z",
        detections: [
          {
            objectId: "det-emergency-001",
            classLabel: "emergency_vehicle",
            confidence: 0.96,
            direction: "east",
            laneId: "east_approach_1",
            count: 1,
            distanceMeters: 70
          }
        ]
      }
    ],
    signalSnapshot: {
      controllerId: "signal-controller-real-01",
      capturedAt: "2026-07-01T09:10:00.000Z",
      currentPhase: "east_priority",
      remainingSeconds: 18,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    }
  };
}
