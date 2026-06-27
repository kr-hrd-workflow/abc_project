/**
 * Cross-stack SSOT equality guard.
 *
 * Asserts that the TypeScript INTERSECTION_TRUTH and INTERSECTION_LANE_WIDTH_METERS
 * (apps/web/components/r3f/intersectionTruth.ts) are byte-for-byte consistent with
 * the Python/SUMO mirror (apps/api/networks/intersection_truth.json).
 *
 * Any silent drift between the two stacks will cause this suite to fail.
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  INTERSECTION_LANE_WIDTH_METERS,
  INTERSECTION_TRUTH
} from "./intersectionTruth";

// ESM-safe __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

// Three levels up from apps/web/components/r3f → apps/
const JSON_PATH = resolve(
  __dir,
  "../../../api/networks/intersection_truth.json"
);

interface ApproachJson {
  approach: string;
  road: string;
  inboundLanes: number;
  outboundLanes: number;
  hasMedianBus: boolean;
  laneWidthM: number;
  corridorLengthM: number;
  hasCrosswalk: boolean;
}

interface IntersectionTruthJson {
  laneWidthM: number;
  approaches: Record<string, ApproachJson>;
}

const json: IntersectionTruthJson = JSON.parse(readFileSync(JSON_PATH, "utf8"));

const DIRECTIONS = ["north", "south", "east", "west"] as const;
type Dir = (typeof DIRECTIONS)[number];

describe("cross-stack SSOT: intersectionTruth.ts === intersection_truth.json", () => {
  it("top-level laneWidthM matches INTERSECTION_LANE_WIDTH_METERS", () => {
    expect(json.laneWidthM).toBe(INTERSECTION_LANE_WIDTH_METERS);
  });

  for (const dir of DIRECTIONS) {
    it(`approach '${dir}': inboundLanes, outboundLanes, hasMedianBus, hasCrosswalk, corridorLengthM, road all match`, () => {
      const ts = INTERSECTION_TRUTH[dir as Dir];
      const j = json.approaches[dir];

      expect(j.inboundLanes, "inboundLanes").toBe(ts.inboundLanes);
      expect(j.outboundLanes, "outboundLanes").toBe(ts.outboundLanes);
      expect(j.hasMedianBus, "hasMedianBus").toBe(ts.hasMedianBus);
      expect(j.hasCrosswalk, "hasCrosswalk").toBe(ts.hasCrosswalk);
      expect(j.corridorLengthM, "corridorLengthM").toBe(ts.corridorLengthM);
      expect(j.road, "road").toBe(ts.road);
    });
  }
});
