import { describe, expect, it } from "vitest";
import type { Direction } from "../../lib/types";
import {
  APPROACH_CORRIDORS,
  CROSSWALK_STRIPES,
  INTERSECTION_BOX_EXTENT_METERS,
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS,
  LANE_WIDTH_METERS,
  MEDIAN_BUS_LANE_MARKINGS,
  QUEUE_ZONES
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

  it("removes the N/S surface crosswalk and keeps E/W stripe sets", () => {
    const dirCount = (d: Direction) =>
      CROSSWALK_STRIPES.filter((s) => s.direction === d).length;
    expect(dirCount("north")).toBe(0);
    expect(dirCount("south")).toBe(0);
    expect(dirCount("east")).toBe(11);
    expect(dirCount("west")).toBe(11);
    expect(CROSSWALK_STRIPES).toHaveLength(22);
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
