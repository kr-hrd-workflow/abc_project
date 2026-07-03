import { describe, expect, test } from "vitest";

import { buildRealSampleIntakePackage } from "./realSampleIntakePackage";

describe("real sample intake package", () => {
  test("describes authorized sample submission without inventing live observations", () => {
    const artifact = buildRealSampleIntakePackage({
      generatedAt: "2026-07-01T10:30:00.000Z"
    });

    expect(artifact).toEqual({
      source: "real_sample_intake_package",
      schemaVersion: "real-sample-intake-package.v1",
      generatedAt: "2026-07-01T10:30:00.000Z",
      status: "signal_ready_waiting_for_fresh_camera_and_calibration",
      adapterBoundary: "live-input.v1",
      dropInEndpoint: "/api/real-sample-drop-in",
      readinessEndpoint: "/api/real-sample-drop-in",
      schemaEndpoint: "/api/live-input-submission-schema",
      sourceSchemaEndpoint: "/api/real-sample-source-schema",
      finalReadinessEndpoint: "/api/final-local-readiness",
      localCliCommand:
        "npm run real-sample:check -- <live-input-envelope.json>",
      offlineCliCommand:
        "npm run real-sample:check -- --offline <live-input-envelope.json>",
      cameraDetectorBuildCommand:
        "npm run real-sample:build-camera-envelope -- <detector-output.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>",
      multiCameraDetectorBuildCommand:
        "npm run real-sample:build-multi-camera-envelope -- <detector-output-a.json,detector-output-b.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>",
      yoloDetectorBuildCommand:
        "npm run real-sample:build-yolo-detector-output -- <frame-image.jpg> <detector-output.json> <intersectionId> <cameraId> <capturedAt> [modelPath] [confidenceThreshold]",
      cameraCalibrationBuildCommand:
        "npm run real-sample:build-camera-calibration -- <camera-calibration.json> <intersectionId> <cameraId> <approachDirection> <evidence>",
      cameraRoiFrameBuildCommand:
        "npm run real-sample:build-camera-roi-frame -- <frame-image.jpg> <roi-output.jpg> <x> <y> <width> <height>",
      signalSnapshotBuildCommand:
        "npm run real-sample:build-signal-snapshot -- <seoul-v2x-response.json> <signal-snapshot.json> <nextPhase> <controllerMode> <manualOverride>",
      prepareLiveInputCommand:
        "npm run real-sample:prepare-live-input -- <detector-output.json> <camera-calibration.json> <seoul-v2x-response.json> <signal-snapshot.json> <live-input-envelope.json> <nextPhase> <controllerMode> <manualOverride>",
      noPersistence: true,
      sampleSlotIds: [
        "authorized_cctv_frame_or_video",
        "signal_phase_remaining_time",
        "detector_output"
      ],
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
        },
        {
          schemaVersion: "police-crossroad-info-metadata.v1",
          purpose:
            "intersection and signal-plan metadata from 경찰청_교차로기반정보서비스",
          mapsTo: "evidence only; not live-input.v1 detections or currentPhase"
        }
      ],
      metadataEvidence: {
        policeCrossroadInfo: {
          status: "metadata_available",
          evidenceScope: "intersection_and_signal_plan_metadata",
          limitations: [
            "does not prove live CCTV detections",
            "does not prove emergency vehicle telemetry",
            "does not prove camera-to-approach direction calibration",
            "does not directly select a live-input.v1 currentPhase"
          ]
        }
      },
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
        "split multi-direction CCTV frames into approach-specific ROI frames with npm run real-sample:build-camera-roi-frame -- <frame-image.jpg> <roi-output.jpg> <x> <y> <width> <height>",
        "build detector output from a frame with npm run real-sample:build-yolo-detector-output -- <frame-image.jpg> <detector-output.json> <intersectionId> <cameraId> <capturedAt> [modelPath] [confidenceThreshold]",
        "build camera calibration only after operator/map review with npm run real-sample:build-camera-calibration -- <camera-calibration.json> <intersectionId> <cameraId> <approachDirection> <evidence>",
        "validate the envelope shape against /api/live-input-submission-schema",
        "build a signal snapshot with npm run real-sample:build-signal-snapshot -- <seoul-v2x-response.json> <signal-snapshot.json> <nextPhase> <controllerMode> <manualOverride>",
        "build a live-input.v1 envelope with npm run real-sample:build-camera-envelope -- <detector-output.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>",
        "build a multi-camera live-input.v1 envelope from ROI detector outputs with npm run real-sample:build-multi-camera-envelope -- <detector-output-a.json,detector-output-b.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>",
        "or run npm run real-sample:prepare-live-input -- <detector-output.json> <camera-calibration.json> <seoul-v2x-response.json> <signal-snapshot.json> <live-input-envelope.json> <nextPhase> <controllerMode> <manualOverride> to build both files and run offline validation",
        "run npm run real-sample:check -- --offline <live-input-envelope.json> for server-free shape, provenance, and guardrail checks",
        "normalize authorized-camera-detector-output.v1, camera-approach-calibration.v1, and signal data into a live-input.v1 envelope",
        "run npm run real-sample:check -- <live-input-envelope.json> for the same local drop-in validation path",
        "POST the envelope JSON to /api/real-sample-drop-in",
        "inspect accepted, replayStatus, recommendation, operatorWorkflowStatus, requiredInputs, and validationErrors"
      ]
    });

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
    expect(serialized).not.toContain("rtsp://");
  });
});
