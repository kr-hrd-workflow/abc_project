from enum import StrEnum


class Direction(StrEnum):
    NORTH = "north"
    SOUTH = "south"
    EAST = "east"
    WEST = "west"


class EventType(StrEnum):
    QUEUE_THRESHOLD_EXCEEDED = "queue_threshold_exceeded"
    PEDESTRIAN_WAITING = "pedestrian_waiting"
    EMERGENCY_VEHICLE_APPROACH = "emergency_vehicle_approach"
    INTERSECTION_BLOCKED = "intersection_blocked"
    NORMAL_FLOW = "normal_flow"


class Severity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class RecommendationAction(StrEnum):
    EMERGENCY_PRIORITY = "emergency_priority"
    ALL_RED_SAFETY = "all_red_safety"
    GREEN_EXTENSION = "green_extension"
    PEDESTRIAN_PHASE = "pedestrian_phase"
    MAINTAIN_CYCLE = "maintain_cycle"
