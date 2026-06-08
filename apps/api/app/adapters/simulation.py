from typing import Protocol

from app.domain.schemas import SimulationComparison
from app.scenarios.data import SIMULATION_COMPARISON


class TrafficSimulationAdapter(Protocol):
    def compare_signal_plan(self, scenario_id: str) -> SimulationComparison:
        """Return fixed-plan and recommended-plan simulation metrics."""


class ScenarioTrafficSimulationAdapter:
    def compare_signal_plan(self, scenario_id: str) -> SimulationComparison:
        return SIMULATION_COMPARISON
