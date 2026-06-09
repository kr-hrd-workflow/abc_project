from app.adapters.simulation import ScenarioTrafficSimulationAdapter
from datetime import datetime
from zoneinfo import ZoneInfo

from app.adapters.vision import (
    OpenCVYoloVisionAnalysisAdapter,
    ScenarioVisionAnalysisAdapter,
    YoloDetection,
    YoloFrameAnalysis,
)
from app.domain.enums import Direction
from app.domain.schemas import VisionObservation


def test_vision_adapter_returns_yolo_shaped_emergency_scenario() -> None:
    adapter = ScenarioVisionAnalysisAdapter()

    observation = adapter.analyze("emergency")

    assert observation.source == "scenario_mock"
    assert observation.intersection_id == "INT-0001"
    assert observation.objects["car"] == 42
    assert observation.queues.north == 32
    assert observation.emergency_vehicle.present is True
    assert observation.emergency_vehicle.direction == Direction.EAST


def test_opencv_yolo_adapter_returns_vision_observation_contract() -> None:
    captured_at = datetime(2026, 6, 9, 8, 15, tzinfo=ZoneInfo("Asia/Seoul"))

    class StubYoloAnalyzer:
        def analyze_frame(self, input_id: str) -> YoloFrameAnalysis:
            assert input_id == "emergency-east-frame"
            return YoloFrameAnalysis(
                captured_at=captured_at,
                detections=[
                    YoloDetection(label="car", direction=Direction.NORTH),
                    YoloDetection(label="car", direction=Direction.NORTH),
                    YoloDetection(label="bus", direction=Direction.EAST),
                    YoloDetection(label="person", direction=Direction.SOUTH),
                    YoloDetection(
                        label="emergency_vehicle",
                        direction=Direction.EAST,
                        estimated_arrival_seconds=14,
                    ),
                ],
                queues={
                    Direction.NORTH: 12,
                    Direction.SOUTH: 3,
                    Direction.EAST: 9,
                    Direction.WEST: 0,
                },
                pedestrian_waiting=True,
                intersection_blocked=False,
                congestion_level="medium",
            )

    adapter = OpenCVYoloVisionAnalysisAdapter(detector=StubYoloAnalyzer())

    observation = adapter.analyze("emergency-east-frame")

    assert isinstance(observation, VisionObservation)
    assert observation.source == "opencv_yolo"
    assert observation.intersection_id == "INT-0001"
    assert observation.captured_at == captured_at
    assert observation.objects == {
        "bus": 1,
        "car": 2,
        "emergency_vehicle": 1,
        "person": 1,
    }
    assert observation.queues.north == 12
    assert observation.queues.south == 3
    assert observation.queues.east == 9
    assert observation.queues.west == 0
    assert observation.pedestrian_waiting is True
    assert observation.emergency_vehicle.present is True
    assert observation.emergency_vehicle.direction == Direction.EAST
    assert observation.emergency_vehicle.estimated_arrival_seconds == 14
    assert observation.intersection_blocked is False
    assert observation.congestion_level == "medium"


def test_vision_adapter_defaults_unknown_scenario_to_emergency() -> None:
    adapter = ScenarioVisionAnalysisAdapter()

    observation = adapter.analyze("missing")

    assert observation.objects["car"] == 42
    assert observation.emergency_vehicle.present is True
    assert observation.emergency_vehicle.direction == Direction.EAST


def test_simulation_adapter_returns_sumo_shaped_comparison() -> None:
    adapter = ScenarioTrafficSimulationAdapter()

    comparison = adapter.compare_signal_plan("emergency")

    assert comparison.source == "scenario_mock"
    assert comparison.baseline.total_delay_seconds == 128.4
    assert comparison.recommended.total_delay_seconds == 105.3
    assert comparison.improvement["total_delay_percent"] == 18.0
