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

  test("rejects placeholder or demo identifiers offline", async () => {
    const placeholderEnvelope = buildAuthorizedEnvelope();
    placeholderEnvelope.cameraFrames[0].frameId = "placeholder-frame-0001";
    placeholderEnvelope.cameraFrames[0].detections[0].objectId =
      "example-emergency-001";
    placeholderEnvelope.signalSnapshot.controllerId = "mock-signal-controller-01";

    const result = await checkRealSampleDropInFile({
      filePath: "placeholder-sample.json",
      offline: true,
      readFile: async () => JSON.stringify(placeholderEnvelope),
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
      "placeholder_or_demo_sample_not_allowed"
    ]);
  });

  test("routes low-confidence detections to manual review offline", async () => {
    const lowConfidenceEnvelope = buildAuthorizedEnvelope();
    lowConfidenceEnvelope.cameraFrames[0].detections[0].confidence = 0.42;

    const result = await checkRealSampleDropInFile({
      filePath: "low-confidence-sample.json",
      offline: true,
      readFile: async () => JSON.stringify(lowConfidenceEnvelope)
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.summary.validationMode, "offline_shape_check");
    assert.equal(result.summary.accepted, false);
    assert.deepEqual(result.summary.requiredInputs, [
      "higher_confidence_detection"
    ]);
    assert.deepEqual(result.summary.validationErrors, [
      "detection confidence below 0.5"
    ]);
  });

  test("routes stale signal snapshots to manual review offline", async () => {
    const staleEnvelope = buildAuthorizedEnvelope();
    staleEnvelope.receivedAt = "2026-07-01T09:10:40.000Z";
    staleEnvelope.signalSnapshot.capturedAt = "2026-07-01T09:10:00.000Z";

    const result = await checkRealSampleDropInFile({
      filePath: "stale-signal-sample.json",
      offline: true,
      readFile: async () => JSON.stringify(staleEnvelope)
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.summary.validationMode, "offline_shape_check");
    assert.equal(result.summary.accepted, false);
    assert.deepEqual(result.summary.requiredInputs, ["fresh_signal_snapshot"]);
    assert.deepEqual(result.summary.validationErrors, [
      "signal snapshot older than 30 seconds"
    ]);
  });

  test("routes conflicting queue axes to manual review offline", async () => {
    const conflictEnvelope = buildConflictingQueueAxesEnvelope();

    const result = await checkRealSampleDropInFile({
      filePath: "queue-conflict-sample.json",
      offline: true,
      readFile: async () => JSON.stringify(conflictEnvelope)
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.summary.validationMode, "offline_shape_check");
    assert.equal(result.summary.accepted, false);
    assert.deepEqual(result.summary.requiredInputs, [
      "signal_phase.remaining_seconds"
    ]);
    assert.deepEqual(result.summary.validationErrors, ["conflicting_queue_axes"]);
  });

  test("routes emergency and long-waiting pedestrian conflict to manual review offline", async () => {
    const conflictEnvelope = buildAuthorizedEnvelope();
    conflictEnvelope.cameraFrames[0].detections.push({
      objectId: "det-pedestrian-conflict-001",
      classLabel: "pedestrian",
      confidence: 0.91,
      direction: "north",
      laneId: "north_crosswalk_1",
      count: 1,
      waitingSeconds: 120
    });

    const result = await checkRealSampleDropInFile({
      filePath: "emergency-pedestrian-conflict-sample.json",
      offline: true,
      readFile: async () => JSON.stringify(conflictEnvelope)
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.summary.validationMode, "offline_shape_check");
    assert.equal(result.summary.accepted, false);
    assert.equal(result.summary.replayStatus, "replay_input_ready");
    assert.equal(result.summary.operatorWorkflowStatus, "manual_review_required");
    assert.equal(result.summary.selectedPolicy, "emergency_clearance");
    assert.deepEqual(result.summary.requiredInputs, ["operator_conflict_review"]);
    assert.deepEqual(result.summary.validationErrors, [
      "emergency priority conflicts with waiting pedestrian"
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

function buildConflictingQueueAxesEnvelope() {
  const envelope = buildAuthorizedEnvelope();
  envelope.cameraFrames = [
    {
      cameraId: "authorized-cctv-multi-axis-01",
      frameId: "authorized-frame-queue-conflict-0001",
      capturedAt: "2026-07-01T09:10:00.000Z",
      detections: [
        {
          objectId: "det-north-queue-001",
          classLabel: "vehicle",
          confidence: 0.93,
          direction: "north",
          laneId: "north_through_1",
          count: 32,
          waitingSeconds: 92
        },
        {
          objectId: "det-east-queue-001",
          classLabel: "vehicle",
          confidence: 0.92,
          direction: "east",
          laneId: "east_through_1",
          count: 31,
          waitingSeconds: 88
        }
      ]
    }
  ];
  envelope.signalSnapshot.currentPhase = "normal_cycle";
  envelope.signalSnapshot.nextPhase = "east_priority";
  return envelope;
}
