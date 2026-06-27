# Gangnam Station (강남역 사거리) SP1 — Geometry + SUMO Truth Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the symmetric idealized intersection + 2×2 SUMO grid placeholder with a single asymmetric **real 강남역 사거리** junction, driven by one cross-stack source of truth, so SUMO vehicles render on the real lanes with all gates green — the backbone (SP1) of the full reconstruction.

**Architecture:** A single intersection-truth definition (TS `intersectionTruth.ts` + a Python/SUMO mirror) feeds both `roadGeometry.ts` (per-corridor widths, asymmetric lanes, median bus, no 강남대로 crosswalk) and a netconvert-built single 4-way SUMO network. The SUMO→frontend bridge is updated for the new lane-id scheme, coordinate transform, TLS decode, and snapshot bounds. Vehicles align via the rewritten per-approach `getInboundLaneOffset`. Cameras are recalibrated and the visual baseline regenerated.

**Tech Stack:** TypeScript + React-Three-Fiber (apps/web, vitest); Python/FastAPI + SUMO (TraCI/libsumo, netconvert, sumolib) (apps/api, pytest); SUMO plain-XML network inputs.

## Global Constraints

- Lanes per approach: 강남대로 north & south = inbound 5 / outbound 5 (innermost lane each way = median bus-only, 중앙버스전용차로); 테헤란로 east = 5 / 5; 서초대로 west = 4 / 4. Lane width = 3.6 m.
- Coordinate contract: 1 unit = 1 m; origin = junction center; north = −z, east = +x, up = +y. Bridge mapping scene_x = sumo_x, scene_z = −sumo_y. Keep PRECISE_VEHICLE_HEADING_BY_DIRECTION (north=180, south=0, east=270, west=90).
- Lane-ID naming: `{approach}_in_{i}` / `{approach}_out_{i}` (e.g. `north_in_0`) — both parseLaneDirection (TS) and _approach_from_lane_id (Python) key on the approach word.
- NO surface crosswalk across 강남대로: north & south crosswalk stripe sets are empty; east & west remain.
- corridorLengthM = north 140 / south 120 / east 140 / west 140 (SSOT; see R4).
- SP1 scope ONLY: geometry + SUMO truth + bridge + alignment. NO plates, signal art, or grade (SP2–SP4).
- TDD throughout (failing test → run/FAIL → minimal real impl → run/PASS → commit). Frequent commits.
- Spec: `docs/superpowers/specs/2026-06-27-gangnam-station-real-reconstruction-design.md`.

---

## §0 — Cross-section reconciliations (MUST APPLY — these override any conflicting task text below)

These resolve interface conflicts found by the plan's consistency review. Where a task in Sections A–D contradicts a rule here, **this section wins**. Apply each before/while executing the referenced task.

**R1 — TLS link-index (resolves Section B ↔ C contradiction).** The authored TLS (Section B `gangnam.tll.xml`) emits an **8-character** state whose first four characters are the through movements for north, east, south, west (in that order = TLS_DIRECTION_ORDER). In Section C Task C3, set:
```python
TLS_APPROACH_LINK_INDEX = {"north": 0, "east": 1, "south": 2, "west": 3}
```
(Do NOT use the 12-char {1,4,7,10} scheme — it drops the west signal against the real 8-char state.) C3's fake TLS API must emit 8-char states. Add **Task X2** (below) as the real B→C integration test instead of the self-referential fake.

**R2 — axis-aware box extent (resolves Section A ↔ D symbol mismatch).** Section A (`roadGeometry.ts`) must ALSO export the record consumed by Section D:
```ts
export const INTERSECTION_BOX_EXTENT_METERS = {
  ew: INTERSECTION_BOX_X_METERS, // 강남대로 carriageway width, spans x
  ns: INTERSECTION_BOX_Z_METERS  // max(테헤란로,서초대로), spans z
} as const;
```
Section D's `.ew`/`.ns` references then resolve. Correct D's DEFINES/USES attribution from "Section B" to "Section A (roadGeometry.ts)". (ew = X axis, ns = Z axis.)

**R3 — getInboundLaneOffset ownership (resolves Section A ↔ D double-export).** The per-approach rewrite **and** the `export` of `getInboundLaneOffset` belong solely to **Section A Task A4**. Section D Task D3 exports **only** `parseLaneDirection` and `parseLaneIndex` (which A leaves unchanged). Execute A4 before D3; the D3 integration test consumes the already-exported, already-rewritten function. Every Section D note saying getInboundLaneOffset/parse* is "owned by Section C" is wrong — read "Section A" (Section C is Python-only).

**R4 — corridor lengths & snapshot bounds (resolves Section C ↔ A/B mismatch).** The SSOT corridorLengthM is **north 140 / south 120 / east 140 / west 140** (matches Section B's node coordinates: south_end y=−120, north_end y=140). This **intentionally changes** the derived bounds from the old {−160, 140, 160, −160} to:
```python
SNAPSHOT_BOUNDS_METERS = {"north": -140.0, "south": 120.0, "east": 140.0, "west": -140.0}
APPROACH_LENGTH_METERS = {"north": 140.0, "south": 120.0, "east": 140.0, "west": 140.0}
```
Correct Section C Task C4's claim that bounds "stay {−160,140,160,−160}". Treat this as a deliberate baseline change (note it for downstream fixtures/visual baseline in D4).

**X1 — ADDED TASK: cross-stack SSOT equality test.** The truth is duplicated in `apps/web/components/r3f/intersectionTruth.ts` (Section A) and `apps/api/networks/intersection_truth.json` (Section B). Add a vitest test `apps/web/components/r3f/intersectionTruth.crossstack.test.ts` that `fs.readFileSync`-loads the JSON and asserts laneWidthM + every approach's inboundLanes/outboundLanes/hasMedianBus/hasCrosswalk/corridorLengthM/road equal the imported `INTERSECTION_TRUTH`. This is the guard that prevents the R4-class silent drift. (Place it in Section A's sequence, after A1 and B1.)

**X2 — ADDED TASK: end-to-end TLS signal-decode integration test.** Add a pytest `apps/api/tests/test_tls_signal_decode.py` that takes the authored phase strings from `gangnam.tll.xml` (e.g. phase[0] and the 4th phase) and runs them through the C3 bridge mapping, asserting per-approach colors (north/east/south/west) match the intended movement for that phase. This catches index/length contradictions that C3's self-referential fake cannot.

**Execution-environment notes (not silent):**
- **B4/B5 require a SUMO-enabled env** (netconvert + sumo + sumolib on PATH). They are the only gate that proves the network actually builds and that lanes/bus-vClass/TLS survive netconvert — they MUST be run (not skipped) before SP1 is claimed done. If this env lacks SUMO, run them where the `simulation` extra is installed.
- **Non-Section-A roadGeometry consumers** (LightingRig, WetRoadReflectors, WeatherAndAtmosphere, ProceduralIntersection, NightVehicleTreatment) read ROAD_WIDTH_METERS (18→36) and INTERSECTION_BOX_METERS (32→36) and will shift outward. They compile and have no asserting tests; D4's baseline regen cannot detect an unintended shift (it self-regenerates). After the geometry refactor, **visually confirm** these in a browser render (part of D5 sign-off).

---


# Section A — SSOT + R3F geometry + lane math + camera

## Section A — TS SSOT + R3F geometry refactor + lane math + camera

Grounding notes (read before executing):
- All paths below are under `apps/web/`. Run vitest from there: `cd apps/web && npm test -- <pathSubstring>` (npm `test` = `vitest run`).
- Coordinate contract honored: scene units = meters, north = `-z`, east = `+x`, `scene_x = sumo_x`, `scene_z = -sumo_y`. `PRECISE_VEHICLE_HEADING_BY_DIRECTION` (north=180, south=0, east=270, west=90) in `TrafficDensityLayer.tsx:107` is left unchanged.
- Verified blast radius: `roadGeometry.ts` exports are read by `ApproachCorridors.tsx`, `LightingRig.tsx`, `WeatherAndAtmosphere.tsx`, `WetRoadReflectors.tsx`, `ProceduralIntersection.tsx`, `NightVehicleTreatment.tsx`, `plateProxyGeometry.ts`, and tests `CameraWeatherClutter.test.tsx`, `DashboardShell.test.tsx`, `SimulationCanvas.test.tsx`, `plateProxyGeometry.test.ts`. Back-compat scalars `ROAD_WIDTH_METERS`, `INTERSECTION_BOX_METERS`, `INBOUND_LANE_COUNT`, `OUTBOUND_LANE_COUNT`, `LANE_WIDTH_METERS`, `CORRIDOR_LENGTH_METERS`, `APPROACH_CORRIDORS` keep their names (now SSOT-derived) so non-Section-A consumers keep compiling.
- DESIGN DECISION (surfaced): `getInboundLaneOffset` is rewritten from the legacy "center all inbound lanes on the corridor centerline + visual bias" hack to the physically-correct "inbound lanes occupy the inbound (right-hand) half, measured outward from the median" model. This is required because the real carriageway now has up to 10 lanes (inbound must not overlap opposing traffic), and it is what makes the median-bus innermost-lane index meaningful. Its signature `getInboundLaneOffset(direction, laneIndex, laneCount)` is preserved. The one snapshot assertion that encoded the old bias (`east_in_1 → -LANE_WIDTH*0.45`) is owned by Section A and updated.

---

### Task A1: New SSOT module `intersectionTruth.ts` (lane counts, median-bus, crosswalk topology)

Files:
- Create `apps/web/components/r3f/intersectionTruth.ts`
- Create `apps/web/components/r3f/intersectionTruth.test.ts`

Interfaces:
- Consumes: `Direction` from `apps/web/lib/types.ts` (LOCKED type `"north"|"south"|"east"|"west"`).
- Produces (LOCKED SSOT SHAPE):
  - `type ApproachTruth = { approach: Direction; road: string; inboundLanes: number; outboundLanes: number; hasMedianBus: boolean; laneWidthM: number; corridorLengthM: number; hasCrosswalk: boolean }`
  - `const INTERSECTION_TRUTH: Record<Direction, ApproachTruth>`
  - `const INTERSECTION_LANE_WIDTH_METERS: number` (3.6 global)
  - `getApproachInboundLaneCount(direction: Direction): number`
  - `getApproachOutboundLaneCount(direction: Direction): number`
  - `getApproachRoadWidthMeters(direction: Direction): number`
  - `getApproachHasMedianBus(direction: Direction): boolean`
  - `getApproachMedianBusLaneIndex(direction: Direction): number | null` (innermost inbound lane = `inboundLanes - 1` when `hasMedianBus`, else `null`)
  - `getApproachHasCrosswalk(direction: Direction): boolean`

Steps:

- [ ] Write failing test `apps/web/components/r3f/intersectionTruth.test.ts`:
```ts
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
```
- [ ] Run (expect FAIL — module missing): `cd apps/web && npm test -- components/r3f/intersectionTruth.test.ts` → `Failed to resolve import "./intersectionTruth"`.
- [ ] Minimal impl `apps/web/components/r3f/intersectionTruth.ts`:
```ts
import type { Direction } from "../../lib/types";

// Single source of truth for the real Gangnam Station (강남역 사거리) layout.
// Mirrored by the Python/SUMO side (apps/api networks intersection_truth) — do
// NOT duplicate magic numbers across stacks; both read from these values.
export const INTERSECTION_LANE_WIDTH_METERS = 3.6;

export type ApproachTruth = {
  approach: Direction;
  road: string;
  inboundLanes: number;
  outboundLanes: number;
  hasMedianBus: boolean;
  laneWidthM: number;
  corridorLengthM: number;
  hasCrosswalk: boolean;
};

export const INTERSECTION_TRUTH: Record<Direction, ApproachTruth> = {
  north: {
    approach: "north",
    road: "강남대로",
    inboundLanes: 5,
    outboundLanes: 5,
    hasMedianBus: true,
    laneWidthM: INTERSECTION_LANE_WIDTH_METERS,
    corridorLengthM: 140,
    hasCrosswalk: false
  },
  south: {
    approach: "south",
    road: "강남대로",
    inboundLanes: 5,
    outboundLanes: 5,
    hasMedianBus: true,
    laneWidthM: INTERSECTION_LANE_WIDTH_METERS,
    corridorLengthM: 120,
    hasCrosswalk: false
  },
  east: {
    approach: "east",
    road: "테헤란로",
    inboundLanes: 5,
    outboundLanes: 5,
    hasMedianBus: false,
    laneWidthM: INTERSECTION_LANE_WIDTH_METERS,
    corridorLengthM: 140,
    hasCrosswalk: true
  },
  west: {
    approach: "west",
    road: "서초대로",
    inboundLanes: 4,
    outboundLanes: 4,
    hasMedianBus: false,
    laneWidthM: INTERSECTION_LANE_WIDTH_METERS,
    corridorLengthM: 140,
    hasCrosswalk: true
  }
};

export function getApproachInboundLaneCount(direction: Direction): number {
  return INTERSECTION_TRUTH[direction].inboundLanes;
}

export function getApproachOutboundLaneCount(direction: Direction): number {
  return INTERSECTION_TRUTH[direction].outboundLanes;
}

export function getApproachRoadWidthMeters(direction: Direction): number {
  const t = INTERSECTION_TRUTH[direction];
  return (t.inboundLanes + t.outboundLanes) * t.laneWidthM;
}

export function getApproachHasMedianBus(direction: Direction): boolean {
  return INTERSECTION_TRUTH[direction].hasMedianBus;
}

// SUMO numbers lanes from the right curb (0) toward the median. The median
// bus-only lane is therefore the innermost (highest-index) inbound lane.
export function getApproachMedianBusLaneIndex(
  direction: Direction
): number | null {
  const t = INTERSECTION_TRUTH[direction];
  return t.hasMedianBus ? t.inboundLanes - 1 : null;
}

export function getApproachHasCrosswalk(direction: Direction): boolean {
  return INTERSECTION_TRUTH[direction].hasCrosswalk;
}
```
- [ ] Run (expect PASS): `cd apps/web && npm test -- components/r3f/intersectionTruth.test.ts`.
- [ ] Commit: `git add apps/web/components/r3f/intersectionTruth.ts apps/web/components/r3f/intersectionTruth.test.ts && git commit -m "feat(r3f): add intersectionTruth SSOT for Gangnam Station real lane layout"`

---

### Task A2: `roadGeometry.ts` — per-corridor widths, axis-aware box, crosswalk topology

Files:
- Modify `apps/web/components/r3f/roadGeometry.ts` (lines 1, 88–158 constants/corridors; 160–207 dividers; 209–244 queue zones; 246–270 curbs; 272–296 sidewalks; 298–322 building edges; 342–380 crosswalk builder)
- Create `apps/web/components/r3f/roadGeometry.test.ts`
- Modify `apps/web/components/r3f/CameraWeatherClutter.test.tsx` (lines 290–356 crosswalk test — forced by N/S crosswalk removal)

Interfaces:
- Consumes: `INTERSECTION_TRUTH`, `INTERSECTION_LANE_WIDTH_METERS`, `getApproachRoadWidthMeters`, `getApproachHasCrosswalk` from `./intersectionTruth`; `Direction`.
- Produces: existing exports (names unchanged, now SSOT-derived) + new `INTERSECTION_BOX_X_METERS`, `INTERSECTION_BOX_Z_METERS`. Per-corridor width replaces the single `ROAD_WIDTH_METERS` in every derived array. `CROSSWALK_STRIPES` contains east+west only.

Steps:

- [ ] Write failing test `apps/web/components/r3f/roadGeometry.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { Direction } from "../../lib/types";
import {
  APPROACH_CORRIDORS,
  CROSSWALK_STRIPES,
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS,
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
});
```
- [ ] Run (expect FAIL — `INTERSECTION_BOX_X_METERS` undefined / 44 stripes): `cd apps/web && npm test -- components/r3f/roadGeometry.test.ts`.
- [ ] Impl — replace the constants block `roadGeometry.ts:88–100` and add a width helper. Old:
```ts
export const INTERSECTION_BOX_METERS = 32;
export const LANE_WIDTH_METERS = 3.6;
export const INBOUND_LANE_COUNT = 3;
export const OUTBOUND_LANE_COUNT = 2;
export const ROAD_WIDTH_METERS =
  (INBOUND_LANE_COUNT + OUTBOUND_LANE_COUNT) * LANE_WIDTH_METERS;

export const CORRIDOR_LENGTH_METERS: Record<Direction, number> = {
  north: 140,
  south: 120,
  east: 140,
  west: 140
};
```
New:
```ts
export const LANE_WIDTH_METERS = INTERSECTION_LANE_WIDTH_METERS;

// Per-corridor carriageway helper (SSOT-derived).
function corridorWidth(direction: Direction): number {
  return getApproachRoadWidthMeters(direction);
}

// Axis-aware junction box: its E–W extent is the 강남대로 carriageway (the N–S
// road's width spans x); its N–S extent is the widest E–W road (테헤란로 vs 서초대로).
export const INTERSECTION_BOX_X_METERS = corridorWidth("north");
export const INTERSECTION_BOX_Z_METERS = Math.max(
  corridorWidth("east"),
  corridorWidth("west")
);
// Back-compat square footprint (used by ground-plane / proxy consumers).
export const INTERSECTION_BOX_METERS = Math.max(
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS
);

// Back-compat single-width scalar (= 강남대로 carriageway) for legacy consumers
// (LightingRig, WetRoadReflectors, WeatherAndAtmosphere, ProceduralIntersection).
export const ROAD_WIDTH_METERS = corridorWidth("north");

// Deprecated single-value lane counts kept as 강남대로 arterial defaults; real
// per-approach counts come from getApproachInboundLaneCount/OutboundLaneCount.
export const INBOUND_LANE_COUNT = getApproachInboundLaneCount("north");
export const OUTBOUND_LANE_COUNT = getApproachOutboundLaneCount("north");

export const CORRIDOR_LENGTH_METERS: Record<Direction, number> = {
  north: INTERSECTION_TRUTH.north.corridorLengthM,
  south: INTERSECTION_TRUTH.south.corridorLengthM,
  east: INTERSECTION_TRUTH.east.corridorLengthM,
  west: INTERSECTION_TRUTH.west.corridorLengthM
};

const HALF_BOX_X = INTERSECTION_BOX_X_METERS / 2;
const HALF_BOX_Z = INTERSECTION_BOX_Z_METERS / 2;
```
  Update the import at `roadGeometry.ts:1`:
```ts
import type { Direction } from "../../lib/types";
import {
  INTERSECTION_TRUTH,
  INTERSECTION_LANE_WIDTH_METERS,
  getApproachInboundLaneCount,
  getApproachOutboundLaneCount,
  getApproachRoadWidthMeters,
  getApproachHasCrosswalk
} from "./intersectionTruth";
```
  Delete the now-unused `const HALF_INTERSECTION = INTERSECTION_BOX_METERS / 2;` (line 102) — replaced by `HALF_BOX_X`/`HALF_BOX_Z`.
- [ ] Impl — rewrite `APPROACH_CORRIDORS` (`roadGeometry.ts:121–158`) to per-corridor lanes/width and axis-aware offsets:
```ts
export const APPROACH_CORRIDORS: ApproachCorridorSpec[] = [
  {
    direction: "north",
    lengthMeters: CORRIDOR_LENGTH_METERS.north,
    inboundLanes: getApproachInboundLaneCount("north"),
    outboundLanes: getApproachOutboundLaneCount("north"),
    orientation: "north_south",
    position: [0, 0, -HALF_BOX_Z - CORRIDOR_LENGTH_METERS.north / 2],
    size: [corridorWidth("north"), CORRIDOR_LENGTH_METERS.north]
  },
  {
    direction: "south",
    lengthMeters: CORRIDOR_LENGTH_METERS.south,
    inboundLanes: getApproachInboundLaneCount("south"),
    outboundLanes: getApproachOutboundLaneCount("south"),
    orientation: "north_south",
    position: [0, 0, HALF_BOX_Z + CORRIDOR_LENGTH_METERS.south / 2],
    size: [corridorWidth("south"), CORRIDOR_LENGTH_METERS.south]
  },
  {
    direction: "east",
    lengthMeters: CORRIDOR_LENGTH_METERS.east,
    inboundLanes: getApproachInboundLaneCount("east"),
    outboundLanes: getApproachOutboundLaneCount("east"),
    orientation: "east_west",
    position: [HALF_BOX_X + CORRIDOR_LENGTH_METERS.east / 2, 0, 0],
    size: [CORRIDOR_LENGTH_METERS.east, corridorWidth("east")]
  },
  {
    direction: "west",
    lengthMeters: CORRIDOR_LENGTH_METERS.west,
    inboundLanes: getApproachInboundLaneCount("west"),
    outboundLanes: getApproachOutboundLaneCount("west"),
    orientation: "east_west",
    position: [-HALF_BOX_X - CORRIDOR_LENGTH_METERS.west / 2, 0, 0],
    size: [CORRIDOR_LENGTH_METERS.west, corridorWidth("west")]
  }
];
```
- [ ] Impl — make every derived array consume the per-corridor width. In each `flatMap((corridor) => …)` add `const widthM = corridorWidth(corridor.direction);` and replace `ROAD_WIDTH_METERS` with `widthM`:
  - `LANE_DIVIDER_MARKINGS` (line 169): `const laneOffset = -widthM / 2 + laneIndex * LANE_WIDTH_METERS;` (laneCount already `corridor.inboundLanes + corridor.outboundLanes`).
  - `QUEUE_ZONES` (lines 209–244): replace the four `ROAD_WIDTH_METERS - 1.6` with `corridorWidth(corridor.direction) - 1.6`, and swap the offset constants `HALF_INTERSECTION` → `HALF_BOX_Z` for north/south branches and `HALF_BOX_X` for east/west branches.
  - `CURB_SEGMENTS` (lines 252, 266): `side * (widthM / 2 + CURB_WIDTH / 2)`.
  - `SIDEWALK_SLABS` (lines 278, 292): `side * (widthM / 2 + CURB_WIDTH + SIDEWALK_WIDTH / 2)`.
  - `BUILDING_EDGE_BLOCKS` (lines 304, 318): `side * (widthM / 2 + CURB_WIDTH + SIDEWALK_WIDTH + BUILDING_EDGE_WIDTH / 2 + 1.4)`.
  (`STAGE6E_CITY_EDGE_BLOCKS` already derives from `BUILDING_EDGE_BLOCKS`, so it follows automatically.)
- [ ] Impl — rewrite `buildCrosswalkStripes` (`roadGeometry.ts:342–380`) to E/W-only with per-corridor width and axis-aware offset:
```ts
function buildCrosswalkStripes(): PlanePrimitiveSpec[] {
  const stripes: PlanePrimitiveSpec[] = [];
  const stripeCount = 11;
  const crosswalkOffset = HALF_BOX_X + 2.75;
  const crosswalkDepth = 5.0;
  const centeredIndex = (stripeCount - 1) / 2;

  // No surface crosswalk across 강남대로 (N/S). Keep 테헤란로/서초대로 (E/W).
  for (const direction of ["east", "west"] as const) {
    if (!getApproachHasCrosswalk(direction)) continue;
    const lateralSpan = getApproachRoadWidthMeters(direction) - 1.4;
    const spacing = lateralSpan / (stripeCount - 1);
    const offsetX = direction === "east" ? crosswalkOffset : -crosswalkOffset;

    for (let index = 0; index < stripeCount; index += 1) {
      const offset = (index - centeredIndex) * spacing;
      stripes.push({
        id: `${direction}-crosswalk-${index}`,
        direction,
        position: [offsetX, MARKING_HEIGHT + 0.008, offset],
        size: [crosswalkDepth, CROSSWALK_STRIPE_WIDTH]
      });
    }
  }

  return stripes;
}
```
- [ ] Run (expect PASS): `cd apps/web && npm test -- components/r3f/roadGeometry.test.ts`.
- [ ] Update consumer test `CameraWeatherClutter.test.tsx` — the existing "zebra stripes" test (lines 290–356) hard-asserts 44 stripes and inspects `north` stripes, which no longer exist. Replace the `north*` analysis with `west*` and the count, keeping the same checks against per-corridor widths. Concretely: add `import { getApproachRoadWidthMeters } from "./intersectionTruth";`, then change line 335 `expect(CROSSWALK_STRIPES).toHaveLength(44);` → `toHaveLength(22);`; replace every `northStripes`/`northGap`/`northLateralSpan`/`northCenterDistance` definition and assertion with a `west` counterpart filtered by `stripe.direction === "west"` and sorted by `position[2]`; and change the lateral-span bounds to per-corridor width:
```ts
const eastWidth = getApproachRoadWidthMeters("east");
const westWidth = getApproachRoadWidthMeters("west");
expect(eastLateralSpan).toBeGreaterThanOrEqual(eastWidth - 1.2);
expect(eastLateralSpan).toBeLessThanOrEqual(eastWidth);
expect(westLateralSpan).toBeGreaterThanOrEqual(westWidth - 1.2);
expect(westLateralSpan).toBeLessThanOrEqual(westWidth);
```
  Keep the `halfIntersection`/centerDistance bounds (`halfIntersection + 2 .. + 4`) — east/west `crosswalkOffset = HALF_BOX_X + 2.75 = 20.75 ∈ [20, 22]` holds. Both east and west stripes satisfy `size[0] > size[1]` (already true for E/W). `LANE_DIVIDER_MARKINGS.length` assertion (≥56, line 494) still holds (now ~297).
- [ ] Run full file (expect PASS): `cd apps/web && npm test -- components/r3f/CameraWeatherClutter.test.tsx`.
- [ ] Commit: `git add apps/web/components/r3f/roadGeometry.ts apps/web/components/r3f/roadGeometry.test.ts apps/web/components/r3f/CameraWeatherClutter.test.tsx && git commit -m "refactor(r3f): derive roadGeometry widths/box/crosswalks from intersectionTruth SSOT"`

---

### Task A3: Median bus-lane red surface markings on 강남대로 (data only)

Files:
- Modify `apps/web/components/r3f/roadGeometry.ts` (add export near `TURN_ARROW_MARKINGS`, ~line 334)
- Modify `apps/web/components/r3f/roadGeometry.test.ts` (append)

Interfaces:
- Consumes: `INTERSECTION_TRUTH`, `getApproachHasMedianBus`, `getApproachMedianBusLaneIndex` (add to import), `APPROACH_CORRIDORS`, `LANE_WIDTH_METERS`.
- Produces: `const MEDIAN_BUS_LANE_MARKINGS: PlanePrimitiveSpec[]` — a red central lane surface for each innermost (median-adjacent) lane on 강남대로, one per travel direction (inbound + outbound), N/S only. Data only; no rendering wired here.

Steps:

- [ ] Append failing test to `roadGeometry.test.ts`:
```ts
import { MEDIAN_BUS_LANE_MARKINGS } from "./roadGeometry";
import { LANE_WIDTH_METERS } from "./roadGeometry";

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
```
- [ ] Run (expect FAIL — `MEDIAN_BUS_LANE_MARKINGS` undefined): `cd apps/web && npm test -- components/r3f/roadGeometry.test.ts`.
- [ ] Impl — add to the import from `./intersectionTruth`: `getApproachHasMedianBus`. Add export after `TURN_ARROW_MARKINGS` (line 334):
```ts
// 중앙버스전용차로: red median bus-only lane surfaces on 강남대로 (N/S) only.
// The bus lane is the median-adjacent lane in each travel direction, so each
// corridor gets two: one inbound side (-x) and one outbound side (+x).
const MEDIAN_BUS_LANE_COLOR = "#b0322c";

export const MEDIAN_BUS_LANE_MARKINGS: PlanePrimitiveSpec[] =
  APPROACH_CORRIDORS.flatMap((corridor) => {
    if (
      corridor.orientation !== "north_south" ||
      !getApproachHasMedianBus(corridor.direction)
    ) {
      return [];
    }
    const lateral = LANE_WIDTH_METERS / 2;
    return [-1, 1].map((side) => ({
      id: `${corridor.direction}-median-bus-lane-${side < 0 ? "inbound" : "outbound"}`,
      direction: corridor.direction,
      position: [
        side * lateral,
        MARKING_HEIGHT + 0.006,
        corridor.position[2]
      ] as Vector3Tuple,
      size: [LANE_WIDTH_METERS, corridor.lengthMeters] as [number, number]
    }));
  });
```
  (`MEDIAN_BUS_LANE_COLOR` is exported-adjacent data; expose it too if a later render task needs it: `export const MEDIAN_BUS_LANE_COLOR = "#b0322c";`.)
- [ ] Run (expect PASS): `cd apps/web && npm test -- components/r3f/roadGeometry.test.ts`.
- [ ] Commit: `git add apps/web/components/r3f/roadGeometry.ts apps/web/components/r3f/roadGeometry.test.ts && git commit -m "feat(r3f): add 강남대로 median bus-lane surface markings (data only)"`

---

### Task A4: `getInboundLaneOffset` — per-approach asymmetric counts + median-bus innermost lane

Files:
- Modify `apps/web/components/r3f/TrafficDensityLayer.tsx` (imports 39–45; `INBOUND_LANE_VISUAL_BIAS_METERS` line 120; `getLaneAlignedPreciseVehiclePosition` 1378–1382; `resolvePreciseVehicleLanePlacement` 1500; `buildFixtureQueueVehicles` laneCount 1574; `getInboundLaneOffset` 1892–1904)
- Modify `apps/web/components/r3f/TrafficDensityLayer.test.ts`

Interfaces:
- Consumes: `getApproachInboundLaneCount` from `./intersectionTruth`; LANE-ID naming contract (`parseLaneDirection`/`parseLaneIndex` unchanged); `LANE_WIDTH_METERS`.
- Produces: `getInboundLaneOffset(direction, laneIndex, laneCount): number` (signature preserved, now exported for direct unit tests); inbound lanes laid out on the right-hand half measured outward from the median, so the highest index (= median bus lane on N/S) sits 0.5 lane-width off the centerline.

Steps:

- [ ] Edit `TrafficDensityLayer.test.ts` — update the one assertion that encoded the legacy bias, and add an all-approach offset suite. Change lines 49–51:
```ts
    expect(plan.preciseVehicles[0].position[2]).toBeCloseTo(
      -(5 - 1 - 0.5) * LANE_WIDTH_METERS // east_in_1 with 5 inbound lanes → -12.6
    );
```
  Add a new import line near the top: `import { getInboundLaneOffset } from "./TrafficDensityLayer";` and a new describe block:
```ts
describe("getInboundLaneOffset per-approach asymmetric lanes", () => {
  test("lays inbound lanes outward from the median on the right-hand side", () => {
    // index 0 = right curb (farthest from median), index laneCount-1 = median-adjacent.
    expect(getInboundLaneOffset("north", 0, 5)).toBeCloseTo(-16.2, 6);
    expect(getInboundLaneOffset("north", 4, 5)).toBeCloseTo(-1.8, 6);
    expect(getInboundLaneOffset("south", 4, 5)).toBeCloseTo(1.8, 6);
    expect(getInboundLaneOffset("east", 1, 5)).toBeCloseTo(-12.6, 6);
  });

  test("honors 서초대로's narrower 4-lane inbound group", () => {
    expect(getInboundLaneOffset("west", 0, 4)).toBeCloseTo(12.6, 6);
    expect(getInboundLaneOffset("west", 3, 4)).toBeCloseTo(1.8, 6);
  });

  test("median bus lane (강남대로 innermost inbound) sits half a lane off center", () => {
    expect(Math.abs(getInboundLaneOffset("north", 4, 5))).toBeCloseTo(
      LANE_WIDTH_METERS / 2,
      6
    );
    expect(Math.abs(getInboundLaneOffset("south", 4, 5))).toBeCloseTo(
      LANE_WIDTH_METERS / 2,
      6
    );
  });
});
```
- [ ] Run (expect FAIL — `getInboundLaneOffset` not exported / old value -1.62): `cd apps/web && npm test -- components/r3f/TrafficDensityLayer.test.ts`.
- [ ] Impl — update imports (`TrafficDensityLayer.tsx:39–45`): drop `INBOUND_LANE_COUNT` from the `./roadGeometry` import list, and add:
```ts
import { getApproachInboundLaneCount } from "./intersectionTruth";
```
- [ ] Impl — delete `INBOUND_LANE_VISUAL_BIAS_METERS` (line 120, now unused) and rewrite `getInboundLaneOffset` (1892–1904), exporting it:
```ts
// Inbound lanes occupy the right-hand half of the carriageway, measured outward
// from the median. laneIndex follows SUMO numbering (0 = right curb, laneCount-1
// = median-adjacent), so the median bus lane on 강남대로 lands 0.5 lane off center.
export function getInboundLaneOffset(
  direction: Direction,
  laneIndex: number,
  laneCount: number
) {
  const inboundSide =
    direction === "north" || direction === "east" ? -1 : 1;
  const distanceFromMedian =
    (laneCount - laneIndex - 0.5) * LANE_WIDTH_METERS;

  return inboundSide * distanceFromMedian;
}
```
- [ ] Impl — make the clamp and the precise-placement laneCount per-approach. `resolvePreciseVehicleLanePlacement` (line 1500):
```ts
    laneIndex: clamp(
      laneIndex,
      0,
      getApproachInboundLaneCount(laneDirection) - 1
    )
```
  `getLaneAlignedPreciseVehiclePosition` (lines 1378–1382):
```ts
  const laneOffset = getInboundLaneOffset(
    lanePlacement.direction,
    lanePlacement.laneIndex,
    getApproachInboundLaneCount(lanePlacement.direction)
  );
```
  `buildFixtureQueueVehicles` (line 1574): `const laneCount = getApproachInboundLaneCount(direction);`
  (Leave the `density_segments` clamp at line 1635 as-is — density segments are not approach-keyed; noted as out of scope.)
- [ ] Run (expect PASS): `cd apps/web && npm test -- components/r3f/TrafficDensityLayer.test.ts`.
- [ ] Commit: `git add apps/web/components/r3f/TrafficDensityLayer.tsx apps/web/components/r3f/TrafficDensityLayer.test.ts && git commit -m "feat(r3f): per-approach inbound lane offsets with 강남대로 median bus lane"`

---

### Task A5: Camera recalibration for the enlarged box (STAGE5 + plate angles)

Files:
- Modify `apps/web/components/r3f/roadGeometry.ts` (`STAGE5_CAMERA` 64–70)
- Modify `apps/web/components/r3f/plateCameraCalibration.ts` (`operator-cctv` 26–29)
- Modify `apps/web/components/r3f/plateCameraCalibration.test.ts`

Interfaces:
- Consumes: `STAGE5_CAMERA` is shared by `STAGE5_TALL_VIEWPORT_CAMERA` (near/far refs) and `PLATE_CAMERA_ANGLES[0]` (operator-wide = `STAGE5_CAMERA` position/target/fov). LOCKED envelope from existing non-Section-A tests that must stay green: `SimulationCanvas.test.tsx` (`|camX−tgtX|∈[18,34]`, `camY≤86 & >62`, elevation∈(24,34)°, fov≥46, `|tgtX|≤8`, `tgtZ∈[−36,−18]`, tall-viewport horizontal distance `< desktop*0.55`, tall fov≥74, tall tgtZ≥−12) and `DashboardShell.test.tsx` (`STAGE5_CAMERA.position[1] < position[2]`).
- Produces: enlarged-box framing within that envelope; recalibrated `operator-cctv` pole view.

Steps:

- [ ] Edit `plateCameraCalibration.test.ts` — add a guard for the recalibrated CCTV angle (operator-wide stays asserted against `STAGE5_CAMERA` by the existing test, which auto-tracks the new value):
```ts
  it("keeps the operator-cctv angle as a low oblique pole view of the box", () => {
    const wide = getPlateCameraAngle("operator-wide");
    const cctv = getPlateCameraAngle("operator-cctv");
    const horiz = Math.hypot(
      cctv.position[0] - cctv.target[0],
      cctv.position[2] - cctv.target[2]
    );
    const elevationDeg =
      Math.atan2(cctv.position[1] - cctv.target[1], horiz) * (180 / Math.PI);
    expect(cctv.position[1]).toBeLessThan(wide.position[1]); // lower than the wide cam
    expect(elevationDeg).toBeLessThan(22); // pole-mounted, signals readable
    expect(cctv.fovDegrees).toBe(50);
  });
```
- [ ] Run (expect FAIL — new test references current values; confirm it currently passes/fails, then drive the recalibration): `cd apps/web && npm test -- components/r3f/plateCameraCalibration.test.ts`. (Current cctv elevation ≈ atan2(17, hypot(38,52)) ≈ 15.1° already <22, fov 50; this test passes pre-change — it locks behavior so the recalibration below stays valid.)
- [ ] Impl — recalibrate `STAGE5_CAMERA` (`roadGeometry.ts:64–70`) to frame the slightly larger (36 vs 32) box, staying inside the envelope:
```ts
export const STAGE5_CAMERA = {
  position: [26, 82, 116] as Vector3Tuple,
  target: [0, 0, -34] as Vector3Tuple,
  fov: 50,
  near: 0.1,
  far: 520
} as const;
```
  Verification math (must hold): `|26−0|=26∈[18,34]`; `camY 82≤86 & >62`; horizontal `hypot(26, 116−(−34))=152.2`, elevation `atan2(82,152.2)=28.3°∈(24,34)`; fov 50≥46; `|tgtX|=0≤8`; `tgtZ −34∈[−36,−18]`; `82<116`; tall-cam horizontal `hypot(0,52−(−8))=60 < 152.2*0.55=83.7`. `operator-wide` and `STAGE5_TALL_VIEWPORT_CAMERA` track these refs automatically.
- [ ] Impl — recalibrate `operator-cctv` (`plateCameraCalibration.ts:26–29`) to pull back with the larger box while keeping the low pole angle:
```ts
  {
    id: "operator-cctv",
    position: [38, 20, 44],
    target: [-4, 1, -14],
    fovDegrees: 50
  }
```
- [ ] Run (expect PASS): `cd apps/web && npm test -- components/r3f/plateCameraCalibration.test.ts components/r3f/SimulationCanvas.test.tsx components/DashboardShell.test.tsx`.
- [ ] Commit: `git add apps/web/components/r3f/roadGeometry.ts apps/web/components/r3f/plateCameraCalibration.ts apps/web/components/r3f/plateCameraCalibration.test.ts && git commit -m "feat(r3f): reframe STAGE5 + plate cameras for enlarged Gangnam box"`

---

### Task A6: Section-A full validation

Files: none (validation only).

Steps:
- [ ] Run the whole web suite to confirm no consumer regressed (`ApproachCorridors`, `LightingRig`, `WetRoadReflectors`, `WeatherAndAtmosphere`, `ProceduralIntersection`, `plateProxyGeometry`, `DashboardShell`, `SimulationCanvas`): `cd apps/web && npm test`.
- [ ] Typecheck the package (build is Next-specific; prefer the project's tsc if present, else `npx tsc --noEmit`): `cd apps/web && npx tsc --noEmit`.
- [ ] If any consumer visual offset shifted unacceptably (streetlights/reflectors now keyed to 36 m vs 18 m `ROAD_WIDTH_METERS`), report it to the primary agent — those components are outside Section A scope and may need a follow-up task; do not silently refactor them here.
- [ ] No commit (validation only); report results.


# Section B — SUMO network rebuild

## Section B — SUMO Network Rebuild (single real 4-way Gangnam Station junction)

### Grounding (read before executing)
- The current `apps/api/networks/intersection.net.xml` is a `netgenerate` 2×2 grid loop (junctions `A0/A1/B0/B1`, 1-lane edges, routes `clockwise`/`counter_clockwise`). `rg` confirms **no code outside `apps/api/networks/` references the old edge IDs or route names**, so replacing them is safe. The only test that touches these files is `test_committed_sumo_network_fixture_files_exist` (just asserts the 3 files exist) — it keeps passing.
- `netconvert`, `sumo`, and `sumolib` are **not** on the system PATH but are provided by the `simulation` optional dependency (`eclipse-sumo>=1.27.0`, `sumolib>=1.27.0`, `traci>=1.27.0` in `pyproject.toml`). `runtime_readiness._binary_available` already resolves binaries from the venv `bin/` dir, so they are reachable via `uv run --extra simulation`.
- `pytest` is in the `dev` extra. **All `pytest` commands below run as `uv run --extra dev pytest …` from `apps/api`** (confirmed working). The one `sumolib`-based test (B4) runs as `uv run --extra simulation --extra dev pytest …`; in an env without the `simulation` extra it `pytest.importorskip`-skips rather than failing.
- **SSOT mechanism chosen (state it once):** `apps/api/networks/intersection_truth.json` is the **Python/SUMO half of the single source of truth**, mirroring the TS `apps/web/components/r3f/intersectionTruth.ts` `INTERSECTION_TRUTH`. The hand-authored plain-XML inputs are **validated against this JSON by tests** (no lane counts/widths duplicated as unchecked magic numbers). The `.net.xml` is rebuilt from those inputs via `netconvert`. I did **not** add a runtime generator or make the bridge read the JSON, because the bridge keys on lane-ID words (`_approach_from_lane_id`), not counts — adding that wiring would be out of scope.
- **Commit convention:** every `git commit` below also appends the two trailers (shown once here, applied to all): `-m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01BVTPmSqzERB4XRuUPD9L5M"`.

### Coordinate / lane conventions committed by this section
- SUMO axes: `x = east`, `y = north`. Scene mapping (from contract): `scene_x = sumo_x`, `scene_z = -sumo_y`, north = `-z`. Therefore the **north** approach end sits at `+y` in SUMO, **south** at `-y`, **east** at `+x`, **west** at `-x`. Node distances use TS `CORRIDOR_LENGTH_METERS` (north 140 / south 120 / east 140 / west 140).
- SUMO lane index `0` = **rightmost / curb side**; highest index = **innermost / median side**. The median bus-only lane on 강남대로 is therefore the **highest-index** lane (`*_in_4` / `*_out_4`). Section A/C `getInboundLaneOffset` must treat the highest index as nearest the centerline.

---

### Task B1: Python/SUMO SSOT mirror `intersection_truth.json`

Files:
- Create `apps/api/networks/intersection_truth.json`
- Create `apps/api/tests/test_intersection_truth.py`

Interfaces:
- Produces: `apps/api/networks/intersection_truth.json` with shape `{ laneWidthM: number, approaches: Record<"north"|"south"|"east"|"west", { approach, road, inboundLanes, outboundLanes, hasMedianBus, laneWidthM, corridorLengthM, hasCrosswalk }> }` — the SAME fields as the TS `ApproachTruth` (`INTERSECTION_TRUTH`).
- Consumes: VERIFIED REAL LAYOUT lane counts (north/south/east 5+5, west 4+4), median bus on 강남대로 only, no N/S surface crosswalk; TS `CORRIDOR_LENGTH_METERS`.

Steps:
- [ ] Write failing test `apps/api/tests/test_intersection_truth.py`:
```python
import json
from pathlib import Path

TRUTH = Path(__file__).resolve().parents[1] / "networks" / "intersection_truth.json"


def _data() -> dict:
    return json.loads(TRUTH.read_text(encoding="utf-8"))


def test_intersection_truth_mirrors_real_gangnam_layout() -> None:
    data = _data()
    assert data["laneWidthM"] == 3.6
    a = data["approaches"]
    assert (a["north"]["inboundLanes"], a["north"]["outboundLanes"]) == (5, 5)
    assert (a["south"]["inboundLanes"], a["south"]["outboundLanes"]) == (5, 5)
    assert (a["east"]["inboundLanes"], a["east"]["outboundLanes"]) == (5, 5)
    assert (a["west"]["inboundLanes"], a["west"]["outboundLanes"]) == (4, 4)


def test_median_bus_only_on_gangnamdaero() -> None:
    a = _data()["approaches"]
    assert a["north"]["hasMedianBus"] is True
    assert a["south"]["hasMedianBus"] is True
    assert a["east"]["hasMedianBus"] is False
    assert a["west"]["hasMedianBus"] is False


def test_no_surface_crosswalk_across_gangnamdaero() -> None:
    a = _data()["approaches"]
    assert a["north"]["hasCrosswalk"] is False
    assert a["south"]["hasCrosswalk"] is False
    assert a["east"]["hasCrosswalk"] is True
    assert a["west"]["hasCrosswalk"] is True


def test_roads_and_corridor_lengths_match_ts_truth() -> None:
    a = _data()["approaches"]
    assert a["north"]["road"] == "강남대로"
    assert a["south"]["road"] == "강남대로"
    assert a["east"]["road"] == "테헤란로"
    assert a["west"]["road"] == "서초대로"
    assert a["north"]["corridorLengthM"] == 140
    assert a["south"]["corridorLengthM"] == 120
    assert a["east"]["corridorLengthM"] == 140
    assert a["west"]["corridorLengthM"] == 140
```
- [ ] Run (expected **FAIL** — file missing): `cd apps/api && uv run --extra dev pytest tests/test_intersection_truth.py -q`
- [ ] Create `apps/api/networks/intersection_truth.json`:
```json
{
  "_comment": "Python/SUMO half of the single source of truth. Mirrors apps/web/components/r3f/intersectionTruth.ts INTERSECTION_TRUTH; keep values identical. Consumed by the gangnam.*.xml authoring/validation tests; the .net.xml is built from those inputs via netconvert. Do not duplicate these magic numbers elsewhere.",
  "laneWidthM": 3.6,
  "approaches": {
    "north": {"approach": "north", "road": "강남대로", "inboundLanes": 5, "outboundLanes": 5, "hasMedianBus": true, "laneWidthM": 3.6, "corridorLengthM": 140, "hasCrosswalk": false},
    "south": {"approach": "south", "road": "강남대로", "inboundLanes": 5, "outboundLanes": 5, "hasMedianBus": true, "laneWidthM": 3.6, "corridorLengthM": 120, "hasCrosswalk": false},
    "east":  {"approach": "east",  "road": "테헤란로", "inboundLanes": 5, "outboundLanes": 5, "hasMedianBus": false, "laneWidthM": 3.6, "corridorLengthM": 140, "hasCrosswalk": true},
    "west":  {"approach": "west",  "road": "서초대로", "inboundLanes": 4, "outboundLanes": 4, "hasMedianBus": false, "laneWidthM": 3.6, "corridorLengthM": 140, "hasCrosswalk": true}
  }
}
```
- [ ] Run (expected **PASS**): `cd apps/api && uv run --extra dev pytest tests/test_intersection_truth.py -q`
- [ ] Commit: `git add apps/api/networks/intersection_truth.json apps/api/tests/test_intersection_truth.py && git commit -m "feat(sumo): add intersection_truth.json SSOT mirror for Gangnam layout"` (+ trailers)

---

### Task B2: Author nodes + edges (`gangnam.nod.xml`, `gangnam.edg.xml`)

Files:
- Create `apps/api/networks/gangnam.nod.xml`
- Create `apps/api/networks/gangnam.edg.xml`
- Create `apps/api/tests/test_gangnam_network_inputs.py`

Interfaces:
- Produces nodes `center`(0,0, `traffic_light`, `tl="gangnam_center"`), `north_end`(0,140), `south_end`(0,-120), `east_end`(140,0), `west_end`(-140,0); 8 directional edges `north_in/north_out/south_in/south_out/east_in/east_out/west_in/west_out` with `numLanes` 5/5/5/5/5/5/4/4, median bus lane (`allow="bus"`) at the innermost index on 강남대로 in/out only.
- Consumes: `intersection_truth.json` (B1); COORDINATE CONTRACT; LANE-ID NAMING CONTRACT.

Steps:
- [ ] Write failing test `apps/api/tests/test_gangnam_network_inputs.py`:
```python
import json
import xml.etree.ElementTree as ET
from pathlib import Path

NET_DIR = Path(__file__).resolve().parents[1] / "networks"


def _truth() -> dict:
    return json.loads((NET_DIR / "intersection_truth.json").read_text(encoding="utf-8"))["approaches"]


def _edges() -> dict[str, ET.Element]:
    root = ET.parse(NET_DIR / "gangnam.edg.xml").getroot()
    return {e.get("id"): e for e in root.findall("edge")}


def test_nodes_follow_coordinate_contract() -> None:
    nodes = {n.get("id"): n for n in ET.parse(NET_DIR / "gangnam.nod.xml").getroot().findall("node")}
    assert (float(nodes["center"].get("x")), float(nodes["center"].get("y"))) == (0.0, 0.0)
    assert nodes["center"].get("type") == "traffic_light"
    assert nodes["center"].get("tl") == "gangnam_center"
    # north = -z scene = +y SUMO; south = -y; east = +x; west = -x
    assert float(nodes["north_end"].get("y")) > 0
    assert float(nodes["south_end"].get("y")) < 0
    assert float(nodes["east_end"].get("x")) > 0
    assert float(nodes["west_end"].get("x")) < 0


def test_edges_match_truth_lane_counts() -> None:
    truth, edges = _truth(), _edges()
    for approach, spec in truth.items():
        assert int(edges[f"{approach}_in"].get("numLanes")) == spec["inboundLanes"]
        assert int(edges[f"{approach}_out"].get("numLanes")) == spec["outboundLanes"]


def test_median_bus_lane_innermost_on_gangnamdaero_only() -> None:
    truth, edges = _truth(), _edges()
    for approach, spec in truth.items():
        for suffix in ("in", "out"):
            edge = edges[f"{approach}_{suffix}"]
            bus_lanes = [lane for lane in edge.findall("lane") if lane.get("allow") == "bus"]
            if spec["hasMedianBus"]:
                assert len(bus_lanes) == 1
                assert int(bus_lanes[0].get("index")) == spec["inboundLanes"] - 1
            else:
                assert bus_lanes == []
```
- [ ] Run (expected **FAIL** — files missing): `cd apps/api && uv run --extra dev pytest tests/test_gangnam_network_inputs.py -q`
- [ ] Create `apps/api/networks/gangnam.nod.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<nodes>
  <node id="center"    x="0.0"    y="0.0"    type="traffic_light" tl="gangnam_center"/>
  <node id="north_end" x="0.0"    y="140.0"  type="priority"/>
  <node id="south_end" x="0.0"    y="-120.0" type="priority"/>
  <node id="east_end"  x="140.0"  y="0.0"    type="priority"/>
  <node id="west_end"  x="-140.0" y="0.0"    type="priority"/>
</nodes>
```
- [ ] Create `apps/api/networks/gangnam.edg.xml` (lane width comes from `--default.lanewidth 3.6` at build time; bus lane = innermost = highest index on 강남대로 only):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<edges>
  <!-- 강남대로 N-S arterial: 5 in / 5 out, innermost lane (index 4) = median bus-only -->
  <edge id="north_in"  from="north_end" to="center"    numLanes="5" speed="16.67">
    <lane index="4" allow="bus"/>
  </edge>
  <edge id="north_out" from="center"    to="north_end" numLanes="5" speed="16.67">
    <lane index="4" allow="bus"/>
  </edge>
  <edge id="south_in"  from="south_end" to="center"    numLanes="5" speed="16.67">
    <lane index="4" allow="bus"/>
  </edge>
  <edge id="south_out" from="center"    to="south_end" numLanes="5" speed="16.67">
    <lane index="4" allow="bus"/>
  </edge>

  <!-- 테헤란로 east leg: 5 in / 5 out, no median bus -->
  <edge id="east_in"  from="east_end" to="center"   numLanes="5" speed="16.67"/>
  <edge id="east_out" from="center"   to="east_end" numLanes="5" speed="16.67"/>

  <!-- 서초대로 west leg (only narrow leg): 4 in / 4 out, no median bus -->
  <edge id="west_in"  from="west_end" to="center"   numLanes="4" speed="16.67"/>
  <edge id="west_out" from="center"   to="west_end" numLanes="4" speed="16.67"/>
</edges>
```
- [ ] Run (expected **PASS**): `cd apps/api && uv run --extra dev pytest tests/test_gangnam_network_inputs.py -q`
- [ ] Commit: `git add apps/api/networks/gangnam.nod.xml apps/api/networks/gangnam.edg.xml apps/api/tests/test_gangnam_network_inputs.py && git commit -m "feat(sumo): author Gangnam nodes + directional edges with median bus lanes"` (+ trailers)

---

### Task B3: Author connections + TLS (`gangnam.con.xml`, `gangnam.tll.xml`)

Files:
- Create `apps/api/networks/gangnam.con.xml`
- Create `apps/api/networks/gangnam.tll.xml`
- Create `apps/api/tests/test_gangnam_connections_tls.py`

Interfaces:
- Produces 19 turn connections and an 8-link signal scheme: linkIndex `0`=north through+right, `1`=east through+right, `2`=south through+right, `3`=west through+right, `4`=north left, `5`=east left, `6`=south left, `7`=west left. Because the through groups occupy indices 0–3 in N,E,S,W order, the **first 4 chars** of the TLS state map exactly to `TLS_DIRECTION_ORDER=(north,east,south,west)` consumed by `_map_signals` (`sumo_runtime.py:541`). 8-phase protected-left program on `tlLogic id="gangnam_center"`.
- Consumes: edge IDs from B2; `TLS_DIRECTION_ORDER` (`sumo_runtime.py:31`); `_map_signals` zip-against-state contract.

Steps:
- [ ] Write failing test `apps/api/tests/test_gangnam_connections_tls.py`:
```python
import xml.etree.ElementTree as ET
from pathlib import Path

NET_DIR = Path(__file__).resolve().parents[1] / "networks"


def _connections() -> list[ET.Element]:
    return ET.parse(NET_DIR / "gangnam.con.xml").getroot().findall("connection")


def test_through_link_indices_follow_tls_direction_order() -> None:
    # TLS_DIRECTION_ORDER = (north, east, south, west) -> through groups 0,1,2,3
    through = {
        ("north_in", "south_out"): 0,
        ("east_in", "west_out"): 1,
        ("south_in", "north_out"): 2,
        ("west_in", "east_out"): 3,
    }
    seen = set()
    for c in _connections():
        key = (c.get("from"), c.get("to"))
        if key in through:
            assert int(c.get("linkIndex")) == through[key], key
            seen.add(key)
    assert seen == set(through)


def test_left_turns_use_protected_indices_4_to_7() -> None:
    left = {
        ("north_in", "east_out"): 4,
        ("east_in", "south_out"): 5,
        ("south_in", "west_out"): 6,
        ("west_in", "north_out"): 7,
    }
    seen = set()
    for c in _connections():
        key = (c.get("from"), c.get("to"))
        if key in left:
            assert int(c.get("linkIndex")) == left[key], key
            seen.add(key)
    assert seen == set(left)


def test_no_general_traffic_enters_gangnamdaero_bus_outbound_lane() -> None:
    # only the bus-through (fromLane 4) may feed the innermost (index 4) outbound bus lane
    for c in _connections():
        if c.get("to") in ("north_out", "south_out") and c.get("toLane") == "4":
            assert c.get("fromLane") == "4", (c.get("from"), c.get("to"))


def test_every_inbound_lane_has_a_connection() -> None:
    counts = {"north_in": 5, "east_in": 5, "south_in": 5, "west_in": 4}
    by_edge: dict[str, set[str]] = {edge: set() for edge in counts}
    for c in _connections():
        if c.get("from") in by_edge:
            by_edge[c.get("from")].add(c.get("fromLane"))
    for edge, n in counts.items():
        assert by_edge[edge] == {str(i) for i in range(n)}, edge


def test_tls_is_eight_phase_protected_left() -> None:
    logic = ET.parse(NET_DIR / "gangnam.tll.xml").getroot().find("tlLogic")
    assert logic.get("id") == "gangnam_center"
    phases = logic.findall("phase")
    assert len(phases) == 8
    for p in phases:
        assert len(p.get("state")) == 8
    ns = phases[0].get("state")   # NS through green
    assert ns[0] == "G" and ns[2] == "G" and ns[1] == "r" and ns[3] == "r"
    ew = phases[4].get("state")   # EW through green
    assert ew[1] == "G" and ew[3] == "G" and ew[0] == "r" and ew[2] == "r"
```
- [ ] Run (expected **FAIL** — files missing): `cd apps/api && uv run --extra dev pytest tests/test_gangnam_connections_tls.py -q`
- [ ] Create `apps/api/networks/gangnam.con.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<connections>
  <!-- NORTH (강남대로, lane 4 = median bus): linkIndex 0 = through+right, 4 = protected left -->
  <connection from="north_in" to="west_out"  fromLane="0" toLane="0" linkIndex="0"/>
  <connection from="north_in" to="south_out" fromLane="1" toLane="1" linkIndex="0"/>
  <connection from="north_in" to="south_out" fromLane="2" toLane="2" linkIndex="0"/>
  <connection from="north_in" to="south_out" fromLane="4" toLane="4" linkIndex="0"/>
  <connection from="north_in" to="east_out"  fromLane="3" toLane="3" linkIndex="4"/>

  <!-- EAST (테헤란로): linkIndex 1 = through+right, 5 = protected left -->
  <connection from="east_in" to="north_out" fromLane="0" toLane="0" linkIndex="1"/>
  <connection from="east_in" to="west_out"  fromLane="1" toLane="1" linkIndex="1"/>
  <connection from="east_in" to="west_out"  fromLane="2" toLane="2" linkIndex="1"/>
  <connection from="east_in" to="west_out"  fromLane="3" toLane="3" linkIndex="1"/>
  <connection from="east_in" to="south_out" fromLane="4" toLane="3" linkIndex="5"/>

  <!-- SOUTH (강남대로, lane 4 = median bus): linkIndex 2 = through+right, 6 = protected left -->
  <connection from="south_in" to="east_out"  fromLane="0" toLane="0" linkIndex="2"/>
  <connection from="south_in" to="north_out" fromLane="1" toLane="1" linkIndex="2"/>
  <connection from="south_in" to="north_out" fromLane="2" toLane="2" linkIndex="2"/>
  <connection from="south_in" to="north_out" fromLane="4" toLane="4" linkIndex="2"/>
  <connection from="south_in" to="west_out"  fromLane="3" toLane="3" linkIndex="6"/>

  <!-- WEST (서초대로, 4 lanes): linkIndex 3 = through+right, 7 = protected left -->
  <connection from="west_in" to="south_out" fromLane="0" toLane="0" linkIndex="3"/>
  <connection from="west_in" to="east_out"  fromLane="1" toLane="1" linkIndex="3"/>
  <connection from="west_in" to="east_out"  fromLane="2" toLane="2" linkIndex="3"/>
  <connection from="west_in" to="north_out" fromLane="3" toLane="3" linkIndex="7"/>
</connections>
```
- [ ] Create `apps/api/networks/gangnam.tll.xml` (state positions: `[0]=N_thru [1]=E_thru [2]=S_thru [3]=W_thru [4]=N_left [5]=E_left [6]=S_left [7]=W_left`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<tlLogics>
  <tlLogic id="gangnam_center" type="static" programID="0" offset="0">
    <phase duration="33" state="GrGrrrrr"/>  <!-- NS through+right -->
    <phase duration="4"  state="yryrrrrr"/>  <!-- NS through clearance -->
    <phase duration="12" state="rrrrGrGr"/>  <!-- NS protected left -->
    <phase duration="4"  state="rrrryryr"/>  <!-- NS left clearance -->
    <phase duration="33" state="rGrGrrrr"/>  <!-- EW through+right -->
    <phase duration="4"  state="ryryrrrr"/>  <!-- EW through clearance -->
    <phase duration="12" state="rrrrrGrG"/>  <!-- EW protected left -->
    <phase duration="4"  state="rrrrryry"/>  <!-- EW left clearance -->
  </tlLogic>
</tlLogics>
```
- [ ] Run (expected **PASS**): `cd apps/api && uv run --extra dev pytest tests/test_gangnam_connections_tls.py -q`
- [ ] Commit: `git add apps/api/networks/gangnam.con.xml apps/api/networks/gangnam.tll.xml apps/api/tests/test_gangnam_connections_tls.py && git commit -m "feat(sumo): author Gangnam turn connections + protected-left TLS (N,E,S,W link order)"` (+ trailers)

---

### Task B4: Build `intersection.net.xml` via netconvert + sumolib structure test

Files:
- Modify (regenerate) `apps/api/networks/intersection.net.xml` (replace 2×2 grid — built by `netconvert`, never hand-edited)
- Create `apps/api/tests/test_gangnam_net_build.py`

Interfaces:
- Consumes `gangnam.nod.xml` / `gangnam.edg.xml` / `gangnam.con.xml` / `gangnam.tll.xml` (B2, B3) and `--default.lanewidth 3.6`.
- Produces `intersection.net.xml` with lanes `north_in_0..north_in_4` style, 5/5/5/4 inbound lane counts, bus `vClass` on 강남대로 innermost lanes, TLS `gangnam_center`.

Steps:
- [ ] Write failing test `apps/api/tests/test_gangnam_net_build.py` (skips cleanly where the `simulation` extra / `sumolib` is absent):
```python
from pathlib import Path

import pytest

sumolib = pytest.importorskip("sumolib")

NET = Path(__file__).resolve().parents[1] / "networks" / "intersection.net.xml"


def _net():
    return sumolib.net.readNet(str(NET))


def test_net_has_four_real_gangnam_approaches() -> None:
    edge_ids = {e.getID() for e in _net().getEdges()}
    for approach in ("north", "south", "east", "west"):
        assert f"{approach}_in" in edge_ids
        assert f"{approach}_out" in edge_ids


def test_inbound_lane_counts_match_real_layout() -> None:
    net = _net()
    assert net.getEdge("north_in").getLaneNumber() == 5
    assert net.getEdge("south_in").getLaneNumber() == 5
    assert net.getEdge("east_in").getLaneNumber() == 5
    assert net.getEdge("west_in").getLaneNumber() == 4


def test_lane_ids_carry_approach_word() -> None:
    lane_ids = [lane.getID() for lane in _net().getEdge("north_in").getLanes()]
    assert lane_ids[0] == "north_in_0"
    assert lane_ids[4] == "north_in_4"


def test_median_bus_lane_on_gangnamdaero_only() -> None:
    net = _net()
    for edge_id in ("north_in", "north_out", "south_in", "south_out"):
        bus_lane = net.getEdge(edge_id).getLane(4)  # innermost
        assert bus_lane.allows("bus")
        assert not bus_lane.allows("passenger")
    for edge_id in ("east_in", "west_in"):
        for lane in net.getEdge(edge_id).getLanes():
            assert lane.allows("passenger")


def test_traffic_light_exists() -> None:
    tls_ids = {tls.getID() for tls in _net().getTrafficLights()}
    assert "gangnam_center" in tls_ids
```
- [ ] Run (expected **FAIL** in a `simulation`-enabled env — `intersection.net.xml` is still the grid; lane counts/edge IDs mismatch. Where `sumolib` is absent it SKIPS): `cd apps/api && uv run --extra simulation --extra dev pytest tests/test_gangnam_net_build.py -q`
- [ ] Build the network (single command; `--offset.disable-normalization true` keeps the authored center node at 0,0; `--default.lanewidth 3.6` applies the 3.6 m width to every lane; `--no-turnarounds true` matches the original config intent):
```
cd apps/api && uv run --extra simulation netconvert \
  --node-files networks/gangnam.nod.xml \
  --edge-files networks/gangnam.edg.xml \
  --connection-files networks/gangnam.con.xml \
  --tllogic-files networks/gangnam.tll.xml \
  --output-file networks/intersection.net.xml \
  --default.lanewidth 3.6 \
  --offset.disable-normalization true \
  --no-turnarounds true
```
- [ ] Run (expected **PASS**): `cd apps/api && uv run --extra simulation --extra dev pytest tests/test_gangnam_net_build.py -q`
- [ ] Sanity-check the legacy test still passes (files still exist): `cd apps/api && uv run --extra dev pytest tests/test_runtime_readiness.py::test_committed_sumo_network_fixture_files_exist -q`
- [ ] Commit: `git add apps/api/networks/intersection.net.xml apps/api/tests/test_gangnam_net_build.py && git commit -m "feat(sumo): build real Gangnam 4-way intersection.net.xml via netconvert"` (+ trailers)

---

### Task B5: Replace routes (`intersection.rou.xml`) + headless sumo validation

Files:
- Modify `apps/api/networks/intersection.rou.xml` (replace grid `clockwise`/`counter_clockwise` routes)
- Create `apps/api/tests/test_gangnam_routes.py`

Interfaces:
- Consumes new edge IDs from B2/B4. Produces `vType` `passenger`/`bus`/`emergency`, routes traversing the junction (inbound→outbound) for through, left and right movements, plus flows. `.sumocfg` is unchanged (already points at `intersection.net.xml` + `intersection.rou.xml`).

Steps:
- [ ] Write failing test `apps/api/tests/test_gangnam_routes.py`:
```python
import xml.etree.ElementTree as ET
from pathlib import Path

NET_DIR = Path(__file__).resolve().parents[1] / "networks"
VALID_EDGES = {f"{a}_{d}" for a in ("north", "south", "east", "west") for d in ("in", "out")}


def _root() -> ET.Element:
    return ET.parse(NET_DIR / "intersection.rou.xml").getroot()


def test_routes_traverse_junction_with_new_edge_ids() -> None:
    routes = _root().findall("route")
    assert routes
    for r in routes:
        edges = r.get("edges").split()
        assert all(e in VALID_EDGES for e in edges), r.get("id")
        assert edges[0].endswith("_in") and edges[-1].endswith("_out"), r.get("id")


def test_vtypes_define_passenger_bus_emergency() -> None:
    vtypes = {v.get("id"): v.get("vClass") for v in _root().findall("vType")}
    assert vtypes["passenger"] == "passenger"
    assert vtypes["bus"] == "bus"
    assert vtypes["emergency"] == "emergency"


def test_no_legacy_grid_routes_remain() -> None:
    text = (NET_DIR / "intersection.rou.xml").read_text(encoding="utf-8")
    for legacy in ("clockwise", "counter_clockwise", "A0A1", "A1B1", "B0A0", "B1B0"):
        assert legacy not in text
```
- [ ] Run (expected **FAIL** — current file still has grid routes/edges): `cd apps/api && uv run --extra dev pytest tests/test_gangnam_routes.py -q`
- [ ] Overwrite `apps/api/networks/intersection.rou.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<routes xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/routes_file.xsd">
    <vType id="passenger" vClass="passenger" accel="2.6" decel="4.5" sigma="0.5" length="5.0" maxSpeed="13.89"/>
    <vType id="bus" vClass="bus" accel="1.2" decel="4.0" sigma="0.5" length="12.0" maxSpeed="13.89"/>
    <vType id="emergency" vClass="emergency" accel="3.0" decel="5.0" sigma="0.2" length="6.0" maxSpeed="16.67"/>

    <route id="north_through" edges="north_in south_out"/>
    <route id="south_through" edges="south_in north_out"/>
    <route id="east_through"  edges="east_in west_out"/>
    <route id="west_through"  edges="west_in east_out"/>
    <route id="north_left"    edges="north_in east_out"/>
    <route id="north_right"   edges="north_in west_out"/>
    <route id="east_left"     edges="east_in south_out"/>
    <route id="west_right"    edges="west_in south_out"/>

    <flow id="flow_north_through" type="passenger" route="north_through" begin="0" end="300" period="6"/>
    <flow id="flow_south_through" type="passenger" route="south_through" begin="0" end="300" period="6"/>
    <flow id="flow_east_through"  type="passenger" route="east_through"  begin="0" end="300" period="7"/>
    <flow id="flow_west_through"  type="passenger" route="west_through"  begin="0" end="300" period="8"/>
    <flow id="flow_bus_gangnam"   type="bus"       route="north_through" begin="0" end="300" period="40" departLane="4"/>

    <vehicle id="emergency-east-1" type="emergency" route="east_through" depart="0"/>
    <vehicle id="car-north-left-1" type="passenger" route="north_left"  depart="3"/>
    <vehicle id="car-north-right-1" type="passenger" route="north_right" depart="5"/>
    <vehicle id="car-west-right-1" type="passenger" route="west_right"   depart="7"/>
</routes>
```
- [ ] Run (expected **PASS**): `cd apps/api && uv run --extra dev pytest tests/test_gangnam_routes.py -q`
- [ ] Headless one-step SUMO validation of the full net+routes (run from `apps/api`; the contract's `'sumo -c intersection.sumocfg --no-step-log'` — expected: no route/connection errors, simulation loads and steps): `cd apps/api/networks && uv run --extra simulation sumo -c intersection.sumocfg --no-step-log --end 5`
- [ ] Run the whole API suite to confirm no regressions (route/edge rename touches nothing else): `cd apps/api && uv run --extra dev pytest -q`
- [ ] Commit: `git add apps/api/networks/intersection.rou.xml apps/api/tests/test_gangnam_routes.py && git commit -m "feat(sumo): replace grid routes with Gangnam junction-traversing routes + flows"` (+ trailers)

---

### Section B validation summary
- TDD red/green for B1–B3 and B5 runs in the **dev env today** via `uv run --extra dev pytest` (pure-`ElementTree`/JSON, no SUMO needed).
- B4 `netconvert` build + the `sumolib` structure test and B5 headless `sumo -c` run require the `simulation` extra (`uv run --extra simulation …`); the `sumolib` test `importorskip`-skips where that extra is not installed, so CI without SUMO stays green.
- Net effect: the 2×2 grid loop is replaced by one TLS-controlled 4-way junction whose lane IDs (`north_in_0` …), inbound counts (5/5/5/4), median bus lanes (강남대로 only), and N,E,S,W TLS link order satisfy both `_approach_from_lane_id`/`_map_signals` (Python) and `parseLaneDirection`/`parseLaneIndex` (TS) without changing either parser.


# Section C — SUMO→frontend bridge + snapshot bounds/fixtures

## Section C — SUMO → frontend bridge + snapshot bounds/fixtures (TDD task blocks)

> Repo root commands. Full API suite: `npm run test:api`. Targeted runs use the same wrapper the
> `test:api` script uses: `node scripts/run-api-python.mjs -m pytest tests/<file>.py -q -k <name>`.
> All five tasks are sequential and owned by Section C only (`apps/api/app/services/sumo_runtime.py`,
> `apps/api/app/services/simulation_snapshot.py`, and the two Python test files). They consume — never
> author — the SSOT mirror and Section B's lane-id / TLS-link contract.

---

### Task C1: Bridge coordinate transform (scene_x = sumo_x, scene_z = −sumo_y)

`_map_vehicles` currently emits raw SUMO `y` as `y_meters`, but the R3F bridge maps `z = vehicle.y_meters`
directly (`TrafficDensityLayer.tsx:1374`) and the fixtures already use scene convention (a north vehicle
sits at `y_meters = -38`). The negation belongs in the bridge. Apply the same transform to pedestrians,
which share the scene.

Files:
- Modify `apps/api/app/services/sumo_runtime.py` (`_map_vehicles` 381-402; `_person_position` 462-482; add helper near 746)
- Modify `apps/api/tests/test_sumo_snapshot_mapping.py` (`test_fake_sumo_client_maps_to_simulation_frame_snapshot_fields` 108-118; `test_fake_sumo_client_maps_person_api_to_pedestrian_snapshots` 157-180)

Interfaces:
- Produces `_to_scene_meters(sumo_x: float, sumo_y: float) -> tuple[float, float]` returning `(sumo_x, -sumo_y)`.
- Consumes scene contract `scene_x = sumo_x, scene_z = -sumo_y` (LOCKED). No schema change: `SimulationVehicleSnapshot.{x_meters,y_meters}` now carry scene coords.

Steps:
- [ ] Edit `test_fake_sumo_client_maps_to_simulation_frame_snapshot_fields`: change `veh-1` expectation `"y_meters": -3.5` → `"y_meters": 3.5` (SUMO `getPosition` returns `(10.25, -3.5)`; scene z = −(−3.5) = 3.5). Leave `"x_meters": 10.25`.
- [ ] Edit `test_fake_sumo_client_maps_person_api_to_pedestrian_snapshots`: `person-1` `"y_meters": -12.0` → `"y_meters": 12.0`; `person-waiting` `"y_meters": 8.25` → `"y_meters": -8.25`.
- [ ] Run `node scripts/run-api-python.mjs -m pytest tests/test_sumo_snapshot_mapping.py -q -k "snapshot_fields or pedestrian_snapshots"` → expected **FAIL** (current passthrough still emits raw −3.5 / −12.0 / 8.25).
- [ ] Add the helper to `sumo_runtime.py` (just above `_approach_from_lane_id` at line 746):
  ```python
  def _to_scene_meters(sumo_x: float, sumo_y: float) -> tuple[float, float]:
      # Scene contract: scene_x = sumo_x, scene_z = -sumo_y. The snapshot carries scene
      # coordinates in (x_meters, y_meters); the R3F bridge consumes y_meters directly as
      # scene z (TrafficDensityLayer.tsx maps `z: vehicle.y_meters`), and the fixtures already
      # follow this convention, so the live bridge is the only place that must negate y.
      return float(sumo_x), -float(sumo_y)
  ```
- [ ] In `_map_vehicles`, replace lines 388 and the `x_meters`/`y_meters` snapshot fields:
  ```python
          sumo_x, sumo_y = client.vehicle.getPosition(vehicle_id)
          x_meters, y_meters = _to_scene_meters(sumo_x, sumo_y)
          vehicles.append(
              SimulationVehicleSnapshot(
                  id=vehicle_id,
                  vehicle_type=vehicle_type,
                  lane_id=lane_id,
                  x_meters=x_meters,
                  y_meters=y_meters,
  ```
- [ ] In `_person_position`, keep the sentinel/finite checks on the **raw** SUMO values, then transform on return (last line of the function):
  ```python
      return _to_scene_meters(x_meters, y_meters)
  ```
- [ ] Run `node scripts/run-api-python.mjs -m pytest tests/test_sumo_snapshot_mapping.py -q` → expected **PASS** (queue/stop-line tests are unaffected — they key on lane position, not x/y).
- [ ] Commit: `git add apps/api/app/services/sumo_runtime.py apps/api/tests/test_sumo_snapshot_mapping.py && git commit -m "fix(bridge): emit scene-aligned y_meters (scene_z = -sumo_y) for vehicles + pedestrians"`

---

### Task C2: Lock `_approach_from_lane_id` to the new `{approach}_{in|out}_{idx}` scheme

`_approach_from_lane_id` already `startswith`-matches the new lane IDs (`"north_in_0".startswith("north")`
→ `north`; `"north_out_4"` → `north`) and returns `None` for the retired grid edges (`"a0a1"`). No
production change is required; this task adds a regression-lock test that pins the contract and proves the
old grid forms no longer resolve to an approach.

Files:
- Modify `apps/api/tests/test_sumo_snapshot_mapping.py` (append new test functions at end)

Interfaces:
- Consumes lane-id scheme `{approach}_{in|out}_{laneIndex}` (Section B / SSOT). Asserts `_approach_from_lane_id` (sumo_runtime.py:746) behavior; no signature change.

Steps:
- [ ] Append to `tests/test_sumo_snapshot_mapping.py`:
  ```python
  import pytest

  from app.services.sumo_runtime import _approach_from_lane_id


  @pytest.mark.parametrize(
      ("lane_id", "expected"),
      [
          ("north_in_0", "north"), ("north_in_4", "north"), ("north_out_0", "north"),
          ("south_in_0", "south"), ("south_out_4", "south"),
          ("east_in_0", "east"), ("east_in_4", "east"), ("east_out_2", "east"),
          ("west_in_0", "west"), ("west_in_3", "west"), ("west_out_3", "west"),
      ],
  )
  def test_approach_from_lane_id_maps_new_inbound_and_outbound_scheme(
      lane_id: str, expected: str
  ) -> None:
      assert _approach_from_lane_id(lane_id) == expected


  @pytest.mark.parametrize(
      "lane_id",
      ["A0A1_0", "A1B1_0", "B0B1_0", ":J0_0", "clockwise_0"],
  )
  def test_approach_from_lane_id_rejects_retired_grid_lane_ids(lane_id: str) -> None:
      assert _approach_from_lane_id(lane_id) is None
  ```
- [ ] Run `node scripts/run-api-python.mjs -m pytest tests/test_sumo_snapshot_mapping.py -q -k "approach_from_lane_id"` → expected **PASS** immediately (confirmation/lock test; the helper already satisfies the new scheme and rejects grid IDs, so no impl change is warranted — outbound lanes intentionally still map to their corridor approach per the LOCKED contract).
- [ ] Commit: `git add apps/api/tests/test_sumo_snapshot_mapping.py && git commit -m "test(bridge): lock _approach_from_lane_id to {approach}_{in|out}_{idx}, reject grid IDs"`

---

### Task C3: `_map_signals` — link-index → approach mapping from the gangnam TLS program

The new `gangnam.tll.xml` (Section B) emits an **8-character** state whose first four characters are the
through movements for north, east, south, west (in that order = `TLS_DIRECTION_ORDER`). Read each approach's
state via the named constant `TLS_APPROACH_LINK_INDEX` = `{north:0, east:1, south:2, west:3}` (per §0 R1).
The old `zip(TLS_DIRECTION_ORDER, state)` over the first 4 chars was already correct for this layout; the
explicit index map makes it robust if Section B later reorders links. Reconcile against the published
`gangnam.tll.xml` link order at integration (Task X2).

Files:
- Modify `apps/api/app/services/sumo_runtime.py` (constants block 30-38; `_map_signals` 537-552)
- Modify `apps/api/tests/test_sumo_snapshot_mapping.py` (`FakeTrafficLightApi` 37-42; signals assertion 121-129; append a dedicated test)

Interfaces:
- Produces `TLS_APPROACH_LINK_INDEX: dict[Approach, int]` = `{"north": 0, "east": 1, "south": 2, "west": 3}` (per §0 R1, indexing Section B's 8-char state).
- Produces `_map_signals(client) -> list[SimulationSignalSnapshot]` reading `state[TLS_APPROACH_LINK_INDEX[approach]]` for each approach in `TLS_DIRECTION_ORDER`, skipping any index past `len(state)`.
- Consumes Section B's `gangnam.net.xml`/`gangnam.tll.xml` connection (link) ordering; keeps `TLS_DIRECTION_ORDER = ("north","east","south","west")`.

Steps:
- [ ] Replace `FakeTrafficLightApi.getRedYellowGreenState` to return an 8-char gangnam-style state that yields north=green, east=red, south=yellow, west=red at indices 0/1/2/3:
  ```python
  class FakeTrafficLightApi:
      def getIDList(self) -> list[str]:
          return ["tls-main"]

      def getRedYellowGreenState(self, _signal_id: str) -> str:
          # 8-char state; first 4 = through movements for N, E, S, W (TLS_DIRECTION_ORDER).
          # north=0 (G), east=1 (r), south=2 (y), west=3 (r); trailing 4 = protected-left links.
          return "Gryrrrrr"
  ```
- [ ] Append a dedicated mapping test that builds the fake state from the constant (robust to the exact index values, verifying the per-approach extraction logic and iteration order):
  ```python
  from app.services.sumo_runtime import (
      TLS_APPROACH_LINK_INDEX,
      TLS_DIRECTION_ORDER,
      _map_signals,
  )


  def test_map_signals_reads_per_approach_through_link_index() -> None:
      colors = {"north": "G", "east": "y", "south": "r", "west": "G"}
      length = max(TLS_APPROACH_LINK_INDEX.values()) + 1
      chars = ["r"] * length
      for approach, index in TLS_APPROACH_LINK_INDEX.items():
          chars[index] = colors[approach]

      class OneProgramTrafficLightApi:
          def getIDList(self) -> list[str]:
              return ["gangnam-center"]

          def getRedYellowGreenState(self, _signal_id: str) -> str:
              return "".join(chars)

      class OneProgramClient(FakeSumoClient):
          trafficlight = OneProgramTrafficLightApi()

      frame = build_sumo_simulation_frame(
          scenario_id="normal", mode="sumo_traci",
          client=OneProgramClient(), step_index=1,
      )

      assert [signal.direction for signal in frame.signals] == list(TLS_DIRECTION_ORDER)
      assert {(s.direction, s.state) for s in frame.signals} == {
          ("north", "green"), ("east", "yellow"), ("south", "red"), ("west", "green"),
      }
  ```
- [ ] Run `node scripts/run-api-python.mjs -m pytest tests/test_sumo_snapshot_mapping.py -q -k "map_signals or snapshot_fields"` → expected **FAIL** (`TLS_APPROACH_LINK_INDEX` import error; and the existing zip reads chars 0-3 `"rGrr"` → wrong colors).
- [ ] Add the constant after `TLS_DIRECTION_ORDER` (line 31):
  ```python
  # Through-movement link index per approach in the gangnam 8-char TLS state string.
  # Section B's gangnam.tll.xml puts the N/E/S/W through movements at the first 4 link
  # indices (= TLS_DIRECTION_ORDER order); trailing chars are protected-left links.
  TLS_APPROACH_LINK_INDEX: dict[Approach, int] = {
      "north": 0, "east": 1, "south": 2, "west": 3,
  }
  ```
- [ ] Rewrite `_map_signals` (537-552):
  ```python
  def _map_signals(client: SumoClient) -> list[SimulationSignalSnapshot]:
      signals: list[SimulationSignalSnapshot] = []
      for signal_id in client.trafficlight.getIDList():
          state = client.trafficlight.getRedYellowGreenState(signal_id)
          for direction in TLS_DIRECTION_ORDER:
              link_index = TLS_APPROACH_LINK_INDEX[direction]
              if link_index >= len(state):
                  continue
              signal_state = _signal_state(state[link_index])
              signals.append(
                  SimulationSignalSnapshot(
                      signal_id=f"{signal_id}-{direction}",
                      direction=direction,
                      state=signal_state,
                      seconds_remaining=_signal_seconds_remaining(signal_state),
                  )
              )
          break
      return signals
  ```
- [ ] The signals assertion in `test_fake_sumo_client_maps_to_simulation_frame_snapshot_fields` (121-129) stays `{("north","green"),("east","red"),("south","yellow"),("west","red")}` — it already matches the new 8-char fake `"Gryrrrrr"` (indices 0/1/2/3 = G/r/y/r).
- [ ] Run `node scripts/run-api-python.mjs -m pytest tests/test_sumo_snapshot_mapping.py -q` → expected **PASS**.
- [ ] Commit: `git add apps/api/app/services/sumo_runtime.py apps/api/tests/test_sumo_snapshot_mapping.py && git commit -m "feat(bridge): map gangnam TLS link indices to per-approach signal state"`

---

### Task C4: Derive snapshot bounds / approach lengths / lane counts from the SSOT mirror

Replace the hard-coded `SNAPSHOT_BOUNDS_METERS`, `APPROACH_LENGTH_METERS`, and the fixture
`lane_count=3` with values derived from the SSOT mirror `apps/api/networks/intersection_truth.json`
(authored by the geometry/SSOT section). Derivation rule: `APPROACH_LENGTH_METERS[a] = corridorLengthM[a]`;
`SNAPSHOT_BOUNDS_METERS[a] = sign[a] * corridorLengthM[a]` with `sign = {north:-1, south:+1, east:+1, west:-1}`
(the corridor's signed axis extent → SSOT-derived `{-140, 120, 140, -140}`, an intentional baseline change from the old `{-160, 140, 160, -160}`; see §0 R4). Fixture density
`lane_count` becomes the per-approach inbound count (강남대로/테헤란로 = 5, 서초대로 = 4).

> **Cross-section dependency:** module import requires `apps/api/networks/intersection_truth.json`. Expected
> shape (Section A SSOT mirror — reproduced as the contract, do **not** re-author here):
> ```json
> {
>   "laneWidthM": 3.6,
>   "approaches": {
>     "north": {"approach":"north","road":"강남대로","inboundLanes":5,"outboundLanes":5,"hasMedianBus":true,"corridorLengthM":140.0,"hasCrosswalk":false},
>     "south": {"approach":"south","road":"강남대로","inboundLanes":5,"outboundLanes":5,"hasMedianBus":true,"corridorLengthM":120.0,"hasCrosswalk":false},
>     "east":  {"approach":"east","road":"테헤란로","inboundLanes":5,"outboundLanes":5,"hasMedianBus":false,"corridorLengthM":140.0,"hasCrosswalk":true},
>     "west":  {"approach":"west","road":"서초대로","inboundLanes":4,"outboundLanes":4,"hasMedianBus":false,"corridorLengthM":140.0,"hasCrosswalk":true}
>   }
> }
> ```
> If Section C executes before Section A lands this file, the geometry section must land it first (it is the
> SSOT both stacks consume). The pure-derivation unit test below runs independently of the file.

Files:
- Modify `apps/api/app/services/simulation_snapshot.py` (imports 1-9; constants 11-23; `_density_segments` 47-63)
- Modify `apps/api/tests/test_simulation_snapshot.py` (`test_emergency_simulation_frame...` bounds 60-65; add lane_count assertions)
- Modify `apps/api/tests/test_sumo_snapshot_mapping.py` (bounds assertion 102-107)

Interfaces:
- Produces `_load_intersection_truth() -> dict`, `_derive_snapshot_bounds_meters(truth) -> dict[str,float]`, `_derive_approach_length_meters(truth) -> dict[str,float]`, `_approach_inbound_lanes(truth, approach) -> int`, `_BOUNDS_SIGN: dict[str,float]`.
- Re-exports `SNAPSHOT_BOUNDS_METERS`/`APPROACH_LENGTH_METERS` (now SSOT-derived) — consumed unchanged by `sumo_runtime.build_sumo_simulation_frame`.
- Consumes SSOT `apps/api/networks/intersection_truth.json`.

Steps:
- [ ] Add a pure-derivation unit test to `tests/test_simulation_snapshot.py` (runs without the JSON file):
  ```python
  from app.services.simulation_snapshot import (
      _derive_approach_length_meters,
      _derive_snapshot_bounds_meters,
  )


  def test_bounds_derive_signed_corridor_length_from_truth() -> None:
      truth = {"laneWidthM": 3.6, "approaches": {
          "north": {"corridorLengthM": 140.0, "inboundLanes": 5},
          "south": {"corridorLengthM": 120.0, "inboundLanes": 5},
          "east":  {"corridorLengthM": 140.0, "inboundLanes": 5},
          "west":  {"corridorLengthM": 140.0, "inboundLanes": 4},
      }}
      assert _derive_snapshot_bounds_meters(truth) == {
          "north": -140.0, "south": 120.0, "east": 140.0, "west": -140.0,
      }
      assert _derive_approach_length_meters(truth) == {
          "north": 140.0, "south": 120.0, "east": 140.0, "west": 140.0,
      }
  ```
- [ ] Run `node scripts/run-api-python.mjs -m pytest tests/test_simulation_snapshot.py -q -k "derive_signed_corridor"` → expected **FAIL** (helpers don't exist).
- [ ] Replace `simulation_snapshot.py` constants (11-23) with loader + derivation:
  ```python
  import json
  from functools import lru_cache
  from pathlib import Path

  SNAPSHOT_SOURCE = "simulation_snapshot_fixture"
  _BOUNDS_SIGN: dict[str, float] = {"north": -1.0, "south": 1.0, "east": 1.0, "west": -1.0}
  _INTERSECTION_TRUTH_PATH = (
      Path(__file__).resolve().parents[2] / "networks" / "intersection_truth.json"
  )


  @lru_cache(maxsize=1)
  def _load_intersection_truth() -> dict:
      with _INTERSECTION_TRUTH_PATH.open(encoding="utf-8") as truth_file:
          return json.load(truth_file)


  def _corridor_length_meters(truth: dict, approach: str) -> float:
      return float(truth["approaches"][approach]["corridorLengthM"])


  def _approach_inbound_lanes(truth: dict, approach: str) -> int:
      return int(truth["approaches"][approach]["inboundLanes"])


  def _derive_approach_length_meters(truth: dict) -> dict[str, float]:
      return {a: _corridor_length_meters(truth, a) for a in _BOUNDS_SIGN}


  def _derive_snapshot_bounds_meters(truth: dict) -> dict[str, float]:
      return {a: _BOUNDS_SIGN[a] * _corridor_length_meters(truth, a) for a in _BOUNDS_SIGN}


  APPROACH_LENGTH_METERS = _derive_approach_length_meters(_load_intersection_truth())
  SNAPSHOT_BOUNDS_METERS = _derive_snapshot_bounds_meters(_load_intersection_truth())
  ```
- [ ] Update `_density_segments` (47-63) to read the SSOT inbound lane count instead of the hard-coded `3`:
  ```python
  def _density_segments(
      observation: VisionObservation,
  ) -> list[SimulationDensitySegment]:
      truth = _load_intersection_truth()
      queues = observation.queues.model_dump()
      return [
          SimulationDensitySegment(
              segment_id=f"{approach}-queue-density",
              approach=approach,
              start_meters_from_stop_line=0.0,
              end_meters_from_stop_line=APPROACH_LENGTH_METERS[approach],
              lane_count=_approach_inbound_lanes(truth, approach),
              vehicle_count=queue,
              average_speed_mps=_average_speed_for_queue(queue),
              source="fixture_density_proxy",
          )
          for approach, queue in queues.items()
      ]
  ```
- [ ] In `tests/test_simulation_snapshot.py`, replace the literal bounds block (60-65) with the SSOT-derived constant and add per-approach lane-count assertions:
  ```python
  from app.services.simulation_snapshot import SNAPSHOT_BOUNDS_METERS

  assert payload["bounds_meters"] == SNAPSHOT_BOUNDS_METERS
  lane_count_by_approach = {
      segment["approach"]: segment["lane_count"]
      for segment in payload["density_segments"]
  }
  assert lane_count_by_approach["north"] == 5
  assert lane_count_by_approach["west"] == 4
  ```
- [ ] In `tests/test_sumo_snapshot_mapping.py`, replace the literal `frame.bounds_meters == {...}` (102-107) with `assert frame.bounds_meters == SNAPSHOT_BOUNDS_METERS` and add `from app.services.simulation_snapshot import SNAPSHOT_BOUNDS_METERS` at the top.
- [ ] Run `node scripts/run-api-python.mjs -m pytest tests/test_simulation_snapshot.py tests/test_sumo_snapshot_mapping.py -q` → expected **PASS** (with `intersection_truth.json` present).
- [ ] Commit: `git add apps/api/app/services/simulation_snapshot.py apps/api/tests/test_simulation_snapshot.py apps/api/tests/test_sumo_snapshot_mapping.py && git commit -m "feat(snapshot): derive bounds, approach lengths, and lane counts from intersection_truth SSOT"`

---

### Task C5: Validate `STOP_LINE_DISTANCE_METERS` / `QUEUE_THRESHOLD` against the new geometry

The new asymmetric geometry keeps lane width 3.6 m and corridor lengths in the 120-140 m range, so neither
the stop-line capture distance nor the queue-event threshold requires a numeric change. `STOP_LINE_DISTANCE_METERS`
is a longitudinal distance (independent of lane count) and must stay strictly inside the shortest corridor;
`QUEUE_THRESHOLD` is a per-approach count tuned for event noise. Lock both with an invariant test and a
justification note rather than re-tuning blindly.

Files:
- Modify `apps/api/tests/test_sumo_snapshot_mapping.py` (append invariant test)
- (No production change to `sumo_runtime.py` constants 32-33 — documented decision)

Interfaces:
- Consumes `STOP_LINE_DISTANCE_METERS` (sumo_runtime.py:33), `QUEUE_THRESHOLD` (sumo_runtime.py:32), and `APPROACH_LENGTH_METERS` (SSOT-derived, Task C4).

Steps:
- [ ] Append to `tests/test_sumo_snapshot_mapping.py`:
  ```python
  from app.services.simulation_snapshot import APPROACH_LENGTH_METERS
  from app.services.sumo_runtime import QUEUE_THRESHOLD, STOP_LINE_DISTANCE_METERS


  def test_stop_line_distance_fits_inside_shortest_corridor() -> None:
      # Stop-line capture must sit strictly inside the shortest approach so queued
      # vehicles are detected without spilling past the corridor end.
      assert 0.0 < STOP_LINE_DISTANCE_METERS < min(APPROACH_LENGTH_METERS.values())


  def test_queue_threshold_unchanged_for_new_geometry() -> None:
      # Per-approach queue-event threshold is a noise-tuning count, geometry-independent.
      # Retained at 25 for the asymmetric build; revisit only with live-flow evidence.
      assert QUEUE_THRESHOLD == 25
  ```
- [ ] Run `node scripts/run-api-python.mjs -m pytest tests/test_sumo_snapshot_mapping.py -q -k "stop_line_distance or queue_threshold_unchanged"` → expected **PASS** (decision/lock test: `30.0 < 140.0` holds; no constant change).
- [ ] Run the full API suite `npm run test:api` → expected **PASS**.
- [ ] Commit: `git add apps/api/tests/test_sumo_snapshot_mapping.py && git commit -m "test(bridge): lock STOP_LINE_DISTANCE/QUEUE_THRESHOLD invariants for asymmetric geometry"`


# Section D — Integration, gates & visual-baseline migration

## Section D — End-to-end integration, gates & visual-baseline migration (SP1)

> These are the final SP1 tasks. They assume Section A has created `apps/web/components/r3f/intersectionTruth.ts` (exporting `INTERSECTION_TRUTH` + `ApproachTruth`), and Section B has refactored `roadGeometry.ts` so `APPROACH_CORRIDORS` carry per-corridor widths and a new **axis-aware** box export `INTERSECTION_BOX_EXTENT_METERS: { ew: number; ns: number }` replaces the scalar `INTERSECTION_BOX_METERS` (spec §5.3), and Section C has reworked `getInboundLaneOffset` to be per-approach + median-bus aware. Cross-section symbols are referenced **by name from the LOCKED contract**. If Section B keeps the scalar name and exposes the axis record under a different identifier, only the single `import` line in D1/D2 needs renaming — the rest is derived.
>
> All `vitest` commands run from `apps/web`. All `npm run verify:*` / `test:api` / `build:web` run from the repo root `/home/chan/abc_project`.

---

### Task D1: Axis-aware plate proxy ground/occluder sizing

`plateProxyGeometry.buildPlateProxy()` hardcodes the old square box (`INTERSECTION_BOX_METERS * 6`). The occluders already derive from `BUILDING_EDGE_BLOCKS` + `STAGE6E_CITY_EDGE_BLOCKS` (which Section B re-derives from the asymmetric corridors, so they update for free). Only the ground-plane scalar must switch to the new axis-aware box. `BackgroundPlateLayer.tsx:178` builds `new PlaneGeometry(size, size)` (a square), so `groundPlane.size` stays a scalar = the larger axis extent so the square plane still covers the rectangular junction.

**Files:**
- Modify `apps/web/components/r3f/plateProxyGeometry.ts` (imports L4-10; `buildPlateProxy` L21-30)
- Modify `apps/web/components/r3f/plateProxyGeometry.test.ts` (L14-17)

**Interfaces:**
- Consumes `INTERSECTION_BOX_EXTENT_METERS: { ew: number; ns: number }`, `BUILDING_EDGE_BLOCKS`, `STAGE6E_CITY_EDGE_BLOCKS`, `BoxPrimitiveSpec`, `Vector3Tuple` from `./roadGeometry` (Section B).
- Produces unchanged `PlateProxy = { occluders: BoxPrimitiveSpec[]; groundPlane: { size: number; y: number } }` — same shape so `BackgroundPlateLayer.tsx` needs **no** change.

**Steps:**

- [ ] Write the failing test — add to `plateProxyGeometry.test.ts`:
```ts
import { buildPlateProxy } from "./plateProxyGeometry";
import {
  BUILDING_EDGE_BLOCKS,
  INTERSECTION_BOX_EXTENT_METERS
} from "./roadGeometry";

it("ground plane covers the larger axis of the asymmetric intersection box", () => {
  const proxy = buildPlateProxy();
  const maxExtent = Math.max(
    INTERSECTION_BOX_EXTENT_METERS.ew,
    INTERSECTION_BOX_EXTENT_METERS.ns
  );
  expect(proxy.groundPlane.size).toBeGreaterThanOrEqual(maxExtent);
});
```
- [ ] Run (expected FAIL — `INTERSECTION_BOX_METERS` import is gone / `INTERSECTION_BOX_EXTENT_METERS` undefined or the old hardcoded `32*6=192` is smaller than the new `ns` extent in some aspect):
```bash
cd apps/web && npx vitest run components/r3f/plateProxyGeometry.test.ts
```
- [ ] Minimal impl — `plateProxyGeometry.ts`, replace the `INTERSECTION_BOX_METERS` import and the `groundPlane` literal:
```ts
import {
  BUILDING_EDGE_BLOCKS,
  INTERSECTION_BOX_EXTENT_METERS,
  STAGE6E_CITY_EDGE_BLOCKS,
  type BoxPrimitiveSpec,
  type Vector3Tuple
} from "./roadGeometry";
```
```ts
export function buildPlateProxy(): PlateProxy {
  const occluders: BoxPrimitiveSpec[] = [
    ...BUILDING_EDGE_BLOCKS,
    ...STAGE6E_CITY_EDGE_BLOCKS
  ];
  // Square backdrop plane sized to the larger axis of the asymmetric junction
  // box (강남대로 E–W carriageway vs 테헤란로/서초대로 N–S), kept generous (×6)
  // so the procedural fallback reads coherently behind the night plate.
  const maxBoxExtent = Math.max(
    INTERSECTION_BOX_EXTENT_METERS.ew,
    INTERSECTION_BOX_EXTENT_METERS.ns
  );
  return {
    occluders,
    groundPlane: { size: maxBoxExtent * 6, y: 0 }
  };
}
```
- [ ] Run (expected PASS — both old tests + the new axis test):
```bash
cd apps/web && npx vitest run components/r3f/plateProxyGeometry.test.ts
```
- [ ] Commit:
```bash
git add apps/web/components/r3f/plateProxyGeometry.ts apps/web/components/r3f/plateProxyGeometry.test.ts
git commit -m "feat(r3f): size plate proxy ground plane from axis-aware intersection box (SP1 D1)"
```

---

### Task D2: Reposition SignalHardware to the asymmetric corners

`SIGNAL_PLACEMENTS` (SignalHardware.tsx:30-35) and the foreground proof signal (L79-87) carry magic corner coords tuned to the old symmetric ~32 m box (corners at ±19.5). With the asymmetric box (강남대로 E–W ≈36 m, 테헤란로/서초대로 N–S extents) those corners move. Derive each Korean horizontal head's corner from the SSOT geometry so it sits on the curb just outside the junction at the near side of its inbound approach, head facing oncoming inbound traffic (preserve the existing `rotationY` mapping that already faces traffic). **Full signal art is SP3** — here we only reposition to keep the scene coherent and tests green.

**Files:**
- Modify `apps/web/components/r3f/SignalHardware.tsx` (imports L11-14; `SIGNAL_PLACEMENTS` L30-35; `SEOUL_FOREGROUND_PROOF_SIGNAL` L79-87)
- Modify `apps/web/components/r3f/CameraWeatherClutter.test.tsx` (signal-cue test L518-555)

**Interfaces:**
- Consumes `INTERSECTION_BOX_EXTENT_METERS`, `APPROACH_CORRIDORS`, `type Vector3Tuple` from `./roadGeometry` (Section B); `Direction` from `../../lib/types`.
- Produces `export const SIGNAL_PLACEMENTS: Record<Direction, SignalPlacement>` (now exported for testability) and an updated `SEOUL_FOREGROUND_PROOF_SIGNAL.position`. `SEOUL_SIGNAL_HARDWARE_CUES` / `faceMeters` / `position[1] >= 5` invariants preserved.

**Steps:**

- [ ] Write the failing test — replace the signal-cue assertions in `CameraWeatherClutter.test.tsx` (extend the existing `"uses Seoul-style signal hardware cues..."` test) and import the now-exported placements:
```ts
import * as SignalHardwareModule from "./SignalHardware";
import {
  APPROACH_CORRIDORS,
  INTERSECTION_BOX_EXTENT_METERS
} from "./roadGeometry";

test("anchors Seoul signal heads to the asymmetric junction corners facing inbound traffic", () => {
  const placements = (SignalHardwareModule as typeof SignalHardwareModule & {
    SIGNAL_PLACEMENTS: Record<
      "north" | "south" | "east" | "west",
      { position: [number, number, number]; rotationY: number }
    >;
  }).SIGNAL_PLACEMENTS;

  const nsHalf = INTERSECTION_BOX_EXTENT_METERS.ns / 2;
  const ewHalf = INTERSECTION_BOX_EXTENT_METERS.ew / 2;
  const across = (dir: "north" | "south" | "east" | "west") => {
    const c = APPROACH_CORRIDORS.find((corridor) => corridor.direction === dir)!;
    return (c.orientation === "north_south" ? c.size[0] : c.size[1]) / 2;
  };

  // Heads sit just beyond the junction box on the approach's near corner.
  expect(placements.north.position[2]).toBeLessThanOrEqual(-nsHalf);
  expect(placements.south.position[2]).toBeGreaterThanOrEqual(nsHalf);
  expect(placements.east.position[0]).toBeGreaterThanOrEqual(ewHalf);
  expect(placements.west.position[0]).toBeLessThanOrEqual(-ewHalf);

  // Poles stand on the curb outside each approach's own carriageway half.
  expect(Math.abs(placements.north.position[0])).toBeGreaterThanOrEqual(across("north"));
  expect(Math.abs(placements.west.position[2])).toBeGreaterThanOrEqual(across("west"));

  // Faces oncoming inbound traffic (matches PRECISE_VEHICLE_HEADING mapping).
  expect(placements.north.rotationY).toBeCloseTo(Math.PI, 5);
  expect(placements.south.rotationY).toBeCloseTo(0, 5);
  expect(placements.east.rotationY).toBeCloseTo(Math.PI / 2, 5);
  expect(placements.west.rotationY).toBeCloseTo(-Math.PI / 2, 5);

  // Proof signal stays an overhead head with a legible face (cue invariants).
  const proof = SignalHardwareModule.SEOUL_SIGNAL_HARDWARE_CUES.foregroundProofSignal;
  expect(proof.position[1]).toBeGreaterThanOrEqual(5);
  expect(proof.faceMeters[0]).toBeGreaterThanOrEqual(3.2);
  expect(proof.faceMeters[1]).toBeGreaterThanOrEqual(1.5);
});
```
- [ ] Run (expected FAIL — `SIGNAL_PLACEMENTS` is not exported, and the old `±19.5` coords don't satisfy the new asymmetric-box bounds):
```bash
cd apps/web && npx vitest run components/r3f/CameraWeatherClutter.test.tsx
```
- [ ] Minimal impl — `SignalHardware.tsx`. Add the geometry imports and derive placements from the SSOT (replace L30-35 and L79-87):
```ts
import {
  APPROACH_CORRIDORS,
  INTERSECTION_BOX_EXTENT_METERS,
  type Vector3Tuple
} from "./roadGeometry";

const SIGNAL_HEAD_HEIGHT_METERS = 5.2;
// Pole stands on the sidewalk just past the carriageway edge; the mast arm
// cantilevers the head back over the inbound stop line (handled by the assembly).
const SIGNAL_CURB_SETBACK_METERS = 4.5;

function approachCarriagewayHalfWidth(direction: Direction): number {
  const corridor = APPROACH_CORRIDORS.find((c) => c.direction === direction)!;
  const acrossWidth =
    corridor.orientation === "north_south" ? corridor.size[0] : corridor.size[1];
  return acrossWidth / 2;
}

const NS_HALF = INTERSECTION_BOX_EXTENT_METERS.ns / 2;
const EW_HALF = INTERSECTION_BOX_EXTENT_METERS.ew / 2;
const NORTH_CURB = approachCarriagewayHalfWidth("north") + SIGNAL_CURB_SETBACK_METERS;
const SOUTH_CURB = approachCarriagewayHalfWidth("south") + SIGNAL_CURB_SETBACK_METERS;
const EAST_CURB = approachCarriagewayHalfWidth("east") + SIGNAL_CURB_SETBACK_METERS;
const WEST_CURB = approachCarriagewayHalfWidth("west") + SIGNAL_CURB_SETBACK_METERS;
const NS_CORNER = NS_HALF + SIGNAL_CURB_SETBACK_METERS;
const EW_CORNER = EW_HALF + SIGNAL_CURB_SETBACK_METERS;

export const SIGNAL_PLACEMENTS: Record<Direction, SignalPlacement> = {
  north: { position: [-NORTH_CURB, SIGNAL_HEAD_HEIGHT_METERS, -NS_CORNER], rotationY: Math.PI },
  south: { position: [SOUTH_CURB, SIGNAL_HEAD_HEIGHT_METERS, NS_CORNER], rotationY: 0 },
  east: { position: [EW_CORNER, SIGNAL_HEAD_HEIGHT_METERS, -EAST_CURB], rotationY: Math.PI / 2 },
  west: { position: [-EW_CORNER, SIGNAL_HEAD_HEIGHT_METERS, WEST_CURB], rotationY: -Math.PI / 2 }
};
```
```ts
const SEOUL_FOREGROUND_PROOF_SIGNAL = {
  direction: "west" as Direction,
  faceMeters: [3.65, 1.78] as [number, number],
  position: [-EW_CORNER + 0.3, 5.35, WEST_CURB + 0.7] as Vector3Tuple,
  rotationY: Math.PI / 3,
  hangulLabelPlacement: "signal_face_texture" as const,
  signalStateSource: "SceneSnapshot.signals" as const,
  visibilityTier: "proof_foreground" as const
};
```
(`SignalPlacement` and `Direction` are already in scope; keep `rotationY` mapping unchanged so heads keep facing oncoming traffic.)
- [ ] Run (expected PASS — the new placement test plus the unchanged `"uses Seoul-style signal hardware cues..."` cue test, since `faceMeters`/`position[1]=5.35` are preserved):
```bash
cd apps/web && npx vitest run components/r3f/CameraWeatherClutter.test.tsx
```
- [ ] Commit:
```bash
git add apps/web/components/r3f/SignalHardware.tsx apps/web/components/r3f/CameraWeatherClutter.test.tsx
git commit -m "feat(r3f): anchor Seoul signal heads to asymmetric junction corners (SP1 D2)"
```

---

### Task D3: Lane-alignment integration test (vehicles align on real lanes)

The SP1 success criterion "SUMO vehicles render in their actual lanes on the asymmetric geometry … with no off-road float" needs a cross-section integration proof: parse a SUMO lane-id, derive the expected lane-center ladder **independently from `INTERSECTION_TRUTH`**, and assert Section C's `getInboundLaneOffset` (called with the **per-approach** inbound count) agrees and stays inside the carriageway. This catches bridge desync (e.g., `getInboundLaneOffset` still using the global `INBOUND_LANE_COUNT=3` for 강남대로's 5 inbound lanes → floating vehicles).

`getInboundLaneOffset`, `parseLaneDirection`, `parseLaneIndex` are currently **private** in `TrafficDensityLayer.tsx`. This task adds the `export` keyword to all three (additive, no behavior change; coordinate with Section C which owns the bodies).

**Files:**
- Create `apps/web/components/r3f/laneAlignmentIntegration.test.ts`
- Modify `apps/web/components/r3f/TrafficDensityLayer.tsx` (add `export` to `getInboundLaneOffset` L1892, `parseLaneDirection` L1504, `parseLaneIndex` L1512)

**Interfaces:**
- Consumes `INTERSECTION_TRUTH` from `./intersectionTruth` (Section A); `getInboundLaneOffset(direction, laneIndex, laneCount): number`, `parseLaneDirection(laneId): Direction | null`, `parseLaneIndex(laneId): number | null` from `./TrafficDensityLayer` (Section C).
- Produces no runtime symbols; it is the SP1 "vehicles align on real lanes" gate.

**Steps:**

- [ ] Write the failing test — `laneAlignmentIntegration.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { INTERSECTION_TRUTH } from "./intersectionTruth";
import {
  getInboundLaneOffset,
  parseLaneDirection,
  parseLaneIndex
} from "./TrafficDensityLayer";

const carriagewayHalf = (approach: { inboundLanes: number; outboundLanes: number; laneWidthM: number }) =>
  ((approach.inboundLanes + approach.outboundLanes) * approach.laneWidthM) / 2;

const inboundLadder = (direction: "north" | "south" | "east" | "west") => {
  const truth = INTERSECTION_TRUTH[direction];
  return Array.from({ length: truth.inboundLanes }, (_, i) =>
    getInboundLaneOffset(direction, i, truth.inboundLanes)
  );
};

describe("SP1 lane alignment integration", () => {
  it("parses the {approach}_{in|out}_{laneIndex} lane-id contract", () => {
    expect(parseLaneDirection("north_in_3")).toBe("north");
    expect(parseLaneIndex("north_in_3")).toBe(3);
    expect(parseLaneDirection("west_in_3")).toBe("west");
    expect(parseLaneIndex("west_in_3")).toBe(3);
  });

  it("snapshot vehicle on north_in_3 lands on the real inbound lane center", () => {
    const truth = INTERSECTION_TRUTH.north;
    const half = carriagewayHalf(truth);
    const ladder = inboundLadder("north");

    // 강남대로 carries 5 inbound lanes incl. the median bus lane.
    expect(truth.inboundLanes).toBe(5);
    expect(truth.hasMedianBus).toBe(true);

    // Every inbound lane center is inside the carriageway — no off-road float.
    for (const offset of ladder) {
      expect(Math.abs(offset)).toBeLessThanOrEqual(half - truth.laneWidthM / 2 + 1e-6);
    }
    // Lanes are distinct and one lane-width apart.
    const sorted = [...ladder].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i] - sorted[i - 1]).toBeCloseTo(truth.laneWidthM, 4);
    }
    // north_in_3 sits exactly on the 4th rung of that ladder.
    const { direction } = { direction: parseLaneDirection("north_in_3")! };
    const index = parseLaneIndex("north_in_3")!;
    expect(getInboundLaneOffset(direction, index, truth.inboundLanes)).toBeCloseTo(
      sorted[3],
      4
    );
    // The median bus lane sits near the carriageway centerline.
    expect(Math.min(...ladder.map((o) => Math.abs(o)))).toBeLessThanOrEqual(
      truth.laneWidthM
    );
  });

  it("uses per-approach inbound counts (강남대로 5 incl. bus, 테헤란로 5, 서초대로 4)", () => {
    expect(INTERSECTION_TRUTH.east.inboundLanes).toBe(5);
    expect(INTERSECTION_TRUTH.east.hasMedianBus).toBe(false);
    expect(INTERSECTION_TRUTH.west.inboundLanes).toBe(4);

    // 5th lane (median bus, index 4) resolves to a distinct in-carriageway center,
    // proving the higher index is honored rather than clamped to the legacy 3.
    const truth = INTERSECTION_TRUTH.north;
    const half = carriagewayHalf(truth);
    const lane4 = getInboundLaneOffset("north", 4, truth.inboundLanes);
    const lane3 = getInboundLaneOffset("north", 3, truth.inboundLanes);
    expect(Math.abs(lane4)).toBeLessThanOrEqual(half - truth.laneWidthM / 2 + 1e-6);
    expect(Math.abs(lane4 - lane3)).toBeCloseTo(truth.laneWidthM, 4);

    // 서초대로 narrow leg: west_in_3 still lands on a real lane.
    const west = INTERSECTION_TRUTH.west;
    expect(Math.abs(getInboundLaneOffset("west", 3, west.inboundLanes))).toBeLessThanOrEqual(
      carriagewayHalf(west) - west.laneWidthM / 2 + 1e-6
    );
  });
});
```
- [ ] Run (expected FAIL — the three functions are not yet exported, and/or `getInboundLaneOffset` still centers on the legacy global count):
```bash
cd apps/web && npx vitest run components/r3f/laneAlignmentIntegration.test.ts
```
- [ ] Minimal impl — in `TrafficDensityLayer.tsx`, add `export` to the three declarations:
```ts
export function parseLaneDirection(laneId: string): Direction | null {
```
```ts
export function parseLaneIndex(laneId: string) {
```
```ts
export function getInboundLaneOffset(
  direction: Direction,
  laneIndex: number,
  laneCount: number
) {
```
(Function bodies are Section C's responsibility — D3 only exposes them and asserts agreement with the SSOT.)
- [ ] Run (expected PASS once Section A's `INTERSECTION_TRUTH` and Section C's per-approach `getInboundLaneOffset` are in place):
```bash
cd apps/web && npx vitest run components/r3f/laneAlignmentIntegration.test.ts
```
- [ ] Commit:
```bash
git add apps/web/components/r3f/laneAlignmentIntegration.test.ts apps/web/components/r3f/TrafficDensityLayer.tsx
git commit -m "test(r3f): integration proof vehicles align on real asymmetric lanes (SP1 D3)"
```

---

### Task D4: Visual-baseline regeneration & threshold migration

The geometry shift changes the desktop canvas histogram, so `scripts/baselines/r3f-dashboard-visual-baseline.json` (`desktop.canvas_metrics`) **must** be regenerated and committed. `verify-r3f-visual-diff.mjs` compares `artifacts/r3f-dashboard-details.json#desktop.canvas_metrics` against the baseline using `metricThresholds` (L29-36) and fails if the baseline path equals the details path unless `R3F_VISUAL_ALLOW_SELF_BASELINE=1` (L19, L147-154).

**Files:**
- Modify `scripts/baselines/r3f-dashboard-visual-baseline.json` (regenerated `desktop.canvas_metrics`, bumped `baseline_id`)
- Modify (only if needed) `scripts/verify-r3f-visual-diff.mjs` (`metricThresholds` L29-36)

**Interfaces:**
- Consumes `artifacts/r3f-dashboard-details.json` produced by `verify:r3f-dashboard`.
- Produces a committed baseline that makes `verify:r3f-visual-diff` pass with `self_baseline=false`.

**Steps (run from repo root, after D1–D3 + all geometry sections landed):**

- [ ] Regenerate artifacts + details (runs Playwright against a production build of `/dashboard`):
```bash
npm run verify:r3f-dashboard
```
- [ ] Copy the freshly measured desktop metrics into the baseline and bump the id (deterministic, no hand-editing):
```bash
node -e "const fs=require('fs');const d=require('./artifacts/r3f-dashboard-details.json');const b=require('./scripts/baselines/r3f-dashboard-visual-baseline.json');b.desktop.canvas_metrics=d.desktop.canvas_metrics;b.baseline_id='r3f-dashboard-visual-baseline-2026-06-27-sp1-gangnam-asymmetric';b.source_artifact='artifacts/r3f-dashboard-details.json';fs.writeFileSync('./scripts/baselines/r3f-dashboard-visual-baseline.json',JSON.stringify(b,null,2)+'\n');"
```
- [ ] Run the diff against the committed baseline (expected PASS: deltas ≈ 0 because current and baseline now share the same geometry; `self_baseline` is `false` because the baseline path ≠ details path, so no `R3F_VISUAL_ALLOW_SELF_BASELINE` is needed):
```bash
npm run verify:r3f-visual-diff
```
- [ ] Threshold widening (only if a metric FAILs). The diff is current-vs-baseline; after regen the deltas are dominated by run-to-run nondeterminism (weather particles, vehicle palette). If a metric exceeds its budget, widen the offending entry in `scripts/verify-r3f-visual-diff.mjs` `metricThresholds` (L29-36) with a justifying comment, e.g.:
```js
const metricThresholds = {
  non_background_ratio: 0.1,
  bright_ratio: 0.16,
  dark_ratio: 0.18,
  // SP1 asymmetric carriageway widens the painted-marking area; widen from 0.2.
  marking_ratio: 0.26,
  luminance_stddev: 22,
  color_bucket_count: 80
};
```
  Re-run `npm run verify:r3f-visual-diff` after each edit until PASS. (Env knobs: `R3F_VISUAL_BASELINE_DETAILS` points the diff at an alternate baseline; `R3F_VISUAL_ALLOW_SELF_BASELINE=1` is for non-final self-baseline only — do **not** use it for the SP1 gate.)
- [ ] Commit:
```bash
git add scripts/baselines/r3f-dashboard-visual-baseline.json scripts/verify-r3f-visual-diff.mjs artifacts/r3f-dashboard-details.json artifacts/r3f-dashboard-desktop*.png artifacts/r3f-dashboard-mobile*.png artifacts/r3f-dashboard-webgl-off.png artifacts/r3f-dashboard-scenario-*.png
git commit -m "chore(r3f): regenerate SP1 visual baseline for asymmetric Gangnam geometry (D4)"
```

---

### Task D5: SP1 "done" gate (full verification sequence)

Final central validation matching spec §5.8. Run from the repo root **after D1–D4 and all sibling sections (A–C) have landed** and the baseline is regenerated. No code change — this task is the gate; it must show all-PASS before SP1 is claimed complete.

**Files:** none (validation only).

**Interfaces:** Consumes the whole SP1 change set; produces the green-gate evidence for SP1 completion.

**Steps:**

- [ ] Web unit/integration suite (includes D1 plate proxy, D2 signal placement, D3 lane alignment, and the Section A/B/C tests) — expected PASS:
```bash
cd apps/web && npx vitest run
```
- [ ] API suite (SUMO snapshot mapping, simulation snapshot, route tests retuned to the new truth) — expected PASS:
```bash
cd /home/chan/abc_project && npm run test:api
```
- [ ] Production build of the web app — expected exit 0:
```bash
npm run build:web
```
- [ ] R3F asset/compliance gate — expected PASS:
```bash
npm run verify:r3f-assets
```
- [ ] Dashboard render proof (regenerates artifacts; Playwright over `/dashboard`) — expected PASS:
```bash
npm run verify:r3f-dashboard
```
- [ ] Performance gate (draw-call / FPS budgets) — expected PASS:
```bash
npm run verify:r3f-performance
```
- [ ] Visual diff against the committed D4 baseline — expected PASS (`self_baseline=false`):
```bash
npm run verify:r3f-visual-diff
```
- [ ] Confirm SP1 acceptance from the evidence: single SSOT drives both stacks (no duplicated lane constants), vehicles sit on real lanes (D3 green), 강남대로 surface crosswalk absent + median bus lane present (Section B geometry tests green), all seven gates above PASS with the regenerated baseline. Record the command outputs in the SP1 completion note.
- [ ] Commit any artifact refresh produced by the gate runs (no source changes expected here):
```bash
git add artifacts/r3f-dashboard-details.json artifacts/r3f-dashboard-*.png
git commit -m "chore(r3f): SP1 gate artifacts — all verify gates green (D5)"
```

> Note: the umbrella `npm run verify` script also chains `verify:security` and `git diff --check`; the SP1 §5.8 list is the subset D5 runs. If invoking the umbrella, expect those two extra checks to run as well.
