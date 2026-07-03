// @vitest-environment jsdom
import { type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
vi.mock("@react-three/drei", () => ({ OrbitControls: (p: unknown) => ({ type: "OrbitControls", props: p }) }));
import { LimitedOrbitControls, ORBIT_LIMITS } from "./LimitedOrbitControls";

describe("LimitedOrbitControls", () => {
  test("clamps azimuth, polar, and distance and disables pan", () => {
    const el = LimitedOrbitControls() as ReactElement<Record<string, unknown>>;
    expect(el.props.minDistance).toBe(ORBIT_LIMITS.minDistance);
    expect(el.props.maxDistance).toBe(ORBIT_LIMITS.maxDistance);
    expect(el.props.minPolarAngle).toBe(ORBIT_LIMITS.minPolarAngle);
    expect(el.props.maxPolarAngle).toBe(ORBIT_LIMITS.maxPolarAngle);
    expect(el.props.minAzimuthAngle).toBe(ORBIT_LIMITS.minAzimuthAngle);
    expect(el.props.maxAzimuthAngle).toBe(ORBIT_LIMITS.maxAzimuthAngle);
    expect(el.props.enablePan).toBe(false);
  });
});
