from datetime import datetime
from zoneinfo import ZoneInfo

from app.domain.enums import Direction
from app.domain.schemas import (
    EmergencyVehicle,
    QueueMetrics,
    SimulationComparison,
    SimulationMetrics,
    VisionObservation,
)

SEOUL = ZoneInfo("Asia/Seoul")

EMERGENCY_SCENARIO = VisionObservation(
    source="scenario_mock",
    intersection_id="INT-0001",
    captured_at=datetime(2026, 6, 8, 10, 24, 30, tzinfo=SEOUL),
    objects={"car": 42, "bus": 2, "truck": 4, "person": 8, "traffic_light": 4},
    queues=QueueMetrics(north=32, south=11, east=18, west=8),
    pedestrian_waiting=True,
    emergency_vehicle=EmergencyVehicle(
        present=True,
        direction=Direction.EAST,
        estimated_arrival_seconds=21,
    ),
    intersection_blocked=False,
    congestion_level="high",
)

PEDESTRIAN_SCENARIO = VisionObservation(
    source="scenario_mock",
    intersection_id="INT-0001",
    captured_at=datetime(2026, 6, 8, 10, 34, 30, tzinfo=SEOUL),
    objects={"car": 21, "bus": 1, "truck": 1, "person": 15, "traffic_light": 4},
    queues=QueueMetrics(north=9, south=10, east=7, west=8),
    pedestrian_waiting=True,
    emergency_vehicle=EmergencyVehicle(present=False),
    intersection_blocked=False,
    congestion_level="medium",
)

NORMAL_SCENARIO = VisionObservation(
    source="scenario_mock",
    intersection_id="INT-0001",
    captured_at=datetime(2026, 6, 8, 10, 44, 30, tzinfo=SEOUL),
    objects={"car": 16, "bus": 0, "truck": 1, "person": 3, "traffic_light": 4},
    queues=QueueMetrics(north=4, south=5, east=3, west=4),
    pedestrian_waiting=False,
    emergency_vehicle=EmergencyVehicle(present=False),
    intersection_blocked=False,
    congestion_level="low",
)

BLOCKED_SCENARIO = VisionObservation(
    source="scenario_mock",
    intersection_id="INT-0001",
    captured_at=datetime(2026, 6, 8, 10, 54, 30, tzinfo=SEOUL),
    objects={"car": 38, "bus": 2, "truck": 5, "person": 6, "traffic_light": 4},
    queues=QueueMetrics(north=31, south=27, east=29, west=26),
    pedestrian_waiting=True,
    emergency_vehicle=EmergencyVehicle(present=False),
    intersection_blocked=True,
    congestion_level="high",
)

SCENARIO_SIMULATION_COMPARISONS = {
    "emergency": SimulationComparison(
        source="scenario_mock",
        baseline=SimulationMetrics(
            average_wait_seconds=68,
            total_delay_seconds=128.4,
            throughput=1246,
            emergency_vehicle_clearance_seconds=45,
        ),
        recommended=SimulationMetrics(
            average_wait_seconds=56,
            total_delay_seconds=105.3,
            throughput=1298,
            emergency_vehicle_clearance_seconds=24,
        ),
        improvement={},
    ),
    "pedestrian": SimulationComparison(
        source="scenario_mock",
        baseline=SimulationMetrics(
            average_wait_seconds=52,
            total_delay_seconds=96.0,
            throughput=1188,
            emergency_vehicle_clearance_seconds=0,
        ),
        recommended=SimulationMetrics(
            average_wait_seconds=38,
            total_delay_seconds=72.0,
            throughput=1214,
            emergency_vehicle_clearance_seconds=0,
        ),
        improvement={},
    ),
    "normal": SimulationComparison(
        source="scenario_mock",
        baseline=SimulationMetrics(
            average_wait_seconds=54,
            total_delay_seconds=110.0,
            throughput=1320,
            emergency_vehicle_clearance_seconds=0,
        ),
        recommended=SimulationMetrics(
            average_wait_seconds=51,
            total_delay_seconds=104.0,
            throughput=1332,
            emergency_vehicle_clearance_seconds=0,
        ),
        improvement={},
    ),
    "blocked": SimulationComparison(
        source="scenario_mock",
        baseline=SimulationMetrics(
            average_wait_seconds=103,
            total_delay_seconds=260.0,
            throughput=940,
            emergency_vehicle_clearance_seconds=0,
        ),
        recommended=SimulationMetrics(
            average_wait_seconds=74,
            total_delay_seconds=186.2,
            throughput=1006,
            emergency_vehicle_clearance_seconds=0,
        ),
        improvement={},
    ),
}

SIMULATION_COMPARISON = SCENARIO_SIMULATION_COMPARISONS["emergency"]

SCENARIOS = {
    "emergency": EMERGENCY_SCENARIO,
    "pedestrian": PEDESTRIAN_SCENARIO,
    "normal": NORMAL_SCENARIO,
    "blocked": BLOCKED_SCENARIO,
}
