# Stage 6: Photoreal First-City Realism Pass

Back to [SUMO-Ready 3D Operator Map Implementation Plan](../2026-06-15-sumo-ready-3d-operator-map.md).

## Stage 6 Detailed Task Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task, and use `karpathy-guidelines` before planning, writing, reviewing, refactoring, or debugging code. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first streamed SmartIntersection operator viewport look plausibly real while preserving the Stage 1/2/3/4/5 simulation readability, renderer boundaries, and no-real-control safety posture.

**Architecture:** Stage 6 is a visual fidelity layer on top of the Stage 5 streamed operator viewport. SUMO/TraCI remains truth, FastAPI remains orchestration, `ATrafficSimulationController` remains the Unreal state binding path, and Unreal remains the renderer. Image generation and Creative Production outputs may be used as reference targets and as generated texture/decal/atlas source material, but they are not simulation truth and they are not completion evidence by themselves. Completion requires Unreal-rendered PBR materials, real 3D geometry, lighting, camera/post-process, proof captures, and a Stage 6 verifier.

**Tech Stack:** Unreal Engine 5.7, UE Editor Python, C++ `SmartIntersectionRuntime`, `PhotorealRoadKit`, PBR material instances, decal/atlas texture sources, Static Mesh actors, Lumen/post-process, CineCamera proof capture, existing Stage 4 renderer snapshots, Stage 5 Pixel Streaming dashboard proof, Image Gen reference and texture-source prompts, optional Creative Production moodboard direction, bundled Python verifiers.

---

### Stage 6 Execution Evidence - 2026-06-16

- Execution mode: inline primary-agent implementation using Superpowers execution/TDD/verification workflows and `karpathy-guidelines`. Worker agents were not dispatched because the exposed spawn tool is constrained to explicit user subagent requests in this session.
- Branch/worktree: started clean on `main...origin/main`, then switched to `codex/stage6-operator-map` before implementation.
- First city and mode: `seoul`; fixture-backed renderer realism proof. Live SUMO remains open until real runtime metadata proves `simulation_source=sumo_traci`.
- Image Gen source evidence:
  - Original generated folder: `C:/Users/100ri/.codex/generated_images/019ecc2b-082d-7170-84c7-7e3eb35efbed/`
  - Artifact copies: `artifacts/imagegen/stage6/operator_stage6_photoreal_target.png`, `operator_stage6_material_study.png`, `operator_stage6_road_atlas_source.png`, `operator_stage6_surface_overlays_source.png`, and `operator_stage6_imagegen_contact_sheet.png`
  - Unreal source copies: `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage6_seoul_photoreal_target.png`, `T_stage6_seoul_material_study.png`, `T_stage6_seoul_road_atlas.png`, `T_stage6_seoul_surface_overlays.png`
  - Prompt/path/material/consumer evidence: `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage6_photoreal_profile.json`
- Unreal-rendered proof evidence:
  - Map: `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild_operator_stage6.umap` (`1055575` bytes in verifier output)
  - Manifest: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage6_photoreal_manifest.json`
  - Imported generated texture assets: `renderer/unreal/SmartIntersection/Content/PhotorealRoadKit/Textures/T_stage6_seoul_*.uasset`
  - Generated material assets: `renderer/unreal/SmartIntersection/Content/Materials/RoadOnlyRenderer/M_seoul_stage6_seoul_*.uasset`
  - Before proof: `artifacts/unreal-operator-map-stage6-before.png` (`1600x900`, `909510` bytes, mean `152.48`, stddev `84.15`)
  - After proof: `artifacts/unreal-operator-map-stage6-photoreal-proof.png` (`1600x900`, `878893` bytes, mean `96.42`, stddev `94.18`)
  - Contact sheet: `artifacts/unreal-operator-map-stage6-before-after-contact-sheet.png` (`3200x900`, `1900442` bytes, mean `124.45`, stddev `93.60`)
  - Human visual verdict: `artifacts/unreal-operator-map-stage6-visual-verdict.json`
- Visual inspection result: approved after a second iteration. The first after-frame used the generated road atlas too broadly and read as tile patches; the accepted version uses photoreal asphalt as the dominant road material while generated road-atlas/material-study/overlay sources remain visibly applied through Unreal material and decal-like actors.
- Focused validation:
  - `npm run unreal:precheck` passed before implementation.
  - `npm run verify:operator-map-stage1` -> `SUMO_READY_OPERATOR_STAGE1_PASS`
  - `npm run verify:operator-map-stage2` -> `SUMO_READY_OPERATOR_STAGE2_PASS`
  - `npm run verify:operator-map-stage3` -> `SUMO_READY_OPERATOR_STAGE3_PASS`
  - `npm run verify:operator-map-stage4` -> `SUMO_READY_OPERATOR_STAGE4_PASS`
  - `npm run verify:operator-map-stage5` -> `SUMO_READY_OPERATOR_STAGE5_PASS`
  - `npm run verify:operator-map-stage6` -> `SUMO_READY_OPERATOR_STAGE6_PASS`
  - `npm run unreal:runtime-smoke` -> `RUNTIME_SNAPSHOT_SMOKE_ARTIFACT=C:\Users\100ri\abc_project\artifacts\unreal-runtime-snapshot-smoke.json`
  - `npm run unreal:http-smoke` -> `HTTP_SNAPSHOT_SMOKE_ARTIFACT=C:\Users\100ri\abc_project\artifacts\unreal-http-snapshot-smoke.json`
  - Bundled simulator checks passed: `SIMULATOR_BUILDER_AGENT_PASS`, `SOURCE_CHECK_PASS`, `LANDING_CHECK_PASS`, `MAP_CHECK_PASS`, `RENDERER_SNAPSHOT_VISUAL_LAYER_CHECK_PASS`, `RENDERER_SNAPSHOT_CAPTURE_VIEW_CHECK_PASS`, `FASTAPI_RENDERER_SNAPSHOT_CHECK_PASS`, `UNREAL_RUNTIME_SMOKE_ARTIFACTS_CHECK_PASS`, `UNREAL_HTTP_SMOKE_ARTIFACTS_CHECK_PASS`
  - `git diff --check` passed with CRLF warnings only.
- Runtime readiness evidence: `npm run runtime:readiness` still reports `vision ready=False mode=fixture`, `simulation ready=False mode=fixture`, `openai ready=False mode=gpt-5.5`, and `pgvector ready=False mode=database`. Missing live gates include `cv2`, `ultralytics`, `models/yolov8n.pt`, `traci`, `sumolib`, `sumo`, `netconvert`, `openai`, `OPENAI_API_KEY`, `pgvector`, and PostgreSQL vector extension.
- Repo-wide validation: `npm run verify` passed after Stage 6 implementation: API tests `71 passed`, web tests `47 passed`, Next.js build passed, and `git diff --check` passed.
- Local artifact and secret scan:
  - `git status --short -- .env.local apps/web/.env.local tmp renderer/unreal/SmartIntersection/Saved renderer/unreal/SmartIntersection/Intermediate` output was empty.
  - Secret grep found only expected policy, test, UI-label, and verifier guard strings. No active UE `SecurityToken=`, Pixel Streaming security token, RSA/private key, or real credential value remains in the changed config/runtime files.
  - Unreal generated `SecurityToken=` during editor runs; each generated token line was removed before validation.

### Stage 6 Answer To "Is Reference Enough?"

No. Reference alone is not enough.

Image Gen can be used in two valid ways:

- **Reference target:** define what the operator view should feel like: asphalt wear, lane paint age, curb material, wet reflections, signal hardware, vehicle finish, overcast lighting, and camera feel.
- **Texture/decal/atlas source:** generate road-surface atlases, lane-paint wear masks, grime overlays, puddle/reflection plates, facade/window atlases, sign-surface studies, or vehicle material studies that are saved under the project and connected to Unreal materials, decals, or mesh UVs.

Stage 6 only passes when the Unreal-rendered scene itself shows those qualities through real geometry, material instances, texture inputs, decals, lights, shadows, reflections, post-process, and proof captures. Do not mark Stage 6 complete from an Image Gen plate, moodboard, screenshot target, texture atlas, or road-only beauty render alone.

### Stage 6 Skill And Plugin Routing

Use only the skills/plugins that improve the Unreal photoreal outcome:

- **Superpowers:** required for execution, review, and verification workflow.
- **karpathy-guidelines:** required for surgical edits and verifiable success criteria.
- **imagegen:** use built-in image generation for reference plates, material studies, and project-bound texture/decal/atlas source images. Persist selected project-bound outputs under `artifacts/imagegen/` or `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/` with prompt evidence.
- **Creative Production:** use moodboard or shot-direction workflow only if multiple visual territories are needed before generating references. Do not generate a large board without explicit approval.
- **Game Studio 3D asset pipeline:** apply its asset-quality principles only if importing GLB/glTF/external mesh assets: stable pivots, normalized scale, LODs, material reuse, texture budgets, and runtime validation.
- **Product Design:** not required for Stage 6 unless the task expands into dashboard UI redesign. Stage 6 should not change dashboard UI or landing pages.

### Stage 6 Boundaries

Stage 6 does:

- make the first-city operator viewport visually realistic
- use `seoul` as the first-city realism target because the Stage 1-4 operator map is Seoul-based
- reuse and harden `PhotorealRoadKit` assets before creating a new realism asset path
- generate or select image-derived texture/decal/atlas sources for wet asphalt, worn markings, grime, curb, facade/window, puddle/reflection, and vehicle material detail
- improve road surfaces, decals, curbs, medians, sidewalks, traffic hardware, vehicles, lighting, camera, and post-process
- preserve signal phase, queue, vehicle, pedestrian, and emergency state readability
- produce before/after proof captures and a `SUMO_READY_OPERATOR_STAGE6_PASS` verifier

Stage 6 does **not**:

- claim live SUMO/TraCI unless a real local `sumo_traci` run proves `simulation_source=sumo_traci`
- change the simulation truth source, FastAPI snapshot contract, or controller authority boundary
- expand to all cities; Stage 8 owns multi-city rollout
- modify landing-page imagery, landing layout, or marketing sections
- use Image Gen plates as traffic-zone proof cards, proof strips, plinths, or dominant backplates
- treat a generated texture or atlas as proof before it is applied to Unreal geometry/materials and captured in the operator viewport
- import commercial assets without license evidence and a manifest entry
- commit `.env.local`, UE generated security tokens, API keys, credentials, or unrelated local artifacts

### Stage 6 Subagent Execution Split

Stage 6 is large enough that the primary agent should not implement it alone when subagents are available. Use `superpowers:subagent-driven-development` for implementation tasks unless the current tool surface genuinely cannot spawn workers. If worker spawning is unavailable, record that blocker in this file before using inline `superpowers:executing-plans`.

Use one worker owner per scope:

- **Worker A, image-derived texture source owner:** Task 28 only. Own `artifacts/imagegen/stage6/operator_stage6_*`, any prompt/source notes added to this plan, and any `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage6_seoul_*` source files. Do not edit Unreal generation code.
- **Worker B, Unreal photoreal integration owner:** Tasks 29-31. Own `generate_road_intersection.py`, `operator_stage6_photoreal_profile.json`, Stage 6 manifest creation, and material/geometry/camera/post-process wiring. Do not edit dashboard files or FastAPI snapshot contracts.
- **Worker C, capture and verifier owner:** Tasks 30, 32, and 33 after Worker B has a manifest shape. Own `capture_operator_map_stage6.py`, `capture-unreal-operator-map-stage6.ps1`, `verify-sumo-ready-operator-map-stage6.py`, package script aliases, and visual-verdict JSON shape.
- **Reviewer D, spec-compliance reviewer:** Review Stage 6 diffs against this plan, especially the rule that Image Gen-derived sources are allowed as material/decal/atlas inputs but are not completion evidence alone.
- **Reviewer E, code-quality/regression-risk reviewer:** Review risk to Stage 1/2/3/4/5 readability, `ATrafficSimulationController` binding, renderer-only boundaries, secrets/local artifacts, and validation coverage.

Primary-agent responsibilities:

- dispatch scoped workers with non-overlapping ownership
- wait for worker evidence before accepting `DONE`
- do not duplicate a worker's active scope while it is running
- integrate worker results centrally
- run final validation centrally
- record in this file whether subagent-driven execution was used, which worker scopes ran, and what evidence each returned

### Stage 6 File Map

**Read before editing:**

- `AGENTS.md`
- `docs/agents/simulator-builder-agent.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map/stage-5-pixel-streaming-dashboard.md`
- `docs/technotes/ue57-doc-digest/materials.txt`
- `docs/technotes/ue57-doc-digest/lights.txt`
- `docs/technotes/ue57-doc-digest/post_process.txt`
- `docs/technotes/ue57-doc-digest/cinematic_cameras.txt`
- `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/photoreal_roadkit_manifest.md`
- `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage4.py`
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Public/TrafficSimulationController.h`
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Private/TrafficSimulationController.cpp`
- `scripts/verify-road-photoreal-fidelity.py`
- `scripts/verify-sumo-ready-operator-map-stage4.py`
- `package.json`

**Modify only if needed:**

- `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage6.py`
- `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage6_photoreal_profile.json`
- `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage6_photoreal_manifest.json`
- `scripts/capture-unreal-operator-map-stage6.ps1`
- `scripts/verify-sumo-ready-operator-map-stage6.py`
- `package.json`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map/stage-6-photoreal-first-city.md`

**Generated proof artifacts:**

- `artifacts/imagegen/stage6/operator_stage6_photoreal_target.png`
- `artifacts/imagegen/stage6/operator_stage6_material_study.png`
- `artifacts/imagegen/stage6/operator_stage6_road_atlas_source.png`
- `artifacts/imagegen/stage6/operator_stage6_surface_overlays_source.png`
- `artifacts/imagegen/stage6/operator_stage6_imagegen_contact_sheet.png`
- `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage6_seoul_*`
- `artifacts/unreal-operator-map-stage6-before.png`
- `artifacts/unreal-operator-map-stage6-photoreal-proof.png`
- `artifacts/unreal-operator-map-stage6-before-after-contact-sheet.png`
- `artifacts/unreal-operator-map-stage6-visual-verdict.json`

### Task 27: Baseline And Realism Target Lock

**Files:**

- Read: root plan, Stage 5 plan, this Stage 6 plan
- Read: `PhotorealRoadKit` manifest and existing photoreal verifiers
- Validate: Stage 1-5 checks and current photoreal asset state

- [x] **Step 1: Confirm branch, cleanliness, and Stage 5 status**

Run:

```powershell
git status --short --branch
git fetch origin main
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
npm run verify:operator-map-stage3
npm run verify:operator-map-stage4
npm run verify:operator-map-stage5
npm run runtime:readiness
```

Expected: Stage 1-5 are green before Stage 6 starts. If Stage 5 is not implemented yet, stop and run Stage 5 first. If runtime readiness still reports fixture mode, record that Stage 6 is a fixture/renderer visual proof and leave live SUMO open.

- [x] **Step 2: Run current photoreal asset checks**

Run:

```powershell
python3 scripts/verify-road-photoreal-fidelity.py
python3 scripts/verify-road-proof-visibility.py
python3 scripts/verify-road-proof-capture-readability.py
```

Expected: existing road photoreal proof checks either pass or produce exact blockers that Stage 6 must address. Do not skip these checks because Stage 6 is operator-map-specific.

- [x] **Step 3: Lock the first-city target**

Record in this file:

```md
### Stage 6 Target Lock - YYYY-MM-DD

- First city: `seoul`
- Base viewport: Stage 5 Pixel Streaming dashboard proof
- Simulation mode: fixture or live as reported by `npm run runtime:readiness`
- Visual target: real rainy/overcast Seoul operator traffic camera view, readable lanes and signals
- Not completion evidence: Image Gen reference alone, generated texture alone, moodboard alone, static road-only beauty render alone
```

Expected: the visual target is explicit before any materials, lights, or camera changes are made.

### Task 28: Generate Reference And Texture Sources

**Files:**

- Create: `artifacts/imagegen/stage6/operator_stage6_photoreal_target.png`
- Create: `artifacts/imagegen/stage6/operator_stage6_material_study.png`
- Create: `artifacts/imagegen/stage6/operator_stage6_road_atlas_source.png`
- Create: `artifacts/imagegen/stage6/operator_stage6_surface_overlays_source.png`
- Create if used in Unreal source assets: `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Textures/T_stage6_seoul_*`
- Update: this Stage 6 plan with selected reference paths, texture-source paths, prompt text, and usage notes

- [x] **Step 1: Generate the operator-view reference plate with `imagegen`**

Use the built-in image generation path unless the user explicitly asks for CLI/API mode.

Prompt:

```text
Use case: photorealistic-natural
Asset type: Unreal operator-view realism reference, not a runtime asset
Primary request: photoreal rainy overcast Seoul smart intersection seen from a high fixed traffic-operations camera, wide four-way intersection, readable lane structure, visible signal heads, realistic asphalt wear, wet reflections, worn lane paint, curbs, sidewalks, traffic cabinets, CCTV pole, modest city storefront context, buses and passenger cars queued naturally
Style/medium: realistic documentary traffic-camera photograph, not cinematic concept art
Composition/framing: high oblique operator camera, full intersection readable, no close-up hero car, no dramatic low angle
Lighting/mood: soft overcast daylight, wet pavement sheen, controlled exposure, no blown highlights, no crushed shadows
Materials/textures: PBR asphalt, rough wet patches, scuffed thermoplastic lane paint, concrete curbs, black signal hardware, glass and metal vehicle surfaces
Constraints: no UI, no labels, no logos, no watermark, no readable sign text, no fantasy vehicles, no proof strips, no plinths, no card-like billboards
Avoid: stylized game art, miniature toy look, empty roads, excessive motion blur, dramatic cinematic depth of field
```

Expected: a reference image that establishes what "real" means for the first-city operator view. It is not imported into the traffic-reading zone as a proof card.

- [x] **Step 2: Generate or select material-study source imagery**

Prompt:

```text
Use case: photorealistic-natural
Asset type: material and surface reference for Unreal PBR authoring
Primary request: close but still natural photoreal study of wet city intersection surfaces: patched dark asphalt, scuffed white and yellow lane markings, curb concrete, tactile paving, drain grate, tire polish, puddle reflection, dirt and grime buildup
Style/medium: real-world road maintenance photography
Composition/framing: angled ground-level surface study with enough perspective to read texture scale
Lighting/mood: overcast daylight, soft shadows, natural reflections
Materials/textures: asphalt aggregate, normal-map worthy cracks, roughness variation, worn thermoplastic paint edges, concrete chips, metal drain grate
Constraints: no text, no logos, no watermark, no stylized texture sheet grid, no synthetic procedural pattern look
```

Expected: source imagery helps author Unreal material instances, decals, roughness, and normal detail. It may become a Stage 6 source texture only after it is saved in the workspace, named, recorded with prompt evidence, and connected through Unreal material/decal/mesh usage rather than displayed as a flat proof card.

- [x] **Step 3: Generate road-atlas and overlay sources**

Generate one or two image-derived texture source assets. These are not UI mockups and not proof screenshots; they are source plates for Unreal material/decal work.

Road atlas prompt:

```text
Use case: photorealistic-natural
Asset type: texture/decal source atlas for Unreal PBR materials
Primary request: top-down orthographic source plate of realistic wet Seoul intersection road surface details for texture extraction: dark patched asphalt, tire-polished wet lanes, worn white stop bars, worn yellow lane markings, scuffed bus-priority red paint, crosswalk paint edge breakup, small cracks, tar repairs, subtle puddle reflection strips
Style/medium: photoreal material-source image, clean atlas-like composition but not a graphic design sheet
Composition/framing: mostly top-down, evenly lit, multiple distinct surface regions separated by natural seams, no perspective-heavy buildings, no vehicles, no people
Lighting/mood: soft overcast daylight, no harsh shadows, no directional glare that prevents texture extraction
Materials/textures: asphalt aggregate, roughness variation, paint chips, grime, puddle sheen, concrete curb edge
Constraints: no text, no logos, no watermark, no UI, no labels, no arrows, no full intersection card, no toy/game style
Avoid: repeating tile pattern, perfect synthetic grid, cartoon paint, high-contrast dramatic lighting
```

Surface overlay prompt:

```text
Use case: photorealistic-natural
Asset type: overlay/decal source for Unreal material layering
Primary request: photoreal transparent-looking source composition of road grime, tire marks, rain streaks, wet reflection streaks, chipped thermoplastic paint edges, fine cracks, curb dirt, and subtle oil stains for extracting decals and masks
Style/medium: realistic road-surface source photography
Composition/framing: isolated overlay elements on neutral dark asphalt-like background with generous spacing for cropping
Lighting/mood: soft overcast light, low specular glare, natural contrast
Materials/textures: grime, rubber tire polish, water sheen, chipped paint, cracked asphalt, rough concrete dirt
Constraints: no text, no logos, no watermark, no UI, no signs, no vehicles, no people
Avoid: obvious collage borders, synthetic brush strokes, neon colors, decorative pattern look
```

Expected: selected atlas/overlay files can be cropped or assigned into Unreal material instances, decals, or mesh UVs. They do not count as Stage 6 completion until the Unreal-rendered operator proof shows them in context.

- [x] **Step 4: Record reference and source limits**

Add a short evidence block:

```md
Reference/source verdict:
- Reference target selected:
- Material study selected:
- Road atlas source selected:
- Overlay source selected:
- Workspace texture paths:
- How Unreal must match it:
- Which generated sources are allowed as material/decal inputs:
- Which generated sources are not allowed as traffic-zone cards:
- What must stay readable:
- Why reference alone is insufficient:
- Why generated textures alone are insufficient:
```

Expected: every future Stage 6 change can be compared to concrete visual and texture targets without confusing target/source imagery with renderer proof.

### Task 29: Reuse And Harden `PhotorealRoadKit`

**Files:**

- Read/modify: `renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/`
- Read/modify: `renderer/unreal/SmartIntersection/Content/PhotorealRoadKit/`
- Read/modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Create: `renderer/unreal/SmartIntersection/SceneProfiles/operator_stage6_photoreal_profile.json`

- [x] **Step 1: Inventory reusable realism assets**

Run:

```powershell
git ls-files renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit renderer/unreal/SmartIntersection/Content/PhotorealRoadKit
```

Expected: identify existing asphalt, marking, curb, signal, streetlight, railing, storefront, vehicle, wet reflection, grime, and crack assets before adding new ones.

- [x] **Step 2: Create the Stage 6 photoreal profile**

Create `operator_stage6_photoreal_profile.json`:

```json
{
  "schema": "operator-stage6-photoreal-seoul-profile-v1",
  "city": "seoul",
  "base_stage": "OperatorStage5",
  "renderer_policy": "SUMO/TraCI is truth, FastAPI orchestrates, Unreal renders. Photoreal assets are visual only.",
  "reference_policy": "Image Gen and Creative Production outputs guide materials, lighting, and composition; they are not completion evidence by themselves.",
  "texture_source_policy": "Generated image sources may be used as material, decal, mask, or atlas inputs only after prompt/path evidence is recorded and the source is applied through Unreal materials or mesh UVs. Do not use them as dominant traffic-zone proof cards.",
  "required_actor_tags": [
    "OperatorStage6",
    "SUMOReadyOperatorMapPhotoreal",
    "Stage6PhotorealSurface",
    "Stage6GeneratedTextureApplied",
    "Stage6DecalAtlasApplied",
    "NoImageCardTrafficZone",
    "Stage4ReadableRuntimeState"
  ],
  "material_targets": [
    "wet_patched_asphalt",
    "worn_lane_paint",
    "concrete_curb",
    "signal_black_metal",
    "vehicle_glass",
    "wet_reflection",
    "grime_overlay"
  ],
  "generated_texture_sources": [
    "stage6_seoul_road_atlas",
    "stage6_seoul_surface_overlays",
    "stage6_seoul_material_study"
  ],
  "readability_requirements": [
    "lanes_readable",
    "signal_phase_readable",
    "vehicle_queue_readable",
    "pedestrian_state_readable",
    "emergency_state_readable"
  ]
}
```

Expected: the profile gives verifiers a stable contract without changing simulation truth.

- [x] **Step 3: Allow texture sources, reject traffic-zone image cards**

Audit new Stage 6 additions against these rules:

- Image Gen-derived road atlases, grime overlays, paint wear masks, reflection plates, and facade/window sources are allowed as Unreal material/decal/mesh texture inputs
- every generated texture source used in Unreal must have a saved workspace path and prompt/source evidence in this plan or a manifest
- no Image Gen reference plate used as a full roadway proof plane
- no facade/backplate card inside the traffic-reading zone
- distant sky or skyline cards are allowed only outside traffic-state readability and must be hidden from semantic proof if they dominate the frame
- every road, lane, curb, signal, vehicle, and pedestrian-visible element must be mesh/decal/material-based

Expected: Stage 6 realism can use generated image-derived material sources, but the visible proof must come from 3D/PBR scene construction rather than a photo pasted behind or under the intersection.

### Task 30: Add Stage 6 Operator Generation And Capture

**Files:**

- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Create: `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage6.py`
- Create: `scripts/capture-unreal-operator-map-stage6.ps1`
- Modify: `package.json`
- Create: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage6_photoreal_manifest.json`

- [x] **Step 1: Add generation and capture commands**

Add package scripts:

```json
"unreal:generate:operator-stage6": "npm run unreal:generate-city -- -Profile seoul -OperatorStage6",
"unreal:capture:operator-stage6": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-operator-map-stage6.ps1",
"verify:operator-map-stage6": "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"& \\\"$env:USERPROFILE\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe\\\" scripts/verify-sumo-ready-operator-map-stage6.py\""
```

Expected: Stage 6 can be generated, captured, and verified independently.

- [x] **Step 2: Add `OperatorStage6` generation mode**

Extend the generator so `-OperatorStage6`:

- starts from the Stage 4/5 operator map layout
- imports or references Stage 6 generated texture/decal/atlas sources through `PhotorealRoadKit` or `T_stage6_seoul_*` source assets
- applies Stage 6 photoreal material instances, decals, mesh UV textures, and geometry layers
- preserves all Stage 3 actor labels used by Stage 4 snapshot binding
- adds `OperatorStage6`, `SUMOReadyOperatorMapPhotoreal`, `Stage6PhotorealSurface`, `Stage6GeneratedTextureApplied`, `Stage6DecalAtlasApplied`, `NoImageCardTrafficZone`, and `Stage4ReadableRuntimeState` tokens to the map/manifest
- records each generated texture source path, target material, and consuming actor/decal in the Stage 6 manifest
- writes `smart_intersection_rebuild_operator_stage6_photoreal_manifest.json`

Expected: the same traffic state can still bind through `ATrafficSimulationController`, but the viewport looks materially richer.

- [x] **Step 3: Capture before/after proof**

Create capture automation that writes:

```text
artifacts/unreal-operator-map-stage6-before.png
artifacts/unreal-operator-map-stage6-photoreal-proof.png
artifacts/unreal-operator-map-stage6-before-after-contact-sheet.png
```

Expected: the before capture uses the accepted Stage 5/Stage 4 visual baseline, and the after capture uses the same camera framing so realism changes are comparable.

### Task 31: Tune Lighting, Camera, And Post-Process For Reality

**Files:**

- Modify: `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- Modify: `renderer/unreal/SmartIntersection/Content/Python/capture_operator_map_stage6.py`
- Read: `docs/technotes/ue57-doc-digest/lights.txt`
- Read: `docs/technotes/ue57-doc-digest/post_process.txt`
- Read: `docs/technotes/ue57-doc-digest/cinematic_cameras.txt`

- [x] **Step 1: Add physically plausible lighting**

Use:

- Directional Light for soft overcast sun direction
- Sky Light and Sky Atmosphere/Fog for ambient fill
- Lumen GI/reflections where project settings allow it
- contact shadows or ambient occlusion to ground vehicles, curbs, signals, railings, and pedestrians

Expected: the scene has realistic grounding and shadow contact without losing lane readability.

- [x] **Step 2: Add operator-camera post-process**

Use an unbound PostProcessVolume or camera settings to stabilize:

- exposure range
- color temperature
- contrast
- bloom kept low enough to preserve signal lenses
- motion blur off or minimal for proof captures
- depth of field minimal enough that lanes, queues, and signals remain readable

Expected: proof looks like a real fixed traffic-operations camera, not a cinematic hero shot or a stylized game render.

- [x] **Step 3: Preserve simulation-state readability**

Reject any visual tuning that makes these unreadable:

- active signal phase
- queue/vehicle position
- pedestrian request state
- emergency vehicle state
- lane arrows, stop bars, and crosswalks

Expected: photorealism improves trust without hiding the simulation state.

### Task 32: Add Stage 6 Visual Inspection Evidence

**Files:**

- Inspect: `artifacts/unreal-operator-map-stage6-before.png`
- Inspect: `artifacts/unreal-operator-map-stage6-photoreal-proof.png`
- Inspect: `artifacts/unreal-operator-map-stage6-before-after-contact-sheet.png`
- Create: `artifacts/unreal-operator-map-stage6-visual-verdict.json`

- [x] **Step 1: Perform human visual inspection**

Reject Stage 6 proof if any condition is true:

- it still looks like flat blockout/game art
- asphalt, curb, lane markings, signals, vehicles, or sidewalks lack believable material variation
- lighting is black, blown out, overly cinematic, or too saturated
- vehicles or signal hardware no longer fit lane scale
- image cards dominate the traffic-reading zone
- Stage 1/2/3/4/5 readability is lost
- proof is a landing page, editor-only beauty shot, or road-only render instead of the operator viewport

Expected: a human can say the Unreal proof plausibly resembles a real traffic-camera/operator view.

- [x] **Step 2: Write visual verdict JSON**

Create:

```json
{
  "schema": "operator-stage6-human-visual-verdict-v1",
  "city": "seoul",
  "mode": "OperatorStage6",
  "reference_is_completion_evidence": false,
  "generated_texture_is_completion_evidence": false,
  "unreal_render_is_completion_evidence": true,
  "proof_paths": {
    "before": "artifacts/unreal-operator-map-stage6-before.png",
    "after": "artifacts/unreal-operator-map-stage6-photoreal-proof.png",
    "contact_sheet": "artifacts/unreal-operator-map-stage6-before-after-contact-sheet.png"
  },
  "generated_texture_sources": [
    "artifacts/imagegen/stage6/operator_stage6_road_atlas_source.png",
    "artifacts/imagegen/stage6/operator_stage6_surface_overlays_source.png"
  ],
  "visual_checks": {
    "photoreal_materials": "pass_or_fail",
    "lighting_and_exposure": "pass_or_fail",
    "traffic_readability": "pass_or_fail",
    "no_traffic_zone_cards": "pass_or_fail",
    "stage_1_5_preserved": "pass_or_fail"
  },
  "live_sumo_status": "deferred_unless_real_sumo_traci_run_passes"
}
```

Expected: the verifier can read the JSON and fail if visual verdict remains unrecorded or incomplete.

### Task 33: Add Stage 6 Semantic Verifier

**Files:**

- Create: `scripts/verify-sumo-ready-operator-map-stage6.py`
- Modify: `package.json`
- Read: `scripts/verify-sumo-ready-operator-map-stage4.py`
- Read: `scripts/verify-road-photoreal-fidelity.py`

- [x] **Step 1: Verify Stage 6 source tokens**

The verifier should check:

- `operator_stage6_photoreal_profile.json` exists and names `seoul`
- Stage 6 manifest exists and says photoreal assets are visual only
- Stage 6 manifest records any generated texture/decal/atlas source paths, prompts or prompt-file references, and consuming Unreal materials/actors
- Stage 6 map or manifest includes `OperatorStage6`, `SUMOReadyOperatorMapPhotoreal`, `Stage6PhotorealSurface`, `Stage6GeneratedTextureApplied`, `Stage6DecalAtlasApplied`, `NoImageCardTrafficZone`, and `Stage4ReadableRuntimeState`
- `package.json` contains `verify:operator-map-stage1` through `verify:operator-map-stage6`
- `scripts/verify-road-photoreal-fidelity.py` still exists

Expected: verifier fails if Stage 6 is only a reference image, only loose generated textures, only a dashboard screenshot, or only a road-only beauty pass.

- [x] **Step 2: Verify proof images and verdict JSON**

The verifier should check:

- proof images exist
- proof dimensions are at least `1280x720`
- proof images have nontrivial brightness and contrast
- visual verdict JSON exists
- `reference_is_completion_evidence` is `false`
- `generated_texture_is_completion_evidence` is `false`
- `unreal_render_is_completion_evidence` is `true`
- all `visual_checks` values are `pass`

Expected output ends with:

```text
SUMO_READY_OPERATOR_STAGE6_PASS
```

### Task 34: Final Stage 6 Validation

**Files:**

- Validate: Stage 1-6 verifiers, photoreal scripts, renderer smoke scripts, proof artifacts, generated manifest, this plan

- [x] **Step 1: Run focused checks**

Run:

```powershell
npm run unreal:precheck
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
npm run verify:operator-map-stage3
npm run verify:operator-map-stage4
npm run verify:operator-map-stage5
npm run verify:operator-map-stage6
python3 scripts/verify-road-photoreal-fidelity.py
npm run unreal:runtime-smoke
npm run unreal:http-smoke
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-simulator-builder-agent.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-complete-simulation-renderer.py
npm run runtime:readiness
git diff --check
```

Expected: focused checks pass. If live SUMO remains missing, Stage 6 may still pass as a fixture-backed renderer realism proof, but live SUMO remains explicitly open.

- [x] **Step 2: Run full repo validation**

Run:

```powershell
npm run verify
```

Expected: API tests, web tests, web build, and `git diff --check` pass.

- [x] **Step 3: Run final local-artifact and secret scan**

Run:

```powershell
git status --short -- .env.local apps/web/.env.local tmp renderer/unreal/SmartIntersection/Saved renderer/unreal/SmartIntersection/Intermediate
rg -n "SecurityToken|PixelStreaming\\.SecurityToken|OPENAI_API_KEY|BEGIN RSA|PRIVATE KEY|password|secret" scripts apps/web renderer/unreal/SmartIntersection docs/superpowers/plans
```

Expected: no secret material, UE generated token, local Pixel Streaming infrastructure, or unrelated local artifact is staged or committed.

### Stage 6 Goal Mode Prompt

This prompt follows the OpenAI Cookbook guidance in "Using Goals in Codex":
`https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex#how-to-write-a-goal`.

```md
/goal Build Stage 6 of the SUMO-ready 3D operator map for SmartIntersection: a photoreal first-city realism pass where the Stage 5 streamed Unreal operator viewport for `seoul` is upgraded from readable simulation proof to a plausibly real traffic-camera/operator view without losing Stage 1/2/3/4/5 readability or simulation boundaries.

Success requires preserved Stage 1/2/3/4/5 verifiers, a new `SUMO_READY_OPERATOR_STAGE6_PASS` verifier, Image Gen or Creative Production reference targets recorded as reference evidence, imagegen-derived texture/decal/atlas sources recorded with prompt/path evidence, Unreal-rendered before/after proof captures showing the photoreal transition, PBR material/geometry/lighting/post-process evidence in `PhotorealRoadKit` or Stage 6 assets, human visual inspection confirming reality-like asphalt/markings/curbs/signals/vehicles/lighting, `npm run runtime:readiness` recorded honestly, `npm run verify` passing, and this Stage 6 plan updated with exact evidence.

Reference is not enough, and loose generated textures are not enough. Image Gen may produce texture/decal/atlas sources that are actually used in Unreal materials, but do not mark Stage 6 complete from Image Gen, a moodboard, a texture plate, a road-only beauty render, or a dashboard iframe alone. Completion requires Unreal-rendered operator-map proof where geometry, image-derived material inputs, decals, lighting, camera, and post-process create the realism.

Use required skills before acting: Superpowers process skills for execution/verification, `karpathy-guidelines` for surgical implementation, `imagegen` for reference plates plus texture/decal/atlas source images, Creative Production only if multiple visual territories need exploration, and Game Studio 3D asset pipeline principles only for imported GLB/glTF asset cleanup. Product Design is not required unless the scope expands into dashboard UI redesign.

Start from repo `C:\Users\100ri\abc_project`. Read `AGENTS.md`, `docs/agents/simulator-builder-agent.md`, the root index, Stage 5 plan, this Stage 6 plan, `docs/technotes/ue57-doc-digest/materials.txt`, `lights.txt`, `post_process.txt`, `cinematic_cameras.txt`, `PhotorealRoadKit` manifest, `generate_road_intersection.py`, Stage 4/5 capture and verifier scripts, and current git state before editing.

Preserve constraints: SUMO/TraCI is truth, FastAPI orchestrates, Unreal renders, Pixel Streaming transports rendered frames only, no real traffic-controller integration, no live SUMO claim without a real local `sumo_traci` run, no landing-page changes, no proof strips/plinths/cards, no dominant traffic-zone image cards, no unlicensed commercial assets, no committed `.env.local`, no `tmp/PixelStreamingInfrastructure` commit, and no UE security tokens or secrets in commits.

Between iterations inspect the reference target, generated texture/decal/atlas sources, Unreal source assets, generated map/manifest, proof captures, Stage 6 verifier output, readiness output, and checkbox state. Choose the smallest next change that makes the actual Unreal operator viewport more reality-like while preserving signal, queue, vehicle, pedestrian, emergency, and lane readability.

Completion means `verify:operator-map-stage6` prints `SUMO_READY_OPERATOR_STAGE6_PASS`, Stage 1/2/3/4/5 verifiers still pass, runtime/HTTP smoke coverage still passes, `npm run verify` passes, human visual inspection confirms the Unreal-rendered proof looks plausibly real, and this Stage 6 plan records exact evidence. Live SUMO mode is complete only if a real local `sumo_traci` runtime run passes and source metadata prove `simulation_source=sumo_traci`.

If blocked, stop and report the exact blocker, inspected files/commands, current artifacts, unchecked boxes, missing runtime/tooling/assets, and the smallest action that would unlock progress. Do not mark complete from reference quality or texture-source quality alone; completion must be proven by Unreal artifact, verifier, repo validation, and visual evidence.
```
