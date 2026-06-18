# SUMO Live R3F Photoreal Completion Implementation Plan

> **For the implementing agent:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan.

Authoring date: 2026-06-18

Source feedback: `C:\Users\100ri\Downloads\deep-research-report (1).md`

Baseline plan: `docs/superpowers/plans/2026-06-16-r3f-photoreal-dashboard-simulation.md`

Scope: implement every feedback item from the research report for the existing `/dashboard` R3F renderer and simulation-frame pipeline. Stage 6 readiness remains the completed baseline. This plan covers the next implementation and improvement work needed to move from fixture-backed R3F readiness to live SUMO-backed, photoreal, performance-gated operation.

## Goal

Deliver a live SUMO-backed `/api/simulation/frame` provider, frontend frame ingestion/interpolation, photoreal R3F upgrades, asset-pipeline hardening, and CI/browser proof without weakening the current fixture fallback or Stage 6 evidence gates.

The important invariant is simple: precise rendered vehicles must come from `SimulationFrameSnapshot.vehicles`. Aggregate density can come from `density_segments` or clearly labeled fixture fallback. Do not invent vehicle truth in R3F.

## Non-Negotiable Boundaries

- Keep `build_fixture_simulation_frame()` as the golden fallback, deterministic regression baseline, local development path, incident fallback, and demo mode.
- Do not remove or relabel existing fixture evidence as live truth.
- Do not claim live CCTV, real signal control, deployment, production monitoring, branch protection, releases, or tags.
- Keep live SUMO mode behind configuration until it has deterministic test proof, browser proof, and fallback proof.
- Do not start a new SUMO process per `/api/simulation/frame` request.
- Separate read-only frame access from privileged controls such as step, reset, and phase override.
- Do not widen unrelated archive or Unreal work. `archive/` stays untouched.
- Ask before adding external binary/tooling requirements that change the environment, including SUMO, libsumo, gltfpack, KTX2 encoders, or third-party asset downloads.
- Ask before commit, push, merge, deploy, release, tag, account changes, or any external side effect.

## Existing Baseline

- `apps/api/app/core/config.py` defines `sumo_simulation_mode` with default `fixture`.
- `apps/api/app/api/routes.py` exposes `/api/simulation/frame` and currently returns `build_fixture_simulation_frame()` with request-specific arguments.
- `apps/api/app/domain/simulation_snapshot.py` defines `SimulationFrameSnapshot`.
- `apps/api/app/services/simulation_snapshot.py` builds deterministic fixture snapshots.
- `apps/web/lib/api.ts` exposes `getSimulationFrame()`.
- `apps/web/lib/simulationSnapshot.ts` mirrors the frame contract.
- `apps/web/components/DashboardRoute.tsx` loads `simulationFrame`.
- `apps/web/components/r3f/buildSceneSnapshot.ts` maps frame data to R3F scene data.
- `apps/web/components/r3f/R3FSimulationViewport.tsx` prefers `SimulationFrameSnapshot` when available and labels fallback honestly.
- `apps/web/components/r3f/SimulationCanvas.tsx` has sRGB, ACES, exposure tuning, draw-call budget telemetry, and `renderer.shadowMap.enabled = false`.
- `apps/web/public/simulation/r3f/assets/manifest.json` is the current asset source of truth.
- `scripts/verify-r3f-assets.mjs`, `scripts/verify-r3f-dashboard.mjs`, and `scripts/verify-security-gates.mjs` are the existing verification gates.

## Feedback Coverage Map

| Feedback item | Covered by |
| --- | --- |
| Real SUMO/TraCI backend instead of fixture-only `/api/simulation/frame` | Tasks 1-4 |
| Keep fixture snapshots as golden fallback/regression baseline | Tasks 1, 4, 10 |
| Add `apps/api/app/services/sumo_runtime.py` | Task 1 |
| Provider abstraction around `build_fixture_simulation_frame()` | Task 2 |
| `settings.sumo_simulation_mode` switch | Task 2 |
| Development/debug TraCI, server/operation libsumo path | Task 1 |
| Warm scenario runtime/session lifecycle, step cursor, TTL cache | Task 1 |
| Last-good-frame cache, downgrade to fixture when needed | Task 4 |
| No per-request SUMO process | Tasks 1, 4 |
| Map SUMO vehicle, TLS, lane, queue, density, event values to `SimulationFrameSnapshot` | Task 3 |
| Auth/networking/timing/read-vs-control split | Task 5 |
| Authoritative 5-10 Hz simulation tick, recommended 10 Hz | Tasks 1, 6 |
| Render 60 FPS with 100-200 ms interpolation buffer | Task 6 |
| Frontend live frame ingestion with polling or SSE/WebSocket | Task 6 |
| Worker-fed ring buffer in `apps/web/workers/simulationFrameWorker.ts` | Task 7 |
| Main thread keeps latest two authoritative frames | Task 7 |
| Interpolation by `sim_time_seconds` and signal step-edge switching | Task 7 |
| Frame staleness overlay and telemetry | Tasks 6, 7, 11 |
| Keep `data-r3f-*` proof attributes | Tasks 6, 7, 11 |
| Enable photoreal material upgrades | Task 8 |
| HDRI/IBL day/cloudy/rain/night presets | Task 8 |
| Reintroduce shadows incrementally with whitelist/contact shadows | Task 9 |
| Keep draw-call budget 250; normal target <=180 | Tasks 9, 11 |
| Far traffic as instanced silhouettes or billboard/decal; near vehicles as GLB hero/near LOD | Tasks 8, 9 |
| Postprocessing color grading, subtle bloom, vignette, grain; stronger rain/night effects only | Task 8 |
| Wet road/rain/night PBR pipeline | Task 8 |
| Manifest remains single source of truth | Task 10 |
| Asset pipeline: Blender export, glTF validate, resize, meshopt/draco, KTX2, manifest regenerate, visual QA, merge | Task 10 |
| Source/license rules: Poly Haven safest, Fab/Megascans recheck, Sketchfab only with explicit rights | Task 10 |
| Texture/LOD/web budgets | Task 10 |
| R3F scene graph refactor into stable layers | Task 8 |
| Only `DynamicVehicleLayer` is worker-fed | Tasks 7, 8 |
| Desktop/mobile performance targets and telemetry | Task 11 |
| Simulation correctness tests | Tasks 1-4 |
| Visual validation and browser proof | Task 11 |
| Recommended SIM-01 through SIM-10 tickets | Tasks 1-11 |

## Implementation Tasks

### Task 1: Add Warm SUMO Runtime Service

Files:

- Create `apps/api/app/services/sumo_runtime.py`
- Create `apps/api/tests/test_sumo_runtime.py`
- Modify `apps/api/app/core/config.py`
- Modify `apps/api/tests/test_schema.py`
- Modify `docs/runtime-setup.md`

Steps:

- Extend `sumo_simulation_mode` to support exactly:
  - `fixture`
  - `sumo_traci`
  - `sumo_libsumo`
- Add settings for SUMO runtime without changing the default:
  - `sumo_binary_path: str | None = None`
  - `sumo_config_dir: str | None = None`
  - `sumo_runtime_ttl_seconds: int = 300`
  - `sumo_authoritative_hz: int = 10`
  - `sumo_frame_cache_ttl_ms: int = 1000`
  - `sumo_interpolation_delay_ms: int = 150`
- Implement a scenario-keyed runtime/session manager:
  - keeps one warm runtime per scenario
  - tracks `scenario_id`, `mode`, `step_index`, `sim_time_seconds`, `last_access_monotonic`
  - evicts sessions after `sumo_runtime_ttl_seconds`
  - exposes `get_or_create_session(scenario_id)`
  - exposes `read_frame(scenario_id)` without creating a new SUMO process per request
  - exposes a private `_step_to_latest_authoritative_tick()` path controlled by the service, not by public GET requests
- Implement adapter loading so `sumo_traci` imports `traci` lazily and `sumo_libsumo` imports `libsumo` lazily.
- Make missing SUMO Python modules or binaries fail with a typed runtime error that Task 4 can convert into fallback behavior.
- Document that `sumo_traci` is for development/debug GUI flows, while `sumo_libsumo` is preferred for server operation where GUI is not needed.

Acceptance:

- Unit tests prove session reuse for repeated frame reads.
- Unit tests prove TTL eviction.
- Unit tests prove `sumo_authoritative_hz` accepts 5-10 Hz and defaults to 10 Hz.
- Unit tests prove missing SUMO dependencies produce a typed error, not an unhandled import failure.
- No route test or service test starts a real SUMO process unless explicitly marked as an integration test and skipped by default when SUMO is unavailable.

### Task 2: Introduce Simulation Frame Provider Abstraction

Files:

- Create `apps/api/app/services/simulation_frame_provider.py`
- Modify `apps/api/app/api/routes.py`
- Modify `apps/api/tests/test_simulation_snapshot.py`
- Modify `apps/api/tests/test_runtime_readiness.py`
- Modify `apps/api/tests/test_runtime_readiness_cli.py`

Steps:

- Add a provider interface with `build_frame(scenario_id, observation, event_reads) -> SimulationFrameSnapshot`.
- Implement `FixtureSimulationFrameProvider` by delegating to `build_fixture_simulation_frame()`.
- Implement `SumoSimulationFrameProvider` by delegating to `sumo_runtime.read_frame(scenario_id)`.
- Add `get_simulation_frame_provider(settings)`:
  - `fixture` returns fixture provider
  - `sumo_traci` returns SUMO provider using TraCI adapter
  - `sumo_libsumo` returns SUMO provider using libsumo adapter
- Update `/api/simulation/frame` to select the provider by `settings.sumo_simulation_mode`.
- Preserve current fixture response shape exactly for fixture mode.
- Preserve current route-missing fallback behavior on the web side.

Acceptance:

- Existing fixture snapshot tests continue to pass unchanged or with only provider-aware assertions.
- New route tests prove `fixture` mode returns `source="simulation_snapshot_fixture"` or the current equivalent fixture source label.
- New route tests prove `sumo_traci` and `sumo_libsumo` call the SUMO provider instead of `build_fixture_simulation_frame()`.
- Runtime readiness tests report configured mode without claiming live truth when mode is `fixture`.

### Task 3: Map SUMO State Into `SimulationFrameSnapshot`

Files:

- Modify `apps/api/app/services/sumo_runtime.py`
- Create `apps/api/tests/test_sumo_snapshot_mapping.py`
- Modify `apps/api/app/domain/simulation_snapshot.py` only if the existing schema lacks required fields.
- Modify `apps/web/lib/simulationSnapshot.ts` only if the backend schema changes.

Steps:

- Map SUMO values into the current frame contract:
  - simulation time to `sim_time_seconds`
  - vehicle ID list to `vehicles[].id`
  - vehicle position to `vehicles[].x_meters` and `vehicles[].y_meters`
  - heading/angle to `vehicles[].heading_degrees`
  - speed to `vehicles[].speed_mps`
  - waiting time to `vehicles[].waiting_seconds`
  - road/lane ID to `vehicles[].lane_id`
  - vehicle type policy to `vehicles[].vehicle_type`
  - emergency policy from vehicle type, route, or ID to `vehicle_type="emergency"` and `emergency=true`
  - traffic light state to `signals[]`
  - lane/edge occupancy and counts to `density_segments[]`
  - inbound stop-line queues to `queues`
  - threshold/rule detections to `events[]`
- Keep coordinate-unit names explicit. Do not remove `_meters`, `_mps`, or `_seconds` semantics.
- Define deterministic derivation rules:
  - queue threshold: stopped or near-stopped vehicles within configured stop-line distance
  - density threshold: edge/lane occupancy buckets matching existing `density_segments` consumer needs
  - event threshold: emergency detected, queue spillback, blocked lane, high wait, or stale frame
- Add tests using fake TraCI/libsumo client objects instead of real SUMO.
- If schema expansion is required, update both Python and TypeScript types in one slice and add compatibility tests.

Acceptance:

- Mapping tests prove every listed SUMO value lands in the expected frame field.
- Emergency tagging is deterministic and documented.
- Signals are absent or `unavailable` only when SUMO provides no TLS state.
- Density remains aggregate; it is not converted into fake precise vehicles.
- Frontend TypeScript tests compile against any schema changes.

### Task 4: Add Last-Good-Frame Cache And Honest Fallback

Files:

- Modify `apps/api/app/services/sumo_runtime.py`
- Modify `apps/api/app/services/simulation_frame_provider.py`
- Modify `apps/api/tests/test_sumo_runtime.py`
- Modify `apps/api/tests/test_simulation_snapshot.py`
- Modify `apps/web/components/r3f/R3FSimulationViewport.tsx`
- Modify `apps/web/components/r3f/buildSceneSnapshot.ts`
- Modify `apps/web/components/DashboardShell.test.tsx`

Steps:

- Cache the most recent valid `SimulationFrameSnapshot` per scenario.
- On SUMO runtime error:
  - return last good frame when available
  - mark source/status metadata as stale, for example `source="sumo_last_good"` if schema permits
  - include `frame_age_ms` or equivalent telemetry if schema permits
- If no last good frame exists:
  - downgrade to `FixtureSimulationFrameProvider`
  - preserve fixture source label
  - do not claim live SUMO
- Add a typed fallback reason for verifier and UI inspection.
- Keep fallback copy visible in the dashboard source badge or overlay.

Acceptance:

- Tests prove first SUMO failure without cache returns fixture fallback.
- Tests prove SUMO failure after a valid live frame returns last-good frame.
- Tests prove fallback labels are distinct from live SUMO labels.
- R3F data attributes distinguish:
  - live SUMO frame
  - last-good stale SUMO frame
  - fixture fallback
- Existing fixture fallback tests remain valid.

### Task 5: Split Read-Only Frame Access From Privileged Controls

Files:

- Modify `apps/api/app/api/routes.py`
- Create or modify `apps/api/app/api/dependencies.py` if the project already has auth helpers.
- Create `apps/api/tests/test_simulation_frame_auth.py`
- Modify `docs/launch-runbook.md`
- Modify `docs/runtime-setup.md`

Steps:

- Keep `GET /api/simulation/frame` read-only.
- Add no public step/reset/phase override in the first implementation slice unless there is an existing auth/rate-limit pattern to reuse.
- If control routes are added later, reserve these paths and permissions:
  - `POST /api/simulation/session/{scenario_id}/step`
  - `POST /api/simulation/session/{scenario_id}/reset`
  - `POST /api/simulation/session/{scenario_id}/signal-phase`
- Require scenario read permission for frame reads if the project already has a permission layer.
- Require admin-only access for step/reset/phase override once those endpoints exist.
- Rate-limit privileged control endpoints before enabling them.
- Scope runtime sessions to scenario/session ownership, not global anonymous control.

Acceptance:

- Tests prove frame reads cannot mutate simulation step state directly.
- Tests prove privileged controls are absent or permission-gated.
- Docs state that signal override is not real-world signal control.
- No UI text claims real signal control.

### Task 6: Add Live Frame Ingestion And Staleness Telemetry

Files:

- Modify `apps/web/lib/api.ts`
- Modify `apps/web/components/DashboardRoute.tsx`
- Modify `apps/web/components/DashboardShell.tsx`
- Modify `apps/web/components/r3f/R3FSimulationViewport.tsx`
- Modify `apps/web/components/r3f/SimulationOverlays.tsx`
- Modify `apps/web/components/DashboardShell.test.tsx`
- Modify `apps/web/lib/api.test.ts`

Steps:

- Start with polling unless a repo-standard SSE/WebSocket helper already exists.
- Poll `getSimulationFrame(scenarioId)` at the authoritative rate, default 10 Hz.
- Use `sumo_interpolation_delay_ms` or frontend constant default 150 ms.
- Add telemetry fields to R3F viewport attributes:
  - `data-r3f-frame-age-ms`
  - `data-r3f-network-latency-ms`
  - `data-r3f-sim-to-render-delay-ms`
  - `data-r3f-authoritative-hz`
  - `data-r3f-frame-stale`
- Keep existing attributes:
  - `data-r3f-simulation-ready`
  - `data-r3f-snapshot-source`
  - `data-r3f-frame-bound`
  - `data-r3f-renderer-mode`
  - `data-r3f-photoreal-stage`
  - `data-r3f-corridor-length-meters`
  - `data-r3f-traffic-density-mode`
  - `data-r3f-signal-state`
  - `data-r3f-scenario-id`
  - `data-r3f-queue-source`
  - `data-r3f-visible-vehicle-count`
  - `data-r3f-glb-vehicle-count`
  - `data-r3f-street-shadow-count`
  - `data-r3f-vehicle-silhouette-part-count`
- Add an overlay state for stale frames without blocking the existing safety copy.
- Treat stale live frame as degraded live source, not as fresh truth.

Acceptance:

- Unit tests prove polling starts only for dashboard scenarios that need live frames.
- Unit tests prove route-missing errors still fall back without noisy failures.
- Unit tests prove stale frame telemetry appears when no fresh frame arrives.
- Browser verifier captures new telemetry in `artifacts/r3f-dashboard-details.json`.

### Task 7: Add Worker-Fed Ring Buffer And Double-Buffer Interpolation

Files:

- Create `apps/web/workers/simulationFrameWorker.ts`
- Create `apps/web/workers/simulationFrameWorker.test.ts` or add equivalent worker tests in the existing web test pattern.
- Create `apps/web/components/r3f/useInterpolatedSimulationFrame.ts`
- Modify `apps/web/components/r3f/R3FSimulationViewport.tsx`
- Modify `apps/web/components/r3f/buildSceneSnapshot.ts`
- Modify `apps/web/components/DashboardShell.test.tsx`

Steps:

- Worker responsibilities:
  - receive backend JSON frames
  - validate minimum frame shape
  - normalize timestamps and source labels
  - maintain a small ring buffer
  - post the latest two authoritative frames to the main thread
- Main-thread responsibilities:
  - keep only the latest two authoritative frames needed for interpolation
  - sample render time as `now - interpolationDelayMs`
  - interpolate vehicle position, heading, speed, and waiting time between previous and next frames
  - switch signal states only on authoritative step edges
  - never interpolate a signal state midway between colors
  - surface stale or missing next frame to Task 6 telemetry
- Preserve density semantics:
  - precise vehicles interpolate only from `vehicles[]`
  - `density_segments[]` can update at authoritative frame edges or use conservative blending only as aggregate density
  - fixture density remains labeled fixture fallback
- Keep `DynamicVehicleLayer` as the only worker-fed scene region after Task 8 layer refactor.

Acceptance:

- Tests prove interpolation uses `sim_time_seconds`.
- Tests prove signal state changes only at frame boundary.
- Tests prove missing next frame freezes or extrapolates for a bounded window, then marks stale.
- Tests prove density segments are not converted into precise vehicles.
- R3F viewport remains deterministic for fixture tests.

### Task 8: Refactor R3F Scene Layers And Upgrade Photoreal Materials/Lighting

Files:

- Modify `apps/web/components/r3f/SimulationScene.tsx`
- Modify `apps/web/components/r3f/LightingRig.tsx`
- Modify `apps/web/components/r3f/ProceduralIntersection.tsx`
- Modify `apps/web/components/r3f/Stage5SceneAssets.tsx`
- Modify `apps/web/components/r3f/TrafficDensityLayer.tsx`
- Modify `apps/web/components/r3f/SignalHardware.tsx`
- Modify `apps/web/components/r3f/WeatherAndAtmosphere.tsx`
- Modify `apps/web/components/r3f/roadMaterials.ts`
- Create `apps/web/components/r3f/EnvironmentLayer.tsx`
- Create `apps/web/components/r3f/StaticRoadLayer.tsx`
- Create `apps/web/components/r3f/DynamicVehicleLayer.tsx`
- Create `apps/web/components/r3f/SignalLayer.tsx`
- Create `apps/web/components/r3f/OverlayLayer.tsx` only if it removes real complexity from the scene root.
- Modify `apps/web/components/r3f/SimulationCanvas.test.tsx`

Steps:

- Refactor scene ownership toward:
  - `SceneRoot`
  - `EnvironmentLayer`
  - `LightingLayer`
  - `StaticRoadLayer`
  - `DynamicVehicleLayer`
  - `SignalLayer`
  - `AtmosphereLayer`
  - `OverlayLayer`
- Keep static road, buildings, props, lighting, and atmosphere stable so frame updates do not rerender the whole scene.
- Upgrade materials to `MeshStandardMaterial` or `MeshPhysicalMaterial` where appropriate:
  - asphalt with normal/roughness variation
  - wet asphalt with wetness scalar
  - painted lane markings with worn/decal variation
  - vehicle paint with clearcoat-like response
  - glass with transmission/opacity/roughness tuned for WebGL2
  - painted metal for poles/fixtures
  - signal lenses with emissive color and subtle bloom eligibility
- Add HDRI/IBL presets:
  - day
  - cloudy
  - rain
  - night
- Prefer `@react-three/drei` `Environment` only if it is already installed or approved.
- If environment assets are needed, use Poly Haven CC0 HDRIs first and record source/provenance.
- Promote existing rain-sheen/vignette/depth-field mood from fallback styling into real R3F PBR inputs.
- Postprocessing defaults:
  - color grading
  - subtle bloom
  - minimal vignette
  - weak film grain
- Rain/night-only postprocessing:
  - selective bloom
  - SSR only if performance proof passes
  - volumetric fog only if performance proof passes
- Avoid strong chromatic aberration. Use only very weak chromatic aberration if visual proof shows benefit.
- TAA/TRAA is desktop-first only and must be checked for temporal artifacts with the current frameloop behavior.

Acceptance:

- Unit tests prove scene layers render without losing existing telemetry.
- Browser screenshots show improved material readability without dark/blank canvas regressions.
- New HDRI/source assets are listed in the manifest and provenance docs.
- Draw-call budget remains peak <=250.
- Fixture and live frame paths both render through the same scene layers.

### Task 9: Reintroduce Shadows Incrementally With A Whitelist

Files:

- Modify `apps/web/components/r3f/SimulationCanvas.tsx`
- Modify `apps/web/components/r3f/LightingRig.tsx`
- Modify `apps/web/components/r3f/Stage5SceneAssets.tsx`
- Modify `apps/web/components/r3f/DynamicVehicleLayer.tsx`
- Modify `apps/web/components/r3f/SignalLayer.tsx`
- Modify `apps/web/components/r3f/SimulationCanvas.test.tsx`
- Modify `scripts/verify-r3f-dashboard.mjs`

Steps:

- Enable shadows only after a whitelist exists.
- Shadow casters in first slice:
  - near/operator-relevant vehicles
  - traffic signal poles
  - signal heads
  - streetlights
- Use contact shadows or limited real shadow casters for grounding.
- Far traffic and density traffic use fake/contact shadow treatment, not full shadow casting.
- Track:
  - `data-r3f-shadow-enabled`
  - `data-r3f-shadow-caster-count`
  - existing `data-r3f-street-shadow-count`
  - draw calls
  - frame time or verifier-observed performance
- Keep `STAGE5_DRAW_CALL_BUDGET = 250` unless there is a deliberate future budget change with evidence.
- Target normal draw calls <=180 and peak <=250.

Acceptance:

- Tests prove `renderer.shadowMap.enabled` is true only when the whitelist feature gate is active.
- Tests prove shadow caster count is bounded.
- Dashboard verifier fails when shadow caster count or draw calls exceed configured thresholds.
- Browser proof shows vehicles/signals are grounded without mobile frame-budget failure.

### Task 10: Harden Asset Pipeline, Licensing, Compression, And Budgets

Files:

- Modify `apps/web/public/simulation/r3f/assets/manifest.json`
- Modify `apps/web/public/simulation/r3f/assets/textures/PROVENANCE.md`
- Modify `docs/compliance/r3f-asset-licenses.md`
- Modify `docs/technotes/polyhaven-cc0-licensed-asset-integration.md`
- Modify `scripts/verify-r3f-assets.mjs`
- Modify `scripts/optimize-r3f-assets.mjs`
- Modify `package.json`
- Modify `.github/workflows/r3f-dashboard-verify.yml`

Steps:

- Keep the asset manifest as the single source of truth for:
  - source URL or local generation note
  - license
  - author
  - units
  - PBR channel coverage
  - LOD tier
  - texture size
  - triangle budget
  - compression status
  - provenance evidence path
- Codify the addition pipeline:
  - Blender export
  - glTF validation
  - `gltf-transform resize`
  - meshopt or draco compression
  - KTX2 texture transform
  - manifest regeneration
  - visual QA screenshot
  - verifier merge
- Add npm scripts only after tool availability is confirmed or approved:
  - `verify:r3f-gltf`
  - `optimize:r3f-assets`
  - `verify:r3f-asset-provenance`
- Source policy:
  - Poly Haven CC0 is preferred for HDRI and tileable textures.
  - Fab/Megascans can be used only after license terms are checked for this repo and redistribution path.
  - Sketchfab can be used only when commercial use, modification, and redistribution are explicitly allowed and recorded.
- Web budget policy:
  - hero vehicle texture <=2K
  - near/medium/far LOD chain for vehicle classes
  - distant silhouettes for far traffic
  - low-visibility assets <=1K or lower
  - road/sidewalk use tileable or atlas material
  - static props may use AO bake
  - avoid excessive directional bake that conflicts with real-time lighting
  - combine real-time light, AO bake, and refined roughness/normal maps
- Loader policy:
  - use `GLTFLoader`
  - add `DRACOLoader` and `KTX2Loader` only with verified assets and approved packages/tooling
  - stay WebGL2 for this cycle
  - treat WebGPU as future research only

Acceptance:

- `npm run verify:r3f-assets` fails on missing source, license, units, compression status, or provenance.
- Optimized assets remain under budget and render in browser proof.
- Asset docs distinguish generated reference images from runtime-shipped assets.
- No asset with unclear redistribution rights is shipped.

### Task 11: Add Performance, Correctness, Visual, And Browser Gates

Files:

- Modify `scripts/verify-r3f-dashboard.mjs`
- Create `scripts/verify-r3f-performance.mjs` if the existing dashboard verifier becomes too large.
- Create `scripts/verify-r3f-visual-diff.mjs` if golden-image diff is not cleanly inside the existing verifier.
- Modify `package.json`
- Modify `.github/workflows/r3f-dashboard-verify.yml`
- Modify `docs/ops/r3f-artifact-retention.md`
- Modify `docs/release/r3f-stage-checklist.md`
- Modify `docs/technotes/r3f-photoreal-dashboard-renderer.md`
- Modify `artifacts/r3f-dashboard-details.json` only as generated verifier output.

Steps:

- Add telemetry collection for:
  - FPS
  - CPU frame time
  - GPU frame time when measurable
  - draw calls
  - triangles
  - texture memory when measurable
  - JS heap when available
  - WebGL context loss count
  - visible vehicle count
  - frame staleness
  - authoritative tick drift
  - `frameAgeMs`
  - `networkLatencyMs`
  - `simToRenderDelayMs`
- Performance targets:
  - desktop 60 FPS
  - desktop average frame time <=16.7 ms
  - normal draw calls <=180
  - peak draw calls <=250
  - mobile >=30 FPS
  - mobile average frame time <=33 ms
- Correctness tests:
  - `SimulationFrameSnapshot` contract tests
  - deterministic scenario snapshot tests
  - SUMO scenario regression tests skipped when SUMO is unavailable
  - queue derivation tests
  - signal derivation tests
  - event derivation tests
- Visual validation:
  - Playwright screenshots for desktop `/dashboard`
  - Playwright screenshots for mobile `/dashboard`
  - canvas-only proof
  - WebGL-off fallback proof
  - nonblank long-corridor R3F canvas proof
  - same seed/same sim frame golden-image diff
- Dashboard detail artifact must include:
  - telemetry summary
  - source mode
  - frame-bound state
  - fallback/stale reason
  - signal state
  - no-overflow evidence
  - draw calls
  - visible vehicle count
  - shadow caster count
  - frame age
  - network latency
  - sim-to-render delay
- Artifact retention docs must define which new artifacts are committed and which are ignored.

Acceptance:

- `scripts/verify-r3f-dashboard.mjs` fails on blank canvas, source-label mismatch, stale-live-without-label, overflow, draw-call budget breach, missing telemetry, or missing signal proof.
- Generated `artifacts/r3f-dashboard-details.json` is inspectable and deterministic enough for review.
- CI runs new gates where tooling is available.
- Local final validation has explicit exit codes.

### Task 12: Documentation, Safety Copy, And Release Checklist Updates

Files:

- Modify `docs/technotes/r3f-photoreal-dashboard-renderer.md`
- Modify `docs/ops/r3f-artifact-retention.md`
- Modify `docs/release/r3f-stage-checklist.md`
- Modify `docs/launch-runbook.md`
- Modify `docs/runtime-setup.md`
- Modify `docs/superpowers/plans/2026-06-16-r3f-photoreal-dashboard-simulation.md` only to cross-link this successor plan, not to rewrite completed Stage 6 evidence.

Steps:

- Document source modes:
  - fixture
  - live SUMO TraCI
  - live SUMO libsumo
  - last-good stale SUMO
  - fixture fallback after live failure
- Document operator-facing safety copy:
  - simulation visualization
  - not live CCTV
  - not real signal control
  - source badge visible
  - stale/fallback mode visible
- Document external install gates:
  - SUMO binary/Python package
  - libsumo package
  - gltf-transform
  - meshopt/gltfpack
  - KTX2 encoder
  - any asset download source
- Update release checklist with new checks and stop conditions.
- Keep Stage 6 checklist intact and add a new post-Stage-6 section rather than rewriting history.

Acceptance:

- Docs do not claim live CCTV, real signal control, deployment, production monitoring, Stage 7 readiness, releases, or tags.
- Docs show fixture fallback as intentional and supported.
- Runbook explains how to operate fixture mode and live SUMO mode separately.
- Release checklist requires browser proof and telemetry proof before any readiness claim.

## Review And Worker Plan

Use the primary agent as coordinator.

- Implementation worker 1: backend SUMO runtime, provider abstraction, mapping, fallback. Own Tasks 1-4.
- Implementation worker 2: frontend ingestion, worker buffer, interpolation, telemetry. Own Tasks 6-7.
- Implementation worker 3: R3F materials, lighting, layers, shadows. Own Tasks 8-9.
- Implementation worker 4: asset pipeline, verifier, docs. Own Tasks 10-12.
- Reviewer 1: spec-compliance review after each worker completes a slice.
- Reviewer 2: code-quality/security/artifact-hygiene review after any file changes and before commit.
- Final-readiness reviewer: fresh review after all evidence is collected.

Do not run multiple workers against the same file at the same time. If Tasks 6-9 overlap in `R3FSimulationViewport.tsx` or `SimulationScene.tsx`, sequence those edits or split ownership by file.

## Validation Commands

Run relevant commands after each slice and the full set before any readiness claim:

```powershell
npm run test:api
npm --workspace apps/web run test
npm run build:web
npm run verify:r3f-assets
npm run verify:r3f-dashboard
npm run verify:security
npm run verify
git diff --check
```

Add these commands only after the corresponding scripts exist:

```powershell
npm run verify:r3f-performance
npm run verify:r3f-visual-diff
npm run verify:r3f-gltf
npm run optimize:r3f-assets -- --check
```

Browser proof required before final approval:

- desktop `/dashboard`
- mobile `/dashboard`
- canvas-only screenshot/proof
- WebGL-off fallback proof
- nonblank long-corridor R3F canvas proof
- `artifacts/r3f-dashboard-details.json` with telemetry/source/signal/no-overflow evidence
- live SUMO mode proof when SUMO is installed and configured
- fixture fallback proof when SUMO is unavailable or forced to fail
- last-good-frame stale proof after a simulated SUMO runtime failure

## Blockers And Approval Gates

Stop and ask for the smallest approval needed if any of these are required:

- installing SUMO, TraCI, libsumo, Blender, gltf-transform, gltfpack, KTX2 encoders, or new npm/Python packages
- downloading third-party assets
- accepting or changing asset license terms
- adding GitHub settings, branch protection, releases, or tags
- deployment or production monitoring vendor setup
- committing, pushing, merging, or force-pushing
- modifying `archive/`

If SUMO is unavailable, implement and verify fixture mode, fake-client mapping tests, fallback logic, and browser proof. Mark live SUMO integration as BLOCKED only for the missing external install/config proof, with exact command/output evidence.

## Done Criteria

- Every feedback item in the coverage map has a checked implementation task or a documented blocker with exact missing proof.
- Fixture mode remains deterministic and fully verified.
- Live SUMO mode returns real `SimulationFrameSnapshot` data when SUMO is configured.
- Runtime failures return last-good frame or honest fixture fallback.
- `/dashboard` ingests live frames, interpolates motion, and labels stale/fallback state.
- R3F realism improves through PBR materials, HDRI/IBL, wet-road controls, postprocessing, and bounded shadows.
- Asset manifest/provenance/compression gates enforce source, license, budget, and runtime renderability.
- Performance and browser verifiers produce inspectable artifacts.
- Security gates continue to pass.
- No UI or docs claim live CCTV, real signal control, deployment, or readiness beyond the proven scope.

## Final Report Required Fields

After implementation, report these fields with concrete values:

- Status: `PASS` or `BLOCKED`.
- Changed files: every changed path with a one-sentence purpose.
- Validation: each required command, exact exit code, and the key pass/fail line.
- Browser/artifact proof: desktop dashboard path, mobile dashboard path, canvas-only proof path, WebGL-off fallback proof path, long-corridor nonblank canvas proof path, and `artifacts/r3f-dashboard-details.json`.
- Telemetry summary: source mode, `frameBound`, `frameAgeMs`, `networkLatencyMs`, `simToRenderDelayMs`, `signalState`, `visibleVehicleCount`, `drawCalls`, and `shadowCasterCount`.
- Reviewer verdicts: spec-compliance, code-quality/security/artifact-hygiene, and final-readiness.
- Remaining risks: every accepted risk with the exact reason it remains.
- Commit/push: state `not performed` unless the user explicitly approved commit/push in that implementation turn.
