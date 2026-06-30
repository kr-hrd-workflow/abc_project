# SUMO Live Operation — Phase A Design

Authoring date: 2026-06-30

Status: design (awaiting user review before writing-plans)

Parent effort: "SUMO 엔진 실 운용 단계 업그레이드" (full production hardening), decomposed into
Phase A (this doc) → Phase B (frontend live ingestion) → Phase C (gates & operational safety).

## Goal

Make the **`normal` scenario render live SUMO traffic** (busy 강남역 arterial, buses physically
confined to the median bus-only lane) in operation, while the other three scenarios keep their
proven deterministic fixture. The code default stays `fixture`; live is the **operating** mode,
enabled by environment, and proven by a skip-aware verification gate plus an honest fallback.

This phase is backend/scenario only. No frontend rendering changes (the existing
`lane_id → median` placement already renders live median buses — verified). Deeper interpolation,
telemetry, and per-scenario live variants are Phase B/C.

## Background (verified facts)

- The live SUMO backend already exists and works: `SumoRuntimeService` (TraCI/libsumo) →
  `SimulationFrameSnapshot`, with a provider abstraction
  (`apps/api/app/services/simulation_frame_provider.py`) that falls back to the fixture and a
  last-good cache on `SumoRuntimeError`. `traci` imports in `apps/api/.venv`; `.venv/bin/sumo`
  resolves; a real boot produced a 130-vehicle frame (119 car / 6 bus / 5 truck), 4 signals, with
  **every bus already on `north_in_4` / `south_in_4` / bus-only junction connectors**.
- The median bus lane is modelled in source: `apps/api/networks/gangnam.edg.xml` sets
  `<lane index="4" allow="bus"/>` on `north_in/out`, `south_in/out`. The net is **generated** from
  `gangnam.{nod,edg,con,tll}.xml` by `apps/api/networks/build_net.sh` (netconvert).
- Default mode is `fixture` (`apps/api/app/core/config.py`). The dashboard polls
  `/api/simulation/frame?scenario_id=<id>` for one of four scenarios:
  `emergency | pedestrian | normal | blocked` (`apps/web/lib/types.ts`).

## Decisions (from brainstorming + adversarial review)

1. **Env-driven live, default stays `fixture`.** Flipping the code default was rejected: an
   adversarial run proved it fails 5 API tests (a literal `default == "fixture"` contract test plus
   import-time-bound source labels), turns the 0.75 s suite into 43.7 s by cold-booting real SUMO
   per request, and collapses the 4 scenarios into 1 in CI. Operating deployments set
   `SUMO_SIMULATION_MODE=sumo_traci`; the committed default and CI determinism are preserved.
2. **Hybrid per-scenario routing: `normal` → live, others → fixture.** With `sumo_config_dir`
   unset, every `scenario_id` would load the single `intersection.sumocfg`, so all four scenarios
   would render the identical live sim (a regression vs the fixture's differentiation). Phase A
   routes only `normal` to live SUMO and keeps `emergency`/`blocked`/`pedestrian` on the proven
   fixture. Live SUMO therefore only ever loads `intersection.sumocfg`; no per-scenario `.sumocfg`
   files are needed this phase.
3. **Bus confinement is a real net change.** Buses empirically stay on lane 4, but the general
   lanes 0–3 do not *disallow* bus, so confinement is not guaranteed. Phase A adds
   `disallow="bus"` to lanes 0–3 on the N/S edges (defense-in-depth) and a guard test, since the
   existing net-build tests do not assert it.

## Components and changes

### 1. Operating mode via environment — no code-default flip
- Keep `apps/api/app/core/config.py` `sumo_simulation_mode` default `"fixture"`.
- Document the operating default (`SUMO_SIMULATION_MODE=sumo_traci`) in the runtime/launch docs
  and `.env.example` if one exists; otherwise add an env note to `docs/runtime-setup.md`.

### 2. Hybrid scenario routing provider
- Add a `ScenarioRoutingFrameProvider` (in `simulation_frame_provider.py`) that holds a live
  provider (`SumoSimulationFrameProvider`) and the `FixtureSimulationFrameProvider`, and dispatches
  `build_frame(scenario_id, …)` by a **live-scenario allowlist defaulting to `{"normal"}`**.
- Wire it into `get_simulation_frame_provider(settings)`: when mode is live
  (`sumo_traci`/`sumo_libsumo`), return the routing provider; when `fixture`, return the fixture
  provider unchanged (today's behaviour).
- The allowlist is the single knob future phases widen to add live scenarios. (Implementation may
  use a module constant or a settings field; the value is `{"normal"}` for Phase A.)

### 3. Bus median-lane confinement (network)
- `apps/api/networks/gangnam.edg.xml`: add `disallow="bus"` to `<lane index="0|1|2|3"/>` on
  `north_in`, `north_out`, `south_in`, `south_out` (lane 4 keeps `allow="bus"`).
- Regenerate `apps/api/networks/intersection.net.xml` via `build_net.sh`.
- Extend `apps/api/tests/test_gangnam_net_build.py` with an assertion that lanes 0–3 on the four
  N/S edges disallow bus, and confirm `test_gangnam_connections_tls.py` stays green (lane-4
  through-connections + 19-char TLS link indices intact). Buses only run `*_through` (straight), so
  losing lanes 0–3 cannot strand them.

### 4. Fixture bus fix (fallback/demo path)
- `apps/api/app/services/simulation_snapshot.py` `_vehicles_for_scenario` `normal` branch: the
  `normal-west-bus-1` bus currently has `lane_id="west-inbound-1"`, `heading=90`, `x=-58, y=4`.
  Move it to a 강남대로 **median** position — `lane_id="north-inbound-4"` (or south), heading aligned
  with the N/S approach (north=180, south=0), and median `x ≈ ±1.8` with a sensible inbound `y` —
  so the frontend's 35° `headingMatchesDirection` check passes and it renders in the median rather
  than falling back to raw west-arm coordinates. `normal` routes to live in operation, so this is
  the fallback/demo truth and keeps the golden fixture honest.

### 5. Live verification gate (skip-aware)
- Add a gate (pytest `live`-marked test, or `scripts/verify-sumo-live.*` wired into npm) that, when
  SUMO is available: boots `sumo_traci` on `intersection.sumocfg` (scenario `normal`), steps to a
  steady state, and asserts `source == "sumo_traci"`, vehicle count ≥ threshold, **every bus
  `lane_id` ends in `_4` or is a bus-only connector (`:center_*`)**, and ≥1 signal present; then
  forces a `SumoRuntimeError` and asserts the honest fallback (last-good then fixture, distinctly
  labelled). It **skips, not fails**, when the SUMO binary/module is unavailable so CI stays green.

### 6. Frontend + performance validation (no frontend code change)
- Render-verify the dashboard `normal` scenario under live mode shows the live fleet with buses in
  the median lane.
- Run `verify:r3f-performance` for the ~130-vehicle live load against the ~900 draw-call budget,
  plus the other `verify:r3f-*` gates. Vehicles are instanced per (asset, material), so draw calls
  are expected to stay bounded; a regression here becomes a documented Phase-A finding (a vehicle
  cap would be Phase B), not a silent pass.

### 7. Docs
- Update the runbook/runtime docs: operating default is live via env; hybrid scenario behaviour
  (`normal` live, others fixture); how to run the live gate; fallback/last-good behaviour. Do not
  claim live CCTV or real signal control.

## Data flow

Dashboard → `GET /api/simulation/frame?scenario_id` → `get_simulation_frame_provider(settings)`:
- mode `fixture` → fixture provider (unchanged).
- mode live → `ScenarioRoutingFrameProvider`: `normal` → `SumoSimulationFrameProvider`
  (`SumoRuntimeService.read_frame` → live frame, or last-good/fixture on failure); other scenarios
  → fixture provider. Frontend renders via the existing `TrafficDensityLayer` (`lane_id`-driven
  lateral placement → buses in median).

## Error handling / fallback

Existing and unchanged: live failure → `SumoRuntimeError` → last-good cache (≤ TTL) → else fixture,
labelled `sumo_last_good` / fixture source. The new gate proves this path.

## Testing

- API suite stays green and deterministic (default unchanged = fixture).
- New unit tests: hybrid routing (`normal` → sumo provider, others → fixture provider, using fake
  clients); net `disallow="bus"` guard.
- Live gate (skip-aware) for real-SUMO + fallback proof.
- Web suite + `verify:r3f-dashboard` / `verify:r3f-performance` / `verify:r3f-visual-diff` /
  `verify:r3f-assets` / `verify:security`.

## Out of scope (Phase B / C)

- Frontend live ingestion: 10 Hz polling, worker ring buffer, double-buffer interpolation by
  `sim_time_seconds`, signal step-edge switching, staleness telemetry/overlay (Phase B).
- Live variants for `emergency` / `blocked` / `pedestrian`, including pedestrian crossings /
  walkingareas in the net (Phase B).
- Read-vs-control endpoint split, `libsumo` install, perf optimization if the live load regresses,
  deeper docs/runbook hardening (Phase C).

## Risks

- **`build_net.sh` toolchain** (`uv run --extra simulation netconvert`): must regenerate an
  equivalent net; guarded by `test_gangnam_net_build.py` + `test_gangnam_connections_tls.py`.
- **Live SUMO subprocess held by the API**: under the live env the API spawns and holds one warm
  SUMO child per live scenario (TTL 300 s), with multi-second cold-boot on first request. A real
  new runtime dependency, documented in the runbook — not a leak.
- **Junction-connector vehicles** (`:center_4_0`) have no approach word, so they bypass the
  `+1.3 m` plate calibration and fall back to raw SUMO coordinates — a minor, transient (~1.3 m)
  misregistration only while a vehicle crosses the intersection box. Accepted for Phase A;
  addressed if needed in Phase B interpolation.

## Done criteria

- Live env (`SUMO_SIMULATION_MODE=sumo_traci`) renders the `normal` scenario as live SUMO traffic
  with buses confined to the median lane; the other three scenarios render the unchanged fixture.
- Code default stays `fixture`; full API suite green and deterministic; new routing + net-guard
  tests pass; live gate passes when SUMO is present and skips cleanly when it is not.
- `verify:r3f-*` and `verify:security` pass (or a perf finding is documented, not hidden).
- Docs state the operating mode, hybrid behaviour, and fallback without overclaiming.
