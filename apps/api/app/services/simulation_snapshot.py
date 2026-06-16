from collections.abc import Sequence

from app.domain.schemas import TrafficEventRead, VisionObservation
from app.domain.simulation_snapshot import (
    SimulationDensitySegment,
    SimulationFrameSnapshot,
    SimulationSignalSnapshot,
    SimulationVehicleSnapshot,
)

SNAPSHOT_SOURCE = "simulation_snapshot_fixture"
SNAPSHOT_BOUNDS_METERS = {
    "north": -160.0,
    "south": 140.0,
    "east": 160.0,
    "west": -160.0,
}
APPROACH_LENGTH_METERS = {
    "north": 160.0,
    "south": 140.0,
    "east": 160.0,
    "west": 160.0,
}


def build_fixture_simulation_frame(
    scenario_id: str,
    observation: VisionObservation,
    events: Sequence[TrafficEventRead],
) -> SimulationFrameSnapshot:
    return SimulationFrameSnapshot(
        source=SNAPSHOT_SOURCE,
        intersection_id=observation.intersection_id,
        scenario_id=scenario_id,
        sim_time_seconds=0.0,
        captured_at=observation.captured_at,
        bounds_meters=SNAPSHOT_BOUNDS_METERS,
        vehicles=_vehicles_for_scenario(scenario_id),
        density_segments=_density_segments(observation),
        signals=_signals_for_scenario(scenario_id),
        queues=observation.queues,
        events=list(events),
    )


def _density_segments(
    observation: VisionObservation,
) -> list[SimulationDensitySegment]:
    queues = observation.queues.model_dump()
    return [
        SimulationDensitySegment(
            segment_id=f"{approach}-queue-density",
            approach=approach,
            start_meters_from_stop_line=0.0,
            end_meters_from_stop_line=APPROACH_LENGTH_METERS[approach],
            lane_count=3,
            vehicle_count=queue,
            average_speed_mps=_average_speed_for_queue(queue),
            source="fixture_density_proxy",
        )
        for approach, queue in queues.items()
    ]


def _average_speed_for_queue(queue: int) -> float:
    if queue >= 26:
        return 1.5
    if queue >= 12:
        return 4.5
    return 8.0


def _signals_for_scenario(scenario_id: str) -> list[SimulationSignalSnapshot]:
    state_by_direction = {
        "emergency": {
            "north": "red",
            "south": "red",
            "east": "green",
            "west": "red",
        },
        "pedestrian": {
            "north": "yellow",
            "south": "yellow",
            "east": "red",
            "west": "red",
        },
        "normal": {
            "north": "green",
            "south": "green",
            "east": "red",
            "west": "red",
        },
        "blocked": {
            "north": "red",
            "south": "red",
            "east": "red",
            "west": "red",
        },
    }.get(
        scenario_id,
        {
            "north": "green",
            "south": "green",
            "east": "red",
            "west": "red",
        },
    )
    return [
        SimulationSignalSnapshot(
            signal_id=f"{direction}-signal",
            direction=direction,
            state=state,
            seconds_remaining=_signal_seconds_remaining(state),
        )
        for direction, state in state_by_direction.items()
    ]


def _signal_seconds_remaining(state: str) -> float:
    if state == "green":
        return 18.0
    if state == "yellow":
        return 4.0
    return 22.0


def _vehicles_for_scenario(scenario_id: str) -> list[SimulationVehicleSnapshot]:
    if scenario_id == "emergency":
        return [
            SimulationVehicleSnapshot(
                id="emergency-east-1",
                vehicle_type="emergency",
                lane_id="east-inbound-1",
                x_meters=96.0,
                y_meters=0.0,
                heading_degrees=270.0,
                speed_mps=12.0,
                waiting_seconds=0.0,
                emergency=True,
            )
        ]
    if scenario_id == "normal":
        return [
            SimulationVehicleSnapshot(
                id="normal-north-car-1",
                vehicle_type="car",
                lane_id="north-inbound-1",
                x_meters=-4.0,
                y_meters=-38.0,
                heading_degrees=180.0,
                speed_mps=7.5,
                waiting_seconds=0.0,
            ),
            SimulationVehicleSnapshot(
                id="normal-south-taxi-1",
                vehicle_type="taxi",
                lane_id="south-inbound-2",
                x_meters=4.0,
                y_meters=42.0,
                heading_degrees=0.0,
                speed_mps=7.0,
                waiting_seconds=0.0,
            ),
            SimulationVehicleSnapshot(
                id="normal-west-bus-1",
                vehicle_type="bus",
                lane_id="west-inbound-1",
                x_meters=-58.0,
                y_meters=4.0,
                heading_degrees=90.0,
                speed_mps=5.5,
                waiting_seconds=6.0,
            ),
        ]
    return []
