from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
import threading
from time import monotonic
from typing import Protocol

from app.core.config import Settings
from app.domain.schemas import TrafficEventRead, VisionObservation
from app.domain.simulation_snapshot import SimulationFrameSnapshot
from app.services.simulation_snapshot import build_fixture_simulation_frame
from app.services.sumo_runtime import SumoRuntimeError, SumoRuntimeService


class SimulationFrameProvider(Protocol):
    def build_frame(
        self,
        scenario_id: str,
        observation: VisionObservation,
        event_reads: Sequence[TrafficEventRead],
    ) -> SimulationFrameSnapshot:
        ...


class RuntimeFrameReader(Protocol):
    def read_frame(self, scenario_id: str) -> SimulationFrameSnapshot:
        ...


@dataclass
class CachedSimulationFrame:
    frame: SimulationFrameSnapshot
    cached_at_monotonic: float


class FixtureSimulationFrameProvider:
    def build_frame(
        self,
        scenario_id: str,
        observation: VisionObservation,
        event_reads: Sequence[TrafficEventRead],
    ) -> SimulationFrameSnapshot:
        return build_fixture_simulation_frame(scenario_id, observation, event_reads)


class SumoSimulationFrameProvider:
    def __init__(
        self,
        *,
        runtime: RuntimeFrameReader,
        fallback_provider: SimulationFrameProvider,
        frame_cache_ttl_ms: int = 1000,
        clock=monotonic,
    ) -> None:
        self._runtime = runtime
        self._fallback_provider = fallback_provider
        self._frame_cache_ttl_seconds = float(frame_cache_ttl_ms) / 1000.0
        self._clock = clock
        self._last_good_frames: dict[str, CachedSimulationFrame] = {}

    def build_frame(
        self,
        scenario_id: str,
        observation: VisionObservation,
        event_reads: Sequence[TrafficEventRead],
    ) -> SimulationFrameSnapshot:
        now = self._clock()
        try:
            frame = self._runtime.read_frame(scenario_id)
        except SumoRuntimeError:
            last_good = self._last_good_frames.get(scenario_id)
            if (
                last_good is not None
                and now - last_good.cached_at_monotonic
                <= self._frame_cache_ttl_seconds
            ):
                return _stale_last_good_frame(last_good.frame)
            return self._fallback_provider.build_frame(
                scenario_id,
                observation,
                event_reads,
            )
        self._last_good_frames[scenario_id] = CachedSimulationFrame(
            frame=frame,
            cached_at_monotonic=now,
        )
        return frame


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
        live_scenario_ids: Iterable[str],
    ) -> None:
        self._live_provider = live_provider
        self._fixture_provider = fixture_provider
        self._live_scenario_ids = frozenset(live_scenario_ids)

    def build_frame(
        self,
        scenario_id: str,
        observation: VisionObservation,
        event_reads: Sequence[TrafficEventRead],
    ) -> SimulationFrameSnapshot:
        provider = (
            self._live_provider
            if scenario_id in self._live_scenario_ids
            else self._fixture_provider
        )
        return provider.build_frame(scenario_id, observation, event_reads)


_PROVIDER_CACHE: dict[tuple[object, ...], SimulationFrameProvider] = {}
_PROVIDER_CACHE_LOCK = threading.Lock()


def get_simulation_frame_provider(settings: Settings) -> SimulationFrameProvider:
    cache_key = _provider_cache_key(settings)
    with _PROVIDER_CACHE_LOCK:
        cached_provider = _PROVIDER_CACHE.get(cache_key)
        if cached_provider is not None:
            return cached_provider

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


def _provider_cache_key(settings: Settings) -> tuple[object, ...]:
    return (
        settings.sumo_simulation_mode,
        settings.sumo_binary,
        settings.sumo_binary_path,
        settings.sumo_config_path,
        settings.sumo_config_dir,
        settings.sumo_runtime_ttl_seconds,
        settings.sumo_authoritative_hz,
        settings.sumo_frame_cache_ttl_ms,
    )


def _stale_last_good_frame(frame: SimulationFrameSnapshot) -> SimulationFrameSnapshot:
    stale_source = "sumo_last_good"
    stale_events = [
        event.model_copy(update={"source": stale_source})
        for event in frame.events
    ]
    stale_events.append(
        TrafficEventRead(
            id=max([event.id for event in stale_events], default=0) + 1,
            intersection_id=frame.intersection_id,
            occurred_at=datetime.now(UTC),
            direction=None,
            event_type="normal_flow",
            severity="warning",
            object_count=0,
            ai_summary="Stale SUMO frame served from last-good cache.",
            recommendation="Treat visualization as degraded until SUMO recovers.",
            status="degraded",
            source=stale_source,
        )
    )
    return frame.model_copy(
        update={
            "source": stale_source,
            "events": stale_events,
        }
    )
