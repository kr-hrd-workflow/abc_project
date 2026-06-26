# 강남역 사거리 (Gangnam Station Intersection) — Real-World Reconstruction Design

- **Date:** 2026-06-27
- **Status:** Design / spec (pre-plan)
- **Branch (current work):** `feat/r3f-signal-grounding-cctv` (a new branch will be cut for this rebuild)
- **Supersedes:** the "plausible generic Gangnam Teheran-ro CBD" plate direction in
  `docs/superpowers/specs/2026-06-25-r3f-gangnam-night-plate-hybrid-design.md` and the
  symmetric idealized intersection in `roadGeometry.ts`.

## 1. Context & Goal

The current simulation renders a **symmetric, idealized 4-way intersection** (±16 m box,
equal 18 m roads, 3 inbound / 2 outbound lanes per approach) with an imagegen background
plate that merely *evokes* a generic Gangnam Teheran-ro CBD canyon. The user rejected this:
the goal is a **faithful reconstruction of the real 강남역 사거리** (Gangnam Station
intersection, 강남대로 × 테헤란로 / 서초대로) — geometry, lane layout, traffic infrastructure,
landmarks, and signage — so the scene reads as the actual place, day and night, from both
the high-aerial operator view and the low-oblique CCTV view.

Because the real intersection is asymmetric and carries features the current model lacks,
this is **not a plate swap** — it is a multi-subsystem reconstruction touching the SUMO
network, the SUMO↔frontend bridge, R3F road geometry, lane-center math, camera calibration,
signals, plates, post-processing grade, and the compliance gate.

## 2. Locked decisions

These were decided with the user during brainstorming (2026-06-27):

1. **Target:** 강남역 사거리 (강남대로 N–S × 테헤란로 E / 서초대로 W).
2. **Fidelity:** reproduce the real place faithfully, **including real landmarks and signage**
   (literal real brand logos/storefronts). This requires relaxing the project's
   "no real brands/logos/store names" compliance gate. See §10. *(User's explicit decision,
   recorded with its IP risk.)*
3. **Scope:** full reconstruction — plate **and** road geometry, lane math, SUMO network,
   camera, and signals (not a visual-only re-skin).
4. **Reference source:** gathered from the web (URLs catalogued in §5).
5. **Time of day:** both **day and night**.
6. **Viewpoints:** both **operator-wide** (high aerial) and **operator-cctv** (low oblique).
7. **Build approach:** **truth-model-first** — build and validate the asymmetric
   geometry+SUMO backbone (SP1) before generating plates, to de-risk bridge desync and so
   plates are conditioned on the final geometry/cameras.

## 3. Verified real-world fidelity reference

All facts below were gathered and **adversarially fact-checked** by a research workflow
(8 agents, web sources, second-source verification). Confidence and corrections noted.

### 3.1 Road geometry (verified)

| Leg | Road | Axis | Lanes / width | Notes |
|---|---|---|---|---|
| North/South | **강남대로** | N–S | 왕복 10차로 (~50 m) | **Central median bus-only lane (중앙버스전용차로 / BRT)**, one per direction, with **island stops** offset from the crossing |
| East | **테헤란로** | E–W | 왕복 10차로 (~50 m) | Comparable in scale to 강남대로 (NOT narrower) |
| West | **서초대로** | E–W | 왕복 8차로 (~40 m) | The **only narrow leg**; 직결 (directly connected) through to 테헤란로 |

- It is a **clean orthogonal four-way (사거리)** with only a slight real-world bearing tilt
  (강남대로 ≈ NNW–SSE). We model it orthogonal (north = −z).
- **No surface pedestrian crosswalk across 강남대로** at the main junction — pedestrians use
  the underground arcade. (In 2023 Seoul added a rear-side crosswalk at the central BRT bus
  stop only, not a full junction crossing.) This is the intersection's most distinctive quirk.
- Signals are **Korean horizontal 4-section heads (가로형 4색등: red | yellow | green-left-arrow
  | green)** on overhead mast-arms with protected left turns (national standard; exact
  per-approach phase order not publicly documented — verify on 로드뷰/CCTV).
- 강남대로 centerline = the 강남구(east) / 서초구(west) administrative boundary.
- Junction center ≈ 37.4979° N, 127.0276° E.

**The defining asymmetry is therefore:** (a) the median BRT on 강남대로 only, (b) the narrow
서초대로 west leg, (c) the missing 강남대로 surface crosswalk — *not* "강남대로 wide vs 테헤란로
narrow" (a corrected premise).

Sources: ko.wikipedia 강남역 / 강남대로 / 테헤란로 / 서초대로; namu.wiki 테헤란로 / 서초대로;
Hankook Ilbo 2020 (no-crosswalk); news.seoul.go.kr/traffic/archives/510144 (2023 bus-stop
crosswalk); koroad.or.kr (signal standard).

### 3.2 Landmarks & signage (verified — for SP2/SP3)

- A dense **glass-and-steel commercial canyon**: mid-rise (~10–20 F) glass retail/office
  podiums on the four corners, taller 30–40 F+ towers behind (incl. 강남파이낸스센터/GFC east
  down 테헤란로). No single supertall sits ON a corner.
- **SW skyline:** 서초 삼성타운 three towers on 서초대로 — C동 삼성전자 ~200 m / 43–44 F (tallest,
  connected to the station), A동 삼성생명 ~150 m / 34 F, B동 32 F. The dominant west/SW vertical.
- **NE/east frontage (역삼동, exits 11–12):** the signature LED-billboard cluster — curved
  New Balance / 규정빌딩 screen 28 × 8 m (강남대로 412), tall portrait Iz Tower screen, Montessori
  screen, CGV 강남 (강남대로 438). **강남스퀘어 광장** between exits 11–12 holds a 3.8 m
  "I♡GANGNAM style" heart sculpture with LED floor lighting.
- **Media poles (G-Light):** 12.38 m digital pillars, ~30 m apart, on the east (강남구)
  sidewalk from 강남역 toward 신논현 (original 22; current G-Light remodel = 18).
- **Street trees:** 양버즘나무 (London plane) + 느티나무 (zelkova). **NOT ginkgo** (the ginkgo
  street is 신사동 가로수길, a different location).
- **NW (서초동, exits 9–10):** 삼성 강남 flagship (exit 10, since 2023), Megabox 강남 (exit 9),
  banks. **SE (역삼동, exits 1–2):** clinics (성형외과/피부과), hagwon, nightlife, underground mall.
- **Day vs night:** Day = bright beige/grey glass canyon with plane-tree canopy, central bus
  lane, billboards washed out. Night = official night-tourism spot; saturated LED billboards +
  media poles + neon Korean/English storefronts + traffic light trails + glowing heart sculpture.

Sources: ko/en.wikipedia 강남역 / 서초 삼성타운; namu.wiki 강남대로; gangnam.go.kr (강남스퀘어);
tkad.co.kr / motnt.kr (billboards); grandculture.net (media poles); visitkorea.or.kr (night).

**Note (corrected during verification):** the large-billboard strip (CGV 강남 438 etc.) runs
**NORTH** of the crossing toward 신논현, on the 강남구/east side — not south.

### 3.3 Camera / viewpoint references (verified)

- **Aerial (operator-wide), day:** Getty 4K drone clips of the exact junction — IDs
  `2192208322` (overhead, 2024-08-12) and `2192097906` (toward 신논현, fixes the N-bound axis).
- **Aerial, night:** iStock "Aerial View Gangnam At Night" collection (light-trail aerials;
  *verify each item is this junction* — flagged uncertain).
- **CCTV oblique (operator-cctv):** Seoul **TOPIS** (`topis.seoul.go.kr/map/openCctvMap.do`),
  **UTIC** (`utic.go.kr/map/map.do?menu=cctv`), ITS national center — real mast-mounted
  low-oblique cameras on 강남대로. A live frame needs an interactive/Playwright capture.
- **Day documentary:** 강남구 official photo archive (`gangnam.go.kr/board/photoarchives/6084`).
- **CCTV calibration heuristics (engineering, not Seoul-specific):** optimal mast 8–12 m
  (min 5, max 30), keep tracked vehicles within ~70 m, tilt down, centered over the stream
  (GoodVision / FHWA).

For accurate plan-view lane counts and the median BRT/island geometry, the authoritative
references are the **Naver/Kakao/Seoul aerial (항공뷰/스카이뷰)** tiles at the junction.

## 4. Project decomposition

Too large for one spec. Four sub-projects, each with its own plan → implementation cycle.

| # | Sub-project | Scope | Depends on |
|---|---|---|---|
| **SP1** | **Geometry & SUMO truth model** | Single source of truth (SSOT) for the asymmetric intersection; `roadGeometry.ts` + SUMO `.net/.rou` rebuilt from it; lane math, bounds, camera, tests synced; vehicles align on real lanes | — (backbone) |
| **SP2** | **Plates (4)** | Real 강남역 day/night × wide/cctv plates via imagegen, conditioned on SP1 cameras/structural guides; compliance gate relaxed; manifest + compliance entries | SP1 |
| **SP3** | **Signals & street furniture** | Korean 가로형 4색등 at real corner positions; median BRT island stops; media poles; Samsung Town skyline proxy; billboard proxies; plane/zelkova trees; heart sculpture silhouette | SP1 |
| **SP4** | **Grade, integration, validation** | Day/night grade retuned to the new plates; vehicle-alignment proof on real lanes; visual baseline regen; all gates green; browser proofs (day/night × wide/cctv) reviewed | SP1–3 |

This spec details **SP1** and outlines SP2–4. Each later sub-project gets its own
brainstorm/spec when reached.

## 5. SP1 — Geometry & SUMO truth model (detailed)

**Goal:** define the real 강남역 asymmetric intersection as data, drive both SUMO and R3F from
it, and prove vehicles align on the real lanes with all gates green — before any plate work.

### 5.1 Architecture — single source of truth (SSOT)

Introduce an `intersection-truth` definition consumed by both stacks:

- Frontend: `apps/web/components/r3f/intersectionTruth.ts` (typed constants).
- Backend/SUMO: a mirror (`apps/api/.../intersection_truth.py` or a shared JSON read by both)
  feeding a `.nod.xml`/`.edg.xml` → `netconvert` → `intersection.net.xml` build, replacing
  the current `netgenerate` 2×2 grid.

It defines, per approach and globally: lane counts (inbound/outbound), lane widths, median
bus-lane flag, road width, corridor length, crosswalk topology, signal phase/order, the
coordinate origin/axes, and the two camera calibrations. `roadGeometry.ts` constants and the
SUMO network both **derive** from this — so a lane-count mismatch is impossible by construction.

### 5.2 Coordinate & axis mapping + lane model

Scene origin = junction center `[0,0,0]`, 1 unit = 1 m, north = −z (unchanged). Mapping:

| Corridor | Real road | Axis | Lanes (proposed; verify on aerial) | Special |
|---|---|---|---|---|
| north (−z) | 강남대로 N (신논현) | N–S | inbound 5 / outbound 5 | innermost lane = median bus (SUMO `allow="bus"`) |
| south (+z) | 강남대로 S (양재) | N–S | 5 / 5 | median bus + island stop |
| east (+x) | 테헤란로 (삼성) | E–W | 5 / 5 | general |
| west (−x) | 서초대로 (이수) | E–W | **4 / 4** | only narrow leg |

- Lane width 3.6 m (Korean standard) retained → 강남대로/테헤란로 ≈ 36 m carriageway (~50 m with
  sidewalks), 서초대로 ≈ 29 m (~40 m) — matches the verified widths.
- The minor real bearing tilt (강남대로 NNW–SSE) is **simplified to orthogonal** for tractability
  and alignment stability. *(Approved.)*

### 5.3 Asymmetric geometry refactor (`roadGeometry.ts`)

- `ApproachCorridorSpec` already carries per-corridor `inboundLanes`/`outboundLanes` — set the
  asymmetric values per corridor instead of the global `INBOUND_LANE_COUNT`/`OUTBOUND_LANE_COUNT`.
- Replace the single global `ROAD_WIDTH_METERS` with a **per-corridor width**
  (`(inbound+outbound)*laneWidth`). Update every derived array to read corridor width:
  `LANE_DIVIDER_MARKINGS`, `CURB_SEGMENTS`, `SIDEWALK_SLABS`, `BUILDING_EDGE_BLOCKS`,
  `STAGE6E_CITY_EDGE_BLOCKS`, `QUEUE_ZONES`, `CROSSWALK_STRIPES`, `TURN_ARROW_MARKINGS`.
- `INTERSECTION_BOX` square (32 m) → a **per-axis rectangle**: E–W extent = 강남대로 carriageway
  (~36 m); N–S extent = max(테헤란로 ~36 m, 서초대로 ~29 m). All `HALF_INTERSECTION`-derived
  positions become axis-aware.
- **Median bus lane** road truth: a central red 중앙버스전용차로 surface on 강남대로 + island-stop
  footprints (detailed shelter geometry is SP3; SP1 owns the lane/surface truth only).

### 5.4 Faithful quirks (approved, faithful-by-default)

- **Remove the 강남대로 surface crosswalk:** drop the north/south crossing stripes. Keep
  crossings of 테헤란로 (E) and 서초대로 (W) plus the 2023 central-island rear crosswalk.
- Keep the 서초대로 (west) narrow-leg asymmetry.

### 5.5 SUMO ↔ R3F sync contract (the #1 risk)

- **Lane-ID convention** fixed in the SSOT: `{approach}_{in|out}_{laneIndex}`. The same strings
  are emitted by SUMO and parsed by `parseLaneDirection` / `parseLaneIndex` in
  `TrafficDensityLayer.tsx`.
- `getInboundLaneOffset(direction, laneIndex, laneCount)` is already lane-count-parameterised —
  call it with the **per-approach** count; add a median-bus index offset so the bus lane sits at
  the carriageway center.
- Update together in lockstep: SUMO `intersection.net.xml` (nodes/edges/lanes/junction/
  connections/TLS), `intersection.rou.xml` (new edge IDs/routes), `sumo_runtime.py`
  (`TLS_DIRECTION_ORDER`, lane parsing, `STOP_LINE_DISTANCE_METERS`, `QUEUE_THRESHOLD`),
  `simulation_snapshot.py` (`SNAPSHOT_BOUNDS_METERS`, fixture builders).

### 5.6 Camera recalibration

- Re-frame `operator-wide` (= `STAGE5_CAMERA`) and `operator-cctv` to the new box. Because
  `operator-wide` is shared by `STAGE5_CAMERA`, `STAGE5_TALL_VIEWPORT_CAMERA`, and
  `PLATE_CAMERA_ANGLES[0]`, change it in one place and re-verify all three. (Plates are
  re-rendered against these in SP2 — do not generate plates until cameras are final.)

### 5.7 Testing & visual-baseline migration

- Expand the `getInboundLaneOffset` test (currently only east lane 1) to all four approaches
  **with asymmetric lane counts** and the median-bus offset.
- Update `plateCameraCalibration.test.ts`, the `SignalHardware`/`CameraWeatherClutter` signal
  cue tests, and Python `test_sumo_snapshot_mapping.py` / `test_simulation_snapshot.py` /
  route tests to the new truth values.
- Regenerate `scripts/baselines/r3f-dashboard-visual-baseline.json` (final regen in SP4).

### 5.8 SP1 success criteria

- A single SSOT drives both SUMO and R3F; no duplicated lane constants.
- SUMO vehicles render in their **actual lanes** on the asymmetric geometry (강남대로 5/5 incl.
  median bus, 테헤란로 5/5, 서초대로 4/4) with no off-road float.
- `npm run test:web`, the API tests, `build:web`, `verify:r3f-assets`, `verify:r3f-dashboard`,
  `verify:r3f-performance`, and `verify:r3f-visual-diff` all pass (baseline updated).
- The 강남대로 surface crosswalk is absent; the median bus lane is present.

### 5.9 SP1 codebase touch-points & risks (from scope mapping)

Touch-points: `roadGeometry.ts`, `TrafficDensityLayer.tsx` (`getInboundLaneOffset`, lane
parsing, `INBOUND_LANE_VISUAL_BIAS_METERS`), `plateCameraCalibration.ts`,
`plateProxyGeometry.ts`, `SignalHardware.tsx` (`SIGNAL_PLACEMENTS`, proof signal);
`apps/api/networks/intersection.{net,rou,sumocfg}.xml`, `sumo_runtime.py`,
`simulation_snapshot.py` (+ domain schema), and the Python + TS tests above; visual baseline.

Risks: **bridge desync** (SUMO lane count vs R3F constants → off-lane vehicles); **route
breakage** (hardcoded edge IDs); **signal desync** (`TLS_DIRECTION_ORDER` indexing); **bounds
rejection** (`SNAPSHOT_BOUNDS_METERS`); **lane-naming** parser fallback; **camera/plate desync**
(operator-wide is multi-purpose); **mandatory baseline regen** (geometry shifts histogram).

## 6. SP2 — Plates (overview)

Render structural guides from the final SP1 geometry at both cameras (day + night framing),
gather the §5 web references, and imagegen four plates reproducing the real 강남역 (Samsung Town
SW skyline, NE LED billboards, media poles, plane trees, central bus lane, missing 강남대로
crosswalk). Add manifest + compliance entries; relax the compliance gate (§10). Plates remain
visual-only (never a truth surface). Browser-rendered proofs required.

## 7. SP3 — Signals & street furniture (overview)

Korean 가로형 4색등 at surveyed corner positions facing oncoming traffic; median BRT island
stops/shelters; G-Light media-pole proxies on the east sidewalk; Samsung Town three-tower
skyline proxy (SW); billboard emissive proxies (NE); London-plane/zelkova street trees; the
"I♡GANGNAM" heart-sculpture silhouette at 강남스퀘어 (NE). Detailed geometry; SP1 owns only the
road/lane truth these attach to.

## 8. SP4 — Grade, integration, validation (overview)

Retune day/night grade (`seamlessGrade.ts`) to the new plates; verify vehicle/signal alignment
on real lanes at both viewpoints; regenerate and commit the visual baseline; run the full gate
suite; capture and review browser proofs (day/night × wide/cctv) with the user.

## 9. Open questions (resolve via aerial before/while building SP1)

- Exact per-approach lane breakdown (through vs left-turn-pocket vs right-turn) — **count from
  Naver/Kakao 항공뷰**; the 5/5/5/4 split is a proposed starting point.
- Whether the median BRT physically runs through the junction box or breaks at it, and the
  precise island-stop positions relative to the stop line.
- Exact signal phase order/timing and per-approach mast-arm count (verify on 로드뷰 / TOPIS CCTV).
- Whether to keep strict orthogonality or apply the small real NNW tilt (currently: orthogonal).
- Current (2025–26) crosswalk state confirmation (still no main-junction crossing of 강남대로).

## 10. Compliance / legal decision

The user explicitly chose **literal real landmarks and signage** (Samsung, New Balance, CGV,
etc.). This conflicts with the existing `verify-r3f-assets.mjs` gate + `docs/compliance/
r3f-asset-licenses.md` rule that plates carry **no real brands/logos/store names** and abstract
signage. Plan: **relax the gate** to permit faithful reproduction of the real place, and record
in the compliance doc that this is a deliberate, user-authorized real-location reconstruction
with associated trademark/copyright risk (background visual only; never a truth surface). The
exact gate change is implemented in SP2. *(Documented here so the IP trade-off is explicit and
owned, per the team's compliance process.)*

## 11. Global success criteria

- The scene reads as the **actual 강남역 사거리** — asymmetric layout, median BRT, narrow 서초대로,
  missing 강남대로 crosswalk, Samsung Town SW skyline, NE LED billboards, media poles, plane trees
  — at day and night, from both the wide and CCTV viewpoints.
- SUMO vehicles ride the real lanes; signals match Korean 가로형 4색등 at the real corners.
- All gates green with regenerated baselines; browser proofs (day/night × wide/cctv) reviewed
  and accepted by the user.
