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
| Ephemeral Playwright/test output | `test-results/`, `playwright-report/`, `coverage/`, `.nyc_output/` | Ignore by default. Regenerate locally when debugging or reviewing. |
| Local scratch output | `tmp/`, `output/`, `.superpowers/` | Ignore by default. Do not promote to proof without an explicit stage acceptance reason. |

## Stage Acceptance Rule

A stage proof bundle must identify the stage, verifier command, generated timestamp, and known boundary. For the R3F dashboard, screenshots prove browser-rendered runtime behavior only. They do not prove live SUMO/Tarcl binding or real signal control.

## Cleanup Rule

Do not delete, move, or rewrite tracked proof artifacts without explicit approval. If a verifier generates new local artifacts during investigation, leave them ignored unless the primary agent accepts them as the current stage evidence.
