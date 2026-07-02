import {
  normalizeLiveInputEnvelope,
  toSyntheticReplayInput
} from "./liveInputContract";
import { POLICY_SCORING_CONSTANTS } from "./policyScorecardContract";
import { recommendFromLiveReplayInput } from "./syntheticLiveInputDataset";
import type { SyntheticExpectedOutcome } from "./syntheticScenarios";

const STALE_SAMPLE_THRESHOLD_MS = 30_000;

export type RealSampleDropInReadiness = {
  source: "real_sample_drop_in_readiness";
  schemaVersion: "real-sample-drop-in.v1";
  status: "adapter_ready_waiting_for_live_signal_response";
  adapterBoundary: "live-input.v1";
  endpoint: "/api/real-sample-drop-in";
  sampleSlots: {
    id:
      | "authorized_cctv_frame_or_video"
      | "signal_phase_remaining_time"
      | "detector_output";
    required: true;
    acceptedFormats: string[];
    mapsTo: string;
    currentState:
      | "authorized_historical_sample_available"
      | "adapter_ready_live_key_required"
      | "label_adapter_ready";
  }[];
  validationFlow: string[];
  blockers: string[];
};

export type RealSampleDropInValidation = {
  source: "real_sample_drop_in_validation";
  schemaVersion: "real-sample-drop-in.v1";
  accepted: boolean;
  adapterBoundary: "live-input.v1";
  replayStatus: "replay_input_ready" | "rejected";
  recommendation: SyntheticExpectedOutcome["recommendation"] | null;
  operatorWorkflowStatus: "approval_review_ready" | "manual_review_required";
  operatorWorkflow: {
    source: "policy_scorecard";
    contractEndpoint: "/api/policy-scorecard-contract";
    status: "approval_review_ready" | "manual_review_required";
    selectedPolicy:
      | "safety_gate"
      | "safety_hold"
      | "emergency_clearance"
      | "pedestrian_efficiency"
      | "maintain_cycle";
    confidence: "high" | "low";
    requiredInputs: string[];
    blockedReasons: string[];
  };
  requiredInputs: string[];
  validationErrors: string[];
};

export function buildRealSampleDropInReadiness(): RealSampleDropInReadiness {
  return {
    source: "real_sample_drop_in_readiness",
    schemaVersion: "real-sample-drop-in.v1",
    status: "adapter_ready_waiting_for_live_signal_response",
    adapterBoundary: "live-input.v1",
    endpoint: "/api/real-sample-drop-in",
    sampleSlots: [
      {
        id: "authorized_cctv_frame_or_video",
        required: true,
        acceptedFormats: ["image/jpeg", "image/png", "video/mp4"],
        mapsTo: "cameraFrames[].detections",
        currentState: "authorized_historical_sample_available"
      },
      {
        id: "signal_phase_remaining_time",
        required: true,
        acceptedFormats: ["application/json"],
        mapsTo: "signalSnapshot",
        currentState: "adapter_ready_live_key_required"
      },
      {
        id: "detector_output",
        required: true,
        acceptedFormats: ["application/json"],
        mapsTo: "live-input.v1 detections",
        currentState: "label_adapter_ready"
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
      "live signal phase and remaining-time API response is not available",
      "AI-Hub sample frame is historical and requires fresh camera evidence before live drop-in acceptance",
      "camera-to-approach direction calibration is required before AI-Hub labels can become live-input.v1 detections"
    ]
  };
}

export function validateRealSampleDropInEnvelope(
  input: unknown
): RealSampleDropInValidation {
  try {
    const envelope = normalizeLiveInputEnvelope(input);
    const replayInput = toSyntheticReplayInput(envelope);

    const provenanceError = getProhibitedSampleIdentifierError(envelope);
    if (provenanceError) {
      const requiredInputs = ["authorized_real_sample_identifiers"];
      const validationErrors = [provenanceError];
      return {
        source: "real_sample_drop_in_validation",
        schemaVersion: "real-sample-drop-in.v1",
        accepted: false,
        adapterBoundary: "live-input.v1",
        replayStatus: "replay_input_ready",
        recommendation: null,
        operatorWorkflowStatus: "manual_review_required",
        operatorWorkflow: buildOperatorWorkflowSummary({
          status: "manual_review_required",
          recommendation: null,
          requiredInputs,
          validationErrors
        }),
        requiredInputs,
        validationErrors
      };
    }

    if (isSignalSnapshotStale(envelope)) {
      const requiredInputs = ["fresh_signal_snapshot"];
      const validationErrors = ["signal snapshot older than 30 seconds"];
      return {
        source: "real_sample_drop_in_validation",
        schemaVersion: "real-sample-drop-in.v1",
        accepted: false,
        adapterBoundary: "live-input.v1",
        replayStatus: "replay_input_ready",
        recommendation: null,
        operatorWorkflowStatus: "manual_review_required",
        operatorWorkflow: buildOperatorWorkflowSummary({
          status: "manual_review_required",
          recommendation: null,
          requiredInputs,
          validationErrors
        }),
        requiredInputs,
        validationErrors
      };
    }

    if (hasStaleCameraFrame(envelope)) {
      const requiredInputs = ["fresh_camera_frame"];
      const validationErrors = ["camera frame older than 30 seconds"];
      return {
        source: "real_sample_drop_in_validation",
        schemaVersion: "real-sample-drop-in.v1",
        accepted: false,
        adapterBoundary: "live-input.v1",
        replayStatus: "replay_input_ready",
        recommendation: null,
        operatorWorkflowStatus: "manual_review_required",
        operatorWorkflow: buildOperatorWorkflowSummary({
          status: "manual_review_required",
          recommendation: null,
          requiredInputs,
          validationErrors
        }),
        requiredInputs,
        validationErrors
      };
    }

    if (hasLowConfidenceDetection(envelope)) {
      const requiredInputs = ["higher_confidence_detection"];
      const validationErrors = ["detection confidence below 0.5"];
      return {
        source: "real_sample_drop_in_validation",
        schemaVersion: "real-sample-drop-in.v1",
        accepted: false,
        adapterBoundary: "live-input.v1",
        replayStatus: "replay_input_ready",
        recommendation: null,
        operatorWorkflowStatus: "manual_review_required",
        operatorWorkflow: buildOperatorWorkflowSummary({
          status: "manual_review_required",
          recommendation: null,
          requiredInputs,
          validationErrors
        }),
        requiredInputs,
        validationErrors
      };
    }

    const recommendation = recommendFromLiveReplayInput(replayInput.detections);

    if (
      recommendation === "safety_hold" &&
      hasUnknownEmergencyDirection(replayInput.detections)
    ) {
      const requiredInputs = ["emergency_vehicle.direction"];
      const validationErrors = ["emergency_vehicle_direction_unknown"];
      return {
        source: "real_sample_drop_in_validation",
        schemaVersion: "real-sample-drop-in.v1",
        accepted: false,
        adapterBoundary: "live-input.v1",
        replayStatus: "replay_input_ready",
        recommendation,
        operatorWorkflowStatus: "manual_review_required",
        operatorWorkflow: buildOperatorWorkflowSummary({
          status: "manual_review_required",
          recommendation,
          requiredInputs,
          validationErrors
        }),
        requiredInputs,
        validationErrors
      };
    }

    if (hasConflictingQueueAxes(replayInput.detections)) {
      const requiredInputs = ["signal_phase.remaining_seconds"];
      const validationErrors = ["conflicting_queue_axes"];
      return {
        source: "real_sample_drop_in_validation",
        schemaVersion: "real-sample-drop-in.v1",
        accepted: false,
        adapterBoundary: "live-input.v1",
        replayStatus: "replay_input_ready",
        recommendation: null,
        operatorWorkflowStatus: "manual_review_required",
        operatorWorkflow: buildOperatorWorkflowSummary({
          status: "manual_review_required",
          recommendation: null,
          requiredInputs,
          validationErrors
        }),
        requiredInputs,
        validationErrors
      };
    }

    if (hasEmergencyPedestrianConflict(replayInput.detections)) {
      const requiredInputs = ["operator_conflict_review"];
      const validationErrors = ["emergency priority conflicts with waiting pedestrian"];
      return {
        source: "real_sample_drop_in_validation",
        schemaVersion: "real-sample-drop-in.v1",
        accepted: false,
        adapterBoundary: "live-input.v1",
        replayStatus: "replay_input_ready",
        recommendation,
        operatorWorkflowStatus: "manual_review_required",
        operatorWorkflow: buildOperatorWorkflowSummary({
          status: "manual_review_required",
          recommendation,
          requiredInputs,
          validationErrors
        }),
        requiredInputs,
        validationErrors
      };
    }

    return {
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: true,
      adapterBoundary: "live-input.v1",
      replayStatus: "replay_input_ready",
      recommendation,
      operatorWorkflowStatus: "approval_review_ready",
      operatorWorkflow: buildOperatorWorkflowSummary({
        status: "approval_review_ready",
        recommendation,
        requiredInputs: [],
        validationErrors: []
      }),
      requiredInputs: [],
      validationErrors: []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const requiredInputs = inferRequiredInputs(message);
    const validationErrors = [message];
    return {
      source: "real_sample_drop_in_validation",
      schemaVersion: "real-sample-drop-in.v1",
      accepted: false,
      adapterBoundary: "live-input.v1",
      replayStatus: "rejected",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: buildOperatorWorkflowSummary({
        status: "manual_review_required",
        recommendation: null,
        requiredInputs,
        validationErrors
      }),
      requiredInputs,
      validationErrors
    };
  }
}

function buildOperatorWorkflowSummary({
  status,
  recommendation,
  requiredInputs,
  validationErrors
}: {
  status: RealSampleDropInValidation["operatorWorkflowStatus"];
  recommendation: RealSampleDropInValidation["recommendation"];
  requiredInputs: string[];
  validationErrors: string[];
}): RealSampleDropInValidation["operatorWorkflow"] {
  return {
    source: "policy_scorecard",
    contractEndpoint: "/api/policy-scorecard-contract",
    status,
    selectedPolicy: mapRecommendationToPolicy(recommendation),
    confidence: status === "approval_review_ready" ? "high" : "low",
    requiredInputs,
    blockedReasons: validationErrors
  };
}

function mapRecommendationToPolicy(
  recommendation: RealSampleDropInValidation["recommendation"]
): RealSampleDropInValidation["operatorWorkflow"]["selectedPolicy"] {
  if (recommendation === "blocked_response") return "safety_gate";
  if (recommendation === "emergency_priority") return "emergency_clearance";
  if (recommendation === "pedestrian_priority") return "pedestrian_efficiency";
  if (recommendation === "normal_cycle") return "maintain_cycle";
  return "safety_hold";
}

function inferRequiredInputs(message: string) {
  if (message.includes("signalSnapshot")) {
    return ["signalSnapshot"];
  }
  if (message.includes("cameraFrames")) {
    return ["cameraFrames"];
  }
  if (message.includes("schemaVersion")) {
    return ["schemaVersion"];
  }
  return ["live-input.v1 envelope"];
}

function hasLowConfidenceDetection(
  envelope: ReturnType<typeof normalizeLiveInputEnvelope>
) {
  return envelope.cameraFrames.some((frame) =>
    frame.detections.some((detection) => detection.confidence < 0.5)
  );
}

function isSignalSnapshotStale(
  envelope: ReturnType<typeof normalizeLiveInputEnvelope>
) {
  if (!envelope.signalSnapshot) return false;

  const receivedAt = Date.parse(envelope.receivedAt);
  const capturedAt = Date.parse(envelope.signalSnapshot.capturedAt);

  return receivedAt - capturedAt > STALE_SAMPLE_THRESHOLD_MS;
}

function hasStaleCameraFrame(
  envelope: ReturnType<typeof normalizeLiveInputEnvelope>
) {
  const receivedAt = Date.parse(envelope.receivedAt);

  return envelope.cameraFrames.some((frame) => {
    const capturedAt = Date.parse(frame.capturedAt);
    return receivedAt - capturedAt > STALE_SAMPLE_THRESHOLD_MS;
  });
}

function getProhibitedSampleIdentifierError(
  envelope: ReturnType<typeof normalizeLiveInputEnvelope>
) {
  const identifiers = [
    envelope.intersectionId,
    ...envelope.cameraFrames.flatMap((frame) => [
      frame.cameraId,
      frame.frameId,
      ...frame.detections.map((detection) => detection.objectId)
    ]),
    envelope.signalSnapshot?.controllerId ?? ""
  ];

  if (identifiers.some((identifier) => /(?:fixture|synthetic)/i.test(identifier))) {
    return "fixture_or_synthetic_sample_not_allowed";
  }
  if (
    identifiers.some((identifier) =>
      /(?:placeholder|example|mock|demo)/i.test(identifier)
    )
  ) {
    return "placeholder_or_demo_sample_not_allowed";
  }
  return null;
}

function hasEmergencyPedestrianConflict(
  detections: ReturnType<typeof toSyntheticReplayInput>["detections"]
) {
  const hasEmergency = detections.some(
    (detection) => detection.type === "emergency_vehicle"
  );
  const hasWaitingPedestrian = detections.some(
    (detection) =>
      detection.type === "pedestrian" && (detection.waitingSeconds ?? 0) >= 60
  );

  return hasEmergency && hasWaitingPedestrian;
}

function hasUnknownEmergencyDirection(
  detections: ReturnType<typeof toSyntheticReplayInput>["detections"]
) {
  return detections.some(
    (detection) =>
      detection.type === "emergency_vehicle" && detection.direction === null
  );
}

function hasConflictingQueueAxes(
  detections: ReturnType<typeof toSyntheticReplayInput>["detections"]
) {
  if (detections.some((detection) => detection.type === "emergency_vehicle")) {
    return false;
  }

  const queueThreshold = POLICY_SCORING_CONSTANTS.queueThreshold;
  const northSouthQueue = Math.max(
    0,
    ...detections
      .filter(
        (detection) =>
          detection.type === "vehicle" &&
          (detection.direction === "north" || detection.direction === "south")
      )
      .map((detection) => detection.count)
  );
  const eastWestQueue = Math.max(
    0,
    ...detections
      .filter(
        (detection) =>
          detection.type === "vehicle" &&
          (detection.direction === "east" || detection.direction === "west")
      )
      .map((detection) => detection.count)
  );

  return northSouthQueue > queueThreshold && eastWestQueue > queueThreshold;
}
