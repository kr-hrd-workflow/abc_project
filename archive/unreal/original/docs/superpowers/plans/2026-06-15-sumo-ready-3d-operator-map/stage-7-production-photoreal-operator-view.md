# Stage 7: Production Photoreal Operator View

Back to [SUMO-Ready 3D Operator Map Implementation Plan](../2026-06-15-sumo-ready-3d-operator-map.md).

## Stage 7 Detailed Task Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task, and use `karpathy-guidelines` before planning, writing, reviewing, refactoring, or debugging code. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current Stage 6 Seoul streamed Unreal operator viewport from a readable photoreal proof into a production-quality, photo-realistic traffic-camera/operator view while preserving every Stage 1/2/3/4/5/6 simulation readability and renderer-boundary guarantee.

**Architecture:** Stage 7 is a visual-production pass only. SUMO/TraCI remains the traffic truth source, FastAPI remains orchestration, `ATrafficSimulationController` remains the Unreal state-binding path, Unreal remains the renderer, and Pixel Streaming transports frames only. Stage 7 must not change simulation authority, traffic-control semantics, dashboard product scope, or live SUMO claims. Its job is to replace proof-grade visual construction with production-grade geometry, materials, decals, lighting, camera, and post-process inside the actual Unreal operator map.

**Tech Stack:** Unreal Engine 5.7, UE Editor Python, C++ `SmartIntersectionRuntime`, `PhotorealRoadKit`, Static Mesh actors, mesh UVs, material instances/functions, PBR texture inputs, decal actors or decal-like mesh overlays, Lumen, reflections, contact shadows, CineCamera proof capture, unbound post-process volume, Image Gen reference and source plates, project-owned generated/CC0 texture sources, bundled Python verifiers, existing runtime and HTTP smoke scripts.

---

## Stage 7 Hard Rule

Stage 7 is not done until the Unreal-rendered operator proof itself looks photo-realistic to human inspection.

These do not count as completion by themselves:

- an Image Gen reference plate
- a moodboard or art direction board
- a loose texture sheet
- a road-only beauty render
- a dashboard iframe that still contains proof-grade geometry
- a verifier that passes without confirming applied Unreal assets and captured visual evidence

The proof must be the actual Seoul operator map rendered by Unreal, with the production visual assets visibly applied in the scene while Stage 1-6 traffic readability remains intact.

## Stage 7 Answer To "Why Was Stage 6 Still Low-Quality?"

Stage 6 was intentionally a first realism proof. It proved that generated/reference texture sources could be recorded, imported, assigned through Unreal materials, and captured inside the operator viewport. That was necessary, but it still allowed proof-grade visual construction:

- broad planes and procedural road surfaces can still read flat
- vehicles and street hardware can still feel like simplified proxies
- curb, sidewalk, pole, signal, and lane-marking detail can lack real-world scale and edge treatment
- lighting and post-process can improve realism without fully solving camera authenticity
- material assignment can be valid while still looking synthetic from the operator angle

Stage 7 changes that standard. It is the first stage where "improved" is not enough. The target is a believable traffic-camera/operator frame, not a readable simulation demo.

## Stage 7 Boundary With Stage 8

Stage 7 is only the Seoul production photoreal rebuild. It does not expand the system to New York, Paris, London, or other cities.

Stage 8 owns multi-city expansion. Stage 8 starts only after Stage 7 proves one Seoul operator viewport can reach production visual quality without weakening simulation truth, vehicle/signal readability, or runtime boundaries.

## Stage 7 Skill And Plugin Routing

Use only the skills/plugins that improve the Stage 7 outcome:

- **Superpowers:** required for execution, review, and verification workflow.
- **karpathy-guidelines:** required for surgical edits, bounded implementation, and verifiable success criteria.
- **imagegen:** required for Stage 7 reference targets and project-bound texture/decal/atlas source plates unless existing Stage 6 sources are explicitly judged sufficient and that judgment is recorded in this plan.
- **Creative Production:** use only if multiple visual directions are needed before Image Gen source generation. Do not build a broad board when a direct traffic-camera target is enough.
- **Game Studio 3D asset pipeline:** apply its asset cleanup principles only if importing GLB/glTF/external mesh assets: normalized scale, stable pivots, material reuse, texture budgets, collision/bounds sanity, and runtime validation.
- **Product Design:** not required unless the user expands scope into dashboard UI redesign.

## Stage 7 Boundaries

Stage 7 does:

- rebuild the `seoul` operator viewport visual quality from proof-grade to production photoreal
- preserve Stage 1 large-map readability, Stage 2 3D context rules, Stage 3 asset semantics, Stage 4 SUMO/TraCI binding, Stage 5 Pixel Streaming proof, and Stage 6 image-source evidence rules
- use image-generated or CC0/project-owned sources only when prompt/path/license evidence is recorded
- apply sources through Unreal material inputs, decal actors or decal-like meshes, mesh UVs, geometry, lighting, camera, and post-process
- replace cube/plane-looking road, curb, sidewalk, signal, vehicle, and street-furniture elements with believable mesh assets or purpose-built procedural mesh assets
- produce before/after Unreal captures, a visual verdict artifact, and `SUMO_READY_OPERATOR_STAGE7_PASS`

Stage 7 does **not**:

- claim live SUMO/TraCI unless a real local run proves `simulation_source=sumo_traci`
- connect to real traffic controllers
- modify landing-page imagery, landing layout, or marketing sections
- add proof strips, plinths, asset lineup cards, traffic-zone image cards, or debug props to production maps
- hide simulation readability behind cinematic blur, dark grading, heavy rain streaks, or distant camera framing
- use unlicensed commercial assets
- commit `.env.local`, UE generated security tokens, API keys, credentials, `tmp/PixelStreamingInfrastructure`, or unrelated local artifacts
- move multi-city work forward; Stage 8 owns that scope

## Completion Gate

Stage 7 is complete only when all of these are true:

- Stage 1 verifier still prints `SUMO_READY_OPERATOR_STAGE1_PASS`
- Stage 2 verifier still prints `SUMO_READY_OPERATOR_STAGE2_PASS`
- Stage 3 verifier still prints `SUMO_READY_OPERATOR_STAGE3_PASS`
- Stage 4 verifier still prints `SUMO_READY_OPERATOR_STAGE4_PASS`
- Stage 5 verifier still prints `SUMO_READY_OPERATOR_STAGE5_PASS`
- Stage 6 verifier still prints `SUMO_READY_OPERATOR_STAGE6_PASS`
- new Stage 7 verifier prints `SUMO_READY_OPERATOR_STAGE7_PASS`
- Image Gen or approved source-asset evidence is recorded with prompt/path/license fields
- source textures, decals, atlases, trims, and mesh assets are actually consumed by Unreal materials, decals, mesh UVs, generated geometry, lighting, camera, and post-process
- before and after Unreal-rendered proof captures exist for the actual operator map
- human visual inspection approves asphalt, markings, curbs, sidewalks, signals, vehicles, street hardware, lighting, reflections, camera angle, and overall photo-realism
- `npm run runtime:readiness` is recorded honestly, including fixture/live state
- runtime and HTTP smokes pass
- bundled simulator verifier checks pass
- `npm run verify` passes
- secret/local-artifact scan finds no committed `.env.local`, credentials, UE `SecurityToken=`, or forbidden local generated folders
- this plan records exact execution evidence, not only chat claims

## Required Read Before Editing

- `AGENTS.md`
- `docs/agents/simulator-builder-agent.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map/stage-6-photoreal-first-city.md`
- `docs/technotes/ue57-doc-digest/materials.txt`
- `docs/technotes/ue57-doc-digest/lights.txt`
- `docs/technotes/ue57-doc-digest/post_process.txt`
- `docs/technotes/ue57-doc-digest/cinematic_cameras.txt`
- `docs/technotes/ue57-doc-digest/static_meshes.txt`
- `docs/technotes/ue57-doc-digest/actors.txt`
- `docs/technotes/ue57-doc-digest/python_editor.txt`
- `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/photoreal_roadkit_manifest.md`
- `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage6.py`
- `scripts/capture-unreal-operator-map-stage6.ps1`
- `scripts/verify-sumo-ready-operator-map-stage6.py`
- `package.json`
- current git state with `git status --short`

## Target File Map

Likely modified or created files:

- `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage7.py`
- `scripts/capture-unreal-operator-map-stage7.ps1`
- `scripts/verify-sumo-ready-operator-map-stage7.py`
- `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage7_production_photoreal_profile.json`
- `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json`
- `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_operator_stage7.umap`
- `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage7_seoul_asphalt_*`
- `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage7_seoul_markings_*`
- `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage7_seoul_curbs_*`
- `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage7_seoul_vehicle_*`
- `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage7_seoul_signal_*`
- `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Meshes/M_stage7_seoul_*`
- `renderer/unreal/SmartIntersection/Content/PhotorealRoadKit/Textures/T_stage7_seoul_*`
- `renderer/unreal/SmartIntersection/Content/PhotorealRoadKit/Meshes/SM_stage7_seoul_*`
- `renderer/unreal/SmartIntersection/Content/Materials/RoadOnlyRenderer/M_stage7_seoul_*`
- `artifacts/imagegen/stage7/operator_stage7_*`
- `artifacts/unreal-operator-map-stage7-before.png`
- `artifacts/unreal-operator-map-stage7-production-photoreal-proof.png`
- `artifacts/unreal-operator-map-stage7-before-after-contact-sheet.png`
- `artifacts/unreal-operator-map-stage7-visual-verdict.json`
- `package.json`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map/stage-7-production-photoreal-operator-view.md`

Do not edit dashboard or landing files unless a verifier proves Stage 5 stream plumbing requires a narrow package-script update.

## Stage 7 Subagent Execution Split

Stage 7 should use subagents when the current tool surface supports them because visual target selection, Unreal geometry/material wiring, asset-verifier work, and review are separable. If subagent spawning is unavailable in the current session, record that fact in this plan before inline execution.

Use one owner per scope:

- **Worker A, visual source and license owner:** Own Image Gen prompts, source plates, source copies, profile source-evidence schema, and source-license audit. Do not edit Unreal generation code.
- **Worker B, road and surface production owner:** Own road, curb, sidewalk, marking, decal, UV, and material improvements in `generate_road_intersection.py` plus generated Unreal material/texture consumers. Do not edit capture or verifier scripts.
- **Worker C, vehicles, signals, and street hardware owner:** Own production-grade mesh/procedural asset replacement for vehicles, signal heads, poles, cabinets, CCTV, lighting poles, bollards, drains, tactile paving, and related profile entries. Do not change simulation state semantics.
- **Worker D, capture and verifier owner:** Own Stage 7 capture script, PowerShell wrapper, verifier, package aliases, proof image checks, visual-verdict schema, and final evidence checks. Do not change scene visual generation unless required by verifier contract and reported first.
- **Reviewer E, spec-compliance reviewer:** Review diffs against this plan, especially the hard rule that Stage 7 is not complete from references, sources, or script success alone.
- **Reviewer F, code-quality and regression-risk reviewer:** Review Stage 1-6 preservation, renderer-boundary safety, secret/local-artifact risk, and verifier brittleness.

Primary-agent responsibilities:

- dispatch scoped workers with non-overlapping ownership
- wait for evidence before accepting worker completion
- avoid duplicating an active worker scope
- integrate results centrally
- run final validation centrally
- record worker/reviewer evidence in this plan

---

## Task 34: Baseline And Visual Failure Lock

**Goal:** Establish the exact Stage 6 visual baseline and the precise Stage 7 failures that must be fixed.

**Files and artifacts:**

- Read: `artifacts/unreal-operator-map-stage6-photoreal-proof.png`
- Read: `artifacts/unreal-operator-map-stage6-before-after-contact-sheet.png`
- Read: `artifacts/unreal-operator-map-stage6-visual-verdict.json`
- Read: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage6_photoreal_manifest.json`
- Update: this Stage 7 plan evidence section

**Steps:**

- [x] Inspect current git state and confirm Stage 6 artifacts are present.
- [x] Inspect the Stage 6 after proof and contact sheet visually.
- [x] Record a concrete Stage 7 failure list in this plan covering asphalt, markings, curbs, sidewalks, signals, vehicles, street hardware, lighting, camera, and any synthetic-looking geometry.
- [x] Run the Stage 1-6 baseline verifiers before Stage 7 implementation.
- [x] Run renderer runtime and HTTP smokes before Stage 7 implementation.
- [x] Run bundled simulator verifier checks before Stage 7 implementation.
- [x] Run `npm run runtime:readiness` and record fixture/live state honestly.
- [x] Run `git diff --check` and record whether only existing line-ending warnings appear.

**Commands:**

```powershell
git status --short
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
npm run verify:operator-map-stage3
npm run verify:operator-map-stage4
npm run verify:operator-map-stage5
npm run verify:operator-map-stage6
npm run unreal:runtime-smoke
npm run unreal:http-smoke
npm run simulator:verify
npm run runtime:readiness
git diff --check
```

**Expected result:** The team knows exactly why Stage 6 is not production-photoreal, and Stage 7 starts from a verified baseline rather than assumptions.

### Stage 7 Baseline And Visual Failure Lock - 2026-06-16

- Branch/worktree: `codex/stage6-operator-map` in the normal checkout (`.git` equals git common dir). Dirty Stage 6/7 files were present before Stage 7 work; they are preserved as existing work.
- Stage 6 proof inspected: `artifacts/unreal-operator-map-stage6-photoreal-proof.png` and `artifacts/unreal-operator-map-stage6-before-after-contact-sheet.png`.
- Stage 7 visual failures to fix:
  - Asphalt: dark and readable, but still looks like layered proof strips/cards with repeated atlas seams instead of real road construction.
  - Markings: lane lines, crosswalks, and yellow guides are readable, but too clean, razor-straight, and synthetic from the operator angle.
  - Curbs/sidewalks: large flat pale/mint planes dominate the frame and lack bevels, slab seams, grime, curb ramps, tactile detail, and grounded material variation.
  - Signals: signal poles and mast arms mostly read as thin sticks; heads/lenses lack housing depth, mounts, backplates, and believable camera-scale hardware.
  - Vehicles: traffic is controllable/readable, but vehicles remain cuboid proxies with block colors and weak glass/wheel/body detail.
  - Street hardware: CCTV, cabinets, streetlights, drains, covers, poles, railings, and signs are sparse or simplified, so the scene lacks real intersection scale cues.
  - Lighting/reflections: exposure is usable, but black voids and high-contrast block shadows make the view feel like an editor proof, not a traffic camera.
  - Camera/operator view: framing preserves lanes and queues, but a large black/white block building occludes the center and reveals proof-grade facade geometry.
  - Stage 1-6 readability: lanes, queues, signals, pedestrian/emergency evidence remain readable and must be preserved while improving realism.
- Baseline verifiers: `npm run verify:operator-map-stage1` -> `SUMO_READY_OPERATOR_STAGE1_PASS`; Stage 2 -> `SUMO_READY_OPERATOR_STAGE2_PASS`; Stage 3 -> `SUMO_READY_OPERATOR_STAGE3_PASS`; Stage 4 -> `SUMO_READY_OPERATOR_STAGE4_PASS`; Stage 5 -> `SUMO_READY_OPERATOR_STAGE5_PASS`; Stage 6 initially failed on a generated Unreal `SecurityToken=` in `renderer/unreal/SmartIntersection/Config/DefaultEngine.ini`, then passed after removing only that generated token line.
- Runtime and simulator baseline: `npm run unreal:precheck` passed; `npm run unreal:runtime-smoke` wrote `artifacts/unreal-runtime-snapshot-smoke.json`; `npm run unreal:http-smoke` wrote `artifacts/unreal-http-snapshot-smoke.json`; bundled Python `scripts/verify-simulator-builder-agent.py` printed `SIMULATOR_BUILDER_AGENT_PASS`; bundled Python `scripts/verify-complete-simulation-renderer.py` printed `SOURCE_CHECK_PASS`, `LANDING_CHECK_PASS`, `MAP_CHECK_PASS`, `RENDERER_SNAPSHOT_VISUAL_LAYER_CHECK_PASS`, `RENDERER_SNAPSHOT_CAPTURE_VIEW_CHECK_PASS`, `FASTAPI_RENDERER_SNAPSHOT_CHECK_PASS`, `UNREAL_RUNTIME_SMOKE_ARTIFACTS_CHECK_PASS`, and `UNREAL_HTTP_SMOKE_ARTIFACTS_CHECK_PASS`.
- Runtime readiness: `npm run runtime:readiness` remains fixture-backed: `vision ready=False mode=fixture`, `simulation ready=False mode=fixture`, `openai ready=False mode=gpt-5.5`, and `pgvector ready=False mode=database`. Missing live gates include `cv2`, `ultralytics`, `models/yolov8n.pt`, `traci`, `sumolib`, `sumo`, `netconvert`, `openai`, `OPENAI_API_KEY`, `pgvector`, and PostgreSQL vector extension.
- Diff hygiene: `git diff --check` passed with existing CRLF warnings only for the plan files, `package.json`, `generate_road_intersection.py`, and `scripts/generate-unreal-city.ps1`.

## Task 35: Stage 7 Visual Target And Source Evidence

**Goal:** Create or select the visual target and source plates that Stage 7 will actually apply inside Unreal.

**Files and artifacts:**

- Create: `artifacts/imagegen/stage7/operator_stage7_traffic_camera_target.png`
- Create: `artifacts/imagegen/stage7/operator_stage7_asphalt_marking_source.png`
- Create: `artifacts/imagegen/stage7/operator_stage7_curb_sidewalk_source.png`
- Create: `artifacts/imagegen/stage7/operator_stage7_signal_vehicle_source.png`
- Create: `artifacts/imagegen/stage7/operator_stage7_contact_sheet.png`
- Create: `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage7_seoul_*`
- Create: `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage7_production_photoreal_profile.json`

**Image Gen target prompt:**

```text
Photoreal fixed traffic-operations camera view over a Seoul smart intersection on an overcast wet day, production traffic-control monitor frame, realistic dark asphalt with subtle patching and tire polish, worn thermoplastic lane markings and stop bars, concrete curbs, tactile paving, utility covers, drains, mast-arm traffic signals, CCTV pole, signal cabinet, buses and passenger cars queued naturally, readable lane geometry, no UI overlay, no text labels, no cinematic blur, no dramatic hero lighting.
```

**Image Gen material-source prompt:**

```text
Photoreal material-source plate for a wet Seoul urban intersection: dark patched asphalt, chipped white and yellow lane paint, tire scuffs, oil stains, shallow puddle reflection streaks, curb grime, concrete curb edge, tactile paving, drain grate, utility cover, lane-edge dirt buildup, natural camera exposure, source texture detail suitable for Unreal material and decal extraction.
```

**Steps:**

- [x] Decide whether Stage 6 source plates are sufficient or Stage 7 needs new Image Gen source plates.
- [x] If new plates are needed, generate the Stage 7 target and material-source images with the `imagegen` skill.
- [x] Copy selected image outputs into `artifacts/imagegen/stage7/`.
- [x] Copy Unreal-consumed texture sources into `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/`.
- [x] Record prompt, generated path, project path, license class, intended material consumer, and intended actor/mesh consumer in `operator_stage7_production_photoreal_profile.json`.
- [x] Include a `visual_target_contract` field that states the target is not completion proof.
- [x] Include `simulation_boundary` fields that state `visual_only=true`, `simulation_source_unchanged=true`, and `traffic_control_authority=false`.
- [x] Reject any source whose license is unknown or commercial without explicit license evidence.

**Expected result:** Every source image or asset used by Stage 7 has an evidence trail and a named Unreal consumer before production integration begins.

## Task 36: Production Road, Curb, Sidewalk, And Marking Geometry

**Goal:** Replace the proof-grade ground plane feeling with believable road construction while preserving lane readability.

**Files and artifacts:**

- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Generate: `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_operator_stage7.umap`
- Generate/update: Stage 7 mesh and material assets under `Content/PhotorealRoadKit/` and `Content/Materials/RoadOnlyRenderer/`
- Update: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json`

**Steps:**

- [ ] Preserve Stage 1-6 lane, queue, signal, pedestrian, emergency, and controller-binding semantics.
- [ ] Convert large flat proof surfaces into segmented road, lane, curb, sidewalk, median, island, and corner modules with stable dimensions.
- [ ] Add UV scale controls for asphalt, marking paint, curb concrete, tactile paving, and sidewalk materials.
- [ ] Add lane-marking meshes or decal-like mesh strips for stop bars, crosswalks, lane arrows, turn guides, worn edge breaks, and faded paint patches.
- [ ] Add local surface variation: asphalt patches, cracks, tire wear, shallow puddles, oil stains, grime buildup near curbs, and drain/utility cover placement.
- [ ] Keep road markings readable from the fixed operator camera.
- [ ] Ensure no image plate becomes a large traffic-zone card or hidden proof strip.
- [ ] Record generated actor counts, mesh names, material names, source texture names, and semantic-readability flags in the Stage 7 manifest.

**Expected result:** The road area reads as real constructed street geometry, not a flat textured board, while the operator can still read lanes and queues quickly.

## Task 37: Stage 7 Materials, Decals, And UV Evidence

**Goal:** Build a reusable material layer that visibly consumes Stage 7 source assets in the actual operator map.

**Files and artifacts:**

- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Create/generate: `renderer/unreal/SmartIntersection/Content/Materials/RoadOnlyRenderer/M_stage7_seoul_*`
- Create/generate: `renderer/unreal/SmartIntersection/Content/PhotorealRoadKit/Textures/T_stage7_seoul_*`
- Update: `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage7_production_photoreal_profile.json`
- Update: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json`

**Steps:**

- [ ] Use material instances/functions where the generator already supports them; avoid a one-material-per-actor explosion.
- [ ] Apply asphalt base color, roughness, normal/height impression, grime masks, puddle masks, marking-wear masks, curb concrete, tactile paving, metal covers, and signal/vehicle material studies where relevant.
- [ ] Tune roughness/specular so wet surfaces reflect plausibly without hiding lanes.
- [ ] Add contact-darkening or dirt accumulation around curbs, medians, poles, drains, covers, and wheel paths.
- [ ] Verify every Stage 7 source texture listed in the profile has at least one Unreal material, decal, mesh UV, or actor consumer.
- [ ] Verify every generated Stage 7 material asset is referenced by the generated map or manifest.
- [ ] Keep visual improvements deterministic enough for verifiers to detect expected tokens, files, and actor counts.

**Expected result:** Stage 7 does not merely import texture files; it proves they are bound into Unreal materials and visible in the operator capture.

## Task 38: Production Vehicles, Signals, And Street Hardware

**Goal:** Replace simplified proxies that break photo-realism while keeping motion and signal semantics readable.

**Files and artifacts:**

- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Create/generate: `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Meshes/M_stage7_seoul_*` if source meshes are needed
- Create/generate: `renderer/unreal/SmartIntersection/Content/PhotorealRoadKit/Meshes/SM_stage7_seoul_*`
- Update: `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage7_production_photoreal_profile.json`
- Update: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json`

**Steps:**

- [ ] Inventory current Stage 6 vehicle, signal, pole, cabinet, CCTV, bollard, drain, tactile paving, curb, and facade assets.
- [ ] Replace cube-like vehicles with believable lane-scale vehicles using existing project-safe mesh generation or imported safe-license mesh assets.
- [ ] Add distinct bus, taxi/passenger, emergency, and general vehicle silhouettes without changing Stage 4 motion semantics.
- [ ] Replace simplified signal heads with believable mast-arm, pole, housing, lens, backplate, and mounting hardware meshes.
- [ ] Add traffic cabinets, CCTV cameras, lighting poles, guardrails, bollards, drains, utility covers, tactile paving, curb ramps, and sidewalk edge details near the traffic-reading zone.
- [ ] Confirm vehicle pivots, bounds, scale, and headings remain compatible with `ATrafficSimulationController`.
- [ ] Confirm signal material state remains compatible with Stage 4 signal phase updates.
- [ ] Record all created/imported mesh asset names, source paths, license classes, and consumers.

**Expected result:** Vehicles, signals, and street hardware look plausible from the operator view while remaining controllable and readable.

## Task 39: Lighting, Camera, Reflection, And Post-Process

**Goal:** Make the frame feel like a real fixed traffic camera rather than a game-editor scene.

**Files and artifacts:**

- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Modify/create: `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage7.py`
- Create/update: `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage7_production_photoreal_profile.json`
- Update: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json`

**Steps:**

- [ ] Use a fixed high operator camera that sees all lanes, queues, signals, crosswalks, and emergency/pedestrian indicators.
- [ ] Tune Directional Light, Sky Light, atmosphere/fog where supported, Lumen/reflections, contact shadows, ambient occlusion, exposure, white balance, and color grading for an overcast traffic-camera look.
- [ ] Use a CineCamera or equivalent capture camera only when it improves operator authenticity without hiding state.
- [ ] Avoid strong depth of field, excessive motion blur, dramatic contrast, heavy vignette, or dark rain that hides lane and signal state.
- [ ] Add reflection and contact-shadow evidence to the manifest.
- [ ] Verify the capture frame is stable across repeated runs and does not crop the traffic-reading zone.

**Expected result:** Lighting and camera support realism while preserving operator usability.

## Task 40: Stage 7 Capture And Visual Verdict

**Goal:** Produce proof captures from the actual Unreal map and require human approval before the verifier can pass.

**Files and artifacts:**

- Create: `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage7.py`
- Create: `scripts/capture-unreal-operator-map-stage7.ps1`
- Create: `artifacts/unreal-operator-map-stage7-before.png`
- Create: `artifacts/unreal-operator-map-stage7-production-photoreal-proof.png`
- Create: `artifacts/unreal-operator-map-stage7-before-after-contact-sheet.png`
- Create: `artifacts/unreal-operator-map-stage7-visual-verdict.json`

**Visual verdict schema:**

```json
{
  "schema": "operator-stage7-production-photoreal-visual-verdict-v1",
  "city": "seoul",
  "map": "smart_intersection_rebuild_operator_stage7",
  "before": "artifacts/unreal-operator-map-stage7-before.png",
  "after": "artifacts/unreal-operator-map-stage7-production-photoreal-proof.png",
  "contact_sheet": "artifacts/unreal-operator-map-stage7-before-after-contact-sheet.png",
  "human_inspection": {
    "photo_realistic_enough": false,
    "asphalt": "fail",
    "lane_markings": "fail",
    "curbs_sidewalks": "fail",
    "signals": "fail",
    "vehicles": "fail",
    "street_hardware": "fail",
    "lighting_reflections": "fail",
    "camera_operator_view": "fail",
    "stage_1_6_readability_preserved": "fail",
    "notes": []
  }
}
```

**Steps:**

- [x] Capture a before frame from the Stage 6 accepted operator view or latest pre-Stage-7 map.
- [x] Capture an after frame from `smart_intersection_rebuild_operator_stage7.umap`.
- [x] Generate a before/after contact sheet with no production proof strips inside the Unreal map.
- [x] Inspect the after frame visually at full size.
- [x] If the frame still looks synthetic, record exact failures and return to the relevant asset/material/lighting task.
- [ ] Approve the visual verdict only when the after frame looks photo-realistic enough and Stage 1-6 readability is preserved.
- [ ] Keep the verdict artifact machine-readable for the Stage 7 verifier.

**Expected result:** Stage 7 has honest visual proof and cannot pass without human inspection.

## Task 41: Stage 7 Semantic Verifier And Package Scripts

**Goal:** Add a verifier that catches false completion and produces `SUMO_READY_OPERATOR_STAGE7_PASS` only when real evidence exists.

**Files and artifacts:**

- Create: `scripts/verify-sumo-ready-operator-map-stage7.py`
- Modify: `package.json`
- Read: `scripts/verify-sumo-ready-operator-map-stage6.py`
- Read: `scripts/verify-road-photoreal-fidelity.py`

**Required package aliases:**

```json
{
  "unreal:generate:operator-stage7": "npm run unreal:generate-city -- -Profile seoul -OperatorStage7",
  "unreal:capture:operator-stage7": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-operator-map-stage7.ps1",
  "verify:operator-map-stage7": "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"& \\\"$env:USERPROFILE\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe\\\" scripts/verify-sumo-ready-operator-map-stage7.py\""
}
```

**Verifier checks:**

- [ ] Confirms root plan points Stage 7 to production photoreal work and Stage 8 to multi-city expansion.
- [ ] Confirms Stage 6 plan says Stage 8 owns multi-city rollout.
- [x] Confirms `operator_stage7_production_photoreal_profile.json` exists and names `seoul`.
- [x] Confirms source evidence includes prompt/path/license/consumer fields.
- [x] Confirms source assets are copied under approved project paths.
- [x] Confirms generated map and manifest exist.
- [x] Confirms manifest states Stage 7 is visual-only and preserves simulation boundaries.
- [x] Confirms manifest includes road, marking, curb, sidewalk, signal, vehicle, street-hardware, lighting, camera, post-process, and asset-consumer evidence.
- [x] Confirms proof captures exist, are non-empty, and have expected image dimensions/statistics.
- [ ] Confirms visual verdict schema exists and `photo_realistic_enough` is true.
- [ ] Confirms the verdict also approves asphalt, markings, curbs/sidewalks, signals, vehicles, street hardware, lighting/reflections, camera operator view, and Stage 1-6 readability.
- [ ] Confirms no proof strips, plinths, traffic-zone image cards, or landing-page proof assets are used for completion.
- [ ] Confirms no live SUMO claim is made unless runtime metadata proves `simulation_source=sumo_traci`.
- [ ] Confirms no active UE `SecurityToken=`, `.env.local`, credential, or forbidden local artifact path is present in changed files.
- [ ] Prints `SUMO_READY_OPERATOR_STAGE7_PASS` only after all required checks pass.

**Expected result:** The verifier enforces the real Stage 7 bar instead of merely checking that files exist.

## Task 42: Final Validation And Evidence Recording

**Goal:** Prove Stage 7 is complete without weakening earlier stages or claiming live runtime gates that are still fixture-backed.

**Files and artifacts:**

- Update: this Stage 7 plan evidence section
- Update: `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- Read: runtime readiness output
- Read: final verifier/test outputs

**Commands:**

```powershell
npm run unreal:precheck
npm run unreal:generate:operator-stage7
npm run unreal:capture:operator-stage7
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
npm run verify:operator-map-stage3
npm run verify:operator-map-stage4
npm run verify:operator-map-stage5
npm run verify:operator-map-stage6
npm run verify:operator-map-stage7
npm run unreal:runtime-smoke
npm run unreal:http-smoke
npm run simulator:verify
npm run runtime:readiness
npm run verify
git diff --check
```

**Secret and local-artifact scan:**

```powershell
git status --short -- .env.local apps/web/.env.local tmp renderer/unreal/SmartIntersection/Saved renderer/unreal/SmartIntersection/Intermediate
rg -n "SecurityToken=|OPENAI_API_KEY=|BEGIN RSA PRIVATE KEY|BEGIN OPENSSH PRIVATE KEY|password\\s*=|api[_-]?key\\s*=" package.json scripts renderer/unreal/SmartIntersection/Content/Python renderer/unreal/SmartIntersection/SceneProfiles renderer/unreal/SmartIntersection/GeneratedProof docs/superpowers/plans
```

**Steps:**

- [ ] Record exact commands run and pass/fail results in this plan.
- [ ] Record the generated map, manifest, profile, source assets, Unreal assets, proof captures, visual verdict, and verifier output paths.
- [ ] Record whether runtime readiness is fixture-backed or live.
- [ ] Record any remaining live SUMO blockers without calling Stage 7 live.
- [ ] Record human visual inspection approval with the exact proof image inspected.
- [ ] Update the root plan current status only after Stage 7 passes.
- [ ] Leave Stage 8 as future multi-city expansion until this Stage 7 gate passes.

**Expected result:** Stage 7 can be trusted from repo artifacts and command output, not from narrative.

---

## Stage 7 Execution Evidence

During implementation, append dated evidence bullets here after each completed validation group. Each entry must include command or artifact path, pass/fail result, and any remaining blocker. Required categories are execution mode, branch/worktree, baseline Stage 6 proof inspected, Stage 7 failure list, Image Gen/source evidence, Unreal source copies, generated map, manifest, imported/generated Unreal assets, before proof, after proof, contact sheet, human visual verdict, focused validation, runtime readiness evidence, repo-wide validation, local artifact and secret scan, and remaining open live gates.

### Stage 7 Source Evidence And Verifier Wiring - 2026-06-16

- Image Gen/source evidence: created `artifacts/imagegen/stage7/operator_stage7_traffic_camera_target.png`, `operator_stage7_asphalt_marking_source.png`, `operator_stage7_curb_sidewalk_source.png`, `operator_stage7_signal_vehicle_source.png`, and `operator_stage7_contact_sheet.png`.
- Unreal source copies: copied Stage 7 source plates into `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage7_seoul_*`.
- Source profile: created `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage7_production_photoreal_profile.json` with prompt, original Image Gen path, artifact path, Unreal source texture path, synthetic license class, consumer, visual-target-not-proof contract, and visual-only simulation boundary.
- Generator/package wiring: added `SMART_INTERSECTION_OPERATOR_STAGE7`, `/Game/Maps/Generated/smart_intersection_rebuild_operator_stage7`, Stage 7 material/source-texture names, manifest path, `unreal:generate:operator-stage7`, `unreal:capture:operator-stage7`, and `verify:operator-map-stage7`.
- Static checks: `py_compile` passed for `generate_road_intersection.py`, `capture_operator_map_stage7.py`, and `verify-sumo-ready-operator-map-stage7.py`; PowerShell parser passed for `scripts/generate-unreal-city.ps1` and `scripts/capture-unreal-operator-map-stage7.ps1`; `package.json` parsed successfully.
- Focused verifier red gate: `npm run verify:operator-map-stage7` passed source token checks, all Stage 7 Image Gen/source texture image checks, contact sheet image check, and Stage 7 profile check, then failed as expected on missing `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json`.

### Stage 7 Unreal Proof And Reviewer Iteration - 2026-06-16

- Generation/capture: `npm run unreal:generate:operator-stage7` produced `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_operator_stage7.umap`; `npm run unreal:capture:operator-stage7` produced `artifacts/unreal-operator-map-stage7-before.png`, `artifacts/unreal-operator-map-stage7-production-photoreal-proof.png`, and `artifacts/unreal-operator-map-stage7-before-after-contact-sheet.png`.
- Focused verifier progress: `npm run verify:operator-map-stage7` now passes Stage 7 source tokens, profile, manifest, generated map, before proof, after proof, and contact sheet checks, then fails on the intentionally missing approved visual verdict.
- Secret boundary: Unreal generation/capture repeatedly inserted `SecurityToken=` into `renderer/unreal/SmartIntersection/Config/DefaultEngine.ini`; each generated token line was removed before continuing.
- First reviewer subagent verdict: `CHANGES_REQUESTED`; `photo_realistic_enough=false`. Findings: vehicles/street hardware/signals/sidewalks/curbs/background still proxy-like, asphalt too noisy, signal state weak, and black/background context broke realism.
- Fix pass after reviewer: removed central controller/card artifact from rendered proof, moved saved camera/card/context/controller visuals out of frame while preserving map labels, reduced asphalt noise, added muted vehicle materials/details, enlarged signal-state markers, added sidewalk slab/joint/curb shadow details, and added neutral overcast background fill.
- Second reviewer subagent verdict: `CHANGES_REQUESTED`; `photo_realistic_enough=false`. Findings: still stylized/low-poly; vehicles, curbs, sidewalks, signals, and street hardware remain primitive/blocky; asphalt remains flat panels with localized noisy patches; material response and mesh detail are insufficient for photoreal approval.
- Additional attempted fix after second reviewer: added Stage 7 roughness/specular tuning, cylinder wheels/lenses/covers, project mesh assets for signal poles/heads, CCTV box, bollards, railings, tactile tiles, and drains, and captured a lower oblique traffic-camera angle.
- Current blocker: the lower oblique proof exposed more black/background limits and still does not satisfy the human photoreal bar. Stage 7 remains incomplete; no machine-readable approved visual verdict has been created.

### Stage 7 Vehicle Mesh, Texture, And Camera Iteration - 2026-06-16

- Execution mode: continued inline because the available multi-agent tool surface states `spawn_agent` may be used only when the user explicitly asks for delegation; no fresh reviewer subagent was spawned in this iteration.
- Vehicle mesh sources: added project-owned procedural OBJ source meshes under `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Meshes/` for `stage7_seoul_passenger_sedan`, `stage7_seoul_bus`, `stage7_seoul_taxi`, and `stage7_seoul_emergency_van`, with `scripts/generate-stage7-vehicle-meshes.py` as the deterministic generator and profile `procedural_mesh_sources` evidence.
- Generator changes: Stage 7 now records and imports `stage7_seoul_traffic_camera_target`, applies `stage7_seoul_asphalt_marking_source` to the main road slabs, replaces Stage 7 vehicle bodies with mesh actors, keeps Stage 7 facade/context actors visible, adds camera-visible curb/railing/streetlight/signal/background closure actors, and adds a camera-side fill light plus overcast post-process tuning.
- Capture changes: `capture_operator_map_stage7.py` now uses the tighter oblique operator camera `origin_cm=[-2450,-6100,2100]`, `target_cm=[120,-120,-620]`, `fov_degrees=46.0`; manifest capture metadata is updated by `npm run unreal:capture:operator-stage7`.
- Generated proof: `npm run unreal:generate:operator-stage7` and `npm run unreal:capture:operator-stage7` regenerated `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_operator_stage7.umap`, `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json`, `artifacts/unreal-operator-map-stage7-before.png`, `artifacts/unreal-operator-map-stage7-production-photoreal-proof.png`, and `artifacts/unreal-operator-map-stage7-before-after-contact-sheet.png`.
- Focused verifier status: `npm run verify:operator-map-stage7` passes Stage 7 source tokens, Image Gen/source texture checks, profile, manifest, generated map, before proof, after proof, contact sheet, and proof image checks, then fails intentionally on missing `artifacts/unreal-operator-map-stage7-visual-verdict.json`.
- Secret boundary: Unreal continued to regenerate `SecurityToken=` in `renderer/unreal/SmartIntersection/Config/DefaultEngine.ini` during generate/capture; each generated token line was removed. Final token scan for `SecurityToken=` returned no matches before this evidence update.
- Current visual blocker: latest proof is materially improved from black-void/cube-car blockout, but still reads as constructed Unreal map geometry rather than production photoreal traffic-camera footage. Main remaining issues are texture-sheet repetition on road slabs, flat gray sidewalk/background planes, simplified vehicle silhouettes/materials, and low-detail curbs/signals/street hardware. No approved visual verdict was created.

### Stage 7 Reviewer-Gated Iteration - 2026-06-16

- Focused verifier red gate added: `scripts/verify-sumo-ready-operator-map-stage7.py` now requires `Stage7IntegratedAsphaltBlend`, `Stage7VehicleLocalYawDetail`, `Stage7CurbOcclusionGrime`, and `Stage7BoundaryOcclusion` source/map tokens so the next pass is tracked structurally.
- Generator/profile/capture changes: reduced source-image asphalt use from broad slabs to smaller blend/detail actors, added local-yaw vehicle glass/wheel/lamp/contact-shadow overlays, muted vehicle colors, hid inherited Stage 3 cuboid vehicle proxies after Stage 7 replacements are spawned, added curb occlusion/grime/slab variation actors, reduced card-like background material use, and updated the Stage 7 capture camera metadata.
- Generated proof: `npm run unreal:generate:operator-stage7` and `npm run unreal:capture:operator-stage7` regenerated the Stage 7 map, manifest, before proof, after proof, and contact sheet. Unreal repeatedly regenerated `renderer/unreal/SmartIntersection/Config/DefaultEngine.ini` `SecurityToken=` lines during editor runs; each generated token was removed after capture.
- Latest focused verifier: `npm run verify:operator-map-stage7` passes Stage 7 source tokens, Image Gen/source texture checks, profile, manifest, generated map, before proof, after proof, contact sheet, and proof image checks, then fails on the intentionally missing approved visual verdict.
- Fresh visual reviewer: reviewer subagent `019ece4f-8aee-75c0-b067-d00d73a37abc` returned `CHANGES_REQUESTED`, `photo_realistic_enough=false`, and `Stage 1-6 readability preserved=true`. Findings: synthetic rectangular asphalt slabs/seams/noise bands, low-poly/game-like vehicles, non-camera-realistic lighting/background/exposure, simplified/floating curbs/signals/street hardware, and lane markings visually inconsistent with asphalt treatment.
- Latest primary visual inspection: `artifacts/unreal-operator-map-stage7-production-photoreal-proof.png` still fails the Stage 7 hard rule. It preserves traffic readability but remains a stylized Unreal operator render, not production photoreal traffic-camera footage. No `artifacts/unreal-operator-map-stage7-visual-verdict.json` was created.
- Preservation validation: Stage 1 through Stage 6 verifiers passed: `SUMO_READY_OPERATOR_STAGE1_PASS`, `SUMO_READY_OPERATOR_STAGE2_PASS`, `SUMO_READY_OPERATOR_STAGE3_PASS`, `SUMO_READY_OPERATOR_STAGE4_PASS`, `SUMO_READY_OPERATOR_STAGE5_PASS`, and `SUMO_READY_OPERATOR_STAGE6_PASS`.
- Runtime/simulator validation: `npm run unreal:runtime-smoke` wrote `artifacts/unreal-runtime-snapshot-smoke.json`; `npm run unreal:http-smoke` wrote `artifacts/unreal-http-snapshot-smoke.json`; `scripts/verify-simulator-builder-agent.py` printed `SIMULATOR_BUILDER_AGENT_PASS`; `scripts/verify-complete-simulation-renderer.py` printed `SOURCE_CHECK_PASS`, `LANDING_CHECK_PASS`, `MAP_CHECK_PASS`, `RENDERER_SNAPSHOT_VISUAL_LAYER_CHECK_PASS`, `RENDERER_SNAPSHOT_CAPTURE_VIEW_CHECK_PASS`, `FASTAPI_RENDERER_SNAPSHOT_CHECK_PASS`, `UNREAL_RUNTIME_SMOKE_ARTIFACTS_CHECK_PASS`, and `UNREAL_HTTP_SMOKE_ARTIFACTS_CHECK_PASS`. `npm run simulator:verify` is not defined in `package.json`.
- Readiness and hygiene: `npm run runtime:readiness` remains fixture-backed (`vision ready=False`, `simulation ready=False`, `openai ready=False`, `pgvector ready=False`) with missing live dependencies recorded in command output. `rg -n "SecurityToken=" renderer/unreal/SmartIntersection/Config/DefaultEngine.ini` found no token after cleanup. `git diff --check` passed with CRLF warnings only.
- Current blocker: Stage 7 is still blocked on visual production quality and the missing approved visual verdict. The smallest next unlock is a deeper asset/material pass that removes visible road slab construction, uses genuinely traffic-camera-scale vehicle/hardware assets, and normalizes lighting/background exposure before another reviewer run.

### Stage 7 Material And Lighting Retry - 2026-06-16

- Fresh visual reviewer: reviewer subagent `019ece63-d4ce-7301-a8c5-47ffe9674449` reviewed the regenerated Stage 7 proof after the previous material-consumer patch and returned `CHANGES_REQUESTED`, `photo_realistic_enough=false`, and `Stage 1-6 readability preserved=uncertain`. Findings: flat procedural road/sidewalk planes, harsh/game-like lighting, simplified vehicles/street objects, and insufficient confirmation that fine-grained Stage 1-6 overlays remain legible.
- Follow-up generator/capture changes: added separated vehicle window panes, plates, bumpers, wheel-arch shadows, camera-distance asphalt/sidewalk breakup actors, sidewalk stains/seams, lighter Stage 7 wet-asphalt material values, softer overcast light/post-process settings, and a temporary lower traffic-camera capture angle.
- Reverted failed follow-up: the lower capture angle exposed black/white background bands, and a tiled asphalt experiment produced obvious rectangular road slabs. The tiled layer was removed and the Stage 7 capture camera was returned to the high-oblique operator view before the final proof of this iteration.
- Latest generated proof: `npm run unreal:generate:operator-stage7` and `npm run unreal:capture:operator-stage7` regenerated `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_operator_stage7.umap`, `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json`, `artifacts/unreal-operator-map-stage7-production-photoreal-proof.png`, and `artifacts/unreal-operator-map-stage7-before-after-contact-sheet.png`. Unreal regenerated `renderer/unreal/SmartIntersection/Config/DefaultEngine.ini` `SecurityToken=` lines during editor runs; each generated token was removed.
- Latest focused verifier: `npm run verify:operator-map-stage7` passes Stage 7 source tokens, Image Gen/source texture checks, profile, manifest, generated map, before proof, after proof, contact sheet, and proof image checks, then fails on the intentionally missing approved visual verdict: `SUMO_READY_OPERATOR_STAGE7_FAIL: missing Stage 7 visual verdict: artifacts/unreal-operator-map-stage7-visual-verdict.json`.
- Current visual status: primary inspection still rejects the latest proof as production photoreal because the operator frame remains visibly procedural: flat sidewalks, synthetic vehicles, simplified signals/street hardware, dark uniform asphalt, and constructed-scene lighting remain visible. No visual verdict artifact was created.

### Stage 7 Image-Derived Surface Mesh Iteration - 2026-06-16

- Source-to-3D route: added deterministic ImageGen/source-derived OBJ heightfields via `scripts/generate-stage7-surface-meshes.py`, producing `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Meshes/stage7_seoul_asphalt_imagegen_heightfield.obj` and `stage7_seoul_sidewalk_imagegen_heightfield.obj`. These are visual-only mesh sources generated from existing Stage 7 source textures, not traffic/runtime authority.
- Verifier contract: `scripts/verify-sumo-ready-operator-map-stage7.py` now requires `Stage7ImageGenSurfaceGeometry`, `Stage7SidewalkCoverageGeometry`, the new OBJ source files, map labels for the asphalt and sidewalk heightfield actors, and profile/manifest procedural mesh evidence. The first focused red gate failed as expected on missing `Stage7ImageGenSurfaceGeometry`; after wiring, source/profile checks passed and stale generated artifacts failed until Unreal regeneration.
- Unreal wiring: `generate_road_intersection.py` now records `scripts/generate-stage7-surface-meshes.py`, spawns image-derived surface mesh actors into the Stage 7 operator map, and tags them as `Stage7ImageGenSurfaceGeometry` / `Stage7SidewalkCoverageGeometry` without changing SUMO/TraCI, FastAPI, Pixel Streaming, or live SUMO state.
- Capture/lighting retry: `capture_operator_map_stage7.py` was tuned to use stronger Stage 7-only soft overcast key/fill/skylight and post-process exposure after verifier failures reported the after-proof below the `62.0` mean brightness floor.
- Validation run: Python compilation passed for `generate_road_intersection.py`, `capture_operator_map_stage7.py`, `verify-sumo-ready-operator-map-stage7.py`, and `generate-stage7-surface-meshes.py`; `operator_stage7_production_photoreal_profile.json` parsed as valid JSON; `npm run unreal:generate:operator-stage7` and `npm run unreal:capture:operator-stage7` exited 0 and regenerated the Stage 7 `.umap`, manifest, after proof, and contact sheet.
- Latest focused verifier: `npm run verify:operator-map-stage7` passes Stage 7 source tokens, Image Gen/source texture checks, profile, manifest, generated map, and before proof, then fails on the after proof brightness floor: `SUMO_READY_OPERATOR_STAGE7_FAIL: stage7_after_unreal_production_photoreal_proof brightness out of range: mean=52.99`.
- Secret/hygiene: Unreal regenerated `SecurityToken=` during editor runs; each generated token was removed. Final token scan after cleanup returned no matches. `git diff --check` initially found a new blank line at EOF in `renderer/unreal/SmartIntersection/Config/DefaultEngine.ini`; that whitespace issue was removed.
- Current visual status: primary inspection still rejects `artifacts/unreal-operator-map-stage7-production-photoreal-proof.png`. The image-derived mesh path technically works, but the proof still reads as constructed Unreal/procedural geometry with dark asphalt, gray slab sidewalks, simplified vehicles/signals, and visible surface-panel artifacts. No fresh reviewer was dispatched and no visual verdict artifact was created.

## Stage 7 Goal Prompt

```text
/goal Build Stage 7 of the SUMO-ready 3D operator map for SmartIntersection: upgrade the Stage 6 Seoul streamed Unreal operator viewport from a readable photoreal proof into a production-quality photo-realistic traffic-camera/operator view, without losing Stage 1/2/3/4/5/6 readability or weakening simulation boundaries.

Success requires: Stage 1/2/3/4/5/6 verifiers still pass; new SUMO_READY_OPERATOR_STAGE7_PASS; Image Gen or approved source-asset reference/source evidence recorded with prompt/path/license/consumer fields; image-derived or CC0/project-owned texture/decal/atlas/mesh sources actually applied through Unreal materials, decals, mesh UVs, geometry, lighting, camera, and post-process; Unreal-rendered before/after proof captures from the actual operator map; human visual inspection confirms the frame is photo-realistic enough across asphalt, markings, curbs, sidewalks, signals, vehicles, street hardware, lighting/reflections, and camera; npm run runtime:readiness recorded honestly; runtime and HTTP smokes pass; bundled simulator checks pass; npm run verify passes; Stage 7 plan records exact evidence.

Reference is not enough. Loose generated textures are not enough. A moodboard, source plate, road-only beauty render, dashboard iframe, or passing script alone cannot complete Stage 7. Completion requires Unreal-rendered operator-map proof where production assets are visibly used in the actual scene and the image reads as a believable traffic-camera/operator frame.

Use required skills before acting: Superpowers process skills for execution/review/verification, karpathy-guidelines for surgical implementation, imagegen for reference targets and texture/decal/atlas sources unless existing Stage 6 sources are explicitly judged sufficient and recorded, Creative Production only if multiple visual directions are needed, and Game Studio 3D asset-pipeline principles only for imported GLB/glTF cleanup. Product Design is not required unless scope expands into dashboard UI redesign.

Start in C:\Users\100ri\abc_project. Before editing, read AGENTS.md, docs/agents/simulator-builder-agent.md, the root index, Stage 6 plan, this Stage 7 plan, UE 5.7 digests for materials/lights/post_process/cinematic_cameras/static_meshes/actors/python_editor, PhotorealRoadKit manifest, generate_road_intersection.py, Stage 6 capture and verifier scripts, and current git state.

Preserve constraints: SUMO/TraCI is truth, FastAPI orchestrates, Unreal renders, Pixel Streaming transports frames only. No real traffic-controller integration, no live SUMO claim without real sumo_traci runtime metadata, no landing-page changes, no proof strips/plinths/cards, no dominant traffic-zone image cards, no unlicensed commercial assets, no committed .env.local, no tmp/PixelStreamingInfrastructure, no UE security tokens/secrets. Stage 8 owns multi-city expansion; do not expand cities in Stage 7.

Baseline first: confirm branch/diff, inspect Stage 6 proof, record the exact Stage 7 visual failure list, run Stage 1-6 verifiers, runtime/HTTP smokes, bundled simulator verifiers, npm run runtime:readiness, and git diff --check. If readiness remains fixture mode, Stage 7 may proceed only as fixture-backed renderer realism proof; live SUMO remains open.

Iterate by inspecting source targets, generated texture/decal/atlas/mesh sources, Unreal source assets, generated map/manifest, proof captures, Stage 7 verifier output, readiness output, secret scan, and checkbox state. Make the smallest truthful change that improves the actual Unreal operator viewport while preserving signal, queue, vehicle, pedestrian, emergency, and lane readability.

Complete only when verify:operator-map-stage7 prints SUMO_READY_OPERATOR_STAGE7_PASS, Stage 1-6 verifiers still pass, runtime/HTTP smokes pass, npm run verify passes, human visual inspection approves the Unreal-rendered proof as photo-realistic enough, and this Stage 7 plan records exact evidence. Live SUMO is complete only after real sumo_traci metadata proves simulation_source=sumo_traci.

If blocked, stop and report exact blocker, inspected files/commands, artifacts, unchecked boxes, missing tooling/assets/runtime, and smallest unlock action.
```

## Self-Review

- Spec coverage: Stage 7 is a visual-production pass for Seoul only, with Stage 8 owning multi-city expansion.
- False-completion coverage: references, moodboards, loose source plates, road-only beauty renders, dashboard iframes, and script-only success cannot complete the stage.
- Boundary coverage: SUMO/TraCI truth, FastAPI orchestration, Unreal rendering, Pixel Streaming transport, no real traffic-controller integration, no landing-page edits, and no live SUMO claim without real metadata remain explicit.
- Visual coverage: asphalt, markings, curbs, sidewalks, signals, vehicles, street hardware, lighting, reflections, camera, post-process, and operator readability are all gated.
- Evidence coverage: source evidence, Unreal asset consumers, generated map, manifest, captures, visual verdict, verifier output, readiness, runtime smokes, repo verification, and secret/local-artifact scan are all required.
- Stage sequencing: Stage 7 blocks Stage 8 until one Seoul map reaches production-quality photo-realism.
