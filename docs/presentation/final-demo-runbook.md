# Final Demo Runbook

## Purpose

Use this runbook when rehearsing or presenting the local Smart Intersection Ops
demo. The goal is to show that the project is no longer just a trusted-looking
dashboard. It is now a local evaluation system that can generate many realistic
traffic cases, evaluate recommendation behavior, and verify OpenAI explanations
against guardrails. It also proves that large `live-input.v1` JSON payloads can
enter the same validation and replay-compatible recommendation path.

## Core Claim

Say this first:

> Before connecting live CCTV and real signal data, this system can generate
> realistic detection/signal cases, replay them like live inputs, evaluate the
> recommendation policy at scale, and show pass/fail evidence on the dashboard.

Do not claim:

- Live CCTV is already connected.
- Real traffic signals are controlled.
- The system is production-ready for autonomous signal control.
- LLM output is automatically safe.

## Pre-Demo Checklist

1. Confirm the local environment has the API key and budget gates configured.

   ```bash
   npm run runtime:readiness -- --section openai
   ```

   Expected:

   ```text
   openai ready=True mode=gpt-5.5
   ```

2. Confirm the local app checks still pass.

   ```bash
   npm run test:api
   npm run test:web
   npm run build:web
   npm run demo:health
   ```

   Expected:

   ```text
   API: all tests pass
   Web: all tests pass
   Build: compiled successfully
   Demo health check: 15/15 checks passed
   ```

3. Open the dashboard with `localhost`, not `127.0.0.1`.

   ```text
   http://localhost:3000/dashboard
   ```

   Known local note:

   - `localhost:3000` loaded the Next.js client chunks correctly in the latest
     browser check.
   - `127.0.0.1:3000` showed chunk `403` behavior in the same local setup.

4. Keep `.env.local` private.

   - Do not show the API key on screen.
   - Do not print `.env.local`.
   - Do not paste raw model output into slides.

5. Do not use git during the demo preparation unless explicitly requested.

## Demo Flow

### 1. Open With The Problem

Show: landing page or dashboard header.

Say:

> A traffic AI dashboard is not convincing just because it looks operational.
> The hard question is whether the recommendation pipeline can be tested before
> real CCTV and signal data are connected.

Keep this short. The proof starts in the dashboard.

### 2. Show The Digital Twin Surface

Show: `Digital Twin Simulation`.

Point out:

- It is a simulation/digital-twin surface.
- It helps the operator understand the current scenario visually.
- It is not being presented as real CCTV.

Say:

> This area is the visual operating surface. For now it is simulation/fallback
> visualization, not live CCTV. That boundary is intentional.

### 3. Show Decision Trace

Show: `Decision Trace` and recommendation pipeline rail.

Point out:

- Vision-like input.
- Signal state.
- Policy comparison.
- Operator-facing recommendation.

Say:

> This is the bridge between input and action. The recommendation is not just a
> label on a card; the dashboard shows which evidence path produced it. The
> backend policy now records a scorecard with the selected policy, constraints,
> required inputs, and queue objective metrics so the operator can audit the
> recommendation.

### 4. Show AI Recommendation

Show: `AI 추천` / recommendation panel.

Point out:

- Recommended action.
- Evidence.
- Operator review status from the policy scorecard.
- Safety boundary.

Say:

> The system recommends and explains. It does not control real signals. Operator
> review remains part of the workflow. The recommendation panel labels the
> current scorecard as ready for approval review or requiring manual review.
> The backend emits the same scorecard shape for safety gates, emergency
> clearance, queue relief, pedestrian efficiency, and normal-cycle decisions.
> Contract tests keep those backend policy names, decision order, and scoring
> constants aligned with the evidence export and dashboard summary.

### 5. Show Synthetic Evaluation

Show: Reports panel, `Synthetic Evaluation`.

Point out:

- `100 cases`
- `100 passed`
- `0 failed`
- scenario breakdown across emergency, pedestrian, blocked, and normal.

Say:

> This is the main improvement. We can generate traffic cases and check whether
> the recommendation policy matches the expected outcome. This turns the demo
> from a single scenario into measurable evidence. The local evaluator follows
> the same safety-gate-first policy order as the backend recommendation service.

### 6. Show Failure Drilldown

Action: click `Failure drilldown`.

Point out:

- Failed case id.
- Scenario family.
- Expected recommendation.
- Actual recommendation.

Say:

> A useful evaluation system should not only show success. It should expose what
> failed, why it failed, and what needs to be improved next.

Action: return to `Pass suite`.

### 7. Show Benchmark Scale

Show: `Benchmark Report`.

Action:

1. Click `10K`.
2. Click `50K`.

Point out:

- Same evaluator.
- Larger generated suite.
- Multi-seed evidence.

Say:

> This is how we avoid overfitting the presentation to one small sample. The
> same policy check scales from 5,000 to 10,000 and 50,000 synthetic cases.

Optional external check:

```text
http://localhost:3000/api/synthetic-benchmark-export
```

Use this when someone asks whether the benchmark evidence exists outside the
dashboard UI. It returns the local 5K benchmark as JSON.

### 8. Show Edge-Case Guardrails

Show: `Edge-case Suite`.

Point out:

- Low-confidence detection.
- Stale signal state.
- Missing signal state.
- Emergency plus pedestrian conflict.

Say:

> The edge cases are important because real pipelines are noisy. The system
> should recognize uncertainty and guardrails, not just handle clean examples.

### 9. Show Live-Input JSON Benchmark

Show: `Live-input JSON Benchmark`.

Action:

1. Click `1K`.
2. Click `10K`.

Point out:

- `live-input.v1`
- `JSON payloads`
- `10,000 passed`
- `0 failed`
- optional external check:
  `http://localhost:3000/api/synthetic-live-input-export?size=10k`

Say:

> This is closer to the real integration shape. Instead of only scoring an
> internal synthetic case object, we generate actual `live-input.v1` JSON
> payloads, normalize each payload, map it into replay input, and then evaluate
> the recommendation result. That gives us inspectable input-contract evidence
> at 100, 1K, 5K, and 10K scale.

### 10. Show Live-Input JSON Guardrails

Show: `Live-input JSON Guardrails`.

Point out:

- `6 guarded`
- `0 misses`
- invalid schema rejection
- missing signal replay rejection
- stale signal review
- low-confidence review
- emergency plus pedestrian conflict note

Say:

> The benchmark shows clean generated payloads passing. This card shows the
> opposite side: risky `live-input.v1` payloads are rejected, routed to manual
> review, or preserved with a conflict note before we trust a recommendation.

### 11. Show Live Input Contract

Before the OpenAI section, briefly point to `Source Adapter Fixture` and
`Live Input Contract`.

First show: `Source Adapter Fixture`.

Point out:

- `road-vision.fixture.v1`
- `signal-controller.fixture.v1`
- `live-input.v1`
- `replay input ready`
- optional external check:
  `http://localhost:3000/api/source-live-input-fixture`

Say:

> This fixture is closer to a real integration boundary. It starts from a
> detector-shaped JSON feed and a signal-controller-shaped JSON feed, maps both
> into `live-input.v1`, validates the envelope, and produces replay input.

Then show: `Live Input Contract`.

Point out:

- `live-input.v1`
- `contract normalized`
- `replay input ready`
- `emergency_vehicle`
- optional external check: `http://localhost:3000/api/live-input-fixture`

Say:

> This card shows the future live-input handoff. The local fixture adapter
> produces the same contract shape expected from CCTV detector and signal
> adapters, validates it, and maps it back into the replay/evaluation path. The
> same local adapter payload can be inspected through `/api/live-input-fixture`
> without relying only on the dashboard card.

Optional evidence export:

```text
http://localhost:3000/api/demo-evidence-export
http://localhost:3000/api/final-local-readiness
http://localhost:3000/api/real-sample-intake-package
http://localhost:3000/api/live-input-submission-schema
http://localhost:3000/api/llm-explanation-contract
http://localhost:3000/api/policy-scorecard-contract
http://localhost:3000/api/real-sample-drop-in
```

Use this when there is no real CCTV or signal sample yet but the presentation
needs one downloadable JSON summary of the local benchmark, live-input JSON
suite, guardrails, source-adapter fixture evidence, and operator workflow
status coverage.

Dashboard shortcut:

- Show the `Demo Evidence` card inside the report panel.
- Point out `Health 15/15`, `5,000/5,000 benchmark`,
  `10,000/10,000 live-input JSON`, `6 guarded / 0 misses`, and
  `6 scorecard policies`.
- Point out `source adapter replay ready`.
- Point out `real sample blocked` and `live-input.v1 boundary ready`: this is
  the honest handoff state until an authorized CCTV frame/video and signal
  timing sample are available.
- Use `Drop-in Checklist` to show the exact local slots for the future
  authorized CCTV frame/video, signal timing JSON, and detector output.
- If an authorized `live-input.v1` JSON envelope is available, POST it to the
  same route to validate replay readiness, recommendation routing, and operator
  workflow status without persisting the sample. The POST response also returns
  an `operatorWorkflow` summary with the policy scorecard contract endpoint,
  selected policy, confidence, required inputs, and blocked reasons.
- For a local file-based check against the same route, run:

  ```bash
  npm run real-sample:check -- --offline <live-input-envelope.json>
  npm run real-sample:check -- <live-input-envelope.json>
  ```

  The `--offline` form checks replay-ready shape, fixture/synthetic or
  placeholder/mock/example/demo provenance, low-confidence detections, stale
  signal snapshots, and conflicting queue axes without a running web server.
  The second form keeps the local web server running and POSTs to
  `/api/real-sample-drop-in`; pass a second URL argument if validating against
  a different local endpoint.
- Low-confidence detections are routed to `manual_review_required` even when
  the envelope can be normalized and replayed; the route returns the required
  input hint `higher_confidence_detection` instead of trusting the
  recommendation.
- Stale signal snapshots are routed to `manual_review_required` with
  `fresh_signal_snapshot`; emergency plus long-waiting pedestrian conflicts
  keep `emergency_priority` visible but require `operator_conflict_review`.
- Vehicle queues over threshold on both north/south and east/west movement
  axes are routed to `manual_review_required` with
  `signal_phase.remaining_seconds`, matching the local policy safety hold.
- Payloads whose sample identifiers still contain `fixture`, `synthetic`,
  `placeholder`, `mock`, `example`, or `demo` are routed to
  `manual_review_required` with `authorized_real_sample_identifiers`; fixture
  or template evidence cannot be passed off as an authorized real sample.
- Point out that the export also records policy-scorecard-derived operator
  workflow statuses and the full set of scorecard-backed backend policies, not
  autonomous signal control.
- Open `/api/final-local-readiness` when you need the single reconciled view:
  local rehearsal is ready, real-sample validation remains blocked on
  authorized CCTV/signal samples, and the next required inputs are listed.
- Open `/api/real-sample-intake-package` when you need the exact authorized
  sample submission package: required `live-input.v1` fields, guardrails,
  prohibited inputs, and POST steps.
- Open `/api/live-input-submission-schema` when the sample provider needs the
  machine-readable replay-ready JSON Schema before POSTing an authorized
  envelope.
- Open `/api/policy-scorecard-contract` when you need to show the inspectable
  local contract directly: policy names, required evidence fields, supported
  operator statuses, decision order, scoring constants, and the
  operator-decision-support boundary.
- Open `/api/llm-explanation-contract` when you need to show that LLM output is
  allowed to explain and review local policy evidence, but is not allowed to
  choose signal plans, override local policy recommendations, or invent live
  CCTV/signal evidence.
- Use the `Evidence JSON` link on that card to open the same
  `/api/demo-evidence-export` payload without leaving the dashboard.

### 12. Show OpenAI Explanation Evaluation

Show: `OpenAI Explanation Evaluation`.

Point out:

- `gpt-5.5`
- `3/3 criteria passed`
- `response text present`
- criterion list:
  - `Simulation-only boundary`
  - `No real signal control`
  - `Policy evidence grounding`

Say:

> The LLM layer is not trusted blindly. We check whether the explanation keeps
> the simulation-only boundary, avoids claiming real signal control, and grounds
> itself in policy evidence. The local `/api/llm-explanation-contract` endpoint
> states the same boundary without making an OpenAI call.

### 13. Run Live Recheck

Action: click `Live recheck`.

Expected:

- Button temporarily shows `Checking`.
- Card returns to `Live recheck`.
- Criteria remain `3/3 criteria passed`.
- `response text present` remains visible.

Say:

> This button performs an operator-triggered live API recheck. The dashboard
> shows only the safe evaluation summary, not the raw model output or API key.

If the recheck fails:

- Do not keep clicking repeatedly.
- Show `runtime:readiness -- --section openai`.
- Explain that the UI is intentionally gated by key and budget readiness.

## What To Emphasize

Use these three points as the final summary:

1. The system is testable before live integration.
2. Recommendation behavior is measured across generated scenarios.
3. LLM explanations are checked by guardrails instead of trusted directly.

## What To Avoid

Avoid spending too much time on:

- Color or layout details.
- Whether the digital twin is final.
- Whether SUMO is the permanent runtime.
- OpenAI API mechanics.

Avoid saying:

- "This is connected to a real intersection."
- "This controls signals."
- "The AI decides automatically."
- "The LLM proved the system is safe."

## Recovery Notes

If the dashboard stays on `Loading dashboard...`:

1. Confirm the API is reachable.

   ```bash
   curl -sS http://127.0.0.1:8000/api/health
   ```

2. Open `http://localhost:3000/dashboard` instead of
   `http://127.0.0.1:3000/dashboard`.

3. If OpenAI readiness is missing, run:

   ```bash
   npm run runtime:readiness -- --section openai
   ```

If the OpenAI live recheck fails:

1. Do not expose the API key.
2. Confirm `.env.local` exists and contains the required key locally.
3. Confirm budget readiness with:

   ```bash
   npm run runtime:readiness -- --section openai
   ```

4. If `npm run runtime:readiness -- --section openai` is ready but
   `npm run demo:health` still reports `OPENAI_API_KEY` missing, restart the
   local API server so it reloads `.env.local`.

5. Continue the presentation with the already captured safe evidence:

   - `output/playwright/openai-live-recheck-desktop-card.png`
   - `output/playwright/openai-live-recheck-mobile-card.png`

## Evidence Artifacts

Use these screenshots for slides or backup proof:

- `output/playwright/synthetic-evaluation-desktop-card.png`
- `output/playwright/synthetic-failure-drilldown-desktop-card.png`
- `output/playwright/synthetic-benchmark-suite-desktop-card.png`
- `output/playwright/synthetic-edge-cases-desktop-card.png`
- `output/playwright/live-input-json-benchmark-desktop.png`
- `output/playwright/live-input-json-guardrails-desktop.png`
- `output/playwright/source-specific-adapter-desktop.png`
- `output/playwright/live-input-contract-desktop-card.png`
- `output/playwright/demo-evidence-summary-desktop.png`
- `output/playwright/demo-evidence-summary-mobile.png`
- `output/playwright/openai-live-recheck-desktop-card.png`

Use these layout JSON files only as internal validation evidence:

- `output/playwright/demo-evidence-summary-layout.json`
- `output/playwright/openai-live-recheck-desktop-layout.json`
- `output/playwright/openai-live-recheck-mobile-layout.json`

## Next Development After The Demo

After this demo is stable, the next technical upgrade should be one of these:

1. Replace the source-specific fixture with one real detector or signal sample.
2. Add a presenter-facing UI surface for local health check results.
3. Add CSV export only if a stakeholder asks for spreadsheet-based evidence.

Recommended next technical task:

> Replace the source-specific fixture payload with one real detector or signal
> sample once that source is available.
