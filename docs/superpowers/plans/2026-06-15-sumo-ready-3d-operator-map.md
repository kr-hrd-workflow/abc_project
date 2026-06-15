# SUMO-Ready 3D Operator Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move SmartIntersection from polished static city render proofs into one large, SUMO-ready, 3D operator simulation viewport where traffic volume, lanes, signals, and vehicle movement can be read clearly.

**Architecture:** SUMO/TraCI remains the traffic truth source, FastAPI exposes normalized renderer snapshots, and Unreal renders the operator viewport through `ATrafficSimulationController` and Pixel Streaming. The first implementation slice must prove scale and lane readability in one map before adding city variants, generated vehicle/signal asset packs, or full multi-city motion.

**Tech Stack:** Unreal Engine 5.7, UE Editor Python, C++ `SmartIntersectionRuntime`, SUMO/TraCI, FastAPI renderer snapshots, Next.js dashboard Pixel Streaming iframe, Image Gen for reference/texture direction only.

---

## Current Diagnosis

The current road-only city renders are useful visual proof, but they are still too narrow for traffic-volume judgment:

- Queue length and congestion are hard to read because the intersection frame is demo-sized.
- Some city road lines and asphalt markings feel broken or card-like.
- Backplates still carry too much visual responsibility and should be replaced near the traffic-reading area with real 3D context.
- City-specific signals and vehicles are needed, but they should become normalized 3D assets that SUMO can drive, not flat image cards.
- The next product risk is motion and simulation truth, not another static screenshot polish pass.

## Non-Negotiable Boundaries

- SUMO/TraCI is truth; FastAPI orchestrates; Unreal renders.
- Do not connect to real traffic signal controllers.
- Do not modify landing-page imagery or landing layout unless explicitly requested.
- Do not add proof strips, plinths, asset lineups, or debug props to production maps.
- Do not treat script success as visual success. Human visual inspection remains a hard gate.
- Image Gen outputs may guide city-specific vehicles, signal heads, textures, and reference sheets, but moving simulation objects must be 3D meshes/actors with stable pivots, bounds, and lane alignment.
- Build one believable operator map first; only then expand to all cities.

## Implementation Stages

### Stage 1: Large SUMO-Ready Operator Map

Build one large operator intersection map, preferably `smart_intersection_rebuild`, with enough road length to show traffic pressure.

Deliverable:

- A generated Unreal map at `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild.umap` or an explicitly named first-city equivalent.
- Four approaches with readable lane structure, turn lanes, stop bars, crosswalks, medians/curbs/sidewalks, and queue space for at least 20-40 visible vehicles.
- Road markings built as Unreal geometry, decals, or spline-driven meshes, not as fragile 2D backplate paint.
- No 2D card/backplate artifacts inside the traffic-reading zone.
- A fresh proof capture showing the whole operator-view intersection.

Stage 1 intentionally does **not** need final city-specific vehicles, all four cities, or live SUMO movement. It must prove the map scale and visual grammar can support simulation.

### Stage 2: 3D Foreground And City Context Replacement

Replace traffic-area backplates with limited 3D context:

- sidewalks, curbs, medians, traffic cabinets, CCTV poles, mast arms, street lights, guardrails, signs, nearby low-rise facade blocks
- low-detail 3D distant facades only where needed
- distant cards allowed only outside the traffic-reading zone

Success means the operator can read the intersection without seeing billboard/card composition in the road, signal, or queue area.

### Stage 3: City-Specific Signal And Vehicle Asset Pipeline

Use Image Gen to produce reference sheets and texture direction for each city, then convert the direction into normalized 3D asset kits:

- signal heads and poles per city
- passenger vehicles, buses, taxi/emergency variants
- material variants for Seoul, New York, Paris, and London
- UE mesh pivots aligned for lane placement and SUMO heading updates

Image Gen is reference/input, not the runtime object format.

### Stage 4: SUMO/TraCI Motion Binding

Connect simulated motion to Unreal:

- SUMO lane/vehicle/signal state is normalized by FastAPI into renderer snapshots.
- `ATrafficSimulationController` applies snapshot state to vehicle actors, signal materials, queue markers, and pedestrian/emergency indicators.
- Two or more snapshots must visibly change vehicle positions and signal phase.
- Fixture mode remains available; live SUMO mode is only marked complete after real local runtime execution passes.

### Stage 5: Pixel Streaming And Dashboard Integration

Expose the working operator viewport through the existing dashboard stream slot:

- `NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1`
- `npm run unreal:home`
- `/dashboard` iframe shows the Unreal stream
- simulation state is inspectable without claiming real-world control

### Stage 6: Multi-City Expansion

After Stage 1-5 pass on one map:

- expand profiles to Seoul, New York, Paris, and London
- keep shared SUMO lane semantics stable
- swap city-specific road markings, signals, vehicles, and nearby context
- rerun per-city capture and simulation smoke checks

## Stage 1 Detailed Task Plan

### Task 1: Establish Clean Stage-1 Scope

**Files:**
- Read: `AGENTS.md`
- Read: `docs/agents/simulator-builder-agent.md`
- Read: `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- Read: `docs/technotes/ue57-doc-digest/actors.txt`
- Read: `docs/technotes/ue57-doc-digest/static_meshes.txt`
- Read: `docs/technotes/ue57-doc-digest/materials.txt`
- Read: `docs/technotes/ue57-doc-digest/cinematic_cameras.txt`
- Inspect: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Inspect: `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/`

- [ ] **Step 1: Create an isolated branch/worktree from current `main`**

Use a branch name such as:

```bash
codex/sumo-ready-operator-map-stage1
```

- [ ] **Step 2: Run the precheck**

```powershell
npm run unreal:precheck
```

Expected: Unreal Editor, Epic Launcher, Windows Node, and npm are detected.

- [ ] **Step 3: Confirm dirty scope**

```powershell
git status --short --branch
```

Expected: report any unrelated files before editing. Do not stage `plan.md` unless the user explicitly asks.

### Task 2: Add A Large Operator Map Generator Path

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Optionally modify: `renderer/unreal/SmartIntersection/SceneProfiles/`

- [ ] **Step 1: Add an operator-map mode or profile**

Add a clear generator entry point for a large operator map. Acceptable names:

```text
smart_intersection_rebuild
operator_stage1
seoul_operator_stage1
```

The map must include actor labels containing:

```text
OperatorStage1
SUMOReadyLargeIntersection
TrafficReadableQueueZone
```

- [ ] **Step 2: Build the large road layout**

Create a four-way intersection with:

- approach length sufficient for at least 20-40 vehicle queue markers
- 3-5 lanes on major approaches where appropriate
- turn lanes and stop bars
- crosswalks set back from stop lines
- medians, curbs, sidewalks, and signal islands
- a CCTV/operator camera view that frames the whole traffic-reading area

- [ ] **Step 3: Rebuild markings as geometry/decal layers**

Do not rely on backplate paint for:

- lane dividers
- turn arrows
- stop bars
- crosswalk bars
- bus/bike lane fields
- yellow box or queue-box markings

Each should be separately placeable and visually inspectable.

### Task 3: Add Stage-1 Verification

**Files:**
- Create or modify: `scripts/verify-sumo-ready-operator-map-stage1.py`
- Optionally modify: `package.json`

- [ ] **Step 1: Add a semantic verifier**

The verifier must check:

- generated map exists
- generated map is plausibly large enough
- map bytes contain `OperatorStage1`
- map bytes contain `SUMOReadyLargeIntersection`
- map bytes contain `TrafficReadableQueueZone`
- map bytes do not contain proof-strip tokens:

```text
foreground proof
foreground plinth
PolyHaven CC0 VISIBLE
```

- [ ] **Step 2: Add an npm script only if useful**

Acceptable script:

```json
"verify:operator-map-stage1": "python3 scripts/verify-sumo-ready-operator-map-stage1.py"
```

Do not add broader tooling churn.

### Task 4: Generate And Capture The First Map

**Files:**
- Generated: `renderer/unreal/SmartIntersection/Content/Maps/Generated/*operator*.umap`
- Generated: `artifacts/unreal-operator-map-stage1-*.png`

- [ ] **Step 1: Generate the operator map**

Use the existing PowerShell/Unreal generation route where possible:

```powershell
npm run unreal:generate-city -- -Profile seoul
```

If a new profile/mode is required, document the exact command in this plan before running it.

- [ ] **Step 2: Capture a proof image**

Capture from a camera that shows the entire traffic-reading area. The proof image must not be cropped into a small road card or facade closeup.

- [ ] **Step 3: Human visual inspection**

Reject the capture if:

- vehicles would not fit lane scale
- queue length cannot be judged
- road markings look broken or painted onto a backplate
- backplate/card artifacts are visible in the road, signal, or queue area
- the frame looks like a proof/debug asset lineup

### Task 5: Stage-1 Validation And Handoff

**Files:**
- Modify if needed: this plan file
- Generated proof artifacts

- [ ] **Step 1: Run focused validation**

```powershell
npm run unreal:precheck
python3 scripts/verify-simulator-builder-agent.py
python3 scripts/verify-complete-simulation-renderer.py
python3 scripts/verify-sumo-ready-operator-map-stage1.py
git diff --check
```

If Windows `python3` resolves incorrectly, use:

```powershell
C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe
```

- [ ] **Step 2: Report remaining gates honestly**

Do not mark these complete in Stage 1 unless actually implemented and verified:

- city-specific vehicle/signal asset generation
- live SUMO vehicle movement
- Pixel Streaming dashboard proof
- all-city expansion

## Stage 1 Verification Status - 2026-06-15

**Verdict:** `DONE_WITH_CONCERNS`, not perfect.

Stage 1 has real implementation artifacts, but it is not clean enough to call "perfectly complete" because one documented npm verifier path fails on this Windows checkout and the human visual gate still finds operator-readability issues in the proof capture.

Evidence that passed:

- Generated map exists: `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild.umap`, 688729 bytes.
- Fresh proof exists: `artifacts/unreal-operator-map-stage1-proof.png`, 1600x900, 408795 bytes.
- Image reference exists: `artifacts/imagegen/sumo-ready-operator-map-stage1-reference.png`, 1536x1024, 2899322 bytes.
- Manifest exists: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage1_manifest.json`.
- Generator contains Stage 1 mode and actor/token evidence: `SMART_INTERSECTION_OPERATOR_STAGE1`, `OperatorStage1`, `SUMOReadyLargeIntersection`, `TrafficReadableQueueZone`, `QueueCapacity_40`, and runtime-controller evidence.
- `npm run unreal:precheck` passed and found UE 5.7, Epic Launcher, Windows Node, and npm.
- Fallback Python validation passed:

```powershell
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-sumo-ready-operator-map-stage1.py
```

Observed output:

```text
IMAGEGEN REFERENCE_CHECK_PASS size=(1536, 1024) bytes=2899322 mean=73.55 stddev=37.88
GENERATOR_STAGE1_TOKEN_CHECK_PASS
MAP_STAGE1_TOKEN_CHECK_PASS bytes=688729 manifest=renderer\unreal\SmartIntersection\GeneratedProof\smart_intersection_rebuild_operator_stage1_manifest.json
OPERATOR PROOF_CHECK_PASS size=(1600, 900) bytes=408795 mean=205.60 stddev=92.41
SUMO_READY_OPERATOR_STAGE1_PASS
```

- `verify-simulator-builder-agent.py` passed with the same fallback Python runtime.
- `verify-complete-simulation-renderer.py` passed with the same fallback Python runtime.
- `git diff --check` passed.

Evidence that blocks a perfect Stage 1 verdict:

- `npm run verify:operator-map-stage1` fails because the package script invokes `python3`, and this Windows checkout resolves `python3` to an unusable launcher that exits with only:

```text
Python
```

- Human visual inspection of `artifacts/unreal-operator-map-stage1-proof.png` finds a readability issue: the proof is heavily overexposed and the central median/island geometry reads as thick black bars crossing the operator view. The map proves broad scale and queue placeholders, but it does not yet satisfy the plan's "human visual inspection remains a hard gate" standard at final-quality level.

Stage 1 carryover required before Stage 2 execution:

- Fix or bypass the broken `python3` npm verifier path.
- Reduce proof overexposure and make the central median/island geometry read as realistic lane/median infrastructure, not black obstruction bars.
- Recapture `artifacts/unreal-operator-map-stage1-proof.png`.
- Re-run the Stage 1 semantic verifier and repeat human visual inspection.

## Stage 2 Detailed Task Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace traffic-area image/card dependence with limited 3D operator context while preserving the large SUMO-ready intersection, queue readability, and Unreal-as-renderer-only boundary.

**Architecture:** Keep Stage 1 road and queue semantics as the base. Add a Stage 2 generation mode that places real Unreal actors for curbs, sidewalks, medians, signal support furniture, CCTV/street-light/sign hardware, guardrails, traffic cabinets, and nearby low-rise facade blocks. Distant cards are allowed only outside the traffic-reading zone and must be excluded from the Stage 2 map's semantic verifier.

**Tech Stack:** Unreal Engine 5.7, UE Editor Python for map generation/capture automation, Static Mesh Actors and material instances for world geometry, C++ `SmartIntersectionRuntime` for runtime snapshot actors, SUMO/TraCI and FastAPI as future truth/orchestration sources, Pixel Streaming later.

---

### Stage 2 File Map

**Read before editing:**

- `AGENTS.md`
- `docs/agents/simulator-builder-agent.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- `docs/technotes/ue57-doc-digest/python_editor.txt`
- `docs/technotes/ue57-doc-digest/actors.txt`
- `docs/technotes/ue57-doc-digest/levels.txt`
- `docs/technotes/ue57-doc-digest/static_meshes.txt`
- `docs/technotes/ue57-doc-digest/materials.txt`
- `docs/technotes/ue57-doc-digest/lights.txt`
- `docs/technotes/ue57-doc-digest/post_process.txt`
- `docs/technotes/ue57-doc-digest/cinematic_cameras.txt`
- `docs/technotes/ue57-doc-digest/pixel_streaming.txt`

**Modify:**

- `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- `scripts/generate-unreal-city.ps1`
- `package.json`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`

**Create:**

- `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage2.py`
- `scripts/capture-unreal-operator-map-stage2.ps1`
- `scripts/verify-sumo-ready-operator-map-stage2.py`

**Generated artifacts:**

- `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_stage2.umap`
- `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage2_manifest.json`
- `artifacts/unreal-operator-map-stage2-proof.png`

### Task 0: Close Stage 1 Carryover Gates

**Files:**
- Modify if needed: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Modify if needed: `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage1.py`
- Modify if needed: `scripts/verify-sumo-ready-operator-map-stage1.py`
- Modify if needed: `package.json`

- [ ] **Step 1: Re-run the exact current Stage 1 checks**

Run:

```powershell
npm run unreal:precheck
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-sumo-ready-operator-map-stage1.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-simulator-builder-agent.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-complete-simulation-renderer.py
git diff --check
```

Expected: all pass. If any fails, fix Stage 1 before touching Stage 2.

- [ ] **Step 2: Fix the broken npm verifier path**

Current failing command:

```powershell
npm run verify:operator-map-stage1
```

Observed failure:

```text
Python
```

Acceptable fix: change `verify:operator-map-stage1` to invoke a working repo-level Python runner or document the fallback command in `package.json` comments is not enough. The final validation command for Stage 1 must run from npm or the plan must explicitly mark the npm alias unsupported on Windows.

- [ ] **Step 3: Fix the Stage 1 visual proof before Stage 2**

Use the current visual failure as the acceptance target:

- road surface should not be blown out to white
- central median/island pieces should not read as thick black obstruction bars
- lane markings and stop bars should remain visible at the operator camera distance
- queue placeholders should still show at least 20-40 visible vehicle positions

Re-run:

```powershell
npm run unreal:capture:operator-stage1
```

Expected: `artifacts/unreal-operator-map-stage1-proof.png` is recaptured and passes human visual inspection.

### Task 1: Add A Stage 2 Generation Mode

**Files:**
- Modify: `scripts/generate-unreal-city.ps1`
- Modify: `package.json`
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [ ] **Step 1: Add the PowerShell switch**

Add a switch next to `OperatorStage1`:

```powershell
[switch]$OperatorStage2
```

Set the environment variable:

```powershell
if ($OperatorStage2) {
  $env:SMART_INTERSECTION_OPERATOR_STAGE2 = '1'
} else {
  Remove-Item Env:\SMART_INTERSECTION_OPERATOR_STAGE2 -ErrorAction SilentlyContinue
}
```

Expected: Stage 2 can be generated without changing the existing city-profile path.

- [ ] **Step 2: Add npm scripts**

Add scripts:

```json
"unreal:generate:operator-stage2": "npm run unreal:generate-city -- -Profile seoul -OperatorStage2",
"unreal:capture:operator-stage2": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-operator-map-stage2.ps1",
"verify:operator-map-stage2": "python3 scripts/verify-sumo-ready-operator-map-stage2.py"
```

If `python3` is still broken on Windows after Task 0, use the same fixed repo-level Python runner for both Stage 1 and Stage 2 verifier scripts.

- [ ] **Step 3: Add generator mode detection**

In `RoadOnlyRenderer.__init__`, add:

```python
self.operator_stage2 = os.environ.get("SMART_INTERSECTION_OPERATOR_STAGE2") == "1"
```

Map naming rule:

```python
if self.operator_stage2:
    return "/Game/Maps/Generated/smart_intersection_rebuild_stage2"
if self.operator_stage1:
    return "/Game/Maps/Generated/smart_intersection_rebuild"
```

Expected: Stage 2 writes to a separate map until visually accepted, avoiding accidental overwrite of Stage 1 evidence.

### Task 2: Define The Stage 2 Context Contract

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [ ] **Step 1: Add explicit zone constants**

Add constants near the Stage 1 material/layout constants:

```python
OPERATOR_STAGE2_TRAFFIC_ZONE_HALF_EXTENT = 1840
OPERATOR_STAGE2_CONTEXT_RING_INNER = 2100
OPERATOR_STAGE2_CONTEXT_RING_OUTER = 5200
OPERATOR_STAGE2_REQUIRED_TOKENS = [
    "OperatorStage2",
    "Stage2ContextGeometry",
    "NoTrafficZoneBackplate",
    "TrafficReadableQueueZone",
]
OPERATOR_STAGE2_FORBIDDEN_MAP_TOKENS = [
    "photo_backplate",
    "road_card",
    "ImageGen",
    "foreground proof",
    "foreground plinth",
    "PolyHaven CC0 VISIBLE",
]
```

Expected: the generator and verifier share the same naming intent.

- [ ] **Step 2: Define what may enter the traffic-reading zone**

Use this rule in function comments and verifier text:

```text
Inside +/-1840 cm of the intersection center, only roads, markings, curbs, medians,
signal equipment, queue placeholders, CCTV/operator equipment, and safety hardware
may appear. Building facades and distant cards must start outside the zone.
```

Expected: Stage 2 context cannot hide lanes, queues, or signal heads.

### Task 3: Add Stage 2 Materials Without Backplate Dependence

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [ ] **Step 1: Add material names**

Add Stage 2 materials to the operator material set:

```python
OPERATOR_STAGE2_MATERIAL_NAMES = [
    "operator_context_concrete",
    "operator_context_curb",
    "operator_context_guardrail",
    "operator_context_facade_warm_gray",
    "operator_context_facade_cool_gray",
    "operator_context_window_dark",
    "operator_context_sign_blue",
    "operator_context_sign_green",
    "operator_context_traffic_cabinet",
    "operator_context_streetlight",
]
```

Merge them into the active material list when Stage 2 is enabled:

```python
if self.operator_stage2:
    city_material_names = OPERATOR_STAGE1_MATERIAL_NAMES + OPERATOR_STAGE2_MATERIAL_NAMES
elif self.operator_stage1:
    city_material_names = OPERATOR_STAGE1_MATERIAL_NAMES
else:
    city_material_names = CITY_MATERIAL_NAMES.get(self.city)
```

Expected: Stage 2 can add geometry with stable reusable materials and without new image-card materials.

- [ ] **Step 2: Keep material creation scalar and reusable**

Use existing material helper paths for constant/vector materials. Do not import new texture cards for Stage 2. If texture variation is needed, use material color/roughness variation only in this stage.

Expected: no `custom_imagegen_*_backplate` material is required by Stage 2.

### Task 4: Build The 3D Context Ring

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [ ] **Step 1: Add deterministic context placement data**

Add data tables near the Stage 2 constants:

```python
OPERATOR_STAGE2_FACADE_BLOCKS = [
    ("northwest_block", -3200, 3900, 920, 520, 560, "operator_context_facade_warm_gray"),
    ("northeast_block", 3100, 3820, 860, 480, 620, "operator_context_facade_cool_gray"),
    ("southwest_block", -3450, -3920, 980, 540, 520, "operator_context_facade_cool_gray"),
    ("southeast_block", 3300, -3760, 900, 500, 580, "operator_context_facade_warm_gray"),
    ("east_mid_block", 4550, 1750, 760, 420, 460, "operator_context_facade_warm_gray"),
    ("west_mid_block", -4520, -1700, 760, 420, 460, "operator_context_facade_cool_gray"),
]

OPERATOR_STAGE2_STREET_FURNITURE = [
    ("cabinet_nw", -1540, 1560, "traffic_cabinet"),
    ("cabinet_se", 1560, -1540, "traffic_cabinet"),
    ("cctv_ne", 1660, 1520, "cctv"),
    ("streetlight_north_1", -900, 2140, "streetlight"),
    ("streetlight_north_2", 900, 2140, "streetlight"),
    ("streetlight_south_1", -900, -2140, "streetlight"),
    ("streetlight_south_2", 900, -2140, "streetlight"),
]
```

Expected: Stage 2 context is deterministic and reviewable in source.

- [ ] **Step 2: Add facade geometry function**

Add:

```python
def _spawn_operator_stage2_facade_blocks(self) -> None:
    for label, x, y, sx, sy, height, material in OPERATOR_STAGE2_FACADE_BLOCKS:
        self._cube(
            f"OperatorStage2_Stage2ContextGeometry_facade_{label}",
            (x, y, height / 2),
            (sx / 100.0, sy / 100.0, height / 100.0),
            material,
        )
        self._cube(
            f"OperatorStage2_Stage2ContextGeometry_window_band_{label}",
            (x, y - 6, height * 0.62),
            (sx * 0.0075, 0.035, 0.18),
            "operator_context_window_dark",
        )
```

Expected: low-rise facades are real geometry and start outside the traffic-reading zone.

- [ ] **Step 3: Add curb, guardrail, and sidewalk reinforcement**

Add:

```python
def _spawn_operator_stage2_curbs_guardrails(self) -> None:
    curb_specs = [
        ("north_inner", 0, 1960, 42, 38.0, 0.10, 0.10),
        ("south_inner", 0, -1960, 42, 38.0, 0.10, 0.10),
        ("east_inner", 1960, 0, 43, 0.10, 38.0, 0.10),
        ("west_inner", -1960, 0, 43, 0.10, 38.0, 0.10),
    ]
    for label, x, y, z, sx, sy, sz in curb_specs:
        self._cube(f"OperatorStage2_Stage2ContextGeometry_curb_{label}", (x, y, z), (sx, sy, sz), "operator_context_curb")

    guardrails = [
        ("northwest", -1420, 2140, 120, 5.0, 0.045, 0.28),
        ("northeast", 1420, 2140, 120, 5.0, 0.045, 0.28),
        ("southwest", -1420, -2140, 120, 5.0, 0.045, 0.28),
        ("southeast", 1420, -2140, 120, 5.0, 0.045, 0.28),
    ]
    for label, x, y, z, sx, sy, sz in guardrails:
        self._cube(f"OperatorStage2_Stage2ContextGeometry_guardrail_{label}", (x, y, z), (sx, sy, sz), "operator_context_guardrail")
```

Expected: context edges are 3D infrastructure, not painted or card-like backgrounds.

- [ ] **Step 4: Add street furniture function**

Add:

```python
def _spawn_operator_stage2_street_furniture(self) -> None:
    for label, x, y, kind in OPERATOR_STAGE2_STREET_FURNITURE:
        if kind == "traffic_cabinet":
            self._cube(f"OperatorStage2_Stage2ContextGeometry_traffic_cabinet_{label}", (x, y, 92), (0.42, 0.26, 0.58), "operator_context_traffic_cabinet")
        elif kind == "cctv":
            self._cube(f"OperatorStage2_Stage2ContextGeometry_cctv_pole_{label}", (x, y, 300), (0.055, 0.055, 3.00), "operator_context_streetlight")
            self._cube(f"OperatorStage2_Stage2ContextGeometry_cctv_head_{label}", (x - 70, y + 45, 585), (0.30, 0.10, 0.10), "operator_context_streetlight")
        elif kind == "streetlight":
            self._cube(f"OperatorStage2_Stage2ContextGeometry_streetlight_pole_{label}", (x, y, 285), (0.050, 0.050, 2.85), "operator_context_streetlight")
            self._cube(f"OperatorStage2_Stage2ContextGeometry_streetlight_head_{label}", (x + 70, y, 540), (0.34, 0.060, 0.055), "operator_context_streetlight")
```

Expected: operator context includes cabinets, CCTV, and lighting hardware while preserving road readability.

### Task 5: Compose The Stage 2 Map

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [ ] **Step 1: Add the scene composer**

Add:

```python
def _build_operator_stage2_scene(self) -> None:
    self._build_operator_stage1_scene()
    self._spawn_operator_stage2_curbs_guardrails()
    self._spawn_operator_stage2_facade_blocks()
    self._spawn_operator_stage2_street_furniture()
```

Expected: Stage 2 inherits Stage 1 road/queue/signal semantics and only adds context geometry.

- [ ] **Step 2: Route generation**

In the main generation branch:

```python
if self.operator_stage2:
    self._build_operator_stage2_scene()
elif self.operator_stage1:
    self._build_operator_stage1_scene()
else:
    self._build_city_scene()
```

Expected: Stage 2 does not accidentally run city backplate generation paths.

- [ ] **Step 3: Write a Stage 2 manifest**

Manifest must include:

```json
{
  "mode": "OperatorStage2",
  "unreal_map": "/Game/Maps/Generated/smart_intersection_rebuild_stage2",
  "base_stage": "OperatorStage1",
  "context_policy": "3D geometry in and near traffic-reading zone; no traffic-zone backplates",
  "traffic_zone_half_extent_cm": 1840,
  "actor_evidence": [
    "OperatorStage2",
    "Stage2ContextGeometry",
    "NoTrafficZoneBackplate",
    "TrafficReadableQueueZone"
  ]
}
```

Expected: the verifier can check that Stage 2 is not a renamed Stage 1 artifact.

### Task 6: Add Stage 2 Capture

**Files:**
- Create: `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage2.py`
- Create: `scripts/capture-unreal-operator-map-stage2.ps1`

- [ ] **Step 1: Copy Stage 1 capture structure and change the map/output**

Use:

```python
map_path = "/Game/Maps/Generated/smart_intersection_rebuild_stage2"
required_labels = [
    "OperatorStage2_Stage2ContextGeometry_facade_northwest_block",
    "OperatorStage2_Stage2ContextGeometry_curb_north_inner",
    "OperatorStage2_Stage2ContextGeometry_traffic_cabinet_cabinet_nw",
    "TrafficReadableQueueZone_OperatorStage1_north_boundary",
]
```

Output:

```powershell
$env:SMART_INTERSECTION_OPERATOR_STAGE2_PROOF_OUTPUT = "artifacts\unreal-operator-map-stage2-proof.png"
```

Expected: capture fails if Stage 2 context labels are missing.

- [ ] **Step 2: Use a less blown-out proof target**

Capture acceptance:

- image dimensions at least 1600x900
- mean brightness between 60 and 190
- standard deviation above 25
- no alpha channel
- camera shows all four approaches and nearby context ring

Expected: Stage 2 proof fixes the Stage 1 overexposure problem instead of carrying it forward.

### Task 7: Add Stage 2 Semantic Verification

**Files:**
- Create: `scripts/verify-sumo-ready-operator-map-stage2.py`

- [ ] **Step 1: Check required files and sizes**

Use these minimums:

```python
MIN_STAGE2_MAP_BYTES = 760_000
MIN_STAGE2_PROOF_BYTES = 420_000
MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild_stage2.umap"
MANIFEST = UE / "GeneratedProof" / "smart_intersection_rebuild_operator_stage2_manifest.json"
PROOF = ROOT / "artifacts" / "unreal-operator-map-stage2-proof.png"
```

Expected: Stage 2 must be measurably more than Stage 1's semantic artifact.

- [ ] **Step 2: Check required map tokens**

Required tokens:

```python
REQUIRED_MAP_TOKENS = [
    b"OperatorStage2",
    b"Stage2ContextGeometry",
    b"NoTrafficZoneBackplate",
    b"TrafficReadableQueueZone",
    b"OperatorStage1",
    b"SUMOReadyLargeIntersection",
    b"QueueCapacity_40",
]
```

Expected: Stage 2 preserves Stage 1 road/queue semantics.

- [ ] **Step 3: Check forbidden tokens**

Forbidden tokens:

```python
FORBIDDEN_STAGE2_TOKENS = [
    b"photo_backplate",
    b"road_card",
    b"ImageGen",
    b"foreground proof",
    b"foreground plinth",
    b"PolyHaven CC0 VISIBLE",
]
```

Expected: verifier fails if image-card or proof-strip artifacts leak into Stage 2 map bytes.

- [ ] **Step 4: Check proof image**

Reuse the Stage 1 image check, but tighten brightness:

```python
if mean < 60.0 or mean > 190.0:
    fail(f"operator stage2 proof exposure outside target: mean={mean:.2f}")
if stddev < 25.0:
    fail(f"operator stage2 proof lacks readable geometry variation: stddev={stddev:.2f}")
```

Expected: semantic verification catches the current Stage 1 overexposure failure mode.

### Task 8: Generate, Capture, And Visually Inspect Stage 2

**Files:**
- Generated: `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_stage2.umap`
- Generated: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage2_manifest.json`
- Generated: `artifacts/unreal-operator-map-stage2-proof.png`

- [ ] **Step 1: Generate Stage 2**

Run:

```powershell
npm run unreal:generate:operator-stage2
```

Expected:

- no `Traceback`
- no `LogPython: Error`
- generated map exists at `smart_intersection_rebuild_stage2.umap`
- Stage 2 manifest exists

- [ ] **Step 2: Capture Stage 2**

Run:

```powershell
npm run unreal:capture:operator-stage2
```

Expected: proof PNG exists at `artifacts/unreal-operator-map-stage2-proof.png`.

- [ ] **Step 3: Human visual inspection**

Reject the capture if any condition is true:

- traffic-reading zone contains billboard, image-card, facade-card, or proof-strip composition
- central median/island geometry reads as black bars or road blockage
- facades touch or cover lanes, stop bars, crosswalks, queues, or signal heads
- exposure makes lane markings, sidewalks, or vehicles unreadable
- the camera crop hides one or more approaches
- queue placeholders no longer make 20-40 vehicle capacity readable

Expected: the operator can read the intersection without seeing billboard/card composition in the road, signal, or queue area.

### Task 9: Final Stage 2 Validation

**Files:**
- Validate: changed source, generated map, proof image, manifest, package scripts, this plan

- [ ] **Step 1: Run focused checks**

Run:

```powershell
npm run unreal:precheck
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-simulator-builder-agent.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-complete-simulation-renderer.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-sumo-ready-operator-map-stage1.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-sumo-ready-operator-map-stage2.py
git diff --check
```

Expected: all pass. If npm Python routing was fixed in Task 0, also run:

```powershell
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
```

- [ ] **Step 2: Report remaining non-Stage-2 gates honestly**

Do not mark these complete unless actually implemented and verified:

- city-specific signal and vehicle asset pipeline
- live SUMO/TraCI motion binding
- Pixel Streaming dashboard proof
- multi-city expansion
- real traffic-controller integration

## Stage 1 Goal Mode Prompt

This prompt follows the OpenAI Cookbook guidance in "Using Goals in Codex":
`https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex`.

The Goal is written as a compact completion contract with:

- outcome
- verification surface
- constraints
- boundaries
- iteration policy
- blocked stop condition

Use this prompt in the next session:

```md
/goal Build Stage 1 of the SUMO-ready 3D operator map for SmartIntersection: a fresh Unreal-generated large operator intersection map plus proof capture where traffic volume is readable, 20-40 vehicle queues would fit visibly, road markings are separate Unreal geometry/decal/spline-like elements rather than backplate paint, and no 2D card/backplate artifacts appear inside the traffic-reading zone.

Verify success with evidence from `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`: generated large operator `.umap`, fresh proof PNG under `artifacts/`, actor/map evidence for `OperatorStage1`, `SUMOReadyLargeIntersection`, and `TrafficReadableQueueZone`, a focused verifier such as `scripts/verify-sumo-ready-operator-map-stage1.py`, primary visual inspection, `npm run unreal:precheck`, `python3 scripts/verify-simulator-builder-agent.py`, `python3 scripts/verify-complete-simulation-renderer.py`, the Stage 1 verifier, and `git diff --check`.

Preserve these constraints: SUMO/TraCI is truth, FastAPI orchestrates, Unreal renders, no real traffic-controller integration, no landing-page changes, no proof strips/plinths/debug asset lineups in production maps, no staging unrelated local files such as untracked `plan.md`, and no commit or push unless explicitly asked after validation.

Use only these boundaries and inputs: repo `C:\Users\100ri\abc_project`, current `main` at or after `92f4e142`, `AGENTS.md`, `docs/agents/simulator-builder-agent.md`, this plan, relevant UE 5.7 doc digests, existing Unreal generator/runtime files, and an isolated branch/worktree such as `codex/sumo-ready-operator-map-stage1`.

Between iterations, inspect the latest generated map, verifier output, proof capture, and visual failure mode, then choose the smallest next change that improves map scale, traffic-readability, lane/marking integrity, or removal of card/backplate artifacts without broad refactors or Stage 2+ scope creep.

If blocked or no defensible path remains, stop and report the exact blocker, the commands/files inspected, what evidence is missing, and what would unlock progress. Do not mark complete unless the evidence proves the Stage 1 deliverable. Explicitly leave Stage 2+ items incomplete unless actually implemented and verified: 3D city context replacement, city-specific vehicle/signal asset generation, live SUMO movement, Pixel Streaming dashboard proof, and all-city expansion.
```

## Self-Review

- Spec coverage: covers map scale, broken line/marking concerns, 3D backplate replacement direction, Image Gen vehicle/signal direction, SUMO-driven vehicle motion, and next-session Stage 1 execution.
- Scope check: Stage 1 is intentionally limited to one large operator map and proof capture. Vehicle asset generation and live SUMO motion are later stages.
- Ambiguity check: Image Gen is constrained to reference/texture direction until normalized 3D assets exist.
- Verification check: Stage 1 has script, visual, git diff, and honest remaining-gate requirements.
- Stage 1 verification update: semantic checks pass through the fallback Python runtime, but npm verifier routing and visual proof quality still block a perfect verdict.
- Stage 2 coverage: plan covers generation mode, real 3D context geometry, no-traffic-zone-backplate policy, capture, semantic verifier, and visual inspection gates.
