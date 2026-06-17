# R3F Photoreal Dashboard Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the failed Unreal/Pixel Streaming renderer path with a photorealistic React Three Fiber simulation renderer embedded inside the existing `/dashboard` digital-twin viewport.

**Architecture:** Keep FastAPI/SUMO/TraCI/Tarcl as simulation truth and orchestration. Keep React DOM as the dashboard and HUD shell. Add an R3F renderer island under the existing `SimulationViewport` seam, backed first by a typed fixture snapshot contract, then by live SUMO/Tarcl snapshots or traces. Use a hybrid of procedural roadway geometry, Image Gen reference/texture sources, optimized GLB assets, and browser performance gates.

**Tech Stack:** Next.js 15, React 19, TypeScript, React Three Fiber, Three.js, Drei, React Postprocessing, glTF/GLB 2.0, glTF Transform, FastAPI, Pydantic, SUMO/TraCI/Tarcl, Vitest, Testing Library, Playwright.

---

## Required Skills And Plugins For Execution

Every agent or worker implementing this plan must use applicable skills/plugins before planning, editing, testing, reviewing, or reporting completion.

Required process and coding skills:

```text
superpowers:using-superpowers
superpowers:writing-plans when modifying this plan
superpowers:subagent-driven-development or superpowers:executing-plans when executing stages
superpowers:test-driven-development for implementation and bug-fix stages
superpowers:systematic-debugging for failing tests, broken rendering, WebGL issues, or runtime errors
superpowers:verification-before-completion before any completion, fixed, passing, commit, or push claim
superpowers:requesting-code-review for non-trivial renderer/API changes before final integration
karpathy-guidelines for every coding, debugging, reviewing, refactoring, or implementation-planning step
```

Required renderer, asset, image, and frontend skills/plugins:

```text
imagegen for photoreal target references, texture/decal source generation, and visual direction assets
game-studio:web-game-foundations for simulation/rendering/state/input/asset boundaries
game-studio:react-three-fiber-game for R3F scene architecture and React/render-state separation
game-studio:web-3d-asset-pipeline for GLB/glTF, LOD, material, compression, and asset-manifest work
build-web-apps:frontend-testing-debugging or webapp-testing/playwright for browser proof, screenshots, canvas nonblank checks, console checks, and responsive QA
build-web-apps:react-best-practices when changing React/Next rendering behavior or performance-sensitive state
github:yeet only when publishing the finished branch/commit after explicit user approval
```

Missing skill or plugin rule:

```text
If a required skill/plugin is not available locally, do not silently proceed without it.
Use find-skills, skill-installer, tool_search, or the relevant plugin installer flow to locate it.
Download/install the needed skill or plugin, then read and use it before continuing the affected stage.
If the active agent policy requires approval before installing or updating a skill/plugin, get that approval first.
Record missing-skill installation or fallback evidence in the stage notes.
If no reputable skill/plugin exists for the needed domain, state that clearly and continue with the closest available official/local skill plus explicit verification.
```

## Repo Evidence Read

- Active dashboard renderer seam: `apps/web/components/SimulationViewport.tsx`.
- Active dashboard shell: `apps/web/components/DigitalTwin.tsx`, `apps/web/components/DashboardShell.tsx`, `apps/web/components/DashboardRoute.tsx`.
- Active frontend contract: `apps/web/lib/types.ts`, `apps/web/lib/api.ts`.
- Active backend simulation boundary: `apps/api/app/adapters/simulation.py`, `apps/api/app/domain/schemas.py`, `apps/api/app/api/routes.py`.
- Runtime readiness gates: `apps/api/app/services/runtime_readiness.py`, `docs/runtime-setup.md`.
- Existing tests already protect aggregate-only SUMO copy and hosted stream precedence: `apps/web/components/DashboardShell.test.tsx`.
- Current web dependencies do not include `three`, `@react-three/fiber`, Drei, postprocessing, or glTF tooling: `apps/web/package.json`.
- Current repo has no root `plan.md`, so this Superpowers plan is the active planning artifact.
- Unreal work is isolated under `archive/unreal/original/` and must not be restored for this browser-renderer path.
- Non-archive visual evidence remains useful as reference only:
  - `docs/technotes/assets/smart-intersection-generated-screenshots/unreal-operator-map-stage3-proof.png`
  - `docs/technotes/assets/smart-intersection-generated-screenshots/sumo-ready-operator-map-stage3-asset-reference.png`
  - `apps/web/public/simulation/realistic-intersection-night.png`
- New Image Gen references created for this plan:
  - Preferred target with longer roads and denser traffic: `docs/technotes/assets/smart-intersection-generated-screenshots/r3f-long-corridor-traffic-reference.png`
  - `docs/technotes/assets/smart-intersection-generated-screenshots/r3f-photoreal-target-reference.png`

## Non-Negotiable Boundaries

- Do not claim live CCTV, real signal control, or real vehicle trajectories unless the backend snapshot/trace contract supplies them.
- SUMO/TraCI/Tarcl remains traffic truth. R3F only renders received state and interpolates between states.
- Keep `NEXT_PUBLIC_SIMULATION_STREAM_URL` support as an external-hosted-renderer escape hatch.
- Keep the existing dashboard safety copy visible: `Simulation only / No real signal control`.
- The scene must show long approach roads from all four sides with enough visible traffic volume to read congestion, not only a tight intersection box.
- Photorealistic rendering is a hard requirement. The final R3F scene must use physically based materials, realistic wet-road reflections, believable vehicle/signal lighting, worn road markings, contact shadows, depth haze, and real browser-rendered screenshots that visually approach `r3f-long-corridor-traffic-reference.png`.
- Do not accept flat-color, toy-like, blockout, cartoon, low-poly proxy, or pure CSS/canvas fallback visuals as completion for the R3F renderer.
- Do not restore Unreal from `archive/` for this plan.
- Do not add physics unless a later task proves collision/physics is required for rendering; traffic motion should follow backend traces.
- Do not run package installs, downloads, or external asset purchases without explicit user approval at execution time.

## Photorealism Acceptance Standard

The renderer is accepted only when the actual `/dashboard` R3F canvas shows:

```text
long wet asphalt corridors with visible roughness/reflection variation
worn lane markings, crosswalk wear, curb grime, sidewalk slab variation
PBR vehicle materials with headlights, taillights, window/glass response, and contact shadows
traffic signals and streetlights with physically plausible emissive glow
subtle atmospheric depth/haze and restrained postprocessing
city-edge context with building/window lighting and tree/street furniture silhouettes
no obvious blockout primitives, untextured placeholder cars, flat gray roads, or toy-scale scene proportions
```

Browser proof must compare the rendered scene against:

```text
docs/technotes/assets/smart-intersection-generated-screenshots/r3f-long-corridor-traffic-reference.png
```

The reference is a visual target only. Runtime proof must come from browser screenshots of the implemented R3F canvas.

## Target File Structure

```text
apps/web/components/SimulationViewport.tsx
apps/web/components/SimulationViewportFallback.tsx
apps/web/components/r3f/R3FSimulationViewport.tsx
apps/web/components/r3f/SimulationCanvas.tsx
apps/web/components/r3f/SimulationScene.tsx
apps/web/components/r3f/CameraRig.tsx
apps/web/components/r3f/LightingRig.tsx
apps/web/components/r3f/ProceduralIntersection.tsx
apps/web/components/r3f/ApproachCorridors.tsx
apps/web/components/r3f/VehicleInstances.tsx
apps/web/components/r3f/TrafficDensityLayer.tsx
apps/web/components/r3f/SignalHardware.tsx
apps/web/components/r3f/SimulationOverlays.tsx
apps/web/components/r3f/useSimulationFrameStore.ts
apps/web/components/r3f/buildSceneSnapshot.ts
apps/web/components/r3f/assetManifest.ts
apps/web/components/r3f/webglSupport.ts
apps/web/lib/simulationSnapshot.ts
apps/web/public/simulation/r3f/assets/manifest.json
apps/web/public/simulation/r3f/assets/glb/
apps/web/public/simulation/r3f/assets/textures/
apps/api/app/domain/simulation_snapshot.py
apps/api/app/services/simulation_snapshot.py
apps/api/app/api/routes.py
apps/api/tests/test_simulation_snapshot.py
scripts/verify-r3f-assets.mjs
scripts/verify-r3f-dashboard.mjs
docs/technotes/r3f-photoreal-dashboard-renderer.md
```

## Stage 0: Lock The Browser Renderer Direction

**Files:**
- Create: `docs/technotes/r3f-photoreal-dashboard-renderer.md`
- Modify: `README.md`
- Modify: `docs/launch-runbook.md`

- [ ] **Step 1: Record the renderer decision**

Write a short technote stating:

```text
R3F is the active dashboard renderer path.
Unreal/Pixel Streaming remains archived.
SUMO/TraCI/Tarcl is simulation truth.
The browser renderer can interpolate received state but cannot invent traffic truth.
Image Gen references are visual targets, not runtime evidence.
```

- [ ] **Step 2: Update setup docs**

Add a dashboard renderer section to `README.md` and `docs/launch-runbook.md`:

```text
Default renderer: internal R3F digital twin when enabled and WebGL is available.
External renderer: NEXT_PUBLIC_SIMULATION_STREAM_URL iframe, still highest priority.
Fallback renderer: existing CSS/canvas virtual CCTV when R3F is disabled or WebGL fails.
```

- [ ] **Step 3: Verification**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

## Stage 1: Add R3F Dependencies And A Safe Renderer Island

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`
- Modify: `apps/web/components/SimulationViewport.tsx`
- Create: `apps/web/components/SimulationViewportFallback.tsx`
- Create: `apps/web/components/r3f/R3FSimulationViewport.tsx`
- Create: `apps/web/components/r3f/SimulationCanvas.tsx`
- Create: `apps/web/components/r3f/webglSupport.ts`
- Modify: `apps/web/components/DashboardShell.test.tsx`

- [ ] **Step 1: Add dependencies after approval**

Run only after user approval:

```bash
npm --workspace apps/web install three @react-three/fiber @react-three/drei @react-three/postprocessing
npm --workspace apps/web install -D @types/three @gltf-transform/cli
```

Expected: `apps/web/package.json` and `package-lock.json` update.

- [ ] **Step 2: Extract the current fallback**

Move the current DOM/CSS/canvas implementation from `SimulationViewport.tsx` into `SimulationViewportFallback.tsx` without changing visible copy or tests.

- [ ] **Step 3: Add browser-only R3F island**

Use `next/dynamic` with `ssr: false` so the Canvas never renders on the server:

```tsx
const R3FSimulationViewport = dynamic(
  () => import("./r3f/R3FSimulationViewport").then((mod) => mod.R3FSimulationViewport),
  { ssr: false }
);
```

- [ ] **Step 4: Keep stream precedence**

Renderer selection order:

```text
1. NEXT_PUBLIC_SIMULATION_STREAM_URL iframe
2. NEXT_PUBLIC_UNITY_WEBGL_URL legacy iframe
3. R3F renderer when enabled and WebGL supported
4. SimulationViewportFallback
```

- [ ] **Step 5: Add tests**

Add tests that assert:

```text
NEXT_PUBLIC_SIMULATION_STREAM_URL still mounts iframe before R3F.
Legacy Unity alias still mounts only when generic stream URL is absent.
Fallback copy remains visible when R3F is disabled.
The safety boundary remains visible.
```

- [ ] **Step 6: Verification**

Run:

```bash
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
npm run build:web
```

Expected: tests and build pass.

## Stage 2: Add A Snapshot Contract Before Real Motion

**Files:**
- Create: `apps/api/app/domain/simulation_snapshot.py`
- Create: `apps/api/app/services/simulation_snapshot.py`
- Modify: `apps/api/app/api/routes.py`
- Create: `apps/api/tests/test_simulation_snapshot.py`
- Create: `apps/web/lib/simulationSnapshot.ts`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/lib/types.ts`
- Create: `apps/web/components/r3f/buildSceneSnapshot.ts`

- [ ] **Step 1: Define backend snapshot schema**

Create a Pydantic schema with this shape:

```python
class SimulationVehicleSnapshot(BaseModel):
    id: str
    vehicle_type: Literal["car", "bus", "taxi", "truck", "emergency"]
    lane_id: str
    x_meters: float
    y_meters: float
    heading_degrees: float
    speed_mps: float
    waiting_seconds: float
    emergency: bool = False

class SimulationDensitySegment(BaseModel):
    segment_id: str
    approach: Literal["north", "south", "east", "west"]
    start_meters_from_stop_line: float
    end_meters_from_stop_line: float
    lane_count: int
    vehicle_count: int
    average_speed_mps: float
    source: Literal["aggregate_density_proxy", "fixture_density_proxy"]

class SimulationSignalSnapshot(BaseModel):
    signal_id: str
    direction: Literal["north", "south", "east", "west"]
    state: Literal["red", "yellow", "green"]
    seconds_remaining: float

class SimulationFrameSnapshot(BaseModel):
    source: str
    intersection_id: str
    scenario_id: str
    sim_time_seconds: float
    captured_at: datetime
    bounds_meters: dict[str, float]
    vehicles: list[SimulationVehicleSnapshot]
    density_segments: list[SimulationDensitySegment] = []
    signals: list[SimulationSignalSnapshot]
    queues: QueueMetrics
    events: list[TrafficEventRead]
```

- [ ] **Step 2: Add fixture snapshot service**

Map existing scenario data to deterministic snapshot frames:

```text
emergency: queues, long approach density segments, and one east emergency vehicle.
pedestrian: queues plus pedestrian pressure markers.
normal: light vehicle count and green current phase.
blocked: all-red or blocked marker plus high queue density on long approaches.
```

This is a temporary fixture renderer contract and must return `source = "simulation_snapshot_fixture"`.

- [ ] **Step 3: Add route**

Add:

```text
GET /api/simulation/frame?scenario_id=emergency
```

Keep `/api/simulate-signal` unchanged for aggregate comparison.

- [ ] **Step 4: Add frontend type and client**

Create `apps/web/lib/simulationSnapshot.ts` with TypeScript types matching the Pydantic shape and add:

```ts
export async function getSimulationFrame(scenarioId?: ScenarioId): Promise<SimulationFrameSnapshot>
```

- [ ] **Step 5: Add tests that prevent invented trajectories**

Tests must assert:

```text
R3F receives vehicles only from SimulationFrameSnapshot.
Aggregate SimulationComparison alone does not produce precise vehicle instances.
Long-road traffic fill must come from density_segments or explicit fixture mode, not from unlabeled frontend guesses.
The dashboard can still render aggregate SUMO telemetry without a frame endpoint.
```

- [ ] **Step 6: Verification**

Run:

```bash
npm run test:api -- test_simulation_snapshot.py
npm --workspace apps/web run test -- lib/api.test.ts components/DashboardShell.test.tsx
```

Expected: backend snapshot tests and frontend contract tests pass.

## Stage 3: Procedural Intersection Geometry

**Files:**
- Create: `apps/web/components/r3f/ProceduralIntersection.tsx`
- Create: `apps/web/components/r3f/ApproachCorridors.tsx`
- Create: `apps/web/components/r3f/TrafficDensityLayer.tsx`
- Create: `apps/web/components/r3f/roadGeometry.ts`
- Create: `apps/web/components/r3f/roadMaterials.ts`
- Create: `apps/web/components/r3f/SimulationScene.tsx`
- Modify: `apps/web/components/r3f/R3FSimulationViewport.tsx`
- Modify: `apps/web/components/DashboardShell.test.tsx`

- [ ] **Step 1: Build the base road from data, not images**

Create procedural primitives for:

```text
four long approach corridors, each extending far enough to show upstream traffic queues
intersection box
lane dividers
turn arrows
crosswalks
curbs
sidewalk slabs
queue zones
```

- [ ] **Step 2: Make the roads visibly longer than the intersection**

`ApproachCorridors.tsx` must generate each approach as its own module:

```text
north approach: at least 140 meters visible from stop line
south approach: at least 120 meters visible from stop line
east approach: at least 140 meters visible from stop line
west approach: at least 140 meters visible from stop line
minimum 3 inbound lanes and 2 outbound lanes where the camera can see them
sidewalk and building-edge context along each approach
```

The target visual is `r3f-long-corridor-traffic-reference.png`, not the tighter first reference.

- [ ] **Step 3: Add traffic density as a renderer layer**

`TrafficDensityLayer.tsx` must show queue volume without inventing live truth:

```text
fixture mode: derive queue density from existing QueueMetrics and label source as fixture
snapshot mode: render only vehicles supplied by SimulationFrameSnapshot
far corridor fill: use visibly lower-detail instanced vehicles only when source is fixture or when backend marks vehicles as aggregate_density proxies
```

No dense traffic layer may be labeled `sumo_traci` unless backend data supplies the vehicle or aggregate-density proxy.

- [ ] **Step 4: Use stable units**

Set the scene contract:

```text
1 Three.js unit = 1 meter.
Intersection center = [0, 0, 0].
Road plane uses X/Z.
Y is height.
North is negative Z.
```

- [ ] **Step 5: Add operator-readable camera**

Use an oblique camera that keeps long approaches visible:

```text
position: [72, 62, 88]
target: [0, 0, 0]
fov: 38
near/far: 0.1 / 500
```

- [ ] **Step 6: Add first scene test hooks**

Expose stable data attributes outside the canvas:

```text
data-r3f-simulation-ready
data-r3f-snapshot-source
data-r3f-renderer-mode
data-r3f-corridor-length-meters
data-r3f-traffic-density-mode
```

- [ ] **Step 7: Verification**

Run:

```bash
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
npm run build:web
```

Then run Playwright against `/dashboard` and verify:

```text
Canvas is nonblank.
No console errors.
No horizontal overflow at 390x844 and 1440x1000.
Safety copy is visible.
Desktop screenshot shows long north/south/east/west roads with visible traffic queues, not only a compact crossing.
```

## Stage 4: GLB And Image Gen Asset Pipeline

**Files:**
- Create: `apps/web/public/simulation/r3f/assets/manifest.json`
- Create: `apps/web/components/r3f/assetManifest.ts`
- Create: `scripts/verify-r3f-assets.mjs`
- Add: `apps/web/public/simulation/r3f/assets/glb/*.glb`
- Add: `apps/web/public/simulation/r3f/assets/textures/*`
- Modify: `docs/technotes/r3f-photoreal-dashboard-renderer.md`

- [x] **Step 1: Asset manifest contract**

Create manifest entries like:

```json
{
  "vehicles/emergency_ambulance": {
    "path": "/simulation/r3f/assets/glb/emergency_ambulance.glb",
    "kind": "vehicle",
    "source": "project-authored-or-licensed",
    "units": "meters",
    "pbr": true,
    "lod": "near",
    "maxTextureSize": 1024,
    "maxTriangles": 12000
  }
}
```

- [x] **Step 2: GLB kit**

Build or import optimized GLB assets for:

```text
near-passenger car, medium-passenger car, and far-low-poly passenger car
near-taxi and far-low-poly taxi
near-bus and far-low-poly bus
near-truck and far-low-poly truck
emergency ambulance with near and medium LODs
traffic signal pole and heads
streetlight
tree cluster
curb prop details
```

Only use project-authored/generated assets or assets with a documented license.

- [x] **Step 3: Image Gen texture/decal sources**

Use Image Gen for source references and texture/decal targets, then convert to runtime texture maps:

```text
wet asphalt albedo/roughness target
worn lane marking decal sheet
crosswalk wear/decal sheet
curb grime strip
sidewalk paver variation
facade/window emissive sheet
```

Do not use Image Gen outputs as evidence of real runtime rendering. Runtime proof must come from browser screenshots.

- [x] **Step 4: Optimize GLB assets**

Run glTF Transform after assets exist:

```bash
npx gltf-transform optimize input.glb output.glb --compress meshopt
```

Use KTX2/BasisU only after verifying the runtime decoder path works in Next.

- [x] **Step 5: Asset verifier**

`scripts/verify-r3f-assets.mjs` must check:

```text
manifest JSON parses
all referenced paths exist
GLB file sizes stay below planned budget
texture dimensions are power-of-two or explicitly allowed
no asset path points into archive/unreal/original
license/source field is present for every asset
vehicle assets include a lower-detail option for long-corridor density
near and hero assets declare pbr=true
no manifest entry is named placeholder, proxy, blockout, temp, or test-asset
```

- [x] **Step 6: Verification**

Run:

```bash
node scripts/verify-r3f-assets.mjs
npm run build:web
```

Expected: asset verifier and build pass.

Stage 4 evidence captured 2026-06-17:

- `node scripts/verify-r3f-assets.mjs` passed with concrete manifest, GLB, and texture/decal files.
- `npm --workspace apps/web run test -- components/DashboardShell.test.tsx` passed with the Stage 4 manifest contract test included.
- `npm run build:web` passed.
- `git diff --check` passed with only CRLF warnings.
- `docs/technotes/r3f-photoreal-dashboard-renderer.md` records source/license notes, GLB optimization assumptions, texture/decal provenance, and the reminder that browser screenshots, not Image Gen outputs, are runtime proof.

## Stage 4.1: Asset Realism Upgrade

**Goal:** Upgrade the Stage 4 asset pipeline from verifier-valid primitives to realism-ready shipped assets before Stage 5 lighting/material/camera polish. Do not accept toy-like vehicles, icon-like street furniture, or blockout-style props as complete.

**Files:**
- Modify: `apps/web/public/simulation/r3f/assets/manifest.json`
- Modify: `apps/web/public/simulation/r3f/assets/glb/vehicles/*.glb`
- Modify: `apps/web/public/simulation/r3f/assets/glb/props/*.glb`
- Modify: `apps/web/public/simulation/r3f/assets/textures/*`
- Create: `artifacts/r3f-stage4.1-asset-realism-contact-sheet.png`
- Create: `artifacts/r3f-stage4.1-glb-turntable-contact-sheet.png`
- Modify: `scripts/verify-r3f-assets.mjs`
- Modify: `docs/technotes/r3f-photoreal-dashboard-renderer.md`

**Execution policy:**

Use `superpowers:subagent-driven-development` with sequential, non-overlapping workers. The primary agent owns integration, final visual judgment, and final validation. Do not move to Stage 5 until Stage 4.1 passes both asset verifier checks and visual realism review.

Reject `DONE` from any worker unless it includes concrete evidence:

```text
files inspected
files changed
before/after visual artifact or GLB inspection output
verifier result
budget result
remaining realism risks
status: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED
```

Required worker sequence:

```text
Worker 1: vehicle GLB realism
  Owns only apps/web/public/simulation/r3f/assets/glb/vehicles/*.glb and vehicle manifest metadata.

Worker 2: street furniture and curb GLB realism
  Owns only apps/web/public/simulation/r3f/assets/glb/props/*.glb and prop manifest metadata.

Worker 3: material/decal realism
  Owns only apps/web/public/simulation/r3f/assets/textures/* and texture/decal manifest metadata.

Worker 4: proof artifact and verifier hardening
  Owns only artifacts/r3f-stage4.1-*.png and scripts/verify-r3f-assets.mjs.

Reviewer 1: spec compliance
  Reviews Stage 4.1 requirements against actual files, verifier output, and proof images.

Reviewer 2: visual/code-quality risk
  Rejects toy-like or blockout assets even if scripts pass.
```

If any reviewer says `CHANGES_REQUESTED`, send the issue back to the owning worker and repeat review. Continue this loop until both reviewers approve or a real blocker is documented.

- [x] **Step 1: Tighten the asset realism contract**

Extend the asset manifest and verifier so Stage 4.1 has a measurable realism bar beyond file existence:

```text
vehicle near/medium assets require realisticSilhouette=true
vehicle near assets require details.wheels >= 4
vehicle near assets require details.glassSurfaces >= 1
vehicle near assets require details.lightEmitters >= 2
vehicle near assets require details.bodyPanelBreaks >= 3
vehicle near assets require details.mirrors=true unless documented as intentionally omitted
vehicle far assets may be simplified but must preserve believable scale, wheels, glass, and light color blocks
props require details.scaleReferenceMeters and details.functionalParts
all assets require realismStatus="stage4_1_ready"
all assets require visualRejectIfToyLike=true
```

Verifier additions:

```text
fail if required realism metadata is missing
fail if near vehicle triangle count is below a minimum realism floor
fail if far LOD triangle count is greater than or equal to near LOD
fail if wheel/glass/light/body-panel metadata contradicts GLB node names
fail if GLB node/material names contain toy, blockout, proxy, placeholder, primitive-only, temp, or test-asset
fail if Stage 4.1 proof images are missing
```

Keep budgets practical for web delivery. Raising triangle budgets is allowed only when the updated manifest still keeps first-pass GLB + texture payload under the Stage 5 25 MB guardrail.

Stage 4.1 evidence captured 2026-06-17:
- `scripts/verify-r3f-assets.mjs` now requires `realismStatus="stage4_1_ready"`, `visualRejectIfToyLike=true`, vehicle/prop/texture detail metadata, banned GLB node/material name checks, near-vehicle realism floor, far LOD triangle ordering, required proof PNGs, and a 25 MB first-pass GLB + texture payload guardrail.
- `node scripts/verify-r3f-assets.mjs` passed with current payload `9.62 MB / 25.00 MB` after proof regeneration.

- [x] **Step 2: Upgrade vehicle GLBs**

Replace primitive vehicle bodies with more believable shipped GLBs for:

```text
passenger car near / medium / far
taxi near / far
bus near / far
truck near / far
emergency ambulance near / medium
```

Near and medium vehicle requirements:

```text
recognizable real-world proportions, not toy scale
separate named wheels with dark tire material and lighter hub material
glass material on windshield and side windows
headlight and taillight emitter materials
body panel seams or break lines
front/rear silhouette distinction
taxi roof sign or taxi-specific material cue
bus window row and larger massing
truck cab/cargo separation
ambulance emergency light bar and red/white emergency markings
meter-scale pivots and ground contact normalized
```

Far LOD requirements:

```text
lower triangle count than near/medium
still has wheel, glass, and light color blocks
keeps believable traffic-scale silhouette from the Stage 3/5 long-corridor camera
eligible for dense fixture traffic without reading as colored cubes
```

Run after Worker 1:

```bash
node scripts/verify-r3f-assets.mjs
```

Expected: verifier passes or fails only on known non-vehicle Stage 4.1 work still pending. No vehicle realism metadata or GLB budget failures.

Stage 4.1 vehicle evidence captured 2026-06-17:
- Replaced all 11 vehicle GLBs with higher-detail project-authored GLBs carrying named wheels, hubs, glass, lights, panel breaks, front/rear cues, and required type-specific cues.
- Final vehicle GLB examples: `passenger_car_near` 13,664 tris / 1.09 MB, `taxi_near` 14,396 tris / 1.17 MB, `bus_near` 10,044 tris / 684.2 KB, `truck_near` 12,108 tris / 869.9 KB, `emergency_ambulance_near` 10,356 tris / 816.4 KB.
- Vehicle manifest entries now include Stage 4.1 realism metadata and updated triangle/file-size budgets.

- [x] **Step 3: Upgrade street furniture, signals, and curb props**

Upgrade prop GLBs:

```text
traffic signal pole
traffic signal heads
streetlight
tree cluster
curb details
```

Requirements:

```text
traffic signal pole has mast/arm/base proportions that read as street infrastructure
traffic signal heads have separate red/yellow/green lens materials and hood geometry
streetlight has pole, lamp head, and warm emitter material
tree cluster has varied trunk/canopy silhouettes and does not read as a single icon
curb details include drains, chips, seams, bollard/edge detail, or grime-receiving geometry
all props are meter-scale and grounded
all hero/near props use PBR materials
```

Run after Worker 2:

```bash
node scripts/verify-r3f-assets.mjs
```

Expected: no prop realism metadata or GLB budget failures.

Stage 4.1 prop evidence captured 2026-06-17:
- Replaced all 5 prop GLBs with more legible infrastructure assets: brighter signal mast/arm/base details, separated signal heads/lenses/hoods, streetlight emitter geometry, multi-tree cluster with visible trunks/branches/canopies, and curb details with drain, bollards, chips, pavers, seams, and grime geometry.
- Final prop GLB examples: `traffic_signal_pole` 968 tris / 50.5 KB, `traffic_signal_heads` 684 tris / 53.5 KB, `streetlight` 760 tris / 37.4 KB, `tree_cluster` 2,344 tris / 75.5 KB, `curb_details` 1,000 tris / 66.7 KB.
- Prop manifest entries now include Stage 4.1 `scaleReferenceMeters`, `functionalParts`, realism notes, and updated triangle/file-size metadata.

- [x] **Step 4: Upgrade texture/decal realism**

Upgrade runtime maps so they can support realistic Stage 5 materials:

```text
wet asphalt albedo has aggregate, tar streaks, oil stains, and nonrepeating patch variation
wet asphalt roughness has usable grayscale range for puddles/reflection variation
worn lane markings include cracked paint, tire scuffs, edge erosion, and alpha breakup
crosswalk wear includes eroded zebra bars and vehicle-worn crossing bands
curb grime includes road-contact dirt buildup, vertical runoff, and chipped edge variation
sidewalk paver variation includes seams, slab offsets, stains, and small cracks
facade/window emissive includes dark mullions and varied warm/cool lit panes
```

Image Gen may be used for source/target material direction, but runtime maps must be concrete repo assets and runtime proof must still come from browser screenshots later. If Image Gen is used, store source/provenance notes and do not claim Image Gen output as runtime proof.

Run after Worker 3:

```bash
node scripts/verify-r3f-assets.mjs
```

Expected: verifier passes for texture dimensions, budgets, source/license/provenance, and Stage 4.1 realism metadata.

Stage 4.1 texture/decal evidence captured 2026-06-17:
- Regenerated all 7 runtime texture/decal files with project-authored deterministic `sharp` routines and recorded Image Gen as non-runtime material direction only in `apps/web/public/simulation/r3f/assets/textures/PROVENANCE.md`.
- Texture/decal manifest entries now include `realismStatus="stage4_1_ready"`, `visualRejectIfToyLike=true`, feature lists, dimensions, file sizes, and provenance.

- [x] **Step 5: Generate asset proof images from actual assets**

Create proof artifacts from the actual shipped files, not invented illustrations:

```text
artifacts/r3f-stage4.1-asset-realism-contact-sheet.png
artifacts/r3f-stage4.1-glb-turntable-contact-sheet.png
```

The proof images must show:

```text
all vehicle LOD families with actual rendered GLB thumbnails
all prop GLBs with actual rendered GLB thumbnails
all runtime texture/decal maps as thumbnails
file size and triangle count next to each GLB
texture dimensions and file sizes next to each map
verifier pass/fail result
explicit note: asset proof only, not Stage 5 browser-rendered scene proof
```

Reject proof images if:

```text
they use icon stand-ins instead of actual GLB renders
vehicles still read as toys, colored boxes, or blockout primitives
street furniture reads as generic icons
textures are blank, overly clean, or purely procedural-looking from normal viewing distance
labels overlap or are unreadable
```

Stage 4.1 proof evidence captured 2026-06-17:
- Created `artifacts/r3f-stage4.1-asset-realism-contact-sheet.png` from current shipped GLBs/textures: 3200x3040, 1,401,695 bytes.
- Created `artifacts/r3f-stage4.1-glb-turntable-contact-sheet.png` from current shipped GLBs: 3200x2288, 1,010,927 bytes.
- Proof images use deterministic software projection of parsed GLB triangle geometry and actual runtime texture/decal thumbnails. They include verifier status, labels, triangle/file-size or texture-dimension/file-size metadata, and the required asset-proof-only note.

- [x] **Step 6: Stage 4.1 visual review gate**

Primary agent and reviewers must inspect the proof artifacts before completion.

Pass criteria:

```text
vehicle near/medium assets read as plausible traffic assets, not toys
far LODs remain simplified but traffic-believable
signal heads, streetlights, curbs, and trees read as infrastructure, not icons
textures/decals look usable for realistic wet-road and worn-marking materials
asset scale feels compatible with Stage 3 long corridors
no placeholder/blockout/proxy/toy-like visual remains in the Stage 4.1 proof image
```

If any item fails, do not proceed to Stage 5. Return to the owning worker, fix the concrete asset issue, regenerate proof images, and repeat review.

Stage 4.1 review evidence captured 2026-06-17:
- Fresh spec-compliance reviewer approved after vehicle/prop fixes, technote update, plan evidence update, and proof regeneration.
- Fresh visual/code-quality reviewer approved after inspecting refreshed proof images and independently running `node scripts/verify-r3f-assets.mjs`.
- Primary visual inspection confirmed the regenerated proof images no longer show the earlier single-sphere tree, unreadable dark prop massing, or very low-detail blockout vehicle proof.

- [x] **Step 7: Documentation and validation**

Update `docs/technotes/r3f-photoreal-dashboard-renderer.md` with:

```text
Stage 4.1 source/license notes
which assets were upgraded
triangle/file-size budget deltas
texture/decal provenance changes
meshopt/decoder assumptions
proof artifact paths
explicit reminder that Stage 4.1 proof images are asset proof, while Stage 5/7 browser screenshots are runtime proof
```

Final Stage 4.1 verification:

```bash
node scripts/verify-r3f-assets.mjs
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
npm run build:web
git diff --check
```

Expected:

```text
asset verifier passes
DashboardShell test passes
web build passes
git diff check passes
spec-compliance reviewer approves
visual/code-quality reviewer approves
Stage 4.1 checkboxes are updated with evidence
```

Final Stage 4.1 validation captured 2026-06-17:
- `node scripts/verify-r3f-assets.mjs` passed with hardened Stage 4.1 checks and payload `9.62 MB / 25.00 MB`.
- `npm --workspace apps/web run test -- components/DashboardShell.test.tsx` passed: 1 test file, 49 tests.
- `npm run build:web` passed with Next.js production build.
- `git diff --check` passed; Git printed LF-to-CRLF working-copy warnings only.
- Spec-compliance reviewer verdict: `APPROVED`.
- Visual/code-quality reviewer verdict: `APPROVED`.

Blocked-stop condition:

```text
If realistic assets require external licensed models, paid asset stores, Blender/DCC tooling not available in the environment, Image Gen API credentials, or dependency installation, stop with exact commands run, files inspected, partial assets completed, and the smallest user approval/input needed.
```

## Stage 5: Photoreal Material, Lighting, And Camera Pass

**Files:**
- Create: `apps/web/components/r3f/LightingRig.tsx`
- Create: `apps/web/components/r3f/WeatherAndAtmosphere.tsx`
- Modify: `apps/web/components/r3f/roadMaterials.ts`
- Modify: `apps/web/components/r3f/SimulationScene.tsx`
- Modify: `apps/web/components/r3f/SimulationCanvas.tsx`
- Modify: `scripts/verify-r3f-dashboard.mjs`

- [x] **Step 1: PBR road materials**

Use layered PBR materials, not flat color fills, for:

```text
wet asphalt base with albedo, roughness, normal detail, and puddle/reflection variation
worn lane markings with decal breakup and dirt masks
crosswalk paint with edge wear and nonuniform opacity
concrete curb with grime darkening at road contact edges
sidewalk slabs with joint lines, color variation, and roughness variation
glass facade surfaces with restrained emissive/window response
```

- [x] **Step 2: Lighting setup**

Add:

```text
cool ambient sky fill
warm streetlight pools
vehicle headlight/tail-light emissive accents
signal emissive lenses
contact shadows under vehicles
subtle fog/haze
wet-road reflection highlights tied to lamps, signals, and headlights
```

- [x] **Step 3: Restrained postprocessing**

Use postprocessing only after the base scene is acceptable:

```text
SMAA or FXAA if needed
ambient occlusion if frame budget allows
very restrained bloom for lamps and signals
tone mapping and exposure tuned against r3f-photoreal-target-reference.png
visual review tuned primarily against r3f-long-corridor-traffic-reference.png
```

- [x] **Step 4: Reject non-photoreal placeholders**

Before moving to performance tuning, inspect a desktop screenshot and reject the pass if any of these are true:

```text
roads read as flat gray planes
vehicles read as colored boxes or toy cars
traffic lights are unlit geometry instead of emissive signals
streetlights do not create warm pools/reflections
lane markings are perfectly clean or purely procedural-looking
the scene lacks contact shadows under vehicles and street furniture
```

- [x] **Step 5: Performance guardrails**

Initial budgets:

```text
desktop target: stable 45-60 fps
mobile target: nonblank, usable, no layout overflow
draw calls: under 250 in default scene
loaded GLB + texture payload: under 25 MB for first pass
visible traffic target: at least 80 rendered vehicles in fixture density mode, using instancing/LOD
no unbounded React state updates in useFrame
```

- [x] **Step 6: Verification**

Run `scripts/verify-r3f-dashboard.mjs` to assert:

```text
canvas has non-background pixels
renderer.info draw call budget is reported
viewport screenshot exists at desktop and mobile
console has no WebGL context-loss errors
fallback path still renders when WebGL is forced off
photorealism checklist passes against the real screenshot
desktop screenshot visually matches the long-corridor reference direction: wet PBR roads, dense traffic, realistic lights, city depth
```

Then run:

```bash
npm --workspace apps/web run test
npm run build:web
```

**Stage 5 completion evidence, 2026-06-17:**

- `node scripts\verify-r3f-dashboard.mjs` passed against `/dashboard` with `rendererMode=r3f_photoreal_stage5`, `visibleVehicleCount=96`, `glbVehicleCount=2`, `vehicleSilhouettePartCount=14`, `streetFurnitureShadowCount=2`, `drawCalls=176/250`, payload `9.62 MB / 25.00 MB`, no console failures, no WebGL context loss, and WebGL-off fallback proof.
- The real browser canvas proof passed both verifier visual gates: `photorealism_check.passed=true` and `composition_check.passed=true`. The desktop canvas metrics included `bright_ratio=0.011425`, `marking_ratio=0.035709`, `luminance_stddev=34.29`, `scene_coverage_ratio=0.9477`, and `empty_near_black_ratio=0.0512`.
- Generated proof artifacts: `artifacts/r3f-dashboard-desktop.png`, `artifacts/r3f-dashboard-mobile.png`, `artifacts/r3f-dashboard-desktop-canvas.png`, `artifacts/r3f-dashboard-mobile-canvas.png`, `artifacts/r3f-dashboard-webgl-off.png`, and `artifacts/r3f-dashboard-details.json`.
- `npm --workspace apps/web run test` passed 6 files / 73 tests, `npm run build:web` passed, `node scripts\verify-r3f-assets.mjs` passed at `9.62 MB / 25.00 MB`, and `git diff --check` exited 0 with LF/CRLF warnings only.
- Fresh spec-compliance, human-visual, and code-quality review is required before claiming Stage 5 complete.
- Scope note: Stage 5 proof is browser-rendered R3F runtime proof only. It does not complete Stage 6 live SUMO/Tarcl binding.

## Stage 6: Live SUMO/Tarcl Snapshot Binding

**Files:**
- Modify: `apps/api/app/services/simulation_snapshot.py`
- Modify: `apps/api/app/adapters/simulation.py`
- Modify: `apps/api/app/api/routes.py`
- Modify: `apps/api/app/services/runtime_readiness.py`
- Modify: `apps/api/tests/test_simulation_snapshot.py`
- Modify: `apps/web/components/r3f/useSimulationFrameStore.ts`
- Modify: `apps/web/components/r3f/VehicleInstances.tsx`
- Modify: `docs/runtime-setup.md`

- [ ] **Step 1: Add live source adapter**

Add a backend adapter that can read live snapshot/trace data from SUMO/TraCI/Tarcl when configured.

Required output remains `SimulationFrameSnapshot`.

- [ ] **Step 2: Preserve fixture fallback**

If live source is not configured, return fixture snapshots with explicit source:

```text
simulation_snapshot_fixture
```

Never label fixture output as `sumo_traci` or `tarcl`.

- [ ] **Step 3: Frontend interpolation**

Render live frames through an external frame store:

```text
React state stores snapshot metadata only.
useFrame updates instanced meshes from refs.
Vehicle positions interpolate between backend frames.
No broad dashboard rerender per animation frame.
```

- [ ] **Step 4: Add live readiness**

Extend readiness with a renderer section only if it checks local requirements without lying about backend state:

```text
r3f assets available
simulation frame endpoint available
live SUMO/Tarcl frame source ready or fixture mode
```

- [ ] **Step 5: Verification**

Run:

```bash
npm run runtime:readiness:strict -- --section simulation
npm run test:api -- test_simulation_snapshot.py
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
npm run build:web
```

Live completion requires an HTTP response whose `source` is the real live source, not the fixture source.

## Stage 7: Dashboard Integration, QA, And Completion Gate

**Files:**
- Modify: `apps/web/components/DigitalTwin.tsx`
- Modify: `apps/web/components/SimulationViewport.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/components/DashboardShell.test.tsx`
- Modify: `README.md`
- Modify: `docs/launch-runbook.md`

- [ ] **Step 1: Keep controls in DOM**

Keep these outside the canvas:

```text
run simulation button
SUMO telemetry
readiness badge
scenario selector
safety banner
event/recommendation/report panels
```

- [ ] **Step 2: Make the canvas the dominant center surface**

Update CSS so the R3F canvas fills the existing spatial command surface without nested cards or clipped overlay text.

- [ ] **Step 3: Add browser QA artifacts**

Capture:

```text
artifacts/r3f-dashboard-desktop.png
artifacts/r3f-dashboard-mobile.png
artifacts/r3f-dashboard-details.json
```

The details JSON must include:

```json
{
  "route": "/dashboard",
  "renderer": "r3f",
  "snapshot_source": "simulation_snapshot_fixture or live source",
  "canvas_nonblank": true,
  "long_corridors_visible": true,
  "visible_vehicle_count": 80,
  "photorealism_check": {
    "pbr_wet_asphalt": true,
    "worn_markings": true,
    "vehicle_contact_shadows": true,
    "realistic_signal_and_street_lighting": true,
    "placeholder_geometry_visible": false
  },
  "console_errors": [],
  "mobile_horizontal_overflow": false
}
```

- [ ] **Step 4: Final validation**

Run:

```bash
npm run test:api
npm --workspace apps/web run test
npm run build:web
node scripts/verify-r3f-assets.mjs
node scripts/verify-r3f-dashboard.mjs
git diff --check
```

Expected: all commands pass.

- [ ] **Step 5: Completion standard**

The task is not complete until:

```text
R3F renders inside /dashboard.
Existing iframe stream fallback still works.
Existing CSS/canvas fallback still works.
SUMO/Tarcl truth boundary is explicit.
Photoreal target reference is cited but not treated as runtime proof.
The actual browser-rendered R3F screenshot passes the photorealism checklist: PBR wet asphalt, worn markings, realistic vehicle materials, signal/streetlight glow, contact shadows, depth haze, and no visible placeholder/blockout geometry.
Browser screenshots prove the actual R3F surface is nonblank and professionally framed.
Browser screenshots show long roads from each side with materially more traffic than the current compact viewport.
No UI copy implies real signal control or live CCTV.
```

## Suggested Execution Order

1. Stage 0: docs and direction.
2. Stage 1: dependency install and R3F island.
3. Stage 2: snapshot contract.
4. Stage 3: procedural intersection.
5. Stage 4: GLB/Image Gen asset kit.
6. Stage 4.1: asset realism upgrade.
7. Stage 5: photoreal pass.
8. Stage 6: live SUMO/Tarcl binding.
9. Stage 7: full dashboard QA.

## Implementation Notes

- Keep `SimulationComparison` for metrics; add `SimulationFrameSnapshot` for renderer state.
- Use GLB for reusable props and vehicles; use procedural mesh/geometry for roads, markings, sidewalks, curbs, queue zones, and generated city blocks.
- Use instancing for repeated cars, lane markings, trees, bollards, and streetlights.
- Use Image Gen for target references and texture/decal sources, not as a substitute for browser-rendered proof.
- Photorealism beats feature breadth: do one city/intersection with convincing PBR materials, lighting, shadows, long roads, and dense traffic before expanding to multi-city variants.
- Start with one city/intersection in Stage 3. Multi-city variation belongs after one scene is visually and technically stable.
- Treat `Tarcl` as a future backend source name unless the implementation owner confirms it means plain TraCI.

## Self-Review

- Spec coverage: covers repo evidence, active dashboard seam, backend truth boundary, R3F runtime, Image Gen reference, GLB/procedural hybrid assets, photoreal pass, live SUMO/Tarcl binding, and browser proof gates.
- Placeholder scan: no implementation step depends on undefined files without a concrete target path and contract.
- Type consistency: frontend `SimulationFrameSnapshot` mirrors backend `SimulationFrameSnapshot`; aggregate `SimulationComparison` remains separate.
- Scope check: this is one renderer migration path, not a Vite migration, Unreal restoration, backend control rewrite, or live OpenAI task.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-16-r3f-photoreal-dashboard-simulation.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per stage, review between stages, fastest for broad renderer work.
2. **Inline Execution** - execute stages in this session using `superpowers:executing-plans`, with checkpoints after each stage.

Ask before dependency installs, external downloads, commits, pushes, deployments, or paid/commercial asset use.
