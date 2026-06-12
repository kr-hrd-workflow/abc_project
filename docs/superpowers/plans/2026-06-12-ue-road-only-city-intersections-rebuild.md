# UE Road-Only City Intersections Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Unreal Engine renderer from scratch for road-only photoreal city-specific intersections: Seoul, New York, Paris, and London.

**Architecture:** SUMO/TraCI remains the simulation truth source. Python TraCI bridge will later stream lane/signal/vehicle state into UE; this milestone builds only static photoreal road/intersection geometry and per-city visual language in UE. Unreal Engine 5 renders the scene; it must not become the simulation authority.

**Tech Stack:** Unreal Engine 5.7, UE Python Editor automation for map generation, future Python TraCI bridge, SUMO, FastAPI orchestration, Next/Vite web viewer later.

---

## Scope Boundary

- Destructive reset is limited to `renderer/unreal/SmartIntersection/**`.
- Preserve web/API/docs outside UE unless explicitly changed by a task.
- Preserve `package.json` scripts unless they need path updates; do not overwrite unrelated uncommitted user/agent files without review.
- First milestone: roads/intersections only. No vehicles, pedestrians, proof-strip props, landing imagery, or city skyline claims.
- Reference approval gate: do not build from map links alone. Maps/Street View define geometry only; every city profile needs approved image references showing road surface, lane markings, crosswalks, curbs, signals, bus/bike lanes, and material wear before UE generation. Reject event/crowd/map/building-only images.

## File Structure

- Recreate: `renderer/unreal/SmartIntersection/SmartIntersection.uproject` — minimal UE project descriptor.
- Recreate: `renderer/unreal/SmartIntersection/Config/DefaultEngine.ini` — project name and renderer defaults only; no generated secrets.
- Create: `renderer/unreal/SmartIntersection/SceneProfiles/cities/*.json` — per-city road/intersection visual parameters.
- Create: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py` — deterministic UE Python road-only map generator.
- Create: `renderer/unreal/SmartIntersection/Content/Python/road_city_style.py` — style constants and reusable placement functions.
- Create: `renderer/unreal/SmartIntersection/README.md` — renderer role, SUMO/TraCI boundary, generation commands.
- Create: `docs/references/city-road-intersection-visual-spec.md` — research summary and reference URLs.
- Create/modify: `scripts/generate-unreal-road-city.ps1` — PowerShell wrapper to generate one city map.
- Create/modify: `scripts/verify-unreal-road-rebuild.py` — semantic verifier for road-only maps and no old proof artifacts.

---

### Task 1: Reset UE renderer directory safely

**Files:**
- Delete/recreate: `renderer/unreal/SmartIntersection/**`
- Preserve: everything outside `renderer/unreal/SmartIntersection/**`

- [ ] **Step 1: Confirm git status**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
git status --short --branch
```

Expected: report dirty files before deletion.

- [ ] **Step 2: Remove only UE renderer directory**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
rm -rf renderer/unreal/SmartIntersection
mkdir -p renderer/unreal/SmartIntersection/{Config,Content/Python,SceneProfiles/cities,Content/Maps/Generated}
```

Expected: no files outside `renderer/unreal/SmartIntersection` are removed.

- [ ] **Step 3: Recreate minimal `.uproject`**

Create `renderer/unreal/SmartIntersection/SmartIntersection.uproject`:

```json
{
  "FileVersion": 3,
  "EngineAssociation": "5.7",
  "Category": "Simulation Renderer",
  "Description": "Road-only photoreal city intersection renderer. SUMO/TraCI is the simulation source of truth.",
  "Modules": [],
  "Plugins": [
    { "Name": "PythonScriptPlugin", "Enabled": true },
    { "Name": "EditorScriptingUtilities", "Enabled": true }
  ]
}
```

- [ ] **Step 4: Recreate minimal engine config**

Create `renderer/unreal/SmartIntersection/Config/DefaultEngine.ini`:

```ini
[/Script/EngineSettings.GeneralProjectSettings]
ProjectID=4F4D6F2C4D3847748F48A61D8C3C2026
ProjectName=Smart Intersection Road Renderer
Description=Road-only photoreal city intersection renderer. SUMO/TraCI remains the simulation authority.
CompanyName=abc_project
ProjectDisplayedTitle=NSLOCTEXT("SmartIntersection", "ProjectDisplayedTitle", "Smart Intersection Road Renderer")

[/Script/Engine.Engine]
NearClipPlane=3.000000
```

- [ ] **Step 5: Verify reset boundary**

Run:

```bash
git status --short
```

Expected: deletions/creations under UE folder only, except plan/reference/script files intentionally created.

---

### Task 2: Encode city road/intersection visual profiles

**Files:**
- Create: `renderer/unreal/SmartIntersection/SceneProfiles/cities/seoul.json`
- Create: `renderer/unreal/SmartIntersection/SceneProfiles/cities/new_york.json`
- Create: `renderer/unreal/SmartIntersection/SceneProfiles/cities/paris.json`
- Create: `renderer/unreal/SmartIntersection/SceneProfiles/cities/london.json`
- Create: `docs/references/city-road-intersection-visual-spec.md`

- [ ] **Step 1: Write Seoul profile**

Fields:

```json
{
  "id": "seoul",
  "display_name": "Seoul",
  "road_width_cm": 3000,
  "lane_width_cm": 330,
  "driving_side": "right",
  "asphalt": "dark charcoal asphalt with utility patches and tire polishing",
  "crosswalk": "wide zebra bars set after thick stop lines",
  "signature_features": ["red median bus lane", "yellow tactile paving", "overhead mast-arm signals", "Korean BUS ONLY markings", "wide arterial geometry"],
  "marking_tokens": ["BUS ONLY", "버스전용", "large white turn arrows", "yellow center separation"]
}
```

- [ ] **Step 2: Write New York profile**

```json
{
  "id": "new_york",
  "display_name": "New York",
  "road_width_cm": 2600,
  "lane_width_cm": 310,
  "driving_side": "right",
  "asphalt": "patched dark asphalt with utility cuts, manholes, tar seams, worn lane paint",
  "crosswalk": "continental ladder crosswalk with thick white bars",
  "signature_features": ["red BUS ONLY curb lane", "green protected bike conflict zone", "yellow taxi/traffic signal heads", "concrete slab sidewalks", "tight urban grid"],
  "marking_tokens": ["BUS ONLY", "ONLY", "bike symbols", "double yellow centerline"]
}
```

- [ ] **Step 3: Write Paris profile**

```json
{
  "id": "paris",
  "display_name": "Paris",
  "road_width_cm": 2300,
  "lane_width_cm": 300,
  "driving_side": "right",
  "asphalt": "dark asphalt with worn paint, compact junction geometry, stone curb edges",
  "crosswalk": "French zebra bars with compact curbside signal placement",
  "signature_features": ["curbside slim signal poles", "bike sas vélo box", "BUS lane text", "stone/granite curb islands", "European blue mandatory direction signs"],
  "marking_tokens": ["BUS", "bike box", "white arrows", "zebra crossing"]
}
```

- [ ] **Step 4: Write London profile**

```json
{
  "id": "london",
  "display_name": "London",
  "road_width_cm": 2400,
  "lane_width_cm": 300,
  "driving_side": "left",
  "asphalt": "charcoal asphalt with camber, utility cuts, worn curbside bus surfaces",
  "crosswalk": "controlled crossing with stop lines, tactile paving, and UK crossing cues",
  "signature_features": ["yellow box junction", "red bus lane", "double yellow curb lines", "cycle advanced stop box", "black signal heads on curbside poles"],
  "marking_tokens": ["BUS LANE", "LOOK LEFT", "LOOK RIGHT", "KEEP CLEAR", "yellow box grid"]
}
```

- [ ] **Step 5: Write reference document**

Include concise per-city specs plus URLs collected by the research agents. Do not embed copyrighted images.

---

### Task 3: Build deterministic road-only UE Python generator

**Files:**
- Create: `renderer/unreal/SmartIntersection/Content/Python/road_city_style.py`
- Create: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [ ] **Step 1: Implement style helpers**

Create functions for safe material creation, cube actor placement, road slab, lane lines, stop bars, crosswalk bars, curb islands, colored bus/bike lanes, and city-specific markings.

- [ ] **Step 2: Implement main generator**

Main generator reads `SMART_INTERSECTION_CITY_PROFILE`, clears current level, generates one road-only intersection, labels actors with positive tokens:

```text
RoadOnlyRenderer
SUMO_TRACI_READY
CityRoadSignature
```

It must not spawn vehicles, pedestrians, proof-strip assets, landing screenshots, or skyline props.

- [ ] **Step 3: Add city-specific road features**

- Seoul: red median bus lane, wide zebra crosswalks, yellow tactile paving strips, mast-arm signal placeholders.
- New York: continental ladder crosswalks, red BUS ONLY curb lane, green bike conflict lane, utility patch/manhole surfaces.
- Paris: compact geometry, bike sas vélo box, stone curb islands, slim curbside signal placeholders, BUS lane.
- London: left-side lane orientation, yellow box junction, red bus lane, double yellow curb lines, advanced cycle stop box.

---

### Task 4: Generation wrapper and semantic verifier

**Files:**
- Create: `scripts/generate-unreal-road-city.ps1`
- Create: `scripts/verify-unreal-road-rebuild.py`
- Optionally modify: `package.json` scripts only after checking current diff.

- [ ] **Step 1: Wrapper**

PowerShell wrapper finds UE 5.7 editor, sets `SMART_INTERSECTION_CITY_PROFILE`, and runs `-ExecutePythonScript` for one city.

- [ ] **Step 2: Verifier**

Verifier checks:

```text
- profiles exist for all four cities
- generator contains RoadOnlyRenderer and SUMO_TRACI_READY
- generated maps exist and are plausible size
- maps contain each city-specific road signature token
- maps do not contain old proof tokens: foreground proof, foreground plinth, PolyHaven CC0 VISIBLE
```

---

### Task 5: Generate four road-only maps and verify

**Files:**
- Create: `renderer/unreal/SmartIntersection/Content/Maps/Generated/*_RoadIntersection.umap`

- [ ] **Step 1: Run Seoul first**

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/generate-unreal-road-city.ps1 -Profile seoul
```

Expected: UE exits `0`, generated Seoul map exists and is visually plausible.

- [ ] **Step 2: Generate remaining cities**

Run same wrapper for `new_york`, `paris`, `london`.

- [ ] **Step 3: Run verifier**

```bash
python3 scripts/verify-unreal-road-rebuild.py
```

Expected: pass.

- [ ] **Step 4: Capture one proof screenshot**

Open Seoul or London road-only map in UE Editor, capture unobstructed viewport, inspect it. Do not commit obstructed proof images.

---

### Task 6: Final verification and commit

**Files:** all changed files.

- [ ] **Step 1: Run full validation**

```bash
npm run verify
python3 scripts/verify-unreal-road-rebuild.py
git diff --check
```

- [ ] **Step 2: Secret/noise scan**

Check text diff for generated secrets/tokens, especially UE config.

- [ ] **Step 3: Commit**

```bash
git add <intentional files>
git commit -m "feat: rebuild unreal road-only city intersections"
git push
```

---

## Self-Review

- Spec coverage: destructive reset is UE-only; four cities covered; first milestone is road-only; SUMO/TraCI authority boundary documented; UE5 renderer photoreal road features encoded.
- Placeholder scan: no TBD/TODO/fill-later instructions remain.
- Type consistency: profile fields are consistent across plan and generator expectations.
