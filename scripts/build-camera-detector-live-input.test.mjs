import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildCameraDetectorLiveInputFile } from "./build-camera-detector-live-input.mjs";
import { checkRealSampleDropInFile } from "./real-sample-drop-in-check.mjs";

describe("camera detector live-input builder", () => {
  test("builds a replay-ready live-input envelope from detector, calibration, and signal files", async () => {
    const written = new Map();
    const result = await buildCameraDetectorLiveInputFile({
      detectorPath: "detector.json",
      calibrationPath: "calibration.json",
      signalPath: "signal.json",
      outputPath: "live-input.json",
      now: () => new Date("2026-07-02T03:15:05.000Z"),
      readFile: async (filePath, encoding) => {
        assert.equal(encoding, "utf8");
        if (filePath === "detector.json") {
          return JSON.stringify(buildDetectorOutput());
        }
        if (filePath === "calibration.json") {
          return JSON.stringify(buildCalibration());
        }
        if (filePath === "signal.json") {
          return JSON.stringify(buildSignalSnapshot());
        }
        throw new Error(`unexpected read ${filePath}`);
      },
      writeFile: async (filePath, contents, encoding) => {
        assert.equal(filePath, "live-input.json");
        assert.equal(encoding, "utf8");
        written.set(filePath, contents);
      }
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.summary.outputPath, "live-input.json");
    assert.equal(result.summary.detectionCount, 2);
    assert.match(result.output, /wrote=live-input.json/);

    const envelope = JSON.parse(written.get("live-input.json"));
    assert.deepEqual(envelope, {
      schemaVersion: "live-input.v1",
      intersectionId: "cr06",
      receivedAt: "2026-07-02T03:15:05.000Z",
      cameraFrames: [
        {
          cameraId: "camera-cr06-01",
          frameId: "frame-20260702-121500",
          capturedAt: "2026-07-02T03:15:00.000Z",
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
      signalSnapshot: buildSignalSnapshot()
    });

    const offlineCheck = await checkRealSampleDropInFile({
      filePath: "live-input.json",
      offline: true,
      readFile: async () => written.get("live-input.json")
    });

    assert.equal(offlineCheck.exitCode, 0);
    assert.equal(offlineCheck.summary.accepted, true);
  });

  test("rejects conversion when calibration is missing for the detector camera", async () => {
    const result = await buildCameraDetectorLiveInputFile({
      detectorPath: "detector.json",
      calibrationPath: "calibration.json",
      signalPath: "signal.json",
      outputPath: "live-input.json",
      readFile: async (filePath) => {
        if (filePath === "detector.json") {
          return JSON.stringify(buildDetectorOutput());
        }
        if (filePath === "calibration.json") {
          return JSON.stringify({
            ...buildCalibration(),
            mappings: [
              {
                intersectionId: "other",
                cameraId: "camera-other-01",
                approachDirection: "west",
                evidence: "different camera"
              }
            ]
          });
        }
        if (filePath === "signal.json") {
          return JSON.stringify(buildSignalSnapshot());
        }
        throw new Error(`unexpected read ${filePath}`);
      },
      writeFile: async () => {
        throw new Error("write should not be called");
      }
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.summary, null);
    assert.match(
      result.output,
      /camera-to-approach calibration is required for camera-cr06-01 at cr06/
    );
  });
});

function buildDetectorOutput() {
  return {
    source: "authorized_camera_detector_output",
    schemaVersion: "authorized-camera-detector-output.v1",
    intersectionId: "cr06",
    cameraId: "camera-cr06-01",
    frameId: "frame-20260702-121500",
    capturedAt: "2026-07-02T03:15:00.000Z",
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
}

function buildCalibration() {
  return {
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
  };
}

function buildSignalSnapshot() {
  return {
    controllerId: "CIB1000020300",
    capturedAt: "2026-07-02T03:15:02.000Z",
    currentPhase: "east_priority",
    remainingSeconds: 112,
    nextPhase: "normal_cycle",
    controllerMode: "adaptive",
    manualOverride: false
  };
}
