# Live SUMO R3F Completion Plan

## Target Outcome

Complete `docs/superpowers/plans/2026-06-18-sumo-live-r3f-photoreal-completion.md`
Tasks 1-12 for a live SUMO-backed, photorealistic R3F `/dashboard`, while preserving
fixture fallback, Stage 6 evidence boundaries, and `SimulationFrameSnapshot` truth.

## Success Criteria

- Precise R3F vehicles come only from `SimulationFrameSnapshot.vehicles`.
- Density comes only from `density_segments` or clearly labeled fixture fallback.
- Live SUMO modes are config-gated and do not spawn a SUMO process per frame request.
- First-failure fixture fallback and last-good stale SUMO fallback are labeled and tested.
- R3F telemetry includes frame age, network latency, sim-to-render delay, staleness, draw calls,
  source mode, signal state, and no-overflow evidence.
- Asset manifest remains the source of truth for license, provenance, PBR, LOD, compression,
  budgets, and units.
- Final validation commands and browser proof artifacts pass before any completion claim.

## Workstreams

- [x] Worker 1: Backend SUMO runtime, provider, mapping, fallback, read/control split.
  Evidence: `npm run test:api` -> 97 passed, 1 warning; focused `tests/test_sumo_runtime.py` -> 8 passed; `git diff --check` exit 0 with LF/CRLF warnings only. Final spec and code-quality/security reviews approved.
- [x] Worker 2: Frontend frame ingestion, worker ring buffer, interpolation, telemetry.
  Evidence: focused web tests -> 3 files/78 passed and final reviewer-focused 5 files/86 passed; full web tests -> 9 files/100 passed; `npm run build:web` passed; `git diff --check` exit 0 with LF/CRLF warnings only. Final spec and code-quality/security reviews approved after scenario-scope, interpolation-boundary, and event-validation fixes.
- [x] Worker 3: R3F scene layers, PBR materials, lighting, shadows, draw-call controls.
  Evidence: focused R3F test -> 1 file/9 passed; full web tests -> 9 files/103 passed; `npm run build:web` passed; `node --check scripts/verify-r3f-dashboard.mjs` passed; `git diff --check` exit 0 with LF/CRLF warnings only. Final spec approved after shadow-verifier assertions; code-quality/security approved with final artifact-regeneration caveat.
- [x] Worker 4: Weather/CCTV overlay, camera rig, rain/wheel-spray layers, road-detail props, scene clutter.
  Evidence: focused Worker 4 web tests -> 3 files/87 passed; `npm run build:web` passed; `git diff --check` passed in fresh read-only review.
- [ ] Fresh slice reviews: spec compliance and code-quality/security/artifact hygiene.
- [ ] Final evidence collection and final-readiness review.
- [ ] Stage intended files, commit, push `origin main`, and verify refs only if all gates pass.

## Validation

- `npm run test:api`
- `npm --workspace apps/web run test`
- `npm run build:web`
- `npm run verify:r3f-assets`
- `npm run verify:r3f-dashboard`
- `npm run verify:security`
- `npm run verify`
- `git diff --check`

## Current Readiness Notes

- Python security remediation is resolved in source, lockfile, and the API venv: `pydantic-settings>=2.14.2`, `msgpack>=1.2.1`, and `npm run verify:security` passes.
- Headless R3F performance proof is currently `PASS_WITH_CONCERNS` when `frameTimeMs` is unmeasurable in Chromium demand-loop mode; final readiness still needs measurable frame-time proof or explicit acceptance of this concern.
- External installs/downloads for SUMO, TraCI, libsumo, Blender, glTF/KTX2 tooling, or assets
  require approval.
- GitHub settings, deploys, releases, tags, and `archive/` changes require approval.
