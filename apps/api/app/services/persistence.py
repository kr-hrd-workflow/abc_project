from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db import models
from app.domain.enums import EventType, RecommendationAction, Severity
from app.domain.schemas import SimulationComparison, VisionObservation

SEOUL = ZoneInfo("Asia/Seoul")
SAFETY_BOUNDARY = "Recommendation and simulation only. No real traffic signal control is performed."


def _emergency_signal_phase(observation: VisionObservation) -> str:
    if not observation.emergency_vehicle.present:
        return "normal_cycle"
    if observation.emergency_vehicle.direction is None:
        return "emergency_priority"
    return f"{observation.emergency_vehicle.direction.value}_priority"


def ensure_intersection(
    session: Session,
    observation: VisionObservation,
) -> models.Intersection:
    intersection = session.get(models.Intersection, observation.intersection_id)
    if intersection is not None:
        return intersection

    intersection = models.Intersection(
        id=observation.intersection_id,
        name="Seoul Smart Intersection Testbed",
        location_label="Scenario-backed MVP intersection",
        created_at=datetime.now(SEOUL),
    )
    session.add(intersection)
    session.flush()
    return intersection


def build_events(observation: VisionObservation) -> list[models.TrafficEvent]:
    events: list[models.TrafficEvent] = []

    if observation.intersection_blocked:
        events.append(
            models.TrafficEvent(
                intersection_id=observation.intersection_id,
                occurred_at=observation.captured_at,
                direction=None,
                event_type=EventType.INTERSECTION_BLOCKED.value,
                severity=Severity.CRITICAL.value,
                object_count=sum(observation.objects.values()),
                ai_summary="Intersection blockage detected in the conflict zone.",
                recommendation="Review all-red safety simulation.",
                status="open",
                source=observation.source,
            )
        )

    if observation.emergency_vehicle.present:
        direction = (
            observation.emergency_vehicle.direction.value
            if observation.emergency_vehicle.direction
            else None
        )
        events.append(
            models.TrafficEvent(
                intersection_id=observation.intersection_id,
                occurred_at=observation.captured_at,
                direction=direction,
                event_type=EventType.EMERGENCY_VEHICLE_APPROACH.value,
                severity=Severity.CRITICAL.value,
                object_count=1,
                ai_summary="Emergency vehicle approach detected.",
                recommendation="Review emergency priority signal simulation.",
                status="open",
                source=observation.source,
            )
        )

    queues = observation.queues.model_dump()
    for direction, queue in queues.items():
        if queue > 25:
            events.append(
                models.TrafficEvent(
                    intersection_id=observation.intersection_id,
                    occurred_at=observation.captured_at,
                    direction=direction,
                    event_type=EventType.QUEUE_THRESHOLD_EXCEEDED.value,
                    severity=Severity.WARNING.value,
                    object_count=queue,
                    ai_summary=f"{direction} queue exceeds threshold.",
                    recommendation="Review green extension simulation.",
                    status="open",
                    source=observation.source,
                )
            )

    if observation.pedestrian_waiting and not events:
        events.append(
            models.TrafficEvent(
                intersection_id=observation.intersection_id,
                occurred_at=observation.captured_at,
                direction=None,
                event_type=EventType.PEDESTRIAN_WAITING.value,
                severity=Severity.INFO.value,
                object_count=observation.objects.get("person", 0),
                ai_summary="Pedestrian waiting request detected.",
                recommendation="Review pedestrian crossing phase simulation.",
                status="open",
                source=observation.source,
            )
        )

    if not events:
        events.append(
            models.TrafficEvent(
                intersection_id=observation.intersection_id,
                occurred_at=observation.captured_at,
                direction=None,
                event_type=EventType.NORMAL_FLOW.value,
                severity=Severity.INFO.value,
                object_count=sum(observation.objects.values()),
                ai_summary="No priority event detected.",
                recommendation="Maintain normal cycle in the simulation.",
                status="closed",
                source=observation.source,
            )
        )

    return events


def select_recommendation_trigger_event(
    events: list[models.TrafficEvent],
    action: RecommendationAction,
    evidence: dict[str, object],
) -> models.TrafficEvent | None:
    action_event_types = {
        RecommendationAction.EMERGENCY_PRIORITY: EventType.EMERGENCY_VEHICLE_APPROACH.value,
        RecommendationAction.ALL_RED_SAFETY: EventType.INTERSECTION_BLOCKED.value,
        RecommendationAction.GREEN_EXTENSION: EventType.QUEUE_THRESHOLD_EXCEEDED.value,
        RecommendationAction.PEDESTRIAN_PHASE: EventType.PEDESTRIAN_WAITING.value,
        RecommendationAction.MAINTAIN_CYCLE: EventType.NORMAL_FLOW.value,
    }
    target_type = action_event_types[action]
    target_direction = evidence.get("direction")

    for event in events:
        if event.event_type != target_type:
            continue
        if not isinstance(target_direction, str) or target_direction == "unknown":
            return event
        if event.direction == target_direction:
            return event

    return events[0] if events else None


def load_scenario_snapshot(
    session: Session,
    observation: VisionObservation,
) -> tuple[models.IntersectionStatus, list[models.TrafficEvent]]:
    ensure_intersection(session, observation)
    status = models.IntersectionStatus(
        intersection_id=observation.intersection_id,
        captured_at=observation.captured_at,
        signal_phase=_emergency_signal_phase(observation),
        cycle_second=24,
        north_queue=observation.queues.north,
        south_queue=observation.queues.south,
        east_queue=observation.queues.east,
        west_queue=observation.queues.west,
        pedestrian_request=observation.pedestrian_waiting,
        emergency_priority=observation.emergency_vehicle.present,
        congestion_level=observation.congestion_level,
        source=observation.source,
    )
    events = build_events(observation)
    session.add(status)
    session.add_all(events)
    session.commit()
    session.refresh(status)
    for event in events:
        session.refresh(event)
    return status, events


def ensure_scenario_snapshot(
    session: Session,
    observation: VisionObservation,
) -> tuple[models.IntersectionStatus, list[models.TrafficEvent]]:
    status = session.scalar(
        select(models.IntersectionStatus)
        .where(models.IntersectionStatus.intersection_id == observation.intersection_id)
        .where(models.IntersectionStatus.captured_at == observation.captured_at)
        .where(models.IntersectionStatus.source == observation.source)
        .order_by(desc(models.IntersectionStatus.id))
    )
    events = list(
        session.scalars(
            select(models.TrafficEvent)
            .where(models.TrafficEvent.intersection_id == observation.intersection_id)
            .where(models.TrafficEvent.occurred_at == observation.captured_at)
            .where(models.TrafficEvent.source == observation.source)
            .order_by(models.TrafficEvent.id)
        )
    )
    if status is None or not events:
        return load_scenario_snapshot(session, observation)
    return status, events


def status_to_payload(status: models.IntersectionStatus) -> dict[str, object]:
    return {
        "intersection_id": status.intersection_id,
        "captured_at": status.captured_at.isoformat(),
        "signal_phase": status.signal_phase,
        "cycle_second": status.cycle_second,
        "queues": {
            "north": status.north_queue,
            "south": status.south_queue,
            "east": status.east_queue,
            "west": status.west_queue,
        },
        "pedestrian_request": status.pedestrian_request,
        "emergency_priority": status.emergency_priority,
        "congestion_level": status.congestion_level,
        "source": status.source,
    }


def event_to_payload(event: models.TrafficEvent) -> dict[str, object]:
    return {
        "id": event.id,
        "intersection_id": event.intersection_id,
        "occurred_at": event.occurred_at.isoformat(),
        "direction": event.direction,
        "event_type": event.event_type,
        "severity": event.severity,
        "object_count": event.object_count,
        "ai_summary": event.ai_summary,
        "recommendation": event.recommendation,
        "status": event.status,
        "source": event.source,
    }


def create_recommendation(
    session: Session,
    observation: VisionObservation,
    action: RecommendationAction,
    plan: dict[str, object],
    evidence: dict[str, object],
    trigger_event_id: int | None,
) -> models.SignalRecommendation:
    ensure_intersection(session, observation)
    recommendation = models.SignalRecommendation(
        intersection_id=observation.intersection_id,
        created_at=datetime.now(SEOUL),
        trigger_event_id=trigger_event_id,
        recommended_action=action.value,
        recommended_plan_json=plan,
        evidence_json=evidence,
        safety_boundary=SAFETY_BOUNDARY,
        status="proposed",
    )
    session.add(recommendation)
    session.commit()
    session.refresh(recommendation)
    return recommendation


def recommendation_to_payload(recommendation: models.SignalRecommendation) -> dict[str, object]:
    return {
        "id": recommendation.id,
        "intersection_id": recommendation.intersection_id,
        "created_at": recommendation.created_at.isoformat(),
        "action": recommendation.recommended_action,
        "recommended_plan": recommendation.recommended_plan_json,
        "evidence": recommendation.evidence_json,
        "safety_boundary": recommendation.safety_boundary,
        "status": recommendation.status,
    }


def create_simulation_run(
    session: Session,
    observation: VisionObservation,
    comparison: SimulationComparison,
) -> models.SimulationRun:
    ensure_intersection(session, observation)
    simulation_run = models.SimulationRun(
        intersection_id=observation.intersection_id,
        recommendation_id=None,
        created_at=datetime.now(SEOUL),
        baseline_metrics_json=comparison.baseline.model_dump(),
        recommended_metrics_json=comparison.recommended.model_dump(),
        improvement_summary=(
            f"{comparison.improvement['total_delay_percent']}% total delay reduction "
            "in scenario simulation."
        ),
        source=comparison.source,
    )
    session.add(simulation_run)
    session.commit()
    session.refresh(simulation_run)
    return simulation_run


def create_chat_log(
    session: Session,
    observation: VisionObservation,
    question: str,
    answer: str,
    event_ids: list[int],
) -> models.ChatLog:
    ensure_intersection(session, observation)
    chat_log = models.ChatLog(
        intersection_id=observation.intersection_id,
        created_at=datetime.now(SEOUL),
        question=question,
        answer=answer,
        referenced_event_ids_json=event_ids,
    )
    session.add(chat_log)
    session.commit()
    session.refresh(chat_log)
    return chat_log


def create_report(
    session: Session,
    observation: VisionObservation,
    summary: str,
) -> models.Report:
    ensure_intersection(session, observation)
    report = models.Report(
        intersection_id=observation.intersection_id,
        period_start=observation.captured_at,
        period_end=observation.captured_at,
        summary=summary,
        generated_at=datetime.now(SEOUL),
    )
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


def report_to_payload(report: models.Report) -> dict[str, object]:
    return {
        "id": report.id,
        "intersection_id": report.intersection_id,
        "period_start": report.period_start.isoformat(),
        "period_end": report.period_end.isoformat(),
        "summary": report.summary,
        "generated_at": report.generated_at.isoformat(),
    }
