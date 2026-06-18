from collections.abc import Generator
import threading

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.services.simulation_frame_provider as frame_provider_module
from app.db.models import Base
from app.db.session import get_session
from app.main import app
from app.core.config import Settings
from app.scenarios.data import EMERGENCY_SCENARIO
from app.services.simulation_frame_provider import (
    FixtureSimulationFrameProvider,
    SumoSimulationFrameProvider,
    get_simulation_frame_provider,
)
from app.services.simulation_snapshot import build_fixture_simulation_frame
from app.services.sumo_runtime import SumoRuntimeError, SumoRuntimeService

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_session() -> Generator[Session, None, None]:
        with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_emergency_simulation_frame_exposes_typed_fixture_snapshot(
    client: TestClient,
) -> None:
    response = client.get("/api/simulation/frame?scenario_id=emergency")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "simulation_snapshot_fixture"
    assert payload["intersection_id"] == "INT-0001"
    assert payload["scenario_id"] == "emergency"
    assert payload["sim_time_seconds"] == 0
    assert payload["captured_at"] == "2026-06-08T10:24:30+09:00"
    assert payload["bounds_meters"] == {
        "north": -160.0,
        "south": 140.0,
        "east": 160.0,
        "west": -160.0,
    }
    assert payload["queues"] == {"north": 32, "south": 11, "east": 18, "west": 8}
    assert set(payload) == {
        "source",
        "intersection_id",
        "scenario_id",
        "sim_time_seconds",
        "captured_at",
        "bounds_meters",
        "vehicles",
        "density_segments",
        "signals",
        "queues",
        "events",
    }

    emergency_vehicles = [
        vehicle for vehicle in payload["vehicles"] if vehicle["vehicle_type"] == "emergency"
    ]
    assert emergency_vehicles == [
        {
            "id": "emergency-east-1",
            "vehicle_type": "emergency",
            "lane_id": "east-inbound-1",
            "x_meters": 96.0,
            "y_meters": 0.0,
            "heading_degrees": 270.0,
            "speed_mps": 12.0,
            "waiting_seconds": 0.0,
            "emergency": True,
        }
    ]
    assert {
        (segment["approach"], segment["source"])
        for segment in payload["density_segments"]
    } == {
        ("north", "fixture_density_proxy"),
        ("south", "fixture_density_proxy"),
        ("east", "fixture_density_proxy"),
        ("west", "fixture_density_proxy"),
    }
    assert all(
        segment["end_meters_from_stop_line"] >= 120.0
        for segment in payload["density_segments"]
    )
    assert {
        (signal["direction"], signal["state"])
        for signal in payload["signals"]
    } == {
        ("north", "red"),
        ("south", "red"),
        ("east", "green"),
        ("west", "red"),
    }
    assert {
        (event["event_type"], event["direction"])
        for event in payload["events"]
    } == {
        ("emergency_vehicle_approach", "east"),
        ("queue_threshold_exceeded", "north"),
    }


def test_all_fixture_scenarios_have_deterministic_snapshot_markers(
    client: TestClient,
) -> None:
    snapshots = {}
    for scenario_id in ["emergency", "pedestrian", "normal", "blocked"]:
        first = client.get(f"/api/simulation/frame?scenario_id={scenario_id}")
        second = client.get(f"/api/simulation/frame?scenario_id={scenario_id}")

        assert first.status_code == 200
        assert second.status_code == 200
        assert first.json() == second.json()
        snapshots[scenario_id] = first.json()
        assert snapshots[scenario_id]["source"] == "simulation_snapshot_fixture"
        assert snapshots[scenario_id]["scenario_id"] == scenario_id
        assert len(snapshots[scenario_id]["signals"]) == 4

    pedestrian = snapshots["pedestrian"]
    assert "pedestrians" not in pedestrian
    assert {
        event["event_type"] for event in pedestrian["events"]
    } == {"pedestrian_waiting"}
    assert any(signal["state"] == "yellow" for signal in pedestrian["signals"])

    normal = snapshots["normal"]
    assert len(normal["vehicles"]) <= 3
    assert any(signal["state"] == "green" for signal in normal["signals"])

    blocked = snapshots["blocked"]
    assert all(signal["state"] == "red" for signal in blocked["signals"])
    assert {
        event["event_type"] for event in blocked["events"]
    } == {"intersection_blocked", "queue_threshold_exceeded"}
    assert all(
        segment["vehicle_count"] >= 26
        for segment in blocked["density_segments"]
    )


def test_simulate_signal_remains_aggregate_comparison_without_vehicle_trajectories(
    client: TestClient,
) -> None:
    response = client.post("/api/simulate-signal?scenario_id=emergency")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "sumo_traci_fixture"
    assert "baseline" in payload
    assert "recommended" in payload
    assert "vehicles" not in payload
    assert "density_segments" not in payload
    assert "signals" not in payload


def test_provider_factory_selects_fixture_and_sumo_modes() -> None:
    assert isinstance(
        get_simulation_frame_provider(Settings(sumo_simulation_mode="fixture")),
        FixtureSimulationFrameProvider,
    )
    assert isinstance(
        get_simulation_frame_provider(Settings(sumo_simulation_mode="sumo_traci")),
        SumoSimulationFrameProvider,
    )
    assert isinstance(
        get_simulation_frame_provider(Settings(sumo_simulation_mode="sumo_libsumo")),
        SumoSimulationFrameProvider,
    )


def test_provider_factory_serializes_cold_live_provider_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    frame_provider_module._PROVIDER_CACHE.clear()
    entered_runtime_init = threading.Event()
    release_runtime_init = threading.Event()
    created_runtimes: list[object] = []
    providers: list[object] = []
    errors: list[BaseException] = []

    class BlockingRuntime:
        def __init__(self, _settings: Settings) -> None:
            created_runtimes.append(self)
            entered_runtime_init.set()
            release_runtime_init.wait(timeout=2)

        def read_frame(self, _scenario_id: str):
            raise AssertionError("provider factory test should not read frames")

    monkeypatch.setattr(frame_provider_module, "SumoRuntimeService", BlockingRuntime)

    def build_provider() -> None:
        try:
            providers.append(
                get_simulation_frame_provider(Settings(sumo_simulation_mode="sumo_traci"))
            )
        except BaseException as exc:
            errors.append(exc)

    first = threading.Thread(target=build_provider)
    second = threading.Thread(target=build_provider)
    first.start()
    assert entered_runtime_init.wait(timeout=1)
    second.start()
    release_runtime_init.set()
    first.join(timeout=2)
    second.join(timeout=2)

    assert errors == []
    assert len(created_runtimes) == 1
    assert len(providers) == 2
    assert providers[0] is providers[1]


def test_simulation_frame_route_uses_configured_provider(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    class FakeProvider:
        def build_frame(self, scenario_id, observation, event_reads):
            calls.append(scenario_id)
            return build_fixture_simulation_frame(
                scenario_id,
                observation,
                event_reads,
            ).model_copy(update={"source": "sumo_traci"})

    monkeypatch.setattr(
        "app.api.routes.get_simulation_frame_provider",
        lambda _settings: FakeProvider(),
    )

    response = client.get("/api/simulation/frame?scenario_id=normal")

    assert response.status_code == 200
    assert calls == ["normal"]
    assert response.json()["source"] == "sumo_traci"


def test_sumo_provider_first_failure_downgrades_to_fixture_source() -> None:
    class FailingRuntime:
        def read_frame(self, _scenario_id: str):
            raise SumoRuntimeError("sumo unavailable")

    provider = SumoSimulationFrameProvider(
        runtime=FailingRuntime(),
        fallback_provider=FixtureSimulationFrameProvider(),
    )

    frame = provider.build_frame("emergency", EMERGENCY_SCENARIO, [])

    assert frame.source == "simulation_snapshot_fixture"
    assert frame.scenario_id == "emergency"


def test_sumo_provider_failure_after_valid_frame_returns_labeled_last_good() -> None:
    live_frame = build_fixture_simulation_frame("emergency", EMERGENCY_SCENARIO, [])
    live_frame = live_frame.model_copy(update={"source": "sumo_traci"})

    class FlakyRuntime:
        calls = 0

        def read_frame(self, _scenario_id: str):
            self.calls += 1
            if self.calls == 1:
                return live_frame
            raise SumoRuntimeError("sumo disconnected")

    provider = SumoSimulationFrameProvider(
        runtime=FlakyRuntime(),
        fallback_provider=FixtureSimulationFrameProvider(),
    )

    assert provider.build_frame("emergency", EMERGENCY_SCENARIO, []).source == "sumo_traci"

    stale_frame = provider.build_frame("emergency", EMERGENCY_SCENARIO, [])

    assert stale_frame.source == "sumo_last_good"
    assert stale_frame.vehicles == live_frame.vehicles


def test_sumo_provider_last_good_cache_expires_to_fixture_source() -> None:
    class FakeClock:
        now = 100.0

        def __call__(self) -> float:
            return self.now

        def advance(self, seconds: float) -> None:
            self.now += seconds

    live_frame = build_fixture_simulation_frame("emergency", EMERGENCY_SCENARIO, [])
    live_frame = live_frame.model_copy(update={"source": "sumo_traci"})
    clock = FakeClock()

    class FlakyRuntime:
        calls = 0

        def read_frame(self, _scenario_id: str):
            self.calls += 1
            if self.calls == 1:
                return live_frame
            raise SumoRuntimeError("sumo disconnected")

    provider = SumoSimulationFrameProvider(
        runtime=FlakyRuntime(),
        fallback_provider=FixtureSimulationFrameProvider(),
        frame_cache_ttl_ms=1000,
        clock=clock,
    )

    assert provider.build_frame("emergency", EMERGENCY_SCENARIO, []).source == "sumo_traci"
    clock.advance(0.5)

    stale_frame = provider.build_frame("emergency", EMERGENCY_SCENARIO, [])

    assert stale_frame.source == "sumo_last_good"
    assert any(
        "stale sumo frame" in event.ai_summary.lower()
        for event in stale_frame.events
    )

    clock.advance(0.6)
    expired_frame = provider.build_frame("emergency", EMERGENCY_SCENARIO, [])

    assert expired_frame.source == "simulation_snapshot_fixture"


class RuntimeMappingFailureClock:
    def __init__(self) -> None:
        self.now = 100.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


class RuntimeMappingFailureSimulation:
    def __init__(self) -> None:
        self.time = 0.0

    def getTime(self) -> float:
        return self.time


class EmptyTrafficLightApi:
    def getIDList(self) -> list[str]:
        return []


class EmptyLaneApi:
    def getIDList(self) -> list[str]:
        return []


class FailingVehicleApi:
    def getIDList(self) -> list[str]:
        raise RuntimeError("TraCI vehicle API unavailable")


class StepThenMappingFailureClient:
    def __init__(self) -> None:
        self.step_count = 0
        self.simulation = RuntimeMappingFailureSimulation()
        self.vehicle = FailingVehicleApi()
        self.trafficlight = EmptyTrafficLightApi()
        self.lane = EmptyLaneApi()

    def simulationStep(self) -> None:
        self.step_count += 1
        self.simulation.time = self.step_count / 10.0


def test_sumo_provider_first_mapping_failure_after_step_falls_back_to_fixture() -> None:
    runtime = SumoRuntimeService(
        Settings(sumo_simulation_mode="sumo_traci"),
        client_factory=lambda _mode, _scenario_id: StepThenMappingFailureClient(),
    )
    provider = SumoSimulationFrameProvider(
        runtime=runtime,
        fallback_provider=FixtureSimulationFrameProvider(),
    )

    frame = provider.build_frame("emergency", EMERGENCY_SCENARIO, [])

    assert frame.source == "simulation_snapshot_fixture"
    assert frame.scenario_id == "emergency"


class FailsOnSecondVehicleListApi:
    def __init__(self) -> None:
        self.calls = 0

    def getIDList(self) -> list[str]:
        self.calls += 1
        if self.calls == 1:
            return []
        raise RuntimeError("TraCI vehicle API unavailable")


class SecondReadMappingFailureClient:
    def __init__(self) -> None:
        self.step_count = 0
        self.simulation = RuntimeMappingFailureSimulation()
        self.vehicle = FailsOnSecondVehicleListApi()
        self.trafficlight = EmptyTrafficLightApi()
        self.lane = EmptyLaneApi()

    def simulationStep(self) -> None:
        self.step_count += 1
        self.simulation.time = self.step_count / 10.0


def test_sumo_provider_mapping_failure_after_live_frame_returns_last_good() -> None:
    clock = RuntimeMappingFailureClock()
    runtime = SumoRuntimeService(
        Settings(
            sumo_simulation_mode="sumo_traci",
            sumo_authoritative_hz=10,
        ),
        clock=clock,
        client_factory=lambda _mode, _scenario_id: SecondReadMappingFailureClient(),
    )
    provider = SumoSimulationFrameProvider(
        runtime=runtime,
        fallback_provider=FixtureSimulationFrameProvider(),
        frame_cache_ttl_ms=1000,
        clock=clock,
    )

    live_frame = provider.build_frame("emergency", EMERGENCY_SCENARIO, [])
    clock.advance(0.101)
    stale_frame = provider.build_frame("emergency", EMERGENCY_SCENARIO, [])

    assert live_frame.source == "sumo_traci"
    assert stale_frame.source == "sumo_last_good"
    assert stale_frame.sim_time_seconds == live_frame.sim_time_seconds
    assert any(
        "stale sumo frame" in event.ai_summary.lower()
        for event in stale_frame.events
    )


def test_sumo_provider_immediate_read_after_mapping_failure_stays_last_good() -> None:
    clock = RuntimeMappingFailureClock()
    client = SecondReadMappingFailureClient()
    runtime = SumoRuntimeService(
        Settings(
            sumo_simulation_mode="sumo_traci",
            sumo_authoritative_hz=10,
        ),
        clock=clock,
        client_factory=lambda _mode, _scenario_id: client,
    )
    provider = SumoSimulationFrameProvider(
        runtime=runtime,
        fallback_provider=FixtureSimulationFrameProvider(),
        frame_cache_ttl_ms=1000,
        clock=clock,
    )

    live_frame = provider.build_frame("emergency", EMERGENCY_SCENARIO, [])
    clock.advance(0.101)
    stale_frame = provider.build_frame("emergency", EMERGENCY_SCENARIO, [])
    immediate_frame = provider.build_frame("emergency", EMERGENCY_SCENARIO, [])

    assert live_frame.source == "sumo_traci"
    assert stale_frame.source == "sumo_last_good"
    assert immediate_frame.source == "sumo_last_good"
    assert immediate_frame.sim_time_seconds == live_frame.sim_time_seconds
