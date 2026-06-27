from __future__ import annotations

import os
import re
import sys
import threading
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from importlib import import_module
from math import isfinite
from pathlib import Path
from shutil import which
from typing import Literal, Protocol, cast

from app.core.config import Settings
from app.domain.schemas import QueueMetrics, TrafficEventRead
from app.domain.simulation_snapshot import (
    SimulationDensitySegment,
    SimulationFrameSnapshot,
    SimulationPedestrianSnapshot,
    SimulationSignalSnapshot,
    SimulationVehicleSnapshot,
)
from app.services.simulation_snapshot import SNAPSHOT_BOUNDS_METERS

LiveSumoMode = Literal["sumo_traci", "sumo_libsumo"]
Approach = Literal["north", "south", "east", "west"]

APPROACHES: tuple[Approach, ...] = ("north", "south", "east", "west")
TLS_DIRECTION_ORDER: tuple[Approach, ...] = ("north", "east", "south", "west")
# Through-movement link index per approach in the BUILT net's 19-char TLS state.
# netconvert assigns sequential per-connection indices; the N/E/S/W through movements
# land at 1/6/11/16 (verified in intersection.net.xml). See §0 R1.
TLS_APPROACH_LINK_INDEX: dict[Approach, int] = {
    "north": 1, "east": 6, "south": 11, "west": 16,
}
QUEUE_THRESHOLD = 25
STOP_LINE_DISTANCE_METERS = 30.0
NEAR_STOPPED_SPEED_MPS = 0.5
BLOCKED_LANE_SPEED_MPS = 0.2
HIGH_WAIT_SECONDS = 60.0
SAFE_SCENARIO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
SUMO_INVALID_POSITION_SENTINEL = float(-(2**30))


class SumoRuntimeError(RuntimeError):
    def __init__(self, message: str, *, mode: str | None = None) -> None:
        super().__init__(message)
        self.mode = mode


class SumoDependencyError(SumoRuntimeError):
    pass


class SumoConfigurationError(SumoRuntimeError):
    pass


class SumoSimulationApi(Protocol):
    def getTime(self) -> float:
        ...


class SumoVehicleApi(Protocol):
    def getIDList(self) -> list[str]:
        ...

    def getPosition(self, vehicle_id: str) -> tuple[float, float]:
        ...

    def getAngle(self, vehicle_id: str) -> float:
        ...

    def getSpeed(self, vehicle_id: str) -> float:
        ...

    def getWaitingTime(self, vehicle_id: str) -> float:
        ...

    def getLaneID(self, vehicle_id: str) -> str:
        ...

    def getTypeID(self, vehicle_id: str) -> str:
        ...


class SumoTrafficLightApi(Protocol):
    def getIDList(self) -> list[str]:
        ...

    def getRedYellowGreenState(self, signal_id: str) -> str:
        ...


class SumoLaneApi(Protocol):
    def getIDList(self) -> list[str]:
        ...

    def getLastStepVehicleNumber(self, lane_id: str) -> int:
        ...

    def getLastStepMeanSpeed(self, lane_id: str) -> float:
        ...

    def getLastStepHaltingNumber(self, lane_id: str) -> int:
        ...


class SumoClient(Protocol):
    simulation: SumoSimulationApi
    vehicle: SumoVehicleApi
    trafficlight: SumoTrafficLightApi
    lane: SumoLaneApi

    def simulationStep(self) -> None:
        ...


@dataclass
class SumoRuntimeSession:
    scenario_id: str
    mode: LiveSumoMode
    client: SumoClient
    step_index: int
    sim_time_seconds: float
    last_access_monotonic: float
    last_step_monotonic: float | None
    cached_frame: SimulationFrameSnapshot | None


class SumoRuntimeService:
    def __init__(
        self,
        settings: Settings,
        *,
        clock: Callable[[], float] | None = None,
        client_factory: Callable[[str, str], SumoClient] | None = None,
        module_loader: Callable[[str], object] | None = None,
        binary_available: Callable[[str], bool] | None = None,
        path_exists: Callable[[str], bool] | None = None,
    ) -> None:
        self.settings = settings
        self._clock = clock or __import__("time").monotonic
        self._client_factory = client_factory
        self._module_loader = module_loader or import_module
        self._binary_available = binary_available or _binary_available
        self._binary_resolver = _resolve_binary_path if binary_available is None else None
        self._path_exists = path_exists or _path_exists
        self._sessions: dict[str, SumoRuntimeSession] = {}
        self._lock = threading.RLock()

    def get_or_create_session(self, scenario_id: str) -> SumoRuntimeSession:
        with self._lock:
            now = self._clock()
            self._evict_expired_sessions(now)
            session = self._sessions.get(scenario_id)
            if session is None:
                mode = _live_mode(self.settings.sumo_simulation_mode)
                if mode == "sumo_libsumo":
                    self._close_other_sessions(scenario_id)
                session = SumoRuntimeSession(
                    scenario_id=scenario_id,
                    mode=mode,
                    client=self._create_client(mode, scenario_id),
                    step_index=0,
                    sim_time_seconds=0.0,
                    last_access_monotonic=now,
                    last_step_monotonic=None,
                    cached_frame=None,
                )
                self._sessions[scenario_id] = session
            session.last_access_monotonic = now
            return session

    def read_frame(self, scenario_id: str) -> SimulationFrameSnapshot:
        with self._lock:
            session = self.get_or_create_session(scenario_id)
            now = session.last_access_monotonic
            authoritative_interval_seconds = 1.0 / float(self.settings.sumo_authoritative_hz)
            if (
                session.cached_frame is not None
                and session.last_step_monotonic is not None
                and now - session.last_step_monotonic < authoritative_interval_seconds
            ):
                return session.cached_frame
            self._step_to_latest_authoritative_tick(session)
            try:
                frame = build_sumo_simulation_frame(
                    scenario_id=scenario_id,
                    mode=session.mode,
                    client=session.client,
                    step_index=session.step_index,
                )
            except Exception as exc:
                session.cached_frame = None
                raise SumoRuntimeError(
                    "SUMO runtime failed while building frame snapshot",
                    mode=session.mode,
                ) from exc
            session.cached_frame = frame
            session.last_step_monotonic = now
            return frame

    def _evict_expired_sessions(self, now: float) -> None:
        ttl_seconds = float(self.settings.sumo_runtime_ttl_seconds)
        expired_scenarios = [
            scenario_id
            for scenario_id, session in self._sessions.items()
            if now - session.last_access_monotonic > ttl_seconds
        ]
        for scenario_id in expired_scenarios:
            session = self._sessions.get(scenario_id)
            if session is not None:
                self._close_session_client(session)
                self._sessions.pop(scenario_id, None)

    def _close_other_sessions(self, scenario_id: str) -> None:
        other_scenarios = [
            active_scenario_id
            for active_scenario_id in self._sessions
            if active_scenario_id != scenario_id
        ]
        for active_scenario_id in other_scenarios:
            session = self._sessions.get(active_scenario_id)
            if session is not None:
                self._close_session_client(session)
                self._sessions.pop(active_scenario_id, None)

    def _create_client(self, mode: LiveSumoMode, scenario_id: str) -> SumoClient:
        if self._client_factory is not None:
            return self._client_factory(mode, scenario_id)

        adapter = self._load_adapter(mode)
        binary = self._configured_binary(mode)
        config_path = self._configured_config_path(scenario_id, mode)
        start = getattr(adapter, "start", None)
        if callable(start):
            if mode == "sumo_traci":
                start([binary, "-c", config_path], label=scenario_id)
            else:
                start([binary, "-c", config_path])
        if mode == "sumo_traci":
            get_connection = getattr(adapter, "getConnection", None)
            if not callable(get_connection):
                raise SumoDependencyError(
                    "SUMO TraCI adapter does not expose labeled connections",
                    mode=mode,
                )
            return cast(SumoClient, get_connection(scenario_id))
        return cast(SumoClient, adapter)

    def _load_adapter(self, mode: LiveSumoMode) -> object:
        module_name = "traci" if mode == "sumo_traci" else "libsumo"
        try:
            return self._module_loader(module_name)
        except ModuleNotFoundError as exc:
            raise SumoDependencyError(
                f"Missing SUMO Python module {module_name}",
                mode=mode,
            ) from exc
        except ImportError as exc:
            raise SumoDependencyError(
                f"Could not import SUMO Python module {module_name}",
                mode=mode,
            ) from exc

    def _configured_binary(self, mode: LiveSumoMode) -> str:
        if self.settings.sumo_binary_path:
            if not self._path_exists(self.settings.sumo_binary_path):
                raise SumoConfigurationError(
                    f"SUMO binary path not found: {self.settings.sumo_binary_path}",
                    mode=mode,
                )
            return self.settings.sumo_binary_path
        if self._binary_resolver is not None:
            resolved_binary = self._binary_resolver(self.settings.sumo_binary)
            if resolved_binary is not None:
                return resolved_binary
        if not self._binary_available(self.settings.sumo_binary):
            raise SumoConfigurationError(
                f"SUMO binary not available: {self.settings.sumo_binary}",
                mode=mode,
            )
        return self.settings.sumo_binary

    def _configured_config_path(self, scenario_id: str, mode: LiveSumoMode) -> str:
        if self.settings.sumo_config_dir:
            config_path = self._scenario_config_path_from_dir(scenario_id, mode)
        else:
            config_path = Path(self.settings.sumo_config_path)
        config_path_text = str(config_path)
        if not self._path_exists(config_path_text):
            raise SumoConfigurationError(
                f"SUMO config not found: {config_path_text}",
                mode=mode,
            )
        return config_path_text

    def _scenario_config_path_from_dir(
        self,
        scenario_id: str,
        mode: LiveSumoMode,
    ) -> Path:
        if SAFE_SCENARIO_ID_PATTERN.fullmatch(scenario_id) is None:
            raise SumoConfigurationError(
                f"Unsafe SUMO scenario id for config lookup: {scenario_id}",
                mode=mode,
            )
        base_dir = Path(self.settings.sumo_config_dir).expanduser().resolve()
        config_path = (base_dir / f"{scenario_id}.sumocfg").resolve()
        try:
            config_path.relative_to(base_dir)
        except ValueError as exc:
            raise SumoConfigurationError(
                f"SUMO config path escapes configured directory: {config_path}",
                mode=mode,
            ) from exc
        return config_path

    def _close_session_client(self, session: SumoRuntimeSession) -> None:
        close = getattr(session.client, "close", None)
        dispose = getattr(session.client, "dispose", None)
        closer = close if callable(close) else dispose if callable(dispose) else None
        if closer is None:
            return
        try:
            closer()
        except Exception as exc:
            raise SumoRuntimeError(
                "SUMO runtime failed while closing expired session",
                mode=session.mode,
            ) from exc

    def _step_to_latest_authoritative_tick(
        self,
        session: SumoRuntimeSession,
    ) -> None:
        try:
            session.client.simulationStep()
            session.step_index += 1
            session.sim_time_seconds = float(session.client.simulation.getTime())
        except Exception as exc:
            raise SumoRuntimeError(
                "SUMO runtime failed while stepping authoritative tick",
                mode=session.mode,
            ) from exc


def build_sumo_simulation_frame(
    *,
    scenario_id: str,
    mode: LiveSumoMode,
    client: SumoClient,
    step_index: int,
) -> SimulationFrameSnapshot:
    captured_at = datetime.now(UTC)
    vehicles = _map_vehicles(client)
    pedestrians = _map_pedestrians(client)
    density_segments = _map_density_segments(client)
    queues = _map_queues(client)
    return SimulationFrameSnapshot(
        source=mode,
        intersection_id="INT-0001",
        scenario_id=scenario_id,
        sim_time_seconds=float(client.simulation.getTime()),
        captured_at=captured_at,
        bounds_meters=SNAPSHOT_BOUNDS_METERS,
        vehicles=vehicles,
        pedestrians=pedestrians,
        density_segments=density_segments,
        signals=_map_signals(client),
        queues=queues,
        events=_map_events(
            intersection_id="INT-0001",
            captured_at=captured_at,
            vehicles=vehicles,
            queues=queues,
            density_segments=density_segments,
            step_index=step_index,
            mode=mode,
        ),
    )


def _map_vehicles(client: SumoClient) -> list[SimulationVehicleSnapshot]:
    vehicles: list[SimulationVehicleSnapshot] = []
    for vehicle_id in client.vehicle.getIDList():
        lane_id = client.vehicle.getLaneID(vehicle_id)
        type_id = client.vehicle.getTypeID(vehicle_id)
        route_id = _optional_vehicle_string(client.vehicle, "getRouteID", vehicle_id)
        vehicle_type, emergency = _vehicle_type(vehicle_id, type_id, route_id)
        sumo_x, sumo_y = client.vehicle.getPosition(vehicle_id)
        x_meters, y_meters = _to_scene_meters(sumo_x, sumo_y)
        vehicles.append(
            SimulationVehicleSnapshot(
                id=vehicle_id,
                vehicle_type=vehicle_type,
                lane_id=lane_id,
                x_meters=x_meters,
                y_meters=y_meters,
                heading_degrees=float(client.vehicle.getAngle(vehicle_id)),
                speed_mps=float(client.vehicle.getSpeed(vehicle_id)),
                waiting_seconds=float(client.vehicle.getWaitingTime(vehicle_id)),
                emergency=emergency,
            )
        )
    return vehicles


def _map_pedestrians(client: SumoClient) -> list[SimulationPedestrianSnapshot]:
    person_api = getattr(client, "person", None)
    get_id_list = getattr(person_api, "getIDList", None)
    if not callable(get_id_list):
        return []
    try:
        person_ids = get_id_list()
    except Exception:
        return []

    pedestrians: list[SimulationPedestrianSnapshot] = []
    for raw_person_id in person_ids:
        pedestrian = _map_person(person_api, str(raw_person_id))
        if pedestrian is not None:
            pedestrians.append(pedestrian)
    return pedestrians


def _map_person(
    person_api: object,
    person_id: str,
) -> SimulationPedestrianSnapshot | None:
    try:
        position = _person_position(person_api, person_id)
        if position is None:
            return None
        x_meters, y_meters = position
        return SimulationPedestrianSnapshot(
            id=person_id,
            x_meters=x_meters,
            y_meters=y_meters,
            heading_degrees=_required_person_float(
                person_api,
                "getAngle",
                person_id,
            ),
            speed_mps=_required_person_float(person_api, "getSpeed", person_id),
            lane_id=_optional_person_string(person_api, ("getLaneID",), person_id),
            edge_id=_optional_person_string(
                person_api,
                ("getRoadID", "getEdgeID"),
                person_id,
            ),
            # Waiting time is optional across SUMO adapters; 0.0 means unavailable,
            # not inferred wait truth.
            waiting_seconds=_optional_person_float(
                person_api,
                "getWaitingTime",
                person_id,
                default=0.0,
            ),
            source="sumo_person",
        )
    except Exception:
        return None


def _person_position(
    person_api: object,
    person_id: str,
) -> tuple[float, float] | None:
    get_position = getattr(person_api, "getPosition", None)
    if not callable(get_position):
        return None
    raw_position = get_position(person_id)
    try:
        x_meters = float(raw_position[0])
        y_meters = float(raw_position[1])
    except (TypeError, IndexError, ValueError):
        return None
    if (
        not isfinite(x_meters)
        or not isfinite(y_meters)
        or x_meters == SUMO_INVALID_POSITION_SENTINEL
        or y_meters == SUMO_INVALID_POSITION_SENTINEL
    ):
        return None
    return _to_scene_meters(x_meters, y_meters)


def _required_person_float(
    person_api: object,
    method_name: str,
    person_id: str,
) -> float:
    method = getattr(person_api, method_name, None)
    if not callable(method):
        raise AttributeError(method_name)
    value = float(method(person_id))
    if not isfinite(value):
        raise ValueError(method_name)
    return value


def _optional_person_float(
    person_api: object,
    method_name: str,
    person_id: str,
    *,
    default: float,
) -> float:
    method = getattr(person_api, method_name, None)
    if not callable(method):
        return default
    try:
        value = float(method(person_id))
    except (TypeError, ValueError):
        return default
    return value if isfinite(value) else default


def _optional_person_string(
    person_api: object,
    method_names: tuple[str, ...],
    person_id: str,
) -> str | None:
    for method_name in method_names:
        method = getattr(person_api, method_name, None)
        if not callable(method):
            continue
        try:
            value = method(person_id)
        except Exception:
            continue
        if value is None:
            continue
        text = str(value)
        if text:
            return text
    return None


def _map_signals(client: SumoClient) -> list[SimulationSignalSnapshot]:
    signals: list[SimulationSignalSnapshot] = []
    for signal_id in client.trafficlight.getIDList():
        state = client.trafficlight.getRedYellowGreenState(signal_id)
        for direction in TLS_DIRECTION_ORDER:
            link_index = TLS_APPROACH_LINK_INDEX[direction]
            if link_index >= len(state):
                continue
            signal_state = _signal_state(state[link_index])
            signals.append(
                SimulationSignalSnapshot(
                    signal_id=f"{signal_id}-{direction}",
                    direction=direction,
                    state=signal_state,
                    seconds_remaining=_signal_seconds_remaining(signal_state),
                )
            )
        break
    return signals


def _map_density_segments(client: SumoClient) -> list[SimulationDensitySegment]:
    segments: list[SimulationDensitySegment] = []
    for lane_id in client.lane.getIDList():
        approach = _approach_from_lane_id(lane_id)
        if approach is None:
            continue
        segments.append(
            SimulationDensitySegment(
                segment_id=f"{lane_id}-density",
                approach=approach,
                start_meters_from_stop_line=0.0,
                end_meters_from_stop_line=160.0,
                lane_count=1,
                vehicle_count=int(client.lane.getLastStepVehicleNumber(lane_id)),
                average_speed_mps=float(client.lane.getLastStepMeanSpeed(lane_id)),
                source="aggregate_density_proxy",
            )
        )
    return segments


def _map_queues(client: SumoClient) -> QueueMetrics:
    precise_queues = _map_stop_line_vehicle_queues(client)
    if precise_queues is not None:
        return precise_queues

    queue_by_approach: dict[Approach, int] = {approach: 0 for approach in APPROACHES}
    for lane_id in client.lane.getIDList():
        approach = _approach_from_lane_id(lane_id)
        if approach is None:
            continue
        queue_by_approach[approach] += int(client.lane.getLastStepHaltingNumber(lane_id))
    return QueueMetrics(**queue_by_approach)


def _map_stop_line_vehicle_queues(client: SumoClient) -> QueueMetrics | None:
    get_lane_position = getattr(client.vehicle, "getLanePosition", None)
    get_lane_length = getattr(client.lane, "getLength", None)
    if not callable(get_lane_position) or not callable(get_lane_length):
        return None

    queue_by_approach: dict[Approach, int] = {approach: 0 for approach in APPROACHES}
    for vehicle_id in client.vehicle.getIDList():
        lane_id = client.vehicle.getLaneID(vehicle_id)
        approach = _approach_from_lane_id(lane_id)
        if approach is None:
            continue
        lane_length = float(get_lane_length(lane_id))
        lane_position = float(get_lane_position(vehicle_id))
        distance_to_stop_line = max(lane_length - lane_position, 0.0)
        if (
            float(client.vehicle.getSpeed(vehicle_id)) <= NEAR_STOPPED_SPEED_MPS
            and distance_to_stop_line <= STOP_LINE_DISTANCE_METERS
        ):
            queue_by_approach[approach] += 1
    return QueueMetrics(**queue_by_approach)


def _map_events(
    *,
    intersection_id: str,
    captured_at: datetime,
    vehicles: list[SimulationVehicleSnapshot],
    queues: QueueMetrics,
    density_segments: list[SimulationDensitySegment],
    step_index: int,
    mode: LiveSumoMode,
) -> list[TrafficEventRead]:
    events: list[TrafficEventRead] = []
    next_event_id = max(step_index * 10, 1)
    for vehicle in vehicles:
        if not vehicle.emergency:
            continue
        direction = _approach_from_lane_id(vehicle.lane_id)
        events.append(
            TrafficEventRead(
                id=next_event_id,
                intersection_id=intersection_id,
                occurred_at=captured_at,
                direction=direction,
                event_type="emergency_vehicle_approach",
                severity="critical",
                object_count=1,
                ai_summary="Emergency vehicle detected in SUMO frame.",
                recommendation="Prioritize emergency approach in simulation.",
                status="active",
                source=mode,
            )
        )
        next_event_id += 1
    for approach, queue_size in queues.model_dump().items():
        if int(queue_size) < QUEUE_THRESHOLD:
            continue
        events.append(
            TrafficEventRead(
                id=next_event_id,
                intersection_id=intersection_id,
                occurred_at=captured_at,
                direction=approach,
                event_type="queue_threshold_exceeded",
                severity="warning",
                object_count=int(queue_size),
                ai_summary=f"SUMO queue spillback risk on {approach}.",
                recommendation="Review simulated signal timing.",
                status="active",
                source=mode,
            )
        )
        next_event_id += 1
    for segment in density_segments:
        if (
            segment.vehicle_count <= 0
            or segment.average_speed_mps > BLOCKED_LANE_SPEED_MPS
        ):
            continue
        events.append(
            TrafficEventRead(
                id=next_event_id,
                intersection_id=intersection_id,
                occurred_at=captured_at,
                direction=segment.approach,
                event_type="intersection_blocked",
                severity="critical",
                object_count=segment.vehicle_count,
                ai_summary=f"SUMO blocked lane detected on {segment.approach}.",
                recommendation="Review simulated blockage before operator action.",
                status="active",
                source=mode,
            )
        )
        next_event_id += 1
    for vehicle in vehicles:
        if vehicle.waiting_seconds < HIGH_WAIT_SECONDS:
            continue
        direction = _approach_from_lane_id(vehicle.lane_id)
        events.append(
            TrafficEventRead(
                id=next_event_id,
                intersection_id=intersection_id,
                occurred_at=captured_at,
                direction=direction,
                event_type="queue_threshold_exceeded",
                severity="warning",
                object_count=1,
                ai_summary=(
                    f"SUMO high wait detected for {vehicle.id} "
                    f"at {vehicle.waiting_seconds:.1f} seconds."
                ),
                recommendation="Review simulated wait-time imbalance.",
                status="active",
                source=mode,
            )
        )
        next_event_id += 1
    return events


def _vehicle_type(
    vehicle_id: str,
    type_id: str,
    route_id: str | None,
) -> tuple[Literal["car", "bus", "taxi", "truck", "emergency"], bool]:
    marker = " ".join(part.lower() for part in [vehicle_id, type_id, route_id or ""])
    if any(term in marker for term in ["emergency", "ambulance", "police", "fire"]):
        return "emergency", True
    if "bus" in marker:
        return "bus", False
    if "taxi" in marker:
        return "taxi", False
    if "truck" in marker:
        return "truck", False
    return "car", False


def _signal_state(raw_state: str) -> Literal["red", "yellow", "green"]:
    normalized = raw_state.lower()
    if normalized == "g":
        return "green"
    if normalized == "y":
        return "yellow"
    return "red"


def _signal_seconds_remaining(state: str) -> float:
    if state == "green":
        return 1.0
    if state == "yellow":
        return 0.5
    return 1.0


def _to_scene_meters(sumo_x: float, sumo_y: float) -> tuple[float, float]:
    # Scene contract: scene_x = sumo_x, scene_z = -sumo_y. The snapshot carries scene
    # coordinates in (x_meters, y_meters); the R3F bridge consumes y_meters directly as
    # scene z (TrafficDensityLayer.tsx maps `z: vehicle.y_meters`), and the fixtures already
    # follow this convention, so the live bridge is the only place that must negate y.
    return float(sumo_x), -float(sumo_y)


def _approach_from_lane_id(lane_id: str) -> Approach | None:
    normalized = lane_id.lower()
    for approach in APPROACHES:
        if normalized.startswith(approach) or f"-{approach}" in normalized:
            return approach
    return None


def _optional_vehicle_string(
    vehicle_api: SumoVehicleApi,
    method_name: str,
    vehicle_id: str,
) -> str | None:
    method = getattr(vehicle_api, method_name, None)
    if not callable(method):
        return None
    value = method(vehicle_id)
    return str(value) if value is not None else None


def _live_mode(mode: str) -> LiveSumoMode:
    if mode == "sumo_traci" or mode == "sumo_libsumo":
        return mode
    raise SumoConfigurationError(
        f"SUMO runtime requires live mode, received {mode}",
        mode=mode,
    )


def _binary_available(binary_name: str) -> bool:
    return _resolve_binary_path(binary_name) is not None


def _resolve_binary_path(binary_name: str) -> str | None:
    path_binary = which(binary_name)
    if path_binary is not None:
        return path_binary
    python_bin_candidate = Path(sys.executable).parent / binary_name
    if python_bin_candidate.exists() and os.access(python_bin_candidate, os.X_OK):
        return str(python_bin_candidate)
    return None


def _path_exists(path: str) -> bool:
    return Path(path).expanduser().exists()
