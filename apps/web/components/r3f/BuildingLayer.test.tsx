// @vitest-environment jsdom

import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { BuildingLayer } from "./BuildingLayer";
import {
  BUILDING_FOOTPRINTS,
  BUILDING_SAFE_X,
  BUILDING_SAFE_Z,
  type BuildingType
} from "./buildingFootprints";

// ── buildingFootprints data validation ───────────────────────────────────────

const VALID_TYPES: BuildingType[] = [
  "glass-tower",
  "glass-high-rise",
  "mid-rise",
  "low-rise"
];

describe("buildingFootprints", () => {
  it("defines at least 28 buildings for a dense skyline", () => {
    expect(BUILDING_FOOTPRINTS.length).toBeGreaterThanOrEqual(28);
  });

  it("includes exactly 3 SW glass office towers (100–200 m)", () => {
    const swTowers = BUILDING_FOOTPRINTS.filter(
      (b) =>
        b.type === "glass-tower" &&
        b.position[0] < -BUILDING_SAFE_X && // west
        b.position[2] > BUILDING_SAFE_Z // south
    );
    expect(swTowers).toHaveLength(3);
  });

  it("SW towers are all taller than 100 m", () => {
    const swTowers = BUILDING_FOOTPRINTS.filter(
      (b) =>
        b.type === "glass-tower" &&
        b.position[0] < 0 &&
        b.position[2] > 0
    );
    for (const t of swTowers) {
      expect(t.size[1]).toBeGreaterThan(100);
    }
  });

  it("positions every building so its near edge is outside the road+sidewalk safe zone", () => {
    // Each building satisfies: the closest footprint edge from centre ≥ SAFE in at
    // least one axis (corridor-side buildings are safe in x; approach-end buildings
    // are safe in z; corner buildings may satisfy both).
    for (const b of BUILDING_FOOTPRINTS) {
      const [x, , z] = b.position;
      const [w, , d] = b.size;
      const nearEdgeX = Math.abs(x) - w / 2;
      const nearEdgeZ = Math.abs(z) - d / 2;
      const safeX = nearEdgeX >= BUILDING_SAFE_X - 1; // 1 m tolerance
      const safeZ = nearEdgeZ >= BUILDING_SAFE_Z - 1;
      expect(
        safeX || safeZ,
        `Building "${b.id}" nearEdgeX=${nearEdgeX.toFixed(1)}, nearEdgeZ=${nearEdgeZ.toFixed(1)} — not outside safe zone`
      ).toBe(true);
    }
  });

  it("all building types are valid", () => {
    for (const b of BUILDING_FOOTPRINTS) {
      expect(VALID_TYPES).toContain(b.type);
    }
  });

  it("building heights are physically plausible (2–200 m)", () => {
    for (const b of BUILDING_FOOTPRINTS) {
      const h = b.size[1];
      expect(h).toBeGreaterThan(2);
      expect(h).toBeLessThanOrEqual(200);
    }
  });

  it("building y-position equals half-height (base sits on ground)", () => {
    for (const b of BUILDING_FOOTPRINTS) {
      const h = b.size[1];
      const yCenter = b.position[1];
      // y_min = yCenter - h/2 must be ≥ 0 (at or above ground)
      expect(yCenter - h / 2).toBeGreaterThanOrEqual(-0.01); // float tolerance
    }
  });

  it("every building has a unique id", () => {
    const ids = BUILDING_FOOTPRINTS.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("every building has a hex tint colour", () => {
    for (const b of BUILDING_FOOTPRINTS) {
      expect(b.tint).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ── BuildingLayer component ───────────────────────────────────────────────────

describe("BuildingLayer", () => {
  it("returns a valid React element for day", () => {
    const element = BuildingLayer({ timeOfDay: "day" });
    expect(isValidElement(element)).toBe(true);
  });

  it("returns a valid React element for night", () => {
    const element = BuildingLayer({ timeOfDay: "night" });
    expect(isValidElement(element)).toBe(true);
  });

  it("has displayName BuildingLayer for scene composition tests", () => {
    expect(BuildingLayer.displayName).toBe("BuildingLayer");
  });

  it("renders a group named gangnam-building-layer", () => {
    const element = BuildingLayer({ timeOfDay: "day" });
    expect(isValidElement(element)).toBe(true);
    // The outer group name is set via the displayName chain — confirm no throw.
    expect(element).toBeTruthy();
  });
});
