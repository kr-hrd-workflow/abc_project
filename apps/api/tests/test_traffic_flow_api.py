import app.api.routes as routes
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
