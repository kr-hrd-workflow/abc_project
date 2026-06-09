from app.core.config import Settings
from app.services.runtime_readiness import get_runtime_readiness


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
    assert readiness["simulation"]["missing"] == [
        "python module traci",
        "python module sumolib",
        "binary sumo",
        "binary netconvert",
        "SUMO config networks/intersection.sumocfg",
    ]
    assert readiness["openai"]["missing"] == [
        "python module openai",
        "OPENAI_API_KEY",
    ]
    assert readiness["pgvector"]["missing"] == [
        "python module pgvector",
        "PostgreSQL vector extension",
    ]


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
