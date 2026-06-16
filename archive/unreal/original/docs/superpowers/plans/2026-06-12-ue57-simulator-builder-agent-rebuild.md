# UE 5.7 Simulator Builder Agent Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated repo-local Simulator Builder Agent and use it to drive a clean, UE 5.7 doc-grounded traffic simulator renderer rebuild.

**Architecture:** The agent is a documented worker role plus prompt runner and verifier. It keeps the product boundary clear: SUMO/TraCI is truth, FastAPI orchestrates, Unreal renders, and the existing web dashboard displays Pixel Streaming. The next implementation pass must replace the weird proof-strip scene with one realistic operator viewport before expanding to more cities.

**Tech Stack:** Unreal Engine 5.7, Editor Python, C++ `SmartIntersectionRuntime`, FastAPI, Next.js dashboard, Pixel Streaming, Superpowers plans.

---

## File Structure

- Create: `docs/agents/simulator-builder-agent.md`
  - Source-of-truth role, boundaries, UE 5.7 doc rules, workflow, and verification gates for simulator-building workers.
- Create: `scripts/run-simulator-builder-agent.py`
  - Prints a ready-to-delegate worker prompt with the agent spec and UE doc digest context.
- Create: `scripts/verify-simulator-builder-agent.py`
  - Verifies the agent spec, runner, and UE 5.7 doc digest are present and contain required guardrails.
- Modify: `package.json`
  - Adds `npm run simulator:agent` and `npm run verify:simulator-agent`.
- Create: `docs/superpowers/plans/2026-06-12-ue57-simulator-builder-agent-rebuild.md`
  - This plan.

## Task 1: Create Simulator Builder Agent Spec

**Files:**
- Create: `docs/agents/simulator-builder-agent.md`

- [x] **Step 1: Write the agent role and hard boundaries**

Include the exact boundaries:

```md
- Do not modify landing-page imagery or landing-page layout unless the user explicitly asks for a landing-quality render pass.
- Do not add oversized proof strips, asset lineups, plinths, or debug props to production maps.
- SUMO/TraCI is truth; FastAPI orchestrates; Unreal renders.
```

- [x] **Step 2: Ground the agent in official UE 5.7 docs**

Reference these local doc digest files:

```text
docs/technotes/ue57-doc-digest/python_editor.txt
docs/technotes/ue57-doc-digest/actors.txt
docs/technotes/ue57-doc-digest/levels.txt
docs/technotes/ue57-doc-digest/static_meshes.txt
docs/technotes/ue57-doc-digest/materials.txt
docs/technotes/ue57-doc-digest/lights.txt
docs/technotes/ue57-doc-digest/post_process.txt
docs/technotes/ue57-doc-digest/cinematic_cameras.txt
docs/technotes/ue57-doc-digest/pixel_streaming.txt
```

- [x] **Step 3: Define target renderer architecture**

Use:

```text
SUMO/TraCI fixtures or live runner
        ↓
FastAPI renderer snapshot endpoint
        ↓
Unreal ATrafficSimulationController
        ↓
Signal/vehicle/pedestrian/material actor state
        ↓
Pixel Streaming
        ↓
Existing Next dashboard iframe
```

## Task 2: Create Agent Prompt Runner

**Files:**
- Create: `scripts/run-simulator-builder-agent.py`

- [x] **Step 1: Print a self-contained worker prompt**

The runner must include:

```python
AGENT_SPEC = ROOT / "docs" / "agents" / "simulator-builder-agent.md"
PLAN = ROOT / "docs" / "superpowers" / "plans" / "2026-06-12-ue57-simulator-builder-agent-rebuild.md"
DOC_DIGEST = ROOT / "docs" / "technotes" / "ue57-doc-digest"
```

- [x] **Step 2: Verify runner output manually**

Run:

```bash
npm run simulator:agent | head -80
```

Expected: printed worker prompt includes role, task, official doc digest list, and simulator-builder spec.

## Task 3: Create Agent Verifier

**Files:**
- Create: `scripts/verify-simulator-builder-agent.py`

- [x] **Step 1: Verify required files exist**

Required:

```python
SPEC = ROOT / "docs" / "agents" / "simulator-builder-agent.md"
RUNNER = ROOT / "scripts" / "run-simulator-builder-agent.py"
DOC_DIGEST = ROOT / "docs" / "technotes" / "ue57-doc-digest"
```

- [x] **Step 2: Verify guardrail tokens**

Require tokens including:

```python
"SmartIntersection Simulator Builder Agent"
"Do not modify landing-page imagery"
"Do not add oversized proof strips"
"SUMO/TraCI is truth; FastAPI orchestrates; Unreal renders"
"Use Python for editor automation only"
"Use Actors and Components"
"Use Static Meshes"
"Use Material Instances/Functions"
"Use CineCameraActor"
"Pixel Streaming"
```

- [x] **Step 3: Run verifier**

Run:

```bash
python3 scripts/verify-simulator-builder-agent.py
```

Expected:

```text
SIMULATOR_BUILDER_AGENT_PASS
```

## Task 4: Add npm Scripts

**Files:**
- Modify: `package.json`

- [x] **Step 1: Add scripts**

Add:

```json
"simulator:agent": "python3 scripts/run-simulator-builder-agent.py",
"verify:simulator-agent": "python3 scripts/verify-simulator-builder-agent.py"
```

- [x] **Step 2: Run scripts**

Run:

```bash
npm run verify:simulator-agent
npm run simulator:agent | head -80
```

Expected: verifier passes and runner prints prompt.

## Task 5: Next Rebuild Pass After Agent Creation

**Files to modify next, not in this agent-creation commit:**
- `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/`
- `scripts/verify-complete-simulation-renderer.py`

- [ ] **Step 1: Delete or isolate the ugly proof strip**

Remove production use of labels like:

```text
PolyHaven CC0 VISIBLE ... foreground proof
CC0 asset foreground plinth
```

Expected: production maps no longer include proof-strip tokens.

- [ ] **Step 2: Build one clean operator map first**

Target one map before all cities:

```text
/Game/Maps/Generated/smart_intersection_rebuild
```

Expected: one screenshot that looks like a plausible traffic-control view, not a debug lineup.

- [ ] **Step 3: Add runtime actor binding**

Use `ATrafficSimulationController` to update signal/queue state from renderer snapshots.

Expected: applying two snapshots changes signal and queue visuals.

- [ ] **Step 4: Verify and only then expand**

Run:

```bash
python3 scripts/verify-simulator-builder-agent.py
python3 scripts/verify-complete-simulation-renderer.py
npm run verify
```

Expected: all pass before commit.

---

## Self-Review

- Spec coverage: covers user request to build an agent for making the simulator and grounds next rebuild in UE 5.7 docs.
- Placeholder scan: no TBD/TODO placeholders; the future rebuild tasks are explicit remaining tasks, not hidden placeholders.
- Type consistency: file paths and command names match generated files and `package.json` scripts.
