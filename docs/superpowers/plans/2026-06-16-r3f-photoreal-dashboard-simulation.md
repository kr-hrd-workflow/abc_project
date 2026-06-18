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

Stage 6D reconciliation note, 2026-06-18: Stage 0 through Stage 3 checkboxes are aligned to the current evidence table below. This is a documentation status sync only; it does not change runtime behavior or mark Stage 6E, Stage 6F, or final Stage 6 readiness complete.

- [x] **Step 1: Record the renderer decision**

Write a short technote stating:

```text
R3F is the active dashboard renderer path.
Unreal/Pixel Streaming remains archived.
SUMO/TraCI/Tarcl is simulation truth.
The browser renderer can interpolate received state but cannot invent traffic truth.
Image Gen references are visual targets, not runtime evidence.
```

- [x] **Step 2: Update setup docs**

Add a dashboard renderer section to `README.md` and `docs/launch-runbook.md`:

```text
Default renderer: internal R3F digital twin when enabled and WebGL is available.
External renderer: NEXT_PUBLIC_SIMULATION_STREAM_URL iframe, still highest priority.
Fallback renderer: existing CSS/canvas virtual CCTV when R3F is disabled or WebGL fails.
```

- [x] **Step 3: Verification**

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

- [x] **Step 1: Add dependencies after approval**

Run only after user approval:

```bash
npm --workspace apps/web install three @react-three/fiber @react-three/drei @react-three/postprocessing
npm --workspace apps/web install -D @types/three @gltf-transform/cli
```

Expected: `apps/web/package.json` and `package-lock.json` update.

- [x] **Step 2: Extract the current fallback**

Move the current DOM/CSS/canvas implementation from `SimulationViewport.tsx` into `SimulationViewportFallback.tsx` without changing visible copy or tests.

- [x] **Step 3: Add browser-only R3F island**

Use `next/dynamic` with `ssr: false` so the Canvas never renders on the server:

```tsx
const R3FSimulationViewport = dynamic(
  () => import("./r3f/R3FSimulationViewport").then((mod) => mod.R3FSimulationViewport),
  { ssr: false }
);
```

- [x] **Step 4: Keep stream precedence**

Renderer selection order:

```text
1. NEXT_PUBLIC_SIMULATION_STREAM_URL iframe
2. NEXT_PUBLIC_UNITY_WEBGL_URL legacy iframe
3. R3F renderer when enabled and WebGL supported
4. SimulationViewportFallback
```

- [x] **Step 5: Add tests**

Add tests that assert:

```text
NEXT_PUBLIC_SIMULATION_STREAM_URL still mounts iframe before R3F.
Legacy Unity alias still mounts only when generic stream URL is absent.
Fallback copy remains visible when R3F is disabled.
The safety boundary remains visible.
```

- [x] **Step 6: Verification**

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

- [x] **Step 1: Define backend snapshot schema**

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

- [x] **Step 2: Add fixture snapshot service**

Map existing scenario data to deterministic snapshot frames:

```text
emergency: queues, long approach density segments, and one east emergency vehicle.
pedestrian: queues plus pedestrian pressure markers.
normal: light vehicle count and green current phase.
blocked: all-red or blocked marker plus high queue density on long approaches.
```

This is a temporary fixture renderer contract and must return `source = "simulation_snapshot_fixture"`.

- [x] **Step 3: Add route**

Add:

```text
GET /api/simulation/frame?scenario_id=emergency
```

Keep `/api/simulate-signal` unchanged for aggregate comparison.

- [x] **Step 4: Add frontend type and client**

Create `apps/web/lib/simulationSnapshot.ts` with TypeScript types matching the Pydantic shape and add:

```ts
export async function getSimulationFrame(scenarioId?: ScenarioId): Promise<SimulationFrameSnapshot>
```

- [x] **Step 5: Add tests that prevent invented trajectories**

Tests must assert:

```text
R3F receives vehicles only from SimulationFrameSnapshot.
Aggregate SimulationComparison alone does not produce precise vehicle instances.
Long-road traffic fill must come from density_segments or explicit fixture mode, not from unlabeled frontend guesses.
The dashboard can still render aggregate SUMO telemetry without a frame endpoint.
```

- [x] **Step 6: Verification**

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

- [x] **Step 1: Build the base road from data, not images**

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

- [x] **Step 2: Make the roads visibly longer than the intersection**

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

- [x] **Step 3: Add traffic density as a renderer layer**

`TrafficDensityLayer.tsx` must show queue volume without inventing live truth:

```text
fixture mode: derive queue density from existing QueueMetrics and label source as fixture
snapshot mode: render only vehicles supplied by SimulationFrameSnapshot
far corridor fill: use visibly lower-detail instanced vehicles only when source is fixture or when backend marks vehicles as aggregate_density proxies
```

No dense traffic layer may be labeled `sumo_traci` unless backend data supplies the vehicle or aggregate-density proxy.

- [x] **Step 4: Use stable units**

Set the scene contract:

```text
1 Three.js unit = 1 meter.
Intersection center = [0, 0, 0].
Road plane uses X/Z.
Y is height.
North is negative Z.
```

- [x] **Step 5: Add operator-readable camera**

Use an oblique camera that keeps long approaches visible:

```text
position: [72, 62, 88]
target: [0, 0, 0]
fov: 38
near/far: 0.1 / 500
```

- [x] **Step 6: Add first scene test hooks**

Expose stable data attributes outside the canvas:

```text
data-r3f-simulation-ready
data-r3f-snapshot-source
data-r3f-renderer-mode
data-r3f-corridor-length-meters
data-r3f-traffic-density-mode
```

- [x] **Step 7: Verification**

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
- Stage 5 proof is browser-rendered R3F runtime proof only. It does not complete Stage 6 live SUMO/Tarcl binding.

## 2026-06-18 Audit-Driven Roadmap Update

Source: `C:\Users\100ri\Downloads\deep-research-report.md`, read 2026-06-18.

Decision: do not execute only the highest-priority audit findings. The next plan covers every explicit improvement in the report: truth wiring, signal overlays, verification gates, workflow-as-code, documentation drift, asset runtime utilization, asset compression, fallback artifact retention, telemetry, security/audit gates, asset licensing, generated-output hygiene, and release/tag discipline.

Current state summary:

```text
Stages 1-5 are implemented/proven as the R3F dashboard renderer path.
Stage 2 /api/simulation/frame and getSimulationFrame() exist.
R3FSimulationViewport prefers buildSceneSnapshot(simulationFrame) and labels fixture fallback.
Signal snapshots render through SignalHardware and SimulationOverlays, or explicit unavailable state.
verify-r3f-assets.mjs and verify-r3f-dashboard.mjs are included in npm run verify.
.github/workflows/r3f-dashboard-verify.yml is present and runs R3F asset/dashboard proof.
README.md, docs/launch-runbook.md, the R3F technote, and this plan are reconciled in Stage 6D.
```

Stage 6 started as report-driven stabilization, not as new visual expansion. Stages 6A through 6D cover truth wiring, signal overlays, verification gates, and documentation reconciliation. Stages 6E and 6F remain required follow-up work from the same audit, not optional polish; final Stage 6 readiness is not complete until those gates pass.

### R3F Stage Status As Of Stage 6D

| Stage | Status | Evidence and boundary |
|---|---|---|
| Stage 1 R3F island | implemented, verified | Browser-only R3F island is the internal renderer when enabled and WebGL is available. |
| Stage 2 frame contract | implemented, verified, not live truth | `/api/simulation/frame`, `getSimulationFrame()`, and `SimulationFrameSnapshot` exist. |
| Stage 3 geometry and density | implemented, verified, not live truth | Procedural roads and density rendering exist; aggregate or fixture data remains labeled. |
| Stage 4/4.1 assets and materials | implemented, verified, gated | Asset manifest, shipped GLBs/textures, proof images, and `verify:r3f-assets` enforce the asset bar. |
| Stage 5 browser proof | implemented, verified, gated, not live truth | Browser screenshots and verifier artifacts prove R3F rendering, not live SUMO/Tarcl binding. |
| Stage 6A frame wiring | implemented, verified, not live truth | R3F prefers `SimulationFrameSnapshot` and labels frame-backed versus fixture fallback state. |
| Stage 6B dynamic signals | implemented, verified, not live truth | Signal hardware and source badges render received signal state or explicit `unavailable`. |
| Stage 6C default gates | implemented, verified, gated | Root `npm run verify` and `.github/workflows/r3f-dashboard-verify.yml` include R3F asset and dashboard proof. |
| Stage 6D docs reconciliation | implemented, verified | README, runbook, technote, and this plan use implemented/verified/gated wording without production-ready claims. |

### Audit Coverage Matrix

| Audit item | Plan coverage |
|---|---|
| Simulation frame connected to viewport | Stage 6A |
| Dynamic signal overlay / signal hardware | Stage 6B |
| `verify-r3f-dashboard` / `verify-r3f-assets` in default verify and CI | Stage 6C |
| Workflow-as-code restored or published | Stage 6C |
| README / technote / plan state sync | Stage 6D |
| Asset runtime utilization expanded | Stage 6E |
| Asset size / compression pipeline | Stage 6E |
| Fallback artifact and details JSON archived | Stage 6C and Stage 6F |
| Client telemetry / WebGL error monitoring | Stage 6F |
| Dependency / security audit gate | Stage 6F |
| Third-party asset licensing manifest | Stage 6E |
| `test-results` / generated artifact hygiene | Stage 6F |
| Release / tag discipline | Stage 6F |

## Stage 6A: Wire Simulation Frame Into R3F Viewport

**Goal:** Make the existing `/api/simulation/frame` contract the preferred R3F render source while preserving explicit fixture fallback.

**Files:**
- Modify: `apps/web/components/DashboardRoute.tsx`
- Modify: `apps/web/components/DashboardShell.tsx`
- Modify: `apps/web/components/DigitalTwin.tsx`
- Modify: `apps/web/components/SimulationViewport.tsx`
- Modify: `apps/web/components/SimulationViewportFallback.tsx`
- Modify: `apps/web/components/r3f/R3FSimulationViewport.tsx`
- Modify: `apps/web/components/r3f/buildSceneSnapshot.ts`
- Modify: `apps/web/components/DashboardShell.test.tsx`
- Modify: `scripts/verify-r3f-dashboard.mjs`

- [x] **Step 1: Load the frame with the rest of dashboard data**

In `DashboardRoute.tsx`, import `getSimulationFrame` and `SimulationFrameSnapshot`. Extend `DashboardData`:

```ts
simulationFrame: SimulationFrameSnapshot | null;
```

In `loadDashboard(scenarioId)`, request `getSimulationFrame(scenarioId)` in the same scenario load path as status, events, simulation, and readiness. If the frame endpoint returns a route-missing error, store `simulationFrame: null` and keep the dashboard on the existing fallback path. Do not swallow non-route errors silently.

- [x] **Step 2: Pass the frame through the DOM shell**

Add `simulationFrame` to `DashboardShellProps`, pass it to `DigitalTwin`, pass it to `SimulationViewport`, and add it to `SimulationViewportProps` in `SimulationViewportFallback.tsx`:

```ts
simulationFrame?: SimulationFrameSnapshot | null;
```

The fallback renderer does not need to draw from the frame, but it must be able to receive the prop without changing existing fallback behavior.

- [x] **Step 3: Prefer `buildSceneSnapshot(frame)` in R3F**

In `R3FSimulationViewport.tsx`, replace fixture-first rendering with frame-first rendering:

```ts
const frameSceneSnapshot = useMemo(
  () => buildSceneSnapshot(simulationFrame),
  [simulationFrame]
);
const fallbackSceneSnapshot = useMemo(
  () => buildFixtureSceneSnapshot({ queues: status.queues, events }),
  [events, status.queues]
);
const sceneSnapshot =
  frameSceneSnapshot.source !== null ? frameSceneSnapshot : fallbackSceneSnapshot;
```

Keep `data-r3f-snapshot-source`, `data-r3f-traffic-density-mode`, `data-r3f-visible-vehicle-count`, and the safety copy visible. Add `data-r3f-frame-bound="true"` only when the selected scene came from `SimulationFrameSnapshot`.

- [x] **Step 4: Preserve truth boundaries in conversion**

Update `buildSceneSnapshot.ts` tests or assertions so:

```text
SimulationFrameSnapshot.vehicles -> precise vehicle instances.
SimulationFrameSnapshot.density_segments -> density fill.
SimulationComparison alone -> no precise vehicles.
Missing frame -> explicit fixture fallback only.
```

Do not create frontend vehicle trajectories from aggregate queue metrics unless the mode is labeled `fixture_queues`.

- [x] **Step 5: Expand tests**

In `DashboardShell.test.tsx`, mock `/api/simulation/frame` and assert:

```text
R3F viewport uses data-r3f-snapshot-source="simulation_snapshot_fixture" when the frame exists.
R3F viewport exposes data-r3f-frame-bound="true" for frame-backed render state.
The existing hosted stream iframe still wins over R3F.
The existing WebGL-off fallback still renders.
The safety boundary remains visible.
```

- [x] **Step 6: Browser proof**

Update `scripts/verify-r3f-dashboard.mjs` so `artifacts/r3f-dashboard-details.json` records:

```json
{
  "snapshot_source": "simulation_snapshot_fixture",
  "frame_bound": true,
  "traffic_density_mode": "density_segments",
  "fallback_used": false
}
```

The verifier must fail if R3F is ready but the details JSON cannot distinguish frame-backed rendering from fixture fallback.

- [x] **Step 7: Verification**

Run:

```bash
npm --workspace apps/web run test -- components/DashboardShell.test.tsx components/r3f/SimulationCanvas.test.tsx
npm run build:web
node scripts/verify-r3f-dashboard.mjs
git diff --check
```

Expected:

```text
Dashboard tests pass.
Web build passes.
Dashboard verifier writes desktop, mobile, webgl-off, canvas, and details artifacts.
details JSON proves frame-backed R3F when /api/simulation/frame is available.
git diff check passes.
```

Stage 6A evidence captured 2026-06-18:
- `DashboardRoute.tsx` loads `getSimulationFrame()` with the dashboard data and preserves route-missing fallback.
- `R3FSimulationViewport.tsx` prefers `buildSceneSnapshot(simulationFrame)` and exposes `data-r3f-frame-bound="true"` only for frame-backed rendering.
- `scripts/verify-r3f-dashboard.mjs` asserts `snapshot_source="simulation_snapshot_fixture"`, `frame_bound=true`, `traffic_density_mode="density_segments"`, and `fallback_used=false`.

## Stage 6B: Dynamic Signal Hardware And Operator Overlays

**Goal:** Render signal state and operator-visible source badges from `SceneSnapshot`, not hardcoded visual copy.

**Files:**
- Create: `apps/web/components/r3f/SignalHardware.tsx`
- Create: `apps/web/components/r3f/SimulationOverlays.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.tsx`
- Modify: `apps/web/components/r3f/R3FSimulationViewport.tsx`
- Modify: `apps/web/components/r3f/buildSceneSnapshot.ts`
- Modify: `apps/web/components/DashboardShell.test.tsx`
- Modify: `scripts/verify-r3f-dashboard.mjs`
- Modify: `apps/web/app/globals.css`

- [x] **Step 1: Add signal geometry**

Create `SignalHardware.tsx` that accepts:

```ts
type SignalHardwareProps = {
  signals: SceneSnapshot["signals"];
};
```

Render one signal head per direction when a signal exists. Use `red`, `yellow`, and `green` states from `SimulationSignalSnapshot.state`. If `signals` is empty, render no active light and expose `data-r3f-signal-state="unavailable"` from the parent viewport.

- [x] **Step 2: Mount signal hardware in the scene**

In `SimulationScene.tsx`, mount:

```tsx
<SignalHardware signals={sceneSnapshot.signals} />
```

Place it after roadway geometry and before traffic density so signal lights are visually available without owning vehicle rendering.

- [x] **Step 3: Add operator source overlays outside the canvas**

Create `SimulationOverlays.tsx` for DOM overlays inside the viewport container. It must show:

```text
simulation source
snapshot source
traffic density mode
scenario id when present
queue source: frame, density segment, or fixture fallback
```

Do not place the safety copy inside the canvas. Keep `Simulation only / No real signal control` in the dashboard DOM.

- [x] **Step 4: Add verifier and test coverage**

Update tests and verifier assertions for:

```text
signal state badge exists when frame.signals exists.
east green / north red test fixture is visible in DOM data attributes.
empty signals produce unavailable state instead of fake lights.
source badges do not overlap the safety copy on desktop or mobile screenshots.
```

- [x] **Step 5: Verification**

Run:

```bash
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
npm run build:web
node scripts/verify-r3f-dashboard.mjs
git diff --check
```

Expected: tests, build, dashboard verifier, and diff check pass with signal-state evidence in `artifacts/r3f-dashboard-details.json`.

Stage 6B evidence captured 2026-06-18:
- `SignalHardware.tsx` renders signal heads from `SceneSnapshot.signals`.
- `SimulationScene.tsx` mounts `SignalHardware` before `TrafficDensityLayer`.
- `SimulationOverlays.tsx` exposes source badges, and the viewport labels signal state with `data-r3f-signal-state`.
- `scripts/verify-r3f-dashboard.mjs` asserts `east:green`, `north:red`, scenario ID, and frame queue source in DOM/source badges.

## Stage 6C: Promote R3F Verification To Default Gates

**Goal:** Make existing R3F proof scripts part of normal local verification and restore auditable workflow-as-code.

**Files:**
- Modify: `package.json`
- Create: `.github/workflows/r3f-dashboard-verify.yml`
- Modify: `scripts/verify-r3f-dashboard.mjs`
- Modify: `scripts/verify-r3f-assets.mjs`
- Modify: `README.md`
- Modify: `docs/launch-runbook.md`

- [x] **Step 1: Add root scripts**

Update root `package.json` scripts:

```json
{
  "verify:r3f-assets": "node scripts/verify-r3f-assets.mjs",
  "verify:r3f-dashboard": "node scripts/verify-r3f-dashboard.mjs",
  "verify": "npm run test:api && npm run test:web && npm run build:web && npm run verify:r3f-assets && npm run verify:r3f-dashboard && git diff --check"
}
```

- [x] **Step 2: Require full proof artifacts**

Keep `verify-r3f-dashboard.mjs` writing:

```text
artifacts/r3f-dashboard-desktop.png
artifacts/r3f-dashboard-mobile.png
artifacts/r3f-dashboard-desktop-canvas.png
artifacts/r3f-dashboard-mobile-canvas.png
artifacts/r3f-dashboard-webgl-off.png
artifacts/r3f-dashboard-details.json
```

Fail the verifier when any path in `details.artifacts` is missing after a successful run.

- [x] **Step 3: Add workflow-as-code**

Create `.github/workflows/r3f-dashboard-verify.yml` with a normal push and pull request workflow that runs:

```bash
npm ci
npm run test:api
npm run test:web
npm run build:web
npm run verify:r3f-assets
npm run verify:r3f-dashboard
```

If CodeQL is already configured outside the visible tree, do not claim it is required by this workflow. Add a note that branch protection or GitHub required-check configuration is an external repository setting and needs explicit user approval before changing.

- [x] **Step 4: Document local verification**

Update README and launch runbook so `npm run verify` is the normal local quality gate and explicitly includes R3F asset and dashboard proof.

- [x] **Step 5: Verification**

Run:

```bash
npm run verify:r3f-assets
npm run verify:r3f-dashboard
npm run verify
git diff --check
```

Expected: all commands pass and `npm run verify` covers test, build, asset proof, dashboard browser proof, and diff checks.

Stage 6C evidence captured 2026-06-18:
- Root `package.json` defines `verify:r3f-assets`, `verify:r3f-dashboard`, and `verify` with both R3F proof scripts after tests/build.
- `.github/workflows/r3f-dashboard-verify.yml` runs API tests, web tests, web build, `verify:r3f-assets`, and `verify:r3f-dashboard` on `push` and `pull_request`.
- README and launch runbook document `npm run verify` as the normal local quality gate without claiming branch protection or CodeQL settings were changed.

## Stage 6D: Reconcile README, Runbook, Technote, And Plan State

**Goal:** Reconcile the former Stage 0-era renderer status wording, while avoiding a false production-ready claim.

**Files:**
- Modify: `README.md`
- Modify: `docs/launch-runbook.md`
- Modify: `docs/technotes/r3f-photoreal-dashboard-renderer.md`
- Modify: `docs/superpowers/plans/2026-06-16-r3f-photoreal-dashboard-simulation.md`

- [x] **Step 1: Add status vocabulary**

Use these terms consistently:

```text
implemented: code exists and is wired locally
verified: fresh local tests/build/browser proof passed
gated: included in npm run verify and auditable CI workflow-as-code
not live truth: fixture or aggregate fallback is still in use
```

- [x] **Step 2: Fix current renderer status copy**

Replace Stage 0-only wording with:

```text
R3F runtime is implemented through Stage 5 browser visual proof.
Stage 6A frame wiring, Stage 6B dynamic signal visualization, Stage 6C default verification gates, and Stage 6D documentation reconciliation are implemented in the repo.
SUMO/TraCI/Tarcl remains simulation truth. Browser rendering may interpolate received state, but it cannot invent traffic truth.
```

- [x] **Step 3: Add committed evidence summary**

Add a short status table that separates:

```text
Stage 1 R3F island: implemented
Stage 2 frame contract: implemented and consumed by Stage 6A viewport wiring; not live truth
Stage 3 geometry and density: implemented with labeled density/fixture boundaries
Stage 4 and 4.1 assets/materials: implemented, asset-verified, and gated
Stage 5 browser proof: implemented, verified, and gated; not live SUMO/Tarcl binding
Stage 6A frame wiring: implemented and verified; not live truth
Stage 6B dynamic signal visualization: implemented and verified; not real signal control
Stage 6C default verification gates: implemented, verified, and gated
Stage 6D docs reconciliation: implemented and verified
```

- [x] **Step 4: Verification**

Run:

```bash
git diff --check
rg -n "does not mean the R3F runtime is already implemented|runtime is not already implemented|not already implemented or enabled" README.md docs/launch-runbook.md docs/technotes/r3f-photoreal-dashboard-renderer.md
npm run verify:r3f-assets
npm run verify:r3f-dashboard
```

Expected: `git diff --check` passes, the `rg` command returns no stale Stage 0-only wording, and the R3F asset/dashboard proof commands pass.

Stage 6D evidence captured 2026-06-18:
- README, launch runbook, R3F technote, and this plan use implemented/verified/gated/not-live-truth vocabulary.
- Historical Stage 0 through Stage 3 checklist boxes are aligned with the Stage 6D status table, removing the older open-checkbox contradiction.
- Stage 6E, Stage 6F, and final Stage 6 readiness remain follow-up work.

## Stage 6E: Asset Runtime Utilization, Compression, And Licensing

**Goal:** Use more of the existing manifest-backed asset kit in the runtime scene, harden the human-view visual baseline beyond the current blockout-like canvas, optimize payloads, and consolidate asset licensing evidence.

**Files:**
- Modify: `apps/web/components/r3f/Stage5SceneAssets.tsx`
- Modify: `apps/web/components/r3f/TrafficDensityLayer.tsx`
- Modify: `apps/web/components/r3f/assetManifest.ts`
- Modify: `apps/web/public/simulation/r3f/assets/manifest.json`
- Modify: `scripts/verify-r3f-assets.mjs`
- Create: `scripts/optimize-r3f-assets.mjs`
- Create: `docs/compliance/r3f-asset-licenses.md`
- Modify: `docs/technotes/r3f-photoreal-dashboard-renderer.md`

- [x] **Step 1: Expand runtime asset use**

Load manifest assets by explicit IDs, not by scanning arbitrary public paths. The first pass should render at least:

```text
one bus asset
one emergency vehicle asset
one non-emergency car/taxi/truck family when present in the manifest
one streetlight prop
one additional prop family when present in the manifest
all existing facade/window material panels
```

If an asset family is not present in `manifest.json`, record that absence in the implementation notes instead of inventing a placeholder.

- [x] **Step 1A: Harden runtime visual proof against the Stage 5 baseline**

Use the committed Stage 5 browser canvas artifacts as the before baseline, then improve the runtime scene so the accepted Stage 6E canvas no longer reads as a flat blockout to a human reviewer. The pass must visibly reduce:

```text
flat untextured building slabs
flat road/sidewalk surfaces without believable wet PBR response
toy-like repeated traffic silhouettes in foreground or operator-relevant lanes
empty city-depth areas that make the intersection feel like a model set
```

Prefer manifest-backed GLB assets, existing texture/decal assets, material tuning, lighting/weather tuning, and richer facade/window panels already in the repo. Do not invent traffic truth or add fake precise vehicles; density still comes from `SimulationFrameSnapshot.density_segments` or labeled fixture fallback. Runtime proof must come from fresh browser screenshots, not Image Gen reference images or metadata alone.

The Stage 6E verifier/review gate must compare current screenshots against the Stage 5 baseline and fail if the runtime canvas is not materially more realistic to a human reviewer, even when numeric photorealism metrics pass.

- [x] **Step 2: Add manifest-driven preload and tiering**

Add a small helper in `Stage5SceneAssets.tsx` that groups entries by:

```text
kind
lod
densityEligible
maxFileSizeBytes
```

Use far LODs for repeated traffic density and medium/near assets only for foreground or operator-relevant vehicles. Do not exceed the existing 25 MB first-pass payload budget.

- [x] **Step 3: Add asset optimization script**

Create `scripts/optimize-r3f-assets.mjs` that can run in `--check` mode without rewriting files. It must:

```text
read manifest.json
check every GLB referenced by the manifest exists
report raw file size by asset ID
report whether an optimized output exists when an optimized path is declared
fail if total first-pass payload exceeds 25 MB
print the exact glTF Transform command needed for each unoptimized GLB
```

Use the existing workspace dev dependency:

```bash
npm --workspace apps/web exec gltf-transform -- --version
```

If meshopt, Draco, KTX2, or texture encoder tooling is missing at execution time, stop and ask for approval before installing or downloading anything.

- [x] **Step 4: Consolidate asset licensing**

Create `docs/compliance/r3f-asset-licenses.md` from the manifest and texture provenance. It must list:

```text
asset ID
runtime path
kind
source
license
provenance or source note
whether it is project-authored, generated, or third-party
```

Update `verify-r3f-assets.mjs` to fail if a manifest entry lacks source, license, provenance/source note, or points to an undocumented third-party asset.

- [x] **Step 5: Verification**

Run:

```bash
npm --workspace apps/web exec gltf-transform -- --version
node scripts/optimize-r3f-assets.mjs --check
node scripts/verify-r3f-assets.mjs
node scripts/verify-r3f-dashboard.mjs
npm run build:web
git diff --check
```

Expected: optimization check, asset verifier, dashboard browser proof, web build, and diff check pass without external downloads. Desktop/mobile canvas artifacts show materially improved runtime realism versus the committed Stage 5 baseline, not merely denser traffic or passing metadata.

**Stage 6E completion evidence, 2026-06-18:**

- Runtime asset use expanded by explicit manifest IDs in `Stage5SceneAssets.tsx` and `TrafficDensityLayer.tsx`: bus, emergency ambulance, passenger car, taxi, truck, streetlight, tree cluster, curb details, facade/window panels, and far-LOD density families render through draw-call-bounded GLB-derived instanced silhouettes. Final polish added per-instance vehicle color variation, less toy-saturated silhouette materials, softened distant-city haze, and segmented city-edge building massing.
- `npm --workspace apps/web exec gltf-transform -- --version` reported `4.4.0`.
- `node scripts/optimize-r3f-assets.mjs --check` passed with all manifest payload `9.62 MB` and Stage 6E first-pass runtime payload `7.86 MB / 25.00 MB`.
- `node scripts/verify-r3f-assets.mjs` passed with first-pass GLB + texture payload `9.62 MB / 25.00 MB`.
- `npm --workspace apps/web run test -- components/DashboardShell.test.tsx components/r3f/SimulationCanvas.test.tsx` passed: 70 tests.
- `npm run build:web` passed.
- `node scripts/verify-r3f-dashboard.mjs` passed with final artifact timestamp `2026-06-18T01:21:56.672Z`, `drawCalls=94/250`, `visibleVehicleCount=160`, `glbVehicleCount=5`, `streetFurnitureShadowCount=6`, no blocking console failures, no WebGL context-loss errors, and fresh desktop/mobile proof artifacts.
- `git diff --check` passed with line-ending warnings only.
- Fresh canvas artifacts inspected against the committed Stage 5 baseline: `artifacts/r3f-dashboard-desktop-canvas.png` and `artifacts/r3f-dashboard-mobile-canvas.png` now show broader manifest-backed vehicle families, denser color-varied traffic silhouettes, street furniture, trees, curb details, segmented city-edge massing, and retained wet-road/facade lighting. This is browser runtime proof only, not live SUMO/Tarcl binding.

## Stage 6F: Operations, Telemetry, Security, Artifact Hygiene, And Release Discipline

**Goal:** Convert Stage 5 proof into operationally inspectable evidence without hiding generated output or relying on informal direct-to-main snapshots.

**Files:**
- Modify: `apps/web/components/r3f/SimulationCanvas.tsx`
- Create: `apps/web/lib/r3fTelemetry.ts`
- Modify: `scripts/verify-r3f-dashboard.mjs`
- Create: `scripts/verify-security-gates.mjs`
- Modify: `package.json`
- Create: `docs/ops/r3f-artifact-retention.md`
- Create: `docs/release/r3f-stage-checklist.md`
- Create: `.github/pull_request_template.md`
- Modify: `.gitignore`

- [x] **Step 1: Add client telemetry bridge**

Create `apps/web/lib/r3fTelemetry.ts` with a narrow browser helper that can emit:

```text
r3f renderer mode
snapshot source
frame-bound boolean
draw-call count when available
WebGL context-loss count
fallback reason
visible vehicle count
```

In `SimulationCanvas.tsx`, call the helper from existing proof/context-loss paths. In development and tests, expose the event on `window` for the verifier. Do not add a production monitoring vendor without explicit user approval.

- [x] **Step 2: Verify telemetry in browser proof**

Update `verify-r3f-dashboard.mjs` so `artifacts/r3f-dashboard-details.json` contains:

```json
{
  "telemetry": {
    "renderer_mode": "r3f_photoreal_stage5",
    "snapshot_source": "simulation_snapshot_fixture",
    "frame_bound": true,
    "webgl_context_loss_count": 0,
    "fallback_reason": null
  }
}
```

The verifier must fail if telemetry is absent while the R3F renderer is mounted.

- [x] **Step 3: Add security and audit gate**

Create `scripts/verify-security-gates.mjs` and root script:

```json
{
  "verify:security": "node scripts/verify-security-gates.mjs"
}
```

The script must run checks that are available without new external tools:

```text
npm audit --audit-level=high
npm --workspace apps/web audit --audit-level=high
manifest license/provenance coverage through verify-r3f-assets.mjs
tracked-file scan for obvious private keys or API tokens in source/docs/scripts
```

For Python audit, SBOM generation, or dedicated secret-scanning tools, the script must either run the repo-declared check or report `blocked_requires_tooling` with the exact missing command. Do not add or install extra security tooling without explicit user approval.

- [x] **Step 4: Define artifact retention and generated-output hygiene**

Create `docs/ops/r3f-artifact-retention.md` that classifies:

```text
canonical proof artifacts: committed only when they are stage acceptance evidence
ephemeral Playwright/test output: ignored by default
details JSON: committed only with matching proof screenshots for accepted stages
test-results: generated output, not source of truth
```

Update `.gitignore` to prevent new accidental generated-output churn while preserving already tracked canonical proof artifacts. Do not delete or move existing tracked artifacts without explicit user approval.

- [x] **Step 5: Add release and PR discipline**

Create `docs/release/r3f-stage-checklist.md` with:

```text
stage name
commit or PR reference
commands run
browser proof artifacts
reviewers or review notes
known gaps
approval date
```

Create `.github/pull_request_template.md` with required checkboxes for:

```text
npm run verify
browser proof artifacts
truth source label
no real signal control claim
asset license/provenance check
generated-output hygiene check
```

Creating Git tags, GitHub releases, changing branch protection, or opening PRs are external side effects and require explicit user approval at execution time.

- [x] **Step 6: Verification**

Run:

```bash
npm run verify:security
node scripts/verify-r3f-dashboard.mjs
npm run verify
git diff --check
```

Expected:

```text
security gate passes or reports exact blocked tooling without false success
dashboard verifier includes telemetry evidence
default verify passes
diff check passes
artifact policy and release checklist exist
```

Stage 6F proof, final primary-run browser artifact generated at `2026-06-18T01:48:44.873Z`:

- `npm --workspace apps/web run test -- lib/r3fTelemetry.test.ts`: 1 test passed after the initial RED missing-module failure.
- `npm --workspace apps/web run test -- components/r3f/SimulationCanvas.test.tsx`: 6 tests passed after the initial RED missing-telemetry failure.
- Initial `npm run verify:security`: passed available no-install checks and reported exact blocked tooling for Python audit, SBOM generation, and external secret scanning.
- Final-gate concern closure: `npm run verify:security` now runs Python dependency audit, CycloneDX SBOM generation, R3F asset provenance verification, and tracked-file secret scanning, writes `artifacts/r3f-security-gates.json`, and reports `blocked_requires_tooling=[]` when the gate passes.
- `node scripts/verify-r3f-dashboard.mjs`: passed and wrote telemetry into `artifacts/r3f-dashboard-details.json`.
- `npm run verify`: passed API tests, web tests, web build, asset verifier, dashboard verifier, security verifier, and `git diff --check` with no line-ending warnings after the final-gate concern closure.
- Telemetry evidence: `renderer_mode=r3f_photoreal_stage5`, `snapshot_source=simulation_snapshot_fixture`, `frame_bound=true`, `draw_call_count=94`, `webgl_context_loss_count=0`, `fallback_reason=null`, `visible_vehicle_count=160`.
- Added artifact retention docs, release checklist, PR template, standalone security gate, and generated-output ignore rules. This is operational proof only; it does not create releases, tags, branch protection, production monitoring vendors, live SUMO/Tarcl binding, or real signal control.

## Final Stage 6 Readiness Gate

After Stages 6A through 6F, run:

```bash
npm run test:api
npm --workspace apps/web run test
npm run build:web
npm run verify:r3f-assets
npm run verify:r3f-dashboard
npm run verify:security
npm run verify
git diff --check
```

Browser QA must inspect:

```text
/dashboard desktop screenshot
/dashboard mobile screenshot
canvas-only screenshots
webgl-off fallback screenshot
details JSON
safety copy visibility
source badge visibility
signal-state visibility
no horizontal overflow
nonblank long-corridor R3F canvas
```

The project can be described as ready for live Stage 6+ work only when:

```text
R3F viewport prefers SimulationFrameSnapshot over fixture queue/event state.
Fixture fallback is explicit and labeled.
Dynamic signal state is rendered or explicitly unavailable.
R3F verification is part of npm run verify.
Workflow YAML is present in the repo.
README, runbook, technote, and this plan use implemented/verified/gated wording.
Asset runtime usage, compression checks, and licensing docs are in place.
Telemetry, security gates, artifact policy, and release checklist are in place.
No UI copy implies live CCTV or real signal control.
```

## Suggested Execution Order

1. Stage 6A: `feat(web): wire simulation frame into R3F viewport`.
2. Stage 6B: `feat(web): add dynamic signal hardware and operator overlays`.
3. Stage 6C: `chore(ci): promote r3f verification to default gates`.
4. Stage 6D: `docs: reconcile renderer status with Stage 5 proof`.
5. Stage 6E: `perf(assets): expand, compress, and license runtime assets`.
6. Stage 6F: `ops: add telemetry, security gates, artifact policy, and release checklist`.
7. Final Stage 6 readiness gate.

## Implementation Notes

- Keep `SimulationComparison` for metrics and recommendations. Use `SimulationFrameSnapshot` for renderer state.
- Frame-backed rendering means `buildSceneSnapshot(frame)` is the preferred source. It does not require live SUMO/TraCI/Tarcl yet.
- Fixture fallback remains allowed only when the frame is missing or unavailable, and it must be labeled as fixture fallback.
- Use GLB for reusable props and vehicles; use procedural mesh/geometry for roads, markings, sidewalks, curbs, queue zones, and generated city blocks.
- Use instancing for repeated cars, lane markings, trees, bollards, and streetlights.
- Use Image Gen for target references and texture/decal sources, not as a substitute for browser-rendered proof.
- Photorealism remains required, but the immediate audit response is truth alignment, verification gates, documentation accuracy, and operational evidence.
- Treat `Tarcl` as a future backend source name unless the implementation owner confirms it means plain TraCI.
- Ask before dependency installs, external downloads, commits, pushes, deployments, GitHub settings changes, PR creation, tags, releases, or paid/commercial asset use.

## Self-Review

- Spec coverage: covers all 13 explicit audit items from the 2026-06-18 report, not only high-priority work.
- Placeholder scan: no placeholder markers remain in the new roadmap section.
- Type consistency: frontend `SimulationFrameSnapshot` remains the renderer-state contract; aggregate `SimulationComparison` remains separate.
- File consistency: the new roadmap uses files that exist now, and creates only the missing files required by the audit (`SignalHardware.tsx`, `SimulationOverlays.tsx`, workflow, compliance, ops, release, telemetry, and helper scripts).
- Scope check: this is still one R3F dashboard stabilization path, not an Unreal restoration, Vite migration, backend control rewrite, or OpenAI task.

## Execution Handoff

Plan updated and saved to `docs/superpowers/plans/2026-06-16-r3f-photoreal-dashboard-simulation.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh worker per Stage 6A through 6F, with separate spec-compliance and code-quality review between stages.
2. **Inline Execution** - execute stages in this session using `superpowers:executing-plans`, with checkpoints after each stage.

Do not claim Stage 6+ readiness until the Final Stage 6 Readiness Gate has fresh evidence.
