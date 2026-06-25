import { describe, expect, it } from "vitest";
import { PLATE_CAMERA_ANGLES, getPlateCameraAngle } from "./plateCameraCalibration";
import { STAGE5_CAMERA } from "./roadGeometry";

describe("plateCameraCalibration", () => {
  it("exposes at least one fixed operator angle", () => {
    expect(PLATE_CAMERA_ANGLES.length).toBeGreaterThan(0);
  });

  it("default operator angle matches the existing STAGE5 camera framing", () => {
    const operator = getPlateCameraAngle("operator-wide");
    expect(operator.position).toEqual(STAGE5_CAMERA.position);
    expect(operator.fovDegrees).toBeCloseTo(STAGE5_CAMERA.fov, 5);
  });

  it("throws on unknown angle id", () => {
    expect(() => getPlateCameraAngle("nope")).toThrow(/unknown plate camera/i);
  });
});
