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
      finalReadinessEndpoint: "/api/final-local-readiness",
      localCliCommand:
        "npm run real-sample:check -- <live-input-envelope.json>",
      offlineCliCommand:
        "npm run real-sample:check -- --offline <live-input-envelope.json>",
      noPersistence: true,
      sampleSlotIds: [
        "authorized_cctv_frame_or_video",
        "signal_phase_remaining_time",
        "detector_output"
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
        "run npm run real-sample:check -- --offline <live-input-envelope.json> for server-free shape, provenance, and guardrail checks",
        "normalize detector and signal data into a live-input.v1 envelope",
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
