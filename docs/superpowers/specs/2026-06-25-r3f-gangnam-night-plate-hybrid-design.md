# R3F Gangnam Night Plate Hybrid Renderer Design

Date: 2026-06-25
Status: Approved design for implementation planning

## Target Outcome

Replace the current "looks-flat / not-Gangnam" R3F background with a photoreal
**Gangnam Teheran-ro night-neon** look, without modeling and lighting a full
photoreal city in real time. The static city is supplied as an AI-generated
photoreal plate; only the SUMO-driven vehicles and pedestrians render in real
time on top. The result must read as a dense, high-rise, neon-lit Gangnam
arterial at night while preserving the existing SUMO truth boundary.

**Non-negotiable success criterion: the result must be photorealistic.** This is
the primary acceptance bar, above convenience or implementation cost. "Reads like
a game", visible toy/low-poly elements, or a pasted-on dynamic layer are
failures. Photorealism is judged on actual browser-rendered night frames against
the photoreal target reference, and the Seamless Dynamic Integration acceptance
criteria are part of this bar. If a chosen technique cannot reach photoreal
quality, escalate the technique (better plate, stronger reflections/lighting,
more post) rather than lowering the bar.

This design fixes the two failure modes identified by the user:

- **Look:** real-time WebGL PBR with hand-sourced assets reads like a game. A
  pre-generated photoreal plate sidesteps real-time lighting/material limits.
- **Asset supply:** modeling/sourcing a whole photoreal city is intractable.
  The plate removes that need; only a handful of vehicle meshes (already in the
  repo) are required as real 3D.

## User Decisions (locked)

- Approach **A — hybrid**: photoreal background plate + real-time dynamic layer.
- Camera: **fixed / few angles** (CCTV-style). No free orbit required.
- Plate source: **imagegen skill** (no Blender, no manual 3D art). Fully
  agent-producible with Claude + Codex.
- Background look: **Gangnam Teheran-ro, night neon** — dense high-rise glass
  towers, wide arterial, central bus-only lane, Korean signage, wet asphalt
  reflections. No real commercial brands, logos, or store names.
- Truth boundary preserved: the road surface and vehicles are real 3D aligned to
  the SUMO network; the generated plate supplies background look only and never
  invents vehicle/signal truth.

## Current Evidence

- The runtime R3F scene currently uses **no photoreal background plate**. The
  background is procedural: `EnvironmentLayer.tsx` paints solid hex colors,
  `ProceduralIntersection.tsx` draws the road/markings, and
  `SceneClutterLayer.tsx` adds procedural ambient proxies plus `Seoul` / `강남`
  public-place text. The disliked "rainy Korean street" image
  (`...PhotorealRoadKit/Textures/T_custom_imagegen_seoul_rainy_intersection_backplate.png`)
  is an archived imagegen experiment, not a wired runtime asset.
- `SimulationFrameSnapshot.vehicles` (and the planned `pedestrians`) in
  `apps/web/components/r3f/buildSceneSnapshot.ts` is the precise truth surface.
  Existing web tests guard against turning aggregate density into precise
  vehicle truth.
- Seoul vehicle meshes already exist as engine-agnostic OBJ under
  `archive/unreal/original/.../PhotorealRoadKit/Meshes/`:
  `stage7_seoul_passenger_sedan.obj`, `stage7_seoul_taxi.obj`,
  `stage7_seoul_bus.obj`, `stage7_seoul_emergency_van.obj`, plus road furniture.
- `npm run verify:r3f-assets` enforces a GLB/texture payload budget
  (last pass 11.95 MB / 25.00 MB).
- The imagegen skill (`$CODEX_HOME/skills/.system/imagegen`) supports
  reference-image-guided generation and mask-based edits — sufficient to
  condition generation on a structural guide image.
- Blender is **not installed** in this environment (`python3`, `node` only),
  confirming the no-Blender plate path is the right constraint.

## Architecture

Keep FastAPI/SUMO as the simulation truth and R3F as the renderer. R3F must not
invent live vehicles, pedestrians, or signal state.

```
[SUMO/TraCI] --frames--> [FastAPI] --SimulationFrameSnapshot--> [R3F scene]
   (truth)                (bridge)      vehicles[] / pedestrians[]
                                                |
                  +-----------------------------+-----------------------------+
                  v                             v                             v
          [Background layer]            [Road layer]                  [Dynamic layer]
          Gangnam night plate           real 3D road surface          SUMO vehicles/peds
          projected on proxy geo        aligned to SUMO network       (seoul GLB, realtime)
          occluders + shadow catcher    basis for vehicle placement   occluded + lit to match
          NOT truth (visual only)
```

Three layers, each with a single responsibility and independently testable:

1. **Background layer** — projects the imagegen Gangnam night plate onto coarse
   building proxy geometry. Provides depth/parallax and occlusion. Visual only;
   never a truth source.
2. **Road layer** — real 3D road surface geometrically matched to the SUMO
   network (existing road textures / road kit). The placement basis for all
   vehicles so cars always sit in correct lanes.
3. **Dynamic layer** — renders only `SimulationFrameSnapshot.vehicles[]` /
   `pedestrians[]` (existing Seoul GLB). Truth boundary unchanged.

**Invariant:** the background plate never produces vehicle or signal truth.
Vehicle positions come only from SUMO. Compatible with existing
aggregate-to-precise guard tests.

## Plate Generation & Proxy / Camera Calibration

A single coarse 3D proxy is reused for four purposes, which is what keeps
imagegen's geometric imprecision from leaking into vehicle placement.

1. **Proxy geometry (code, one-time)**
   - Build road surface + intersection shape from SUMO network coordinates.
   - Procedurally place coarse **building box proxies** at the corners (tall, to
     read as Teheran-ro high-rises). Untextured gray boxes.
   - Render the proxy from each fixed camera into a clean **structural guide
     image** (roads, lane lines, building silhouettes).

2. **imagegen generation (skill, Codex session)**
   - Input: the structural guide as the reference / edit base so lane and
     building positions are pinned.
   - Prompt: Gangnam Teheran-ro at night, high-rise glass office towers, neon
     signage, wet asphalt reflections, red central bus lane. Avoid list: real
     brands, company logos, store names, ad marks.
   - One plate per fixed angle (few fixed angles, so independent generation is
     acceptable).
   - Save to `apps/web/public/simulation/r3f/plates/` with a manifest recording
     license/provenance.

3. **Projection + occlusion (code, runtime)**
   - Camera-project each plate onto the proxy geometry so the surface is 3D, not
     a flat plane.
   - The same proxy writes depth (free from the render; no depth-estimation
     model needed) so vehicles are correctly occluded behind buildings.
   - **Camera calibration:** the guide render, the imagegen output, and the
     runtime camera share one projection (FOV/position), guaranteeing
     lane/plate/vehicle alignment.

4. **Fallback**
   - On plate load failure or WebGL failure, degrade to the existing procedural
     background (current behavior). The plate is a visual enhancement layer, not
     a hard dependency.

## Dynamic Layer Integration

- Convert existing `stage7_seoul_*.obj` (sedan, taxi, bus, emergency van) to GLB
  via a one-time script, joining the existing vehicle GLB directory.
- Drive position/heading from `SimulationFrameSnapshot` frames, reusing the
  existing `useInterpolatedSimulationFrame` interpolation.
- **Lighting match:** derive color temperature/direction from the night-neon
  plate and set HDRI/environment lighting so vehicles receive the same light as
  the background (prevents the pasted-on look).
- **Shadow catcher:** the road surface uses a transparent material that receives
  only vehicle shadows, grounding cars. For wet-asphalt looks, add a subtle
  reflection.

## Seamless Dynamic Integration (no pasted-on look) — hard requirement

The dynamic vehicles/pedestrians must NOT read as pasted on top of the plate.
This is the single biggest quality risk of compositing and is treated as a
first-class acceptance gate, not a nice-to-have. The night-neon look is the most
forgiving condition for this (darkness hides imperfections; reflections, bloom,
and head/taillights dominate and unify the frame), which is why it was chosen.

Every known cause of "awkward composite" gets an explicit countermeasure. The
core principle: **the dynamic layer passes through the same image-formation
pipeline as the plate** (same lighting, same color grade, same post).

| Awkwardness cause | Countermeasure |
|---|---|
| Lighting direction/color mismatch | Derive an HDRI/env light + dominant neon color cast from the plate; light all vehicles with it so they receive the scene's light. |
| Cars float (no contact) | Shadow catcher on the real 3D road; soft contact shadow + grounded ambient occlusion at wheel contact. |
| No wet-asphalt reflection | Planar/SSR reflection on the road so vehicles and neon reflect on the wet surface, matching the plate. |
| No emissive light at night | Emissive head/taillights with bloom and small light pools cast onto the road; this is the dominant night cue and the strongest realism lever. |
| Tone/exposure/white-balance mismatch | Render the dynamic layer, then apply the SAME tonemap (ACES), exposure, bloom, and color grade tuned to the plate so both share one filmic look. |
| Too-clean / sharpness mismatch | Match the plate's image character: subtle grain, mild bloom, optional depth-of-field, and motion blur on moving vehicles. |
| Perspective/scale mismatch | Shared camera calibration (FOV/position) + real-world vehicle dimensions so perspective matches the plate exactly. |
| Hard cutout edges / aliasing | TAA/SMAA anti-aliasing; softened contact shadows; no hard silhouettes. |
| Wrong occlusion (car in front of a building it should be behind) | Proxy-geometry depth occluders from the Plate Generation section. |

### Pedestrian strategy (highest uncanny risk)

Real-time photoreal humans are the most likely to look awkward, so manage them
deliberately rather than rendering many detailed close-up figures:

- Ambient/background crowd is **baked into the plate** (no separate geometry),
  keeping ambient density believable for free.
- Only **SUMO-truth pedestrians** render as separate moving entities, and they
  are favored at mid/far distance and small screen size where awkwardness is
  least visible. Use simple looping walk animation or animated billboard
  impostors rather than full high-detail rigged humans.
- Truth labels, layer names, telemetry, and data attributes for SUMO vs ambient
  pedestrians stay separate (consistent with the existing Seoul realism design).

### Acceptance criteria for seamlessness

- A reviewer comparing a still frame cannot trivially tell which elements are
  real-time vs plate (assessed via browser-rendered screenshots).
- Vehicles cast contact shadows and wet-road reflections that move with them.
- Head/taillight emissive + bloom are present and grounded on the road at night.
- Dynamic layer and plate share one tonemap/grade/exposure (verified by a
  documented post-processing config, not per-layer ad hoc settings).

## Verification & Truth Boundary

- **Truth-boundary tests:** assert the background plate produces no
  vehicle/pedestrian truth (extend existing aggregate-to-precise guard tests).
- **Source badge:** keep `simulation_snapshot_fixture` / `sumo_traci` / etc.
  source labels and stale/fallback indicators visible.
- **Asset budget:** `npm run verify:r3f-assets` must stay within budget after
  adding plates and converted GLBs.
- **Browser proof:** runtime evidence comes from actual R3F-rendered
  screenshots. Per the renderer technote, imagegen output is a visual target,
  not runtime truth — satisfied because the plate is background-only.
- **Seamlessness gate:** the Seamless Dynamic Integration acceptance criteria
  are checked on browser-rendered night frames before the look is considered
  done — shared tonemap/grade config, contact shadows, wet reflections, and
  emissive head/taillights present and grounded.
- **Focused tests:** existing `CameraWeatherClutter.test.tsx` etc. plus new unit
  tests for plate load, proxy geometry, projection, camera calibration, and the
  shared post-processing/lighting config wiring.

## Asset License / Compliance

- Record provenance for generated plates and converted GLBs in the asset
  manifest, following the existing `docs/compliance/r3f-asset-licenses.md`
  pattern.
- No real brands/store names/logos: enforced via the imagegen avoid list plus a
  post-generation review.

## Out of Scope (YAGNI)

- Free-orbit camera, novel-view synthesis, and multi-view-consistent plates
  across many angles (only the few fixed angles are supported).
- Gaussian splatting and GPU render streaming (rejected approaches B and D).
- Depth-estimation models (proxy geometry supplies exact depth).

## Components Summary

| Component | Responsibility | Depends on |
|---|---|---|
| Proxy geometry builder | SUMO coords -> coarse road + building boxes; guide render | SUMO network data |
| Plate manifest + assets | store generated night plates + provenance | imagegen output |
| Background layer (R3F) | project plate on proxy, write depth, occlude | proxy, plate |
| Road layer (R3F) | SUMO-aligned 3D road surface, shadow catcher | SUMO network, road textures |
| Dynamic layer (R3F) | render SUMO vehicles/peds, match lighting | SimulationFrameSnapshot, GLB |
| Seamless integration | shared tonemap/grade/post, contact shadows, wet reflections, emissive lights | plate, dynamic layer |
| OBJ->GLB converter | one-time Seoul vehicle conversion | archived OBJ meshes |
| Verification gates | truth-boundary, asset budget, browser proof | existing test harness |
