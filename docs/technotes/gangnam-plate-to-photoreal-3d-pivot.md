# Gangnam 강남역 — AI-Plate Reconstruction → Photoreal 3D Pivot

Evidence note for the 2026-06-27/28 work that rebuilt the 강남역 사거리 look, hit the limits of an
AI background plate, and pivoted to a metric photoreal 3D digital twin. Branch `feat/gangnam-sp2-plates`.

## Decision

The smart-intersection dashboard must show 강남역 + live SUMO traffic + signals **photorealistically**
AND with vehicles **accurately on the lanes**. After building the AI-plate reconstruction and exhausting
fixes, we concluded a soft AI plate cannot satisfy both, and pivoted to building the near scene as
**metric 3D** (road + buildings + signals) reaching photorealism via **HDRI + PBR + post-FX**.
Spec: `docs/superpowers/specs/2026-06-28-gangnam-photoreal-3d-digital-twin-design.md`.

## What was built (AI-plate reconstruction)

- **SP1 — metric truth model (KEPT/reused):** `intersectionTruth.ts` + `apps/api/networks/intersection_truth.json`
  (강남대로 N/S 5in/5out + median bus, 테헤란로 E 5/5, 서초대로 W 4/4, 3.6 m lanes, asymmetric corridor
  lengths), `roadGeometry.ts`, SUMO net (`gangnam.{nod,edg,con,tll}.xml` → `intersection.net.xml`, 19-char TLS,
  median lane `allow="bus"`), bridge mapping in `sumo_runtime.py`. Merged to main earlier.
- **SP2 — 4 real-강남역 AI plates** (day/night × operator-wide/operator-cctv) via the built-in `image_gen`
  tool (chatgpt-auth, no API key), conditioned on `?guide=1` structural-guide renders. Locked look:
  EMPTY clean roads (overlay surface for SUMO vehicles), bidirectional central red **median busway** + island
  stops, **baked Korean signals** (near-side 전방신호기 on inverted-L cantilever + far-side repeater, 가로형
  4-aspect — from placement research), 4-way crosswalks + pedestrian signals (crosswalks added for
  pedestrian-responsive signal logic, overriding the real no-crosswalk quirk), road-surface lettering removed
  for day/night consistency. Mounted to the plate IDs; manifest/compliance relaxed to real-location reproduction.
  Commits incl. `8dfa812` (guides), `7502085` (mount).
- **SP3 reframe:** removed the redundant 3D `SignalHardware` meshes (signals baked in plate), restored
  `CROSSWALK_STRIPES` on all four approaches (`76219f8`).
- **SP4 alignment attempts:** plate display switched stretch→COVER fit + per-angle calibration offset,
  `operatorCctv` camera synced to the plate viewpoint, **fixture vehicle headings corrected** (N/S were
  reversed → vehicles faced backward AND bypassed lane placement; fixed north=180/south=0, `1b3dd6e`),
  textured **procedural road** `RoadSurfaceLayer` (asphalt texture + muted markings + muted busway,
  `81360ee`/`9254bc7`), plates img2img-**stripped to road-free** backdrops (`2efea1b`), rendered-asphalt
  widened to cover the road region (`35d55fa`), fixture vehicle span capped to the corridor (`cc3fe4e`).

## What failed and why

Even after all the above, the composite kept failing: vehicles not centered in the plate's painted lanes,
far vehicles "flying" over the plate's buildings, plate buildings not occluding 3D vehicles, empty
plate-asphalt gaps, and rendered road paving over plate sidewalks.

**Root cause:** a soft AI plate is **not metric** — its roads/lanes/buildings sit at arbitrary image
positions with no per-pixel depth, and differ per generated image and per viewpoint. Metric SUMO vehicles
(3.6 m lanes) and a metric 3D road cannot be made to register with it. Vehicle-side calibration could center
only one lane (non-uniform plate spacing); building occlusion needs true 3D depth the plate lacks. These are
structural, not tunable.

## Pivot (2026-06-28) — photoreal R3F 3D digital twin

Build the entire near scene as metric 3D so everything aligns by construction, and reach photorealism in the
R3F stack (no AI scene-plate):
- **REUSE:** metric geometry, the textured `RoadSurfaceLayer`, `DynamicVehicleLayer` (aligned, headings fixed),
  signal-state data, verify harness + gates.
- **NEW (P1→P4):** P1 HDRI image-based lighting + post-FX (bloom/tonemap/SSAO) + retire the AI scene-plate;
  P2 photoreal building system (massing at real footprints + PBR glass curtain-wall + window grids + night
  emissive + LED billboards + media poles); P3 3D signals (cantilever heads + dynamic red/green state) + furniture;
  P4 material/day-night refinement + validation (gates + browser proofs).
- **RETIRE:** `BackgroundPlateLayer` as the scene; the generated 강남역 plates are kept only as reference/material.
- Fallback if R3F's photoreal ceiling is insufficient: the archived UE pipeline.

## Status

Pivot spec committed (`cb5b174`). Photoreal-3D build (P1–P4) is the next implementation phase. The AI-plate
artifacts + procedural road remain in the branch (road reused; plate-as-scene retired).
