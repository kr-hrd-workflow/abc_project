from datetime import datetime, timezone

import pytest

from app.adapters.flow_counter import (
    ApproachFlow,
    CountingLine,
    FlowCounter,
    FlowMeasurement,
    PedestrianFlow,
    TrackedDetection,
)

CAPTURED_AT = datetime(2026, 6, 30, 12, 0, tzinfo=timezone.utc)

# A horizontal line across the carriageway at mid-frame.
NORTH_LINE = CountingLine(
    approach="north",
    x1=0.0,
    y1=0.5,
    x2=1.0,
    y2=0.5,
    classes=("car", "bus", "truck", "motorbike"),
)
PEDESTRIAN_LINE = CountingLine(
    approach="crosswalk",
    x1=0.0,
    y1=0.8,
    x2=1.0,
    y2=0.8,
    classes=("person",),
    kind="pedestrian",
)


def _track(track_id: int, label: str, points: list[tuple[float, float]]):
    """One detection per frame for a single moving track."""
    return [
        [TrackedDetection(track_id=track_id, label=label, cx=cx, cy=cy)]
        for cx, cy in points
    ]


def test_single_northbound_crossing_yields_flow() -> None:
    frames = _track(1, "car", [(0.5, 0.2), (0.5, 0.8)])
    counter = FlowCounter(lines=[NORTH_LINE])

    measurement = counter.measure(
        frames, window_seconds=30.0, source="clip", captured_at=CAPTURED_AT
    )

    assert isinstance(measurement, FlowMeasurement)
    assert measurement.source == "clip"
    assert measurement.captured_at == CAPTURED_AT
    assert measurement.window_seconds == 30.0
    north = measurement.approaches["north"]
    assert isinstance(north, ApproachFlow)
    assert north.crossings == 1
    assert north.by_class == {"car": 1}
    # 1 crossing over 30s -> 120 veh/h
    assert north.veh_per_hour == 120.0
    assert measurement.pedestrian is None


def test_no_crossing_when_track_stays_one_side() -> None:
    frames = _track(1, "car", [(0.5, 0.2), (0.5, 0.25), (0.5, 0.3)])
    counter = FlowCounter(lines=[NORTH_LINE])

    measurement = counter.measure(frames, window_seconds=30.0, captured_at=CAPTURED_AT)

    north = measurement.approaches["north"]
    assert north.crossings == 0
    assert north.veh_per_hour == 0.0
    assert north.by_class == {}


def test_jitter_across_line_counts_once_per_track() -> None:
    # down, back up, down again -> still one vehicle through the approach
    frames = _track(1, "car", [(0.5, 0.2), (0.5, 0.8), (0.5, 0.2), (0.5, 0.8)])
    counter = FlowCounter(lines=[NORTH_LINE])

    measurement = counter.measure(frames, window_seconds=30.0, captured_at=CAPTURED_AT)

    assert measurement.approaches["north"].crossings == 1


def test_person_only_counts_on_pedestrian_line() -> None:
    car_frames = _track(1, "car", [(0.3, 0.2), (0.3, 0.8)])  # crosses north (y=0.5)
    person_frames = _track(2, "person", [(0.6, 0.7), (0.6, 0.9)])  # crosses crosswalk (y=0.8)
    # interleave the two single-track frame lists into combined frames
    frames = [car_frames[0] + person_frames[0], car_frames[1] + person_frames[1]]
    counter = FlowCounter(lines=[NORTH_LINE, PEDESTRIAN_LINE])

    measurement = counter.measure(frames, window_seconds=30.0, captured_at=CAPTURED_AT)

    assert measurement.approaches["north"].crossings == 1
    assert measurement.approaches["north"].by_class == {"car": 1}
    assert isinstance(measurement.pedestrian, PedestrianFlow)
    assert measurement.pedestrian.crossings == 1
    assert measurement.pedestrian.per_hour == 120.0


def test_by_class_breakdown_on_same_approach() -> None:
    car_frames = _track(1, "car", [(0.3, 0.2), (0.3, 0.8)])
    bus_frames = _track(2, "bus", [(0.7, 0.2), (0.7, 0.8)])
    frames = [car_frames[0] + bus_frames[0], car_frames[1] + bus_frames[1]]
    counter = FlowCounter(lines=[NORTH_LINE])

    measurement = counter.measure(frames, window_seconds=30.0, captured_at=CAPTURED_AT)

    north = measurement.approaches["north"]
    assert north.crossings == 2
    assert north.by_class == {"car": 1, "bus": 1}
    assert north.veh_per_hour == 240.0


# --- source adapter (cv2 + YOLO.track) -------------------------------------

class _FakeFrame:
    def __init__(self, shape=(100, 200, 3)) -> None:
        self.shape = shape


class _FakeBox:
    def __init__(self, track_id, class_id, confidence, xyxy) -> None:
        self.id = None if track_id is None else [track_id]
        self.cls = [class_id]
        self.conf = [confidence]
        self.xyxy = [xyxy]


class _FakeResult:
    names = {0: "person", 2: "car", 5: "bus"}

    def __init__(self, boxes) -> None:
        self.boxes = boxes


class _FakeYoloTrackModel:
    def __init__(self, results_per_frame) -> None:
        self._results = list(results_per_frame)
        self._i = 0
        self.track_calls = []

    def track(self, frame, **kwargs):
        self.track_calls.append(kwargs)
        result = self._results[self._i]
        self._i += 1
        return [result]


class _FakeCapture:
    def __init__(self, frames, fps) -> None:
        self._frames = list(frames)
        self._i = 0
        self._fps = fps
        self.released = False

    def get(self, prop):
        return self._fps

    def read(self):
        if self._i >= len(self._frames):
            return False, None
        frame = self._frames[self._i]
        self._i += 1
        return True, frame

    def release(self):
        self.released = True


class _FakeCv2:
    CAP_PROP_FPS = 5

    def __init__(self, capture) -> None:
        self._capture = capture
        self.opened_with = None

    def VideoCapture(self, source):
        self.opened_with = source
        return self._capture


def test_flow_source_yields_normalized_tracked_detections() -> None:
    from app.adapters.flow_counter import OpenCVYoloFlowSource

    frames = [_FakeFrame(), _FakeFrame()]
    results = [
        _FakeResult([
            _FakeBox(1, 2, 0.9, [20, 5, 60, 35]),     # car id=1 -> cx 0.2 cy 0.2
            _FakeBox(None, 2, 0.9, [10, 10, 20, 20]),  # untracked -> skipped
            _FakeBox(3, 2, 0.10, [0, 0, 10, 10]),      # low conf -> skipped
        ]),
        _FakeResult([_FakeBox(1, 2, 0.9, [20, 75, 60, 95])]),  # car id=1 -> cy 0.85
    ]
    cv2 = _FakeCv2(_FakeCapture(frames, fps=15.0))
    model = _FakeYoloTrackModel(results)
    source = OpenCVYoloFlowSource(
        model_path="x.pt", confidence_threshold=0.25, cv2_module=cv2, yolo_model=model
    )

    yielded = list(source.stream("clip.mp4", window_seconds=10.0))

    assert cv2.opened_with == "clip.mp4"
    assert yielded == [
        [TrackedDetection(track_id=1, label="car", cx=0.2, cy=0.2)],
        [TrackedDetection(track_id=1, label="car", cx=0.2, cy=0.85)],
    ]
    assert model.track_calls[0]["tracker"] == "bytetrack.yaml"
    assert model.track_calls[0]["persist"] is True
    assert source  # capture released
    assert cv2._capture.released is True


def test_flow_source_respects_window_seconds() -> None:
    from app.adapters.flow_counter import OpenCVYoloFlowSource

    frames = [_FakeFrame() for _ in range(10)]
    results = [_FakeResult([_FakeBox(1, 2, 0.9, [20, 5, 60, 35])]) for _ in range(10)]
    cv2 = _FakeCv2(_FakeCapture(frames, fps=10.0))
    source = OpenCVYoloFlowSource(
        model_path="x.pt", cv2_module=cv2, yolo_model=_FakeYoloTrackModel(results)
    )

    yielded = list(source.stream("clip.mp4", window_seconds=0.3))  # 0.3 * 10fps = 3

    assert len(yielded) == 3


def test_measure_flow_wires_source_into_counter() -> None:
    from app.adapters.flow_counter import OpenCVYoloFlowSource, measure_flow

    frames = [_FakeFrame(), _FakeFrame()]
    results = [
        _FakeResult([_FakeBox(1, 2, 0.9, [80, 30, 120, 50])]),   # cy 0.4
        _FakeResult([_FakeBox(1, 2, 0.9, [80, 110, 120, 130])]),  # cy 1.2 -> crosses 0.5
    ]
    cv2 = _FakeCv2(_FakeCapture(frames, fps=15.0))
    source = OpenCVYoloFlowSource(
        model_path="x.pt", cv2_module=cv2, yolo_model=_FakeYoloTrackModel(results)
    )

    measurement = measure_flow(
        source=source,
        video="clip.mp4",
        lines=[NORTH_LINE],
        window_seconds=30.0,
        captured_at=CAPTURED_AT,
    )

    assert measurement.approaches["north"].crossings == 1
    assert measurement.approaches["north"].veh_per_hour == 120.0


# --- review fixes: duplicate-approach pedestrian dedup + empty-stream raise ---

def test_two_pedestrian_lines_same_approach_count_once() -> None:
    # Two crosswalk segments grouped under one approach name must not double-count.
    line_a = CountingLine("crosswalk", 0.0, 0.8, 1.0, 0.8, ("person",), kind="pedestrian")
    line_b = CountingLine("crosswalk", 0.0, 0.7, 1.0, 0.7, ("person",), kind="pedestrian")
    frames = _track(1, "person", [(0.6, 0.5), (0.6, 0.95)])  # crosses both y=0.7 and y=0.8
    counter = FlowCounter([line_a, line_b])

    measurement = counter.measure(frames, window_seconds=30.0, captured_at=CAPTURED_AT)

    assert measurement.pedestrian is not None
    assert measurement.pedestrian.crossings == 1
    assert measurement.pedestrian.per_hour == 120.0


def test_flow_source_raises_when_stream_unreadable() -> None:
    from app.adapters.flow_counter import OpenCVYoloFlowSource

    cv2 = _FakeCv2(_FakeCapture([], fps=15.0))  # opens but reads zero frames
    source = OpenCVYoloFlowSource(
        model_path="x.pt", cv2_module=cv2, yolo_model=_FakeYoloTrackModel([])
    )

    with pytest.raises(RuntimeError):
        list(source.stream("rtsp://down", window_seconds=10.0))
    assert cv2._capture.released is True  # still releases on failure


# --- codex review: direction filter + truncated-live-stream guard ----------

def test_direction_filter_ignores_wrong_way_crossings() -> None:
    # "down" = centroid cy increasing; oncoming (cy decreasing) must not count.
    line = CountingLine("north", 0.0, 0.5, 1.0, 0.5, ("car",), direction="down")
    counter = FlowCounter([line])

    down = counter.measure(_track(1, "car", [(0.5, 0.2), (0.5, 0.8)]),
                           window_seconds=30.0, captured_at=CAPTURED_AT)
    up = counter.measure(_track(2, "car", [(0.5, 0.8), (0.5, 0.2)]),
                         window_seconds=30.0, captured_at=CAPTURED_AT)

    assert down.approaches["north"].crossings == 1
    assert up.approaches["north"].crossings == 0


def test_flow_source_raises_on_truncated_live_stream() -> None:
    from app.adapters.flow_counter import OpenCVYoloFlowSource

    frames = [_FakeFrame(), _FakeFrame()]  # only 2 frames
    results = [_FakeResult([_FakeBox(1, 2, 0.9, [20, 5, 60, 35])]) for _ in range(2)]
    cv2 = _FakeCv2(_FakeCapture(frames, fps=15.0))
    source = OpenCVYoloFlowSource(
        model_path="x.pt", cv2_module=cv2, yolo_model=_FakeYoloTrackModel(results)
    )

    # 10s * 15fps = 150 frames expected; only 2 from a LIVE url -> truncation failure
    with pytest.raises(RuntimeError):
        list(source.stream("https://cam/live.m3u8", window_seconds=10.0))


# --- codex review round 2: line-array shape, direction parse, URL redaction --

import json as _json


def test_load_counting_lines_accepts_line_array_and_direction() -> None:
    from app.adapters.flow_counter import load_counting_lines

    raw = _json.dumps([
        {"approach": "north", "line": [0.0, 0.5, 1.0, 0.5], "classes": ["car"], "direction": "down"},
    ])
    lines = load_counting_lines(raw)

    assert len(lines) == 1
    line = lines[0]
    assert (line.x1, line.y1, line.x2, line.y2) == (0.0, 0.5, 1.0, 0.5)
    assert line.classes == ("car",)
    assert line.direction == "down"


def test_load_counting_lines_still_accepts_separate_coords() -> None:
    from app.adapters.flow_counter import load_counting_lines

    raw = _json.dumps([
        {"approach": "south", "x1": 0.0, "y1": 0.6, "x2": 1.0, "y2": 0.6, "classes": ["bus"], "dir": "up"},
    ])
    lines = load_counting_lines(raw)

    assert (lines[0].x1, lines[0].y2) == (0.0, 0.6)
    assert lines[0].direction == "up"  # "dir" alias accepted


def test_stream_error_redacts_signed_url() -> None:
    from app.adapters.flow_counter import OpenCVYoloFlowSource

    cv2 = _FakeCv2(_FakeCapture([], fps=15.0))  # zero frames -> raises
    source = OpenCVYoloFlowSource(
        model_path="x.pt", cv2_module=cv2, yolo_model=_FakeYoloTrackModel([])
    )

    with pytest.raises(RuntimeError) as excinfo:
        list(source.stream("https://cam/live.m3u8?wowzatokenhash=SECRET123", window_seconds=5.0))

    assert "SECRET123" not in str(excinfo.value)
    assert "wowzatokenhash" not in str(excinfo.value)
