from app.domain.enums import RecommendationAction
from app.domain.schemas import VisionObservation

QUEUE_THRESHOLD = 25
EMERGENCY_PRIORITY_PLANS: dict[str, dict[str, int]] = {
    "east": {"east": 35, "north": 20, "south": 20, "west": 15},
    "north": {"north": 35, "east": 20, "west": 20, "south": 15},
    "south": {"south": 35, "east": 20, "west": 20, "north": 15},
    "west": {"west": 35, "north": 20, "south": 20, "east": 15},
}


def recommend_signal_action(
    observation: VisionObservation,
) -> tuple[RecommendationAction, dict[str, object], dict[str, object]]:
    if observation.emergency_vehicle.present:
        direction = (
            observation.emergency_vehicle.direction.value
            if observation.emergency_vehicle.direction
            else "unknown"
        )
        return (
            RecommendationAction.EMERGENCY_PRIORITY,
            EMERGENCY_PRIORITY_PLANS.get(direction, EMERGENCY_PRIORITY_PLANS["east"]),
            {"reason": "emergency_vehicle_approach", "direction": direction},
        )

    if observation.intersection_blocked:
        return (
            RecommendationAction.ALL_RED_SAFETY,
            {"all_red": 10},
            {"reason": "intersection_blocked"},
        )

    queues = observation.queues.model_dump()
    highest_direction = max(queues, key=queues.get)
    highest_queue = queues[highest_direction]
    if highest_queue > QUEUE_THRESHOLD:
        return (
            RecommendationAction.GREEN_EXTENSION,
            {highest_direction: 40},
            {
                "reason": "queue_threshold_exceeded",
                "direction": highest_direction,
                "queue": highest_queue,
            },
        )

    if observation.pedestrian_waiting:
        return (
            RecommendationAction.PEDESTRIAN_PHASE,
            {"pedestrian_crossing": 20},
            {"reason": "pedestrian_waiting"},
        )

    return (
        RecommendationAction.MAINTAIN_CYCLE,
        {"default_cycle": 90},
        {"reason": "normal_flow"},
    )
