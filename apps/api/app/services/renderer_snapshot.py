import copy
import json
from pathlib import Path

from app.db import models
from app.domain.schemas import VisionObservation
from app.services.persistence import SAFETY_BOUNDARY

CONNECTED_STREAM_STATUSES = frozenset({"connected", "ready", "streaming"})
STAGE4_FIXTURE_PATH = (
    Path(__file__).resolve().parents[1]
    / "fixtures"
    / "stage4_renderer_snapshots.json"
)


def build_unreal_renderer_snapshot(
    *,
    observation: VisionObservation,
    status: models.IntersectionStatus,
    city_profile_id: str,
    pixel_stream_status: str,
    pixel_stream_signalling_url: str,
    simulation_source: str,
) -> dict[str, object]:
    emergency_direction = "none"
    if observation.emergency_vehicle.direction is not None:
        emergency_direction = observation.emergency_vehicle.direction.value

    normalized_stream_status = pixel_stream_status.strip().lower()
    stream_connected = normalized_stream_status in CONNECTED_STREAM_STATUSES
    queues = {
        "north": status.north_queue,
        "south": status.south_queue,
        "east": status.east_queue,
        "west": status.west_queue,
    }

    return {
        "snapshot_type": "unreal_renderer_snapshot",
        "source": status.source,
        "simulation_source": simulation_source,
        "intersection_id": status.intersection_id,
        "captured_at": status.captured_at.isoformat(),
        "cityProfileId": city_profile_id,
        "city_profile": city_profile_id,
        "activeSignalGroup": status.signal_phase,
        "signal_phase": status.signal_phase,
        "cycleSecond": status.cycle_second,
        "cycle_second": status.cycle_second,
        "queues": queues,
        "pedestrianRequest": status.pedestrian_request,
        "pedestrian_request": status.pedestrian_request,
        "emergency_vehicle_approach": status.emergency_priority,
        "emergency_priority": status.emergency_priority,
        "emergencyVehicleDirection": emergency_direction,
        "emergency_direction": emergency_direction,
        "pixelStreamConnected": stream_connected,
        "pixel_stream_connected": stream_connected,
        "pixelStreamStatus": pixel_stream_status,
        "pixel_stream_status": pixel_stream_status,
        "pixelStreamSignallingUrl": pixel_stream_signalling_url,
        "pixel_stream_signalling_url": pixel_stream_signalling_url,
        "safety_boundary": SAFETY_BOUNDARY,
    }


def build_stage4_unreal_renderer_snapshot(
    *,
    fixture_id: str,
    city_profile_id: str,
    pixel_stream_signalling_url: str,
) -> dict[str, object]:
    fixture = _load_stage4_fixture_snapshot(fixture_id)
    snapshot = copy.deepcopy(fixture)
    snapshot["cityProfileId"] = city_profile_id
    snapshot["city_profile"] = city_profile_id
    snapshot["pixelStreamSignallingUrl"] = pixel_stream_signalling_url
    snapshot["pixel_stream_signalling_url"] = pixel_stream_signalling_url
    snapshot["safety_boundary"] = SAFETY_BOUNDARY
    return snapshot


def _load_stage4_fixture_snapshot(fixture_id: str) -> dict[str, object]:
    data = json.loads(STAGE4_FIXTURE_PATH.read_text(encoding="utf-8"))
    snapshots = data.get("snapshots", {})
    if not isinstance(snapshots, dict):
        raise KeyError(fixture_id)
    snapshot = snapshots[fixture_id]
    if not isinstance(snapshot, dict):
        raise KeyError(fixture_id)
    return snapshot
