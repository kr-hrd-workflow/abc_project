import app.api.routes as routes
import pytest
from fastapi.testclient import TestClient

from app.adapters.flow_counter import CountingLine, TrackedDetection
from app.main import app

NORTH_LINE = CountingLine(
    approach="north",
    x1=0.0,
    y1=0.5,
    x2=1.0,
    y2=0.5,
    classes=("car", "bus", "truck", "motorbike"),
)


@pytest.fixture(autouse=True)
def _flow_env(monkeypatch):
    # cctv-flow requires opencv_yolo mode; reset the cached source per test.
    monkeypatch.setattr(routes.settings, "vision_analysis_mode", "opencv_yolo", raising=False)
    routes._reset_flow_source_cache()
    yield
    routes._reset_flow_source_cache()


class _FakeFlowSource:
    def stream(self, video, window_seconds):
        assert video == "rtsp://cam"
        yield [TrackedDetection(track_id=1, label="car", cx=0.5, cy=0.2)]
        yield [TrackedDetection(track_id=1, label="car", cx=0.5, cy=0.8)]


def test_cctv_flow_returns_503_without_source(monkeypatch) -> None:
    monkeypatch.setattr(routes.settings, "traffic_video_url", None, raising=False)
    client = TestClient(app)

    response = client.get("/api/traffic/cctv-flow")

    assert response.status_code == 503


def test_cctv_flow_projects_measurement(monkeypatch) -> None:
    monkeypatch.setattr(routes.settings, "traffic_video_url", "rtsp://cam", raising=False)
    monkeypatch.setattr(routes.settings, "flow_window_seconds", 30.0, raising=False)
    monkeypatch.setattr(routes, "_build_flow_source", lambda: _FakeFlowSource())
    monkeypatch.setattr(routes, "_flow_lines", lambda: [NORTH_LINE])
    client = TestClient(app)

    response = client.get("/api/traffic/cctv-flow")

    assert response.status_code == 200
    body = response.json()
    assert body["window_seconds"] == 30.0
    assert body["per_approach"]["north"]["veh_per_hour"] == 120.0
    assert body["per_approach"]["north"]["crossings"] == 1
    assert body["per_approach"]["north"]["by_class"] == {"car": 1}
    assert body["pedestrian"] is None
    assert "captured_at" in body


def test_cctv_flow_returns_503_when_model_load_fails(monkeypatch) -> None:
    monkeypatch.setattr(routes.settings, "traffic_video_url", "rtsp://cam", raising=False)

    def boom() -> object:
        raise FileNotFoundError("yolo weights missing")

    monkeypatch.setattr(routes, "_build_flow_source", boom)
    client = TestClient(app)

    response = client.get("/api/traffic/cctv-flow")

    assert response.status_code == 503


def test_cctv_flow_returns_503_when_stream_unreadable(monkeypatch) -> None:
    monkeypatch.setattr(routes.settings, "traffic_video_url", "rtsp://down", raising=False)
    monkeypatch.setattr(routes.settings, "flow_window_seconds", 30.0, raising=False)

    class _DeadSource:
        def stream(self, video, window_seconds):
            if False:
                yield []
            raise RuntimeError("CCTV stream yielded no frames")

    monkeypatch.setattr(routes, "_build_flow_source", lambda: _DeadSource())
    monkeypatch.setattr(routes, "_flow_lines", lambda: [NORTH_LINE])
    client = TestClient(app)

    response = client.get("/api/traffic/cctv-flow")

    assert response.status_code == 503


def test_cctv_flow_503_in_fixture_mode_without_building_source(monkeypatch) -> None:
    monkeypatch.setattr(routes.settings, "vision_analysis_mode", "fixture", raising=False)
    monkeypatch.setattr(routes.settings, "traffic_video_url", "rtsp://cam", raising=False)
    built: list[int] = []
    monkeypatch.setattr(routes, "_build_flow_source", lambda: built.append(1))
    client = TestClient(app)

    response = client.get("/api/traffic/cctv-flow")

    assert response.status_code == 503
    assert built == []  # never constructs YOLO/cv2 in fixture mode


def test_cctv_flow_503_does_not_leak_signed_url(monkeypatch) -> None:
    secret = "https://cam.example/playlist.m3u8?wowzatokenhash=SECRETHASH123"
    monkeypatch.setattr(routes.settings, "traffic_video_url", secret, raising=False)
    monkeypatch.setattr(routes.settings, "flow_window_seconds", 30.0, raising=False)

    class _DeadSource:
        def stream(self, video, window_seconds):
            if False:
                yield []
            raise RuntimeError(f"CCTV stream yielded no frames: {video}")

    monkeypatch.setattr(routes, "_build_flow_source", lambda: _DeadSource())
    monkeypatch.setattr(routes, "_flow_lines", lambda: [NORTH_LINE])
    client = TestClient(app)

    response = client.get("/api/traffic/cctv-flow")

    assert response.status_code == 503
    assert "SECRETHASH123" not in response.text
    assert "wowzatoken" not in response.text


def test_cctv_flow_reuses_cached_source_across_requests(monkeypatch) -> None:
    monkeypatch.setattr(routes.settings, "traffic_video_url", "rtsp://cam", raising=False)
    monkeypatch.setattr(routes.settings, "flow_window_seconds", 30.0, raising=False)
    builds: list[int] = []

    class _Src:
        def stream(self, video, window_seconds):
            yield [TrackedDetection(track_id=1, label="car", cx=0.5, cy=0.2)]
            yield [TrackedDetection(track_id=1, label="car", cx=0.5, cy=0.8)]

    def build() -> _Src:
        builds.append(1)
        return _Src()

    monkeypatch.setattr(routes, "_build_flow_source", build)
    monkeypatch.setattr(routes, "_flow_lines", lambda: [NORTH_LINE])
    client = TestClient(app)

    client.get("/api/traffic/cctv-flow")
    client.get("/api/traffic/cctv-flow")

    assert len(builds) == 1  # model weights loaded once, not per request


def test_cctv_flow_holds_lock_during_measurement(monkeypatch) -> None:
    import datetime as _dt

    from app.adapters.flow_counter import FlowMeasurement

    monkeypatch.setattr(routes.settings, "traffic_video_url", "rtsp://cam", raising=False)
    monkeypatch.setattr(routes.settings, "flow_window_seconds", 30.0, raising=False)
    monkeypatch.setattr(routes, "_build_flow_source", lambda: object())
    monkeypatch.setattr(routes, "_flow_lines", lambda: [NORTH_LINE])
    held: list[bool] = []

    def fake_measure(**kwargs):
        held.append(routes._FLOW_LOCK.locked())
        return FlowMeasurement(
            source="cctv",
            captured_at=_dt.datetime(2026, 6, 30, tzinfo=_dt.timezone.utc),
            window_seconds=30.0,
            approaches={},
            pedestrian=None,
        )

    monkeypatch.setattr(routes, "measure_flow", fake_measure)
    client = TestClient(app)

    response = client.get("/api/traffic/cctv-flow")

    assert response.status_code == 200
    assert held == [True]  # sampling ran under the shared-tracker lock


def test_cctv_flow_failure_log_redacts_url(monkeypatch, caplog) -> None:
    secret = "https://cam/live.m3u8?wowzatokenhash=SECRETLOG"
    monkeypatch.setattr(routes.settings, "traffic_video_url", secret, raising=False)
    monkeypatch.setattr(routes.settings, "flow_window_seconds", 30.0, raising=False)

    class _DeadSource:
        def stream(self, video, window_seconds):
            if False:
                yield []
            raise RuntimeError(f"boom for {video}")

    monkeypatch.setattr(routes, "_build_flow_source", lambda: _DeadSource())
    monkeypatch.setattr(routes, "_flow_lines", lambda: [NORTH_LINE])
    client = TestClient(app)

    with caplog.at_level("WARNING"):
        response = client.get("/api/traffic/cctv-flow")

    assert response.status_code == 503
    assert "SECRETLOG" not in caplog.text
    assert "wowzatokenhash" not in caplog.text
