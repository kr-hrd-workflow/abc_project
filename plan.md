# Plan: Smart Intersection MVP Final State

Status: completed and locally verified (2026-07-12)

## Target Outcome

Leave the Smart Intersection repository as an evidence-backed operator
decision-support MVP with a reproducible local gate and honest runtime
boundaries.

## Completed Scope

- Next.js/React operator dashboard and FastAPI service for `normal`,
  `emergency`, `pedestrian`, and `blocked` scenarios.
- R3F digital twin as the default renderer, with source/stale/fallback labels,
  WebGL fallback, canonical browser proof, telemetry, and visual gates.
- SUMO/TraCI-backed `/api/simulation/frame` vehicle and pedestrian frames.
- Recommendation scorecards, synthetic replay/evaluation, evidence exports,
  health/readiness checks, and guarded OpenAI explanation paths.
- Stable `live-input.v1` boundary for future detector and signal-source
  adapters to reuse the existing replay/evaluation pipeline.
- Archived Unreal/Pixel Streaming exploration under
  `archive/unreal/original/`; it is not the active renderer.

## Acceptance Gates

- `npm run verify`
- `.github/workflows/r3f-dashboard-verify.yml`
- GitHub CodeQL workflow
- `git diff --check`
- clean tracked worktree after the final documentation commit

## Product Boundaries

- The product supports operator decisions; it does not control traffic
  signals.
- Fixture, simulation, R3F, generated, ambient, and fallback data are not live
  CCTV truth.
- `/api/simulate-signal` comparison metrics remain scenario fixture evidence,
  not live TraCI optimization results.
- Live OpenAI, vision, SUMO, and pgvector readiness depends on the configured
  local environment.

## Remaining External Blocker

A replay-ready real sample still requires approved detector and signal data
from the same intersection plus operator-confirmed camera/ROI-to-approach
calibration. Do not guess these fields or describe the current adapters as a
completed live integration.

## Resume Rule

Resume feature work only when an authorized real sample is available or a
concrete defect is found. Route a real sample through the existing
`live-input.v1` normalizer, replay/evaluation, dashboard evidence, export,
health, and documentation flow. Otherwise keep the MVP frozen and perform
maintenance only.

## Finalization Evidence

- Local `npm run verify` passed on 2026-07-12: 232 API tests passed with one
  skipped, 435 web tests passed, four policy-contract tests passed, and the
  production build completed.
- The passing R3F proof reported 468 peak draw calls out of a 900 budget and 95
  visible vehicles. Visual scenarios and WebGL fallback proof passed.
- Frame time remains intentionally labeled unmeasurable in the headless static
  demand-loop proof; draw calls, triangles, telemetry, and raw rAF data are
  recorded instead.
- npm and Python dependency audits passed with no known vulnerabilities, and
  the workspace secret scan reported no findings.
- Local `scratchpad/` evidence is preserved but excluded from Git. Stale test
  output and temporary files were removed.
- GitHub R3F Dashboard Verify and CodeQL workflows remain the remote acceptance
  gates for every final `main` commit.
