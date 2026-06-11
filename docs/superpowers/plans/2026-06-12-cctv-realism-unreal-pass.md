# CCTV Realism Unreal Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated Seoul, New York, Paris, and London Unreal scenes read like credible traffic-control CCTV views with stronger city detail and assembled vehicles.

**Architecture:** Keep the deterministic JSON-profile + Unreal Python generation pipeline. Upgrade `generate_city_scene.py` with reusable primitive helpers, CCTV camera/framing actors, richer street/city prop packs, and multi-part vehicle assemblies. Generate all four maps, capture proof screenshots, and clean UE processes.

**Tech Stack:** Unreal Engine 5.7, PythonScriptPlugin, EditorScriptingUtilities, Unreal built-in primitives/materials, PowerShell bounded UE runners.

---

## Honesty boundary

This pass improves the scenes from procedural blockouts to CCTV-realism prototypes. Final production perfection still requires curated meshes/textures/decals/animation assets, but the scene should now clearly communicate: camera pole/CCTV angle, intersection identity, vehicles, markings, street furniture, buildings, and city-specific cues.

## File Structure

- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`
  - Add mesh helper for cube/cylinder/sphere where UE exposes built-in meshes.
  - Add CCTV tower/pole/camera body and map default camera actor.
  - Replace single-box vehicles with assembled vehicles: body, cabin, windshield, wheels, lights.
  - Add city-specific prop packs and road text/marking approximations.
- Generated: `renderer/unreal/SmartIntersection/Content/Maps/Generated/*_Intersection.umap`
  - Regenerated UE maps for all four cities.
- Generated/Modified: `renderer/unreal/SmartIntersection/Content/Generated/Materials/*.uasset`
  - Reused/generated simple color materials.
- Create: `docs/superpowers/plans/2026-06-12-cctv-realism-unreal-pass.md`
  - This plan.

---

### Task 1: CCTV view and camera identity

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`

- [ ] **Step 1: Add `spawn_cctv_rig`**

Create a visible CCTV pole near the intersection with a mast arm, black camera housing, lens, and small red status light.

- [ ] **Step 2: Update camera framing**

Use each city profile camera as the actual CCTV angle, lower/wider when needed, and label the actor `CCTV <display_name> Traffic Control View`.

- [ ] **Step 3: Add view target proof geometry**

Add a subtle “control-room overlay” frame in-world: thin dark bars and a city label marker so screenshots read like CCTV/infrastructure monitoring.

---

### Task 2: Assembled vehicles

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`

- [ ] **Step 1: Add `spawn_vehicle`**

Build cars from multiple primitives:
- lower body
- cabin
- windshield
- four wheel cylinders/boxes
- headlights/tail lights
- optional taxi/bus/accent roof sign

- [ ] **Step 2: Add buses and emergency/service variants**

Build buses as longer assemblies with window strips and colored panels. Add a few service/emergency cars for CCTV realism.

- [ ] **Step 3: Replace placeholder traffic**

Use `spawn_vehicle` and `spawn_bus` in `spawn_traffic`; keep counts bounded for RTX 3060 laptop performance.

---

### Task 3: City detail packs

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`

- [ ] **Step 1: Add road text/marking approximations**

Use thin cube bars/segments to create readable symbols: BUS lane panels, bike lane symbol, London yellow-box/LOOK direction cues, crosswalk stop bars.

- [ ] **Step 2: Add city-specific props**

- Seoul: dense signboards, subway canopy, bus shelter, smart kiosk, Korean-style overhead boards.
- New York: parking-sign clusters, hydrant, scaffolding frame, fire escapes, taxi accents.
- Paris: café tables/chairs, awnings, mansard roofs, balcony bands, tree grates.
- London: Belisha beacon, railings, red bus stop, double yellow curb lines, signal cabinets.

- [ ] **Step 3: Add richer façades**

Keep procedural but add ground-floor storefront bands, window grid variety, rooftop equipment, cornices/trim.

---

### Task 4: Generation and verification

**Files:**
- Generated: `renderer/unreal/SmartIntersection/Content/Maps/Generated/*.umap`
- Generated: `artifacts/unreal-*-window-proof.png`

- [ ] **Step 1: Syntax/precheck**

```bash
python3 -m py_compile renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py
npm run unreal:generate-city:dry-run -- -Profile seoul
```

- [ ] **Step 2: Generate all cities**

Run bounded UE command generation for `seoul`, `new_york`, `paris`, and `london`. Expected success marker: `Generated city intersection: ...`.

- [ ] **Step 3: Capture proof screenshots**

Open each generated map in UE, capture the Unreal window, then kill UE. Screenshots must be non-trivial and visually inspected.

- [ ] **Step 4: Full repo verification**

```bash
npm run verify
```

Expected: API tests pass, web tests pass, Next build succeeds, `git diff --check` passes.

- [ ] **Step 5: Commit/push**

```bash
git add docs/superpowers/plans/2026-06-12-cctv-realism-unreal-pass.md renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py renderer/unreal/SmartIntersection/Content/Maps/Generated renderer/unreal/SmartIntersection/Content/Generated

git commit -m "feat: add cctv realism unreal city pass"

git push
```
