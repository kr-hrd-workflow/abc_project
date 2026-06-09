from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.db.models import Base
from app.domain.enums import Direction, EventType, RecommendationAction, Severity
from app.domain.schemas import (
    ChatRequest,
    QueueMetrics,
    SimulationComparison,
    SimulationMetrics,
    TrafficEventRead,
    VisionObservation,
)


def test_domain_schemas_validate_nested_intersection_payloads() -> None:
    captured_at = datetime(2026, 6, 8, 12, 0, tzinfo=UTC)

    observation = VisionObservation(
        source="scenario_mock",
        intersection_id="gangnam-main",
        captured_at=captured_at,
        objects={"car": 12, "bus": 1},
        queues={"north": 3, "south": 0, "east": 11, "west": 4},
        pedestrian_waiting=True,
        emergency_vehicle={
            "present": True,
            "direction": "east",
            "estimated_arrival_seconds": 8,
        },
        intersection_blocked=False,
        congestion_level="high",
    )

    assert observation.queues.east == 11
    assert observation.emergency_vehicle.direction == Direction.EAST

    event = TrafficEventRead(
        id=1,
        intersection_id="gangnam-main",
        occurred_at=captured_at,
        direction="east",
        event_type="emergency_vehicle_approach",
        severity="critical",
        object_count=1,
        ai_summary="Emergency vehicle approaching from east.",
        recommendation="Prioritize eastbound clearance.",
        status="active",
        source="scenario_mock",
    )

    assert event.event_type == EventType.EMERGENCY_VEHICLE_APPROACH
    assert event.severity == Severity.CRITICAL

    comparison = SimulationComparison(
        source="scenario_mock",
        baseline={
            "average_wait_seconds": 42.5,
            "total_delay_seconds": 1200.0,
            "throughput": 96,
            "emergency_vehicle_clearance_seconds": 35.0,
        },
        recommended={
            "average_wait_seconds": 31.0,
            "total_delay_seconds": 920.0,
            "throughput": 104,
            "emergency_vehicle_clearance_seconds": 14.0,
        },
        improvement={"delay_reduction_percent": 23.3},
    )

    assert comparison.recommended.throughput == 104
    assert RecommendationAction.GREEN_EXTENSION == "green_extension"


def test_domain_schemas_reject_invalid_operator_inputs() -> None:
    captured_at = datetime(2026, 6, 8, 12, 0, tzinfo=UTC)

    with pytest.raises(ValidationError):
        QueueMetrics(north=-1, south=0, east=0, west=0)

    with pytest.raises(ValidationError):
        VisionObservation(
            source="scenario_mock",
            intersection_id="gangnam-main",
            captured_at=captured_at,
            objects={"car": -1},
            queues={"north": 0, "south": 0, "east": 0, "west": 0},
            pedestrian_waiting=False,
            emergency_vehicle={"present": False},
            intersection_blocked=False,
            congestion_level="low",
        )

    with pytest.raises(ValidationError):
        TrafficEventRead(
            id=1,
            intersection_id="gangnam-main",
            occurred_at=captured_at,
            direction=None,
            event_type="normal_flow",
            severity="info",
            object_count=-1,
            ai_summary="Normal flow.",
            recommendation="Maintain cycle.",
            status="resolved",
            source="scenario_mock",
        )

    with pytest.raises(ValidationError):
        SimulationMetrics(
            average_wait_seconds=-1.0,
            total_delay_seconds=0.0,
            throughput=0,
            emergency_vehicle_clearance_seconds=0.0,
        )

    with pytest.raises(ValidationError):
        ChatRequest(question="")


def test_settings_accept_env_example_variables(tmp_path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/db",
                "API_HOST=127.0.0.1",
                "API_PORT=8000",
                "NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000",
                "VISION_ANALYSIS_MODE=opencv_yolo",
                "YOLO_MODEL_PATH=models/yolov8n.pt",
                "YOLO_CONFIDENCE_THRESHOLD=0.4",
                "SUMO_SIMULATION_MODE=sumo_traci",
                "SUMO_BINARY=sumo",
                "SUMO_CONFIG_PATH=networks/intersection.sumocfg",
                "SUMO_STEP_COUNT=120",
                "OPENAI_MODEL=gpt-5.5",
                "OPENAI_EMBEDDING_MODEL=text-embedding-3-small",
                "OPENAI_EMBEDDING_DIMENSIONS=1536",
                "OPENAI_MONTHLY_BUDGET_USD=10.00",
                "KNOWLEDGE_SEARCH_MODE=pgvector",
            ]
        ),
        encoding="utf-8",
    )

    settings = Settings(_env_file=env_file)

    assert settings.database_url == "postgresql+psycopg://user:password@localhost:5432/db"
    assert settings.vision_analysis_mode == "opencv_yolo"
    assert settings.yolo_model_path == "models/yolov8n.pt"
    assert settings.yolo_confidence_threshold == 0.4
    assert settings.sumo_simulation_mode == "sumo_traci"
    assert settings.sumo_binary == "sumo"
    assert settings.sumo_config_path == "networks/intersection.sumocfg"
    assert settings.sumo_step_count == 120
    assert settings.openai_model == "gpt-5.5"
    assert settings.openai_embedding_model == "text-embedding-3-small"
    assert settings.openai_embedding_dimensions == 1536
    assert settings.openai_monthly_budget_usd == 10.0
    assert settings.knowledge_search_mode == "pgvector"


def test_sqlalchemy_metadata_matches_required_tables() -> None:
    expected_columns = {
        "intersections": {"id", "name", "location_label", "created_at"},
        "intersection_status": {
            "id",
            "intersection_id",
            "captured_at",
            "signal_phase",
            "cycle_second",
            "north_queue",
            "south_queue",
            "east_queue",
            "west_queue",
            "pedestrian_request",
            "emergency_priority",
            "congestion_level",
            "source",
        },
        "traffic_events": {
            "id",
            "intersection_id",
            "occurred_at",
            "direction",
            "event_type",
            "severity",
            "object_count",
            "ai_summary",
            "recommendation",
            "status",
            "source",
        },
        "signal_recommendations": {
            "id",
            "intersection_id",
            "created_at",
            "trigger_event_id",
            "recommended_action",
            "recommended_plan_json",
            "evidence_json",
            "safety_boundary",
            "status",
        },
        "simulation_runs": {
            "id",
            "intersection_id",
            "recommendation_id",
            "created_at",
            "baseline_metrics_json",
            "recommended_metrics_json",
            "improvement_summary",
            "source",
        },
        "chat_logs": {
            "id",
            "intersection_id",
            "created_at",
            "question",
            "answer",
            "referenced_event_ids_json",
        },
        "reports": {
            "id",
            "intersection_id",
            "period_start",
            "period_end",
            "summary",
            "generated_at",
        },
        "knowledge_chunks": {
            "chunk_id",
            "document_id",
            "title",
            "content",
            "embedding",
        },
    }

    assert set(Base.metadata.tables) == set(expected_columns)
    for table_name, columns in expected_columns.items():
        assert set(Base.metadata.tables[table_name].columns.keys()) == columns
