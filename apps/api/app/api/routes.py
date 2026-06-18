from pathlib import Path
import os
from tempfile import NamedTemporaryFile
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.adapters.simulation import (
    FixtureSumoSimulationRunner,
    SumoTraciTrafficSimulationAdapter,
    TraciSumoSimulationRunner,
)
from app.adapters.vision import (
    FixtureYoloFrameAnalyzer,
    OpenCVYoloFrameAnalyzer,
    OpenCVYoloVisionAnalysisAdapter,
    ScenarioVisionAnalysisAdapter,
)
from app.core.config import settings
from app.db.session import SessionLocal, get_session
from app.domain.schemas import (
    ChatRequest,
    ChatResponse,
    TrafficEventRead,
    VisionObservation,
)
from app.domain.simulation_snapshot import SimulationFrameSnapshot
from app.scenarios.fixtures import SAMPLE_INPUT_FIXTURES, fixture_to_payload
from app.services.chat import answer_question
from app.services.agent_service import build_agent_sections
from app.services.knowledge import (
    KnowledgeChunk,
    ingest_policy_documents,
    search_policy_evidence,
    search_policy_evidence_pgvector,
    sync_policy_embeddings,
)
from app.services.openai_clients import (
    MissingOpenAIAPIKeyError,
    MissingOpenAIMonthlyBudgetError,
    OpenAIEmbeddingGateway,
    OpenAITextGateway,
    build_openai_client,
    require_openai_api_key,
    require_openai_monthly_budget,
)
from app.services.persistence import (
    build_events,
    create_chat_log,
    create_recommendation,
    create_report,
    create_simulation_run,
    ensure_scenario_snapshot,
    event_to_payload,
    recommendation_to_payload,
    report_to_payload,
    select_recommendation_trigger_event,
    status_to_payload,
)
from app.services.recommendations import recommend_signal_action
from app.services.reports import generate_scenario_report
from app.services.runtime_readiness import (
    RuntimeSectionName,
    filter_runtime_readiness,
    get_runtime_readiness,
    is_vector_extension_enabled,
)
from app.services.simulation_frame_provider import get_simulation_frame_provider

router = APIRouter()
vision_adapter = ScenarioVisionAnalysisAdapter()
upload_vision_adapter = OpenCVYoloVisionAnalysisAdapter(
    detector=(
        OpenCVYoloFrameAnalyzer(
            model_path=settings.yolo_model_path,
            confidence_threshold=settings.yolo_confidence_threshold,
        )
        if settings.vision_analysis_mode == "opencv_yolo"
        else FixtureYoloFrameAnalyzer()
    )
)
simulation_adapter = SumoTraciTrafficSimulationAdapter(
    runner=(
        TraciSumoSimulationRunner(
            sumo_binary=settings.sumo_binary,
            sumo_config_path=settings.sumo_config_path,
            step_count=settings.sumo_step_count,
        )
        if settings.sumo_simulation_mode == "sumo_traci"
        else FixtureSumoSimulationRunner()
    ),
    source=(
        "sumo_traci"
        if settings.sumo_simulation_mode == "sumo_traci"
        else "sumo_traci_fixture"
    ),
)
ANALYSIS_JOBS: dict[str, dict[str, object]] = {}
SUPPORTED_UPLOAD_MEDIA: dict[str, tuple[str, str]] = {
    "image/jpeg": ("image", "emergency"),
    "image/png": ("image", "emergency"),
    "image/webp": ("image", "emergency"),
    "video/mp4": ("video", "blocked"),
    "video/quicktime": ("video", "blocked"),
}


@router.get("/api/fixtures")
def list_fixtures() -> list[dict[str, str]]:
    return [
        fixture_to_payload(fixture_id, fixture)
        for fixture_id, fixture in SAMPLE_INPUT_FIXTURES.items()
    ]


@router.post("/api/fixtures/{fixture_id}/ingest")
def ingest_fixture(
    fixture_id: str,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    fixture = SAMPLE_INPUT_FIXTURES.get(fixture_id)
    if fixture is None:
        raise HTTPException(status_code=404, detail="Fixture not found")

    observation = upload_vision_adapter.analyze(fixture["scenario_id"])
    status, events = ensure_scenario_snapshot(session, observation)

    return {
        **fixture_to_payload(fixture_id, fixture),
        "analysis_status": "ingested",
        "observation": observation.model_dump(mode="json"),
        "status_id": status.id,
        "event_ids": [event.id for event in events],
    }


@router.post("/api/uploads/analyze")
async def upload_sample_for_analysis(
    request: Request,
    filename: str | None = None,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    media_type = request.headers.get("content-type", "").split(";")[0].lower()
    media_plan = SUPPORTED_UPLOAD_MEDIA.get(media_type)
    if media_plan is None:
        raise HTTPException(
            status_code=415,
            detail="Unsupported upload media type",
        )

    sample_bytes = await request.body()
    if not sample_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    media_kind, fixture_scenario_id = media_plan
    observation, scenario_id = _analyze_uploaded_sample(
        sample_bytes=sample_bytes,
        filename=filename,
        media_type=media_type,
        fixture_scenario_id=fixture_scenario_id,
    )
    status, events = ensure_scenario_snapshot(session, observation)
    job_id = f"job-{uuid4().hex}"
    job = {
        "job_id": job_id,
        "status": "completed",
        "filename": filename or "uploaded-sample",
        "media_type": media_type,
        "media_kind": media_kind,
        "scenario_id": scenario_id,
        "observation_source": observation.source,
        "status_id": status.id,
        "event_ids": [event.id for event in events],
        "size_bytes": len(sample_bytes),
    }
    ANALYSIS_JOBS[job_id] = job

    return {
        "job_id": job_id,
        "analysis_status": "completed",
        "job": job,
        "observation": observation.model_dump(mode="json"),
        "status_id": status.id,
        "event_ids": [event.id for event in events],
    }


@router.get("/api/analysis-jobs/{job_id}")
def get_analysis_job(job_id: str) -> dict[str, object]:
    job = ANALYSIS_JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job


@router.get("/api/runtime/readiness")
def get_runtime_readiness_status(
    section: list[RuntimeSectionName] | None = Query(default=None),
) -> dict[str, object]:
    readiness = get_runtime_readiness(
        settings,
        vector_extension_verified=lambda: is_vector_extension_enabled(SessionLocal),
    )
    return filter_runtime_readiness(readiness, section)


def _analyze_uploaded_sample(
    sample_bytes: bytes,
    filename: str | None,
    media_type: str,
    fixture_scenario_id: str,
) -> tuple[object, str]:
    if settings.vision_analysis_mode != "opencv_yolo":
        return upload_vision_adapter.analyze(fixture_scenario_id), fixture_scenario_id

    with NamedTemporaryFile(
        suffix=_upload_suffix(filename, media_type),
    ) as sample_file:
        sample_file.write(sample_bytes)
        sample_file.flush()
        return upload_vision_adapter.analyze(sample_file.name), "uploaded"


def _upload_suffix(filename: str | None, media_type: str) -> str:
    suffix = Path(filename or "").suffix
    if suffix:
        return suffix
    if media_type.startswith("image/"):
        return ".jpg"
    if media_type == "video/quicktime":
        return ".mov"
    if media_type.startswith("video/"):
        return ".mp4"
    return ".bin"


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


@router.get("/api/simulation/frame")
def get_simulation_frame(
    scenario_id: str = "emergency",
) -> SimulationFrameSnapshot:
    observation = vision_adapter.analyze(scenario_id)
    provider = get_simulation_frame_provider(settings)
    return provider.build_frame(
        scenario_id,
        observation,
        _event_reads_from_observation(observation),
    )


def _event_reads_from_observation(
    observation: VisionObservation,
) -> list[TrafficEventRead]:
    return [
        TrafficEventRead(
            id=index,
            intersection_id=event.intersection_id,
            occurred_at=event.occurred_at,
            direction=event.direction,
            event_type=event.event_type,
            severity=event.severity,
            object_count=event.object_count,
            ai_summary=event.ai_summary,
            recommendation=event.recommendation,
            status=event.status,
            source=event.source,
        )
        for index, event in enumerate(build_events(observation), start=1)
    ]


@router.post("/api/scenarios/{scenario_id}/load")
def load_scenario(
    scenario_id: str,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    status, events = ensure_scenario_snapshot(session, observation)
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
    policy_evidence = _retrieve_policy_evidence(request.question, session)
    answer = _answer_chat_question(request.question, observation, policy_evidence)
    action, plan, evidence = recommend_signal_action(observation)
    simulation = simulation_adapter.compare_signal_plan(scenario_id)
    sections = build_agent_sections(
        observation=observation,
        events=events,
        action=action,
        plan=plan,
        evidence=evidence,
        simulation=simulation,
    )
    create_chat_log(session, observation, request.question, answer, event_ids)
    return ChatResponse(
        answer=answer,
        referenced_event_ids=event_ids,
        sections=sections,
    )


def _retrieve_policy_evidence(
    question: str,
    session: Session,
) -> list[KnowledgeChunk]:
    if settings.knowledge_search_mode == "pgvector":
        try:
            require_openai_monthly_budget(settings.openai_monthly_budget_usd)
            api_key = require_openai_api_key()
        except (MissingOpenAIAPIKeyError, MissingOpenAIMonthlyBudgetError) as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        embedding_gateway = OpenAIEmbeddingGateway(
            client=build_openai_client(api_key),
            model=settings.openai_embedding_model,
            dimensions=settings.openai_embedding_dimensions,
        )
        sync_policy_embeddings(
            session=session,
            embedding_gateway=embedding_gateway,
        )
        return search_policy_evidence_pgvector(
            query=question,
            session=session,
            embedding_gateway=embedding_gateway,
        )
    return search_policy_evidence(question, ingest_policy_documents())


def _answer_chat_question(
    question: str,
    observation: VisionObservation,
    policy_evidence: list[KnowledgeChunk],
) -> str:
    local_answer = answer_question(question, observation, policy_evidence)
    if settings.openai_answer_mode == "local":
        return local_answer
    if (
        settings.openai_answer_mode == "openai_auto"
        and not settings.openai_api_key
        and not os.environ.get("OPENAI_API_KEY")
    ):
        return local_answer

    try:
        require_openai_monthly_budget(settings.openai_monthly_budget_usd)
        api_key = _configured_openai_api_key()
    except (MissingOpenAIAPIKeyError, MissingOpenAIMonthlyBudgetError) as exc:
        if settings.openai_answer_mode == "openai":
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return local_answer

    gateway = OpenAITextGateway(
        client=build_openai_client(api_key),
        model=settings.openai_model,
    )
    return gateway.generate_grounded_answer(
        question=question,
        scenario_summary=_scenario_summary(observation),
        policy_evidence=policy_evidence,
    )


def _configured_openai_api_key() -> str:
    if settings.openai_api_key and settings.openai_api_key.strip():
        return settings.openai_api_key.strip()
    return require_openai_api_key()


def _scenario_summary(observation: VisionObservation) -> str:
    queues = observation.queues.model_dump()
    emergency = observation.emergency_vehicle
    emergency_direction = emergency.direction.value if emergency.direction else "none"
    return (
        f"intersection={observation.intersection_id}; "
        f"congestion={observation.congestion_level}; "
        f"queues={queues}; "
        f"pedestrian_waiting={observation.pedestrian_waiting}; "
        f"emergency_present={emergency.present}; "
        f"emergency_direction={emergency_direction}"
    )


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
