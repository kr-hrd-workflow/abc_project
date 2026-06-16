# Stage 4: SUMO/TraCI Motion Binding

Back to [SUMO-Ready 3D Operator Map Implementation Plan](../2026-06-15-sumo-ready-3d-operator-map.md).

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

- [x] **Step 1: Confirm current branch and dirty scope**

Run:

```powershell
git status --short --branch
git fetch origin main
git status --short --branch
```

Expected: current branch is `main`, existing user/doc changes are identified before Stage 4 implementation, and no unrelated dirty files are silently staged or reverted.

- [x] **Step 2: Run pre-change baseline checks**

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

- [x] **Step 3: Record Stage 4 assumptions**

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

- [x] **Step 1: Preserve the existing aggregate snapshot contract**

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

- [x] **Step 2: Add a narrow motion-binding extension if needed**

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

- [x] **Step 3: Define two deterministic fixture snapshots**

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

- [x] **Step 1: Route fixture snapshots without weakening live SUMO boundaries**

Add a Stage 4 fixture path only if needed, such as a query parameter or fixture source that returns Snapshot A or Snapshot B. Keep `simulation_source` honest:

- `sumo_traci_fixture` for deterministic fixture data
- `sumo_traci` only when the live adapter is actually configured and used

Expected: API payloads cannot imply live SUMO execution when they came from fixtures.

- [x] **Step 2: Test the Stage 4 contract**

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

- [x] **Step 3: Keep readiness separate from renderer proof**

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

- [x] **Step 1: Keep the existing aggregate visual behavior stable**

Before adding per-vehicle binding, preserve:

- signal phase parsing from `activeSignalGroup` and `signal_phase`
- queue marker counts from `queues`
- pedestrian marker visibility
- emergency direction marker visibility/location
- Pixel Streaming readiness marker
- invalid JSON reset behavior

Expected: current runtime and HTTP smoke artifacts still pass after Stage 4 code changes.

- [x] **Step 2: Add per-vehicle state parsing only as narrowly as needed**

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

- [x] **Step 3: Apply runtime state to actual Stage 3 actors**

In an editor/proof map path, bind vehicle entries to Stage 3 actors by label/tag and update transforms. Bind signal entries to Stage 3 signal heads/material state or to a clearly documented runtime visual proxy if material swaps are not available yet.

Expected: proof captures show changed vehicle positions and changed signal phase between Snapshot A and Snapshot B.

- [x] **Step 4: Avoid turning Unreal into the simulation source**

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

- [x] **Step 1: Add Stage 4 capture routing**

Add script routing:

```json
"unreal:capture:operator-stage4": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-operator-map-stage4.ps1"
```

Expected: capture can be run by one package script and does not require manual Unreal viewport clicks.

- [x] **Step 2: Capture two deterministic states from the same operator camera**

The capture script must:

- open the Stage 3/Stage 4 operator map
- apply Snapshot A
- capture image A
- apply Snapshot B
- capture image B from the same camera
- emit a manifest with snapshot ids, changed phase, changed queues, changed vehicle bindings, and file paths

Expected: the camera does not move between A and B, so visual differences prove runtime state changes rather than camera drift.

- [x] **Step 3: Perform human visual inspection**

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

- [x] **Step 1: Add a focused verifier command**

Add:

```json
"verify:operator-map-stage4": "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"& \\\"$env:USERPROFILE\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe\\\" scripts/verify-sumo-ready-operator-map-stage4.py\""
```

Expected: Stage 4 can be validated independently.

- [x] **Step 2: Verify contract and source tokens**

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

- [x] **Step 3: Verify proof images**

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

- [x] **Step 1: Check runtime readiness**

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

- [x] **Step 3: If live SUMO is unavailable, leave the gate open**

If SUMO, TraCI, config, or runtime mode is missing, record the readiness output and leave live mode unchecked.

Expected: fixture Stage 4 can still complete, but the live SUMO bullet remains explicitly incomplete.

### Task 19: Final Stage 4 Validation And Status Update

**Files:**

- Validate: API snapshot service/tests, runtime controller, Stage 4 fixture/profile, capture scripts, verifier, proof images, manifest, package scripts, this plan
- Modify after evidence: `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`

- [x] **Step 1: Run focused checks**

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

- [x] **Step 2: Run full repo validation before commit or push**

Run:

```powershell
npm run verify
```

Expected: API tests, web tests, web build, and `git diff --check` pass. If the live SUMO gate is deferred, document it as a remaining Stage 4 live-mode blocker, not a repo validation failure.

- [x] **Step 3: Update Stage 4 verification status**

After implementation, add a `Stage 4 Verification Status - YYYY-MM-DD` block with:

- final fixture/live verdict
- artifact paths
- exact verifier outputs
- runtime readiness output summary
- proof image visual inspection summary
- any deferred live SUMO, Pixel Streaming, multi-city, or real-controller gates

Expected: checkboxes are only changed to `- [x]` when the evidence exists in files, logs, test output, artifacts, or human visual inspection.

## Stage 4 Verification Status - 2026-06-15

Fixture verdict: Stage 4 fixture mode is complete. FastAPI renderer snapshots now expose deterministic `stage4-fixture-a` and `stage4-fixture-b` payloads with `simulation_source=sumo_traci_fixture`; `ATrafficSimulationController` parses the Stage 4 motion-binding fields; the Stage 3 operator map proof captures show the A/B transition without losing Stage 1/2/3 readability.

Live SUMO verdict: live SUMO mode remains open. `npm run runtime:readiness` reported `simulation ready=False mode=fixture` with missing `python module traci`, `python module sumolib`, `binary sumo`, and `binary netconvert`. No fixture artifact is labeled as live SUMO.

Branch and dirty scope:

- `git status --short --branch; git fetch origin main; git status --short --branch` ran on `codex/sumo-ready-operator-stage4`; fetch succeeded from `origin main`; dirty scope was limited to the Stage 4 API, Unreal runtime/smoke/capture, verifier, package script, fixture/profile/manifest, and plan files.

Implemented files and artifacts:

- FastAPI: `apps/api/app/api/routes.py`, `apps/api/app/services/renderer_snapshot.py`, `apps/api/app/fixtures/stage4_renderer_snapshots.json`, `apps/api/tests/test_api_flow.py`.
- Unreal runtime and smoke coverage: `TrafficSimulationController.h/.cpp`, `smoke_runtime_snapshot_controller.py`, `smoke_http_snapshot_controller.py`, `scripts/smoke_http_snapshot_server.py`.
- Stage 4 capture and verification: `capture_operator_map_stage4.py`, `scripts/capture-unreal-operator-map-stage4.ps1`, `scripts/verify-sumo-ready-operator-map-stage4.py`, `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage4_motion_bindings.json`, `package.json`.
- Proof artifacts: `artifacts/unreal-operator-map-stage4-snapshot-a.png`, `artifacts/unreal-operator-map-stage4-snapshot-b.png`, `artifacts/unreal-operator-map-stage4-motion-contact-sheet.png`, `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage4_motion_manifest.json`.

Focused evidence:

- `npm run unreal:precheck` passed; UE 5.7 editor found at `C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe`; Windows Node `v24.16.0`; npm `11.13.0`.
- `npm run verify:operator-map-stage1` passed with `SUMO_READY_OPERATOR_STAGE1_PASS`.
- `npm run verify:operator-map-stage2` passed with `SUMO_READY_OPERATOR_STAGE2_PASS`.
- `npm run verify:operator-map-stage3` passed with `SUMO_READY_OPERATOR_STAGE3_PASS`.
- `npm run test:api -- -k "renderer_snapshot or unreal_renderer_snapshot"` passed: `2 passed, 69 deselected, 1 warning`.
- `npm run unreal:runtime-smoke` passed and refreshed `artifacts\unreal-runtime-snapshot-smoke.json`; artifact includes `stage4_snapshot_id=stage4-fixture-b`, `stage4_motion_binding_version=operator-stage4-motion-v1`, one vehicle binding, one signal binding, vehicle location `[-44.0, 980.0, 86.0]`, heading `168.0`, and first signal state `green`.
- `npm run unreal:http-smoke` passed and refreshed `artifacts\unreal-http-snapshot-smoke.json`; artifact includes `stage4_snapshot_id=stage4-fixture-a`, `stage4_motion_binding_version=operator-stage4-motion-v1`, one vehicle binding, one signal binding, vehicle location `[-44.0, 1540.0, 86.0]`, and first signal state `red`.
- `npm run verify:operator-map-stage4` passed with `STAGE4_FIXTURE_CONTRACT_CHECK_PASS`, `STAGE4_BINDING_PROFILE_CHECK_PASS`, `STAGE4_SOURCE_TOKEN_CHECK_PASS`, `STAGE1_2_3_CARRYOVER_TOKEN_CHECK_PASS`, `STAGE4_MANIFEST_CHECK_PASS`, image checks for proof A/B/contact sheet, `STAGE4_PROOF_DIFF_CHECK_PASS diff_mean=14.85`, and `SUMO_READY_OPERATOR_STAGE4_PASS`.
- Bundled-Python `scripts/verify-simulator-builder-agent.py` passed with `SIMULATOR_BUILDER_AGENT_PASS`.
- Bundled-Python `scripts/verify-complete-simulation-renderer.py` passed with `SOURCE_CHECK_PASS`, `LANDING_CHECK_PASS`, `MAP_CHECK_PASS`, `RENDERER_SNAPSHOT_VISUAL_LAYER_CHECK_PASS`, `RENDERER_SNAPSHOT_CAPTURE_VIEW_CHECK_PASS`, `FASTAPI_RENDERER_SNAPSHOT_CHECK_PASS`, `UNREAL_RUNTIME_SMOKE_ARTIFACTS_CHECK_PASS`, and `UNREAL_HTTP_SMOKE_ARTIFACTS_CHECK_PASS`.
- `npm run verify` passed: API `71 passed, 1 warning`, web `46 passed`, Next.js build completed, and final `git diff --check` exited successfully with only Git LF-to-CRLF warnings.

Visual proof inspection:

- Proof A: `1600x900`, `773217` bytes, mean `149.21`, stddev `82.36`.
- Proof B: `1600x900`, `786720` bytes, mean `158.62`, stddev `77.10`.
- Contact sheet: `3200x900`, `1388461` bytes, mean `153.91`, stddev `79.91`.
- Human inspection of the contact sheet confirmed visible A/B changes in vehicle placement, signal phase, queue state, pedestrian state, and emergency state while preserving the Stage 1/2/3 operator-map view. No landing-page changes, Pixel Streaming proof, proof strips, plinths, or cards were introduced.

Deferred gates:

- Live SUMO/TraCI proof remains unchecked until `traci`, `sumolib`, `sumo`, `netconvert`, a real SUMO config, and `SUMO_SIMULATION_MODE=sumo_traci` are available and a local live run produces `simulation_source=sumo_traci`.
- Pixel Streaming dashboard proof remains Stage 5 scope.
- Multi-city expansion and real traffic-controller integration remain later gates.

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
