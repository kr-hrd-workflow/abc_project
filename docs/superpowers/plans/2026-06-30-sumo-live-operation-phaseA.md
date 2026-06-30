# SUMO Live Operation — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `normal` scenario render live SUMO traffic with buses confined to the median bus-only lane, while the other three scenarios keep their deterministic fixture; the code default stays `fixture` (live enabled by env), proven by a skip-aware gate.

**Architecture:** Live SUMO already works through `SumoRuntimeService` + a provider abstraction with fixture/last-good fallback. Phase A (1) hard-confines buses to the median lane in the generated net, (2) fixes the `normal` fixture bus (the fallback truth) to the median, (3) adds a `ScenarioRoutingFrameProvider` that routes only `normal` to live SUMO and the rest to the fixture, and (4) adds a skip-aware live verification gate. No frontend code change — the existing `lane_id → median` placement already renders live median buses.

**Tech Stack:** Python 3.12 / FastAPI / Pydantic (`apps/api`, venv at `apps/api/.venv`), SUMO 1.27 + TraCI + sumolib, netconvert via `uv`; Next.js + R3F (`apps/web`); pytest; Playwright verify gates.

## Global Constraints

- Code default `sumo_simulation_mode` stays `"fixture"` (`apps/api/app/core/config.py`). Live is an **operating** mode via `SUMO_SIMULATION_MODE=sumo_traci` — do NOT flip the committed default (it breaks 5 tests, collapses scenarios in CI, and cold-boots SUMO per request).
- Live-scenario allowlist for Phase A is exactly `{"normal"}`. `emergency` / `pedestrian` / `blocked` must keep their existing fixture output unchanged.
- `intersection.net.xml` is a BUILT artifact — never hand-edit. Edit `gangnam.*` inputs and regenerate via `apps/api/networks/build_net.sh`.
- Buses run only `*_through` (straight) — confining them off lanes 0–3 must not strand them. Lane 4 stays `allow="bus"` (exclusive).
- The live gate must SKIP (not fail) when SUMO is unavailable, and must not run in the default `pytest` invocation (gate behind `RUN_SUMO_LIVE=1`).
- Validation gates that must stay green: `cd apps/api && .venv/bin/python -m pytest -q`; `cd apps/web && npx vitest run`; then `npm run verify:r3f-dashboard`, `verify:r3f-performance`, `verify:r3f-visual-diff`, `verify:r3f-assets`, `verify:security`.
- Do not claim live CCTV or real signal control in any copy.
- Commit only when the user has authorized it for this plan; otherwise leave changes staged-but-uncommitted and report.

---

## File Structure

- `apps/api/networks/gangnam.edg.xml` — add `disallow="bus"` to N/S general lanes (source of the built net).
- `apps/api/networks/intersection.net.xml` — regenerated artifact (via build_net.sh).
- `apps/api/tests/test_gangnam_net_build.py` — add the bus-disallow guard.
- `apps/api/app/services/simulation_snapshot.py` — relocate the `normal` fixture bus to the median.
- `apps/api/tests/test_simulation_snapshot.py` — add the fixture-bus-median assertion.
- `apps/api/app/services/simulation_frame_provider.py` — add `ScenarioRoutingFrameProvider` + wire into `get_simulation_frame_provider`.
- `apps/api/tests/test_simulation_frame_provider_routing.py` (new) — routing unit tests.
- `apps/api/tests/test_sumo_live_operation.py` (new) — skip-aware live proof.
- `docs/runtime-setup.md`, `docs/launch-runbook.md` — operating-mode + hybrid + fallback docs.

---

## Task 1: Confine buses to the median lane (network)

**Files:**
- Modify: `apps/api/networks/gangnam.edg.xml`
- Regenerate: `apps/api/networks/intersection.net.xml` (via `apps/api/networks/build_net.sh`)
- Test: `apps/api/tests/test_gangnam_net_build.py`

**Interfaces:**
- Produces: a net where `north_in/out` & `south_in/out` lanes 0–3 disallow `bus` and lane 4 stays bus-only. Consumed by live SUMO at runtime and by the gate in Task 4.

- [ ] **Step 1: Write the failing guard test**

Add to `apps/api/tests/test_gangnam_net_build.py`:

```python
def test_general_lanes_disallow_bus_on_gangnamdaero() -> None:
    net = _net()
    for edge_id in ("north_in", "north_out", "south_in", "south_out"):
        edge = net.getEdge(edge_id)
        for index in (0, 1, 2, 3):
            lane = edge.getLane(index)
            assert not lane.allows("bus"), f"{edge_id} lane {index} must disallow bus"
            assert lane.allows("passenger"), f"{edge_id} lane {index} must allow cars"
        assert edge.getLane(4).allows("bus")
        assert not edge.getLane(4).allows("passenger")
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_gangnam_net_build.py::test_general_lanes_disallow_bus_on_gangnamdaero -q`
Expected: FAIL (current net allows bus on lanes 0–3).

- [ ] **Step 3: Add `disallow="bus"` to the N/S general lanes**

In `apps/api/networks/gangnam.edg.xml`, replace each of the four 강남대로 edges so general lanes 0–3 disallow bus (lane 4 unchanged). Example for `north_in` (apply the identical 0–3 block to `north_out`, `south_in`, `south_out`):

```xml
  <edge id="north_in"  from="north_end" to="center"    numLanes="5" speed="16.67">
    <lane index="0" disallow="bus"/>
    <lane index="1" disallow="bus"/>
    <lane index="2" disallow="bus"/>
    <lane index="3" disallow="bus"/>
    <lane index="4" allow="bus"/>
  </edge>
```

Leave `east_*` and `west_*` edges untouched.

- [ ] **Step 4: Regenerate the built net**

Run: `bash apps/api/networks/build_net.sh`
Expected: rewrites `apps/api/networks/intersection.net.xml` with no netconvert error.
Fallback if `uv` is unavailable: run `apps/api/.venv/bin/netconvert` with the exact same flags listed in `build_net.sh` (node/edge/connection/tllogic files, `--default.lanewidth 3.6 --offset.disable-normalization true --no-turnarounds true`).

- [ ] **Step 5: Run the net-build + connection/TLS guards**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_gangnam_net_build.py tests/test_gangnam_connections_tls.py -q`
Expected: PASS (new bus-disallow guard passes; lane counts, lane-4 through-connections, 19-char/8-phase TLS all still pass).

- [ ] **Step 6: Commit**

```bash
git add apps/api/networks/gangnam.edg.xml apps/api/networks/intersection.net.xml apps/api/tests/test_gangnam_net_build.py
git commit -m "feat(sim): hard-confine buses to the 강남대로 median lane in the SUMO net"
```

---

## Task 2: Move the `normal` fixture bus onto the median (fallback truth)

**Files:**
- Modify: `apps/api/app/services/simulation_snapshot.py:187-196` (the `normal-west-bus-1` entry)
- Test: `apps/api/tests/test_simulation_snapshot.py`

**Interfaces:**
- Consumes: nothing new.
- Produces: `_vehicles_for_scenario("normal")` returns exactly one bus whose `lane_id` is a 강남대로 median lane (`north-inbound-4`) with an N/S heading, so the frontend's 35° heading check seats it in the median.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/tests/test_simulation_snapshot.py`:

```python
from app.services.simulation_snapshot import _vehicles_for_scenario


def test_normal_fixture_bus_rides_gangnamdaero_median_lane() -> None:
    buses = [v for v in _vehicles_for_scenario("normal") if v.vehicle_type == "bus"]
    assert len(buses) == 1
    bus = buses[0]
    assert bus.lane_id.startswith(("north-inbound", "south-inbound"))
    assert bus.lane_id.endswith("-4")  # median bus lane index
    assert bus.heading_degrees in (0.0, 180.0)  # aligned with the N/S approach
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_simulation_snapshot.py::test_normal_fixture_bus_rides_gangnamdaero_median_lane -q`
Expected: FAIL (bus is on `west-inbound-1`, heading 90).

- [ ] **Step 3: Relocate the bus to the north median**

In `apps/api/app/services/simulation_snapshot.py`, replace the `normal-west-bus-1` block (lines ~187-196) with:

```python
            SimulationVehicleSnapshot(
                id="normal-north-bus-1",
                vehicle_type="bus",
                lane_id="north-inbound-4",
                x_meters=-1.8,
                y_meters=-60.0,
                heading_degrees=180.0,
                speed_mps=5.5,
                waiting_seconds=6.0,
            ),
```

(`x=-1.8` is the median offset from the net; `y=-60` keeps clear of `normal-north-car-1` at `y=-38`; heading 180 = north inbound.)

- [ ] **Step 4: Run the test (and the snapshot suite) to verify pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_simulation_snapshot.py -q`
Expected: PASS (new test passes; existing `normal`-scenario assertions still pass — only the bus moved, count unchanged at 3 vehicles).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/simulation_snapshot.py apps/api/tests/test_simulation_snapshot.py
git commit -m "fix(sim): seat the normal-scenario fixture bus on the 강남대로 median lane"
```

---

## Task 3: Hybrid scenario routing provider (`normal` → live, others → fixture)

**Files:**
- Modify: `apps/api/app/services/simulation_frame_provider.py`
- Test: `apps/api/tests/test_simulation_frame_provider_routing.py` (create)

**Interfaces:**
- Consumes: existing `FixtureSimulationFrameProvider`, `SumoSimulationFrameProvider`, `SimulationFrameProvider` protocol, `get_simulation_frame_provider(settings)`.
- Produces: `ScenarioRoutingFrameProvider(*, live_provider, fixture_provider, live_scenario_ids)` with `build_frame(scenario_id, observation, event_reads) -> SimulationFrameSnapshot`; module constant `LIVE_SCENARIO_IDS = frozenset({"normal"})`. `get_simulation_frame_provider` returns this router in live modes.

- [ ] **Step 1: Write the failing routing test**

Create `apps/api/tests/test_simulation_frame_provider_routing.py`:

```python
from app.services.simulation_frame_provider import (
    ScenarioRoutingFrameProvider,
    get_simulation_frame_provider,
)
from app.core.config import Settings


class _RecordingProvider:
    def __init__(self, label: str) -> None:
        self.label = label
        self.seen: list[str] = []

    def build_frame(self, scenario_id, observation, event_reads):
        self.seen.append(scenario_id)
        return self.label  # sentinel; routing must not inspect the frame


def test_routing_sends_only_allowlisted_scenarios_to_live() -> None:
    live = _RecordingProvider("live")
    fixture = _RecordingProvider("fixture")
    router = ScenarioRoutingFrameProvider(
        live_provider=live,
        fixture_provider=fixture,
        live_scenario_ids={"normal"},
    )
    assert router.build_frame("normal", object(), []) == "live"
    assert router.build_frame("emergency", object(), []) == "fixture"
    assert router.build_frame("pedestrian", object(), []) == "fixture"
    assert router.build_frame("blocked", object(), []) == "fixture"
    assert live.seen == ["normal"]
    assert fixture.seen == ["emergency", "pedestrian", "blocked"]


def test_get_provider_returns_router_in_live_mode_and_fixture_otherwise() -> None:
    router = get_simulation_frame_provider(Settings(sumo_simulation_mode="sumo_traci"))
    assert isinstance(router, ScenarioRoutingFrameProvider)
    plain = get_simulation_frame_provider(Settings(sumo_simulation_mode="fixture"))
    assert not isinstance(plain, ScenarioRoutingFrameProvider)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_simulation_frame_provider_routing.py -q`
Expected: FAIL (`ImportError: cannot import name 'ScenarioRoutingFrameProvider'`).

- [ ] **Step 3: Implement the router and wire it in**

In `apps/api/app/services/simulation_frame_provider.py`, add the constant + class (near the other providers):

```python
LIVE_SCENARIO_IDS = frozenset({"normal"})


class ScenarioRoutingFrameProvider:
    """Routes allowlisted scenarios to a live provider and the rest to fixture.

    Live SUMO currently models one busy arterial (intersection.sumocfg); routing
    only `normal` to it keeps the other scenarios on their deterministic fixture
    instead of collapsing all four onto the same live sim.
    """

    def __init__(
        self,
        *,
        live_provider: SimulationFrameProvider,
        fixture_provider: SimulationFrameProvider,
        live_scenario_ids,
    ) -> None:
        self._live_provider = live_provider
        self._fixture_provider = fixture_provider
        self._live_scenario_ids = frozenset(live_scenario_ids)

    def build_frame(self, scenario_id, observation, event_reads):
        provider = (
            self._live_provider
            if scenario_id in self._live_scenario_ids
            else self._fixture_provider
        )
        return provider.build_frame(scenario_id, observation, event_reads)
```

Then in `get_simulation_frame_provider`, replace the live branch so the SUMO provider is wrapped in the router:

```python
        fallback_provider = FixtureSimulationFrameProvider()
        if settings.sumo_simulation_mode == "fixture":
            provider: SimulationFrameProvider = fallback_provider
        else:
            live_provider = SumoSimulationFrameProvider(
                runtime=SumoRuntimeService(settings),
                fallback_provider=fallback_provider,
                frame_cache_ttl_ms=settings.sumo_frame_cache_ttl_ms,
            )
            provider = ScenarioRoutingFrameProvider(
                live_provider=live_provider,
                fixture_provider=fallback_provider,
                live_scenario_ids=LIVE_SCENARIO_IDS,
            )
        _PROVIDER_CACHE[cache_key] = provider
        return provider
```

- [ ] **Step 4: Run the routing tests to verify pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_simulation_frame_provider_routing.py -q`
Expected: PASS.

- [ ] **Step 5: Run the full API suite (no regressions, default still fixture)**

Run: `cd apps/api && .venv/bin/python -m pytest -q`
Expected: PASS (all previously-passing tests stay green; default mode unchanged means no real SUMO spawns).

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/services/simulation_frame_provider.py apps/api/tests/test_simulation_frame_provider_routing.py
git commit -m "feat(sim): route only the normal scenario to live SUMO, keep others on fixture"
```

---

## Task 4: Skip-aware live verification gate

**Files:**
- Test: `apps/api/tests/test_sumo_live_operation.py` (create)

**Interfaces:**
- Consumes: `SumoRuntimeService`, `Settings`, `resolve_binary_path`. (Fallback-on-error proof is already covered by the existing provider tests in `tests/test_simulation_snapshot.py` — do not duplicate.)
- Produces: an opt-in integration proof that real SUMO yields a busy `normal` frame with buses on the median.

- [ ] **Step 1: Write the skip-aware live test**

Create `apps/api/tests/test_sumo_live_operation.py`:

```python
import importlib.util
import os

import pytest

from app.core.binaries import resolve_binary_path
from app.core.config import Settings
from app.services.sumo_runtime import SumoRuntimeService


def _live_enabled() -> bool:
    if not os.environ.get("RUN_SUMO_LIVE"):
        return False
    return (
        importlib.util.find_spec("traci") is not None
        and resolve_binary_path("sumo") is not None
    )


pytestmark = pytest.mark.skipif(
    not _live_enabled(),
    reason="set RUN_SUMO_LIVE=1 with SUMO + traci installed to run the live proof",
)


def test_live_normal_frame_is_busy_with_buses_confined_to_median() -> None:
    service = SumoRuntimeService(Settings(sumo_simulation_mode="sumo_traci"))
    # warm the sim past the empty start so vehicles populate the arterial
    for _ in range(6):
        service.read_frame("normal")
        session = service.get_or_create_session("normal")
        for _ in range(40):
            service._step_to_latest_authoritative_tick(session)
    frame = service.read_frame("normal")

    assert frame.source == "sumo_traci"
    assert len(frame.vehicles) >= 30
    assert len(frame.signals) >= 1

    buses = [v for v in frame.vehicles if v.vehicle_type == "bus"]
    assert buses, "expected buses in the busy normal scenario"
    for bus in buses:
        assert bus.lane_id.endswith("_4") or bus.lane_id.startswith(":center"), (
            f"bus {bus.id} left the median lane: {bus.lane_id}"
        )
```

- [ ] **Step 2: Verify it SKIPS by default**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_sumo_live_operation.py -q`
Expected: `1 skipped` (no `RUN_SUMO_LIVE`).

- [ ] **Step 3: Verify it PASSES against real SUMO**

Run: `cd apps/api && RUN_SUMO_LIVE=1 .venv/bin/python -m pytest tests/test_sumo_live_operation.py -q`
Expected: PASS — `source=sumo_traci`, ≥30 vehicles, ≥1 signal, every bus on `*_4` / `:center*`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/tests/test_sumo_live_operation.py
git commit -m "test(sim): add skip-aware live SUMO proof (busy normal + buses on median)"
```

---

## Task 5: Operating-mode + hybrid + fallback documentation

**Files:**
- Modify: `docs/runtime-setup.md`, `docs/launch-runbook.md`

**Interfaces:** none (docs only).

- [ ] **Step 1: Document the operating mode and hybrid behaviour**

In `docs/runtime-setup.md`, add a "SUMO operating mode" subsection stating:
- Code default is `fixture` (deterministic, offline, CI). To run live, set `SUMO_SIMULATION_MODE=sumo_traci` (requires the `sumo` binary + `traci`; `.venv/bin/sumo` ships with the `apps/api` venv).
- Hybrid scenarios: in live mode, only `normal` is served by live SUMO (busy 강남대로 with buses on the median bus lane); `emergency` / `pedestrian` / `blocked` continue to serve the deterministic fixture.
- Fallback: on any SUMO runtime error the API serves the last-good frame (≤ TTL) then the fixture, labelled `sumo_last_good` / `simulation_snapshot_fixture`. This is a simulation visualization — not live CCTV or real signal control.
- Live proof: `cd apps/api && RUN_SUMO_LIVE=1 .venv/bin/python -m pytest tests/test_sumo_live_operation.py -q`.

In `docs/launch-runbook.md`, add the env var to the live-operation startup steps and note the warm SUMO subprocess (one per live scenario, TTL 300 s, multi-second first-request cold boot).

- [ ] **Step 2: Commit**

```bash
git add docs/runtime-setup.md docs/launch-runbook.md
git commit -m "docs(sim): document SUMO live operating mode, hybrid scenarios, and fallback"
```

---

## Task 6: Live render + performance validation (validation only)

**Files:** none (runs gates; reverts any regenerated artifact noise before finishing).

**Interfaces:** none.

- [ ] **Step 1: Renderer load + visual gates**

Run from repo root:
```bash
cd apps/web && npx vitest run
cd /home/chan/abc_project && npm run verify:r3f-dashboard && npm run verify:r3f-performance && npm run verify:r3f-assets && npm run verify:security
```
Expected: vitest green; dashboard PASS; performance PASS / PASS_WITH_CONCERNS (headless rAF) with draw calls under budget for the busy fleet (~95–130 vehicles); assets ≤ budget; security no findings. `verify:r3f-visual-diff` should pass within baseline thresholds (the fixture-bus move and net change don't alter the default dashboard scene) — rebaseline ONLY if an intentional visual diff appears and is confirmed.

- [ ] **Step 2: Live integration screenshot (real API, not the photoreal harness)**

The photoreal render harness injects its own fixture, so it can't prove live SUMO. Instead, run the real stack:
```bash
# terminal 1: live API
cd apps/api && SUMO_SIMULATION_MODE=sumo_traci .venv/bin/uvicorn app.main:app --port 8000
# terminal 2: web pointed at it
cd apps/web && NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run start -- --port 3030
```
Then capture `/dashboard` for the `normal` scenario (Playwright or the existing screenshot helper) and confirm: a busy fleet (~tens of vehicles, not 3), buses sitting in the median bus lane on 강남대로, signals present. Save the screenshot under `scratchpad/` (not committed).

- [ ] **Step 3: Revert any regenerated gate artifacts**

Run: `git status --short` and `git checkout -- artifacts/ apps/web/next-env.d.ts` if the gates dirtied them (nondeterministic noise, not deliverables).

- [ ] **Step 4: Report**

Summarize: each gate's pass/fail line, the live screenshot path, vehicle count, bus-lane confirmation, and any accepted risk (e.g. `:center_*` junction transient). No commit (validation only).

---

## Self-Review

- **Spec coverage:** §1 env-driven mode → Task 5 (+ Global Constraints pin the no-flip). §2 hybrid routing → Task 3. §3 bus confinement + guard → Task 1. §4 fixture bus fix → Task 2. §5 live gate → Task 4 (fallback proof delegated to existing `test_simulation_snapshot.py` provider tests, cited). §6 frontend + perf validation → Task 6. §7 docs → Task 5. All spec sections map to a task.
- **Placeholder scan:** no TBD/TODO; every code/edit step shows concrete code and exact commands.
- **Type consistency:** `ScenarioRoutingFrameProvider(*, live_provider, fixture_provider, live_scenario_ids)` and `LIVE_SCENARIO_IDS` are used identically in Task 3's test and implementation; `_vehicles_for_scenario` import matches the module; net lane indices (0–3 disallow, 4 allow) match Task 1's test and edge edits.

## Execution Handoff

Two execution options:
1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks.
2. **Inline Execution** — execute tasks in this session with executing-plans, batched with checkpoints.
