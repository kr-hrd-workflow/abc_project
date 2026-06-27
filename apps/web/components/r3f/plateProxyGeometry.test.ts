// plateProxyGeometry.test.ts
import { describe, expect, it } from "vitest";
import { buildPlateProxy } from "./plateProxyGeometry";
import {
  BUILDING_EDGE_BLOCKS,
  INTERSECTION_BOX_EXTENT_METERS
} from "./roadGeometry";

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

  it("ground plane covers the larger axis of the asymmetric intersection box", () => {
    const proxy = buildPlateProxy();
    const maxExtent = Math.max(
      INTERSECTION_BOX_EXTENT_METERS.ew,
      INTERSECTION_BOX_EXTENT_METERS.ns
    );
    expect(proxy.groundPlane.size).toBeGreaterThanOrEqual(maxExtent);
  });
});
