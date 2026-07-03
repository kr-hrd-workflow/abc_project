import { describe, expect, test } from "vitest";

import {
  buildLiveInputEnvelopeFromAuthorizedCameraDetectorOutput,
  summarizeAuthorizedCameraDetectorOutput
} from "./authorizedCameraDetectorAdapter";
import { validateRealSampleDropInEnvelope } from "./realSampleDropIn";

const AUTHORIZED_CAMERA_DETECTOR_OUTPUT = {
  source: "authorized_camera_detector_output",
  schemaVersion: "authorized-camera-detector-output.v1",
  intersectionId: "cr06",
  cameraId: "camera-cr06-01",
  frameId: "frame-20260702-121500",
  capturedAt: "2026-07-02T12:15:00.000+09:00",
  detections: [
    {
      objectId: "vehicle-001",
      classLabel: "vehicle",
      confidence: 0.92,
      count: 7
    },
    {
      objectId: "pedestrian-001",
      classLabel: "pedestrian",
      confidence: 0.88,
      count: 2,
      waitingSeconds: 74
    }
  ]
};

const SIGNAL_SNAPSHOT = {
  controllerId: "CIB1000020300",
  capturedAt: "2026-07-02T12:14:56.000+09:00",
  currentPhase: "east_priority",
  remainingSeconds: 112,
  nextPhase: "normal_cycle",
  controllerMode: "adaptive",
  manualOverride: false
} as const;

describe("authorized camera detector adapter", () => {
  test("summarizes fresh detector output without guessing approach direction", () => {
    expect(
      summarizeAuthorizedCameraDetectorOutput(AUTHORIZED_CAMERA_DETECTOR_OUTPUT)
    ).toEqual({
      source: "authorized_camera_detector_output",
      schemaVersion: "authorized-camera-detector-summary.v1",
      intersectionId: "cr06",
      cameraId: "camera-cr06-01",
      frameId: "frame-20260702-121500",
      capturedAt: "2026-07-02T12:15:00.000+09:00",
      detectionCount: 2,
      classCounts: {
        pedestrian: 1,
        vehicle: 1
      },
      replayReadiness: {
        status: "needs_camera_approach_calibration",
        adapterBoundary: "live-input.v1",
        missingInputs: ["camera_approach_calibration"],
        reason:
          "Authorized detector output supplies fresh frame detections, but approach direction must come from camera calibration."
      }
    });
  });

  test("builds live-input.v1 when camera approach calibration and signal snapshot are supplied", () => {
    const envelope = buildLiveInputEnvelopeFromAuthorizedCameraDetectorOutput(
      AUTHORIZED_CAMERA_DETECTOR_OUTPUT,
      {
        receivedAt: "2026-07-02T12:15:05.000+09:00",
        signalSnapshot: SIGNAL_SNAPSHOT,
        calibration: {
          source: "operator_camera_survey",
          schemaVersion: "camera-approach-calibration.v1",
          mappings: [
            {
              intersectionId: "cr06",
              cameraId: "camera-cr06-01",
              approachDirection: "east",
              evidence: "operator verified camera-cr06-01 faces eastbound approach"
            }
          ]
        }
      }
    );

    expect(envelope).toEqual({
      schemaVersion: "live-input.v1",
      intersectionId: "cr06",
      receivedAt: "2026-07-02T12:15:05.000+09:00",
      cameraFrames: [
        {
          cameraId: "camera-cr06-01",
          frameId: "frame-20260702-121500",
          capturedAt: "2026-07-02T12:15:00.000+09:00",
          detections: [
            {
              objectId: "vehicle-001",
              classLabel: "vehicle",
              confidence: 0.92,
              direction: "east",
              laneId: "east_camera-cr06-01_001",
              count: 7
            },
            {
              objectId: "pedestrian-001",
              classLabel: "pedestrian",
              confidence: 0.88,
              direction: "east",
              laneId: "east_camera-cr06-01_002",
              count: 2,
              waitingSeconds: 74
            }
          ]
        }
      ],
      signalSnapshot: SIGNAL_SNAPSHOT
    });

    expect(validateRealSampleDropInEnvelope(envelope)).toMatchObject({
      accepted: true,
      replayStatus: "replay_input_ready",
      operatorWorkflowStatus: "approval_review_ready",
      requiredInputs: [],
      validationErrors: []
    });
  });

  test("rejects conversion when calibration does not match the detector camera", () => {
    expect(() =>
      buildLiveInputEnvelopeFromAuthorizedCameraDetectorOutput(
        AUTHORIZED_CAMERA_DETECTOR_OUTPUT,
        {
          receivedAt: "2026-07-02T12:15:05.000+09:00",
          signalSnapshot: SIGNAL_SNAPSHOT,
          calibration: {
            source: "operator_camera_survey",
            schemaVersion: "camera-approach-calibration.v1",
            mappings: [
              {
                intersectionId: "other",
                cameraId: "camera-other-01",
                approachDirection: "west",
                evidence: "different camera"
              }
            ]
          }
        }
      )
    ).toThrow(
      "camera-to-approach calibration is required for camera-cr06-01 at cr06"
    );
  });
});
