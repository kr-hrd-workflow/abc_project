from pathlib import Path

from app.core import binaries
from app.core.config import Settings
from app.services import runtime_readiness
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
    assert readiness["openai"]["checks"][2]["detail"] == (
        "set a monthly OpenAI API budget before enabling live client calls"
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
        openai_monthly_budget_usd=10.0,
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


def test_runtime_readiness_reports_fixture_mode_without_live_sumo_claim() -> None:
    readiness = get_runtime_readiness(
        Settings(sumo_simulation_mode="fixture"),
        module_available=lambda _module_name: False,
        binary_available=lambda _binary_name: False,
        path_exists=lambda _path: False,
        env={},
        vector_extension_verified=lambda: False,
    )

    assert readiness["simulation"]["ready"] is True
    assert readiness["simulation"]["mode"] == "fixture"
    assert readiness["simulation"]["missing"] == []
    assert readiness["simulation"]["checks"] == [
        {
            "name": "fixture simulation frame provider",
            "available": True,
            "detail": "deterministic fixture snapshots; not live SUMO truth",
        }
    ]


def test_runtime_readiness_checks_libsumo_mode_without_traci_requirement() -> None:
    readiness = get_runtime_readiness(
        Settings(sumo_simulation_mode="sumo_libsumo"),
        module_available=lambda module_name: module_name == "libsumo",
        binary_available=lambda _binary_name: True,
        path_exists=lambda _path: True,
        env={},
        vector_extension_verified=lambda: False,
    )

    assert readiness["simulation"]["ready"] is True
    assert readiness["simulation"]["mode"] == "sumo_libsumo"
    assert [check["name"] for check in readiness["simulation"]["checks"]] == [
        "python module libsumo",
        "binary sumo",
        "binary netconvert",
        "SUMO config networks/intersection.sumocfg",
    ]


def test_binary_available_finds_python_environment_scripts(
    tmp_path: Path,
    monkeypatch,
) -> None:
    python_bin = tmp_path / "bin"
    python_bin.mkdir()
    python_executable = python_bin / "python"
    sumo_binary = python_bin / "sumo"
    python_executable.write_text("")
    sumo_binary.write_text("")
    sumo_binary.chmod(0o755)
    monkeypatch.setattr(
        binaries.sys,
        "executable",
        str(python_executable),
    )

    assert runtime_readiness._binary_available("sumo") is True


def test_committed_sumo_network_fixture_files_exist() -> None:
    base_path = Path(__file__).resolve().parents[1] / "networks"

    assert (base_path / "intersection.sumocfg").is_file()
    assert (base_path / "intersection.net.xml").is_file()
    assert (base_path / "intersection.rou.xml").is_file()


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
