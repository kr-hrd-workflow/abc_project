import { describe, expect, it } from "vitest";
import { BACKGROUND_PLATE_TRUTH_SOURCE } from "./BackgroundPlateLayer";

describe("background plate truth boundary", () => {
  it("plate truth source is visual-only and not a vehicle/pedestrian source", () => {
    expect(BACKGROUND_PLATE_TRUTH_SOURCE).toBe("background_plate_visual_only");
    expect(BACKGROUND_PLATE_TRUTH_SOURCE).not.toMatch(/sumo|vehicle|pedestrian|signal/i);
  });
});
