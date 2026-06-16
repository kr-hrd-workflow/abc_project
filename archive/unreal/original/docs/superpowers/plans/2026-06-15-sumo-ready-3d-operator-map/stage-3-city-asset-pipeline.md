# Stage 3: City-Specific Signal And Vehicle Asset Pipeline

Back to [SUMO-Ready 3D Operator Map Implementation Plan](../2026-06-15-sumo-ready-3d-operator-map.md).

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
