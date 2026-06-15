# Stage 1: Large SUMO-Ready Operator Map

Back to [SUMO-Ready 3D Operator Map Implementation Plan](../2026-06-15-sumo-ready-3d-operator-map.md).

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
