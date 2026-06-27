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

  it("keeps the operator-cctv angle as a low oblique pole view of the box", () => {
    const wide = getPlateCameraAngle("operator-wide");
    const cctv = getPlateCameraAngle("operator-cctv");
    const horiz = Math.hypot(
      cctv.position[0] - cctv.target[0],
      cctv.position[2] - cctv.target[2]
    );
    const elevationDeg =
      Math.atan2(cctv.position[1] - cctv.target[1], horiz) * (180 / Math.PI);
    expect(cctv.position[1]).toBeLessThan(wide.position[1]); // lower than the wide cam
    expect(elevationDeg).toBeLessThan(22); // pole-mounted, signals readable
    expect(cctv.fovDegrees).toBe(50);
  });

  it("throws on unknown angle id", () => {
    expect(() => getPlateCameraAngle("nope")).toThrow(/unknown plate camera/i);
  });
});
