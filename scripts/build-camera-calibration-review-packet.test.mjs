import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildCameraCalibrationReviewPacketFile } from "./build-camera-calibration-review-packet.mjs";

describe("camera calibration review packet builder", () => {
  test("writes a review packet without guessing approach direction", async () => {
    const written = new Map();
    const result = await buildCameraCalibrationReviewPacketFile({
      detectorPath: "detector.json",
      framePath: "topis-cityhall-frame.jpg",
      outputPath: "camera-calibration-review.json",
      reviewContext: "TOPIS camId=190 City Hall frame for operator/map review",
      readFile: async (filePath, encoding) => {
        assert.equal(filePath, "detector.json");
        assert.equal(encoding, "utf8");
        return JSON.stringify(buildDetectorOutput());
      },
      writeFile: async (filePath, contents, encoding) => {
        assert.equal(filePath, "camera-calibration-review.json");
        assert.equal(encoding, "utf8");
        written.set(filePath, contents);
      }
    });

    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.summary, {
      outputPath: "camera-calibration-review.json",
      intersectionId: "seoul-topis-cityhall-2904",
      cameraId: "topis-cctv-190",
      status: "needs_operator_direction_confirmation"
    });

    const packet = JSON.parse(written.get("camera-calibration-review.json"));
    assert.equal(packet.source, "camera_calibration_review_packet");
    assert.equal(packet.schemaVersion, "camera-calibration-review-packet.v1");
    assert.equal(packet.status, "needs_operator_direction_confirmation");
    assert.equal(packet.intersectionId, "seoul-topis-cityhall-2904");
    assert.equal(packet.cameraId, "topis-cctv-190");
    assert.equal(packet.framePath, "topis-cityhall-frame.jpg");
    assert.deepEqual(packet.allowedApproachDirections, [
      "north",
      "south",
      "east",
      "west"
    ]);
    assert.deepEqual(packet.detectionSummary, {
      detectionCount: 2,
      classCounts: {
        pedestrian: 1,
        vehicle: 1
      },
      minConfidence: 0.62,
      maxConfidence: 0.91
    });
    assert.match(
      packet.calibrationCommandTemplate,
      /real-sample:build-camera-calibration/
    );
    assert.equal(Object.hasOwn(packet, "approachDirection"), false);
  });

  test("rejects invalid detector output instead of creating a review packet", async () => {
    const result = await buildCameraCalibrationReviewPacketFile({
      detectorPath: "detector.json",
      framePath: "frame.jpg",
      outputPath: "review.json",
      reviewContext: "operator review",
      readFile: async () =>
        JSON.stringify({
          source: "authorized_camera_detector_output",
          schemaVersion: "authorized-camera-detector-output.v1",
          intersectionId: "seoul-topis-cityhall-2904"
        }),
      writeFile: async () => {
        throw new Error("write should not be called");
      }
    });

    assert.equal(result.exitCode, 1);
    assert.match(result.output, /cameraId must be a non-empty string/);
  });
});

function buildDetectorOutput() {
  return {
    source: "authorized_camera_detector_output",
    schemaVersion: "authorized-camera-detector-output.v1",
    intersectionId: "seoul-topis-cityhall-2904",
    cameraId: "topis-cctv-190",
    frameId: "topis-cityhall-frame",
    capturedAt: "2026-07-03T04:55:20.271Z",
    detections: [
      {
        objectId: "vehicle-001",
        classLabel: "vehicle",
        confidence: 0.91,
        count: 1
      },
      {
        objectId: "pedestrian-001",
        classLabel: "pedestrian",
        confidence: 0.62,
        count: 2,
        waitingSeconds: 34
      }
    ]
  };
}
