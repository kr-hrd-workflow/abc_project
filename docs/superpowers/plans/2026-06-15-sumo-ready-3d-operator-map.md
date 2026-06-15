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

## Next Session Goal Mode Prompt

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
