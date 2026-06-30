from app.services.simulation_frame_provider import (
    ScenarioRoutingFrameProvider,
    get_simulation_frame_provider,
)
from app.core.config import Settings


class _RecordingProvider:
    def __init__(self, label: str) -> None:
        self.label = label
        self.seen: list[str] = []

    def build_frame(self, scenario_id, observation, event_reads):
        self.seen.append(scenario_id)
        return self.label  # sentinel; routing must not inspect the frame


def test_routing_sends_only_allowlisted_scenarios_to_live() -> None:
    live = _RecordingProvider("live")
    fixture = _RecordingProvider("fixture")
    router = ScenarioRoutingFrameProvider(
        live_provider=live,
        fixture_provider=fixture,
        live_scenario_ids={"normal"},
    )
    assert router.build_frame("normal", object(), []) == "live"
    assert router.build_frame("emergency", object(), []) == "fixture"
    assert router.build_frame("pedestrian", object(), []) == "fixture"
    assert router.build_frame("blocked", object(), []) == "fixture"
    assert live.seen == ["normal"]
    assert fixture.seen == ["emergency", "pedestrian", "blocked"]


def test_get_provider_returns_router_in_live_mode_and_fixture_otherwise() -> None:
    router = get_simulation_frame_provider(Settings(sumo_simulation_mode="sumo_traci"))
    assert isinstance(router, ScenarioRoutingFrameProvider)
    plain = get_simulation_frame_provider(Settings(sumo_simulation_mode="fixture"))
    assert not isinstance(plain, ScenarioRoutingFrameProvider)
