import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildYoloDetectorOutputFile } from "./build-yolo-detector-output.mjs";

describe("YOLO detector output builder", () => {
  test("maps YOLO classes into authorized-camera-detector-output.v1", async () => {
    const written = new Map();
    const result = await buildYoloDetectorOutputFile({
      framePath: "live-frame.jpg",
      outputPath: "detector-output.json",
      intersectionId: "gyeonggi-cctv-61860",
      cameraId: "gyeonggi-cctv-61860",
      capturedAt: "2026-07-02T16:35:48.659+09:00",
      modelPath: "apps/api/models/yolov8n.pt",
      confidenceThreshold: 0.25,
      runPython: async (payload) => {
        assert.equal(payload.framePath, "live-frame.jpg");
        assert.equal(payload.modelPath, "apps/api/models/yolov8n.pt");
        assert.equal(payload.confidenceThreshold, 0.25);
        return [
          { label: "car", confidence: 0.3071170151233673 },
          { label: "person", confidence: 0.8123 },
          { label: "traffic light", confidence: 0.91 }
        ];
      },
      writeFile: async (filePath, contents, encoding) => {
        assert.equal(filePath, "detector-output.json");
        assert.equal(encoding, "utf8");
        written.set(filePath, contents);
      }
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.summary.outputPath, "detector-output.json");
    assert.equal(result.summary.detectionCount, 2);
    assert.match(result.output, /detectionCount=2/);

    assert.deepEqual(JSON.parse(written.get("detector-output.json")), {
      source: "authorized_camera_detector_output",
      schemaVersion: "authorized-camera-detector-output.v1",
      intersectionId: "gyeonggi-cctv-61860",
      cameraId: "gyeonggi-cctv-61860",
      frameId: "live-frame",
      capturedAt: "2026-07-02T16:35:48.659+09:00",
      detections: [
        {
          objectId: "vehicle-001",
          classLabel: "vehicle",
          confidence: 0.3071170151233673,
          count: 1
        },
        {
          objectId: "pedestrian-001",
          classLabel: "pedestrian",
          confidence: 0.8123,
          count: 1
        }
      ]
    });
  });

  test("requires explicit source identity and capture time", async () => {
    const result = await buildYoloDetectorOutputFile({
      framePath: "live-frame.jpg",
      outputPath: "detector-output.json",
      intersectionId: "",
      cameraId: "gyeonggi-cctv-61860",
      capturedAt: "2026-07-02T16:35:48.659+09:00"
    });

    assert.equal(result.exitCode, 2);
    assert.match(result.output, /Usage:/);
  });
});
