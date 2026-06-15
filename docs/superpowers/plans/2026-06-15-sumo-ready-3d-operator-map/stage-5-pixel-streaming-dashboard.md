# Stage 5: Pixel Streaming And Dashboard Integration

Back to [SUMO-Ready 3D Operator Map Implementation Plan](../2026-06-15-sumo-ready-3d-operator-map.md).

## Stage 5 Detailed Task Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task, and use `karpathy-guidelines` before planning, writing, reviewing, refactoring, or debugging code. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the Stage 4 operator viewport through the existing Next.js dashboard Pixel Streaming slot so `/dashboard` can show the Unreal-rendered SmartIntersection operator map while preserving the SUMO/TraCI truth boundary and no-real-control safety copy.

**Architecture:** Stage 5 does not add new simulation truth. SUMO/TraCI or deterministic fixtures remain the state source, FastAPI remains the renderer snapshot orchestrator, Unreal renders `ATrafficSimulationController` state, Pixel Streaming transports the rendered viewport over WebRTC, and the dashboard embeds the stream through `NEXT_PUBLIC_SIMULATION_STREAM_URL`.

**Tech Stack:** Unreal Engine 5.7 Pixel Streaming, `scripts/start-pixel-streaming.ps1`, `scripts/open-unreal-project.ps1`, `scripts/unreal-at-home.ps1`, Next.js dashboard, `SimulationViewport`, Vitest, Playwright or Browser for proof capture, bundled Python verifiers.

---

### Stage 5 Boundaries

Stage 5 does:

- prove the existing dashboard stream slot can point at the local Unreal Pixel Streaming frontend
- prove the Unreal runtime launches with Pixel Streaming streamer flags
- prove the dashboard still shows simulation-only and no-real-control copy
- prove the Stage 4 fixture stream path remains honest when live SUMO is unavailable
- produce a dashboard proof screenshot or browser artifact showing `/dashboard` with the Pixel Streaming frame
- add `SUMO_READY_OPERATOR_STAGE5_PASS` only after semantic checks, browser proof, and repo validation pass

Stage 5 does **not**:

- claim live SUMO/TraCI unless `simulation_source=sumo_traci` comes from a real local run
- add Pixel Streaming as a source of simulation truth
- add real traffic-signal controller integration
- modify landing-page imagery, landing layout, or marketing sections
- commit `.env.local`, UE generated security tokens, Pixel Streaming auth material, or local infrastructure checkouts
- expand to all cities; Stage 6 owns multi-city rollout

### Stage 5 File Map

**Read before editing:**

- `AGENTS.md`
- `docs/agents/simulator-builder-agent.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map/stage-4-sumo-traci-motion-binding.md`
- `docs/technotes/ue57-doc-digest/pixel_streaming.txt`
- `renderer/unreal/SmartIntersection/SmartIntersection.uproject`
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Public/TrafficSimulationController.h`
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Private/TrafficSimulationController.cpp`
- `scripts/start-pixel-streaming.ps1`
- `scripts/open-unreal-project.ps1`
- `scripts/unreal-at-home.ps1`
- `scripts/verify-complete-simulation-renderer.py`
- `apps/web/components/SimulationViewport.tsx`
- `apps/web/components/DashboardShell.test.tsx`
- `apps/web/app/unreal-runtime.test.ts`
- `apps/web/app/globals.css`

**Modify only if needed:**

- `scripts/start-pixel-streaming.ps1`
- `scripts/open-unreal-project.ps1`
- `scripts/unreal-at-home.ps1`
- `package.json`
- `apps/web/components/SimulationViewport.tsx`
- `apps/web/components/DashboardShell.test.tsx`
- `apps/web/app/unreal-runtime.test.ts`
- `scripts/verify-complete-simulation-renderer.py`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md`
- `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map/stage-5-pixel-streaming-dashboard.md`

**Create if needed:**

- `scripts/verify-sumo-ready-operator-map-stage5.py`
- `scripts/capture-dashboard-pixel-streaming-stage5.ps1`
- `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage5_pixel_streaming_manifest.json`

**Generated proof artifacts:**

- `artifacts/unreal-operator-map-stage5-dashboard-stream-proof.png`
- `artifacts/unreal-operator-map-stage5-dashboard-stream-details.json`

### Task 20: Stage 5 Baseline And Scope Lock

**Files:**

- Read: `AGENTS.md`
- Read: `docs/agents/simulator-builder-agent.md`
- Read: this Stage 5 plan
- Validate: current git state, Stage 1/2/3/4 verifier state, dashboard tests, Pixel Streaming scripts

- [ ] **Step 1: Confirm branch and dirty scope**

Run:

```powershell
git status --short --branch
git fetch origin main
git status --short --branch
```

Expected: all existing dirty files are identified before Stage 5 edits. Do not stage `.env.local`, `apps/web/.env.local`, `tmp/PixelStreamingInfrastructure`, Unreal `Saved/`, Unreal `Intermediate/`, generated UE security tokens, or unrelated local files.

- [ ] **Step 2: Re-run Stage 1-4 baseline checks**

Run:

```powershell
npm run unreal:precheck
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
npm run verify:operator-map-stage3
npm run verify:operator-map-stage4
npm run unreal:runtime-smoke
npm run unreal:http-smoke
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-simulator-builder-agent.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-complete-simulation-renderer.py
npm run runtime:readiness
git diff --check
```

Expected: Stage 1-4 remain green. If `npm run runtime:readiness` still reports `simulation ready=False mode=fixture`, copy that into Stage 5 status and keep live SUMO unchecked.

- [ ] **Step 3: Record Pixel Streaming baseline assumptions**

Document in this file whether:

- UE 5.7 is installed.
- the Pixel Streaming plugin is enabled in `SmartIntersection.uproject`.
- a bundled or fallback SignallingWebServer is available.
- `npm run unreal:home` can start the signalling server and launch Unreal with Pixel Streaming flags.
- `/dashboard` can be loaded locally.

Expected: Stage 5 status distinguishes "dashboard stream slot proof", "Pixel Streaming transport proof", and "live SUMO proof".

### Task 21: Harden The Pixel Streaming Launch Contract

**Files:**

- Read/modify: `scripts/start-pixel-streaming.ps1`
- Read/modify: `scripts/open-unreal-project.ps1`
- Read/modify: `scripts/unreal-at-home.ps1`
- Read/modify: `package.json`

- [ ] **Step 1: Verify signalling server startup path**

Run:

```powershell
npm run unreal:pixel-streaming
```

Expected:

- command exits `0`
- output names the selected Pixel Streaming server folder
- output includes `Expected dashboard stream URL: http://127.0.0.1`
- any fallback clone lands under ignored `tmp/PixelStreamingInfrastructure`

If this command opens a persistent background server window, record that behavior and do not assume a browser connection until Task 25 verifies it.

- [ ] **Step 2: Verify Unreal launch flags**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/open-unreal-project.ps1 -PixelStreaming -Game
```

Expected output includes:

```text
Unreal runtime mode enabled: -game
Pixel Streaming launch flags enabled: -PixelStreamingURL=ws://127.0.0.1:8888 -RenderOffscreen -AudioMixer
```

If Unreal fails to launch, record the exact exit code and blocker. Do not mark Stage 5 complete from script text alone.

- [ ] **Step 3: Keep env writes local and uncommitted**

Run:

```powershell
npm run unreal:home
git status --short -- .env.local apps/web/.env.local tmp
```

Expected: `unreal:home` ensures `NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1` locally, but those env files and local Pixel Streaming infrastructure are not staged or committed.

### Task 22: Preserve The Dashboard Stream Slot Contract

**Files:**

- Read/modify: `apps/web/components/SimulationViewport.tsx`
- Read/modify: `apps/web/components/DashboardShell.test.tsx`
- Read/modify: `apps/web/app/unreal-runtime.test.ts`
- Read/modify if needed: `apps/web/app/globals.css`

- [ ] **Step 1: Keep `NEXT_PUBLIC_SIMULATION_STREAM_URL` ahead of the legacy alias**

Existing behavior should stay:

```tsx
const genericStreamUrl = process.env.NEXT_PUBLIC_SIMULATION_STREAM_URL?.trim();
const legacyStreamUrl = process.env.NEXT_PUBLIC_UNITY_WEBGL_URL?.trim();
const simulationStreamUrl = genericStreamUrl || legacyStreamUrl;
```

Expected: Stage 5 does not remove the legacy alias, but the Unreal stream URL wins whenever present.

- [ ] **Step 2: Test the dashboard iframe contract**

Add or preserve Vitest coverage that stubs:

```ts
vi.stubEnv("NEXT_PUBLIC_SIMULATION_STREAM_URL", "http://127.0.0.1");
vi.stubEnv("NEXT_PUBLIC_UNITY_WEBGL_URL", "/unity/index.html");
```

Expected assertions:

```ts
const streamFrame = container.querySelector("iframe.simulation-stream-frame");
expect(streamFrame?.getAttribute("src")).toBe("http://127.0.0.1");
expect(streamFrame?.className).toContain("unreal-pixel-streaming-frame");
expect(streamFrame?.getAttribute("allow")).toContain("fullscreen");
expect(screen.getByText("Unreal Pixel Streaming")).toBeTruthy();
```

Run:

```powershell
npm --workspace apps/web run test -- DashboardShell.test.tsx
```

Expected: dashboard tests pass.

- [ ] **Step 3: Preserve no-real-control copy and fixture honesty**

Verify the dashboard still renders:

```text
Simulation only / No real signal control
SUMO/TraCI Renderer
Unreal Pixel Streaming + SUMO validation view
```

Expected: the dashboard can show a Pixel Streaming player without implying real signal control or live SUMO execution.

### Task 23: Add Stage 5 Semantic Verifier

**Files:**

- Create: `scripts/verify-sumo-ready-operator-map-stage5.py`
- Modify: `package.json`
- Read: `scripts/verify-sumo-ready-operator-map-stage4.py`
- Read: `scripts/verify-complete-simulation-renderer.py`

- [ ] **Step 1: Add a focused verifier command**

Add:

```json
"verify:operator-map-stage5": "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"& \\\"$env:USERPROFILE\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe\\\" scripts/verify-sumo-ready-operator-map-stage5.py\""
```

Expected: Stage 5 can be validated independently.

- [ ] **Step 2: Verify Pixel Streaming and dashboard source tokens**

The Stage 5 verifier should check:

- `SmartIntersection.uproject` enables `PixelStreaming`.
- `scripts/start-pixel-streaming.ps1` includes SignallingWebServer discovery and prints `Expected dashboard stream URL: http://127.0.0.1`.
- `scripts/open-unreal-project.ps1` includes `-PixelStreamingURL=ws://127.0.0.1:8888`, `-RenderOffscreen`, and `-AudioMixer`.
- `scripts/unreal-at-home.ps1` writes `NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1` and invokes both Pixel Streaming startup and Unreal launch.
- `SimulationViewport.tsx` prioritizes `NEXT_PUBLIC_SIMULATION_STREAM_URL` over `NEXT_PUBLIC_UNITY_WEBGL_URL`.
- dashboard tests cover the stream iframe and fallback behavior.
- Stage 1/2/3/4 verifier commands still exist in `package.json`.

Expected: verifier fails if Stage 5 is only a dashboard mock or if Pixel Streaming launch flags disappear.

- [ ] **Step 3: Verify proof artifacts after capture**

After Task 25, the verifier should check:

- `artifacts/unreal-operator-map-stage5-dashboard-stream-proof.png` exists, is readable, at least `1280x720`, and has nontrivial brightness/contrast.
- `artifacts/unreal-operator-map-stage5-dashboard-stream-details.json` exists and records:
  - `dashboard_url`
  - `stream_url`
  - `iframe_src`
  - `stream_frame_visible`
  - `safety_copy_visible`
  - `simulation_source_claim`
  - `live_sumo_status`
- Stage 5 manifest exists and says Pixel Streaming is transport only.

Expected output ends with:

```text
SUMO_READY_OPERATOR_STAGE5_PASS
```

### Task 24: Add A Browser Proof Capture Path

**Files:**

- Create if useful: `scripts/capture-dashboard-pixel-streaming-stage5.ps1`
- Create or update proof manifest: `renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage5_pixel_streaming_manifest.json`
- Generated: `artifacts/unreal-operator-map-stage5-dashboard-stream-proof.png`
- Generated: `artifacts/unreal-operator-map-stage5-dashboard-stream-details.json`

- [ ] **Step 1: Start local app surfaces**

Run:

```powershell
npm run unreal:home
npm run launch:local
```

Expected:

- Pixel Streaming signalling server starts.
- Unreal launches with Pixel Streaming streamer flags.
- API and web app are reachable.
- `.env.local` and `apps/web/.env.local` are local-only and unstaged.

- [ ] **Step 2: Open the dashboard in a real browser**

Use Browser or Playwright to open:

```text
http://127.0.0.1:3000/dashboard
```

Expected DOM evidence:

- `.simulation-stream-frame.unreal-pixel-streaming-frame` exists.
- iframe `src` is `http://127.0.0.1`.
- safety copy is visible.
- `SUMO/TraCI Renderer` is visible.
- the dashboard does not show a landing page.

- [ ] **Step 3: Capture proof screenshot and details JSON**

Capture:

```text
artifacts/unreal-operator-map-stage5-dashboard-stream-proof.png
artifacts/unreal-operator-map-stage5-dashboard-stream-details.json
```

Details JSON should include:

```json
{
  "schema": "operator-stage5-pixel-streaming-dashboard-proof-v1",
  "mode": "OperatorStage5",
  "base_stage": "OperatorStage4Fixture",
  "dashboard_url": "http://127.0.0.1:3000/dashboard",
  "stream_url": "http://127.0.0.1",
  "iframe_src": "http://127.0.0.1",
  "renderer_policy": "SUMO/TraCI is truth, FastAPI orchestrates, Unreal renders, Pixel Streaming transports frames.",
  "simulation_source_claim": "fixture_or_live_as_reported_by_runtime_readiness",
  "live_sumo_status": "deferred_unless_real_sumo_traci_run_passes"
}
```

Expected: proof can be reviewed without committing secrets or local env files.

### Task 25: Perform Human Visual Inspection

**Files:**

- Inspect: `artifacts/unreal-operator-map-stage5-dashboard-stream-proof.png`
- Inspect: `artifacts/unreal-operator-map-stage5-dashboard-stream-details.json`

- [ ] **Step 1: Inspect the dashboard proof**

Reject Stage 5 proof if any condition is true:

- iframe is missing or points at the legacy Unity alias while `NEXT_PUBLIC_SIMULATION_STREAM_URL` is set
- stream area is blank, black, browser error page, or only fallback canvas
- dashboard safety copy is missing or hidden
- Stage 1/2/3/4 readability is lost in the streamed viewport
- dashboard copy implies real signal control
- proof is a landing-page screenshot instead of `/dashboard`
- proof contains UE security token, API key, credential, or local auth secret

Expected: the screenshot shows the operator dashboard with the Unreal Pixel Streaming frame visible and the safety boundary intact.

- [ ] **Step 2: Record visual verdict**

Add a `Stage 5 Verification Status - YYYY-MM-DD` block to this file with:

- fixture/live verdict
- stream URL and dashboard URL
- proof artifact paths
- exact verifier outputs
- runtime readiness summary
- visual inspection summary
- deferred live SUMO or multi-city gates

Expected: checkboxes are only changed to `- [x]` after file, command, browser, or visual evidence exists.

### Task 26: Final Stage 5 Validation

**Files:**

- Validate: Stage 1-5 verifiers, dashboard tests, Pixel Streaming scripts, proof artifacts, generated manifest, this plan

- [ ] **Step 1: Run focused checks**

Run:

```powershell
npm run unreal:precheck
npm run verify:operator-map-stage1
npm run verify:operator-map-stage2
npm run verify:operator-map-stage3
npm run verify:operator-map-stage4
npm run verify:operator-map-stage5
npm run unreal:runtime-smoke
npm run unreal:http-smoke
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-simulator-builder-agent.py
& 'C:\Users\100ri\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts/verify-complete-simulation-renderer.py
npm run runtime:readiness
git diff --check
```

Expected: focused checks pass. If live SUMO remains missing, Stage 5 may still pass as Pixel Streaming dashboard proof but live SUMO remains explicitly open.

- [ ] **Step 2: Run full repo validation**

Run:

```powershell
npm run verify
```

Expected: API tests, web tests, web build, and `git diff --check` pass.

- [ ] **Step 3: Run final secret/local-artifact scan**

Run:

```powershell
git status --short -- .env.local apps/web/.env.local tmp renderer/unreal/SmartIntersection/Saved renderer/unreal/SmartIntersection/Intermediate
rg -n "SecurityToken|PixelStreaming\\.SecurityToken|OPENAI_API_KEY|BEGIN RSA|PRIVATE KEY|password|secret" scripts apps/web renderer/unreal/SmartIntersection docs/superpowers/plans
```

Expected: no secret material is staged or committed. Any benign verifier string should be documented before commit.

### Stage 5 Goal Mode Prompt

This prompt follows the OpenAI Cookbook guidance in "Using Goals in Codex":
`https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex#how-to-write-a-goal`.

The Cookbook says strong Goals define outcome, verification surface, constraints, boundaries, iteration policy, and blocked stop condition.

```md
/goal Build Stage 5 of the SUMO-ready 3D operator map for SmartIntersection: a Pixel Streaming and dashboard integration proof where the Stage 4 Unreal operator viewport is launched with Pixel Streaming, `/dashboard` embeds the local stream from `NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1`, and the dashboard visibly preserves SUMO/TraCI truth, FastAPI orchestration, Unreal rendering, and no-real-control safety boundaries.

Success requires preserved Stage 1/2/3/4 verifiers, a new `SUMO_READY_OPERATOR_STAGE5_PASS` verifier, dashboard tests proving `NEXT_PUBLIC_SIMULATION_STREAM_URL` wins over the legacy stream alias, Unreal launch evidence with `-PixelStreamingURL=ws://127.0.0.1:8888 -RenderOffscreen -AudioMixer`, a browser proof screenshot or artifact showing `/dashboard` with the Unreal Pixel Streaming iframe visible, `npm run runtime:readiness` recorded honestly, `npm run verify` passing, and the Stage 5 plan updated with exact evidence.

Use required skills before acting: Superpowers process skills for execution/verification and `karpathy-guidelines` before planning, coding, review, refactor, or debugging. Use Browser or Playwright for the dashboard proof. Keep changes surgical and evidence-driven.

Keep `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map.md` as the index and `docs/superpowers/plans/2026-06-15-sumo-ready-3d-operator-map/stage-5-pixel-streaming-dashboard.md` as the live Stage 5 progress document. Use checkboxes exactly: `- [ ]` for open, `- [x]` only when evidence exists. Do not track completion only in chat.

Start from repo `C:\Users\100ri\abc_project`. Read `AGENTS.md`, `docs/agents/simulator-builder-agent.md`, the root index, the Stage 4 plan, this Stage 5 plan, `docs/technotes/ue57-doc-digest/pixel_streaming.txt`, `scripts/start-pixel-streaming.ps1`, `scripts/open-unreal-project.ps1`, `scripts/unreal-at-home.ps1`, `SimulationViewport.tsx`, `DashboardShell.test.tsx`, and the Stage 4 verifier before editing.

Verify the baseline first with `npm run unreal:precheck`, `npm run verify:operator-map-stage1`, `npm run verify:operator-map-stage2`, `npm run verify:operator-map-stage3`, `npm run verify:operator-map-stage4`, `npm run unreal:runtime-smoke`, `npm run unreal:http-smoke`, bundled-Python `scripts/verify-simulator-builder-agent.py`, bundled-Python `scripts/verify-complete-simulation-renderer.py`, `npm run runtime:readiness`, and `git diff --check`.

Preserve constraints: SUMO/TraCI is truth, FastAPI orchestrates, Unreal renders, Pixel Streaming transports rendered frames only, no real traffic-controller integration, no live SUMO claim without a real local `sumo_traci` run, no landing-page changes, no proof strips/plinths/cards, no committed `.env.local`, no `tmp/PixelStreamingInfrastructure` commit, and no UE security tokens or secrets in commits.

Between iterations inspect Pixel Streaming startup output, Unreal launch output, dashboard DOM, screenshot proof, Stage 5 verifier output, readiness output, and checkbox state. Choose the smallest next change that makes the stream slot, launch contract, proof capture, or verifier more truthful and testable without expanding into Stage 6 multi-city work.

Completion means the dashboard stream proof exists, `verify:operator-map-stage5` prints `SUMO_READY_OPERATOR_STAGE5_PASS`, Stage 1/2/3/4 verifiers still pass, runtime/HTTP smoke coverage still passes, `npm run verify` passes, human visual inspection confirms the streamed dashboard proof, and this Stage 5 plan records exact evidence. Live SUMO mode is complete only if a real local `sumo_traci` runtime run passes and source metadata prove `simulation_source=sumo_traci`.

If blocked, stop and report the exact blocker, inspected files/commands, current artifacts, unchecked boxes, missing runtime/tooling, and the smallest action that would unlock progress. Do not mark complete from script success alone; completion must be proven by artifact, verifier, repo validation, browser proof, and visual evidence.
```
