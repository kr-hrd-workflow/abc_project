from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import models
from app.db.models import Base
from app.db.session import get_session
from app.domain.enums import RecommendationAction
from app.domain.schemas import EmergencyVehicle
from app.main import app
from app.scenarios.data import BLOCKED_SCENARIO, EMERGENCY_SCENARIO
from app.services.persistence import (
    build_events,
    load_scenario_snapshot,
    select_recommendation_trigger_event,
)

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_session() -> Generator[Session, None, None]:
        with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_load_scenario_persists_status_and_events(client: TestClient) -> None:
    response = client.post("/api/scenarios/emergency/load")

    assert response.status_code == 200
    loaded = response.json()
    assert loaded["intersection_id"] == "INT-0001"
    assert loaded["scenario_id"] == "emergency"
    assert loaded["status"] == "loaded"
    assert loaded["event_ids"]

    status_response = client.get("/api/intersection/status")
    assert status_response.status_code == 200
    assert status_response.json()["intersection_id"] == "INT-0001"

    events_response = client.get("/api/events")
    assert events_response.status_code == 200
    event_payload = events_response.json()
    assert loaded["event_ids"][0] in [event["id"] for event in event_payload]


def test_repeated_scenario_load_keeps_seeded_events_idempotent(client: TestClient) -> None:
    first_response = client.post("/api/scenarios/emergency/load")
    second_response = client.post("/api/scenarios/emergency/load")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert second_response.json()["event_ids"] == first_response.json()["event_ids"]

    events_response = client.get("/api/events")

    assert events_response.status_code == 200
    events = events_response.json()
    assert len(events) == 2
    assert {
        (event["event_type"], event["direction"])
        for event in events
    } == {
        ("emergency_vehicle_approach", "east"),
        ("queue_threshold_exceeded", "north"),
    }


def test_events_endpoint_collapses_existing_duplicate_seeded_events(
    client: TestClient,
) -> None:
    with TestingSessionLocal() as session:
        load_scenario_snapshot(session, EMERGENCY_SCENARIO)
        load_scenario_snapshot(session, EMERGENCY_SCENARIO)

    events_response = client.get("/api/events")

    assert events_response.status_code == 200
    events = events_response.json()
    assert len(events) == 2
    assert {
        (event["event_type"], event["direction"])
        for event in events
    } == {
        ("emergency_vehicle_approach", "east"),
        ("queue_threshold_exceeded", "north"),
    }


def test_list_fixtures_exposes_image_and_video_inputs(client: TestClient) -> None:
    response = client.get("/api/fixtures")

    assert response.status_code == 200
    fixtures = response.json()
    assert {
        (fixture["fixture_id"], fixture["media_type"], fixture["scenario_id"])
        for fixture in fixtures
    } == {
        ("emergency-east-frame", "image", "emergency"),
        ("blocked-intersection-clip", "video", "blocked"),
    }


def test_ingest_fixture_returns_observation_and_persists_snapshot(
    client: TestClient,
) -> None:
    response = client.post("/api/fixtures/emergency-east-frame/ingest")

    assert response.status_code == 200
    payload = response.json()
    assert payload["fixture_id"] == "emergency-east-frame"
    assert payload["media_type"] == "image"
    assert payload["scenario_id"] == "emergency"
    assert payload["analysis_status"] == "ingested"
    assert payload["observation"]["source"] == "opencv_yolo"
    assert payload["observation"]["objects"]["car"] == 42
    assert payload["event_ids"]

    with TestingSessionLocal() as session:
        status = session.get(models.IntersectionStatus, payload["status_id"])
        assert status is not None
        assert status.source == "opencv_yolo"


def test_ingest_fixture_rejects_unknown_fixture(client: TestClient) -> None:
    response = client.post("/api/fixtures/missing-fixture/ingest")

    assert response.status_code == 404
    assert response.json()["detail"] == "Fixture not found"


def test_upload_sample_image_creates_completed_analysis_job(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/uploads/analyze?filename=intersection-frame.jpg",
        content=b"fake image bytes",
        headers={"content-type": "image/jpeg"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["analysis_status"] == "completed"
    assert payload["job"]["status"] == "completed"
    assert payload["job"]["filename"] == "intersection-frame.jpg"
    assert payload["job"]["media_type"] == "image/jpeg"
    assert payload["job"]["scenario_id"] == "emergency"
    assert payload["observation"]["source"] == "opencv_yolo"
    assert payload["event_ids"]

    status_response = client.get(f"/api/analysis-jobs/{payload['job_id']}")

    assert status_response.status_code == 200
    status_payload = status_response.json()
    assert status_payload["job_id"] == payload["job_id"]
    assert status_payload["status"] == "completed"
    assert status_payload["observation_source"] == "opencv_yolo"


def test_upload_sample_video_uses_blocked_fixture_path(client: TestClient) -> None:
    response = client.post(
        "/api/uploads/analyze?filename=blocked-crossing.mp4",
        content=b"fake video bytes",
        headers={"content-type": "video/mp4"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["job"]["media_kind"] == "video"
    assert payload["job"]["scenario_id"] == "blocked"
    assert payload["observation"]["intersection_blocked"] is True


def test_upload_sample_rejects_unsupported_media_type(client: TestClient) -> None:
    response = client.post(
        "/api/uploads/analyze?filename=notes.txt",
        content=b"not traffic media",
        headers={"content-type": "text/plain"},
    )

    assert response.status_code == 415
    assert response.json()["detail"] == "Unsupported upload media type"


def test_runtime_readiness_endpoint_reports_gates_without_secrets(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_runtime_readiness(
        _settings,
        **_kwargs: object,
    ) -> dict[str, object]:
        return {
            "openai": {
                "ready": False,
                "missing": ["OPENAI_API_KEY"],
                "checks": [
                    {
                        "name": "OPENAI_API_KEY",
                        "available": True,
                        "detail": "presence only",
                    }
                ],
            },
            "vision": {"ready": True, "missing": [], "checks": []},
            "simulation": {"ready": True, "missing": [], "checks": []},
            "pgvector": {"ready": False, "missing": [], "checks": []},
        }

    monkeypatch.setattr(
        "app.api.routes.get_runtime_readiness",
        fake_runtime_readiness,
    )

    response = client.get("/api/runtime/readiness")

    assert response.status_code == 200
    assert response.json()["openai"]["checks"][0]["detail"] == "presence only"
    assert "sk-test-secret" not in response.text


def test_runtime_readiness_endpoint_can_filter_to_one_gate(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_runtime_readiness(
        _settings,
        **_kwargs: object,
    ) -> dict[str, object]:
        return {
            "openai": {
                "ready": False,
                "mode": "gpt-5.5",
                "missing": ["OPENAI_API_KEY"],
                "checks": [],
            },
            "vision": {
                "ready": True,
                "mode": "fixture",
                "missing": [],
                "checks": [],
            },
        }

    monkeypatch.setattr(
        "app.api.routes.get_runtime_readiness",
        fake_runtime_readiness,
    )

    response = client.get("/api/runtime/readiness?section=openai")

    assert response.status_code == 200
    assert list(response.json()) == ["openai"]
    assert response.json()["openai"]["missing"] == ["OPENAI_API_KEY"]


def test_recommend_signal_returns_emergency_priority_with_safety_boundary(
    client: TestClient,
) -> None:
    response = client.post("/api/recommend-signal")

    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "emergency_priority"
    assert "No real traffic signal control" in payload["safety_boundary"]

    with TestingSessionLocal() as session:
        recommendation = session.scalar(select(models.SignalRecommendation))
        assert recommendation is not None
        assert recommendation.trigger_event_id is not None
        trigger_event = session.get(models.TrafficEvent, recommendation.trigger_event_id)
        assert trigger_event is not None
        assert trigger_event.event_type == "emergency_vehicle_approach"


def test_simulate_signal_returns_scenario_comparison(client: TestClient) -> None:
    response = client.post("/api/simulate-signal")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "sumo_traci_fixture"
    assert payload["baseline"]["total_delay_seconds"] == 128.4
    assert payload["recommended"]["total_delay_seconds"] == 105.3

    with TestingSessionLocal() as session:
        simulation_run = session.scalar(select(models.SimulationRun))
        assert simulation_run is not None
        assert simulation_run.source == "sumo_traci_fixture"
        assert simulation_run.baseline_metrics_json["total_delay_seconds"] == 128.4


def test_analyze_returns_current_scenario_observation(client: TestClient) -> None:
    response = client.post("/api/analyze")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "scenario_mock"
    assert payload["intersection_id"] == "INT-0001"
    assert payload["objects"]["car"] == 42
    assert payload["emergency_vehicle"]["present"] is True


def test_chat_returns_congestion_answer_with_event_references(client: TestClient) -> None:
    response = client.post(
        "/api/chat",
        json={"question": "Which direction is most congested?"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "most congested direction" in payload["answer"]
    assert payload["referenced_event_ids"]

    with TestingSessionLocal() as session:
        chat_log = session.scalar(select(models.ChatLog))
        assert chat_log is not None
        assert chat_log.referenced_event_ids_json == payload["referenced_event_ids"]


def test_chat_returns_structured_agent_sections(client: TestClient) -> None:
    response = client.post(
        "/api/chat",
        json={"question": "현재 상황과 추천 근거를 알려줘"},
    )

    assert response.status_code == 200
    sections = response.json()["sections"]
    assert set(sections) == {
        "current_situation",
        "recommended_action",
        "recommendation_rationale",
        "authority_limit",
        "simulation_result",
    }
    assert "No real traffic signal control" in sections["authority_limit"]
    assert sections["recommendation_rationale"]

    with TestingSessionLocal() as session:
        assert session.scalar(select(models.ChatLog)) is not None
        assert session.scalar(select(models.SignalRecommendation)) is None
        assert session.scalar(select(models.SimulationRun)) is None


def test_emergency_chat_answer_includes_safety_boundary(client: TestClient) -> None:
    response = client.post("/api/chat", json={"question": "Emergency status?"})

    assert response.status_code == 200
    assert "does not control real traffic signals" in response.json()["answer"]


def test_chat_includes_policy_evidence_when_question_requests_policy(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/chat",
        json={"question": "What policy evidence supports emergency priority?"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "Policy evidence:" in payload["answer"]
    assert "Emergency Vehicle Priority Guideline" in payload["answer"]
    assert payload["referenced_event_ids"]


def test_chat_uses_pgvector_policy_search_when_configured(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: dict[str, object] = {}

    monkeypatch.setattr("app.api.routes.settings.knowledge_search_mode", "pgvector")
    monkeypatch.setattr("app.api.routes.settings.openai_monthly_budget_usd", 10.0)
    monkeypatch.setattr(
        "app.api.routes.require_openai_api_key",
        lambda: "sk-test",
    )
    monkeypatch.setattr(
        "app.api.routes.build_openai_client",
        lambda _api_key: object(),
    )

    def fake_sync_policy_embeddings(**kwargs: object) -> None:
        calls["synced_with_model"] = kwargs["embedding_gateway"].model

    def fake_search_policy_evidence_pgvector(**kwargs: object) -> list[object]:
        calls["searched_query"] = kwargs["query"]
        return []

    monkeypatch.setattr(
        "app.api.routes.sync_policy_embeddings",
        fake_sync_policy_embeddings,
    )
    monkeypatch.setattr(
        "app.api.routes.search_policy_evidence_pgvector",
        fake_search_policy_evidence_pgvector,
    )

    response = client.post(
        "/api/chat",
        json={"question": "Emergency status?"},
    )

    assert response.status_code == 200
    assert calls == {
        "synced_with_model": "text-embedding-3-small",
        "searched_query": "Emergency status?",
    }
    assert "Policy evidence:" not in response.json()["answer"]


def test_chat_pgvector_mode_requires_openai_budget_before_client_creation(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    created_clients: list[str] = []

    monkeypatch.setattr("app.api.routes.settings.knowledge_search_mode", "pgvector")
    monkeypatch.setattr("app.api.routes.settings.openai_monthly_budget_usd", None)
    monkeypatch.setattr(
        "app.api.routes.require_openai_api_key",
        lambda: "sk-test-secret",
    )

    def fake_build_openai_client(api_key: str) -> object:
        created_clients.append(api_key)
        return object()

    monkeypatch.setattr(
        "app.api.routes.build_openai_client",
        fake_build_openai_client,
    )

    response = client.post(
        "/api/chat",
        json={"question": "Emergency status?"},
    )

    assert response.status_code == 503
    assert "OPENAI_MONTHLY_BUDGET_USD" in response.json()["detail"]
    assert created_clients == []


def test_report_returns_summary_for_intersection(client: TestClient) -> None:
    response = client.post("/api/report")

    assert response.status_code == 200
    payload = response.json()
    assert "10-minute traffic summary" in payload["summary"]
    assert payload["intersection_id"] == "INT-0001"

    with TestingSessionLocal() as session:
        report = session.scalar(select(models.Report))
        assert report is not None
        assert report.summary == payload["summary"]
        assert session.scalar(select(models.IntersectionStatus)) is not None
        assert session.scalar(select(models.TrafficEvent)) is not None


def test_trigger_selection_matches_recommendation_reason_with_mixed_events() -> None:
    observation = BLOCKED_SCENARIO.model_copy(
        update={
            "emergency_vehicle": EmergencyVehicle(
                present=True,
                direction="north",
                estimated_arrival_seconds=12,
            )
        }
    )
    events = build_events(observation)

    trigger_event = select_recommendation_trigger_event(
        events,
        RecommendationAction.EMERGENCY_PRIORITY,
        {"reason": "emergency_vehicle_approach", "direction": "north"},
    )

    assert trigger_event is not None
    assert trigger_event.event_type == "emergency_vehicle_approach"
    assert trigger_event.direction == "north"
