import { describe, expect, test } from "vitest";

import {
  buildRealSampleDropInReadiness,
  validateRealSampleDropInEnvelope
} from "./realSampleDropIn";

describe("real sample drop-in readiness", () => {
  test("describes the authorized sample slot without inventing live data", () => {
    const artifact = buildRealSampleDropInReadiness();

    expect(artifact).toEqual({
      source: "real_sample_drop_in_readiness",
      schemaVersion: "real-sample-drop-in.v1",
      status: "waiting_for_authorized_samples",
      adapterBoundary: "live-input.v1",
      endpoint: "/api/real-sample-drop-in",
      sampleSlots: [
        {
          id: "authorized_cctv_frame_or_video",
          required: true,
          acceptedFormats: ["image/jpeg", "image/png", "video/mp4"],
          mapsTo: "cameraFrames[].detections",
          currentState: "missing"
        },
        {
          id: "signal_phase_remaining_time",
          required: true,
          acceptedFormats: ["application/json"],
          mapsTo: "signalSnapshot",
          currentState: "missing"
        },
        {
          id: "detector_output",
          required: true,
          acceptedFormats: ["application/json"],
          mapsTo: "live-input.v1 detections",
          currentState: "fixture_only"
        }
      ],
      validationFlow: [
        "normalize source sample into live-input.v1",
        "validate live-input.v1 envelope",
        "convert envelope to replay input",
        "run local recommendation policy",
        "derive operator workflow status",
        "refresh demo evidence export"
      ],
      blockers: [
        "authorized CCTV frame or video sample is not available",
        "signal phase and remaining-time sample is not available"
      ]
    });

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain("rtsp://");
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
  });

  test("validates a provided live-input.v1 envelope through replay and recommendation", () => {
    const result = validateRealSampleDropInEnvelope(buildLiveInputEnvelope());

    expect(result).toEqual({
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: true,
      adapterBoundary: "live-input.v1",
      replayStatus: "replay_input_ready",
      recommendation: "emergency_priority",
      operatorWorkflowStatus: "approval_review_ready",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "approval_review_ready",
        selectedPolicy: "emergency_clearance",
        confidence: "high",
        requiredInputs: [],
        blockedReasons: []
      },
      requiredInputs: [],
      validationErrors: []
    });
  });

  test("rejects a drop-in payload that cannot become replay input", () => {
    const invalidEnvelope = {
      ...buildLiveInputEnvelope(),
      signalSnapshot: null
    };

    const result = validateRealSampleDropInEnvelope(invalidEnvelope);

    expect(result).toEqual({
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: false,
      adapterBoundary: "live-input.v1",
      replayStatus: "rejected",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "manual_review_required",
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: ["signalSnapshot"],
        blockedReasons: ["signalSnapshot is required for replay-compatible input"]
      },
      requiredInputs: ["signalSnapshot"],
      validationErrors: ["signalSnapshot is required for replay-compatible input"]
    });
  });

  test("requires manual review for low-confidence detections", () => {
    const lowConfidenceEnvelope = buildLiveInputEnvelope();
    lowConfidenceEnvelope.cameraFrames[0].detections[0].confidence = 0.42;

    const result = validateRealSampleDropInEnvelope(lowConfidenceEnvelope);

    expect(result).toEqual({
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: false,
      adapterBoundary: "live-input.v1",
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "manual_review_required",
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: ["higher_confidence_detection"],
        blockedReasons: ["detection confidence below 0.5"]
      },
      requiredInputs: ["higher_confidence_detection"],
      validationErrors: ["detection confidence below 0.5"]
    });
  });

  test("requires manual review for stale signal snapshots", () => {
    const staleSignalEnvelope = buildLiveInputEnvelope();
    staleSignalEnvelope.receivedAt = "2026-07-01T09:10:40.000Z";
    staleSignalEnvelope.signalSnapshot.capturedAt = "2026-07-01T09:10:00.000Z";

    const result = validateRealSampleDropInEnvelope(staleSignalEnvelope);

    expect(result).toEqual({
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: false,
      adapterBoundary: "live-input.v1",
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "manual_review_required",
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: ["fresh_signal_snapshot"],
        blockedReasons: ["signal snapshot older than 30 seconds"]
      },
      requiredInputs: ["fresh_signal_snapshot"],
      validationErrors: ["signal snapshot older than 30 seconds"]
    });
  });

  test("requires manual review for stale camera frames", () => {
    const staleFrameEnvelope = buildLiveInputEnvelope();
    staleFrameEnvelope.receivedAt = "2026-07-01T09:10:40.000Z";
    staleFrameEnvelope.cameraFrames[0].capturedAt = "2026-07-01T09:10:00.000Z";
    staleFrameEnvelope.signalSnapshot.capturedAt = "2026-07-01T09:10:39.000Z";

    const result = validateRealSampleDropInEnvelope(staleFrameEnvelope);

    expect(result).toEqual({
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: false,
      adapterBoundary: "live-input.v1",
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "manual_review_required",
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: ["fresh_camera_frame"],
        blockedReasons: ["camera frame older than 30 seconds"]
      },
      requiredInputs: ["fresh_camera_frame"],
      validationErrors: ["camera frame older than 30 seconds"]
    });
  });

  test("keeps emergency recommendation visible while requiring conflict review", () => {
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

    const result = validateRealSampleDropInEnvelope(conflictEnvelope);

    expect(result).toEqual({
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: false,
      adapterBoundary: "live-input.v1",
      replayStatus: "replay_input_ready",
      recommendation: "emergency_priority",
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "manual_review_required",
        selectedPolicy: "emergency_clearance",
        confidence: "low",
        requiredInputs: ["operator_conflict_review"],
        blockedReasons: ["emergency priority conflicts with waiting pedestrian"]
      },
      requiredInputs: ["operator_conflict_review"],
      validationErrors: ["emergency priority conflicts with waiting pedestrian"]
    });
  });

  test("requires manual review when an emergency vehicle direction is unknown", () => {
    const unknownDirectionEnvelope = buildLiveInputEnvelope();
    unknownDirectionEnvelope.cameraFrames[0].detections[0].direction = null;

    const result = validateRealSampleDropInEnvelope(unknownDirectionEnvelope);

    expect(result).toEqual({
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: false,
      adapterBoundary: "live-input.v1",
      replayStatus: "replay_input_ready",
      recommendation: "safety_hold",
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "manual_review_required",
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: ["emergency_vehicle.direction"],
        blockedReasons: ["emergency_vehicle_direction_unknown"]
      },
      requiredInputs: ["emergency_vehicle.direction"],
      validationErrors: ["emergency_vehicle_direction_unknown"]
    });
  });

  test("requires manual review for conflicting queue axes", () => {
    const conflictEnvelope = buildConflictingQueueAxesEnvelope();

    const result = validateRealSampleDropInEnvelope(conflictEnvelope);

    expect(result).toEqual({
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: false,
      adapterBoundary: "live-input.v1",
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "manual_review_required",
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: ["signal_phase.remaining_seconds"],
        blockedReasons: ["conflicting_queue_axes"]
      },
      requiredInputs: ["signal_phase.remaining_seconds"],
      validationErrors: ["conflicting_queue_axes"]
    });
  });

  test("does not accept fixture or synthetic payloads as real samples", () => {
    const fixtureEnvelope = buildFixtureLikeEnvelope();

    const result = validateRealSampleDropInEnvelope(fixtureEnvelope);

    expect(result).toEqual({
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: false,
      adapterBoundary: "live-input.v1",
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "manual_review_required",
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: ["authorized_real_sample_identifiers"],
        blockedReasons: ["fixture_or_synthetic_sample_not_allowed"]
      },
      requiredInputs: ["authorized_real_sample_identifiers"],
      validationErrors: ["fixture_or_synthetic_sample_not_allowed"]
    });
  });

  test("does not accept placeholder or demo identifiers as real samples", () => {
    const placeholderEnvelope = buildPlaceholderLikeEnvelope();

    const result = validateRealSampleDropInEnvelope(placeholderEnvelope);

    expect(result).toEqual({
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: false,
      adapterBoundary: "live-input.v1",
      replayStatus: "replay_input_ready",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        source: "policy_scorecard",
        contractEndpoint: "/api/policy-scorecard-contract",
        status: "manual_review_required",
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
