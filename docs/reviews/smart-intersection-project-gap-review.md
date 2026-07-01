# Smart Intersection Project Gap Review

Date: 2026-07-01

## Review Trigger

Implementation should pause when additional work only expands synthetic
evidence without reducing the real project blocker. The current local demo is
feature-rich enough for rehearsal, but the next meaningful validation step is
not another synthetic suite. It is an authorized real detector or signal sample
that can enter the existing `live-input.v1` path.

## Current Honest State

The project is a local Smart Intersection operator decision-support MVP. It
does not directly control real traffic signals.

Implemented and locally evidenced:

- Backend recommendation policy emits explicit scorecard-style evidence for
  safety gates, emergency clearance, queue relief, pedestrian efficiency, and
  normal-cycle decisions.
- Unknown emergency direction no longer guesses a priority lane; it returns an
  all-red safety hold with required input evidence.
- Synthetic and `live-input.v1` JSON suites cover emergency, blocked,
  congestion/queue relief, pedestrian efficiency, normal flow, and noisy
  guardrail cases.
- Dashboard reports expose benchmark, guardrail, source-adapter, real-sample
  readiness, policy-scorecard, and LLM explanation-boundary evidence.
- Local endpoints exist for export and handoff:
  `/api/demo-evidence-export`, `/api/final-local-readiness`,
  `/api/real-sample-intake-package`, `/api/live-input-submission-schema`,
  `/api/policy-scorecard-contract`, `/api/llm-explanation-contract`, and
  `/api/real-sample-drop-in`.
- `npm run real-sample:check -- --offline <live-input-envelope.json>` can
  preflight an authorized sample without requiring the web server.

Recent validation evidence recorded in `plan.md` includes:

- `apps/api/.venv/bin/pytest apps/api/tests`: 156+ passed, 2 skipped in the
  latest backend policy phase, with broader project evidence later recording
  164 passed, 2 skipped.
- `npm run test:web`: latest recorded full web suites passed.
- `npm run build:web`: latest recorded builds passed.
- `npm run demo:health`: recorded as passing after the readiness/export
  surfaces were added.

## Real Blocker

The current blocker is external evidence, not local code structure.

Public-data probing found:

- ITS CCTV metadata and HLS URLs were discoverable, but direct stream access for
  the first stream returned `401`.
- ITS `trafficInfo` returned data with `createdDate=20201130144001`, so the
  `apiKey=test` response is likely a sample or stale public example.
- Seoul V2X signal remaining-time access returned `403` without an appropriate
  Seoul/T-DATA API key.

The project therefore still lacks an authorized bundle containing:

- one CCTV frame or short video sample, or detector output derived from it
- one signal phase/remaining-time snapshot from the same time window
- provenance showing the sample is authorized for this local validation
- enough timestamp/location metadata to avoid presenting fixture or synthetic
  data as live truth

## Problems If We Keep Coding Blindly

1. Synthetic pass rates are saturated.
   More generated cases can make the dashboard look stronger without proving
   real-world readiness.

2. The demo surface can outgrow the evidence.
   The UI now has many proof cards and exports. Without real sample input, the
   next additions risk becoming presentation polish rather than validation.

3. Backend and frontend policy logic can drift.
   The backend policy lives in `apps/api/app/services/recommendations.py`.
   Synthetic evaluation and dataset expectations live in
   `apps/web/lib/syntheticEvaluation.ts` and
   `apps/web/lib/syntheticLiveInputDataset.ts`. Contract tests reduce risk, but
   duplicated policy shape is still a maintenance cost.

4. Public API access is not solved by code.
   Seoul V2X and ITS stream validation require valid access credentials or a
   provided sample. More local adapters cannot replace that.

5. LLM checks should stay secondary.
   The LLM can explain and review local policy evidence. It should not become
   the decision source or be used to compensate for missing detector/signal
   evidence.

## Recommended Decision Gates

### Gate A: Authorized Sample Available

Proceed with real-sample validation.

Required steps:

1. Convert the sample into `live-input.v1`.
2. Run:

   ```bash
   npm run real-sample:check -- --offline <live-input-envelope.json>
   npm run real-sample:check -- <live-input-envelope.json>
   ```

3. Inspect blocked reasons, required inputs, selected policy, and replay-ready
   status.
4. Update demo evidence, runbook, and readiness export only after the sample
   passes or produces a useful manual-review result.

### Gate B: No Authorized Sample

Stop adding scenario families or dashboard cards.

Recommended output:

- present the current system as local evaluation and adapter-readiness
- explicitly state that real CCTV/signal validation is blocked
- use `/api/final-local-readiness` and `/api/real-sample-intake-package` as the
  handoff artifacts
- avoid new OpenAI calls unless a specific explanation-evaluation check is
  requested

### Gate C: Code Work Still Needed Before Sample

Only work on maintenance that reduces future integration risk.

Recommended tasks:

- consolidate or document the shared policy contract so backend and frontend
  policy names, priority order, and scoring constants cannot drift
- add a small contract test around any new policy reason code before changing
  dashboard text
- keep evidence language honest: fixture, synthetic, or local-only data must
  stay labeled as such

Current maintenance evidence:

- `npm run policy-contract:check` compares backend recommendation constants
  from `apps/api/app/services/recommendations.py` with the web contract in
  `apps/web/lib/policyScorecardContract.ts`.
- `npm run test:policy-contract` verifies that the checker fails on policy
  order drift, scoring-constant drift, and required-evidence-field drift.
- The root `npm run verify` flow now runs `npm run policy-contract:check`
  before web tests and build, so drift is caught during the standard local
  verification path.

## Recommended Next Work

The next meaningful project step is not another benchmark. It is one of:

1. Acquire or request the authorized sample bundle described above.
2. If the sample is unavailable, freeze feature expansion and prepare the final
   presentation around the current boundary.
3. If local code must continue, do a narrow policy-contract consolidation task
   and validate it with backend/frontend contract tests.

## Stop Rule

Stop implementation and re-review when the next proposed task does not satisfy
at least one of these conditions:

- it validates an authorized real sample
- it reduces backend/frontend policy drift
- it strengthens the truth boundary between synthetic, fixture, and real data
- it fixes a failing test, build, health check, or documented presentation risk
