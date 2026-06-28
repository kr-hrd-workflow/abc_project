import { describe, expect, it } from "vitest";
import type { Direction } from "../../lib/types";
import {
  APPROACH_CORRIDORS,
  BUS_LANE_BORDER_MARKINGS,
  CENTER_LINE_MARKINGS,
  CROSSWALK_STRIPES,
  EDGE_LINE_MARKINGS,
  INTERSECTION_BOX_EXTENT_METERS,
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS,
  LANE_WIDTH_METERS,
  MEDIAN_BUS_LANE_MARKINGS,
  QUEUE_ZONES,
  STOP_LINE_MARKINGS
} from "./roadGeometry";
import { getApproachRoadWidthMeters } from "./intersectionTruth";

describe("roadGeometry derives per-corridor carriageway widths from the SSOT", () => {
  it("sizes each corridor to its own road width (강남대로/테헤란로=36, 서초대로=28.8)", () => {
    const byDir = (d: Direction) =>
      APPROACH_CORRIDORS.find((c) => c.direction === d)!;
    expect(byDir("north").size[0]).toBeCloseTo(36, 6); // N/S width is on x
    expect(byDir("south").size[0]).toBeCloseTo(36, 6);
    expect(byDir("east").size[1]).toBeCloseTo(36, 6); // E/W width is on z
    expect(byDir("west").size[1]).toBeCloseTo(28.8, 6);
    for (const c of APPROACH_CORRIDORS) {
      const w = getApproachRoadWidthMeters(c.direction);
      const widthAxisValue =
        c.orientation === "north_south" ? c.size[0] : c.size[1];
      expect(widthAxisValue).toBeCloseTo(w, 6);
    }
  });

  it("makes the intersection box axis-aware (E–W = 강남대로, N–S = max(테헤란로,서초대로))", () => {
    expect(INTERSECTION_BOX_X_METERS).toBeCloseTo(36, 6);
    expect(INTERSECTION_BOX_Z_METERS).toBeCloseTo(36, 6);
  });

  it("has surface crosswalk stripes on all four approaches (N/S restored in SP3)", () => {
    const dirCount = (d: Direction) =>
      CROSSWALK_STRIPES.filter((s) => s.direction === d).length;
    expect(dirCount("north")).toBe(11);
    expect(dirCount("south")).toBe(11);
    expect(dirCount("east")).toBe(11);
    expect(dirCount("west")).toBe(11);
    expect(CROSSWALK_STRIPES).toHaveLength(44);
  });

  it("sizes queue zones from each corridor's own width", () => {
    const qz = (d: Direction) => QUEUE_ZONES.find((q) => q.id.startsWith(d))!;
    expect(Math.min(...qz("north").size)).toBeCloseTo(36 - 1.6, 6);
    expect(Math.min(...qz("west").size)).toBeCloseTo(28.8 - 1.6, 6);
  });

  it("exports INTERSECTION_BOX_EXTENT_METERS aliasing the axis scalars", () => {
    expect(INTERSECTION_BOX_EXTENT_METERS.ew).toBe(INTERSECTION_BOX_X_METERS);
    expect(INTERSECTION_BOX_EXTENT_METERS.ns).toBe(INTERSECTION_BOX_Z_METERS);
  });
});

describe("MEDIAN_BUS_LANE_MARKINGS (중앙버스전용차로, 강남대로 only)", () => {
  it("marks only N/S corridors, two median-adjacent lanes each", () => {
    const dirs = MEDIAN_BUS_LANE_MARKINGS.map((m) => m.direction).sort();
    expect(dirs).toEqual(["north", "north", "south", "south"]);
    expect(MEDIAN_BUS_LANE_MARKINGS).toHaveLength(4);
  });

  it("places each bus lane half a lane-width off the median, one lane wide", () => {
    for (const m of MEDIAN_BUS_LANE_MARKINGS) {
      expect(Math.abs(m.position[0])).toBeCloseTo(LANE_WIDTH_METERS / 2, 6);
      expect(m.size[0]).toBeCloseTo(LANE_WIDTH_METERS, 6);
    }
  });
});

describe("Korean lane-line markings (P3 road realism)", () => {
  it("중앙선: yellow double-solid at the road centre of every corridor", () => {
    // 4 corridors × 2 lines (복선) = 8.
    expect(CENTER_LINE_MARKINGS).toHaveLength(8);
    for (const m of CENTER_LINE_MARKINGS) {
      // Each pair straddles the corridor centre (very small lateral offset).
      const lateral =
        Math.abs(m.position[0]) < 0.5 ? m.position[0] : m.position[2];
      expect(Math.abs(lateral)).toBeLessThan(0.3);
    }
  });

  it("중앙버스전용차로선: blue double-solid only on the N/S bus corridors", () => {
    const dirs = new Set(BUS_LANE_BORDER_MARKINGS.map((m) => m.direction));
    expect(dirs).toEqual(new Set(["north", "south"]));
    // 2 corridors × 2 sides × 2 lines = 8, on the OUTER edge (±LANE_WIDTH).
    expect(BUS_LANE_BORDER_MARKINGS).toHaveLength(8);
    for (const m of BUS_LANE_BORDER_MARKINGS) {
      expect(Math.abs(m.position[0])).toBeGreaterThan(LANE_WIDTH_METERS - 0.5);
      expect(Math.abs(m.position[0])).toBeLessThan(LANE_WIDTH_METERS + 0.5);
    }
  });

  it("정지선: a general stop bar on every approach + an advanced bus bar on N/S", () => {
    const general = STOP_LINE_MARKINGS.filter((m) => m.id.includes("stop-general"));
    const bus = STOP_LINE_MARKINGS.filter((m) => m.id.includes("stop-bus"));
    expect(general).toHaveLength(4); // every approach
    expect(bus).toHaveLength(2); // 강남대로 N/S only
    // Bus stop line is advanced ahead of (closer to the box than) the general one.
    const northGen = general.find((m) => m.direction === "north")!;
    const northBus = bus.find((m) => m.direction === "north")!;
    expect(Math.abs(northBus.position[2])).toBeLessThan(
      Math.abs(northGen.position[2])
    );
  });

  it("길가장자리구역선: a white solid edge line on both sides of every corridor", () => {
    expect(EDGE_LINE_MARKINGS).toHaveLength(8); // 4 corridors × 2 sides
  });
});
