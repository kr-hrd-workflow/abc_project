# R3F Photoreal Dashboard Renderer

## Decision

R3F is the active dashboard renderer path. The runtime is implemented through Stage 5 browser visual proof, with Stage 6A frame-backed renderer state, Stage 6B signal-state hardware and operator overlays, Stage 6C default verification gates, and Stage 6E manifest-backed runtime asset utilization now present in the repo.

Unreal/Pixel Streaming remains archived.

SUMO/TraCI/Tarcl is simulation truth.

The browser renderer can interpolate received state but cannot invent traffic truth.

Image Gen references are visual targets, not runtime evidence.

## Renderer Boundary

SUMO/TraCI/Tarcl remains simulation truth. Browser rendering may interpolate received state, but it cannot invent traffic truth or perform real signal control.

Renderer precedence for the `/dashboard` simulation viewport:

1. External renderer: `NEXT_PUBLIC_SIMULATION_STREAM_URL` iframe remains highest priority.
2. Legacy renderer: `NEXT_PUBLIC_UNITY_WEBGL_URL` only when the generic stream URL is absent.
3. Default renderer: internal R3F digital twin when enabled and WebGL is available.
4. Fallback renderer: existing CSS/canvas virtual CCTV when R3F is disabled, unavailable, or WebGL fails.

Photorealistic rendering remains required. Runtime evidence must come from actual browser-rendered R3F screenshots, not from Image Gen references or archived Unreal proof.

## Status Vocabulary

| Term | Meaning |
|---|---|
| implemented | Code or documentation exists and is wired locally. |
| verified | Fresh local tests, build, browser proof, or docs checks passed. |
| gated | Included in `npm run verify` and the checked-in R3F dashboard workflow. |
| not live truth | Fixture, aggregate, or received simulation state is being rendered; the browser is not a SUMO/Tarcl authority. |

## Current Evidence Status

| Stage | Status | Evidence and boundary |
|---|---|---|
| Stage 1 R3F island | implemented, verified | Browser-only R3F island is the internal renderer when enabled and WebGL is available. |
| Stage 2 frame contract | implemented, verified, not live truth | `/api/simulation/frame`, `getSimulationFrame()`, and `SimulationFrameSnapshot` exist. |
| Stage 3 geometry and density | implemented, verified, not live truth | Procedural roads and density rendering exist; aggregate or fixture data remains labeled. |
| Stage 4/4.1 assets and materials | implemented, verified, gated | Asset manifest, shipped GLBs/textures, proof images, and `verify:r3f-assets` enforce the asset bar. |
| Stage 5 browser proof | implemented, verified, gated, not live truth | `/dashboard` browser screenshots and verifier artifacts prove runtime rendering, not live traffic control. |
| Stage 6A frame wiring | implemented, verified, not live truth | R3F prefers `buildSceneSnapshot(simulationFrame)` and labels frame-backed versus fixture fallback state. |
| Stage 6B dynamic signals | implemented, verified, not live truth | `SignalHardware` and `SimulationOverlays` render received signal state or explicit `unavailable`. |
| Stage 6C default gates | implemented, verified, gated | Root `npm run verify` and `.github/workflows/r3f-dashboard-verify.yml` include R3F asset and dashboard proof. |
| Stage 6D docs reconciliation | implemented, verified | README, runbook, technote, and plan now use implemented/verified/gated wording without production-ready claims. |
| Stage 6E runtime assets, compression checks, and licensing | implemented, verified, gated, not live truth | Manifest-backed assets are used by explicit ID in the runtime scene; optimizer, asset verifier, web build, and browser proof passed locally. |
| Stage 6F operations, telemetry, security, and artifact hygiene | implemented, verified | Dashboard telemetry is captured in browser proof, no-install security checks run, blocked external tooling is reported explicitly, and artifact/release hygiene docs exist. |

## Stage 4 And 4.1 Asset Pipeline Evidence

Stage 4 adds the asset-kit pipeline only. Stage 4.1 upgrades that kit from verifier-valid primitives to realism-ready shipped assets. Neither stage changes the Stage 2/3 `SimulationFrameSnapshot` truth boundary or the procedural renderer handoff.

Asset contract:

- Manifest: `apps/web/public/simulation/r3f/assets/manifest.json`
- Typed helper: `apps/web/components/r3f/assetManifest.ts`
- Verifier: `scripts/verify-r3f-assets.mjs`
- Runtime GLBs: `apps/web/public/simulation/r3f/assets/glb/`
- Runtime textures and decals: `apps/web/public/simulation/r3f/assets/textures/`

Every manifest entry records a stable ID, runtime path, kind, source, license, meter units, PBR flag, LOD, maximum texture size, maximum triangle budget, and maximum file-size budget. Stage 4.1 entries also record realism metadata: `realismStatus="stage4_1_ready"`, `visualRejectIfToyLike=true`, vehicle silhouette/detail fields, prop scale/functional parts, and texture/decal material features plus provenance.

The verifier fails on invalid JSON, missing files, paths outside `/simulation/r3f/assets/`, archive paths, missing source/license fields, budget violations, non-power-of-two texture dimensions without an explicit exception, missing lower-detail vehicle options, near/hero assets without `pbr=true`, placeholder-style names, missing Stage 4.1 realism metadata, GLB node/material banned names, GLB names that contradict wheel/glass/light/body-panel/mirror metadata, weak near-vehicle triangle floors, far LOD triangle counts that are not lower than their source LODs, missing proof PNGs, and first-pass GLB + texture payloads at or above 25 MB.

## Stage 4.1 GLB Sources And Optimization

The Stage 4.1 GLBs are project-authored assets generated locally for this repository. No external downloads, purchases, stock models, paid asset stores, or archived Unreal assets were used.

The upgraded GLB kit includes:

- Passenger car near, medium, and far LODs
- Taxi near and far LODs
- Bus near and far LODs
- Truck near and far LODs
- Emergency ambulance near and medium LODs
- Traffic signal pole, traffic signal heads, streetlight, tree cluster, and curb details

Vehicle GLBs now include named wheels, tire/hub materials, glass, lights, panel breaks, mirrors where required, and type-specific traffic cues such as taxi roof signs, bus window rows, truck cab/cargo separation, and ambulance lightbars/markings. Prop GLBs now include street-scale signal mast/arms, separate signal lenses and hoods, streetlight emitter geometry, a separated multi-tree cluster, and curb detail geometry for drains, chips, pavers, bollards, seams, and grime.

All GLBs are meter-scale, y-up, GLB 2.0 assets with embedded binary buffers and no external URIs. Current GLBs are authored as repo-shipped binary GLB payloads; future optimization should continue to use glTF Transform-compatible assets and keep meshopt decoder assumptions aligned with the runtime loader. Current Drei `useGLTF` includes a Meshopt decoder path; any future raw `GLTFLoader` path must set a Meshopt decoder before loading meshopt-compressed assets.

The verifier parses concrete GLB files and checks file size, GLB header/version/declared length, triangle counts from mesh accessors, embedded image dimensions when present, node/material naming evidence, and LOD triangle ordering. Current Stage 4.1 GLBs have no embedded images; material color/PBR metadata is authored in the GLB materials, while runtime texture maps are delivered separately.

Current Stage 4.1 payload budget:

- GLB payload: 8.06 MB
- Texture/decal payload: 1.56 MB
- First-pass total: 9.62 MB / 25.00 MB

## Stage 6E Runtime Asset Utilization Evidence

Stage 6E expands runtime usage of the existing manifest-backed asset kit without changing the simulation truth boundary. Vehicles and props are loaded by explicit manifest IDs, then rendered through draw-call-bounded GLB-derived instanced silhouettes:

- First-pass families: bus, emergency ambulance, passenger car, taxi, truck, streetlight, tree cluster, and curb details
- Repeated density families: passenger car far LOD, taxi far LOD, bus far LOD, and truck far LOD
- Facade/window material panels remain instanced and visible in the browser proof
- Stage 6E runtime polish adds per-instance vehicle color variation, less toy-saturated GLB silhouette materials, softened distant-city haze, and segmented city-edge building massing

The renderer still labels aggregate or fixture-derived density as such. It does not invent precise vehicle truth and does not perform real signal control.

Stage 6E proof, final browser artifact generated at `2026-06-18T01:21:56.672Z`:

- `npm --workspace apps/web exec gltf-transform -- --version`: `4.4.0`
- `node scripts/optimize-r3f-assets.mjs --check`: all manifest payload `9.62 MB`; Stage 6E first-pass runtime payload `7.86 MB / 25.00 MB`
- `node scripts/verify-r3f-assets.mjs`: passed, first-pass GLB + texture payload `9.62 MB / 25.00 MB`
- `npm --workspace apps/web run test -- components/DashboardShell.test.tsx components/r3f/SimulationCanvas.test.tsx`: 70 tests passed
- `npm run build:web`: passed
- `node scripts/verify-r3f-dashboard.mjs`: passed with `drawCalls=94/250`, `visibleVehicleCount=160`, `glbVehicleCount=5`, `streetFurnitureShadowCount=6`, no blocking console failures, and no WebGL context-loss errors
- `git diff --check`: passed with line-ending warnings only

Fresh browser proof artifacts:

- `artifacts/r3f-dashboard-desktop.png`
- `artifacts/r3f-dashboard-mobile.png`
- `artifacts/r3f-dashboard-desktop-canvas.png`
- `artifacts/r3f-dashboard-mobile-canvas.png`
- `artifacts/r3f-dashboard-mobile-overlays.png`
- `artifacts/r3f-dashboard-webgl-off.png`
- `artifacts/r3f-dashboard-details.json`

Human-view inspection compared the fresh desktop/mobile canvas crops with the committed Stage 5 baseline. The Stage 6E crops retain the wet road and facade lighting while adding visibly broader vehicle families, denser manifest-backed traffic silhouettes with per-instance color variation, street furniture, trees, curb details, and segmented city-edge massing. This is runtime browser evidence, not Image Gen or asset-only proof.

## Stage 6F Operations Evidence

Stage 6F adds operational proof surfaces without adding a production monitoring vendor, release automation, real SUMO/Tarcl binding, or real signal control.

Runtime telemetry is published from the existing R3F canvas proof path and captured in `artifacts/r3f-dashboard-details.json`. Fresh primary-run proof generated at `2026-06-18T01:48:44.873Z` recorded:

- `renderer_mode=r3f_photoreal_stage5`
- `snapshot_source=simulation_snapshot_fixture`
- `frame_bound=true`
- `draw_call_count=94`
- `webgl_context_loss_count=0`
- `fallback_reason=null`
- `visible_vehicle_count=160`

Validation:

- `npm --workspace apps/web run test -- lib/r3fTelemetry.test.ts`: 1 test passed after the RED missing-module failure.
- `npm --workspace apps/web run test -- components/r3f/SimulationCanvas.test.tsx`: 6 tests passed after the RED missing-telemetry failure.
- `npm run verify:security`: runs moderate-or-higher npm audit gates, Python third-party dependency audit with skipped dependencies rejected, CycloneDX SBOM generation, R3F asset provenance verification, and a tracked-file secret scan; the final readiness report is written to `artifacts/r3f-security-gates.json` with `blocked_requires_tooling=[]` when the gate passes.
- `node scripts/verify-r3f-dashboard.mjs`: passed with telemetry evidence in the details JSON.
- `npm run verify`: passed API tests, web tests, web build, R3F asset verification, dashboard browser proof, security verification, and `git diff --check` with no line-ending warnings after the final-gate concern closure.

Operational docs now classify proof artifacts, details JSON, Playwright/test output, and generated scratch files. Release checklist and PR template require verification commands, browser artifacts, truth-source labels, no real signal control claim, asset license/provenance evidence, and generated-output hygiene.

## Stage 4.1 Texture And Decal Provenance

The runtime texture/decal maps are project-authored procedural assets generated locally with the repo-installed `sharp` package. The provenance note is stored at `apps/web/public/simulation/r3f/assets/textures/PROVENANCE.md`.

Image Gen was used only as non-runtime material direction for Stage 4.1. The generated reference was not copied into runtime assets and is not proof of runtime rendering quality.

Runtime maps:

- `wet_asphalt_albedo.webp`
- `wet_asphalt_roughness.webp`
- `worn_lane_markings.png`
- `crosswalk_wear.png`
- `curb_grime.png`
- `sidewalk_paver_variation.webp`
- `facade_window_emissive.webp`

These files are runtime material/decal assets, not browser-rendering proof. Image Gen remains allowed as source/target material direction, but Image Gen output by itself is not runtime evidence. Runtime proof for photoreal rendering must come from actual browser screenshots of the `/dashboard` R3F renderer, as the Stage 5 proof does.

KTX2/BasisU is intentionally not used in Stage 4 because the Next/R3F decoder path has not been separately verified for those texture formats.

## Stage 4.1 Proof Artifacts

Stage 4.1 proof artifacts:

- `artifacts/r3f-stage4.1-asset-realism-contact-sheet.png`
- `artifacts/r3f-stage4.1-glb-turntable-contact-sheet.png`

Both proof images are generated from actual shipped GLBs/textures with deterministic software projection of parsed GLB triangle geometry and actual runtime texture/decal thumbnails. They include labels, triangle/file-size or texture-dimension/file-size metadata, verifier status, and the explicit note that they are asset proof only, not Stage 5 browser-rendered scene proof.

Stage 4.1 proof images are local asset proof. Stage 5 browser screenshots provide runtime proof for the R3F renderer; these proof PNGs do not prove runtime lighting, camera, material response, or live SUMO/Tarcl binding.
