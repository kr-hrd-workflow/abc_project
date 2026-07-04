import { describe, expect, test } from "vitest";
import { GROUND_DRESSING_BATCHES } from "./GroundDressingLayer";
import { CURB_SEGMENTS, SIDEWALK_SLABS } from "./roadGeometry";

describe("GroundDressingLayer batches", () => {
  test("covers base ground + sidewalks + curbs with instanced batches", () => {
    const names = GROUND_DRESSING_BATCHES.map((b) => b.name);
    expect(names).toContain("ground-dressing-base-plane");
    expect(names).toContain("ground-dressing-sidewalk-slabs");
    expect(names).toContain("ground-dressing-curbs");
    const sidewalks = GROUND_DRESSING_BATCHES.find((b) => b.name === "ground-dressing-sidewalk-slabs");
    expect(sidewalks?.specs).toBe(SIDEWALK_SLABS);
    const curbs = GROUND_DRESSING_BATCHES.find((b) => b.name === "ground-dressing-curbs");
    expect(curbs?.specs).toBe(CURB_SEGMENTS);
  });
  test("base plane is large enough to kill the sky-dome ground void and sits under the road", () => {
    const base = GROUND_DRESSING_BATCHES.find((b) => b.name === "ground-dressing-base-plane");
    expect(base?.specs[0].size[0]).toBeGreaterThanOrEqual(700);
    expect(base?.specs[0].position[1]).toBeLessThan(0);
  });
  // 2026-07-04 (fix(r3f): kill road/apron z-fighting at far grazing angles) —
  // the former "city apron" plane (CITY_GROUND_APRON) sat only 12mm below the
  // road surface, which z-fought with it at far grazing angles (depth-buffer
  // precision loss at distance; codex-confirmed evenly-spaced white striping
  // on the north corridor). Removed rather than nudged: the 720x720 base
  // plane (60mm below the road) already covers the same ground with a safe
  // depth margin, and codex A/B confirmed equivalent ground coverage.
  test("no longer batches the legacy city-apron plane (removed to kill z-fighting)", () => {
    const names = GROUND_DRESSING_BATCHES.map((b) => b.name);
    expect(names).not.toContain("ground-dressing-city-apron");
  });
});
