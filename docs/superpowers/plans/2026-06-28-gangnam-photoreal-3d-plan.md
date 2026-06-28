# Gangnam Photoreal 3D Digital Twin — Implementation Plan

> **For agentic workers:** implement task-by-task (subagent-driven). Each phase leaves the scene working.

**Goal:** a photorealistic, metric-accurate 3D 강남역 사거리 in R3F — vehicles/signals/buildings all from the
metric model (aligned by construction), photorealism via HDRI + PBR + post-FX. Spec:
`docs/superpowers/specs/2026-06-28-gangnam-photoreal-3d-digital-twin-design.md`.

**Architecture:** metric truth model → RoadSurfaceLayer (reuse) + 3D buildings + 3D signals + DynamicVehicleLayer
(reuse) under HDRI lighting + post-FX. AI scene-plate retired once 3D buildings exist.

**Tech:** React-Three-Fiber, three.js, @react-three/drei (`Environment`), @react-three/postprocessing
(Bloom/ToneMapping/SSAO), MeshPhysicalMaterial (glass). Next.js (non-standard — read node_modules/next/dist/docs
only if touching a Next API).

## Global Constraints
- Photorealism is a HARD requirement (user). Day AND night both photoreal.
- Everything metric: reuse `intersectionTruth.ts`/`roadGeometry.ts` (3.6 m lanes, asymmetric); vehicles via
  `getInboundLaneOffset` (headings north=180/south=0). No regressions to vehicle-lane alignment.
- Keep the scene WORKING after every phase (no empty intermediate scene → keep the plate buildings until P2 lands 3D buildings).
- All gates green each phase: `cd apps/web && npx vitest run`, then `npm run verify:r3f-dashboard`,
  `verify:r3f-visual-diff` (rebaseline only for intentional change), `verify:r3f-performance`, `verify:r3f-assets`,
  `verify:security`. Honor quality presets; instance where needed for perf.
- Commit per task with the standard Co-Authored-By / Claude-Session trailers.

---

## P1 — HDRI environment + lighting + post-FX (foundation)
**Files:** new `apps/web/components/r3f/SceneEnvironment.tsx` (drei `<Environment>` day/night + key/fill lights),
new `apps/web/components/r3f/ScenePostFX.tsx` (EffectComposer: ToneMapping[ACES/AgX] + Bloom + SSAO, quality-gated);
modify `SimulationScene.tsx` to mount them. KEEP `BackgroundPlateLayer` for now (temporary buildings).
- Add `@react-three/postprocessing` if not present (check package.json first).
- Day: bright HDRI + sun directional (shadows on); Night: city-night HDRI + warm fill, bloom emphasized.
- Validation: render day/night; confirm the 3D road/vehicles get realistic lighting + bloom on night lights;
  vehicles still aligned; gates green. Proof crops.

## P2 — Photoreal building system + retire scene-plate
**Files:** new `apps/web/components/r3f/BuildingLayer.tsx` (+ a `buildingFootprints.ts` data module with the
real 강남역 building volumes: 3 glass towers SW, 강남대로 glass canyon, side-street mid-rise). Mount in SimulationScene.
- Massing boxes at metric footprints; `MeshPhysicalMaterial` glass curtain-wall (reflect HDRI), window-grid
  texture/normal, night-emissive window grids; LED billboard emissive planes; media-pole columns; sidewalks + plane trees.
- Generate tileable facade/window/glass textures via imagegen if needed (like the asphalt texture).
- Once buildings read well: RETIRE `BackgroundPlateLayer` as the scene (replace with HDRI sky + a low-detail
  distant skyline ring). Keep generated plates only as reference.
- Validation: photoreal glass towers w/ reflections day+night; buildings occlude vehicles (true depth);
  no empty gaps; gates green. Proof crops.

## P3 — 3D signals + furniture + dynamic signal state
**Files:** rebuild signal hardware as 3D (reuse `SIGNAL_PLACEMENTS`/research): cantilever mast poles + horizontal
4-aspect heads facing each approach + **dynamic state lights** (red/yellow/green from `SceneSnapshot.signals`),
pedestrian signals; bus-stop island shelters; street lamps. Likely revive/replace `SignalHardware.tsx`.
- Validation: signals look real + show live state; vehicles unaffected; gates green. Proof crops.

## P4 — Material/day-night refinement + validation
- Refine road material under HDRI (roughness/wet-look night), tune day/night exposure/bloom, balance emissives.
- Regenerate dashboard proofs + visual baseline; full gate sweep; browser proofs (operator-wide + cctv, day + night)
  reviewed by the user. Update manifest/compliance + technote.

## Self-review
- Spec coverage: P1=env/lighting/post-fx+plate-retire(P2); P2=buildings; P3=signals/furniture/state; P4=refine/validate. Covered.
- Order keeps the scene working (plate kept through P1, retired in P2 after 3D buildings).
- Reuse preserved: geometry, RoadSurfaceLayer, vehicles, gates.
