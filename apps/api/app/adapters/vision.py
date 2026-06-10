from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol, cast

from app.domain.enums import Direction
from app.domain.schemas import EmergencyVehicle, QueueMetrics, VisionObservation
from app.scenarios.data import SCENARIOS

DEFAULT_VEHICLE_LABELS = {
    "ambulance",
    "bus",
    "car",
    "emergency_vehicle",
    "fire_truck",
    "motorbike",
    "motorcycle",
    "police_car",
    "truck",
}
DEFAULT_EMERGENCY_LABELS = {
    "ambulance",
    "emergency_vehicle",
    "fire_truck",
    "police_car",
}
VIDEO_SUFFIXES = {".mov", ".mp4", ".mpeg", ".mpg", ".quicktime"}


class VisionAnalysisAdapter(Protocol):
    def analyze(self, scenario_id: str) -> VisionObservation:
        """Return normalized traffic observation data for one scenario."""


@dataclass(frozen=True)
class YoloDetection:
    label: str
    direction: Direction | None = None
    confidence: float | None = None
    estimated_arrival_seconds: int | None = None


@dataclass(frozen=True)
class YoloFrameAnalysis:
    captured_at: datetime
    detections: list[YoloDetection]
    queues: dict[Direction, int]
    pedestrian_waiting: bool
    intersection_blocked: bool
    congestion_level: str


class YoloFrameAnalyzer(Protocol):
    def analyze_frame(self, input_id: str) -> YoloFrameAnalysis:
        """Return YOLO-shaped frame analysis for one input fixture or upload."""


class ScenarioVisionAnalysisAdapter:
    def analyze(self, scenario_id: str) -> VisionObservation:
        return SCENARIOS.get(scenario_id, SCENARIOS["emergency"])


class FixtureYoloFrameAnalyzer:
    def analyze_frame(self, input_id: str) -> YoloFrameAnalysis:
        observation = SCENARIOS.get(input_id, SCENARIOS["emergency"])
        detections = [
            YoloDetection(label=label)
            for label, count in observation.objects.items()
            for _ in range(count)
        ]
        if observation.emergency_vehicle.present:
            detections.append(
                YoloDetection(
                    label="emergency_vehicle",
                    direction=observation.emergency_vehicle.direction,
                    estimated_arrival_seconds=(
                        observation.emergency_vehicle.estimated_arrival_seconds
                    ),
                )
            )

        return YoloFrameAnalysis(
            captured_at=observation.captured_at,
            detections=detections,
            queues={
                Direction.NORTH: observation.queues.north,
                Direction.SOUTH: observation.queues.south,
                Direction.EAST: observation.queues.east,
                Direction.WEST: observation.queues.west,
            },
            pedestrian_waiting=observation.pedestrian_waiting,
            intersection_blocked=observation.intersection_blocked,
            congestion_level=observation.congestion_level,
        )


class OpenCVYoloFrameAnalyzer:
    def __init__(
        self,
        model_path: str,
        confidence_threshold: float = 0.25,
        cv2_module: object | None = None,
        yolo_model: object | None = None,
    ) -> None:
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.cv2_module = cv2_module or _load_cv2_module()
        self.yolo_model = yolo_model or _load_yolo_model(model_path)

    def analyze_frame(self, input_id: str) -> YoloFrameAnalysis:
        frame = self._load_frame(input_id)
        height, width = _frame_size(frame)
        result = _first_result(self.yolo_model(frame, verbose=False))
        names = _result_names(result)

        detections = []
        queues = {
            Direction.NORTH: 0,
            Direction.SOUTH: 0,
            Direction.EAST: 0,
            Direction.WEST: 0,
        }
        for box in cast(list[object], getattr(result, "boxes", [])):
            confidence = _first_float(getattr(box, "conf"))
            if confidence < self.confidence_threshold:
                continue

            class_id = int(_first_float(getattr(box, "cls")))
            raw_label = str(names.get(class_id, class_id))
            label = _normalize_label(raw_label)
            direction = _direction_from_box(getattr(box, "xyxy"), width, height)
            detections.append(
                YoloDetection(
                    label=label,
                    direction=direction,
                    confidence=confidence,
                )
            )
            if label in DEFAULT_VEHICLE_LABELS:
                queues[direction] += 1

        total_vehicle_count = sum(queues.values())
        return YoloFrameAnalysis(
            captured_at=datetime.now(timezone.utc),
            detections=detections,
            queues=queues,
            pedestrian_waiting=any(
                detection.label == "person" for detection in detections
            ),
            intersection_blocked=(
                total_vehicle_count >= 20
                or all(count >= 5 for count in queues.values())
            ),
            congestion_level=_congestion_level(total_vehicle_count),
        )

    def _load_frame(self, input_id: str) -> object:
        suffix = Path(input_id).suffix.lower()
        if suffix in VIDEO_SUFFIXES and hasattr(self.cv2_module, "VideoCapture"):
            capture = self.cv2_module.VideoCapture(input_id)
            ok, frame = capture.read()
            capture.release()
            if not ok or frame is None:
                raise ValueError(f"Unable to read uploaded video: {input_id}")
            return frame

        frame = self.cv2_module.imread(input_id)
        if frame is None:
            raise ValueError(f"Unable to read uploaded image: {input_id}")
        return frame


class OpenCVYoloVisionAnalysisAdapter:
    def __init__(
        self,
        detector: YoloFrameAnalyzer,
        intersection_id: str = "INT-0001",
        source: str = "opencv_yolo",
    ) -> None:
        self.detector = detector
        self.intersection_id = intersection_id
        self.source = source

    def analyze(self, input_id: str) -> VisionObservation:
        frame = self.detector.analyze_frame(input_id)
        object_counts = Counter(detection.label for detection in frame.detections)
        emergency_detection = next(
            (
                detection
                for detection in frame.detections
                if detection.label == "emergency_vehicle"
            ),
            None,
        )

        return VisionObservation(
            source=self.source,
            intersection_id=self.intersection_id,
            captured_at=frame.captured_at,
            objects=dict(object_counts),
            queues=QueueMetrics(
                north=frame.queues.get(Direction.NORTH, 0),
                south=frame.queues.get(Direction.SOUTH, 0),
                east=frame.queues.get(Direction.EAST, 0),
                west=frame.queues.get(Direction.WEST, 0),
            ),
            pedestrian_waiting=frame.pedestrian_waiting,
            emergency_vehicle=EmergencyVehicle(
                present=emergency_detection is not None,
                direction=emergency_detection.direction if emergency_detection else None,
                estimated_arrival_seconds=(
                    emergency_detection.estimated_arrival_seconds
                    if emergency_detection
                    else None
                ),
            ),
            intersection_blocked=frame.intersection_blocked,
            congestion_level=frame.congestion_level,
        )


def _load_cv2_module() -> object:
    try:
        import cv2
    except ImportError as exc:
        raise RuntimeError(
            "OpenCV runtime is not installed. Install the API vision extra "
            "before enabling VISION_ANALYSIS_MODE=opencv_yolo."
        ) from exc
    return cv2


def _load_yolo_model(model_path: str) -> object:
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise RuntimeError(
            "Ultralytics runtime is not installed. Install the API vision "
            "extra before enabling VISION_ANALYSIS_MODE=opencv_yolo."
        ) from exc
    return YOLO(model_path)


def _frame_size(frame: object) -> tuple[int, int]:
    shape = cast(tuple[int, int, int], getattr(frame, "shape"))
    return shape[0], shape[1]


def _first_result(results: object) -> object:
    return cast(list[object], results)[0]


def _result_names(result: object) -> dict[int, object]:
    names = getattr(result, "names", {})
    if isinstance(names, dict):
        return names
    return {}


def _first_float(value: object) -> float:
    if hasattr(value, "item"):
        return float(value.item())
    if isinstance(value, list | tuple):
        return _first_float(value[0])
    return float(cast(float, value))


def _xyxy_values(value: object) -> tuple[float, float, float, float]:
    if hasattr(value, "tolist"):
        value = value.tolist()
    if isinstance(value, list | tuple):
        if len(value) == 1:
            return _xyxy_values(value[0])
        return (
            float(value[0]),
            float(value[1]),
            float(value[2]),
            float(value[3]),
        )
    raise ValueError("YOLO box did not include xyxy coordinates")


def _direction_from_box(
    xyxy_value: object,
    frame_width: int,
    frame_height: int,
) -> Direction:
    x1, y1, x2, y2 = _xyxy_values(xyxy_value)
    center_x = (x1 + x2) / 2
    center_y = (y1 + y2) / 2
    if center_y < frame_height * 0.35:
        return Direction.NORTH
    if center_y > frame_height * 0.65:
        return Direction.SOUTH
    if center_x < frame_width / 2:
        return Direction.WEST
    return Direction.EAST


def _normalize_label(label: str) -> str:
    normalized = label.strip().lower().replace("-", "_").replace(" ", "_")
    if normalized in DEFAULT_EMERGENCY_LABELS:
        return "emergency_vehicle"
    return normalized


def _congestion_level(vehicle_count: int) -> str:
    if vehicle_count >= 16:
        return "high"
    if vehicle_count >= 6:
        return "medium"
    return "low"
