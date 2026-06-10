from app.domain.enums import RecommendationAction
from app.domain.schemas import EmergencyVehicle, QueueMetrics
from app.scenarios.data import (
    BLOCKED_SCENARIO,
    EMERGENCY_SCENARIO,
    NORMAL_SCENARIO,
    PEDESTRIAN_SCENARIO,
)
from app.services.recommendations import recommend_signal_action


def test_emergency_outranks_queue_congestion() -> None:
    action, plan, evidence = recommend_signal_action(EMERGENCY_SCENARIO)

    assert action == RecommendationAction.EMERGENCY_PRIORITY
    assert plan == {"east": 35, "north": 20, "south": 20, "west": 15}
    assert evidence["reason"] == "emergency_vehicle_approach"
    assert evidence["direction"] == "east"


def test_emergency_priority_uses_detected_direction() -> None:
    observation = EMERGENCY_SCENARIO.model_copy(
        update={
            "emergency_vehicle": EmergencyVehicle(
                present=True,
                direction="north",
                estimated_arrival_seconds=12,
            )
        }
    )

    action, plan, evidence = recommend_signal_action(observation)

    assert action == RecommendationAction.EMERGENCY_PRIORITY
    assert plan["north"] == 35
    assert evidence["direction"] == "north"


def test_blocked_outranks_ordinary_congestion_and_pedestrians() -> None:
    action, plan, evidence = recommend_signal_action(BLOCKED_SCENARIO)

    assert action == RecommendationAction.ALL_RED_SAFETY
    assert plan == {"all_red": 10}
    assert evidence["reason"] == "intersection_blocked"


def test_pedestrian_waiting_without_higher_priority() -> None:
    action, plan, evidence = recommend_signal_action(PEDESTRIAN_SCENARIO)

    assert action == RecommendationAction.PEDESTRIAN_PHASE
    assert plan == {"pedestrian_crossing": 20}
    assert evidence["reason"] == "pedestrian_waiting"


def test_queue_threshold_recommends_green_extension_without_higher_priority() -> None:
    observation = NORMAL_SCENARIO.model_copy(
        update={"queues": QueueMetrics(north=26, south=5, east=3, west=4)}
    )

    action, plan, evidence = recommend_signal_action(observation)

    assert action == RecommendationAction.GREEN_EXTENSION
    assert plan == {"north": 40}
    assert evidence == {
        "reason": "queue_threshold_exceeded",
        "direction": "north",
        "queue": 26,
    }


def test_normal_flow_keeps_default_cycle() -> None:
    action, plan, evidence = recommend_signal_action(NORMAL_SCENARIO)

    assert action == RecommendationAction.MAINTAIN_CYCLE
    assert plan == {"default_cycle": 90}
    assert evidence["reason"] == "normal_flow"
