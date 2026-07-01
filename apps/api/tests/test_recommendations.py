from app.domain.enums import RecommendationAction
from app.domain.schemas import EmergencyVehicle, QueueMetrics
from app.scenarios.data import (
    BLOCKED_SCENARIO,
    EMERGENCY_SCENARIO,
    NORMAL_SCENARIO,
    PEDESTRIAN_SCENARIO,
)
from app.services.recommendations import (
    POLICY_DECISION_ORDER,
    POLICY_SCORING_CONSTANTS,
    POLICY_SCORECARD_REQUIRED_EVIDENCE,
    POLICY_SCORECARD_BACKED_POLICIES,
    recommend_signal_action,
)


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
    assert evidence["policy_priority"] == "emergency_clearance"
    assert evidence["estimated_arrival_seconds"] == 12


def test_emergency_priority_evidence_includes_operator_policy_scorecard() -> None:
    observation = EMERGENCY_SCENARIO.model_copy(
        update={
            "emergency_vehicle": EmergencyVehicle(
                present=True,
                direction="north",
                estimated_arrival_seconds=12,
            )
        }
    )

    _action, _plan, evidence = recommend_signal_action(observation)

    assert evidence["policy_scorecard"] == {
        "selected_policy": "emergency_clearance",
        "candidate_scores": {},
        "constraints": {
            "emergency_vehicle_present": True,
            "emergency_vehicle_direction_known": True,
        },
        "blocked_reasons": [],
        "required_inputs": [],
        "objective_metrics": {
            "direction": "north",
            "estimated_arrival_seconds": 12,
        },
        "confidence": "high",
        "operator_note": (
            "Emergency vehicle is approaching from the north; prioritize "
            "clearance while preserving operator review."
        ),
    }


def test_emergency_without_direction_does_not_guess_priority_lane() -> None:
    observation = EMERGENCY_SCENARIO.model_copy(
        update={
            "emergency_vehicle": EmergencyVehicle(
                present=True,
                direction=None,
                estimated_arrival_seconds=9,
            )
        }
    )

    action, plan, evidence = recommend_signal_action(observation)

    assert action == RecommendationAction.ALL_RED_SAFETY
    assert plan == {"all_red": 6}
    assert evidence["reason"] == "emergency_vehicle_direction_unknown"
    assert evidence["policy_priority"] == "safety_hold"
    assert evidence["estimated_arrival_seconds"] == 9
    assert evidence["required_input"] == "emergency_vehicle.direction"


def test_unknown_emergency_direction_scorecard_requires_direction_input() -> None:
    observation = EMERGENCY_SCENARIO.model_copy(
        update={
            "emergency_vehicle": EmergencyVehicle(
                present=True,
                direction=None,
                estimated_arrival_seconds=9,
            )
        }
    )

    _action, _plan, evidence = recommend_signal_action(observation)

    assert evidence["policy_scorecard"] == {
        "selected_policy": "safety_hold",
        "candidate_scores": {},
        "constraints": {
            "emergency_vehicle_present": True,
            "emergency_vehicle_direction_known": False,
        },
        "blocked_reasons": ["emergency_vehicle_direction_unknown"],
        "required_inputs": ["emergency_vehicle.direction"],
        "objective_metrics": {},
        "confidence": "low",
        "operator_note": (
            "Emergency vehicle is detected, but its approach direction is "
            "unknown; hold all-red until direction evidence is available."
        ),
    }


def test_blocked_intersection_safety_gate_outranks_emergency_priority() -> None:
    observation = EMERGENCY_SCENARIO.model_copy(
        update={"intersection_blocked": True}
    )

    action, plan, evidence = recommend_signal_action(observation)

    assert action == RecommendationAction.ALL_RED_SAFETY
    assert plan == {"all_red": 10}
    assert evidence["reason"] == "intersection_blocked"
    assert evidence["policy_priority"] == "safety_gate"


def test_blocked_intersection_evidence_includes_operator_policy_scorecard() -> None:
    observation = EMERGENCY_SCENARIO.model_copy(
        update={"intersection_blocked": True}
    )

    _action, _plan, evidence = recommend_signal_action(observation)

    assert evidence["policy_scorecard"] == {
        "selected_policy": "safety_gate",
        "candidate_scores": {},
        "constraints": {
            "intersection_blocked": True,
            "emergency_vehicle_present": True,
        },
        "blocked_reasons": ["intersection_blocked"],
        "required_inputs": [],
        "objective_metrics": {
            "all_red_seconds": 10,
        },
        "confidence": "high",
        "operator_note": (
            "Intersection blockage detected; hold all-red as a safety gate "
            "before considering operational optimization."
        ),
    }


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


def test_pedestrian_efficiency_scores_higher_when_no_vehicle_pressure() -> None:
    observation = NORMAL_SCENARIO.model_copy(
        update={
            "objects": {
                "car": 0,
                "bus": 0,
                "truck": 0,
                "person": 3,
                "traffic_light": 4,
            },
            "queues": QueueMetrics(north=0, south=0, east=0, west=0),
            "pedestrian_waiting": True,
        }
    )

    action, plan, evidence = recommend_signal_action(observation)

    assert action == RecommendationAction.PEDESTRIAN_PHASE
    assert plan == {"pedestrian_crossing": 20}
    assert evidence["policy_priority"] == "pedestrian_efficiency"
    assert evidence["candidate_scores"]["pedestrian_efficiency"] > evidence[
        "candidate_scores"
    ]["maintain_cycle"]
    assert evidence["constraints"] == {
        "queue_threshold_exceeded": False,
        "pedestrian_waiting": True,
        "vehicle_pressure_present": False,
    }


def test_pedestrian_efficiency_evidence_includes_operator_policy_scorecard() -> None:
    observation = NORMAL_SCENARIO.model_copy(
        update={
            "objects": {
                "car": 0,
                "bus": 0,
                "truck": 0,
                "person": 3,
                "traffic_light": 4,
            },
            "queues": QueueMetrics(north=0, south=0, east=0, west=0),
            "pedestrian_waiting": True,
        }
    )

    _action, _plan, evidence = recommend_signal_action(observation)

    assert evidence["policy_scorecard"] == {
        "selected_policy": "pedestrian_efficiency",
        "candidate_scores": {
            "queue_relief": 0,
            "pedestrian_efficiency": 55,
            "maintain_cycle": 10,
        },
        "constraints": {
            "queue_threshold_exceeded": False,
            "pedestrian_waiting": True,
            "vehicle_pressure_present": False,
        },
        "blocked_reasons": [],
        "required_inputs": [],
        "objective_metrics": {
            "max_queue": 0,
            "vehicle_pressure_present": False,
            "pedestrian_waiting": True,
        },
        "confidence": "high",
        "operator_note": (
            "Pedestrians are waiting and vehicle pressure is low; recommend "
            "a pedestrian phase while preserving operator review."
        ),
    }


def test_queue_threshold_recommends_green_extension_without_higher_priority() -> None:
    observation = NORMAL_SCENARIO.model_copy(
        update={"queues": QueueMetrics(north=26, south=5, east=3, west=4)}
    )

    action, plan, evidence = recommend_signal_action(observation)

    assert action == RecommendationAction.GREEN_EXTENSION
    assert plan == {"north": 40}
    assert evidence["reason"] == "queue_threshold_exceeded"
    assert evidence["direction"] == "north"
    assert evidence["queue"] == 26
    assert evidence["policy_priority"] == "queue_relief"
    assert evidence["candidate_scores"] == {
        "queue_relief": 61,
        "pedestrian_efficiency": 0,
        "maintain_cycle": 10,
    }
    assert evidence["constraints"] == {
        "queue_threshold_exceeded": True,
        "pedestrian_waiting": False,
        "vehicle_pressure_present": True,
    }


def test_queue_relief_scores_above_pedestrian_efficiency_when_congested() -> None:
    observation = NORMAL_SCENARIO.model_copy(
        update={
            "queues": QueueMetrics(north=34, south=5, east=3, west=4),
            "pedestrian_waiting": True,
        }
    )

    action, plan, evidence = recommend_signal_action(observation)

    assert action == RecommendationAction.GREEN_EXTENSION
    assert plan == {"north": 40}
    assert evidence["policy_priority"] == "queue_relief"
    assert evidence["candidate_scores"]["queue_relief"] > evidence[
        "candidate_scores"
    ]["pedestrian_efficiency"]
    assert evidence["constraints"] == {
        "queue_threshold_exceeded": True,
        "pedestrian_waiting": True,
        "vehicle_pressure_present": True,
    }


def test_queue_relief_evidence_includes_operator_policy_scorecard() -> None:
    observation = NORMAL_SCENARIO.model_copy(
        update={"queues": QueueMetrics(north=34, south=5, east=3, west=4)}
    )

    _action, _plan, evidence = recommend_signal_action(observation)

    assert evidence["policy_scorecard"] == {
        "selected_policy": "queue_relief",
        "candidate_scores": {
            "queue_relief": 69,
            "pedestrian_efficiency": 0,
            "maintain_cycle": 10,
        },
        "constraints": {
            "queue_threshold_exceeded": True,
            "pedestrian_waiting": False,
            "vehicle_pressure_present": True,
        },
        "blocked_reasons": [],
        "required_inputs": [],
        "objective_metrics": {
            "max_queue": 34,
            "queue_over_threshold": 9,
        },
        "confidence": "high",
        "operator_note": (
            "Northbound queue exceeds the local threshold; extend green for "
            "queue relief while preserving operator review."
        ),
    }


def test_conflicting_queue_axes_hold_for_manual_review() -> None:
    observation = NORMAL_SCENARIO.model_copy(
        update={"queues": QueueMetrics(north=32, south=4, east=31, west=5)}
    )

    action, plan, evidence = recommend_signal_action(observation)

    assert action == RecommendationAction.ALL_RED_SAFETY
    assert plan == {"all_red": 6}
    assert evidence["reason"] == "conflicting_queue_axes"
    assert evidence["policy_priority"] == "safety_hold"
    assert evidence["policy_scorecard"] == {
        "selected_policy": "safety_hold",
        "candidate_scores": {
            "queue_relief": 67,
            "pedestrian_efficiency": 0,
            "maintain_cycle": 10,
        },
        "constraints": {
            "queue_threshold_exceeded": True,
            "pedestrian_waiting": False,
            "vehicle_pressure_present": True,
            "conflicting_queue_axes": True,
            "north_south_queue_threshold_exceeded": True,
            "east_west_queue_threshold_exceeded": True,
        },
        "blocked_reasons": ["conflicting_queue_axes"],
        "required_inputs": ["signal_phase.remaining_seconds"],
        "objective_metrics": {
            "all_red_seconds": 6,
            "north_south_max_queue": 32,
            "east_west_max_queue": 31,
        },
        "confidence": "low",
        "operator_note": (
            "Queues exceed the local threshold on conflicting movement axes; "
            "hold all-red and request signal phase timing before choosing a "
            "single green extension."
        ),
    }


def test_normal_flow_keeps_default_cycle() -> None:
    action, plan, evidence = recommend_signal_action(NORMAL_SCENARIO)

    assert action == RecommendationAction.MAINTAIN_CYCLE
    assert plan == {"default_cycle": 90}
    assert evidence["reason"] == "normal_flow"


def test_normal_flow_evidence_includes_operator_policy_scorecard() -> None:
    _action, _plan, evidence = recommend_signal_action(NORMAL_SCENARIO)

    assert evidence["policy_scorecard"] == {
        "selected_policy": "maintain_cycle",
        "candidate_scores": {
            "queue_relief": 0,
            "pedestrian_efficiency": 0,
            "maintain_cycle": 10,
        },
        "constraints": {
            "queue_threshold_exceeded": False,
            "pedestrian_waiting": False,
            "vehicle_pressure_present": True,
        },
        "blocked_reasons": [],
        "required_inputs": [],
        "objective_metrics": {
            "max_queue": 5,
            "highest_queue_direction": "south",
        },
        "confidence": "high",
        "operator_note": (
            "No safety gate, emergency, queue, or pedestrian priority is "
            "active; keep the normal cycle under operator review."
        ),
    }


def test_policy_scorecard_contract_covers_all_selected_policies() -> None:
    observations = [
        BLOCKED_SCENARIO,
        EMERGENCY_SCENARIO,
        EMERGENCY_SCENARIO.model_copy(
            update={
                "emergency_vehicle": EmergencyVehicle(
                    present=True,
                    direction=None,
                    estimated_arrival_seconds=9,
                )
            }
        ),
        NORMAL_SCENARIO.model_copy(
            update={"queues": QueueMetrics(north=34, south=5, east=3, west=4)}
        ),
        NORMAL_SCENARIO.model_copy(
            update={
                "objects": {
                    "car": 0,
                    "bus": 0,
                    "truck": 0,
                    "person": 3,
                    "traffic_light": 4,
                },
                "queues": QueueMetrics(north=0, south=0, east=0, west=0),
                "pedestrian_waiting": True,
            }
        ),
        NORMAL_SCENARIO,
    ]

    selected_policies = {
        recommend_signal_action(observation)[2]["policy_scorecard"][
            "selected_policy"
        ]
        for observation in observations
    }

    assert set(POLICY_SCORECARD_BACKED_POLICIES) == selected_policies


def test_policy_contract_exposes_decision_order_and_scoring_constants() -> None:
    assert POLICY_DECISION_ORDER == (
        "safety_gate",
        "safety_hold",
        "emergency_clearance",
        "queue_relief",
        "pedestrian_efficiency",
        "maintain_cycle",
    )
    assert POLICY_SCORING_CONSTANTS == {
        "queue_threshold": 25,
        "safety_gate_all_red_seconds": 10,
        "unknown_emergency_direction_all_red_seconds": 6,
        "conflicting_queue_axes_all_red_seconds": 6,
        "queue_relief_base_score": 60,
        "pedestrian_efficiency_score": 45,
        "pedestrian_no_vehicle_bonus": 10,
        "maintain_cycle_score": 10,
    }
    assert POLICY_SCORECARD_REQUIRED_EVIDENCE == (
        "selected_policy",
        "candidate_scores",
        "constraints",
        "blocked_reasons",
        "required_inputs",
        "objective_metrics",
        "confidence",
        "operator_note",
    )
