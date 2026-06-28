# Gangnam Photoreal 3D Digital Twin — Design Spec

> Status: APPROVED (direction "B: R3F photoreal 3D, self-contained" — 2026-06-28).
> Supersedes the AI-plate-as-scene approach (SP1–SP4). Hard requirement from the
> user: **the simulation MUST look photorealistic.**

## 1. Problem & decision

The smart-intersection dashboard must show 강남역 사거리 + live SUMO traffic + signals to an
operator, looking **photorealistic** while every vehicle sits **accurately** on the road/lanes.

A free-floating AI background **plate is not metric** (its roads/lanes/buildings are at arbitrary
image positions, no per-pixel depth), so overlaying metric SUMO vehicles + a metric 3D road on it
produced structural failures that cannot be patched: vehicles off-lane, vehicles "flying" past the
road end over buildings, buildings failing to occlude vehicles, empty plate-asphalt gaps, road
paved over sidewalks. Root cause = mixing a non-metric image with a metric scene.

**Decision:** build the entire near scene as **metric 3D** (road, buildings, signals, furniture),
so everything aligns *by construction*, and reach photorealism with **HDRI image-based lighting +
PBR materials + post-processing** — self-contained in the existing R3F (three.js) stack. The AI
scene-plate is retired; the sky/horizon comes from an HDRI environment + a distant skyline.

## 2. Architecture

```
Metric truth model (reuse: INTERSECTION_TRUTH, roadGeometry — 3.6 m lanes, asymmetric corridors)
   │
   ├─ RoadSurfaceLayer (reuse: textured asphalt + lane/busway/crosswalk/arrow markings) — aligned
   ├─ Photoreal building system (NEW) — massing at real 강남역 footprints + PBR glass + windows + billboards
   ├─ 3D signals + street furniture (NEW) — Korean cantilever heads + dynamic state lights + trees + bus stops
   ├─ DynamicVehicleLayer (reuse) — SUMO vehicles at getInboundLaneOffset → sit on rendered lanes
   ├─ HDRI Environment + key/fill lighting (NEW) — realistic reflections/lighting, day & night
   └─ Post-FX (NEW) — tone mapping + bloom + SSAO (+ optional DoF)
```

Vehicles, lanes, signals, buildings all derive from the same metric model → no alignment/occlusion/gap class of bugs.

## 3. Components

### 3.1 Lighting & environment (biggest photoreal lever)
- drei `<Environment>` for image-based lighting → real reflections on glass/metal. Day: bright sky
  (preset or generated equirect HDRI); Night: city-night HDRI. Drives reflections + ambient.
- Sun/key directional light (day) with shadows; warm fill + many emissive sources (night).
- A low-detail distant skyline ring / far buildings for the horizon behind the near scene.

### 3.2 Photoreal buildings
- 3D building volumes positioned at the **real 강남역 footprints** (3 glass towers SW = Samsung-Town
  style, dense glass-and-steel canyon along 강남대로, mixed mid-rise on side streets).
- `MeshPhysicalMaterial` glass curtain-wall (reflectivity/roughness/transmission) reflecting the HDRI;
  window-grid via texture/normal map; **night: emissive window grids** (varied on/off).
- Large **LED billboards** as emissive animated/static planes on the frontages; tall glowing **media-pole**
  columns along 강남대로 (12 m). Sidewalks/curbs + plane trees.
- Facade/window/glass textures may be generated as tileable maps (imagegen) where helpful.

### 3.3 Signals & furniture (3D)
- Korean horizontal 4-aspect signal heads on inverted-L cantilever mast poles at the corners
  (per the verified placement research), facing each approach; **dynamic state lights** (red/yellow/
  green) driven by `SceneSnapshot.signals` (SUMO TLS). Pedestrian signals at crosswalk corners.
- Street trees, central bus-stop island shelters, street lamps.

### 3.4 Road (reuse + refine)
- Keep RoadSurfaceLayer (textured asphalt + markings, metric). Refine materials to sit under HDRI
  lighting (PBR roughness map, wet-look at night).

### 3.5 Post-processing
- ACES/AgX tone mapping, Bloom (night lights/billboards/signals), SSAO (contact shadows), optional
  subtle DoF. @react-three/postprocessing.

## 4. Day / night
One scene; switch HDRI environment + sun vs night lighting + emissive (windows/billboards/signals/lamps)
+ post-FX exposure. Both must look photoreal.

## 5. Reuse vs new
- REUSE: intersectionTruth/roadGeometry (metric), RoadSurfaceLayer (textured road), DynamicVehicleLayer
  (aligned vehicles), signal-state data flow, the verify harness + gates, plate-camera viewpoints.
- NEW: HDRI environment + lighting, photoreal building system, 3D signals + furniture, post-FX.
- RETIRE: BackgroundPlateLayer as the scene (AI plate). Keep the generated plates only as reference/material.

## 6. Success criteria
1. Reads as a **photorealistic** 강남역 사거리 (glass towers w/ real reflections, lit billboards/media
   poles, realistic road) — day AND night.
2. SUMO vehicles sit **accurately in lanes**; none float off-road or over buildings; buildings occlude
   correctly (true 3D depth); buses only on the median bus lane.
3. Live signals show state (red/green) on 3D heads.
4. All existing gates green (tests, assets, dashboard render, visual-diff [rebaselined], performance, security);
   browser proofs reviewed by the user, day + night, operator-wide + cctv.
5. Performance acceptable for the dashboard (instanced where needed; quality presets honored).

## 7. Decomposition (sub-projects → plan tasks)
- **P1 — Environment & lighting & post-FX + retire scene-plate.** HDRI env (day/night), lighting rig,
  post-FX pipeline; remove the AI plate as the scene (HDRI sky + distant skyline). Biggest photoreal lever first.
- **P2 — Photoreal building system.** Massing at 강남역 footprints + PBR glass + window grids + night
  emissive + LED billboards + media poles + sidewalks/trees.
- **P3 — 3D signals + furniture + dynamic signal state.** Cantilever heads + state lights + ped signals + bus stops.
- **P4 — Road/material refinement + day/night tuning + validation.** Refine road under HDRI; tune day/night;
  gates + browser proofs + user review.

Each P is independently testable and leaves the scene working.

## 8. Risks
- R3F photorealism ceiling (vs Unreal): mitigate with HDRI + PBR + post-FX + good textures; accept a high-end
  real-time look, not offline-render. If insufficient, the UE pipeline (archived) remains a fallback.
- Performance with glass/transmission + post-FX: use quality presets, instancing, capped reflection cost.
- Building accuracy to the REAL 강남역: use the earlier verified facts + reference images; procedural massing
  approximates real footprints (not survey-exact).
