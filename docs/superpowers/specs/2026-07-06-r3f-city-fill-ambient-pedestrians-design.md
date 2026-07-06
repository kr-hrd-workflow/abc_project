# R3F City Fill And Ambient Pedestrians Design

- Date: 2026-07-06
- Status: Approved for implementation
- Branch: `codex/r3f-city-fill-pedestrians`
- User choice: B, city density plus separately labeled ambient pedestrians

## Target Outcome

Fill the currently sparse areas of the R3F dashboard city scene and render
visible, photoreal pedestrian life without taking over the teammate-owned SUMO
simulation deepening work.

The default `/dashboard` R3F scene should read as a denser Seoul/Gangnam urban
intersection. It may show sidewalk/background pedestrians immediately, but only
as ambient city context. SUMO-backed pedestrians remain rendered only from
`SimulationFrameSnapshot.pedestrians`.

## Current Evidence

- `SimulationScene` already mounts `BuildingLayer`, `GroundDressingLayer`,
  `StreetFurnitureLayer`, `RoadDetailProps`, `RoadSurfaceLayer`,
  `MarkingDecalLayer`, `DynamicVehicleLayer`, `DynamicPedestrianLayer`, and
  `SignalLayer`.
- `DynamicPedestrianLayer` already renders precise SUMO pedestrians from
  `sceneSnapshot.pedestrians`.
- `SimulationFrameSnapshot.pedestrians` exists in the web contract and is
  validated as `source: "sumo_person"`.
- `R3FSimulationViewport` currently hard-codes ambient pedestrian telemetry to
  zero.
- `SceneClutterLayer` contains old ambient pedestrian silhouettes, but it also
  includes unrelated clutter. Do not remount the whole layer for this task.
- Existing R3F rules keep the default scene on metric geometry plus
  `MarkingDecalLayer`. Do not reintroduce retired plate-era calibration.

## Product Boundary

This project supports operator decisions; it does not directly control real
traffic signals.

Do not describe ambient pedestrians as live, detected, SUMO-backed, or real CCTV
truth. They are visual city context only.

Keep two lanes separate:

- SUMO pedestrians:
  - source: `SimulationFrameSnapshot.pedestrians`
  - rendered by `DynamicPedestrianLayer`
  - telemetry: `sumo_pedestrian_count`
  - source label: `simulation_frame_snapshot`
- Ambient pedestrians:
  - source: project-generated ImageGen alpha sprite atlas
  - rendered by a new ambient layer
  - telemetry: `ambient_pedestrian_count`
  - source label: `ambient_background_proxy`

Do not synthesize precise pedestrians from queue, density, scenario family,
events, CCTV flow counts, or fixture fallback data.

## Design

### City Density

Use frontend-only density improvements:

1. Add more off-carriageway building massing in `buildingFootprints.ts`.
   Prefer existing photoreal facade/material paths where possible; any new
   visible filler building must avoid a flat toy/proxy read.
2. Add more sidewalk/periphery and street-level fill through existing
   `GroundDressingLayer` and `StreetFurnitureLayer` data patterns.
3. Keep all new urban fill out of the carriageway and crosswalk lanes.

### Ambient Pedestrians

Create a focused `AmbientPedestrianLayer` rather than remounting
`SceneClutterLayer`.

The layer should:

- export `AMBIENT_PEDESTRIAN_TRUTH_SOURCE = "ambient_background_proxy"`
- export `AMBIENT_PEDESTRIAN_ATLAS_URL`
- export a deterministic list of `AMBIENT_PEDESTRIAN_SPECS`
- place people only on sidewalks/plazas, not in active crosswalks
- render alpha sprite impostors from
  `apps/web/public/simulation/r3f/assets/sprites/pedestrian-commuter-atlas.png`
  plus contact shadows, not primitive capsule/head figures
- set `userData.sumoTruth = false`
- set `userData.truthSource = "ambient_background_proxy"`
- set `userData.renderMode = "imagegen_alpha_sprite_impostor"`
- be suppressed by `?roadonly=1`

For `viewpoint=cctv`, keep the same ambient truth boundary but use a CCTV
render profile that makes nearby sidewalk pedestrians easier to read from the
lower oblique camera. The CCTV profile may scale foreground/midground sprite
dimensions upward and use an upright, depth-writing 3D billboard render mode so
road markings do not draw over the pedestrians. It must not add SUMO pedestrian
truth, detector claims, or extra draw calls.

The atlas must be registered in `manifest.json`,
`docs/compliance/r3f-asset-licenses.md`, and
`apps/web/public/simulation/r3f/assets/textures/PROVENANCE.md`. It is generated
source material, not standalone proof; browser-rendered `/dashboard` artifacts
remain the proof surface.

### Telemetry

`R3FSimulationViewport` should derive:

- `data-r3f-sumo-pedestrian-count` from `sceneSnapshot.pedestrians.length`
- `data-r3f-sumo-pedestrian-source` from `sceneSnapshot.precisePedestrianSource`
- `data-r3f-ambient-pedestrian-count` from the ambient layer spec count
- `data-r3f-ambient-pedestrian-source` from
  `AMBIENT_PEDESTRIAN_TRUTH_SOURCE`
- `data-r3f-pedestrian-truth-separated="true"`

`SimulationCanvas` and `r3fTelemetry` already read the DOM attributes, so tests
should prove the updated source label flows into telemetry.

## Tests

Use TDD for implementation. Add or update focused tests for:

- ambient pedestrian render plan and userData truth labels
- imagegen atlas URL/cell assignment and sprite impostor render mode
- CCTV render profile keeps the same ambient count/source while increasing
  foreground/midground pedestrian legibility versus the operator-wide profile
- default scene mounts ambient pedestrians and roadonly mode suppresses them
- R3F viewport reports ambient count/source separately from SUMO count/source
- frame-backed SUMO pedestrians still increment only the SUMO count
- city fill data remains outside road/crosswalk safe zones
- existing building/ground/street-furniture tests remain green

## Validation

Required before claiming completion:

```bash
npm --workspace apps/web run test -- components/r3f/AmbientPedestrianLayer.test.tsx components/r3f/DynamicPedestrianLayer.test.tsx components/r3f/SimulationScene.test.tsx components/r3f/BuildingLayer.test.tsx components/r3f/GroundDressingLayer.test.tsx components/r3f/StreetFurnitureLayer.test.tsx components/r3f/SimulationCanvas.test.tsx
npm --workspace apps/web run test -- components/DashboardShell.test.tsx lib/r3fTelemetry.test.ts
npm run verify:r3f-assets
npm run verify:r3f-dashboard
```

If the browser/dev-server route is available, also capture a rendered dashboard
proof for `/dashboard` in desktop and one mobile viewport. Browser proof must
check that ambient people are visible while telemetry still separates SUMO and
ambient counts.

## Risks And Guardrails

- Do not touch backend SUMO simulation, TraCI mapping, or `live-input.v1`.
- Do not make ambient pedestrians look like detector/SUMO truth.
- Do not remount all of `SceneClutterLayer`.
- Avoid new runtime asset downloads unless separately approved. Built-in
  `image_gen` output is allowed for the ambient pedestrian atlas when registered
  with manifest/compliance/provenance evidence.
- Do not increase streetlight shadow caster count.
- Do not loosen existing R3F verifier gates.
- Do not commit without explicit user approval.
