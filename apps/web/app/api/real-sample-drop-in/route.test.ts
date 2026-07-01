import { describe, expect, test } from "vitest";

import { GET, POST } from "./route";

describe("real sample drop-in route", () => {
  test("returns the local readiness slot for authorized real samples", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.source).toBe("real_sample_drop_in_readiness");
    expect(body.schemaVersion).toBe("real-sample-drop-in.v1");
    expect(body.status).toBe("waiting_for_authorized_samples");
    expect(body.adapterBoundary).toBe("live-input.v1");
    expect(body.sampleSlots.map((slot: { id: string }) => slot.id)).toEqual([
      "authorized_cctv_frame_or_video",
      "signal_phase_remaining_time",
      "detector_output"
    ]);
    expect(body.validationFlow).toContain("run local recommendation policy");
  });

  test("validates posted live-input.v1 JSON without persisting it", async () => {
    const response = await POST(
      new Request("http://localhost/api/real-sample-drop-in", {
        method: "POST",
        body: JSON.stringify(buildLiveInputEnvelope())
      })
    );
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      source: "real_sample_drop_in_validation",
      accepted: true,
      replayStatus: "replay_input_ready",
      recommendation: "emergency_priority",
      operatorWorkflowStatus: "approval_review_ready",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "approval_review_ready",
        selectedPolicy: "emergency_clearance",
        confidence: "high"
      }
    });
  });

  test("returns manual review for invalid posted sample JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/real-sample-drop-in", {
        method: "POST",
        body: JSON.stringify({ schemaVersion: "live-input.v1" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      source: "real_sample_drop_in_validation",
      accepted: false,
      replayStatus: "rejected",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "manual_review_required",
        selectedPolicy: "safety_hold",
        confidence: "low"
      }
    });
    expect(body.validationErrors.length).toBeGreaterThan(0);
  });

  test("returns manual review for low-confidence posted detections", async () => {
    const lowConfidenceEnvelope = buildLiveInputEnvelope();
    lowConfidenceEnvelope.cameraFrames[0].detections[0].confidence = 0.42;

    const response = await POST(
      new Request("http://localhost/api/real-sample-drop-in", {
        method: "POST",
        body: JSON.stringify(lowConfidenceEnvelope)
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      source: "real_sample_drop_in_validation",
      accepted: false,
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      requiredInputs: ["higher_confidence_detection"],
      validationErrors: ["detection confidence below 0.5"]
    });
  });

  test("returns manual review for stale signal snapshots", async () => {
    const staleSignalEnvelope = buildLiveInputEnvelope();
    staleSignalEnvelope.receivedAt = "2026-07-01T09:10:40.000Z";
    staleSignalEnvelope.signalSnapshot.capturedAt = "2026-07-01T09:10:00.000Z";

    const response = await POST(
      new Request("http://localhost/api/real-sample-drop-in", {
        method: "POST",
        body: JSON.stringify(staleSignalEnvelope)
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      source: "real_sample_drop_in_validation",
      accepted: false,
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      requiredInputs: ["fresh_signal_snapshot"],
      validationErrors: ["signal snapshot older than 30 seconds"]
    });
  });

  test("returns manual review for emergency and pedestrian conflict", async () => {
    const conflictEnvelope = buildLiveInputEnvelope();
    conflictEnvelope.cameraFrames[0].detections.push({
      objectId: "det-pedestrian-conflict-001",
      classLabel: "pedestrian",
      confidence: 0.91,
      direction: "north",
      laneId: "north_crosswalk_1",
      count: 1,
      waitingSeconds: 120
    });

    const response = await POST(
      new Request("http://localhost/api/real-sample-drop-in", {
        method: "POST",
        body: JSON.stringify(conflictEnvelope)
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      source: "real_sample_drop_in_validation",
      accepted: false,
      replayStatus: "replay_input_ready",
      recommendation: "emergency_priority",
      operatorWorkflowStatus: "manual_review_required",
      requiredInputs: ["operator_conflict_review"],
      validationErrors: ["emergency priority conflicts with waiting pedestrian"]
    });
  });

  test("returns manual review for conflicting queue axes", async () => {
    const response = await POST(
      new Request("http://localhost/api/real-sample-drop-in", {
        method: "POST",
        body: JSON.stringify(buildConflictingQueueAxesEnvelope())
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      source: "real_sample_drop_in_validation",
      accepted: false,
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: ["signal_phase.remaining_seconds"],
        blockedReasons: ["conflicting_queue_axes"]
      },
      requiredInputs: ["signal_phase.remaining_seconds"],
      validationErrors: ["conflicting_queue_axes"]
    });
  });

  test("returns manual review for fixture or synthetic posted samples", async () => {
    const response = await POST(
      new Request("http://localhost/api/real-sample-drop-in", {
        method: "POST",
        body: JSON.stringify(buildFixtureLikeEnvelope())
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      source: "real_sample_drop_in_validation",
      accepted: false,
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: ["authorized_real_sample_identifiers"],
        blockedReasons: ["fixture_or_synthetic_sample_not_allowed"]
      },
      requiredInputs: ["authorized_real_sample_identifiers"],
      validationErrors: ["fixture_or_synthetic_sample_not_allowed"]
    });
  });

  test("returns manual review for placeholder or demo posted samples", async () => {
    const response = await POST(
      new Request("http://localhost/api/real-sample-drop-in", {
        method: "POST",
        body: JSON.stringify(buildPlaceholderLikeEnvelope())
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      source: "real_sample_drop_in_validation",
      accepted: false,
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: ["authorized_real_sample_identifiers"],
        blockedReasons: ["placeholder_or_demo_sample_not_allowed"]
      },
      requiredInputs: ["authorized_real_sample_identifiers"],
      validationErrors: ["placeholder_or_demo_sample_not_allowed"]
    });
  });
});

function buildLiveInputEnvelope() {
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
  return {
    ...buildLiveInputEnvelope(),
    cameraFrames: [
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
    ],
    signalSnapshot: {
      controllerId: "signal-controller-real-01",
      capturedAt: "2026-07-01T09:10:00.000Z",
      currentPhase: "normal_cycle",
      remainingSeconds: 18,
      nextPhase: "east_priority",
      controllerMode: "adaptive",
      manualOverride: false
    }
  };
}

function buildFixtureLikeEnvelope() {
  return {
    ...buildLiveInputEnvelope(),
    intersectionId: "INT-SYNTHETIC-FIXTURE-0001",
    cameraFrames: [
      {
        cameraId: "synthetic-fixture-camera-01",
        frameId: "fixture-frame-0001",
        capturedAt: "2026-07-01T09:10:00.000Z",
        detections: [
          {
            objectId: "fixture-emergency-001",
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
      controllerId: "synthetic-signal-controller-01",
      capturedAt: "2026-07-01T09:10:00.000Z",
      currentPhase: "east_priority",
      remainingSeconds: 18,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    }
  };
}

function buildPlaceholderLikeEnvelope() {
  return {
    ...buildLiveInputEnvelope(),
    cameraFrames: [
      {
        cameraId: "authorized-cctv-east-01",
        frameId: "placeholder-frame-0001",
        capturedAt: "2026-07-01T09:10:00.000Z",
        detections: [
          {
            objectId: "example-emergency-001",
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
      controllerId: "mock-signal-controller-01",
      capturedAt: "2026-07-01T09:10:00.000Z",
      currentPhase: "east_priority",
      remainingSeconds: 18,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    }
  };
}
