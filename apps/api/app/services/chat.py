from app.domain.schemas import VisionObservation
from app.services.knowledge import KnowledgeChunk, format_policy_evidence

SAFETY_NOTE = "This is simulation-only and does not control real traffic signals."


def answer_question(
    question: str,
    observation: VisionObservation,
    policy_evidence: list[KnowledgeChunk] | None = None,
) -> str:
    normalized = question.lower()
    queues = observation.queues.model_dump()
    busiest_direction = max(queues, key=queues.get)
    evidence_text = format_policy_evidence(policy_evidence or [])

    if "congest" in normalized or "busy" in normalized or "혼잡" in question:
        return (
            f"The most congested direction is {busiest_direction} "
            f"with {queues[busiest_direction]} queued vehicles."
            f"{evidence_text}"
        )

    if "emergency" in normalized or "긴급" in question:
        if observation.emergency_vehicle.present:
            direction = (
                observation.emergency_vehicle.direction.value
                if observation.emergency_vehicle.direction
                else "unknown"
            )
            return (
                f"Emergency priority is recommended for the {direction} approach. "
                f"{SAFETY_NOTE}{evidence_text}"
            )
        return (
            "No emergency vehicle priority is needed in the current scenario. "
            f"{SAFETY_NOTE}{evidence_text}"
        )

    return (
        f"Current congestion is {observation.congestion_level}. "
        "The dashboard recommendation is simulation-only and does not control real traffic signals."
        f"{evidence_text}"
    )
