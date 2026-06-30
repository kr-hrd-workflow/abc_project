"""Time-series flow counting from tracked detections.

`FlowCounter` is a pure unit: given a stream of per-frame tracked detections and
a set of counting lines, it counts how many distinct tracks cross each line and
derives per-approach traffic flow (veh/h). It has no OpenCV/YOLO dependency so it
can be unit-tested directly; the live source adapter that produces the tracked
detections lives in `OpenCVYoloFlowSource` (this module, lazily importing cv2).
"""

import json
import logging
import math
from collections import Counter
from collections.abc import Iterable, Iterator, Sequence
from dataclasses import dataclass
from datetime import datetime, timezone

from app.adapters.vision import (
    _first_float,
    _frame_size,
    _load_cv2_module,
    _load_yolo_model,
    _normalize_label,
    _result_names,
    _xyxy_values,
)

logger = logging.getLogger(__name__)

Point = tuple[float, float]

DEFAULT_VEHICLE_CLASS_IDS = (0, 2, 3, 5, 7)  # COCO: person, car, motorcycle, bus, truck


@dataclass(frozen=True)
class CountingLine:
    """A virtual line (normalized [0,1] frame coords) that counts crossings.

    `classes` filters which detection labels count on this line. `kind` is
    "vehicle" (rolls up into approaches/veh-h) or "pedestrian" (display only).
    """

    approach: str
    x1: float
    y1: float
    x2: float
    y2: float
    classes: tuple[str, ...]
    kind: str = "vehicle"
    # Optional travel-direction filter: "down"/"up" (cy +/-) or "right"/"left"
    # (cx +/-). None counts crossings in either direction.
    direction: str | None = None


@dataclass(frozen=True)
class TrackedDetection:
    track_id: int
    label: str
    cx: float
    cy: float


@dataclass(frozen=True)
class ApproachFlow:
    veh_per_hour: float
    by_class: dict[str, int]
    crossings: int


@dataclass(frozen=True)
class PedestrianFlow:
    per_hour: float
    crossings: int


@dataclass(frozen=True)
class FlowMeasurement:
    source: str
    captured_at: datetime
    window_seconds: float
    approaches: dict[str, ApproachFlow]
    pedestrian: PedestrianFlow | None


def _orientation(a: Point, b: Point, c: Point) -> float:
    return (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0])


def _moves_in_direction(prev: Point, curr: Point, direction: str | None) -> bool:
    if direction is None:
        return True
    dx = curr[0] - prev[0]
    dy = curr[1] - prev[1]
    return {
        "down": dy > 0,
        "up": dy < 0,
        "right": dx > 0,
        "left": dx < 0,
    }.get(direction, True)


def _is_live_source(video: str) -> bool:
    return video.startswith(("http://", "https://", "rtsp://", "rtmp://", "rtmps://"))


def _segments_intersect(p1: Point, p2: Point, p3: Point, p4: Point) -> bool:
    """True if open segment p1->p2 properly straddles segment p3->p4.

    ponytail: ignores collinear-touch edges; a centroid that lands exactly on
    the line for one frame is picked up on the adjacent frame's segment instead.
    """

    d1 = _orientation(p3, p4, p1)
    d2 = _orientation(p3, p4, p2)
    d3 = _orientation(p1, p2, p3)
    d4 = _orientation(p1, p2, p4)
    return ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0))


class FlowCounter:
    def __init__(self, lines: Sequence[CountingLine]) -> None:
        self.lines = list(lines)

    def measure(
        self,
        frames: Iterable[Sequence[TrackedDetection]],
        window_seconds: float,
        *,
        source: str = "cctv",
        captured_at: datetime | None = None,
    ) -> FlowMeasurement:
        if window_seconds <= 0:
            raise ValueError("window_seconds must be positive")

        previous: dict[int, Point] = {}
        counted: set[tuple[str, int]] = set()
        per_line_class: dict[str, Counter[str]] = {
            line.approach: Counter() for line in self.lines
        }

        for frame in frames:
            for det in frame:
                current = (det.cx, det.cy)
                prior = previous.get(det.track_id)
                if prior is not None:
                    for line in self.lines:
                        if det.label not in line.classes:
                            continue
                        key = (line.approach, det.track_id)
                        if key in counted:
                            continue
                        if _segments_intersect(
                            prior, current, (line.x1, line.y1), (line.x2, line.y2)
                        ) and _moves_in_direction(prior, current, line.direction):
                            counted.add(key)
                            per_line_class[line.approach][det.label] += 1
                previous[det.track_id] = current

        # per_line_class is keyed by approach, so iterate unique approaches once
        # (lines sharing an approach already collapsed into one Counter above).
        approach_kind: dict[str, str] = {}
        for line in self.lines:
            approach_kind.setdefault(line.approach, line.kind)

        approaches: dict[str, ApproachFlow] = {}
        pedestrian_crossings = 0
        has_pedestrian = False
        for approach, class_counts in per_line_class.items():
            crossings = sum(class_counts.values())
            if approach_kind[approach] == "pedestrian":
                has_pedestrian = True
                pedestrian_crossings += crossings
            else:
                approaches[approach] = ApproachFlow(
                    veh_per_hour=round(crossings / window_seconds * 3600, 1),
                    by_class=dict(class_counts),
                    crossings=crossings,
                )

        pedestrian = None
        if has_pedestrian:
            pedestrian = PedestrianFlow(
                per_hour=round(pedestrian_crossings / window_seconds * 3600, 1),
                crossings=pedestrian_crossings,
            )

        return FlowMeasurement(
            source=source,
            captured_at=captured_at or datetime.now(timezone.utc),
            window_seconds=window_seconds,
            approaches=approaches,
            pedestrian=pedestrian,
        )


def default_counting_lines() -> list[CountingLine]:
    """Placeholder Gangnam-daero layout (normalized frame coords).

    Through lines exclude buses so they map to SUMO passenger flow; bus lines
    map to the median bus flow. These coordinates MUST be calibrated per camera
    via FLOW_COUNTING_LINES — a fixed view's geometry can't be inferred.
    """

    through = ("car", "motorcycle", "truck")
    return [
        CountingLine("north", 0.05, 0.45, 0.50, 0.45, through),
        CountingLine("south", 0.50, 0.60, 0.95, 0.60, through),
        CountingLine("bus_north", 0.05, 0.45, 0.50, 0.45, ("bus",)),
        CountingLine("bus_south", 0.50, 0.60, 0.95, 0.60, ("bus",)),
        CountingLine("crosswalk", 0.30, 0.80, 0.95, 0.80, ("person",), kind="pedestrian"),
    ]


def load_counting_lines(raw: str | None) -> list[CountingLine]:
    """Parse FLOW_COUNTING_LINES JSON; fall back to the default layout."""

    if not raw:
        return default_counting_lines()
    try:
        items = json.loads(raw)
        return [
            CountingLine(
                approach=item["approach"],
                x1=float(item["x1"]),
                y1=float(item["y1"]),
                x2=float(item["x2"]),
                y2=float(item["y2"]),
                classes=tuple(item["classes"]),
                kind=item.get("kind", "vehicle"),
            )
            for item in items
        ]
    except (ValueError, TypeError, KeyError) as exc:
        logger.warning("Invalid FLOW_COUNTING_LINES; using defaults: %s", exc)
        return default_counting_lines()


def _first_int(value: object) -> int:
    return int(_first_float(value))


class OpenCVYoloFlowSource:
    """Streams per-frame tracked detections from a video source via YOLO+ByteTrack.

    cv2/YOLO are loaded lazily (only when not injected) so the pure FlowCounter
    and these tests run without the vision extra installed.
    """

    def __init__(
        self,
        model_path: str,
        *,
        confidence_threshold: float = 0.25,
        vehicle_class_ids: Sequence[int] = DEFAULT_VEHICLE_CLASS_IDS,
        tracker: str = "bytetrack.yaml",
        default_fps: float = 15.0,
        cv2_module: object | None = None,
        yolo_model: object | None = None,
    ) -> None:
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.vehicle_class_ids = list(vehicle_class_ids)
        self.tracker = tracker
        self.default_fps = default_fps
        self.cv2_module = cv2_module or _load_cv2_module()
        self.yolo_model = yolo_model or _load_yolo_model(model_path)

    def stream(
        self, video: str, window_seconds: float
    ) -> Iterator[list[TrackedDetection]]:
        capture = self.cv2_module.VideoCapture(video)
        fps_prop = getattr(self.cv2_module, "CAP_PROP_FPS", 5)
        try:
            fps = float(capture.get(fps_prop) or 0.0) or self.default_fps
            max_frames = max(1, math.ceil(window_seconds * fps))
            read_count = 0
            while read_count < max_frames:
                ok, frame = capture.read()
                if not ok or frame is None:
                    break
                read_count += 1
                yield self._detections(frame)
            if read_count == 0:
                # Unreachable/expired stream: VideoCapture opened but read no
                # frames. Raise so callers 503 / fall back instead of reporting
                # a bogus all-zero flow.
                raise RuntimeError(f"CCTV stream yielded no frames: {video}")
            if read_count < max_frames and _is_live_source(video):
                # A live stream that died before the window (expired token, drop)
                # would otherwise be divided by the full window -> bogus low rate.
                # A finite clip legitimately ends early, so only guard live URLs.
                raise RuntimeError(
                    f"CCTV stream truncated before the sample window: {video}"
                )
        finally:
            release = getattr(capture, "release", None)
            if callable(release):
                release()

    def _detections(self, frame: object) -> list[TrackedDetection]:
        height, width = _frame_size(frame)
        result = self.yolo_model.track(
            frame,
            persist=True,
            tracker=self.tracker,
            classes=self.vehicle_class_ids,
            conf=self.confidence_threshold,
            verbose=False,
        )[0]
        names = _result_names(result)
        detections: list[TrackedDetection] = []
        for box in getattr(result, "boxes", []):
            track_id = getattr(box, "id", None)
            if track_id is None:
                continue
            if _first_float(getattr(box, "conf")) < self.confidence_threshold:
                continue
            class_id = int(_first_float(getattr(box, "cls")))
            label = _normalize_label(str(names.get(class_id, class_id)))
            x1, y1, x2, y2 = _xyxy_values(getattr(box, "xyxy"))
            detections.append(
                TrackedDetection(
                    track_id=_first_int(track_id),
                    label=label,
                    cx=(x1 + x2) / 2 / width,
                    cy=(y1 + y2) / 2 / height,
                )
            )
        return detections


def measure_flow(
    *,
    source: OpenCVYoloFlowSource,
    video: str,
    lines: Sequence[CountingLine],
    window_seconds: float,
    source_label: str | None = None,
    captured_at: datetime | None = None,
) -> FlowMeasurement:
    counter = FlowCounter(lines)
    frames = source.stream(video, window_seconds)
    return counter.measure(
        frames,
        window_seconds,
        source=source_label or video,
        captured_at=captured_at,
    )
