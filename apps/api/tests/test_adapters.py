from app.adapters.simulation import ScenarioTrafficSimulationAdapter
from app.adapters.vision import ScenarioVisionAnalysisAdapter
from app.domain.enums import Direction


def test_vision_adapter_returns_yolo_shaped_emergency_scenario() -> None:
    adapter = ScenarioVisionAnalysisAdapter()

    observation = adapter.analyze("emergency")

    assert observation.source == "scenario_mock"
    assert observation.intersection_id == "INT-0001"
    assert observation.objects["car"] == 42
    assert observation.queues.north == 32
    assert observation.emergency_vehicle.present is True
    assert observation.emergency_vehicle.direction == Direction.EAST


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
