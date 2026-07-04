import { describe, expect, test } from "vitest";
import {
  CORNER_PLAZA_PLATES,
  GROUND_DRESSING_BATCHES,
  PERIPHERY_EDGE_BLOCKS
} from "./GroundDressingLayer";
import { CURB_SEGMENTS, SIDEWALK_SLABS } from "./roadGeometry";

describe("GroundDressingLayer batches", () => {
  test("covers base ground + sidewalks + curbs with instanced batches", () => {
    const names = GROUND_DRESSING_BATCHES.map((b) => b.name);
    expect(names).toContain("ground-dressing-base-plane");
    expect(names).toContain("ground-dressing-sidewalk-slabs");
    expect(names).toContain("ground-dressing-sidewalk-slabs-ew");
    expect(names).toContain("ground-dressing-curbs");
    // The two orientation batches must partition SIDEWALK_SLABS exactly (the
    // NS/EW split exists so the paver atlas tiles square on both orientations).
    const nsSlabs = GROUND_DRESSING_BATCHES.find(
      (b) => b.name === "ground-dressing-sidewalk-slabs"
    );
    const ewSlabs = GROUND_DRESSING_BATCHES.find(
      (b) => b.name === "ground-dressing-sidewalk-slabs-ew"
    );
    expect(new Set([...(nsSlabs?.specs ?? []), ...(ewSlabs?.specs ?? [])])).toEqual(
      new Set(SIDEWALK_SLABS)
    );
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
  test("periphery edge blocks stay outside the hero-building zone (no double-rendered buildings)", () => {
    expect(PERIPHERY_EDGE_BLOCKS.length).toBeGreaterThanOrEqual(12);
    for (const b of PERIPHERY_EDGE_BLOCKS) {
      expect(Math.max(Math.abs(b.position[0]), Math.abs(b.position[2]))).toBeGreaterThanOrEqual(70);
    }
  });
  test("four corner plaza plates cover the diagonal corners", () => {
    expect(CORNER_PLAZA_PLATES).toHaveLength(4);
    const quadrants = new Set(
      CORNER_PLAZA_PLATES.map((p) => `${Math.sign(p.position[0])},${Math.sign(p.position[2])}`)
    );
    expect(quadrants.size).toBe(4);
    for (const p of CORNER_PLAZA_PLATES) {
      expect(Math.abs(p.position[0])).toBeGreaterThanOrEqual(15);
      expect(Math.abs(p.position[2])).toBeGreaterThanOrEqual(15);
    }
  });
});
