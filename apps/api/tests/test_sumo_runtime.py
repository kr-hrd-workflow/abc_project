from pathlib import Path
import sys
import threading

import app.services.sumo_runtime as sumo_runtime
from app.core.config import Settings
from app.services.sumo_runtime import (
    SumoConfigurationError,
    SumoDependencyError,
    SumoRuntimeService,
)


class FakeClock:
    def __init__(self) -> None:
        self.now = 100.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


class FakeSimulation:
    def __init__(self) -> None:
        self.time = 0.0

    def getTime(self) -> float:
        return self.time


class FakeVehicleApi:
    def getIDList(self) -> list[str]:
        return []


class FakeTrafficLightApi:
    def getIDList(self) -> list[str]:
        return []


class FakeLaneApi:
    def getIDList(self) -> list[str]:
        return []


class FakeSumoClient:
    def __init__(self) -> None:
        self.step_count = 0
        self.simulation = FakeSimulation()
        self.vehicle = FakeVehicleApi()
        self.trafficlight = FakeTrafficLightApi()
        self.lane = FakeLaneApi()

    def simulationStep(self) -> None:
        self.step_count += 1
        self.simulation.time = float(self.step_count) / 10.0


class ClosableFakeSumoClient(FakeSumoClient):
    def __init__(self) -> None:
        super().__init__()
        self.closed = False

    def close(self) -> None:
        self.closed = True


class DisposableFakeSumoClient(FakeSumoClient):
    def __init__(self) -> None:
        super().__init__()
        self.disposed = False

    def dispose(self) -> None:
        self.disposed = True


class BlockingFakeSumoClient(FakeSumoClient):
    def __init__(self) -> None:
        super().__init__()
        self.entered_step = threading.Event()
        self.release_step = threading.Event()
        self._in_step = False
        self.concurrent_entry = False

    def simulationStep(self) -> None:
        if self._in_step:
            self.concurrent_entry = True
            return

        self._in_step = True
        self.entered_step.set()
        self.release_step.wait(timeout=2)
        super().simulationStep()
        self._in_step = False


def test_immediate_frame_reads_reuse_cached_authoritative_frame() -> None:
    clock = FakeClock()
    created_clients: list[FakeSumoClient] = []

    def client_factory(_mode: str, _scenario_id: str) -> FakeSumoClient:
        client = FakeSumoClient()
        created_clients.append(client)
        return client

    service = SumoRuntimeService(
        Settings(sumo_simulation_mode="sumo_traci"),
        clock=clock,
        client_factory=client_factory,
    )

    first = service.read_frame("emergency")
    second = service.read_frame("emergency")

    assert len(created_clients) == 1
    assert created_clients[0].step_count == 1
    assert service.get_or_create_session("emergency").step_index == 1
    assert first.source == "sumo_traci"
    assert first == second


def test_frame_reads_after_authoritative_interval_advance_private_tick() -> None:
    clock = FakeClock()
    created_clients: list[FakeSumoClient] = []

    def client_factory(_mode: str, _scenario_id: str) -> FakeSumoClient:
        client = FakeSumoClient()
        created_clients.append(client)
        return client

    service = SumoRuntimeService(
        Settings(
            sumo_simulation_mode="sumo_traci",
            sumo_authoritative_hz=10,
        ),
        clock=clock,
        client_factory=client_factory,
    )

    first = service.read_frame("emergency")
    clock.advance(0.099)
    cached = service.read_frame("emergency")
    clock.advance(0.002)
    advanced = service.read_frame("emergency")

    assert created_clients[0].step_count == 2
    assert first == cached
    assert advanced.sim_time_seconds == 0.2
    assert service.get_or_create_session("emergency").step_index == 2


def test_runtime_prefers_sibling_scenario_config_when_present(tmp_path) -> None:
    base_config = tmp_path / "intersection.sumocfg"
    emergency_config = tmp_path / "emergency.sumocfg"
    base_config.write_text("<configuration/>")
    emergency_config.write_text("<configuration/>")
    service = SumoRuntimeService(
        Settings(
            sumo_simulation_mode="sumo_traci",
            sumo_config_path=str(base_config),
        )
    )

    assert service._configured_config_path("emergency", "sumo_traci") == str(
        emergency_config
    )
    assert service._configured_config_path("normal", "sumo_traci") == str(
        base_config
    )


def test_session_ttl_eviction_creates_new_warm_session_after_idle_window() -> None:
    clock = FakeClock()
    created_clients: list[FakeSumoClient] = []

    def client_factory(_mode: str, _scenario_id: str) -> FakeSumoClient:
        client = FakeSumoClient()
        created_clients.append(client)
        return client

    service = SumoRuntimeService(
        Settings(
            sumo_simulation_mode="sumo_libsumo",
            sumo_runtime_ttl_seconds=5,
        ),
        clock=clock,
        client_factory=client_factory,
    )

    first_session = service.get_or_create_session("normal")
    clock.advance(6.0)
    second_session = service.get_or_create_session("normal")

    assert first_session is not second_session
    assert len(created_clients) == 2
    assert second_session.mode == "sumo_libsumo"
    assert second_session.last_access_monotonic == clock.now


def test_session_ttl_eviction_closes_expired_client_when_available() -> None:
    clock = FakeClock()
    created_clients: list[ClosableFakeSumoClient] = []

    def client_factory(_mode: str, _scenario_id: str) -> ClosableFakeSumoClient:
        client = ClosableFakeSumoClient()
        created_clients.append(client)
        return client

    service = SumoRuntimeService(
        Settings(
            sumo_simulation_mode="sumo_traci",
            sumo_runtime_ttl_seconds=5,
        ),
        clock=clock,
        client_factory=client_factory,
    )

    service.get_or_create_session("normal")
    clock.advance(6.0)
    service.get_or_create_session("normal")

    assert len(created_clients) == 2
    assert created_clients[0].closed is True
    assert created_clients[1].closed is False


def test_session_ttl_eviction_disposes_expired_client_when_close_unavailable() -> None:
    clock = FakeClock()
    created_clients: list[DisposableFakeSumoClient] = []

    def client_factory(_mode: str, _scenario_id: str) -> DisposableFakeSumoClient:
        client = DisposableFakeSumoClient()
        created_clients.append(client)
        return client

    service = SumoRuntimeService(
        Settings(
            sumo_simulation_mode="sumo_libsumo",
            sumo_runtime_ttl_seconds=5,
        ),
        clock=clock,
        client_factory=client_factory,
    )

    service.get_or_create_session("normal")
    clock.advance(6.0)
    service.get_or_create_session("normal")

    assert len(created_clients) == 2
    assert created_clients[0].disposed is True
    assert created_clients[1].disposed is False


def test_live_runtime_serializes_concurrent_frame_reads() -> None:
    clock = FakeClock()
    client = BlockingFakeSumoClient()

    service = SumoRuntimeService(
        Settings(
            sumo_simulation_mode="sumo_traci",
            sumo_authoritative_hz=10,
        ),
        clock=clock,
        client_factory=lambda _mode, _scenario_id: client,
    )

    service.read_frame("emergency")
    clock.advance(1.0)
    client.entered_step.clear()

    errors: list[BaseException] = []

    def read_frame() -> None:
        try:
            service.read_frame("emergency")
        except BaseException as exc:
            errors.append(exc)

    first = threading.Thread(target=read_frame)
    second = threading.Thread(target=read_frame)
    first.start()
    assert client.entered_step.wait(timeout=1)
    second.start()
    client.release_step.set()
    first.join(timeout=2)
    second.join(timeout=2)

    assert errors == []
    assert client.concurrent_entry is False


def test_live_runtime_keeps_warm_sessions_per_scenario_until_ttl() -> None:
    clock = FakeClock()
    created_clients: list[ClosableFakeSumoClient] = []

    def client_factory(_mode: str, _scenario_id: str) -> ClosableFakeSumoClient:
        client = ClosableFakeSumoClient()
        created_clients.append(client)
        return client

    service = SumoRuntimeService(
        Settings(sumo_simulation_mode="sumo_traci"),
        clock=clock,
        client_factory=client_factory,
    )

    emergency = service.get_or_create_session("emergency")
    normal = service.get_or_create_session("normal")
    emergency_again = service.get_or_create_session("emergency")

    assert emergency is not normal
    assert emergency_again is emergency
    assert len(created_clients) == 2
    assert created_clients[0].closed is False
    assert created_clients[1].closed is False
    clock.advance(301.0)

    refreshed_emergency = service.get_or_create_session("emergency")

    assert refreshed_emergency is not emergency
    assert len(created_clients) == 3
    assert created_clients[0].closed is True
    assert created_clients[1].closed is True
    assert created_clients[2].closed is False


def test_libsumo_runtime_replaces_global_session_on_scenario_change() -> None:
    clock = FakeClock()
    created_clients: list[ClosableFakeSumoClient] = []

    def client_factory(_mode: str, _scenario_id: str) -> ClosableFakeSumoClient:
        client = ClosableFakeSumoClient()
        created_clients.append(client)
        return client

    service = SumoRuntimeService(
        Settings(sumo_simulation_mode="sumo_libsumo"),
        clock=clock,
        client_factory=client_factory,
    )

    emergency = service.get_or_create_session("emergency")
    emergency_again = service.get_or_create_session("emergency")
    normal = service.get_or_create_session("normal")

    assert emergency_again is emergency
    assert normal is not emergency
    assert len(created_clients) == 2
    assert created_clients[0].closed is True
    assert created_clients[1].closed is False


class StartRecordingAdapter(FakeSumoClient):
    def __init__(self) -> None:
        super().__init__()
        self.started_args: list[str] | None = None
        self.started_label: str | None = None
        self.connection_label: str | None = None

    def start(self, args: list[str], label: str | None = None) -> None:
        self.started_args = args
        self.started_label = label

    def getConnection(self, label: str) -> "StartRecordingAdapter":
        self.connection_label = label
        return self


def test_sumo_config_dir_uses_safe_scenario_config_within_base_dir(
    tmp_path: Path,
) -> None:
    adapter = StartRecordingAdapter()
    config_dir = tmp_path / "sumo-configs"
    config_dir.mkdir()

    service = SumoRuntimeService(
        Settings(
            sumo_simulation_mode="sumo_traci",
            sumo_config_dir=str(config_dir),
        ),
        module_loader=lambda _module_name: adapter,
        binary_available=lambda _binary_name: True,
        path_exists=lambda _path: True,
    )

    service.get_or_create_session("emergency")

    assert adapter.started_args == [
        "sumo",
        "-c",
        str((config_dir / "emergency.sumocfg").resolve()),
    ]
    assert adapter.started_label == "emergency"
    assert adapter.connection_label == "emergency"


def test_default_binary_resolution_uses_python_env_script_dir(
    tmp_path: Path,
    monkeypatch,
) -> None:
    python_bin_dir = tmp_path / "bin"
    python_bin_dir.mkdir()
    python_path = python_bin_dir / "python"
    sumo_binary = python_bin_dir / "sumo"
    python_path.write_text("")
    sumo_binary.write_text("")
    sumo_binary.chmod(0o755)
    monkeypatch.setenv("PATH", "")
    monkeypatch.setattr(sys, "executable", str(python_path))

    service = SumoRuntimeService(Settings(sumo_simulation_mode="sumo_traci"))

    assert sumo_runtime._binary_available("sumo") is True
    assert service._configured_binary("sumo_traci") == str(sumo_binary)


def test_sumo_config_dir_rejects_scenario_path_escape() -> None:
    adapter = StartRecordingAdapter()
    service = SumoRuntimeService(
        Settings(
            sumo_simulation_mode="sumo_traci",
            sumo_config_dir="C:/safe/sumo-configs",
        ),
        module_loader=lambda _module_name: adapter,
        binary_available=lambda _binary_name: True,
        path_exists=lambda _path: True,
    )

    try:
        service.get_or_create_session("../outside")
    except SumoConfigurationError as exc:
        assert exc.mode == "sumo_traci"
        assert "scenario" in str(exc).lower()
    else:
        raise AssertionError("expected SumoConfigurationError")

    assert adapter.started_args is None


def test_missing_sumo_python_dependency_raises_typed_runtime_error() -> None:
    def missing_module_loader(module_name: str) -> object:
        raise ModuleNotFoundError(module_name)

    service = SumoRuntimeService(
        Settings(sumo_simulation_mode="sumo_traci"),
        module_loader=missing_module_loader,
        binary_available=lambda _binary_name: True,
        path_exists=lambda _path: True,
    )

    try:
        service.get_or_create_session("emergency")
    except SumoDependencyError as exc:
        assert exc.mode == "sumo_traci"
        assert "traci" in str(exc)
    else:
        raise AssertionError("expected SumoDependencyError")
