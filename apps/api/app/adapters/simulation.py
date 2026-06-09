from dataclasses import dataclass
import hashlib
import os
from pathlib import Path
from shutil import which
import sys
from typing import Protocol

from app.domain.schemas import SimulationComparison, SimulationMetrics
from app.scenarios.data import SIMULATION_COMPARISON


class TrafficSimulationAdapter(Protocol):
    def compare_signal_plan(self, scenario_id: str) -> SimulationComparison:
        """Return fixed-plan and recommended-plan simulation metrics."""


@dataclass(frozen=True)
class SumoSimulationMetrics:
    average_wait_seconds: float
    total_delay_seconds: float
    throughput: int
    emergency_vehicle_clearance_seconds: float


@dataclass(frozen=True)
class SumoSimulationResult:
    baseline: SumoSimulationMetrics
    recommended: SumoSimulationMetrics


class SumoSimulationRunner(Protocol):
    def compare_plans(self, scenario_id: str) -> SumoSimulationResult:
        """Return SUMO-shaped baseline and recommended-plan metrics."""


class ScenarioTrafficSimulationAdapter:
    def compare_signal_plan(self, scenario_id: str) -> SimulationComparison:
        return SIMULATION_COMPARISON


class FixtureSumoSimulationRunner:
    def compare_plans(self, scenario_id: str) -> SumoSimulationResult:
        comparison = SIMULATION_COMPARISON
        return SumoSimulationResult(
            baseline=SumoSimulationMetrics(
                average_wait_seconds=comparison.baseline.average_wait_seconds,
                total_delay_seconds=comparison.baseline.total_delay_seconds,
                throughput=comparison.baseline.throughput,
                emergency_vehicle_clearance_seconds=(
                    comparison.baseline.emergency_vehicle_clearance_seconds
                ),
            ),
            recommended=SumoSimulationMetrics(
                average_wait_seconds=comparison.recommended.average_wait_seconds,
                total_delay_seconds=comparison.recommended.total_delay_seconds,
                throughput=comparison.recommended.throughput,
                emergency_vehicle_clearance_seconds=(
                    comparison.recommended.emergency_vehicle_clearance_seconds
                ),
            ),
        )


class TraciSumoSimulationRunner:
    def __init__(
        self,
        sumo_binary: str,
        sumo_config_path: str,
        step_count: int,
        traci_module: object | None = None,
        recommended_phase_duration_seconds: int = 45,
    ) -> None:
        self.sumo_binary = sumo_binary
        self.sumo_config_path = sumo_config_path
        self.step_count = step_count
        self.traci_module = traci_module or _load_traci_module()
        self.recommended_phase_duration_seconds = recommended_phase_duration_seconds

    def compare_plans(self, scenario_id: str) -> SumoSimulationResult:
        return SumoSimulationResult(
            baseline=self._run_plan(scenario_id, "baseline"),
            recommended=self._run_plan(scenario_id, "recommended"),
        )

    def _run_plan(
        self,
        scenario_id: str,
        plan_name: str,
    ) -> SumoSimulationMetrics:
        self.traci_module.start(self._command(scenario_id, plan_name))
        try:
            if plan_name == "recommended":
                self._apply_recommended_plan()
            return self._collect_metrics()
        finally:
            self.traci_module.close()

    def _command(self, scenario_id: str, plan_name: str) -> list[str]:
        return [
            _resolve_executable(self.sumo_binary),
            "-c",
            self.sumo_config_path,
            "--quit-on-end",
            "--no-step-log",
            "true",
            "--seed",
            str(_seed_for(scenario_id, plan_name)),
        ]

    def _apply_recommended_plan(self) -> None:
        trafficlight = getattr(self.traci_module, "trafficlight", None)
        if trafficlight is None:
            return

        for light_id in trafficlight.getIDList():
            trafficlight.setPhaseDuration(
                light_id,
                self.recommended_phase_duration_seconds,
            )

    def _collect_metrics(self) -> SumoSimulationMetrics:
        total_wait_seconds = 0.0
        wait_samples = 0
        throughput = 0
        emergency_clearance_seconds = 0.0

        for _step in range(self.step_count):
            self.traci_module.simulationStep()
            throughput += int(self.traci_module.simulation.getArrivedNumber())
            for vehicle_id in self.traci_module.vehicle.getIDList():
                wait_seconds = float(
                    self.traci_module.vehicle.getWaitingTime(vehicle_id)
                )
                total_wait_seconds += wait_seconds
                wait_samples += 1
                if _is_emergency_vehicle(vehicle_id):
                    emergency_clearance_seconds = max(
                        emergency_clearance_seconds,
                        wait_seconds,
                    )

        average_wait_seconds = 0.0
        if wait_samples:
            average_wait_seconds = total_wait_seconds / wait_samples

        return SumoSimulationMetrics(
            average_wait_seconds=round(average_wait_seconds, 1),
            total_delay_seconds=round(total_wait_seconds, 1),
            throughput=throughput,
            emergency_vehicle_clearance_seconds=round(
                emergency_clearance_seconds,
                1,
            ),
        )


class SumoTraciTrafficSimulationAdapter:
    def __init__(
        self,
        runner: SumoSimulationRunner,
        source: str = "sumo_traci",
    ) -> None:
        self.runner = runner
        self.source = source

    def compare_signal_plan(self, scenario_id: str) -> SimulationComparison:
        result = self.runner.compare_plans(scenario_id)
        baseline = _metrics_to_schema(result.baseline)
        recommended = _metrics_to_schema(result.recommended)
        return SimulationComparison(
            source=self.source,
            baseline=baseline,
            recommended=recommended,
            improvement=_build_improvement(baseline, recommended),
        )


def _metrics_to_schema(metrics: SumoSimulationMetrics) -> SimulationMetrics:
    return SimulationMetrics(
        average_wait_seconds=metrics.average_wait_seconds,
        total_delay_seconds=metrics.total_delay_seconds,
        throughput=metrics.throughput,
        emergency_vehicle_clearance_seconds=(
            metrics.emergency_vehicle_clearance_seconds
        ),
    )


def _build_improvement(
    baseline: SimulationMetrics,
    recommended: SimulationMetrics,
) -> dict[str, float]:
    total_delay_percent = 0.0
    if baseline.total_delay_seconds > 0:
        total_delay_percent = round(
            (
                (
                    baseline.total_delay_seconds
                    - recommended.total_delay_seconds
                )
                / baseline.total_delay_seconds
            )
            * 100,
            1,
        )

    return {
        "total_delay_percent": total_delay_percent,
        "average_wait_delta_seconds": (
            recommended.average_wait_seconds - baseline.average_wait_seconds
        ),
        "emergency_clearance_delta_seconds": (
            recommended.emergency_vehicle_clearance_seconds
            - baseline.emergency_vehicle_clearance_seconds
        ),
    }


def _load_traci_module() -> object:
    try:
        import traci
    except ImportError as exc:
        raise RuntimeError(
            "TraCI runtime is not installed. Install the API simulation extra "
            "and SUMO binary before enabling SUMO_SIMULATION_MODE=sumo_traci."
        ) from exc
    return traci


def _resolve_executable(binary_name: str) -> str:
    resolved = which(binary_name)
    if resolved is not None:
        return resolved
    python_bin_candidate = Path(sys.executable).parent / binary_name
    if python_bin_candidate.exists() and os.access(python_bin_candidate, os.X_OK):
        return str(python_bin_candidate)
    return binary_name


def _is_emergency_vehicle(vehicle_id: str) -> bool:
    normalized = vehicle_id.lower()
    return any(
        marker in normalized
        for marker in ("ambulance", "emergency", "fire", "police")
    )


def _seed_for(scenario_id: str, plan_name: str) -> int:
    digest = hashlib.sha256(f"{scenario_id}:{plan_name}".encode()).hexdigest()
    return (int(digest[:8], 16) % 2_147_483_647) or 1
