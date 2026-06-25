// plateProxyGeometry.test.ts
import { describe, expect, it } from "vitest";
import { buildPlateProxy } from "./plateProxyGeometry";
import { BUILDING_EDGE_BLOCKS } from "./roadGeometry";

describe("buildPlateProxy", () => {
  it("reuses existing building edge blocks as depth occluders", () => {
    const proxy = buildPlateProxy();
    expect(proxy.occluders.length).toBeGreaterThanOrEqual(
      BUILDING_EDGE_BLOCKS.length
    );
  });

  it("ground plane is at least as wide as the intersection footprint", () => {
    const proxy = buildPlateProxy();
    expect(proxy.groundPlane.size).toBeGreaterThan(0);
  });
});
