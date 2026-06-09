from datetime import datetime
from zoneinfo import ZoneInfo

from app.adapters import simulation as simulation_module
from app.adapters.simulation import (
    ScenarioTrafficSimulationAdapter,
    SumoSimulationMetrics,
    SumoSimulationResult,
    SumoTraciTrafficSimulationAdapter,
    TraciSumoSimulationRunner,
)
from app.adapters.vision import (
    OpenCVYoloFrameAnalyzer,
    OpenCVYoloVisionAnalysisAdapter,
    ScenarioVisionAnalysisAdapter,
    YoloDetection,
    YoloFrameAnalysis,
)
from app.domain.enums import Direction
from app.domain.schemas import VisionObservation


def test_vision_adapter_returns_yolo_shaped_emergency_scenario() -> None:
    adapter = ScenarioVisionAnalysisAdapter()

    observation = adapter.analyze("emergency")

    assert observation.source == "scenario_mock"
    assert observation.intersection_id == "INT-0001"
    assert observation.objects["car"] == 42
    assert observation.queues.north == 32
    assert observation.emergency_vehicle.present is True
    assert observation.emergency_vehicle.direction == Direction.EAST


def test_opencv_yolo_adapter_returns_vision_observation_contract() -> None:
    captured_at = datetime(2026, 6, 9, 8, 15, tzinfo=ZoneInfo("Asia/Seoul"))

    class StubYoloAnalyzer:
        def analyze_frame(self, input_id: str) -> YoloFrameAnalysis:
            assert input_id == "emergency-east-frame"
            return YoloFrameAnalysis(
                captured_at=captured_at,
                detections=[
                    YoloDetection(label="car", direction=Direction.NORTH),
                    YoloDetection(label="car", direction=Direction.NORTH),
                    YoloDetection(label="bus", direction=Direction.EAST),
                    YoloDetection(label="person", direction=Direction.SOUTH),
                    YoloDetection(
                        label="emergency_vehicle",
                        direction=Direction.EAST,
                        estimated_arrival_seconds=14,
                    ),
                ],
                queues={
                    Direction.NORTH: 12,
                    Direction.SOUTH: 3,
                    Direction.EAST: 9,
                    Direction.WEST: 0,
                },
                pedestrian_waiting=True,
                intersection_blocked=False,
                congestion_level="medium",
            )

    adapter = OpenCVYoloVisionAnalysisAdapter(detector=StubYoloAnalyzer())

    observation = adapter.analyze("emergency-east-frame")

    assert isinstance(observation, VisionObservation)
    assert observation.source == "opencv_yolo"
    assert observation.intersection_id == "INT-0001"
    assert observation.captured_at == captured_at
    assert observation.objects == {
        "bus": 1,
        "car": 2,
        "emergency_vehicle": 1,
        "person": 1,
    }
    assert observation.queues.north == 12
    assert observation.queues.south == 3
    assert observation.queues.east == 9
    assert observation.queues.west == 0
    assert observation.pedestrian_waiting is True
    assert observation.emergency_vehicle.present is True
    assert observation.emergency_vehicle.direction == Direction.EAST
    assert observation.emergency_vehicle.estimated_arrival_seconds == 14
    assert observation.intersection_blocked is False
    assert observation.congestion_level == "medium"


def test_opencv_yolo_frame_analyzer_maps_model_boxes_to_frame_analysis() -> None:
    class FakeFrame:
        shape = (100, 200, 3)

    class FakeCv2:
        def imread(self, input_id: str) -> FakeFrame:
            assert input_id == "sample-frame.jpg"
            return FakeFrame()

    class FakeBox:
        def __init__(
            self,
            class_id: int,
            confidence: float,
            xyxy: list[float],
        ) -> None:
            self.cls = [class_id]
            self.conf = [confidence]
            self.xyxy = [xyxy]

    class FakeResult:
        names = {
            0: "car",
            1: "person",
            2: "ambulance",
        }

        boxes = [
            FakeBox(0, 0.91, [20, 5, 60, 35]),
            FakeBox(1, 0.86, [30, 40, 60, 75]),
            FakeBox(2, 0.94, [160, 40, 190, 75]),
            FakeBox(0, 0.12, [150, 70, 190, 95]),
        ]

    class FakeYoloModel:
        def __call__(self, frame: FakeFrame, verbose: bool = False) -> list[FakeResult]:
            assert isinstance(frame, FakeFrame)
            assert verbose is False
            return [FakeResult()]

    analyzer = OpenCVYoloFrameAnalyzer(
        model_path="models/yolov8n.pt",
        cv2_module=FakeCv2(),
        yolo_model=FakeYoloModel(),
        confidence_threshold=0.25,
    )

    frame = analyzer.analyze_frame("sample-frame.jpg")

    assert frame.queues[Direction.NORTH] == 1
    assert frame.queues[Direction.EAST] == 1
    assert frame.queues[Direction.SOUTH] == 0
    assert frame.queues[Direction.WEST] == 0
    assert frame.pedestrian_waiting is True
    assert frame.intersection_blocked is False
    assert frame.congestion_level == "low"
    assert [
        (detection.label, detection.direction, detection.confidence)
        for detection in frame.detections
    ] == [
        ("car", Direction.NORTH, 0.91),
        ("person", Direction.WEST, 0.86),
        ("emergency_vehicle", Direction.EAST, 0.94),
    ]


def test_vision_adapter_defaults_unknown_scenario_to_emergency() -> None:
    adapter = ScenarioVisionAnalysisAdapter()

    observation = adapter.analyze("missing")

    assert observation.objects["car"] == 42
    assert observation.emergency_vehicle.present is True
    assert observation.emergency_vehicle.direction == Direction.EAST


def test_simulation_adapter_returns_sumo_shaped_comparison() -> None:
    adapter = ScenarioTrafficSimulationAdapter()

    comparison = adapter.compare_signal_plan("emergency")

    assert comparison.source == "scenario_mock"
    assert comparison.baseline.total_delay_seconds == 128.4
    assert comparison.recommended.total_delay_seconds == 105.3
    assert comparison.improvement["total_delay_percent"] == 18.0


def test_sumo_traci_adapter_returns_simulation_comparison_contract() -> None:
    class StubSumoRunner:
        def compare_plans(self, scenario_id: str) -> SumoSimulationResult:
            assert scenario_id == "emergency"
            return SumoSimulationResult(
                baseline=SumoSimulationMetrics(
                    average_wait_seconds=80,
                    total_delay_seconds=150,
                    throughput=1100,
                    emergency_vehicle_clearance_seconds=50,
                ),
                recommended=SumoSimulationMetrics(
                    average_wait_seconds=62,
                    total_delay_seconds=120,
                    throughput=1185,
                    emergency_vehicle_clearance_seconds=31,
                ),
            )

    adapter = SumoTraciTrafficSimulationAdapter(runner=StubSumoRunner())

    comparison = adapter.compare_signal_plan("emergency")

    assert comparison.source == "sumo_traci"
    assert comparison.baseline.average_wait_seconds == 80
    assert comparison.baseline.total_delay_seconds == 150
    assert comparison.baseline.throughput == 1100
    assert comparison.baseline.emergency_vehicle_clearance_seconds == 50
    assert comparison.recommended.average_wait_seconds == 62
    assert comparison.recommended.total_delay_seconds == 120
    assert comparison.recommended.throughput == 1185
    assert comparison.recommended.emergency_vehicle_clearance_seconds == 31
    assert comparison.improvement["total_delay_percent"] == 20.0
    assert comparison.improvement["average_wait_delta_seconds"] == -18
    assert comparison.improvement["emergency_clearance_delta_seconds"] == -19


def test_traci_sumo_runner_collects_baseline_and_recommended_metrics(
    tmp_path,
    monkeypatch,
) -> None:
    class FakeSimulation:
        def __init__(self, traci: "FakeTraci") -> None:
            self.traci = traci

        def getArrivedNumber(self) -> int:
            return self.traci.current_step["arrived"]

    class FakeVehicle:
        def __init__(self, traci: "FakeTraci") -> None:
            self.traci = traci

        def getIDList(self) -> list[str]:
            return list(self.traci.current_step["waiting"].keys())

        def getWaitingTime(self, vehicle_id: str) -> float:
            return self.traci.current_step["waiting"][vehicle_id]

    class FakeTrafficLight:
        def __init__(self) -> None:
            self.phase_duration_calls: list[tuple[str, int]] = []

        def getIDList(self) -> list[str]:
            return ["INT-0001"]

        def setPhaseDuration(self, light_id: str, duration_seconds: int) -> None:
            self.phase_duration_calls.append((light_id, duration_seconds))

    class FakeTraci:
        def __init__(self) -> None:
            self.commands: list[list[str]] = []
            self.runs = [
                [
                    {"waiting": {"car-1": 10.0, "emergency-east": 4.0}, "arrived": 1},
                    {"waiting": {"car-1": 20.0}, "arrived": 2},
                ],
                [
                    {"waiting": {"car-2": 5.0, "emergency-east": 2.0}, "arrived": 3},
                    {"waiting": {"car-2": 8.0}, "arrived": 4},
                ],
            ]
            self.run_index = -1
            self.step_index = -1
            self.closed = 0
            self.simulation = FakeSimulation(self)
            self.vehicle = FakeVehicle(self)
            self.trafficlight = FakeTrafficLight()

        @property
        def current_step(self) -> dict[str, object]:
            return self.runs[self.run_index][self.step_index]

        def start(self, command: list[str]) -> None:
            self.commands.append(command)
            self.run_index += 1
            self.step_index = -1

        def simulationStep(self) -> None:
            self.step_index += 1

        def close(self) -> None:
            self.closed += 1

    python_bin = tmp_path / "bin"
    python_bin.mkdir()
    python_executable = python_bin / "python"
    sumo_executable = python_bin / "sumo"
    python_executable.write_text("")
    sumo_executable.write_text("")
    sumo_executable.chmod(0o755)
    monkeypatch.setenv("PATH", "")
    monkeypatch.setattr(
        simulation_module.sys,
        "executable",
        str(python_executable),
    )

    fake_traci = FakeTraci()
    runner = TraciSumoSimulationRunner(
        sumo_binary="sumo",
        sumo_config_path="networks/intersection.sumocfg",
        step_count=2,
        traci_module=fake_traci,
    )

    result = runner.compare_plans("emergency")

    for command in fake_traci.commands:
        assert command[0] == str(sumo_executable)
        assert command[1:-1] == [
            "-c",
            "networks/intersection.sumocfg",
            "--quit-on-end",
            "--no-step-log",
            "true",
            "--seed",
        ]
    assert fake_traci.commands[0][-1].isdigit()
    assert fake_traci.commands[1][-1].isdigit()
    assert 1 <= int(fake_traci.commands[0][-1]) <= 2_147_483_647
    assert 1 <= int(fake_traci.commands[1][-1]) <= 2_147_483_647
    assert fake_traci.commands[0][-1] != fake_traci.commands[1][-1]
    assert fake_traci.trafficlight.phase_duration_calls == [("INT-0001", 45)]
    assert fake_traci.closed == 2
    assert result.baseline.average_wait_seconds == 11.3
    assert result.baseline.total_delay_seconds == 34.0
    assert result.baseline.throughput == 3
    assert result.baseline.emergency_vehicle_clearance_seconds == 4.0
    assert result.recommended.average_wait_seconds == 5.0
    assert result.recommended.total_delay_seconds == 15.0
    assert result.recommended.throughput == 7
    assert result.recommended.emergency_vehicle_clearance_seconds == 2.0
