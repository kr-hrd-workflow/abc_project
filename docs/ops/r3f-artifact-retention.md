# R3F Artifact Retention

## Policy

The R3F dashboard proof artifacts are evidence, not source inputs. Keep generated output ignored by default, then commit only the canonical artifacts that are required to prove an accepted stage.

## Artifact Classes

| Class | Examples | Retention rule |
|---|---|---|
| Canonical stage proof | `artifacts/r3f-dashboard-desktop.png`, `artifacts/r3f-dashboard-mobile.png`, `artifacts/r3f-dashboard-desktop-canvas.png`, `artifacts/r3f-dashboard-mobile-canvas.png`, `artifacts/r3f-dashboard-mobile-overlays.png`, `artifacts/r3f-dashboard-webgl-off.png` | Commit only when the artifact is acceptance evidence for a named stage and the matching details JSON is produced by the same verifier run. |
| Asset proof | `artifacts/r3f-stage4.1-asset-realism-contact-sheet.png`, `artifacts/r3f-stage4.1-glb-turntable-contact-sheet.png` | Preserve as canonical proof for the accepted asset stage unless a later approved stage replaces it with new evidence. |
| Details JSON | `artifacts/r3f-dashboard-details.json` | Commit only with matching browser screenshots for the accepted stage. Do not treat stale JSON as proof by itself. |
| Security gates JSON | `artifacts/r3f-security-gates.json` | Commit with the final readiness evidence when `npm run verify:security` is part of stage acceptance. |
| Performance and visual gates | `npm run verify:r3f-performance`, `npm run verify:r3f-visual-diff` | These commands consume the same dashboard details JSON and screenshots. They do not create a separate canonical proof bundle by default. |
| Ephemeral Playwright/test output | `test-results/`, `playwright-report/`, `coverage/`, `.nyc_output/` | Ignore by default. Regenerate locally when debugging or reviewing. |
| Local scratch output | `tmp/`, `output/`, `.superpowers/` | Ignore by default. Do not promote to proof without an explicit stage acceptance reason. |

## Stage Acceptance Rule

A stage proof bundle must identify the stage, verifier command, generated timestamp, and known boundary. For the R3F dashboard, screenshots prove browser-rendered runtime behavior only. They do not prove live SUMO/Tarcl binding or real signal control.

For post-Stage-6 R3F proof, the details JSON must include source mode,
frame-bound state, fallback/stale reason, signal state, no-overflow evidence,
draw calls, visible vehicle count, frame age, network latency,
sim-to-render delay, authoritative Hz, authoritative tick drift, frame
staleness, shadow enabled state, shadow caster count, FPS/frame-time samples,
normal/peak draw-call evidence, quality preset, postFX chain, heavy-feature
state, and visual-scenario status. The details JSON is accepted only when
produced by the same successful `npm run verify:r3f-dashboard` run as the
canonical screenshots. If a renderer-owned field is not exposed yet, the
details JSON must keep that value `null` and include an explicit source/reason
label instead of fabricating the value.

## Cleanup Rule

Do not delete, move, or rewrite tracked proof artifacts without explicit approval. If a verifier generates new local artifacts during investigation, leave them ignored unless the primary agent accepts them as the current stage evidence.

If a verifier fails after overwriting canonical artifacts, mark those artifacts
as failed evidence and regenerate them with a passing verifier run before
staging. Do not promote partial details JSON, timeout screenshots, or
screenshots whose source labels do not match the details JSON.
