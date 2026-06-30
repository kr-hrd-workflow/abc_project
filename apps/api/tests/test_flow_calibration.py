import xml.etree.ElementTree as ET
from datetime import datetime, timezone

from app.adapters.flow_counter import ApproachFlow, FlowMeasurement, PedestrianFlow
from app.services.flow_calibration import calibrate_demand, period_for

BASE_ROU = """<?xml version="1.0" encoding="UTF-8"?>
<routes>
    <route id="north_through" edges="north_in south_out"/>
    <flow id="flow_north_through" type="passenger" route="north_through" begin="0" end="3600" period="99"/>
    <flow id="flow_south_through" type="passenger" route="south_through" begin="0" end="3600" period="9"/>
    <flow id="flow_east_through" type="passenger" route="east_through" begin="0" end="3600" period="5"/>
    <flow id="flow_bus_north" type="bus" route="north_through" begin="0" end="3600" period="50"/>
</routes>
"""


def _measurement(approaches: dict[str, ApproachFlow]) -> FlowMeasurement:
    return FlowMeasurement(
        source="cctv",
        captured_at=datetime(2026, 6, 30, tzinfo=timezone.utc),
        window_seconds=30.0,
        approaches=approaches,
        pedestrian=PedestrianFlow(per_hour=240.0, crossings=2),
    )


def _write_base(tmp_path):
    base_rou = tmp_path / "intersection.rou.xml"
    base_rou.write_text(BASE_ROU)
    base_net = tmp_path / "intersection.net.xml"
    base_net.write_text("<net/>")
    return base_rou, base_net


def _periods(rou_path) -> dict[str, str]:
    root = ET.parse(rou_path).getroot()
    return {flow.get("id"): flow.get("period") for flow in root.findall("flow")}


def test_period_for_maps_flow_to_headway() -> None:
    assert period_for(900.0, period_min=1, period_max=120) == 4
    assert period_for(600.0, period_min=1, period_max=120) == 6
    assert period_for(0.0, period_min=1, period_max=120) is None


def test_period_for_clamps() -> None:
    assert period_for(100000.0, period_min=1, period_max=120) == 1  # round->0 clamped up
    assert period_for(10.0, period_min=1, period_max=120) == 120  # 360 clamped down


def test_calibrate_rewrites_mapped_flow_periods(tmp_path) -> None:
    base_rou, base_net = _write_base(tmp_path)
    out_dir = tmp_path / "calibrated"
    measurement = _measurement(
        {
            "north": ApproachFlow(veh_per_hour=900.0, by_class={"car": 1}, crossings=1),
            "south": ApproachFlow(veh_per_hour=600.0, by_class={}, crossings=1),
            "bus_north": ApproachFlow(veh_per_hour=120.0, by_class={"bus": 1}, crossings=1),
        }
    )

    cfg_path = calibrate_demand(
        measurement,
        base_rou_path=base_rou,
        base_net_path=base_net,
        out_dir=out_dir,
        scenario_id="normal",
    )

    assert cfg_path == out_dir / "normal.sumocfg"
    periods = _periods(out_dir / "normal.rou.xml")
    assert periods["flow_north_through"] == "4"
    assert periods["flow_south_through"] == "6"
    assert periods["flow_bus_north"] == "30"
    assert periods["flow_east_through"] == "5"  # unmapped -> base kept

    cfg_text = cfg_path.read_text()
    assert "normal.rou.xml" in cfg_text
    assert str(base_net.resolve()) in cfg_text


def test_calibrate_keeps_base_for_zero_or_unmapped(tmp_path) -> None:
    base_rou, base_net = _write_base(tmp_path)
    out_dir = tmp_path / "calibrated"
    measurement = _measurement(
        {
            "north": ApproachFlow(veh_per_hour=0.0, by_class={}, crossings=0),
            "ghost": ApproachFlow(veh_per_hour=3600.0, by_class={}, crossings=1),
        }
    )

    calibrate_demand(
        measurement,
        base_rou_path=base_rou,
        base_net_path=base_net,
        out_dir=out_dir,
        scenario_id="normal",
    )

    periods = _periods(out_dir / "normal.rou.xml")
    assert periods["flow_north_through"] == "99"  # zero flow -> base kept
    assert periods["flow_south_through"] == "9"


# --- production calibrator builder (measure -> calibrate chain) -------------

import json

from app.adapters.flow_counter import TrackedDetection
from app.core.config import Settings
from app.services.flow_calibration import build_cctv_flow_calibrator


class _FakeFlowSource:
    def stream(self, video, window_seconds):
        assert video == "rtsp://cam"
        yield [TrackedDetection(track_id=1, label="car", cx=0.5, cy=0.2)]
        yield [TrackedDetection(track_id=1, label="car", cx=0.5, cy=0.8)]


def _settings_for(tmp_path, out_dir) -> Settings:
    base_dir = tmp_path / "networks"
    base_dir.mkdir()
    (base_dir / "intersection.rou.xml").write_text(BASE_ROU)
    (base_dir / "intersection.net.xml").write_text("<net/>")
    return Settings(
        sumo_config_path=str(base_dir / "intersection.sumocfg"),
        traffic_video_url="rtsp://cam",
        flow_window_seconds=30.0,
        sumo_calibrated_config_dir=str(out_dir),
        flow_counting_lines=json.dumps(
            [{"approach": "north", "x1": 0.0, "y1": 0.5, "x2": 1.0, "y2": 0.5, "classes": ["car"]}]
        ),
    )


def test_build_calibrator_runs_measure_then_calibrate(tmp_path) -> None:
    out_dir = tmp_path / "calib"
    settings = _settings_for(tmp_path, out_dir)

    calibrator = build_cctv_flow_calibrator(settings, source=_FakeFlowSource())
    cfg = calibrator("normal")

    assert cfg == str(out_dir / "normal.sumocfg")
    # 1 crossing / 30s -> 120 veh/h -> period 30
    assert _periods(out_dir / "normal.rou.xml")["flow_north_through"] == "30"
    # scenario filter: only configured scenarios are calibrated
    assert calibrator("emergency") is None


def test_build_calibrator_none_without_source_url(tmp_path) -> None:
    out_dir = tmp_path / "calib"
    settings = _settings_for(tmp_path, out_dir)
    settings.traffic_video_url = None

    calibrator = build_cctv_flow_calibrator(settings, source=_FakeFlowSource())

    assert calibrator("normal") is None


# --- review fix: memoize calibration so SUMO start-failures don't re-measure ---

class _CountingSource:
    def __init__(self) -> None:
        self.calls = 0

    def stream(self, video, window_seconds):
        self.calls += 1
        yield [TrackedDetection(track_id=1, label="car", cx=0.5, cy=0.2)]
        yield [TrackedDetection(track_id=1, label="car", cx=0.5, cy=0.8)]


class _FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def test_calibrator_memoizes_measurement_within_ttl(tmp_path) -> None:
    out_dir = tmp_path / "calib"
    settings = _settings_for(tmp_path, out_dir)
    clock = _FakeClock()
    source = _CountingSource()
    calibrator = build_cctv_flow_calibrator(
        settings, source=source, clock=clock, ttl_seconds=300.0
    )

    first = calibrator("normal")
    second = calibrator("normal")  # within TTL -> cached, no re-measure

    assert source.calls == 1
    assert first == second

    clock.advance(301.0)
    calibrator("normal")  # past TTL -> re-measure
    assert source.calls == 2


# --- codex review: memoize failures + honor SUMO_CONFIG_DIR ------------------

class _FailingSource:
    def __init__(self) -> None:
        self.calls = 0

    def stream(self, video, window_seconds):
        self.calls += 1
        raise RuntimeError("stream dead")


def test_calibrator_memoizes_failure_within_ttl(tmp_path) -> None:
    out_dir = tmp_path / "calib"
    settings = _settings_for(tmp_path, out_dir)
    clock = _FakeClock()
    source = _FailingSource()
    calibrator = build_cctv_flow_calibrator(
        settings, source=source, clock=clock, ttl_seconds=300.0
    )

    first = calibrator("normal")
    second = calibrator("normal")  # within TTL -> cached failure, no re-attempt

    assert first is None and second is None
    assert source.calls == 1

    clock.advance(301.0)
    calibrator("normal")  # past TTL -> retry
    assert source.calls == 2


def test_calibrator_uses_sumo_config_dir_when_set(tmp_path) -> None:
    cfg_dir = tmp_path / "cfgdir"
    cfg_dir.mkdir()
    (cfg_dir / "intersection.rou.xml").write_text(BASE_ROU)
    (cfg_dir / "intersection.net.xml").write_text("<net/>")
    out_dir = tmp_path / "calib"
    settings = Settings(
        sumo_config_path=str(tmp_path / "elsewhere" / "intersection.sumocfg"),  # no files here
        sumo_config_dir=str(cfg_dir),
        traffic_video_url="rtsp://cam",
        flow_window_seconds=30.0,
        sumo_calibrated_config_dir=str(out_dir),
        flow_counting_lines=json.dumps(
            [{"approach": "north", "x1": 0.0, "y1": 0.5, "x2": 1.0, "y2": 0.5, "classes": ["car"]}]
        ),
    )

    calibrator = build_cctv_flow_calibrator(settings, source=_FakeFlowSource())
    cfg = calibrator("normal")

    assert cfg == str(out_dir / "normal.sumocfg")
    assert _periods(out_dir / "normal.rou.xml")["flow_north_through"] == "30"
