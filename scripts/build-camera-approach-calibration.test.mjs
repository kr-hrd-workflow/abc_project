import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildCameraApproachCalibrationFile } from "./build-camera-approach-calibration.mjs";

describe("camera approach calibration builder", () => {
  test("writes camera-approach-calibration.v1 only from explicit direction evidence", async () => {
    const written = new Map();
    const result = await buildCameraApproachCalibrationFile({
      outputPath: "camera-calibration.json",
      intersectionId: "gyeonggi-cctv-61860",
      cameraId: "gyeonggi-cctv-61860",
      approachDirection: "south",
      evidence:
        "operator reviewed Gyeonggi CCTV frame and map; camera faces southbound approach",
      writeFile: async (filePath, contents, encoding) => {
        assert.equal(filePath, "camera-calibration.json");
        assert.equal(encoding, "utf8");
        written.set(filePath, contents);
      }
    });

    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.summary, {
      outputPath: "camera-calibration.json",
      intersectionId: "gyeonggi-cctv-61860",
      cameraId: "gyeonggi-cctv-61860",
      approachDirection: "south"
    });
    assert.match(result.output, /approachDirection=south/);
    assert.deepEqual(JSON.parse(written.get("camera-calibration.json")), {
      source: "operator_camera_survey",
      schemaVersion: "camera-approach-calibration.v1",
      mappings: [
        {
          intersectionId: "gyeonggi-cctv-61860",
          cameraId: "gyeonggi-cctv-61860",
          approachDirection: "south",
          evidence:
            "operator reviewed Gyeonggi CCTV frame and map; camera faces southbound approach"
        }
      ]
    });
  });

  test("rejects unsupported or missing approach direction", async () => {
    const result = await buildCameraApproachCalibrationFile({
      outputPath: "camera-calibration.json",
      intersectionId: "gyeonggi-cctv-61860",
      cameraId: "gyeonggi-cctv-61860",
      approachDirection: "unknown",
      evidence: "not enough"
    });

    assert.equal(result.exitCode, 1);
    assert.match(result.output, /approachDirection is not supported/);
  });
});
