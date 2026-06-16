# All-City Unreal Photoreal Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Unreal scaffold from visible primitive blockouts into distinct Seoul, New York, Paris, and London city-specific photoreal-ready intersection scenes.

**Architecture:** Keep SUMO/TraCI as the traffic truth source and Unreal as the presentation layer. Use deterministic JSON city profiles plus Unreal Python generation so every city can be regenerated, tested, and committed without manual editor-only state. This pass produces a high-fidelity procedural proof using built-in meshes/material instances; the later asset pass replaces placeholders with curated Quixel/Fab/custom assets.

**Tech Stack:** Unreal Engine 5.7, PythonScriptPlugin, EditorScriptingUtilities, Pixel Streaming, JSON city profiles, Next.js dashboard.

---

## Scope and honesty boundary

This plan targets a **photoreal-ready procedural pass**, not final AAA-quality production art. “Perfect” city realism requires licensed/curated assets, material scans, traffic props, sidewalks, signs, vehicles, pedestrians, lighting art direction, and manual UE polish. This pass makes each city visually distinct, lit, generated, and verifiable.

## File Structure

- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`
  - Responsibility: deterministic UE map generation; materials, lighting, geometry, labels, camera.
- Modify: `renderer/unreal/SmartIntersection/SceneProfiles/cities/*.json`
  - Responsibility: city-specific visual contracts and procedural knobs.
- Create/Modify: `renderer/unreal/SmartIntersection/Content/Maps/Generated/*_Intersection.umap`
  - Responsibility: generated UE maps for all four cities.
- Modify: `docs/unreal-procedural-cities.md`
  - Responsibility: documents realism level, generation command, and asset-upgrade path.
- Optional Modify: `scripts/generate-unreal-city.ps1`
  - Responsibility: stable generation entrypoint.

---

### Task 1: Generator material and lighting upgrade

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`

- [ ] **Step 1: Add safe material creation helper**

Implement a helper that creates a base `unreal.Material` asset with a constant base-color expression and reuses it on later runs. Avoid `set_material_instance_vector_parameter_value` on a base Material because UE rejects that API for non-instance assets.

- [ ] **Step 2: Add dynamic lighting settings**

Set directional light mobility to Movable and add sky/fill lights so the “lighting needs rebuild” warning is reduced or avoided for this procedural pass.

- [ ] **Step 3: Add city-specific materials**

Create per-city material palette:

- Seoul: wet charcoal asphalt, red bus-lane accent, cool glass/gray facades.
- New York: worn asphalt, green bike lane, yellow taxi accent, brick/stone facades.
- Paris: pale stone, cream limestone facades, dark green/black furniture.
- London: wet asphalt, yellow junction grid, muted red bus lane, brick/Portland-stone facades.

- [ ] **Step 4: Verify Python syntax**

Run:

```bash
python3 -m py_compile renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py
```

Expected: exit code 0.

---

### Task 2: City geometry richness pass

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`
- Modify if needed: `renderer/unreal/SmartIntersection/SceneProfiles/cities/*.json`

- [ ] **Step 1: Add road/detail primitives**

Generate lane dividers, stop bars, crosswalks, bus/bike lanes, curb strips, and median/sidewalk panels using profile parameters.

- [ ] **Step 2: Add city identity geometry**

Generate generic non-copyright landmark-like massing:

- Seoul: glass towers, subway canopy, red bus-priority lane.
- New York: brick blocks, green bike lane, yellow taxi-like vehicle placeholders.
- Paris: cream midrise facades, mansard roof caps, black balcony bands, tree rows/cafe awnings.
- London: brick blocks, yellow box junction, black poles/railings, red bus-lane strip.

- [ ] **Step 3: Add vehicles/pedestrian placeholders**

Use small scaled cubes/capsule-like placeholders with city accent colors. This is proof-of-layout only, not final asset art.

- [ ] **Step 4: Add labels and cameras**

Add per-city camera and visible text/actor labels for map verification.

---

### Task 3: Generate all four maps

**Files:**
- Generated: `renderer/unreal/SmartIntersection/Content/Maps/Generated/seoul_Intersection.umap`
- Generated: `renderer/unreal/SmartIntersection/Content/Maps/Generated/new_york_Intersection.umap`
- Generated: `renderer/unreal/SmartIntersection/Content/Maps/Generated/paris_Intersection.umap`
- Generated: `renderer/unreal/SmartIntersection/Content/Maps/Generated/london_Intersection.umap`

- [ ] **Step 1: Run Seoul generation**

```bash
npm run unreal:generate:seoul
```

Expected log: `Generated city intersection: Seoul Gangnam Arterial`.

- [ ] **Step 2: Run New York generation**

```bash
npm run unreal:generate:new-york
```

Expected log: `Generated city intersection: New York Midtown Grid`.

- [ ] **Step 3: Run Paris generation**

```bash
npm run unreal:generate:paris
```

Expected log: `Generated city intersection: Paris Boulevard Crossing`.

- [ ] **Step 4: Run London generation**

```bash
npm run unreal:generate:london
```

Expected log: `Generated city intersection: London West End Junction`.

---

### Task 4: Verification and proof capture

**Files:**
- Create/update screenshots under `artifacts/`
- Commit code/map changes.

- [ ] **Step 1: Verify generated maps exist and are non-trivial**

```bash
python3 - <<'PY'
from pathlib import Path
for city in ['seoul','new_york','paris','london']:
    p = Path(f'renderer/unreal/SmartIntersection/Content/Maps/Generated/{city}_Intersection.umap')
    print(city, p.exists(), p.stat().st_size if p.exists() else 0)
    assert p.exists() and p.stat().st_size > 20000
PY
```

- [ ] **Step 2: Open one or more maps in Unreal and screenshot**

Use bounded UE runs. Capture evidence, then close UE to reduce fan load.

- [ ] **Step 3: Run repository verification**

```bash
npm run verify
```

Expected: API tests pass, web tests pass, Next build succeeds, `git diff --check` succeeds.

- [ ] **Step 4: Commit and push**

```bash
git add renderer/unreal/SmartIntersection docs/unreal-procedural-cities.md

git commit -m "feat: upgrade unreal multi-city photoreal blockouts"

git push
```

---

## Remaining production-art work after this pass

- Replace procedural cubes with Quixel/Fab or custom city props.
- Add real road materials, decals, grime, wetness, lane text, curb textures.
- Add vehicle/pedestrian assets with animation-ready lanes.
- Add Pixel Streaming runtime level selection.
- Add per-city SUMO network alignment.
- Add cinematic cameras and performance budget checks on RTX 3060 Laptop GPU.
