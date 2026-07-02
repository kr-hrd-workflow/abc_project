import { buildRealSampleDropInReadiness } from "./realSampleDropIn";

export type RealSampleIntakePackage = {
  source: "real_sample_intake_package";
  schemaVersion: "real-sample-intake-package.v1";
  generatedAt: string;
  status: "signal_ready_waiting_for_fresh_camera_and_calibration";
  adapterBoundary: "live-input.v1";
  dropInEndpoint: "/api/real-sample-drop-in";
  readinessEndpoint: "/api/real-sample-drop-in";
  schemaEndpoint: "/api/live-input-submission-schema";
  finalReadinessEndpoint: "/api/final-local-readiness";
  localCliCommand: "npm run real-sample:check -- <live-input-envelope.json>";
  offlineCliCommand: "npm run real-sample:check -- --offline <live-input-envelope.json>";
  cameraDetectorBuildCommand: "npm run real-sample:build-camera-envelope -- <detector-output.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>";
  signalSnapshotBuildCommand: "npm run real-sample:build-signal-snapshot -- <seoul-v2x-response.json> <signal-snapshot.json> <nextPhase> <controllerMode> <manualOverride>";
  noPersistence: true;
  sampleSlotIds: string[];
  sourceAdapterContracts: {
    schemaVersion:
      | "authorized-camera-detector-output.v1"
      | "camera-approach-calibration.v1";
    purpose: string;
    mapsTo: string;
  }[];
  envelopeRequirements: {
    schemaVersion: "live-input.v1";
    requiredTopLevelFields: string[];
    requiredDetectionFields: string[];
    requiredSignalFields: string[];
  };
  validationGuardrails: string[];
  prohibitedInputs: string[];
  submissionSteps: string[];
};

export function buildRealSampleIntakePackage({
  generatedAt = new Date().toISOString()
}: {
  generatedAt?: string;
} = {}): RealSampleIntakePackage {
  const readiness = buildRealSampleDropInReadiness();

  return {
    source: "real_sample_intake_package",
    schemaVersion: "real-sample-intake-package.v1",
    generatedAt,
    status: readiness.status,
    adapterBoundary: readiness.adapterBoundary,
    dropInEndpoint: readiness.endpoint,
    readinessEndpoint: readiness.endpoint,
    schemaEndpoint: "/api/live-input-submission-schema",
    finalReadinessEndpoint: "/api/final-local-readiness",
    localCliCommand:
      "npm run real-sample:check -- <live-input-envelope.json>",
    offlineCliCommand:
      "npm run real-sample:check -- --offline <live-input-envelope.json>",
    cameraDetectorBuildCommand:
      "npm run real-sample:build-camera-envelope -- <detector-output.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>",
    signalSnapshotBuildCommand:
      "npm run real-sample:build-signal-snapshot -- <seoul-v2x-response.json> <signal-snapshot.json> <nextPhase> <controllerMode> <manualOverride>",
    noPersistence: true,
    sampleSlotIds: readiness.sampleSlots.map((slot) => slot.id),
    sourceAdapterContracts: [
      {
        schemaVersion: "authorized-camera-detector-output.v1",
        purpose:
          "fresh detector output before camera-to-approach calibration is applied",
        mapsTo: "cameraFrames[].detections"
      },
      {
        schemaVersion: "camera-approach-calibration.v1",
        purpose:
          "operator-verified mapping from cameraId to approach direction",
        mapsTo: "cameraFrames[].detections[].direction"
      }
    ],
    envelopeRequirements: {
      schemaVersion: "live-input.v1",
      requiredTopLevelFields: [
        "schemaVersion",
        "intersectionId",
        "receivedAt",
        "cameraFrames",
        "signalSnapshot"
      ],
      requiredDetectionFields: [
        "objectId",
        "classLabel",
        "confidence",
        "direction",
        "laneId",
        "count"
      ],
      requiredSignalFields: [
        "controllerId",
        "capturedAt",
        "currentPhase",
        "remainingSeconds",
        "nextPhase",
        "controllerMode",
        "manualOverride"
      ]
    },
    validationGuardrails: [
      "reject invalid live-input.v1 envelope",
      "manual review when sample identifiers indicate fixture, synthetic, placeholder, mock, example, or demo data",
      "manual review when signal snapshot older than 30 seconds",
      "manual review when camera frame older than 30 seconds",
      "manual review when any detection confidence is below 0.5",
      "manual review when vehicle queues exceed threshold on conflicting movement axes",
      "operator conflict review when emergency priority conflicts with a long-waiting pedestrian"
    ],
    prohibitedInputs: [
      "raw stream credentials",
      "unauthorized CCTV frames or video",
      "secret API keys"
    ],
    submissionSteps: [
      "collect authorized CCTV frame/video and signal timing sample",
      "validate the envelope shape against /api/live-input-submission-schema",
      "build a signal snapshot with npm run real-sample:build-signal-snapshot -- <seoul-v2x-response.json> <signal-snapshot.json> <nextPhase> <controllerMode> <manualOverride>",
      "build a live-input.v1 envelope with npm run real-sample:build-camera-envelope -- <detector-output.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>",
      "run npm run real-sample:check -- --offline <live-input-envelope.json> for server-free shape, provenance, and guardrail checks",
      "normalize authorized-camera-detector-output.v1, camera-approach-calibration.v1, and signal data into a live-input.v1 envelope",
      "run npm run real-sample:check -- <live-input-envelope.json> for the same local drop-in validation path",
      "POST the envelope JSON to /api/real-sample-drop-in",
      "inspect accepted, replayStatus, recommendation, operatorWorkflowStatus, requiredInputs, and validationErrors"
    ]
  };
}
