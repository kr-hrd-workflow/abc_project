import { describe, expect, it } from "vitest";
import {
  INTERSECTION_TRUTH,
  INTERSECTION_LANE_WIDTH_METERS,
  getApproachInboundLaneCount,
  getApproachOutboundLaneCount,
  getApproachRoadWidthMeters,
  getApproachHasMedianBus,
  getApproachMedianBusLaneIndex,
  getApproachHasCrosswalk
} from "./intersectionTruth";
import type { Direction } from "../../lib/types";

const ALL: Direction[] = ["north", "south", "east", "west"];

describe("INTERSECTION_TRUTH (Gangnam Station real layout)", () => {
  it("encodes 5/5/5/4 inbound + 5/5/5/4 outbound lanes", () => {
    expect(getApproachInboundLaneCount("north")).toBe(5);
    expect(getApproachInboundLaneCount("south")).toBe(5);
    expect(getApproachInboundLaneCount("east")).toBe(5);
    expect(getApproachInboundLaneCount("west")).toBe(4);
    expect(getApproachOutboundLaneCount("north")).toBe(5);
    expect(getApproachOutboundLaneCount("south")).toBe(5);
    expect(getApproachOutboundLaneCount("east")).toBe(5);
    expect(getApproachOutboundLaneCount("west")).toBe(4);
  });

  it("puts the median bus-only lane on 강남대로 (N/S) only", () => {
    expect(getApproachHasMedianBus("north")).toBe(true);
    expect(getApproachHasMedianBus("south")).toBe(true);
    expect(getApproachHasMedianBus("east")).toBe(false);
    expect(getApproachHasMedianBus("west")).toBe(false);
    expect(getApproachMedianBusLaneIndex("north")).toBe(4);
    expect(getApproachMedianBusLaneIndex("south")).toBe(4);
    expect(getApproachMedianBusLaneIndex("east")).toBeNull();
    expect(getApproachMedianBusLaneIndex("west")).toBeNull();
  });

  it("removes the N/S surface crosswalk and keeps E/W (테헤란로/서초대로)", () => {
    expect(getApproachHasCrosswalk("north")).toBe(false);
    expect(getApproachHasCrosswalk("south")).toBe(false);
    expect(getApproachHasCrosswalk("east")).toBe(true);
    expect(getApproachHasCrosswalk("west")).toBe(true);
  });

  it("derives carriageway width from lane counts at 3.6 m lanes", () => {
    expect(INTERSECTION_LANE_WIDTH_METERS).toBe(3.6);
    expect(getApproachRoadWidthMeters("north")).toBeCloseTo(36, 6);
    expect(getApproachRoadWidthMeters("east")).toBeCloseTo(36, 6);
    expect(getApproachRoadWidthMeters("west")).toBeCloseTo(28.8, 6);
    for (const d of ALL) {
      const t = INTERSECTION_TRUTH[d];
      expect(t.laneWidthM).toBe(3.6);
      expect(getApproachRoadWidthMeters(d)).toBeCloseTo(
        (t.inboundLanes + t.outboundLanes) * t.laneWidthM,
        6
      );
    }
  });

  it("labels the corridors with the real road names", () => {
    expect(INTERSECTION_TRUTH.north.road).toBe("강남대로");
    expect(INTERSECTION_TRUTH.south.road).toBe("강남대로");
    expect(INTERSECTION_TRUTH.east.road).toBe("테헤란로");
    expect(INTERSECTION_TRUTH.west.road).toBe("서초대로");
  });
});
