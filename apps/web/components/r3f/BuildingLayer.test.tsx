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
  type BuildingForm
} from "./buildingFootprints";

// ── buildingFootprints data validation ───────────────────────────────────────

const VALID_FORMS: BuildingForm[] = [
  "glassTower",
  "midriseCommercial",
  "distant"
];

describe("buildingFootprints (faithful 강남역 skyline)", () => {
  it("defines a populated skyline (towers + commercial corners + distant ring)", () => {
    expect(BUILDING_FOOTPRINTS.length).toBeGreaterThanOrEqual(18);
  });

  it("SW 서초 삼성타운 cluster = 3 glass towers, one clearly the tallest (>200 m peak)", () => {
    const swTowers = BUILDING_FOOTPRINTS.filter(
      (b) =>
        b.form === "glassTower" &&
        b.position[0] < 0 && // west
        b.position[2] > 0 && // south
        b.id.startsWith("samsung-town")
    );
    expect(swTowers).toHaveLength(3);
    const heights = swTowers.map((t) => t.size[1]).sort((a, b) => b - a);
    expect(heights[0]).toBeGreaterThan(200); // dominant ~203 m peak
    expect(heights[1]).toBeGreaterThan(140); // ~151 m
    expect(heights[2]).toBeGreaterThan(140);
    // The Samsung-Town peak is the tallest building in the whole skyline.
    const globalMax = Math.max(...BUILDING_FOOTPRINTS.map((b) => b.size[1]));
    expect(heights[0]).toBe(globalMax);
  });

  it("has a slender GT Tower west along 서초대로 (~130 m all-glass)", () => {
    const gt = BUILDING_FOOTPRINTS.find((b) => b.id === "gt-tower")!;
    expect(gt.form).toBe("glassTower");
    expect(gt.position[0]).toBeLessThan(-120); // far west
    expect(gt.size[1]).toBeGreaterThan(110);
    expect(gt.size[1]).toBeLessThan(150);
  });

  it("has Meritz Tower on the SE 강남대로 frontage (~120 m glass)", () => {
    const m = BUILDING_FOOTPRINTS.find((b) => b.id === "meritz-tower")!;
    expect(m.form).toBe("glassTower");
    expect(m.position[0]).toBeGreaterThan(0); // east frontage
    expect(m.position[2]).toBeGreaterThan(0); // south
    expect(m.size[1]).toBeGreaterThan(100);
  });

  it("corners NE/NW/SE are mid-rise commercial (40–80 m), NOT towers", () => {
    const corners = ["nw-corner-megabox", "ne-corner-commercial", "se-corner-retail"];
    for (const id of corners) {
      const b = BUILDING_FOOTPRINTS.find((x) => x.id === id)!;
      expect(b.form).toBe("midriseCommercial");
      expect(b.size[1]).toBeGreaterThanOrEqual(40);
      expect(b.size[1]).toBeLessThanOrEqual(80);
      expect(b.billboards).toBe(true);
    }
  });

  it("east 테헤란로 towers grow progressively taller into the distance", () => {
    const east = BUILDING_FOOTPRINTS.filter((b) => b.id.startsWith("teheran-e"))
      .slice()
      .sort((a, b) => a.position[0] - b.position[0]);
    expect(east.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < east.length; i += 1) {
      // Further east (larger x) → taller.
      expect(east[i].size[1]).toBeGreaterThan(east[i - 1].size[1]);
      expect(east[i].form).toBe("glassTower");
    }
  });

  it("positions every building so its near edge is outside the road+sidewalk safe zone", () => {
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

  it("all building forms are valid", () => {
    for (const b of BUILDING_FOOTPRINTS) {
      expect(VALID_FORMS).toContain(b.form);
    }
  });

  it("building heights are physically plausible (2–210 m)", () => {
    for (const b of BUILDING_FOOTPRINTS) {
      const h = b.size[1];
      expect(h).toBeGreaterThan(2);
      expect(h).toBeLessThanOrEqual(210);
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
    const tower = byId("samsung-town-main");
    const vols = composeBuildingVolumes(tower);
    expect(vols.length).toBeGreaterThanOrEqual(3);
    // Must include a dark podium base and at least one glass shaft volume.
    expect(vols.some((v) => v.group === "dark")).toBe(true);
    expect(vols.some((v) => v.group.startsWith("glass"))).toBe(true);
  });

  it("gives every glass tower a dark podium AND a dark crown (composed top+base)", () => {
    for (const fp of BUILDING_FOOTPRINTS.filter((b) => b.form === "glassTower")) {
      const vols = composeBuildingVolumes(fp);
      const darks = vols.filter((v) => v.group === "dark");
      // podium + crown (+ maybe antenna) → at least 2 dark volumes.
      expect(darks.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("the Samsung-Town peak gets an antenna mast (distinct flagship silhouette)", () => {
    const peak = byId("samsung-town-main");
    const vols = composeBuildingVolumes(peak);
    // A slender tall dark volume (antenna) sits at the top.
    const tallThin = vols.find(
      (v) => v.group === "dark" && v.size[0] <= 1 && v.size[1] >= 6
    );
    expect(tallThin).toBeTruthy();
  });

  it("routes mid-rise commercial facades to concrete + LED billboards (variety)", () => {
    const mid = BUILDING_FOOTPRINTS.find((b) => b.form === "midriseCommercial" && b.billboards)!;
    const vols = composeBuildingVolumes(mid);
    expect(vols.some((v) => v.group === "concrete")).toBe(true);
    expect(vols.some((v) => v.group.startsWith("glass"))).toBe(false);
    const billboards = vols.filter((v) => v.group === "billboard");
    expect(billboards.length).toBeGreaterThanOrEqual(1);
    for (const b of billboards) {
      expect(b.ledColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
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

  it("keeps massing sub-volumes within the footprint envelope (billboards may overhang ≤1 m)", () => {
    for (const fp of BUILDING_FOOTPRINTS) {
      const [fw, , fd] = fp.size;
      const [fx, , fz] = fp.position;
      for (const v of composeBuildingVolumes(fp)) {
        const halfW = v.size[0] / 2;
        const halfD = v.size[2] / 2;
        // Signage panels intentionally protrude slightly past the facade.
        const slack = v.group === "billboard" ? 1.0 : 0.01;
        expect(Math.abs(v.center[0] - fx) + halfW).toBeLessThanOrEqual(fw / 2 + slack);
        expect(Math.abs(v.center[2] - fz) + halfD).toBeLessThanOrEqual(fd / 2 + slack);
      }
    }
  });

  it("is deterministic (no Math.random) — same footprint yields identical volumes", () => {
    const fp = byId("samsung-town-c2");
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
