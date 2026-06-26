# Plan: Day plate + Task 9 vehicle-quality redo (from scratch)

## Target outcome
- Day scene becomes photoreal (daytime Gangnam plate), not the procedural blockout city.
- Task 9 redone from scratch: vehicles look photoreal/acceptable on BOTH plates (day + night). Current crude procedural silhouettes / blockout cars are rejected by the user ("차량 품질 마음에 안 듦").

## Success criteria
- `gangnam_day_operator_wide.png` plate exists (same operator-wide composition as night), mounted on the day path.
- Vehicles read as photoreal and correctly positioned (SUMO truth: position/heading/type) on both plates — not toy/blockout.
- All gates pass: `verify:r3f-assets`, `test:web`, `verify:r3f-dashboard`, `verify:r3f-visual-diff` (re-baseline if needed), `build:web`.
- Browser day + night proofs reviewed and accepted by the user.

## Key files
- Plate mount: `BackgroundPlateLayer.tsx` (night-only gate line 71), `plateManifest.ts`, `seamlessGrade.ts`
- Vehicles: `TrafficDensityLayer.tsx`, `Stage5SceneAssets.tsx`, `NightVehicleTreatment.tsx`, `stage6VehicleLod.ts`
- Manifest/compliance: `manifest.json`, `docs/compliance/r3f-asset-licenses.md`, `verify-r3f-assets.mjs`
- imagegen: `codex exec` (image_gen)

## Phases
1. **Decide vehicle-quality approach** (ultra design panel) — evaluate: render real GLBs properly vs imagegen top-down sprite billboards vs CC0 photoreal GLBs vs better-procedural. Pick by quality / truth-preservation / perf / CI / effort. [USER picks]
2. **Day plate image** — codex img2img from night plate → daytime; review. [long pole]
3. **Mount day plate** — manifest + compliance; plateManifest day entry; BackgroundPlateLayer day path + DAY_GRADE; gates.
4. **Implement chosen vehicle approach** (ultra) — rebuild vehicle rendering; verify on both plates; adversarial review.
5. **Validation** — full pipeline green + browser proofs (day + night) reviewed.

## State / decisions
- ultracode ON: orchestrate with workflows + adversarial verify; imagegen via codex with human review.
- Part A (runtime color palettes, per-instance id-hash variety) is DONE + green but UNCOMMITTED — vehicle quality redo supersedes it; keep palettes only if the chosen approach reuses runtime tinting.
- DO NOT recolor GLB baseColorFactor (no-op at runtime — see memory r3f-vehicle-color-is-runtime-palette).
- DO NOT change getInboundLaneOffset (lane-center math is test-enforced to visible lanes).
- Plate is screen-space projected (BackgroundPlateLayer dome+ground shaders); day plate must match night composition for proxy alignment.

## Open questions
- Phase 1 output: which vehicle-quality approach. Needs user decision before Phase 4.
