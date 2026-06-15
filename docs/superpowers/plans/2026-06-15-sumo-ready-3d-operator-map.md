# SUMO-Ready 3D Operator Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task, and use `karpathy-guidelines` before planning, writing, reviewing, refactoring, or debugging code. Steps use checkbox (`- [ ]`) syntax for tracking.

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

**Verdict:** Stage 1 carryover is closed for Stage 2 entry; later-stage simulator gates remain open.

Stage 1 has real implementation artifacts and the carryover blockers for Stage 2 entry have current passing evidence.

Evidence that passed:

- Generated map exists: `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild.umap`, 693531 bytes.
- Fresh proof exists: `artifacts/unreal-operator-map-stage1-proof.png`, 1600x900, 644459 bytes.
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
MAP_STAGE1_TOKEN_CHECK_PASS bytes=693531 manifest=renderer\unreal\SmartIntersection\GeneratedProof\smart_intersection_rebuild_operator_stage1_manifest.json
OPERATOR PROOF_CHECK_PASS size=(1600, 900) bytes=644459 mean=167.15 stddev=71.21
SUMO_READY_OPERATOR_STAGE1_PASS
```

- `verify-simulator-builder-agent.py` passed with the same fallback Python runtime.
- `verify-complete-simulation-renderer.py` passed with the same fallback Python runtime.
- `git diff --check` passed.

Resolved Stage 1 carryover evidence:

- `npm run verify:operator-map-stage1` now routes through `C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe` and passes.
- Human visual inspection of `artifacts/unreal-operator-map-stage1-proof.png` now finds the central black obstruction bars removed; lane markings, stop bars, queue placeholders, and all four approaches remain readable. The proof image is no longer overexposed by the verifier bound: mean `167.15`, stddev `71.21`.

Stage 1 carryover closed before Stage 2 execution:

- Fixed the broken `python3` npm verifier path.
- Reduced proof overexposure and made the central median/island geometry read as realistic lane/median infrastructure, not black obstruction bars.
- Recaptured `artifacts/unreal-operator-map-stage1-proof.png`.
- Re-ran the Stage 1 semantic verifier and repeated human visual inspection.

## Stage 2 Detailed Task Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task, and use `karpathy-guidelines` before planning, writing, reviewing, refactoring, or debugging code. Steps use checkbox (`- [ ]`) syntax for tracking.

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

- `artifacts/imagegen/sumo-ready-operator-map-stage2-context-reference.png`
- `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_stage2.umap`
- `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage2_manifest.json`
- `artifacts/unreal-operator-map-stage2-proof.png`

### Task 0: Close Stage 1 Carryover Gates

**Files:**
- Modify if needed: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Modify if needed: `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage1.py`
- Modify if needed: `scripts/verify-sumo-ready-operator-map-stage1.py`
- Modify if needed: `package.json`

- [x] **Step 1: Re-run the exact current Stage 1 checks**

Run:

```powershell
npm run unreal:precheck
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-sumo-ready-operator-map-stage1.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-simulator-builder-agent.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-complete-simulation-renderer.py
git diff --check
```

Expected: all pass. If any fails, fix Stage 1 before touching Stage 2.

- [x] **Step 2: Fix the broken npm verifier path**

Current failing command:

```powershell
npm run verify:operator-map-stage1
```

Observed failure:

```text
Python
```

Acceptable fix: change `verify:operator-map-stage1` to invoke a working repo-level Python runner or document the fallback command in `package.json` comments is not enough. The final validation command for Stage 1 must run from npm or the plan must explicitly mark the npm alias unsupported on Windows.

- [x] **Step 3: Fix the Stage 1 visual proof before Stage 2**

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

Evidence: `npm run unreal:capture:operator-stage1` regenerated `artifacts/unreal-operator-map-stage1-proof.png`; `npm run verify:operator-map-stage1` passed with proof mean `167.15`, stddev `71.21`, 1600x900, 644459 bytes. Human inspection confirmed the central median no longer reads as black obstruction bars.

### Task 1: Add A Stage 2 Generation Mode

**Files:**
- Modify: `scripts/generate-unreal-city.ps1`
- Modify: `package.json`
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [x] **Step 1: Add the PowerShell switch**

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

- [x] **Step 2: Add npm scripts**

Add scripts:

```json
"unreal:generate:operator-stage2": "npm run unreal:generate-city -- -Profile seoul -OperatorStage2",
"unreal:capture:operator-stage2": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-operator-map-stage2.ps1",
"verify:operator-map-stage2": "python3 scripts/verify-sumo-ready-operator-map-stage2.py"
```

If `python3` is still broken on Windows after Task 0, use the same fixed repo-level Python runner for both Stage 1 and Stage 2 verifier scripts.

- [x] **Step 3: Add generator mode detection**

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

- [x] **Step 1: Add explicit zone constants**

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

- [x] **Step 2: Define what may enter the traffic-reading zone**

Use this rule in function comments and verifier text:

```text
Inside +/-1840 cm of the intersection center, only roads, markings, curbs, medians,
signal equipment, queue placeholders, CCTV/operator equipment, and safety hardware
may appear. Building facades and distant cards must start outside the zone.
```

Expected: Stage 2 context cannot hide lanes, queues, or signal heads.

### Task 2A: Create Stage 2 Image Gen Reference Direction

**Files:**
- Generated: `artifacts/imagegen/sumo-ready-operator-map-stage2-context-reference.png`
- Reference only: `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`

- [x] **Step 1: Generate one Stage 2 reference board before geometry work**

Use Image Gen to create a practical reference board for the Stage 2 foreground/context pass. The board should show:

- traffic-readable curbs, sidewalks, medians, guardrails, traffic cabinets, CCTV poles, mast arms, street lights, and road signs
- nearby low-rise facade massing that sits outside the traffic-reading zone
- material direction for concrete, curb paint, dark windows, galvanized metal, signal hardware, and neutral facade blocks
- operator-view clarity, not cinematic closeups

Save the result at:

```text
artifacts/imagegen/sumo-ready-operator-map-stage2-context-reference.png
```

Expected: the reference board guides shapes, proportions, colors, and material direction for Stage 2 context geometry.

Evidence: Image Gen created `artifacts/imagegen/sumo-ready-operator-map-stage2-context-reference.png`, 1672x941, 2512230 bytes, mean `79.49`, stddev `42.22`. It is reference only and has not been imported into the Unreal map.

- [x] **Step 2: Keep Image Gen out of runtime map objects**

Image Gen output is reference/input only for Stage 2. Do not import the generated image as a road card, facade card, billboard, sky card, backplate, or texture plane in the generated `.umap`.

The generated Stage 2 map must still fail verification if its map bytes contain:

```text
ImageGen
photo_backplate
road_card
```

Expected: Image Gen influences the 3D context design, but runtime map objects remain Unreal geometry/material actors.

### Task 3: Add Stage 2 Materials Without Backplate Dependence

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [x] **Step 1: Add material names**

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

- [x] **Step 2: Keep material creation scalar and reusable**

Use existing material helper paths for constant/vector materials. Do not import new texture cards for Stage 2. If texture variation is needed, use material color/roughness variation only in this stage.

Expected: no `custom_imagegen_*_backplate` material is required by Stage 2.

### Task 4: Build The 3D Context Ring

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [x] **Step 1: Add deterministic context placement data**

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

- [x] **Step 2: Add facade geometry function**

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

- [x] **Step 3: Add curb, guardrail, and sidewalk reinforcement**

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

- [x] **Step 4: Add street furniture function**

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

- [x] **Step 1: Add the scene composer**

Add:

```python
def _build_operator_stage2_scene(self) -> None:
    self._build_operator_stage1_scene()
    self._spawn_operator_stage2_curbs_guardrails()
    self._spawn_operator_stage2_facade_blocks()
    self._spawn_operator_stage2_street_furniture()
```

Expected: Stage 2 inherits Stage 1 road/queue/signal semantics and only adds context geometry.

- [x] **Step 2: Route generation**

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

- [x] **Step 3: Write a Stage 2 manifest**

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

- [x] **Step 1: Copy Stage 1 capture structure and change the map/output**

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

- [x] **Step 2: Use a less blown-out proof target**

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

- [x] **Step 1: Check required files and sizes**

Use these minimums:

```python
MIN_STAGE2_REFERENCE_BYTES = 500_000
MIN_STAGE2_MAP_BYTES = 760_000
MIN_STAGE2_PROOF_BYTES = 420_000
REFERENCE = ROOT / "artifacts" / "imagegen" / "sumo-ready-operator-map-stage2-context-reference.png"
MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild_stage2.umap"
MANIFEST = UE / "GeneratedProof" / "smart_intersection_rebuild_operator_stage2_manifest.json"
PROOF = ROOT / "artifacts" / "unreal-operator-map-stage2-proof.png"
```

Expected: Stage 2 must include a readable Image Gen reference board and be measurably more than Stage 1's semantic map artifact.

- [x] **Step 1A: Check the Stage 2 Image Gen reference image**

Mirror the Stage 1 verifier pattern:

```python
check_image(REFERENCE, "stage2 imagegen reference", MIN_STAGE2_REFERENCE_BYTES)
```

Expected: the Stage 2 verifier fails if `artifacts/imagegen/sumo-ready-operator-map-stage2-context-reference.png` is missing, too small, unreadable, too dark, or visually flat.

- [x] **Step 2: Check required map tokens**

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

- [x] **Step 3: Check forbidden tokens**

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

- [x] **Step 4: Check proof image**

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

- [x] **Step 1: Generate Stage 2**

Run:

```powershell
npm run unreal:generate:operator-stage2
```

Expected:

- no `Traceback`
- no `LogPython: Error`
- generated map exists at `smart_intersection_rebuild_stage2.umap`
- Stage 2 manifest exists

- [x] **Step 2: Capture Stage 2**

Run:

```powershell
npm run unreal:capture:operator-stage2
```

Expected: proof PNG exists at `artifacts/unreal-operator-map-stage2-proof.png`.

- [x] **Step 3: Human visual inspection**

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

- [x] **Step 1: Run focused checks**

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

- [x] **Step 2: Report remaining non-Stage-2 gates honestly**

Do not mark these complete unless actually implemented and verified:

- city-specific signal and vehicle asset pipeline
- live SUMO/TraCI motion binding
- Pixel Streaming dashboard proof
- multi-city expansion
- real traffic-controller integration

## Stage 2 Verification Status - 2026-06-15

**Verdict:** Stage 2 deliverable is implemented and verified for the requested scope.

Current evidence:

- Stage 2 reference image: `artifacts/imagegen/sumo-ready-operator-map-stage2-context-reference.png`, 1672x941, 2512230 bytes, mean `79.49`, stddev `42.22`.
- Stage 2 generated map: `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_stage2.umap`, 807759 bytes.
- Stage 2 manifest: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage2_manifest.json`, mode `OperatorStage2`, base stage `OperatorStage1`, `traffic_zone_half_extent_cm` `1840`.
- Stage 2 proof: `artifacts/unreal-operator-map-stage2-proof.png`, 1600x900, 691520 bytes, mean `166.22`, stddev `74.09`.
- Stage 2 verifier output: `SUMO_READY_OPERATOR_STAGE2_PASS`.
- Stage 1 carryover verifier output: `SUMO_READY_OPERATOR_STAGE1_PASS`.
- `npm run verify:operator-map-stage1` and `npm run verify:operator-map-stage2` both pass through the bundled Python route.
- Human visual inspection of the Stage 2 proof found readable all-approach traffic/queues, no traffic-zone card/backplate composition, no central black median obstruction bars, visible 3D context geometry, and acceptable exposure.
- Final focused checks passed: `npm run unreal:precheck`, bundled-Python `verify-simulator-builder-agent.py`, bundled-Python `verify-complete-simulation-renderer.py`, bundled-Python Stage 1 verifier, bundled-Python Stage 2 verifier, and `git diff --check`.

Remaining non-Stage-2 gates, intentionally not marked complete:

- city-specific signal and vehicle asset pipeline (Stage 3 plan below, still open)
- live SUMO/TraCI motion binding
- Pixel Streaming dashboard proof
- multi-city expansion
- real traffic-controller integration

## Stage 3 Detailed Task Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task, and use `karpathy-guidelines` before planning, writing, reviewing, refactoring, or debugging code. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the city-specific signal and vehicle asset pipeline for the SUMO-ready operator map, producing normalized Unreal geometry/mesh actors that can later be driven by SUMO headings and FastAPI renderer snapshots.

**Architecture:** Keep Stage 2 as the production map base. Add a Stage 3 generation mode that defines per-city asset-kit metadata for Seoul, New York, Paris, and London, then uses the Seoul kit in one generated operator map to replace generic placeholder signal/vehicle visuals with normalized 3D actors. Image Gen is used only for reference sheets and texture direction; runtime objects remain Unreal actors with stable pivots, lane fit, dimensions, tags, and manifest evidence.

**Tech Stack:** Unreal Engine 5.7, UE Editor Python for asset-kit generation and capture automation, Static Mesh Actors and material instances for vehicles/signals, existing `ATrafficSimulationController` as the future runtime consumer, SUMO/TraCI and FastAPI as later Stage 4 truth/orchestration sources.

---

### Stage 3 Boundaries

Stage 3 does:

- create a reusable city asset-kit contract for `seoul`, `new_york`, `paris`, and `london`
- add city-specific signal heads, poles, lenses, passenger cars, buses, taxis, and emergency vehicles as normalized 3D actors
- prove one Stage 3 operator map using the Seoul kit on top of Stage 2
- verify pivots, lane fit, headings, material classes, required tokens, proof image quality, and manifest shape

Stage 3 does **not**:

- connect live SUMO/TraCI movement to actors
- claim real traffic-controller integration
- add Pixel Streaming dashboard proof
- expand all operator maps to every city
- import Image Gen outputs as billboards, cards, backplates, road textures, or runtime mesh planes
- add production proof strips, plinths, asset lineups, or debug display rows

### Stage 3 File Map

**Read before editing:**

- `AGENTS.md`
- `docs/agents/simulator-builder-agent.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- `docs/technotes/ue57-doc-digest/python_editor.txt`
- `docs/technotes/ue57-doc-digest/actors.txt`
- `docs/technotes/ue57-doc-digest/levels.txt`
- `docs/technotes/ue57-doc-digest/static_meshes.txt`
- `docs/technotes/ue57-doc-digest/materials.txt`
- `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Public/TrafficSimulationController.h`
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Private/TrafficSimulationController.cpp`
- `scripts/verify-sumo-ready-operator-map-stage2.py`

**Modify:**

- `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- `scripts/generate-unreal-city.ps1`
- `package.json`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`

**Create:**

- `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage3_asset_kits.json`
- `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage3.py`
- `scripts/capture-unreal-operator-map-stage3.ps1`
- `scripts/verify-sumo-ready-operator-map-stage3.py`

**Generated artifacts:**

- `artifacts/imagegen/sumo-ready-operator-map-stage3-asset-reference.png`
- `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_stage3.umap`
- `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage3_manifest.json`
- `artifacts/unreal-operator-map-stage3-proof.png`

### Task 0: Establish Clean Stage 3 Scope

**Files:**
- Read: `AGENTS.md`
- Read: `docs/agents/simulator-builder-agent.md`
- Read: `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- Validate: current git state and Stage 1/2 artifacts

- [x] **Step 1: Confirm current branch and dirty state**

Run:

```powershell
git status --short --branch
git log -1 --oneline --decorate
```

Expected: current branch is `main`, `HEAD` is at or after `385ca20a feat: add sumo operator map stage 2`, and any unrelated dirty files are reported before editing. Do not stage unrelated files.

- [x] **Step 2: Re-run Stage 2 baseline checks before Stage 3 edits**

Run:

```powershell
npm run unreal:precheck
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-simulator-builder-agent.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-complete-simulation-renderer.py
git diff --check
```

Expected: all pass before Stage 3 implementation. If a baseline fails, fix or document the failure before adding Stage 3 behavior.

### Task 1: Create The Stage 3 Image Gen Reference Direction

**Files:**
- Generated: `artifacts/imagegen/sumo-ready-operator-map-stage3-asset-reference.png`
- Reference only: `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`

- [x] **Step 1: Generate one city asset-kit reference board**

Use Image Gen to create a practical reference board with four labeled columns:

```text
Seoul: overhead mast-arm signal heads, green buses, compact sedans, taxi accent, ambulance/fire response accent
New York: yellow signal heads, boxier sedans/SUVs, yellow taxi, city bus, emergency vehicle accent
Paris: compact black signal heads, small hatchbacks, white/blue bus, taxi roof light, emergency vehicle accent
London: black signal heads, left-side road context, black cab silhouette, red bus, emergency response accent
```

Save the generated image at:

```text
artifacts/imagegen/sumo-ready-operator-map-stage3-asset-reference.png
```

Expected: the reference board guides proportions, color/material direction, and city distinctions only. It must not be imported into the Unreal map.

- [x] **Step 2: Record reference-only constraints in the plan**

When implementation completes, add evidence under the Stage 3 verification status:

```text
Stage 3 reference image: copy the exact STAGE3 IMAGEGEN REFERENCE_CHECK_PASS line from the verifier output.
Image Gen is reference only and does not appear in Stage 3 map bytes.
```

Expected: Stage 3 keeps generated images out of runtime map objects.

### Task 2: Define The Stage 3 Asset-Kit Contract

**Files:**
- Create: `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage3_asset_kits.json`
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [x] **Step 1: Create the asset-kit profile JSON**

Create `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage3_asset_kits.json` with this structure:

```json
{
  "schema": "operator-stage3-city-asset-kit-v1",
  "base_stage": "OperatorStage2",
  "runtime_policy": "SUMO and FastAPI provide future state; Unreal actors provide normalized renderable assets only.",
  "lane_fit_cm": {
    "passenger_car": { "length": 430, "width": 185, "height": 145 },
    "taxi": { "length": 455, "width": 188, "height": 150 },
    "bus": { "length": 1180, "width": 255, "height": 320 },
    "emergency_vehicle": { "length": 520, "width": 205, "height": 230 }
  },
  "cities": {
    "seoul": {
      "signal_style": "overhead_mast_arm_compact",
      "vehicle_palette": ["deep_gray", "green_bus", "white_taxi", "blue_emergency"],
      "variants": ["passenger_car", "bus", "taxi", "emergency_vehicle"]
    },
    "new_york": {
      "signal_style": "yellow_box_side_mounted",
      "vehicle_palette": ["dark_sedan", "yellow_taxi", "white_blue_bus", "red_blue_emergency"],
      "variants": ["passenger_car", "bus", "taxi", "emergency_vehicle"]
    },
    "paris": {
      "signal_style": "slim_black_low_profile",
      "vehicle_palette": ["silver_hatchback", "white_bus", "dark_taxi", "blue_emergency"],
      "variants": ["passenger_car", "bus", "taxi", "emergency_vehicle"]
    },
    "london": {
      "signal_style": "black_signal_cluster",
      "vehicle_palette": ["black_cab", "red_bus", "dark_private_car", "yellow_green_emergency"],
      "variants": ["passenger_car", "bus", "taxi", "emergency_vehicle"]
    }
  }
}
```

Expected: all four city kits have the same variant keys and normalized dimensions, so Stage 4 can map SUMO vehicle classes without branching on visual quirks.

- [x] **Step 2: Add Stage 3 constants to the generator**

Add near the Stage 2 constants:

```python
OPERATOR_STAGE3_ACTIVE_CITY = "seoul"
OPERATOR_STAGE3_ASSET_KIT_SCHEMA = "operator-stage3-city-asset-kit-v1"
OPERATOR_STAGE3_CITY_KEYS = ["seoul", "new_york", "paris", "london"]
OPERATOR_STAGE3_REQUIRED_VARIANTS = ["passenger_car", "bus", "taxi", "emergency_vehicle"]
OPERATOR_STAGE3_REQUIRED_TOKENS = [
    "OperatorStage3",
    "Stage3CityAssetKit",
    "Stage3SignalKit",
    "Stage3VehicleKit",
    "SUMOReadyAssetPivot",
]
OPERATOR_STAGE3_FORBIDDEN_MAP_TOKENS = [
    "photo_backplate",
    "road_card",
    "ImageGen",
    "asset_lineup",
    "proof_plinth",
    "foreground proof",
    "foreground plinth",
]
```

Expected: the Stage 3 verifier can prove the pipeline is present and that proof-only objects did not enter the generated map.

### Task 3: Add Stage 3 Script Routing

**Files:**
- Modify: `scripts/generate-unreal-city.ps1`
- Modify: `package.json`
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [x] **Step 1: Add the PowerShell switch**

Add a switch next to `OperatorStage2`:

```powershell
[switch]$OperatorStage3
```

Set the environment variable:

```powershell
if ($OperatorStage3) {
  $env:SMART_INTERSECTION_OPERATOR_STAGE3 = '1'
} else {
  Remove-Item Env:\SMART_INTERSECTION_OPERATOR_STAGE3 -ErrorAction SilentlyContinue
}
```

Expected: Stage 3 generation can be invoked without changing the normal city-profile or Stage 1/2 paths.

- [x] **Step 2: Add npm scripts**

Add scripts:

```json
"unreal:generate:operator-stage3": "npm run unreal:generate-city -- -Profile seoul -OperatorStage3",
"unreal:capture:operator-stage3": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-operator-map-stage3.ps1",
"verify:operator-map-stage3": "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"& \\\"$env:USERPROFILE\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe\\\" scripts/verify-sumo-ready-operator-map-stage3.py\""
```

Expected: Stage 3 has the same Windows-safe verification route as Stage 1 and Stage 2.

- [x] **Step 3: Add generator mode detection and map naming**

In `RoadOnlyRenderer.__init__`, add:

```python
self.operator_stage3 = os.environ.get("SMART_INTERSECTION_OPERATOR_STAGE3") == "1"
```

Map naming rule:

```python
if self.operator_stage3:
    return "/Game/Maps/Generated/smart_intersection_rebuild_stage3"
if self.operator_stage2:
    return "/Game/Maps/Generated/smart_intersection_rebuild_stage2"
if self.operator_stage1:
    return "/Game/Maps/Generated/smart_intersection_rebuild"
```

Expected: Stage 3 writes a separate `.umap` and does not overwrite Stage 1 or Stage 2 evidence.

### Task 4: Add Stage 3 Materials And Kit Loading

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Read: `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage3_asset_kits.json`

- [x] **Step 1: Add reusable Stage 3 material names**

Add material keys:

```python
OPERATOR_STAGE3_MATERIAL_NAMES = [
    "operator_stage3_signal_yellow",
    "operator_stage3_signal_black",
    "operator_stage3_signal_lens_red",
    "operator_stage3_signal_lens_green",
    "operator_stage3_vehicle_dark",
    "operator_stage3_vehicle_white",
    "operator_stage3_vehicle_taxi_yellow",
    "operator_stage3_vehicle_bus_green",
    "operator_stage3_vehicle_bus_red",
    "operator_stage3_vehicle_emergency_blue",
    "operator_stage3_vehicle_emergency_red",
    "operator_stage3_vehicle_glass",
]
```

When Stage 3 is enabled, use:

```python
if self.operator_stage3:
    city_material_names = OPERATOR_STAGE2_MATERIAL_NAMES + OPERATOR_STAGE3_MATERIAL_NAMES
elif self.operator_stage2:
    city_material_names = OPERATOR_STAGE2_MATERIAL_NAMES
```

Expected: Stage 3 uses material instances/colors, not imported image textures.

- [x] **Step 2: Load and validate the asset-kit profile**

Add a helper:

```python
def _load_operator_stage3_asset_kits(self) -> dict:
    path = self.root / "SceneProfiles" / "operator_stage3_asset_kits.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema") != OPERATOR_STAGE3_ASSET_KIT_SCHEMA:
        raise RuntimeError(f"Unexpected Stage 3 asset-kit schema: {data.get('schema')}")
    cities = data.get("cities", {})
    missing_cities = [city for city in OPERATOR_STAGE3_CITY_KEYS if city not in cities]
    if missing_cities:
        raise RuntimeError(f"Stage 3 asset-kit profile missing cities: {missing_cities}")
    for city, kit in cities.items():
        variants = kit.get("variants", [])
        missing_variants = [variant for variant in OPERATOR_STAGE3_REQUIRED_VARIANTS if variant not in variants]
        if missing_variants:
            raise RuntimeError(f"Stage 3 asset-kit profile {city} missing variants: {missing_variants}")
    return data
```

Expected: generation fails loudly if a city kit is incomplete.

### Task 5: Build Normalized Vehicle Actors

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [x] **Step 1: Add vehicle slot data for the active operator map**

Add deterministic lane slots that reuse Stage 1 queue semantics:

```python
OPERATOR_STAGE3_VEHICLE_SLOTS = [
    ("north", "passenger_car", 0, -275, 1960, 90),
    ("north", "taxi", 1, -95, 2220, 90),
    ("north", "bus", 2, 110, 2580, 90),
    ("south", "passenger_car", 0, 275, -1960, -90),
    ("south", "emergency_vehicle", 1, 95, -2300, -90),
    ("east", "passenger_car", 0, 1960, 275, 180),
    ("east", "bus", 1, 2380, 95, 180),
    ("west", "taxi", 0, -1960, -275, 0),
    ("west", "passenger_car", 1, -2220, -95, 0),
    ("west", "emergency_vehicle", 2, -2580, 110, 0)
]
```

Expected: Stage 3 proves all required variants in real queue lanes without becoming an all-city asset lineup.

- [x] **Step 2: Add a normalized vehicle spawn helper**

Add:

```python
def _spawn_operator_stage3_vehicle(self, city: str, direction: str, variant: str, slot: int, x: float, y: float, yaw: float) -> None:
    dimensions = {
        "passenger_car": (4.30, 1.85, 1.45),
        "taxi": (4.55, 1.88, 1.50),
        "bus": (11.80, 2.55, 3.20),
        "emergency_vehicle": (5.20, 2.05, 2.30),
    }[variant]
    material = {
        "passenger_car": "operator_stage3_vehicle_dark",
        "taxi": "operator_stage3_vehicle_taxi_yellow",
        "bus": "operator_stage3_vehicle_bus_green" if city == "seoul" else "operator_stage3_vehicle_bus_red",
        "emergency_vehicle": "operator_stage3_vehicle_emergency_blue",
    }[variant]
    label = f"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_{city}_{direction}_{variant}_{slot:02d}"
    body = self._rotated_cube(label, (x, y, 86), (dimensions[0] / 2.0, dimensions[1] / 2.0, dimensions[2] / 2.0), material, rotation=(0, 0, yaw))
    glass = self._rotated_cube(f"{label}_glass", (x, y, 178), (dimensions[0] * 0.24, dimensions[1] * 0.38, 0.28), "operator_stage3_vehicle_glass", rotation=(0, 0, yaw))
    for actor in (body, glass):
        self._set_actor_property(actor, "Tags", ["OperatorStage3", "Stage3VehicleKit", "SUMOReadyAssetPivot", city, direction, variant])
```

Expected: each vehicle actor has stable label/tag evidence for city, direction, variant, and future SUMO heading updates.

- [x] **Step 3: Add emergency beacon geometry**

Extend the helper for `emergency_vehicle`:

```python
if variant == "emergency_vehicle":
    beacon = self._rotated_cube(f"{label}_emergency_beacon", (x, y, 246), (0.52, 0.16, 0.075), "operator_stage3_vehicle_emergency_red", rotation=(0, 0, yaw))
    self._set_actor_property(beacon, "Tags", ["OperatorStage3", "Stage3VehicleKit", "SUMOReadyAssetPivot", city, direction, variant, "emergency_beacon"])
```

Expected: emergency vehicles are visually distinct but still normalized geometry.

### Task 6: Build City-Specific Signal Actors

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

- [x] **Step 1: Add signal assembly data**

Add Seoul active-map assemblies:

```python
OPERATOR_STAGE3_SIGNAL_ASSEMBLIES = [
    ("seoul_northwest", "seoul", -1140, 1120, 0, "overhead_mast_arm_compact"),
    ("seoul_northeast", "seoul", 1140, 1120, 180, "overhead_mast_arm_compact"),
    ("seoul_southwest", "seoul", -1140, -1120, 0, "overhead_mast_arm_compact"),
    ("seoul_southeast", "seoul", 1140, -1120, 180, "overhead_mast_arm_compact")
]
```

Expected: the active Stage 3 map proves one city-specific signal kit in real intersection positions.

- [x] **Step 2: Add a normalized signal spawn helper**

Add:

```python
def _spawn_operator_stage3_signal_assembly(self, label: str, city: str, x: float, y: float, yaw: float, style: str) -> None:
    metal = "operator_stage3_signal_yellow" if city == "new_york" else "operator_stage3_signal_black"
    pole = self._cube(f"OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_{label}_pole", (x, y, 245), (0.060, 0.060, 2.45), metal)
    arm = self._rotated_cube(f"OperatorStage3_Stage3SignalKit_{label}_mast_arm", (x + (230 if yaw == 0 else -230), y, 430), (2.35, 0.040, 0.045), metal, rotation=(0, 0, yaw))
    head_x = x + (430 if yaw == 0 else -430)
    head = self._rotated_cube(f"OperatorStage3_Stage3SignalKit_{city}_{style}_{label}_head", (head_x, y, 390), (0.20, 0.070, 0.34), metal, rotation=(0, 0, yaw))
    red = self._rotated_cube(f"OperatorStage3_Stage3SignalKit_{label}_lens_red", (head_x, y - 7, 430), (0.058, 0.018, 0.058), "operator_stage3_signal_lens_red", rotation=(0, 0, yaw))
    green = self._rotated_cube(f"OperatorStage3_Stage3SignalKit_{label}_lens_green", (head_x, y - 7, 348), (0.058, 0.018, 0.058), "operator_stage3_signal_lens_green", rotation=(0, 0, yaw))
    for actor in (pole, arm, head, red, green):
        self._set_actor_property(actor, "Tags", ["OperatorStage3", "Stage3SignalKit", "SUMOReadyAssetPivot", city, style])
```

Expected: signal actors have stable pivots/tags and readable red/green lens geometry.

### Task 7: Compose The Stage 3 Map And Manifest

**Files:**
- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Generated: `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_stage3.umap`
- Generated: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage3_manifest.json`

- [x] **Step 1: Add the Stage 3 scene composer**

Add:

```python
def _build_operator_stage3_scene(self) -> None:
    self._build_operator_stage2_scene()
    kit_profile = self._load_operator_stage3_asset_kits()
    active_city = OPERATOR_STAGE3_ACTIVE_CITY
    for direction, variant, slot, x, y, yaw in OPERATOR_STAGE3_VEHICLE_SLOTS:
        self._spawn_operator_stage3_vehicle(active_city, direction, variant, slot, x, y, yaw)
    for label, city, x, y, yaw, style in OPERATOR_STAGE3_SIGNAL_ASSEMBLIES:
        self._spawn_operator_stage3_signal_assembly(label, city, x, y, yaw, style)
    self.stage3_asset_kit_profile = kit_profile
```

Expected: Stage 3 inherits Stage 2 map/context and adds normalized vehicle/signal actors.

- [x] **Step 2: Route generation**

In the main generation branch:

```python
if self.operator_stage3:
    self._build_operator_stage3_scene()
elif self.operator_stage2:
    self._build_operator_stage2_scene()
elif self.operator_stage1:
    self._build_operator_stage1_scene()
else:
    self._build_city_scene()
```

Expected: Stage 3 does not use the legacy city backplate generation path.

- [x] **Step 3: Write a Stage 3 manifest**

Manifest must include:

```json
{
  "mode": "OperatorStage3",
  "unreal_map": "/Game/Maps/Generated/smart_intersection_rebuild_stage3",
  "base_stage": "OperatorStage2",
  "asset_kit_schema": "operator-stage3-city-asset-kit-v1",
  "active_city": "seoul",
  "city_kits": ["seoul", "new_york", "paris", "london"],
  "required_variants": ["passenger_car", "bus", "taxi", "emergency_vehicle"],
  "actor_evidence": [
    "OperatorStage3",
    "Stage3CityAssetKit",
    "Stage3SignalKit",
    "Stage3VehicleKit",
    "SUMOReadyAssetPivot",
    "OperatorStage2",
    "NoTrafficZoneBackplate",
    "TrafficReadableQueueZone"
  ]
}
```

Expected: verifier can prove Stage 3 is an asset pipeline on top of Stage 2, not a renamed Stage 2 map.

### Task 8: Add Stage 3 Capture

**Files:**
- Create: `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage3.py`
- Create: `scripts/capture-unreal-operator-map-stage3.ps1`

- [x] **Step 1: Copy Stage 2 capture structure and change map/output labels**

Use:

```python
map_path = "/Game/Maps/Generated/smart_intersection_rebuild_stage3"
required_labels = [
    "OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_north_passenger_car_00",
    "OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_south_emergency_vehicle_01",
    "OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_seoul_northwest_pole",
    "OperatorStage2_Stage2ContextGeometry_curb_north_inner",
    "TrafficReadableQueueZone_OperatorStage1_north_boundary"
]
```

Output:

```powershell
$env:SMART_INTERSECTION_OPERATOR_STAGE3_PROOF_OUTPUT = "artifacts\unreal-operator-map-stage3-proof.png"
```

Expected: capture fails if Stage 3 vehicles/signals or inherited Stage 2 context are missing.

- [x] **Step 2: Keep the proof operator-readable**

Capture acceptance:

- image dimensions at least 1600x900
- mean brightness between 60 and 190
- standard deviation above 25
- no alpha channel
- all four approaches remain visible
- city-specific vehicles/signals are visible without covering lane markings, stop bars, crosswalks, or queues

Expected: proof shows the asset pipeline in the real operator map, not an asset lineup.

### Task 9: Add Stage 3 Semantic Verification

**Files:**
- Create: `scripts/verify-sumo-ready-operator-map-stage3.py`

- [x] **Step 1: Check required files and sizes**

Use these minimums:

```python
MIN_STAGE3_REFERENCE_BYTES = 500_000
MIN_STAGE3_MAP_BYTES = 820_000
MIN_STAGE3_PROOF_BYTES = 450_000
REFERENCE = ROOT / "artifacts" / "imagegen" / "sumo-ready-operator-map-stage3-asset-reference.png"
KIT_PROFILE = UE / "SceneProfiles" / "operator_stage3_asset_kits.json"
MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild_stage3.umap"
MANIFEST = UE / "GeneratedProof" / "smart_intersection_rebuild_operator_stage3_manifest.json"
PROOF = ROOT / "artifacts" / "unreal-operator-map-stage3-proof.png"
```

Expected: Stage 3 cannot pass without the reference, profile, map, manifest, and proof artifact.

- [x] **Step 2: Check kit profile schema and city coverage**

Required JSON checks:

```python
required_cities = ["seoul", "new_york", "paris", "london"]
required_variants = ["passenger_car", "bus", "taxi", "emergency_vehicle"]
assert profile["schema"] == "operator-stage3-city-asset-kit-v1"
for city in required_cities:
    assert city in profile["cities"]
    for variant in required_variants:
        assert variant in profile["cities"][city]["variants"]
```

Expected: each city has the same normalized visual variants before Stage 6 expands maps.

- [x] **Step 3: Check generator, manifest, and map tokens**

Required generator tokens:

```python
REQUIRED_GENERATOR_TOKENS = [
    "SMART_INTERSECTION_OPERATOR_STAGE3",
    "OperatorStage3",
    "Stage3CityAssetKit",
    "Stage3SignalKit",
    "Stage3VehicleKit",
    "SUMOReadyAssetPivot",
    "_build_operator_stage3_scene",
]
```

Required map tokens:

```python
REQUIRED_MAP_TOKENS = [
    b"OperatorStage3",
    b"Stage3CityAssetKit",
    b"Stage3SignalKit",
    b"Stage3VehicleKit",
    b"SUMOReadyAssetPivot",
    b"OperatorStage2",
    b"Stage2ContextGeometry",
    b"NoTrafficZoneBackplate",
    b"TrafficReadableQueueZone",
    b"SUMOReadyLargeIntersection",
]
```

Forbidden map tokens:

```python
FORBIDDEN_STAGE3_TOKENS = [
    b"photo_backplate",
    b"road_card",
    b"ImageGen",
    b"asset_lineup",
    b"proof_plinth",
    b"foreground proof",
    b"foreground plinth",
]
```

Expected: Stage 3 proves asset-kit semantics while preserving Stage 1/2 operator-map constraints.

- [x] **Step 4: Check proof image**

Reuse the Stage 2 image check:

```python
check_image(
    PROOF,
    "operator stage3 proof",
    MIN_STAGE3_PROOF_BYTES,
    require_opaque=True,
    min_mean=60.0,
    max_mean=190.0,
    min_stddev=25.0,
)
```

Expected output ends with:

```text
SUMO_READY_OPERATOR_STAGE3_PASS
```

### Task 10: Generate, Capture, And Visually Inspect Stage 3

**Files:**
- Generated: `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_stage3.umap`
- Generated: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage3_manifest.json`
- Generated: `artifacts/unreal-operator-map-stage3-proof.png`

- [x] **Step 1: Generate Stage 3**

Run:

```powershell
npm run unreal:generate:operator-stage3
```

Expected:

- no `Traceback`
- no `LogPython: Error`
- generated map exists at `smart_intersection_rebuild_stage3.umap`
- Stage 3 manifest exists and has mode `OperatorStage3`

- [x] **Step 2: Capture Stage 3**

Run:

```powershell
npm run unreal:capture:operator-stage3
```

Expected: proof PNG exists at `artifacts/unreal-operator-map-stage3-proof.png`.

- [x] **Step 3: Human visual inspection**

Reject the capture if any condition is true:

- vehicle actors are obviously too large for lanes, too small to read, or floating above the road
- signal heads/poles are invisible, oversized, or blocking lane readability
- emergency/taxi/bus variants are not distinguishable at the operator camera distance
- assets are arranged as a lineup, proof strip, or debug display instead of real queue/signal positions
- Image Gen reference appears as a card/backplate/texture plane in the map
- Stage 2 context geometry or Stage 1 queue/road semantics are lost
- exposure makes vehicles, signals, lane markings, sidewalks, or queues unreadable

Expected: the operator can read lanes and queues while also seeing normalized city-specific signal and vehicle assets.

### Task 11: Final Stage 3 Validation And Status Update

**Files:**
- Validate: changed source, generated map, kit profile, manifest, proof image, package scripts, this plan
- Modify after evidence: `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`

- [x] **Step 1: Run focused Stage 3 checks**

Run:

```powershell
npm run unreal:precheck
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
npm run verify:operator-map-stage3
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-simulator-builder-agent.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-complete-simulation-renderer.py
git diff --check
```

Expected: all pass before any Stage 3 completion claim.

- [x] **Step 2: Run full repo validation before commit or push**

Run:

```powershell
npm run verify
```

Expected: API tests, web tests, web build, and `git diff --check` pass. If unrelated environment gates fail, document the exact failure and still keep Stage 3 checkboxes open unless the Stage 3 verifier and visual inspection pass.

- [x] **Step 3: Update Stage 3 verification status**

## Stage 3 Verification Status - 2026-06-15

**Verdict:** Stage 3 deliverable is implemented and verified for the requested scope.

Current evidence:

- Stage 3 reference image: `STAGE3 IMAGEGEN REFERENCE_CHECK_PASS size=(1672, 941) bytes=1759815 mean=178.24 stddev=84.22`.
- Stage 3 asset-kit profile: `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage3_asset_kits.json`, schema `operator-stage3-city-asset-kit-v1`, cities `seoul`, `new_york`, `paris`, `london`, variants `passenger_car`, `bus`, `taxi`, `emergency_vehicle`.
- Stage 3 generated map: `MAP_STAGE3_TOKEN_CHECK_PASS bytes=896916`.
- Stage 3 manifest: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage3_manifest.json`, mode `OperatorStage3`, base stage `OperatorStage2`.
- Stage 3 proof: `OPERATOR STAGE3 PROOF_CHECK_PASS size=(1600, 900) bytes=732573 mean=160.99 stddev=75.18`.
- Stage 3 verifier output: `SUMO_READY_OPERATOR_STAGE3_PASS`.
- Stage 1 and Stage 2 verifier outputs still pass: `SUMO_READY_OPERATOR_STAGE1_PASS` and `SUMO_READY_OPERATOR_STAGE2_PASS`.
- Focused checks passed: `npm run unreal:precheck`, bundled-Python `verify-simulator-builder-agent.py` with `SIMULATOR_BUILDER_AGENT_PASS`, bundled-Python `verify-complete-simulation-renderer.py` through `UNREAL_HTTP_SMOKE_ARTIFACTS_CHECK_PASS`, and `git diff --check`.
- Full repo validation passed: `npm run verify` completed API tests (`70 passed`), web tests (`46 passed`), Next.js build, and final `git diff --check`; only Windows LF-to-CRLF warnings were emitted.
- Human visual inspection of `artifacts/unreal-operator-map-stage3-proof.png` found normalized city-specific vehicle/signal assets in real lane/signal positions, no asset lineup/proof strip, no traffic-zone cards/backplates, and preserved queue readability.

Remaining non-Stage-3 gates, intentionally not marked complete:

- live SUMO/TraCI motion binding
- Pixel Streaming dashboard proof
- multi-city operator-map expansion
- real traffic-controller integration

## Stage 4: SUMO/TraCI Motion Binding Detailed Task Plan

**Goal:** Turn the Stage 3 operator map into a fixture-backed motion-binding proof where FastAPI renderer snapshots drive Unreal runtime state through `ATrafficSimulationController`, and two deterministic snapshots visibly change signal phase, queue/vehicle state, pedestrian state, and emergency state.

**Current repo baseline:** Stage 4 starts from already-existing seams, not from scratch:

- FastAPI exposes `/api/renderer/unreal/snapshot` through `apps/api/app/api/routes.py`.
- Snapshot normalization lives in `apps/api/app/services/renderer_snapshot.py`.
- Contract coverage exists in `apps/api/tests/test_api_flow.py::test_unreal_renderer_snapshot_matches_runtime_controller_contract`.
- Unreal runtime parsing/polling lives in `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Public/TrafficSimulationController.h` and `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Private/TrafficSimulationController.cpp`.
- Runtime smoke scripts already exercise multiple snapshots through `scripts/smoke-unreal-runtime-snapshot.ps1`, `scripts/smoke-unreal-http-snapshot.ps1`, `renderer/unreal/SmartIntersection/Content/Python/smoke_runtime_snapshot_controller.py`, and `renderer/unreal/SmartIntersection/Content/Python/smoke_http_snapshot_controller.py`.
- Stage 3 provides normalized asset labels/tags such as `OperatorStage3`, `Stage3VehicleKit`, `Stage3SignalKit`, and `SUMOReadyAssetPivot`.

**Stage 4 completion boundary:** Fixture mode can be completed with deterministic snapshots, generated proof images, semantic verifier output, and repo validation. Live SUMO mode is only complete after a real local `sumo_traci` runtime execution passes and its readiness/smoke evidence is recorded. Do not mark live SUMO complete from fixture snapshots.

### Task 12: Stage 4 Baseline And Scope Lock

**Files to inspect before editing:**

- `AGENTS.md`
- `docs/agents/simulator-builder-agent.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- `docs/technotes/ue57-doc-digest/python_editor.txt`
- `docs/technotes/ue57-doc-digest/actors.txt`
- `docs/technotes/ue57-doc-digest/static_meshes.txt`
- `docs/technotes/ue57-doc-digest/materials.txt`
- `docs/technotes/ue57-doc-digest/pixel_streaming.txt`
- `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage3_asset_kits.json`
- `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage3_manifest.json`
- `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- `renderer/unreal/SmartIntersection/Content/Python/smoke_runtime_snapshot_controller.py`
- `renderer/unreal/SmartIntersection/Content/Python/smoke_http_snapshot_controller.py`
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Public/TrafficSimulationController.h`
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Private/TrafficSimulationController.cpp`
- `apps/api/app/api/routes.py`
- `apps/api/app/services/renderer_snapshot.py`
- `apps/api/app/adapters/simulation.py`
- `apps/api/tests/test_api_flow.py`
- `scripts/verify-sumo-ready-operator-map-stage3.py`
- `scripts/verify-complete-simulation-renderer.py`
- `scripts/smoke-unreal-runtime-snapshot.ps1`
- `scripts/smoke-unreal-http-snapshot.ps1`

- [ ] **Step 1: Confirm current branch and dirty scope**

Run:

```powershell
git status --short --branch
git fetch origin main
git status --short --branch
```

Expected: current branch is `main`, existing user/doc changes are identified before Stage 4 implementation, and no unrelated dirty files are silently staged or reverted.

- [ ] **Step 2: Run pre-change baseline checks**

Run:

```powershell
npm run unreal:precheck
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
npm run verify:operator-map-stage3
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-simulator-builder-agent.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-complete-simulation-renderer.py
git diff --check
```

Expected: Stage 1-3 and current renderer seams pass before Stage 4 changes. If any check fails, diagnose that failure before adding Stage 4 scope.

- [ ] **Step 3: Record Stage 4 assumptions**

Document in this plan whether:

- Unreal Engine 5.7 is available locally.
- SUMO binary and TraCI Python package are available.
- `npm run runtime:readiness` reports `sumo_traci` ready or deferred.
- Stage 4 will complete fixture mode only, or fixture mode plus live SUMO mode.

Expected: the plan status distinguishes "fixture proof complete" from "live SUMO complete".

### Task 13: Define The Stage 4 Renderer Snapshot Contract

**Files:**

- Read/modify: `apps/api/app/services/renderer_snapshot.py`
- Read/modify: `apps/api/tests/test_api_flow.py`
- Create if needed: `apps/api/tests/fixtures/stage4_renderer_snapshots.json`
- Create if needed: `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage4_motion_bindings.json`

- [ ] **Step 1: Preserve the existing aggregate snapshot contract**

Keep the keys already consumed by `ATrafficSimulationController`:

- `snapshot_type`
- `source`
- `simulation_source`
- `cityProfileId`
- `city_profile`
- `activeSignalGroup`
- `signal_phase`
- `cycleSecond`
- `cycle_second`
- `queues`
- `pedestrianRequest`
- `pedestrian_request`
- `emergency_vehicle_approach`
- `emergency_priority`
- `emergencyVehicleDirection`
- `emergency_direction`
- `pixelStreamConnected`
- `pixel_stream_connected`
- `pixelStreamStatus`
- `pixel_stream_status`
- `pixelStreamSignallingUrl`
- `pixel_stream_signalling_url`
- `safety_boundary`

Expected: Stage 4 does not break Stage 3 runtime smoke tests or the existing FastAPI snapshot test.

- [ ] **Step 2: Add a narrow motion-binding extension if needed**

If the existing aggregate fields are not enough to move Stage 3 vehicle actors, add a backwards-compatible Stage 4 field such as:

```json
{
  "snapshot_id": "stage4-fixture-a",
  "simulation_time_seconds": 12.0,
  "motion_binding_version": "operator-stage4-motion-v1",
  "vehicles": [
    {
      "actor_label": "OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_north_passenger_car_00",
      "vehicle_id": "veh-north-00",
      "lane_id": "north_inbound_0",
      "direction": "north",
      "x_cm": -42.0,
      "y_cm": 182.0,
      "z_cm": 38.0,
      "heading_deg": 180.0,
      "speed_mps": 3.4,
      "class": "passenger_car"
    }
  ],
  "signals": [
    {
      "actor_label": "OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_seoul_northwest_pole",
      "signal_group": "north_south",
      "state": "green"
    }
  ]
}
```

Expected: the extension names stable Stage 3 actor labels/tags and stays renderer-only. It must not add real traffic-control authority to Unreal.

- [ ] **Step 3: Define two deterministic fixture snapshots**

Create or derive two fixture snapshots:

- Snapshot A: east/west priority, visible east/west movement, active pedestrian/emergency markers as appropriate.
- Snapshot B: north/south priority, changed vehicle transforms, changed queues, changed signal phase, and changed emergency/pedestrian state.

Expected: A and B are deterministic enough for tests and screenshots, but shaped like normalized SUMO/TraCI output so live mode can reuse the same renderer contract later.

### Task 14: Extend FastAPI Snapshot Output And Tests

**Files:**

- Modify: `apps/api/app/services/renderer_snapshot.py`
- Modify: `apps/api/app/api/routes.py` only if routing/query controls are needed
- Modify: `apps/api/tests/test_api_flow.py`
- Read: `apps/api/app/adapters/simulation.py`
- Read: `apps/api/app/services/runtime_readiness.py`

- [ ] **Step 1: Route fixture snapshots without weakening live SUMO boundaries**

Add a Stage 4 fixture path only if needed, such as a query parameter or fixture source that returns Snapshot A or Snapshot B. Keep `simulation_source` honest:

- `sumo_traci_fixture` for deterministic fixture data
- `sumo_traci` only when the live adapter is actually configured and used

Expected: API payloads cannot imply live SUMO execution when they came from fixtures.

- [ ] **Step 2: Test the Stage 4 contract**

Add focused API coverage proving:

- Snapshot A and Snapshot B both return the preserved aggregate keys.
- `vehicles` entries reference known Stage 3 actor labels or a documented binding profile.
- signal state changes between snapshots.
- vehicle positions or headings change between snapshots.
- `simulation_source` remains honest.
- `safety_boundary` still contains the no-real-control warning.

Run:

```powershell
npm run test:api -- -k "renderer_snapshot or unreal_renderer_snapshot"
```

Expected: focused API tests pass before touching Unreal runtime binding.

- [ ] **Step 3: Keep readiness separate from renderer proof**

Run:

```powershell
npm run runtime:readiness
```

Expected: readiness output is copied into Stage 4 status. Missing SUMO/TraCI remains a deferred live gate, not a fixture-proof failure.

### Task 15: Bind Stage 4 Snapshots Inside `ATrafficSimulationController`

**Files:**

- Modify: `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Public/TrafficSimulationController.h`
- Modify: `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Private/TrafficSimulationController.cpp`
- Modify if needed: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Modify if needed: `renderer/unreal/SmartIntersection/Content/Python/smoke_runtime_snapshot_controller.py`
- Modify if needed: `renderer/unreal/SmartIntersection/Content/Python/smoke_http_snapshot_controller.py`

- [ ] **Step 1: Keep the existing aggregate visual behavior stable**

Before adding per-vehicle binding, preserve:

- signal phase parsing from `activeSignalGroup` and `signal_phase`
- queue marker counts from `queues`
- pedestrian marker visibility
- emergency direction marker visibility/location
- Pixel Streaming readiness marker
- invalid JSON reset behavior

Expected: current runtime and HTTP smoke artifacts still pass after Stage 4 code changes.

- [ ] **Step 2: Add per-vehicle state parsing only as narrowly as needed**

If `vehicles` is added to the snapshot contract, add Unreal-side storage for the last parsed vehicle states. Keep it simple:

- actor label or tag key
- vehicle id
- lane id
- direction
- location in centimeters
- heading in degrees
- speed in meters per second
- vehicle class

Expected: controller state can prove the snapshot was parsed even in a null-RHI smoke test.

- [ ] **Step 3: Apply runtime state to actual Stage 3 actors**

In an editor/proof map path, bind vehicle entries to Stage 3 actors by label/tag and update transforms. Bind signal entries to Stage 3 signal heads/material state or to a clearly documented runtime visual proxy if material swaps are not available yet.

Expected: proof captures show changed vehicle positions and changed signal phase between Snapshot A and Snapshot B.

- [ ] **Step 4: Avoid turning Unreal into the simulation source**

Do not add Unreal-side route planning, traffic-light decision logic, random vehicle movement, or controller-owned simulation truth.

Expected: code comments, manifest text, and verifier tokens continue to say SUMO/TraCI is truth, FastAPI orchestrates, Unreal renders.

### Task 16: Generate Stage 4 Proof Artifacts

**Files:**

- Create: `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage4.py`
- Create: `scripts/capture-unreal-operator-map-stage4.ps1`
- Modify: `package.json`
- Create: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage4_motion_manifest.json`
- Create: `artifacts/unreal-operator-map-stage4-snapshot-a.png`
- Create: `artifacts/unreal-operator-map-stage4-snapshot-b.png`
- Create if useful: `artifacts/unreal-operator-map-stage4-motion-contact-sheet.png`

- [ ] **Step 1: Add Stage 4 capture routing**

Add script routing:

```json
"unreal:capture:operator-stage4": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-operator-map-stage4.ps1"
```

Expected: capture can be run by one package script and does not require manual Unreal viewport clicks.

- [ ] **Step 2: Capture two deterministic states from the same operator camera**

The capture script must:

- open the Stage 3/Stage 4 operator map
- apply Snapshot A
- capture image A
- apply Snapshot B
- capture image B from the same camera
- emit a manifest with snapshot ids, changed phase, changed queues, changed vehicle bindings, and file paths

Expected: the camera does not move between A and B, so visual differences prove runtime state changes rather than camera drift.

- [ ] **Step 3: Perform human visual inspection**

Reject Stage 4 proof if any condition is true:

- vehicle movement is not visible at operator-map distance
- signal phase cannot be read
- changed queue markers hide lane geometry
- actor transforms float, clip, or leave the road
- proof images contain cards, proof strips, plinths, or asset lineups
- Stage 1/2/3 readability is lost
- fixture proof is described as live SUMO proof

Expected: the user can look at A/B or the contact sheet and see a real state transition in the 3D operator viewport.

### Task 17: Add Stage 4 Semantic Verifier

**Files:**

- Create: `scripts/verify-sumo-ready-operator-map-stage4.py`
- Modify: `package.json`
- Read: `scripts/verify-sumo-ready-operator-map-stage1.py`
- Read: `scripts/verify-sumo-ready-operator-map-stage2.py`
- Read: `scripts/verify-sumo-ready-operator-map-stage3.py`

- [ ] **Step 1: Add a focused verifier command**

Add:

```json
"verify:operator-map-stage4": "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"& \\\"$env:USERPROFILE\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe\\\" scripts/verify-sumo-ready-operator-map-stage4.py\""
```

Expected: Stage 4 can be validated independently.

- [ ] **Step 2: Verify contract and source tokens**

The Stage 4 verifier should check:

- Stage 1, Stage 2, and Stage 3 carryover tokens still exist.
- Stage 4 motion-binding fixture/profile exists and is valid JSON.
- Snapshot A and B have different `snapshot_id`, `activeSignalGroup`, `cycleSecond`, queue values, and vehicle positions/headings.
- Snapshot payload keeps preserved aggregate keys.
- `TrafficSimulationController` contains Stage 4 parse/apply tokens.
- FastAPI tests include the Stage 4 snapshot contract.
- `package.json` exposes Stage 4 capture and verify scripts.
- manifest says fixture proof unless a live SUMO run was actually used.

Expected: verifier fails loudly if fixture proof is mislabeled as live SUMO.

- [ ] **Step 3: Verify proof images**

The verifier should check:

- both proof images exist and are readable
- each image has minimum dimensions and nontrivial brightness/contrast
- A and B differ by a meaningful pixel threshold
- optional contact sheet exists if generated

Expected: `SUMO_READY_OPERATOR_STAGE4_PASS` is printed only after semantic and visual artifact checks pass.

### Task 18: Live SUMO/TraCI Gate

**Files:**

- Read: `apps/api/app/adapters/simulation.py`
- Read: `apps/api/app/core/config.py`
- Read: `apps/api/app/services/runtime_readiness.py`
- Read/modify only if needed: `scripts/smoke-unreal-http-snapshot.ps1`
- Create if needed: `scripts/smoke-stage4-live-sumo-renderer.ps1`

- [ ] **Step 1: Check runtime readiness**

Run:

```powershell
npm run runtime:readiness
```

Expected: output records whether SUMO binary, TraCI package, SUMO config, vector/runtime gates, and simulation mode are ready.

- [ ] **Step 2: Run live smoke only if readiness supports it**

Only when readiness shows `sumo_traci` is actually available, run a local API/runtime path that:

- configures `SUMO_SIMULATION_MODE=sumo_traci`
- starts or invokes the FastAPI renderer snapshot path
- obtains a real live snapshot
- applies it to `ATrafficSimulationController`
- records the exact command, output artifact, and `simulation_source=sumo_traci`

Expected: live SUMO is marked complete only with real command output and artifact evidence.

- [ ] **Step 3: If live SUMO is unavailable, leave the gate open**

If SUMO, TraCI, config, or runtime mode is missing, record the readiness output and leave live mode unchecked.

Expected: fixture Stage 4 can still complete, but the live SUMO bullet remains explicitly incomplete.

### Task 19: Final Stage 4 Validation And Status Update

**Files:**

- Validate: API snapshot service/tests, runtime controller, Stage 4 fixture/profile, capture scripts, verifier, proof images, manifest, package scripts, this plan
- Modify after evidence: `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`

- [ ] **Step 1: Run focused checks**

Run:

```powershell
npm run unreal:precheck
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
npm run verify:operator-map-stage3
npm run verify:operator-map-stage4
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-simulator-builder-agent.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-complete-simulation-renderer.py
npm run runtime:readiness
git diff --check
```

Expected: focused checks pass, and readiness output is recorded honestly.

- [ ] **Step 2: Run full repo validation before commit or push**

Run:

```powershell
npm run verify
```

Expected: API tests, web tests, web build, and `git diff --check` pass. If the live SUMO gate is deferred, document it as a remaining Stage 4 live-mode blocker, not a repo validation failure.

- [ ] **Step 3: Update Stage 4 verification status**

After implementation, add a `Stage 4 Verification Status - YYYY-MM-DD` block with:

- final fixture/live verdict
- artifact paths
- exact verifier outputs
- runtime readiness output summary
- proof image visual inspection summary
- any deferred live SUMO, Pixel Streaming, multi-city, or real-controller gates

Expected: checkboxes are only changed to `- [x]` when the evidence exists in files, logs, test output, artifacts, or human visual inspection.

### Stage 4 Goal Mode Prompt

This prompt follows the OpenAI Cookbook guidance in "Using Goals in Codex":
`https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex`.

The Goal is written as a completion contract with outcome, verification surface, constraints, boundaries, iteration policy, and blocked stop condition.

```md
/goal Build Stage 4 of the SUMO-ready 3D operator map for SmartIntersection: a fixture-backed SUMO/TraCI motion-binding proof where FastAPI renderer snapshots drive the Stage 3 Unreal operator map through `ATrafficSimulationController`, and two deterministic snapshots visibly change signal phase, queue/vehicle state, pedestrian state, and emergency state without losing Stage 1/2/3 readability.

Use required skills before acting: Superpowers process skills for execution/verification and `karpathy-guidelines` before planning, coding, review, refactor, or debugging. Keep changes surgical and evidence-driven.

Keep `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md` as the live progress document. Use checkboxes exactly: `- [ ]` for open, `- [x]` only when evidence exists. Do not track completion only in chat.

Start from repo `C:\Users\100ri\abc_project`. Read `AGENTS.md`, `docs/agents/simulator-builder-agent.md`, this plan, relevant UE 5.7 digests, `operator_stage3_asset_kits.json`, the Stage 3 manifest/verifier, `TrafficSimulationController.h/.cpp`, `renderer_snapshot.py`, `routes.py`, `apps/api/tests/test_api_flow.py`, and the runtime/HTTP smoke scripts before editing.

Verify the baseline first with `npm run unreal:precheck`, `npm run verify:operator-map-stage1`, `npm run verify:operator-map-stage2`, `npm run verify:operator-map-stage3`, bundled-Python `scripts/verify-simulator-builder-agent.py`, bundled-Python `scripts/verify-complete-simulation-renderer.py`, `npm run runtime:readiness`, and `git diff --check`.

Preserve the existing renderer snapshot aggregate contract consumed by `ATrafficSimulationController`: signal phase, cycle second, directional queues, pedestrian request, emergency vehicle direction, Pixel Streaming status, source fields, and safety boundary. Add a backwards-compatible Stage 4 motion extension only if needed for per-vehicle actor movement.

Create two deterministic Stage 4 fixture snapshots shaped like normalized SUMO/TraCI output. Snapshot A and Snapshot B must change signal phase, cycle second, queue values, vehicle positions/headings, and pedestrian/emergency state. Keep `simulation_source=sumo_traci_fixture` unless a real local SUMO/TraCI run is actually executed.

Extend FastAPI tests so both snapshots preserve the existing contract, expose honest source metadata, reference Stage 3 actor labels/tags or a documented binding profile, and keep the no-real-control safety boundary.

Bind snapshots in Unreal through `ATrafficSimulationController`. Preserve existing aggregate visual behavior, then add the narrowest needed per-vehicle state parsing and actor transform/material application. Do not add Unreal-side route planning, traffic-light decision logic, random vehicle motion, or real controller authority.

Generate Stage 4 proof artifacts: `artifacts/unreal-operator-map-stage4-snapshot-a.png`, `artifacts/unreal-operator-map-stage4-snapshot-b.png`, optional `artifacts/unreal-operator-map-stage4-motion-contact-sheet.png`, and `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage4_motion_manifest.json`. The same operator camera must show a visible A/B state transition.

Add `scripts/verify-sumo-ready-operator-map-stage4.py`, `verify:operator-map-stage4`, and `unreal:capture:operator-stage4`. The verifier must fail if fixture proof is labeled as live SUMO, if A/B snapshots do not differ semantically, if proof images are unreadable or too similar, or if Stage 1/2/3 carryover tokens are lost.

Run final validation: `npm run verify:operator-map-stage1`, `npm run verify:operator-map-stage2`, `npm run verify:operator-map-stage3`, `npm run verify:operator-map-stage4`, bundled-Python `scripts/verify-simulator-builder-agent.py`, bundled-Python `scripts/verify-complete-simulation-renderer.py`, `npm run runtime:readiness`, `npm run verify`, `git diff --check`, and human visual inspection of the Stage 4 proof images.

Completion means the Stage 4 fixture proof is implemented, artifacts exist, verifier prints `SUMO_READY_OPERATOR_STAGE4_PASS`, repo validation passes, human visual inspection confirms the A/B motion state transition, and this plan is updated with exact evidence. Live SUMO mode is complete only if a real local `sumo_traci` runtime run passes and the artifact/source metadata prove it.

Preserve constraints: SUMO/TraCI truth, FastAPI orchestration, Unreal rendering, no real traffic-controller integration, no Pixel Streaming proof unless explicitly implemented in Stage 5, no landing-page changes, no production proof strips/plinths/asset lineups, no traffic-zone cards/backplates, no secrets or generated UE security tokens in commits, and no claim of live SUMO completion from fixture data.

If blocked, stop and report the exact blocker, inspected files/commands, current artifacts, unchecked boxes, missing runtime/tooling, and the smallest action that would unlock progress. Do not mark complete merely because a script ran; completion must be evidence-based.
```

### Stage 3 Goal Mode Prompt

Use this prompt in the next Stage 3 execution session:

```md
/goal Build Stage 3 of the SUMO-ready 3D operator map for SmartIntersection: a city-specific signal and vehicle asset pipeline that keeps Stage 2 as the production map base, adds normalized Unreal 3D vehicle and signal actors for Seoul/New York/Paris/London kits, and proves one Seoul Stage 3 operator map with stable pivots, lane fit, city-specific materials, manifest evidence, proof capture, and semantic verifier.

Use required skills before acting: Superpowers process skills for execution/verification and `karpathy-guidelines` before planning, coding, review, refactor, or debugging. Keep changes surgical and define evidence for each slice.

Keep `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md` as the live progress doc. Use checkboxes exactly: `- [ ]` for open, `- [x]` only when evidence exists. Do not track completion only in chat.

Start from repo `C:\Users\100ri\abc_project` at or after commit `385ca20a`. Read `AGENTS.md`, `docs/agents/simulator-builder-agent.md`, this plan, relevant UE 5.7 digests, `generate_road_intersection.py`, Stage 2 verifier, and `TrafficSimulationController` before editing.

First verify Stage 2 baseline with `npm run unreal:precheck`, `npm run verify:operator-map-stage1`, `npm run verify:operator-map-stage2`, bundled-Python `scripts/verify-simulator-builder-agent.py`, bundled-Python `scripts/verify-complete-simulation-renderer.py`, and `git diff --check`.

Use Image Gen only to create `artifacts/imagegen/sumo-ready-operator-map-stage3-asset-reference.png` for city asset reference. Do not import it as a road card, facade card, billboard, backplate, texture plane, or runtime object.

Create `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage3_asset_kits.json` with schema `operator-stage3-city-asset-kit-v1`, cities `seoul`, `new_york`, `paris`, `london`, and variants `passenger_car`, `bus`, `taxi`, `emergency_vehicle`.

Add Stage 3 routing: `-OperatorStage3`, `SMART_INTERSECTION_OPERATOR_STAGE3`, `unreal:generate:operator-stage3`, `unreal:capture:operator-stage3`, and `verify:operator-map-stage3`.

Generate `smart_intersection_rebuild_stage3.umap`, `smart_intersection_rebuild_operator_stage3_manifest.json`, and `artifacts/unreal-operator-map-stage3-proof.png`. Verify tokens `OperatorStage3`, `Stage3CityAssetKit`, `Stage3SignalKit`, `Stage3VehicleKit`, `SUMOReadyAssetPivot`, preserved `OperatorStage2`, `NoTrafficZoneBackplate`, `TrafficReadableQueueZone`, and `SUMOReadyLargeIntersection`.

Preserve constraints: SUMO/TraCI truth, FastAPI orchestration, Unreal rendering, no real controller integration, no live SUMO motion binding, no Pixel Streaming proof, no landing-page changes, no production proof strips/plinths/asset lineups, no traffic-zone cards/backplates, and no `photo_backplate`, `road_card`, `ImageGen`, `asset_lineup`, `proof_plinth`, `foreground proof`, or `foreground plinth` in the Stage 3 map.

Run final validation: `npm run verify:operator-map-stage1`, `npm run verify:operator-map-stage2`, `npm run verify:operator-map-stage3`, `scripts/verify-simulator-builder-agent.py`, `scripts/verify-complete-simulation-renderer.py`, `npm run verify`, and human visual inspection of the Stage 3 proof image.

If blocked, report blocker, inspected files/commands, evidence, unchecked boxes, uncertainty, and what unlocks progress. Do not mark complete unless artifacts, verifier, human visual inspection, and checkboxes all prove Stage 3.
```

## Stage 2 Goal Mode Prompt

This prompt follows the OpenAI Cookbook guidance in "Using Goals in Codex":
`https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex`.

The Goal is written as a compact completion contract with:

- outcome
- verification surface
- constraints
- boundaries
- required skills
- iteration policy
- blocked stop condition
- live checkbox tracking

Use this prompt in the next Stage 2 session. It is intentionally kept under 4000 characters:

```md
/goal Build Stage 2 of the SUMO-ready 3D operator map for SmartIntersection: one generated Unreal Stage 2 map that keeps Stage 1 road/queue semantics and replaces traffic-area backplate/card dependence with real 3D context geometry: curbs, sidewalks, medians, guardrails, traffic cabinets, CCTV/street-light/sign hardware, and low-rise facade blocks outside the traffic-reading zone.

First close Stage 1 carryover: fix or bypass the broken Windows `python3` npm verifier path, reduce Stage 1 proof overexposure, make the central median/island read as lane/median infrastructure rather than black obstruction bars, recapture `artifacts/unreal-operator-map-stage1-proof.png`, and re-run the Stage 1 verifier.

Use required skills before acting: Superpowers process skills for execution/verification and `karpathy-guidelines` before planning, coding, review, refactor, or debugging. Keep changes surgical and define evidence for each slice.

Keep `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md` as the live progress doc. Use checkboxes exactly: `- [ ]` for open, `- [x]` only when evidence exists. Do not track completion only in chat.

Use Image Gen first to create `artifacts/imagegen/sumo-ready-operator-map-stage2-context-reference.png` for context/material direction. It is reference only; do not import it as a road card, facade card, billboard, backplate, or texture plane.

Verify with: Stage 2 reference PNG, `smart_intersection_rebuild_stage2.umap`, Stage 2 manifest, `artifacts/unreal-operator-map-stage2-proof.png`, tokens `OperatorStage2`, `Stage2ContextGeometry`, `NoTrafficZoneBackplate`, `TrafficReadableQueueZone`, preserved `OperatorStage1`, `SUMOReadyLargeIntersection`, `QueueCapacity_40`, and `scripts/verify-sumo-ready-operator-map-stage2.py`.

Run `npm run unreal:precheck`, Stage 1 verifier, `scripts/verify-simulator-builder-agent.py`, `scripts/verify-complete-simulation-renderer.py`, Stage 2 verifier, and `git diff --check`. Use `C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe` for Python unless npm verifier routing is fixed and proven.

Preserve constraints: SUMO/TraCI truth, FastAPI orchestration, Unreal rendering, no real controller integration, no landing-page changes, no proof strips/plinths/debug lineups, no traffic-zone cards/backplates, no `photo_backplate`, `road_card`, `ImageGen`, `foreground proof`, `foreground plinth`, or `PolyHaven CC0 VISIBLE` in the Stage 2 map, and no commit/push unless asked.

Use repo `C:\Users\100ri\abc_project`, `AGENTS.md`, `docs/agents/simulator-builder-agent.md`, this plan, UE 5.7 digests, and only Stage 2 owned files listed in the plan.

Between iterations inspect map, manifest, verifier output, proof capture, visual failure, and checkbox state. Choose the smallest next change that improves context geometry, traffic readability, exposure/framing, or card/backplate removal without Stage 3+ scope creep.

If blocked, report blocker, inspected files/commands, evidence, unchecked boxes, uncertainty, and what unlocks progress. Do not mark complete unless artifacts, verifier, human visual inspection, and checkboxes all prove Stage 2.
```

## Stage 1 Goal Mode Prompt

This prompt follows the OpenAI Cookbook guidance in "Using Goals in Codex":
`https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex`.

The Goal is written as a compact completion contract with:

- outcome
- verification surface
- constraints
- boundaries
- required skills
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
- Stage 1 verification update: semantic checks pass through the bundled Python runtime and npm verifier alias; the Stage 1 proof was recaptured with acceptable exposure and central-median readability.
- Stage 2 coverage: plan covers Image Gen reference direction, generation mode, real 3D context geometry, no-traffic-zone-backplate policy, capture, semantic verifier, and visual inspection gates.
- Stage 2 Goal prompt update: explicitly requires live checkbox tracking with `- [ ]` and `- [x]` in this plan document.
