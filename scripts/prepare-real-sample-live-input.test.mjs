import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { prepareRealSampleLiveInputFiles } from "./prepare-real-sample-live-input.mjs";

describe("real sample live-input prepare command", () => {
  test("builds signal snapshot, live-input envelope, and runs offline validation", async () => {
    const writes = new Map();
    const result = await prepareRealSampleLiveInputFiles({
      detectorPath: "detector.json",
      calibrationPath: "calibration.json",
      seoulV2xResponsePath: "seoul-v2x.json",
      signalOutputPath: "signal-snapshot.json",
      envelopeOutputPath: "live-input.json",
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false,
      now: () => new Date("2026-07-02T03:15:05.000Z"),
      readFile: async (filePath, encoding) => {
        assert.equal(encoding, "utf8");
        if (writes.has(filePath)) {
          return writes.get(filePath);
        }
        if (filePath === "detector.json") {
          return JSON.stringify(buildDetectorOutput());
        }
        if (filePath === "calibration.json") {
          return JSON.stringify(buildCalibration());
        }
        if (filePath === "seoul-v2x.json") {
          return JSON.stringify(buildSeoulV2xResponse());
        }
        throw new Error(`unexpected read ${filePath}`);
      },
      writeFile: async (filePath, contents, encoding) => {
        assert.equal(encoding, "utf8");
        writes.set(filePath, contents);
      }
    });

    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.summary, {
      signalOutputPath: "signal-snapshot.json",
      envelopeOutputPath: "live-input.json",
      offlineAccepted: true,
      currentPhase: "east_priority",
      detectionCount: 2
    });
    assert.match(result.output, /signalSnapshot=signal-snapshot.json/);
    assert.match(result.output, /liveInputEnvelope=live-input.json/);
    assert.match(result.output, /offlineAccepted=true/);

    assert.deepEqual(JSON.parse(writes.get("signal-snapshot.json")), {
      controllerId: "CIB1000020300",
      capturedAt: "2026-07-02T03:15:02.000Z",
      currentPhase: "east_priority",
      remainingSeconds: 112,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    });
    assert.equal(JSON.parse(writes.get("live-input.json")).schemaVersion, "live-input.v1");
  });

  test("does not write an envelope when signal snapshot build fails", async () => {
    const writes = new Map();
    const result = await prepareRealSampleLiveInputFiles({
      detectorPath: "detector.json",
      calibrationPath: "calibration.json",
      seoulV2xResponsePath: "seoul-v2x.json",
      signalOutputPath: "signal-snapshot.json",
      envelopeOutputPath: "live-input.json",
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false,
      readFile: async (filePath) => {
        if (filePath === "seoul-v2x.json") {
          return JSON.stringify([
            {
              dataId: "SPAT-CIB1130047200-1782952627-45853",
              trsmUtcTime: "1782961446684",
              itstId: "23665",
              eqmnId: "CIB1130047200",
              seStsgRmdrCs: 45,
              nwStsgRmdrCs: 45
            }
          ]);
        }
        return JSON.stringify({});
      },
      writeFile: async (filePath, contents) => {
        writes.set(filePath, contents);
      }
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.summary, null);
    assert.equal(writes.has("live-input.json"), false);
    assert.match(result.output, /cardinal straight signal remaining time is required/);
  });
});

function buildSeoulV2xResponse() {
  return [
    {
      dataId: "SPAT-CIB1000020300-1782956865-28319",
      trsmUtcTime: "1782962102000",
      itstId: "4765",
      eqmnId: "CIB1000020300",
      etStsgRmdrCs: "1120",
      wtStsgRmdrCs: null
    }
  ];
}

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
