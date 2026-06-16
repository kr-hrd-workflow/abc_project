from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domain.schemas import QueueMetrics, TrafficEventRead


class SimulationVehicleSnapshot(BaseModel):
    id: str
    vehicle_type: Literal["car", "bus", "taxi", "truck", "emergency"]
    lane_id: str
    x_meters: float
    y_meters: float
    heading_degrees: float
    speed_mps: float
    waiting_seconds: float
    emergency: bool = False


class SimulationDensitySegment(BaseModel):
    segment_id: str
    approach: Literal["north", "south", "east", "west"]
    start_meters_from_stop_line: float
    end_meters_from_stop_line: float
    lane_count: int
    vehicle_count: int
    average_speed_mps: float
    source: Literal["aggregate_density_proxy", "fixture_density_proxy"]


class SimulationSignalSnapshot(BaseModel):
    signal_id: str
    direction: Literal["north", "south", "east", "west"]
    state: Literal["red", "yellow", "green"]
    seconds_remaining: float


class SimulationFrameSnapshot(BaseModel):
    source: str
    intersection_id: str
    scenario_id: str
    sim_time_seconds: float
    captured_at: datetime
    bounds_meters: dict[str, float]
    vehicles: list[SimulationVehicleSnapshot]
    density_segments: list[SimulationDensitySegment] = Field(default_factory=list)
    signals: list[SimulationSignalSnapshot]
    queues: QueueMetrics
    events: list[TrafficEventRead]
