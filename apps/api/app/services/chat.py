from app.domain.schemas import VisionObservation

SAFETY_NOTE = "This is simulation-only and does not control real traffic signals."


def answer_question(question: str, observation: VisionObservation) -> str:
    normalized = question.lower()
    queues = observation.queues.model_dump()
    busiest_direction = max(queues, key=queues.get)

    if "congest" in normalized or "busy" in normalized or "혼잡" in question:
        return (
            f"The most congested direction is {busiest_direction} "
            f"with {queues[busiest_direction]} queued vehicles."
        )

    if "emergency" in normalized or "긴급" in question:
        if observation.emergency_vehicle.present:
            direction = (
                observation.emergency_vehicle.direction.value
                if observation.emergency_vehicle.direction
                else "unknown"
            )
            return f"Emergency priority is recommended for the {direction} approach. {SAFETY_NOTE}"
        return f"No emergency vehicle priority is needed in the current scenario. {SAFETY_NOTE}"

    return (
        f"Current congestion is {observation.congestion_level}. "
        "The dashboard recommendation is simulation-only and does not control real traffic signals."
    )
