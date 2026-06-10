from app.adapters.simulation import (
    FixtureSumoSimulationRunner,
    SumoTraciTrafficSimulationAdapter,
)
from app.domain.enums import RecommendationAction
from app.scenarios.data import EMERGENCY_SCENARIO
from app.services.agent_service import build_agent_sections
from app.services.persistence import build_events
from app.services.recommendations import recommend_signal_action


def test_build_agent_sections_returns_required_plan_sections() -> None:
    events = build_events(EMERGENCY_SCENARIO)
    action, plan, evidence = recommend_signal_action(EMERGENCY_SCENARIO)
    simulation = SumoTraciTrafficSimulationAdapter(
        runner=FixtureSumoSimulationRunner(),
        source="sumo_traci_fixture",
    ).compare_signal_plan("emergency")

    sections = build_agent_sections(
        observation=EMERGENCY_SCENARIO,
        events=events,
        action=action,
        plan=plan,
        evidence=evidence,
        simulation=simulation,
    )

    assert "emergency" in sections.current_situation.lower()
    assert (
        RecommendationAction.EMERGENCY_PRIORITY.value
        in sections.recommended_action
    )
    assert sections.recommendation_rationale
    assert "No real traffic signal control" in sections.authority_limit
    assert "total delay" in sections.simulation_result


def test_build_agent_sections_describes_highest_queue() -> None:
    events = build_events(EMERGENCY_SCENARIO)
    action, plan, evidence = recommend_signal_action(EMERGENCY_SCENARIO)
    simulation = SumoTraciTrafficSimulationAdapter(
        runner=FixtureSumoSimulationRunner(),
        source="sumo_traci_fixture",
    ).compare_signal_plan("emergency")

    sections = build_agent_sections(
        observation=EMERGENCY_SCENARIO,
        events=events,
        action=action,
        plan=plan,
        evidence=evidence,
        simulation=simulation,
    )

    assert "east" in sections.current_situation.lower()
    assert "42" in sections.current_situation
