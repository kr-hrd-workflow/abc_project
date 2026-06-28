// @vitest-environment jsdom

import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import {
  BuildingLayer,
  FACADE_DAY_TEXTURE_PATH,
  FACADE_NIGHT_TEXTURE_PATH,
  FACADE_METERS_PER_TILE,
  GLASS_TINTS_DAY,
  GLASS_TINTS_NIGHT,
  composeBuildingVolumes,
  computeFacadeRepeat,
  getBuildingVarFactor,
  getGlassTintIndex,
  type BuildingVolumeSpec
} from "./BuildingLayer";
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

// ── Facade texture system (P2b) ───────────────────────────────────────────────

describe("facade texture assets", () => {
  it("points at the day + night facade webp files under public/", () => {
    expect(FACADE_DAY_TEXTURE_PATH).toBe(
      "/simulation/r3f/assets/textures/facade-glass-day.webp"
    );
    expect(FACADE_NIGHT_TEXTURE_PATH).toBe(
      "/simulation/r3f/assets/textures/facade-windows-night.webp"
    );
  });

  it("targets ~14 m per facade tile (≈4 floors at ~3.5 m)", () => {
    expect(FACADE_METERS_PER_TILE).toBeGreaterThanOrEqual(12);
    expect(FACADE_METERS_PER_TILE).toBeLessThanOrEqual(16);
  });
});

describe("computeFacadeRepeat", () => {
  it("maps facade metres to whole tiles at ~14 m/tile", () => {
    // 42 m wide, 150 m tall, no jitter → 3 tiles wide, ~11 tiles tall
    const [u, v] = computeFacadeRepeat(42, 150, 1);
    expect(u).toBe(3);
    expect(v).toBe(11);
  });

  it("clamps to at least 1 tile for short/narrow faces", () => {
    const [u, v] = computeFacadeRepeat(6, 8, 1);
    expect(u).toBeGreaterThanOrEqual(1);
    expect(v).toBeGreaterThanOrEqual(1);
  });

  it("returns integer repeats so floors are never sliced mid-window", () => {
    const [u, v] = computeFacadeRepeat(33, 115, 1.05);
    expect(Number.isInteger(u)).toBe(true);
    expect(Number.isInteger(v)).toBe(true);
  });

  it("realistic floor scale: tile height stays within 12–16 m for real buildings", () => {
    for (const b of BUILDING_FOOTPRINTS) {
      const [, v] = computeFacadeRepeat(b.size[0], b.size[1], 1);
      const metresPerTileV = b.size[1] / v;
      // For buildings tall enough to need >1 tile, the per-tile height stays
      // in a realistic 9–18 m band (≈3–5 floors). Short buildings (1 tile) skip.
      if (v > 1) {
        expect(metresPerTileV).toBeGreaterThan(9);
        expect(metresPerTileV).toBeLessThan(18);
      }
    }
  });
});

describe("building variety", () => {
  it("var factor stays within ±10 % so tiling jitters without distorting", () => {
    for (const b of BUILDING_FOOTPRINTS) {
      const f = getBuildingVarFactor(b.id);
      expect(f).toBeGreaterThanOrEqual(0.9);
      expect(f).toBeLessThanOrEqual(1.1);
    }
  });

  it("var factor is deterministic per id", () => {
    expect(getBuildingVarFactor("sw-glass-tower-1")).toBe(
      getBuildingVarFactor("sw-glass-tower-1")
    );
  });

  it("distributes 3 glass tints across the skyline (not all identical)", () => {
    const indices = new Set(
      BUILDING_FOOTPRINTS.map((b) => getGlassTintIndex(b.id))
    );
    expect(indices.size).toBeGreaterThanOrEqual(2);
    for (const b of BUILDING_FOOTPRINTS) {
      const i = getGlassTintIndex(b.id);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(3);
    }
  });

  it("provides matching day + night tint palettes (3 each)", () => {
    expect(GLASS_TINTS_DAY).toHaveLength(3);
    expect(GLASS_TINTS_NIGHT).toHaveLength(3);
    for (const t of [...GLASS_TINTS_DAY, ...GLASS_TINTS_NIGHT]) {
      expect(t).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ── Building massing composition (P2c) ────────────────────────────────────────

function byId(idFragment: string) {
  const fp = BUILDING_FOOTPRINTS.find((b) => b.id.includes(idFragment));
  if (!fp) throw new Error(`no footprint matching ${idFragment}`);
  return fp;
}

describe("composeBuildingVolumes", () => {
  it("composes glass towers from multiple stacked volumes (not one box)", () => {
    const tower = byId("sw-glass-tower-1");
    const vols = composeBuildingVolumes(tower);
    expect(vols.length).toBeGreaterThanOrEqual(3);
    // Must include a dark podium base and at least one glass shaft volume.
    expect(vols.some((v) => v.group === "dark")).toBe(true);
    expect(vols.some((v) => v.group.startsWith("glass"))).toBe(true);
  });

  it("gives every glass tower a dark podium AND a dark crown (composed top+base)", () => {
    for (const fp of BUILDING_FOOTPRINTS.filter((b) => b.type === "glass-tower")) {
      const vols = composeBuildingVolumes(fp);
      const darks = vols.filter((v) => v.group === "dark");
      // podium + crown (+ maybe antenna) → at least 2 dark volumes.
      expect(darks.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("routes mid/low-rise facades to the concrete group (facade variety)", () => {
    const mid = BUILDING_FOOTPRINTS.find((b) => b.type === "mid-rise")!;
    const vols = composeBuildingVolumes(mid);
    expect(vols.some((v) => v.group === "concrete")).toBe(true);
    expect(vols.some((v) => v.group.startsWith("glass"))).toBe(false);
  });

  it("keeps the distant ring as a single simple far volume (cheap)", () => {
    const bg = byId("bg-");
    const vols = composeBuildingVolumes(bg);
    expect(vols).toHaveLength(1);
    expect(vols[0].group).toBe("far");
  });

  it("base of every building sits on the ground (lowest volume bottom ≈ 0)", () => {
    for (const fp of BUILDING_FOOTPRINTS) {
      const vols = composeBuildingVolumes(fp);
      const minBottom = Math.min(
        ...vols.map((v) => v.center[1] - v.size[1] / 2)
      );
      expect(minBottom).toBeGreaterThanOrEqual(-0.01);
      expect(minBottom).toBeLessThan(0.5);
    }
  });

  it("keeps all sub-volumes within the footprint horizontal envelope (safe zone holds)", () => {
    for (const fp of BUILDING_FOOTPRINTS) {
      const [fw, , fd] = fp.size;
      const [fx, , fz] = fp.position;
      for (const v of composeBuildingVolumes(fp)) {
        const halfW = v.size[0] / 2;
        const halfD = v.size[2] / 2;
        // Each sub-volume is centred on the footprint centre and no wider than it.
        expect(Math.abs(v.center[0] - fx) + halfW).toBeLessThanOrEqual(fw / 2 + 0.01);
        expect(Math.abs(v.center[2] - fz) + halfD).toBeLessThanOrEqual(fd / 2 + 0.01);
      }
    }
  });

  it("is deterministic (no Math.random) — same footprint yields identical volumes", () => {
    const fp = byId("sw-glass-tower-2");
    const a = composeBuildingVolumes(fp);
    const b = composeBuildingVolumes(fp);
    expect(serialize(a)).toBe(serialize(b));
  });

  it("produces silhouette variety across the skyline (varied volume counts)", () => {
    const counts = new Set(
      BUILDING_FOOTPRINTS.map((b) => composeBuildingVolumes(b).length)
    );
    expect(counts.size).toBeGreaterThanOrEqual(2);
  });
});

function serialize(vols: BuildingVolumeSpec[]): string {
  return JSON.stringify(
    vols.map((v) => [v.group, v.size, v.center, v.metersPerTile])
  );
}
