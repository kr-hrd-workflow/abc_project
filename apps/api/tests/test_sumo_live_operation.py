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
        assert bus.lane_id.endswith("_4") or bus.lane_id in (
            ":center_4_0",
            ":center_14_0",
        ), f"bus {bus.id} left the median lane: {bus.lane_id}"
