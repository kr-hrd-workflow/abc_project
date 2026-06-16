# Stage 2: 3D Foreground And City Context Replacement

Back to [SUMO-Ready 3D Operator Map Implementation Plan](../2026-06-15-sumo-ready-3d-operator-map.md).

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
