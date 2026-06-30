from app.core.config import Settings
from app.services.sumo_runtime import SumoRuntimeService


def _service(*, calibrate, calibrator):
    settings = Settings(
        sumo_simulation_mode="sumo_traci",
        sumo_config_path="networks/intersection.sumocfg",
        sumo_calibrate_from_cctv=calibrate,
    )
    return SumoRuntimeService(
        settings,
        flow_calibrator=calibrator,
        path_exists=lambda _path: True,
    )


def test_uses_calibrated_config_when_enabled(tmp_path) -> None:
    cfg = tmp_path / "normal.sumocfg"
    cfg.write_text("<x/>")
    calls: list[str] = []

    def calibrator(scenario_id: str) -> str:
        calls.append(scenario_id)
        return str(cfg)

    service = _service(calibrate=True, calibrator=calibrator)

    path = service._configured_config_path("normal", "sumo_traci")

    assert path == str(cfg)
    assert calls == ["normal"]


def test_static_config_when_flag_off() -> None:
    calls: list[str] = []

    def calibrator(scenario_id: str) -> str:
        calls.append(scenario_id)
        return "should-not-be-used"

    service = _service(calibrate=False, calibrator=calibrator)

    path = service._configured_config_path("normal", "sumo_traci")

    assert path == "networks/intersection.sumocfg"
    assert calls == []  # calibrator never consulted


def test_falls_back_when_calibrator_returns_none() -> None:
    service = _service(calibrate=True, calibrator=lambda _scenario: None)

    path = service._configured_config_path("normal", "sumo_traci")

    assert path == "networks/intersection.sumocfg"


def test_falls_back_when_calibrator_raises() -> None:
    def calibrator(_scenario: str) -> str:
        raise RuntimeError("stream unreadable")

    service = _service(calibrate=True, calibrator=calibrator)

    path = service._configured_config_path("normal", "sumo_traci")

    assert path == "networks/intersection.sumocfg"
