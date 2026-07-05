from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.domain.enums import Direction, EventType, Severity

NonNegativeFloat = Annotated[float, Field(ge=0)]
NonNegativeInt = Annotated[int, Field(ge=0)]


class QueueMetrics(BaseModel):
    north: int = Field(ge=0)
    south: int = Field(ge=0)
    east: int = Field(ge=0)
    west: int = Field(ge=0)


class EmergencyVehicle(BaseModel):
    present: bool
    direction: Direction | None = None
    estimated_arrival_seconds: int | None = Field(default=None, ge=0)


class VisionObservation(BaseModel):
    source: str
    intersection_id: str
    captured_at: datetime
    objects: dict[str, NonNegativeInt]
    queues: QueueMetrics
    pedestrian_waiting: bool
    emergency_vehicle: EmergencyVehicle
    intersection_blocked: bool
    congestion_level: str


class TrafficEventRead(BaseModel):
    id: int
    intersection_id: str
    occurred_at: datetime
    direction: Direction | None
    event_type: EventType
    severity: Severity
    object_count: NonNegativeInt
    ai_summary: str
    recommendation: str
    status: str
    source: str


class SimulationMetrics(BaseModel):
    average_wait_seconds: NonNegativeFloat
    total_delay_seconds: NonNegativeFloat
    throughput: NonNegativeInt
    emergency_vehicle_clearance_seconds: NonNegativeFloat


class SimulationComparison(BaseModel):
    source: str
    baseline: SimulationMetrics
    recommended: SimulationMetrics
    improvement: dict[str, float]


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    locale: Literal["ko", "en"] | None = None


class AgentResponseSections(BaseModel):
    current_situation: str
    recommended_action: str
    recommendation_rationale: list[str]
    authority_limit: str
    simulation_result: str


class ChatResponse(BaseModel):
    answer: str
    referenced_event_ids: list[int]
    sections: AgentResponseSections | None = None
