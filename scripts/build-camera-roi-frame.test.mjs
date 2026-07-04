import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildCameraRoiFrameFile } from "./build-camera-roi-frame.mjs";

describe("camera ROI frame builder", () => {
  test("crops an approach ROI from a wider CCTV frame", async () => {
    const calls = [];
    const result = await buildCameraRoiFrameFile({
      framePath: "ingye-live-frame.jpg",
      outputPath: "ingye-seoul-direction-crop.jpg",
      x: 610,
      y: 210,
      width: 610,
      height: 495,
      cropImage: async (input) => {
        calls.push(input);
      }
    });

    assert.equal(result.exitCode, 0);
    assert.deepEqual(calls, [
      {
        framePath: "ingye-live-frame.jpg",
        outputPath: "ingye-seoul-direction-crop.jpg",
        x: 610,
        y: 210,
        width: 610,
        height: 495
      }
    ]);
    assert.deepEqual(result.summary, {
      framePath: "ingye-live-frame.jpg",
      outputPath: "ingye-seoul-direction-crop.jpg",
      roi: { x: 610, y: 210, width: 610, height: 495 }
    });
    assert.match(result.output, /roi=610,210,610,495/);
  });

  test("rejects non-positive ROI dimensions", async () => {
    const result = await buildCameraRoiFrameFile({
      framePath: "ingye-live-frame.jpg",
      outputPath: "bad.jpg",
      x: 0,
      y: 0,
      width: 0,
      height: 200
    });

    assert.equal(result.exitCode, 1);
    assert.match(result.output, /width must be a positive integer/);
  });
});
