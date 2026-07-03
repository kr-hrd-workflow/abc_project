from app.domain.enums import RecommendationAction
from app.domain.schemas import VisionObservation

QUEUE_THRESHOLD = 25
SAFETY_GATE_ALL_RED_SECONDS = 10
UNKNOWN_EMERGENCY_DIRECTION_ALL_RED_SECONDS = 6
CONFLICTING_QUEUE_AXES_ALL_RED_SECONDS = 6
QUEUE_RELIEF_BASE_SCORE = 60
PEDESTRIAN_EFFICIENCY_SCORE = 45
PEDESTRIAN_NO_VEHICLE_BONUS = 10
MAINTAIN_CYCLE_SCORE = 10
VEHICLE_OBJECT_KEYS = ("car", "bus", "truck")
POLICY_SCORECARD_BACKED_POLICIES = (
    "safety_gate",
    "emergency_clearance",
    "safety_hold",
    "queue_relief",
    "pedestrian_efficiency",
    "maintain_cycle",
)
POLICY_DECISION_ORDER = (
    "safety_gate",
    "safety_hold",
    "emergency_clearance",
    "queue_relief",
    "pedestrian_efficiency",
    "maintain_cycle",
)
POLICY_SCORECARD_REQUIRED_EVIDENCE = (
    "selected_policy",
    "candidate_scores",
    "constraints",
    "blocked_reasons",
    "required_inputs",
    "objective_metrics",
    "confidence",
    "operator_note",
)
POLICY_SCORING_CONSTANTS = {
    "queue_threshold": QUEUE_THRESHOLD,
    "safety_gate_all_red_seconds": SAFETY_GATE_ALL_RED_SECONDS,
    "unknown_emergency_direction_all_red_seconds": (
        UNKNOWN_EMERGENCY_DIRECTION_ALL_RED_SECONDS
    ),
    "conflicting_queue_axes_all_red_seconds": (
        CONFLICTING_QUEUE_AXES_ALL_RED_SECONDS
    ),
    "queue_relief_base_score": QUEUE_RELIEF_BASE_SCORE,
    "pedestrian_efficiency_score": PEDESTRIAN_EFFICIENCY_SCORE,
    "pedestrian_no_vehicle_bonus": PEDESTRIAN_NO_VEHICLE_BONUS,
    "maintain_cycle_score": MAINTAIN_CYCLE_SCORE,
}
EMERGENCY_PRIORITY_PLANS: dict[str, dict[str, int]] = {
    "east": {"east": 35, "north": 20, "south": 20, "west": 15},
    "north": {"north": 35, "east": 20, "west": 20, "south": 15},
    "south": {"south": 35, "east": 20, "west": 20, "north": 15},
    "west": {"west": 35, "north": 20, "south": 20, "east": 15},
}
QUEUE_RELIEF_OPERATOR_NOTES = {
    "north": (
        "Northbound queue exceeds the local threshold; extend green for "
        "queue relief while preserving operator review."
    ),
    "south": (
        "Southbound queue exceeds the local threshold; extend green for "
        "queue relief while preserving operator review."
    ),
    "east": (
        "Eastbound queue exceeds the local threshold; extend green for "
        "queue relief while preserving operator review."
    ),
    "west": (
        "Westbound queue exceeds the local threshold; extend green for "
        "queue relief while preserving operator review."
    ),
}
PEDESTRIAN_EFFICIENCY_OPERATOR_NOTE = (
    "Pedestrians are waiting and vehicle pressure is low; recommend "
    "a pedestrian phase while preserving operator review."
)
MAINTAIN_CYCLE_OPERATOR_NOTE = (
    "No safety gate, emergency, queue, or pedestrian priority is active; "
    "keep the normal cycle under operator review."
)
CONFLICTING_QUEUE_AXES_OPERATOR_NOTE = (
    "Queues exceed the local threshold on conflicting movement axes; hold "
    "all-red and request signal phase timing before choosing a single green "
    "extension."
)


def _score_operational_candidates(
    highest_queue: int,
    pedestrian_waiting: bool,
    vehicle_pressure_present: bool,
) -> tuple[dict[str, int], dict[str, bool]]:
    queue_threshold_exceeded = highest_queue > QUEUE_THRESHOLD
    pedestrian_score = 0
    if pedestrian_waiting:
        pedestrian_score = PEDESTRIAN_EFFICIENCY_SCORE
        if not vehicle_pressure_present:
            pedestrian_score += PEDESTRIAN_NO_VEHICLE_BONUS

    return (
        {
            "queue_relief": (
                QUEUE_RELIEF_BASE_SCORE + highest_queue - QUEUE_THRESHOLD
                if queue_threshold_exceeded
                else 0
            ),
            "pedestrian_efficiency": pedestrian_score,
            "maintain_cycle": MAINTAIN_CYCLE_SCORE,
        },
        {
            "queue_threshold_exceeded": queue_threshold_exceeded,
            "pedestrian_waiting": pedestrian_waiting,
            "vehicle_pressure_present": vehicle_pressure_present,
        },
    )


def _has_vehicle_pressure(objects: dict[str, int], highest_queue: int) -> bool:
    return highest_queue > 0 or any(
        objects.get(vehicle_key, 0) > 0 for vehicle_key in VEHICLE_OBJECT_KEYS
    )


def _get_conflicting_queue_axes(
    queues: dict[str, int],
) -> tuple[bool, dict[str, int], dict[str, bool]]:
    north_south_max_queue = max(queues["north"], queues["south"])
    east_west_max_queue = max(queues["east"], queues["west"])
    north_south_exceeded = north_south_max_queue > QUEUE_THRESHOLD
    east_west_exceeded = east_west_max_queue > QUEUE_THRESHOLD

    return (
        north_south_exceeded and east_west_exceeded,
        {
            "north_south_max_queue": north_south_max_queue,
            "east_west_max_queue": east_west_max_queue,
        },
        {
            "conflicting_queue_axes": north_south_exceeded
            and east_west_exceeded,
            "north_south_queue_threshold_exceeded": north_south_exceeded,
            "east_west_queue_threshold_exceeded": east_west_exceeded,
        },
    )


def _build_policy_scorecard(
    selected_policy: str,
    candidate_scores: dict[str, int],
    constraints: dict[str, bool],
    operator_note: str,
    blocked_reasons: list[str] | None = None,
    required_inputs: list[str] | None = None,
    objective_metrics: dict[str, object] | None = None,
    confidence: str = "high",
) -> dict[str, object]:
    return {
        "selected_policy": selected_policy,
        "candidate_scores": candidate_scores,
        "constraints": constraints,
        "blocked_reasons": blocked_reasons or [],
        "required_inputs": required_inputs or [],
        "objective_metrics": objective_metrics or {},
        "confidence": confidence,
        "operator_note": operator_note,
    }


def recommend_signal_action(
    observation: VisionObservation,
) -> tuple[RecommendationAction, dict[str, object], dict[str, object]]:
    if observation.intersection_blocked:
        return (
            RecommendationAction.ALL_RED_SAFETY,
            {"all_red": SAFETY_GATE_ALL_RED_SECONDS},
            {
                "reason": "intersection_blocked",
                "policy_priority": "safety_gate",
                "policy_scorecard": _build_policy_scorecard(
                    selected_policy="safety_gate",
                    candidate_scores={},
                    constraints={
                        "intersection_blocked": True,
                        "emergency_vehicle_present": (
                            observation.emergency_vehicle.present
                        ),
                    },
                    blocked_reasons=["intersection_blocked"],
                    objective_metrics={
                        "all_red_seconds": SAFETY_GATE_ALL_RED_SECONDS,
                    },
                    operator_note=(
                        "Intersection blockage detected; hold all-red as a "
                        "safety gate before considering operational "
                        "optimization."
                    ),
                ),
            },
        )

    if observation.emergency_vehicle.present:
        if observation.emergency_vehicle.direction is None:
            return (
                RecommendationAction.ALL_RED_SAFETY,
                {"all_red": UNKNOWN_EMERGENCY_DIRECTION_ALL_RED_SECONDS},
                {
                    "reason": "emergency_vehicle_direction_unknown",
                    "policy_priority": "safety_hold",
                    "estimated_arrival_seconds": (
                        observation.emergency_vehicle.estimated_arrival_seconds
                    ),
                    "required_input": "emergency_vehicle.direction",
                    "policy_scorecard": _build_policy_scorecard(
                        selected_policy="safety_hold",
                        candidate_scores={},
                        constraints={
                            "emergency_vehicle_present": True,
                            "emergency_vehicle_direction_known": False,
                        },
                        blocked_reasons=[
                            "emergency_vehicle_direction_unknown"
                        ],
                        required_inputs=["emergency_vehicle.direction"],
                        confidence="low",
                        operator_note=(
                            "Emergency vehicle is detected, but its approach "
                            "direction is unknown; hold all-red until "
                            "direction evidence is available."
                        ),
                    ),
                },
            )

        direction = observation.emergency_vehicle.direction.value
        return (
            RecommendationAction.EMERGENCY_PRIORITY,
            EMERGENCY_PRIORITY_PLANS[direction],
            {
                "reason": "emergency_vehicle_approach",
                "direction": direction,
                "policy_priority": "emergency_clearance",
                "estimated_arrival_seconds": (
                    observation.emergency_vehicle.estimated_arrival_seconds
                ),
                "policy_scorecard": _build_policy_scorecard(
                    selected_policy="emergency_clearance",
                    candidate_scores={},
                    constraints={
                        "emergency_vehicle_present": True,
                        "emergency_vehicle_direction_known": True,
                    },
                    objective_metrics={
                        "direction": direction,
                        "estimated_arrival_seconds": (
                            observation.emergency_vehicle.estimated_arrival_seconds
                        ),
                    },
                    operator_note=(
                        f"Emergency vehicle is approaching from the {direction}; "
                        "prioritize clearance while preserving operator review."
                    ),
                ),
            },
        )

    queues = observation.queues.model_dump()
    highest_direction = max(queues, key=queues.get)
    highest_queue = queues[highest_direction]
    vehicle_pressure_present = _has_vehicle_pressure(
        objects=observation.objects,
        highest_queue=highest_queue,
    )
    candidate_scores, constraints = _score_operational_candidates(
        highest_queue=highest_queue,
        pedestrian_waiting=observation.pedestrian_waiting,
        vehicle_pressure_present=vehicle_pressure_present,
    )
    (
        conflicting_queue_axes,
        queue_axis_metrics,
        queue_axis_constraints,
    ) = _get_conflicting_queue_axes(queues)
    if conflicting_queue_axes:
        return (
            RecommendationAction.ALL_RED_SAFETY,
            {"all_red": CONFLICTING_QUEUE_AXES_ALL_RED_SECONDS},
            {
                "reason": "conflicting_queue_axes",
                "policy_priority": "safety_hold",
                "candidate_scores": candidate_scores,
                "constraints": constraints | queue_axis_constraints,
                "policy_scorecard": _build_policy_scorecard(
                    selected_policy="safety_hold",
                    candidate_scores=candidate_scores,
                    constraints=constraints | queue_axis_constraints,
                    blocked_reasons=["conflicting_queue_axes"],
                    required_inputs=["signal_phase.remaining_seconds"],
                    objective_metrics={
                        "all_red_seconds": CONFLICTING_QUEUE_AXES_ALL_RED_SECONDS,
                        **queue_axis_metrics,
                    },
                    confidence="low",
                    operator_note=CONFLICTING_QUEUE_AXES_OPERATOR_NOTE,
                ),
            },
        )
    selected_policy = max(candidate_scores, key=candidate_scores.get)

    if selected_policy == "queue_relief":
        return (
            RecommendationAction.GREEN_EXTENSION,
            {highest_direction: 40},
            {
                "reason": "queue_threshold_exceeded",
                "direction": highest_direction,
                "queue": highest_queue,
                "policy_priority": "queue_relief",
                "candidate_scores": candidate_scores,
                "constraints": constraints,
                "policy_scorecard": _build_policy_scorecard(
                    selected_policy="queue_relief",
                    candidate_scores=candidate_scores,
                    constraints=constraints,
                    operator_note=QUEUE_RELIEF_OPERATOR_NOTES[highest_direction],
                    objective_metrics={
                        "max_queue": highest_queue,
                        "queue_over_threshold": highest_queue - QUEUE_THRESHOLD,
                    },
                ),
            },
        )

    if selected_policy == "pedestrian_efficiency":
        return (
            RecommendationAction.PEDESTRIAN_PHASE,
            {"pedestrian_crossing": 20},
            {
                "reason": "pedestrian_waiting",
                "policy_priority": "pedestrian_efficiency",
                "candidate_scores": candidate_scores,
                "constraints": constraints,
                "policy_scorecard": _build_policy_scorecard(
                    selected_policy="pedestrian_efficiency",
                    candidate_scores=candidate_scores,
                    constraints=constraints,
                    objective_metrics={
                        "max_queue": highest_queue,
                        "vehicle_pressure_present": vehicle_pressure_present,
                        "pedestrian_waiting": observation.pedestrian_waiting,
                    },
                    operator_note=PEDESTRIAN_EFFICIENCY_OPERATOR_NOTE,
                ),
            },
        )

    return (
        RecommendationAction.MAINTAIN_CYCLE,
        {"default_cycle": 90},
        {
            "reason": "normal_flow",
            "policy_priority": "maintain_cycle",
            "candidate_scores": candidate_scores,
            "constraints": constraints,
            "policy_scorecard": _build_policy_scorecard(
                selected_policy="maintain_cycle",
                candidate_scores=candidate_scores,
                constraints=constraints,
                objective_metrics={
                    "max_queue": highest_queue,
                    "highest_queue_direction": highest_direction,
                },
                operator_note=MAINTAIN_CYCLE_OPERATOR_NOTE,
            ),
        },
    )
