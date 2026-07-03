import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildMultiCameraDetectorLiveInputFile } from "./build-multi-camera-detector-live-input.mjs";
import { checkRealSampleDropInFile } from "./real-sample-drop-in-check.mjs";

describe("multi-camera detector live-input builder", () => {
  test("builds one live-input envelope from multiple calibrated detector outputs", async () => {
    const written = new Map();
    const result = await buildMultiCameraDetectorLiveInputFile({
      detectorPaths: ["north-detector.json", "south-detector.json"],
      calibrationPath: "calibration.json",
      signalPath: "signal.json",
      outputPath: "live-input.json",
      now: () => new Date("2026-07-03T01:22:50.000Z"),
      readFile: async (filePath, encoding) => {
        assert.equal(encoding, "utf8");
        if (filePath === "north-detector.json") {
          return JSON.stringify(
            buildDetectorOutput({
              cameraId: "camera-north-roi",
              frameId: "north-roi-frame",
              detections: [
                {
                  objectId: "vehicle-001",
                  classLabel: "vehicle",
                  confidence: 0.82,
                  count: 1
                }
              ]
            })
          );
        }
        if (filePath === "south-detector.json") {
          return JSON.stringify(
            buildDetectorOutput({
              cameraId: "camera-south-roi",
              frameId: "south-roi-frame",
              detections: [
                {
                  objectId: "vehicle-001",
                  classLabel: "vehicle",
                  confidence: 0.76,
                  count: 1
                },
                {
                  objectId: "pedestrian-001",
                  classLabel: "pedestrian",
                  confidence: 0.66,
                  count: 1
                }
              ]
            })
          );
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
    assert.deepEqual(result.summary, {
      outputPath: "live-input.json",
      intersectionId: "ingye-1771",
      cameraFrameCount: 2,
      detectionCount: 3,
      signalControllerId: "CIB1000020300"
    });
    assert.match(result.output, /cameraFrameCount=2/);
    assert.match(result.output, /detectionCount=3/);

    const envelope = JSON.parse(written.get("live-input.json"));
    assert.deepEqual(envelope.cameraFrames.map((frame) => frame.cameraId), [
      "camera-north-roi",
      "camera-south-roi"
    ]);
    assert.deepEqual(
      envelope.cameraFrames.flatMap((frame) =>
        frame.detections.map((detection) => detection.direction)
      ),
      ["north", "south", "south"]
    );

    const offlineCheck = await checkRealSampleDropInFile({
      filePath: "live-input.json",
      offline: true,
      readFile: async () => written.get("live-input.json")
    });

    assert.equal(offlineCheck.exitCode, 0);
    assert.equal(offlineCheck.summary.accepted, true);
  });

  test("rejects detector outputs from different intersections", async () => {
    const result = await buildMultiCameraDetectorLiveInputFile({
      detectorPaths: ["north-detector.json", "other-detector.json"],
      calibrationPath: "calibration.json",
      signalPath: "signal.json",
      outputPath: "live-input.json",
      readFile: async (filePath) => {
        if (filePath === "north-detector.json") {
          return JSON.stringify(
            buildDetectorOutput({ cameraId: "camera-north-roi" })
          );
        }
        if (filePath === "other-detector.json") {
          return JSON.stringify(
            buildDetectorOutput({
              intersectionId: "other-intersection",
              cameraId: "camera-other"
            })
          );
        }
        if (filePath === "calibration.json") {
          return JSON.stringify(buildCalibration());
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
    assert.match(result.output, /detector outputs must share one intersectionId/);
  });
});

function buildDetectorOutput({
  intersectionId = "ingye-1771",
  cameraId,
  frameId = "roi-frame",
  detections = [
    {
      objectId: "vehicle-001",
      classLabel: "vehicle",
      confidence: 0.82,
      count: 1
    }
  ]
} = {}) {
  return {
    source: "authorized_camera_detector_output",
    schemaVersion: "authorized-camera-detector-output.v1",
    intersectionId,
    cameraId,
    frameId,
    capturedAt: "2026-07-03T01:22:46.990Z",
    detections
  };
}

function buildCalibration() {
  return {
    source: "operator_camera_survey",
    schemaVersion: "camera-approach-calibration.v1",
    mappings: [
      {
        intersectionId: "ingye-1771",
        cameraId: "camera-north-roi",
        approachDirection: "north",
        evidence: "operator confirmed Seoul-bound ROI maps to north"
      },
      {
        intersectionId: "ingye-1771",
        cameraId: "camera-south-roi",
        approachDirection: "south",
        evidence: "operator confirmed Osan-bound ROI maps to south"
      }
    ]
  };
}

function buildSignalSnapshot() {
  return {
    controllerId: "CIB1000020300",
    capturedAt: "2026-07-03T01:22:48.000Z",
    currentPhase: "north_priority",
    remainingSeconds: 32,
    nextPhase: "south_priority",
    controllerMode: "adaptive",
    manualOverride: false
  };
}
