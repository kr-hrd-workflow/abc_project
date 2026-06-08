from typing import Protocol

from app.domain.schemas import VisionObservation
from app.scenarios.data import SCENARIOS


class VisionAnalysisAdapter(Protocol):
    def analyze(self, scenario_id: str) -> VisionObservation:
        """Return normalized traffic observation data for one scenario."""


class ScenarioVisionAnalysisAdapter:
    def analyze(self, scenario_id: str) -> VisionObservation:
        return SCENARIOS.get(scenario_id, SCENARIOS["emergency"])
