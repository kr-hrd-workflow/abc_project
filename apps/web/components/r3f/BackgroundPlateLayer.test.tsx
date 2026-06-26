// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  BACKGROUND_PLATE_TRUTH_SOURCE,
  BackgroundPlateLayer
} from "./BackgroundPlateLayer";
import { projectPlateUVs } from "./plateProxyGeometry";
import { getPlateCameraAngle } from "./plateCameraCalibration";

// Render under the same jsdom harness the other layer slices use (see
// CameraWeatherClutter.test.tsx). The disabled/day paths return null before any
// R3F hook runs, so they render without a live WebGL canvas.
describe("BackgroundPlateLayer", () => {
  it("is a no-op when disabled (procedural fallback owns the background)", () => {
    const { container } = render(
      <BackgroundPlateLayer
        angleId="operator-wide"
        timeOfDay="night"
        enabled={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("is a no-op when disabled in the day path too", () => {
    const { container } = render(
      <BackgroundPlateLayer
        angleId="operator-wide"
        timeOfDay="day"
        enabled={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("never declares itself a vehicle/signal truth source", () => {
    expect(BACKGROUND_PLATE_TRUTH_SOURCE).toBe("background_plate_visual_only");
    expect(BACKGROUND_PLATE_TRUTH_SOURCE).not.toMatch(
      /sumo|vehicle|pedestrian|signal/i
    );
  });
});

describe("projectPlateUVs", () => {
  it("maps the proxy footprint into the unit UV square from the plate camera", () => {
    const angle = getPlateCameraAngle("operator-wide");
    const uvs = projectPlateUVs({
      angle,
      aspect: 16 / 9,
      points: [
        [angle.target[0], 0, angle.target[2]],
        [angle.target[0] + 20, 0, angle.target[2]],
        [angle.target[0] - 20, 0, angle.target[2]]
      ]
    });

    expect(uvs).toHaveLength(3);
    for (const [u, v] of uvs) {
      expect(Number.isFinite(u)).toBe(true);
      expect(Number.isFinite(v)).toBe(true);
    }
    // The target point projects near the center of the plate.
    expect(uvs[0][0]).toBeCloseTo(0.5, 1);
    // Moving +X vs -X across the ground straddles the center horizontally.
    expect(uvs[1][0]).not.toBeCloseTo(uvs[2][0], 2);
  });
});
