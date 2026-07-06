from app.domain.schemas import SimulationComparison, VisionObservation
from app.services.knowledge import KnowledgeChunk, format_policy_evidence

SAFETY_NOTE = "This is simulation-only and does not control real traffic signals."
KOREAN_SAFETY_NOTE = "이 권고는 시뮬레이션 전용이며 실제 교통 신호를 제어하지 않습니다."


def answer_question(
    question: str,
    observation: VisionObservation,
    policy_evidence: list[KnowledgeChunk] | None = None,
    response_locale: str | None = None,
    simulation: SimulationComparison | None = None,
) -> str:
    normalized = question.lower()
    use_korean = response_locale == "ko" or _contains_hangul(question)
    evidence_text = "" if use_korean else format_policy_evidence(policy_evidence or [])
    queues = observation.queues.model_dump()
    busiest_direction = max(queues, key=queues.get)

    if _asks_about_wait_time(question, normalized) and simulation is not None:
        wait_delta = simulation.improvement.get(
            "average_wait_delta_seconds",
            simulation.recommended.average_wait_seconds
            - simulation.baseline.average_wait_seconds,
        )
        if use_korean:
            return (
                "시뮬레이션 비교 기준으로 평균 대기시간은 "
                f"{simulation.baseline.average_wait_seconds:.1f}초에서 "
                f"{simulation.recommended.average_wait_seconds:.1f}초로 "
                f"{abs(wait_delta):.1f}초 감소합니다. "
                f"총 지체 개선율은 {simulation.improvement.get('total_delay_percent', 0):.1f}%입니다. "
                f"{KOREAN_SAFETY_NOTE}"
            )
        return (
            "Based on the simulation comparison, average wait time changes from "
            f"{simulation.baseline.average_wait_seconds:.1f}s to "
            f"{simulation.recommended.average_wait_seconds:.1f}s, a "
            f"{abs(wait_delta):.1f}s reduction. Total delay improves by "
            f"{simulation.improvement.get('total_delay_percent', 0):.1f}%. "
            f"{SAFETY_NOTE}{evidence_text}"
        )

    if "congest" in normalized or "busy" in normalized or "혼잡" in question:
        if use_korean:
            direction = _format_direction_ko(busiest_direction)
            return (
                f"가장 혼잡한 접근로는 {direction} 방향이며 "
                f"대기 차량은 {queues[busiest_direction]}대입니다. "
                f"{KOREAN_SAFETY_NOTE}"
            )
        return (
            f"The most congested direction is {busiest_direction} "
            f"with {queues[busiest_direction]} queued vehicles. "
            f"{SAFETY_NOTE}{evidence_text}"
        )

    if "emergency" in normalized or "긴급" in question:
        if observation.emergency_vehicle.present:
            direction = (
                observation.emergency_vehicle.direction.value
                if observation.emergency_vehicle.direction
                else "unknown"
            )
            if use_korean:
                return (
                    f"{_format_direction_ko(direction)} 접근로의 긴급차량 우선 통과를 "
                    f"권고합니다. {KOREAN_SAFETY_NOTE}"
                )
            return (
                f"Emergency priority is recommended for the {direction} approach. "
                f"{SAFETY_NOTE}{evidence_text}"
            )
        if use_korean:
            return (
                "현재 상황에서는 긴급차량 우선 신호가 필요하지 않습니다. "
                f"{KOREAN_SAFETY_NOTE}"
            )
        return (
            "No emergency vehicle priority is needed in the current scenario. "
            f"{SAFETY_NOTE}{evidence_text}"
        )

    if use_korean:
        return (
            f"현재 혼잡도는 {_format_congestion_ko(observation.congestion_level)}입니다. "
            f"{KOREAN_SAFETY_NOTE}"
        )
    return (
        f"Current congestion is {observation.congestion_level}. "
        "The dashboard recommendation is simulation-only and does not control real traffic signals."
        f"{evidence_text}"
    )


def _asks_about_wait_time(question: str, normalized: str) -> bool:
    return any(
        token in normalized or token in question
        for token in ("wait", "delay", "대기시간", "대기 시간", "지체", "얼마나 줄")
    )


def _contains_hangul(text: str) -> bool:
    return any("\uac00" <= character <= "\ud7a3" for character in text)


def _format_direction_ko(direction: str) -> str:
    labels = {
        "north": "북측",
        "south": "남측",
        "east": "동측",
        "west": "서측",
        "unknown": "확인되지 않은",
    }
    return labels.get(direction, direction)


def _format_congestion_ko(congestion_level: str) -> str:
    labels = {
        "high": "높음",
        "medium": "보통",
        "low": "낮음",
    }
    return labels.get(congestion_level, congestion_level)
