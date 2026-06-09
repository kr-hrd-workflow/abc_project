from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from app.domain.enums import Direction
from app.domain.schemas import EmergencyVehicle, QueueMetrics, VisionObservation
from app.scenarios.data import SCENARIOS


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
