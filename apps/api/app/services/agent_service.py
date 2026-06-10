from app.domain.enums import RecommendationAction
from app.domain.schemas import AgentResponseSections, SimulationComparison, VisionObservation
from app.services.persistence import SAFETY_BOUNDARY


def build_agent_sections(
    observation: VisionObservation,
    events: list[object],
    action: RecommendationAction,
    plan: dict[str, object],
    evidence: dict[str, object],
    simulation: SimulationComparison,
) -> AgentResponseSections:
    queues = observation.queues.model_dump()
    busiest_direction = max(queues, key=lambda direction: queues[direction])
    busiest_count = queues[busiest_direction]
    event_count = len(events)

    return AgentResponseSections(
        current_situation=_format_current_situation(
            observation,
            busiest_direction,
            busiest_count,
            event_count,
        ),
        recommended_action=_format_recommended_action(action, plan),
        recommendation_rationale=_format_rationale(evidence),
        authority_limit=SAFETY_BOUNDARY,
        simulation_result=_format_simulation_result(simulation),
    )


def _format_current_situation(
    observation: VisionObservation,
    busiest_direction: str,
    busiest_count: int,
    event_count: int,
) -> str:
    car_count = observation.objects.get("car", 0)
    emergency_state = "no emergency vehicle detected"
    if observation.emergency_vehicle.present:
        emergency_direction = observation.emergency_vehicle.direction
        if emergency_direction is None:
            emergency_state = "emergency vehicle detected"
        else:
            emergency_state = (
                f"emergency vehicle detected from {emergency_direction.value}"
            )

    return (
        f"{observation.intersection_id} has {observation.congestion_level} "
        f"congestion with {car_count} cars observed. {busiest_direction} has "
        f"the highest queue at {busiest_count} vehicles, {event_count} event(s) "
        f"are active, and {emergency_state}."
    )


def _format_recommended_action(
    action: RecommendationAction,
    plan: dict[str, object],
) -> str:
    return f"{action.value}: {plan}"


def _format_rationale(evidence: dict[str, object]) -> list[str]:
    rationale = [f"{key}: {value}" for key, value in evidence.items()]
    return rationale or ["No priority evidence was detected."]


def _format_simulation_result(simulation: SimulationComparison) -> str:
    return (
        f"{simulation.source} estimates total delay changes from "
        f"{simulation.baseline.total_delay_seconds} seconds to "
        f"{simulation.recommended.total_delay_seconds} seconds, with "
        f"{simulation.improvement['total_delay_percent']}% total delay improvement."
    )
