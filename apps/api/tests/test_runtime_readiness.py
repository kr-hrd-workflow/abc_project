from app.core.config import Settings
from app.services.runtime_readiness import (
    get_runtime_readiness,
    is_vector_extension_enabled,
)


def test_runtime_readiness_reports_missing_optional_runtime_gates() -> None:
    test_settings = Settings(
        vision_analysis_mode="opencv_yolo",
        yolo_model_path="models/yolov8n.pt",
        sumo_simulation_mode="sumo_traci",
        sumo_binary="sumo",
        sumo_config_path="networks/intersection.sumocfg",
    )

    readiness = get_runtime_readiness(
        test_settings,
        module_available=lambda _module_name: False,
        binary_available=lambda _binary_name: False,
        path_exists=lambda _path: False,
        env={},
        vector_extension_verified=lambda: False,
    )

    assert readiness["vision"]["ready"] is False
    assert readiness["vision"]["missing"] == [
        "python module cv2",
        "python module ultralytics",
        "model file models/yolov8n.pt",
    ]
    assert readiness["vision"]["checks"][0]["detail"] == (
        "install the API vision extra before enabling opencv_yolo mode"
    )
    assert readiness["vision"]["checks"][2]["detail"] == (
        "set YOLO_MODEL_PATH to a local model file"
    )
    assert readiness["simulation"]["missing"] == [
        "python module traci",
        "python module sumolib",
        "binary sumo",
        "binary netconvert",
        "SUMO config networks/intersection.sumocfg",
    ]
    assert readiness["simulation"]["checks"][0]["detail"] == (
        "install the API simulation extra before enabling sumo_traci mode"
    )
    assert readiness["simulation"]["checks"][2]["detail"] == (
        "install SUMO system binaries and keep SUMO_BINARY configured"
    )
    assert readiness["simulation"]["checks"][4]["detail"] == (
        "set SUMO_CONFIG_PATH to a local .sumocfg file"
    )
    assert readiness["openai"]["missing"] == [
        "python module openai",
        "OPENAI_API_KEY",
    ]
    assert readiness["openai"]["checks"][0]["detail"] == (
        "install the API ai extra before enabling OpenAI client calls"
    )
    assert readiness["pgvector"]["missing"] == [
        "python module pgvector",
        "PostgreSQL vector extension",
    ]
    assert readiness["pgvector"]["checks"][0]["detail"] == (
        "install the API ai extra before enabling pgvector search"
    )
    assert readiness["pgvector"]["checks"][1]["detail"] == (
        "requires approved target database setup before enabling vector columns"
    )


def test_runtime_readiness_marks_runtime_gates_ready_when_requirements_exist() -> None:
    test_settings = Settings(
        yolo_model_path="models/yolov8n.pt",
        sumo_binary="sumo",
        sumo_config_path="networks/intersection.sumocfg",
    )

    readiness = get_runtime_readiness(
        test_settings,
        module_available=lambda _module_name: True,
        binary_available=lambda _binary_name: True,
        path_exists=lambda _path: True,
        env={"OPENAI_API_KEY": "sk-test-secret"},
        vector_extension_verified=lambda: True,
    )

    assert readiness["vision"]["ready"] is True
    assert readiness["simulation"]["ready"] is True
    assert readiness["openai"]["ready"] is True
    assert readiness["pgvector"]["ready"] is True
    assert "sk-test-secret" not in str(readiness)


def test_vector_extension_verifier_queries_pg_extension() -> None:
    class FakeResult:
        def scalar_one(self) -> int:
            return 1

    class FakeSession:
        def __enter__(self) -> "FakeSession":
            return self

        def __exit__(self, *_exc_info: object) -> None:
            return None

        def execute(self, statement: object) -> FakeResult:
            assert "pg_extension" in str(statement)
            assert "vector" in str(statement)
            return FakeResult()

    assert is_vector_extension_enabled(lambda: FakeSession()) is True


def test_vector_extension_verifier_returns_false_when_database_unavailable() -> None:
    def unavailable_session_factory() -> object:
        raise RuntimeError("database unavailable")

    assert is_vector_extension_enabled(unavailable_session_factory) is False
