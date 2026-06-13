from app.db import models
from app.domain.schemas import VisionObservation
from app.services.persistence import SAFETY_BOUNDARY

CONNECTED_STREAM_STATUSES = frozenset({"connected", "ready", "streaming"})


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
