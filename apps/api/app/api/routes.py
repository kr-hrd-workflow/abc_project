from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.adapters.simulation import ScenarioTrafficSimulationAdapter
from app.adapters.vision import ScenarioVisionAnalysisAdapter
from app.db.session import get_session
from app.domain.schemas import ChatRequest, ChatResponse
from app.services.chat import answer_question
from app.services.persistence import (
    create_chat_log,
    create_recommendation,
    create_report,
    create_simulation_run,
    ensure_scenario_snapshot,
    event_to_payload,
    load_scenario_snapshot,
    recommendation_to_payload,
    report_to_payload,
    select_recommendation_trigger_event,
    status_to_payload,
)
from app.services.recommendations import recommend_signal_action
from app.services.reports import generate_scenario_report

router = APIRouter()
vision_adapter = ScenarioVisionAnalysisAdapter()
simulation_adapter = ScenarioTrafficSimulationAdapter()


@router.get("/api/intersection/status")
def get_status(
    scenario_id: str = "emergency",
    session: Session = Depends(get_session),
) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    status, _events = ensure_scenario_snapshot(session, observation)
    return status_to_payload(status)


@router.get("/api/events")
def get_events(
    scenario_id: str = "emergency",
    session: Session = Depends(get_session),
) -> list[dict[str, object]]:
    observation = vision_adapter.analyze(scenario_id)
    _status, events = ensure_scenario_snapshot(session, observation)
    return [event_to_payload(event) for event in events]


@router.post("/api/scenarios/{scenario_id}/load")
def load_scenario(
    scenario_id: str,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    status, events = load_scenario_snapshot(session, observation)
    return {
        "intersection_id": observation.intersection_id,
        "scenario_id": scenario_id,
        "status_id": status.id,
        "event_ids": [event.id for event in events],
        "status": "loaded",
    }


@router.post("/api/analyze")
def analyze(scenario_id: str = "emergency") -> dict[str, object]:
    return vision_adapter.analyze(scenario_id).model_dump(mode="json")


@router.post("/api/recommend-signal")
def recommend_signal(
    scenario_id: str = "emergency",
    session: Session = Depends(get_session),
) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    _status, events = ensure_scenario_snapshot(session, observation)
    action, plan, evidence = recommend_signal_action(observation)
    trigger_event = select_recommendation_trigger_event(events, action, evidence)
    trigger_event_id = trigger_event.id if trigger_event else None
    recommendation = create_recommendation(
        session,
        observation,
        action,
        plan,
        evidence,
        trigger_event_id,
    )
    return recommendation_to_payload(recommendation)


@router.post("/api/simulate-signal")
def simulate_signal(
    scenario_id: str = "emergency",
    session: Session = Depends(get_session),
) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    comparison = simulation_adapter.compare_signal_plan(scenario_id)
    create_simulation_run(session, observation, comparison)
    return comparison.model_dump()


@router.post("/api/chat")
def chat(
    request: ChatRequest,
    scenario_id: str = "emergency",
    session: Session = Depends(get_session),
) -> ChatResponse:
    observation = vision_adapter.analyze(scenario_id)
    _status, events = ensure_scenario_snapshot(session, observation)
    event_ids = [event.id for event in events]
    answer = answer_question(request.question, observation)
    create_chat_log(session, observation, request.question, answer, event_ids)
    return ChatResponse(answer=answer, referenced_event_ids=event_ids)


@router.post("/api/report")
def report(
    scenario_id: str = "emergency",
    session: Session = Depends(get_session),
) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    ensure_scenario_snapshot(session, observation)
    report_record = create_report(
        session,
        observation,
        generate_scenario_report(observation),
    )
    return report_to_payload(report_record)
