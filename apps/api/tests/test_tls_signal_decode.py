"""End-to-end TLS signal-decode integration test (Task X2).

Validates that TLS_APPROACH_LINK_INDEX in the C3 bridge mapping correctly
decodes the ACTUAL built gangnam_center TLS phases from the compiled
intersection.net.xml.  Phases are DERIVED from the built net — not
hard-coded — so a netconvert link-order change that shifts through-movement
link indices will cause this test to fail, catching regressions that the
self-referential unit test in test_sumo_snapshot_mapping.py cannot.
"""
import pathlib
import xml.etree.ElementTree as ET

import pytest

sumolib = pytest.importorskip("sumolib")

from app.services.sumo_runtime import (
    TLS_APPROACH_LINK_INDEX,
    build_sumo_simulation_frame,
)

_NETWORKS_DIR = pathlib.Path(__file__).parent.parent / "networks"
_TLS_ID = "gangnam_center"
_N = TLS_APPROACH_LINK_INDEX["north"]   # 1
_E = TLS_APPROACH_LINK_INDEX["east"]    # 6
_S = TLS_APPROACH_LINK_INDEX["south"]   # 11
_W = TLS_APPROACH_LINK_INDEX["west"]    # 16
_MIN_LEN = max(_N, _E, _S, _W) + 1     # 17


# ---------------------------------------------------------------------------
# Phase derivation: read from built net via sumolib; fall back to tll.xml.
# ---------------------------------------------------------------------------

def _phases_from_built_net() -> list[str]:
    """Return phase state strings derived from the compiled intersection.net.xml.

    Falls back to gangnam_build.tll.xml (the authoritative TLS source) when
    sumolib cannot parse the built net's TLS program.  Either way the states
    come from a file on disk, never from a hard-coded guess.
    """
    net_path = _NETWORKS_DIR / "intersection.net.xml"
    try:
        net = sumolib.net.readNet(str(net_path), withPrograms=True)
        for tls in net.getTrafficLights():
            if tls.getID() == _TLS_ID:
                for prog in tls.getPrograms().values():
                    phases = [ph.state for ph in prog.getPhases()]
                    if phases:
                        return phases
    except Exception:
        pass  # fall through to tll.xml

    # Acceptable fallback: gangnam_build.tll.xml IS the build TLS definition.
    tll_path = _NETWORKS_DIR / "gangnam_build.tll.xml"
    tree = ET.parse(str(tll_path))
    return [ph.get("state", "") for ph in tree.findall(".//phase")]


def _pick_phase(phases: list[str], *, ns: bool) -> str:
    """Identify the NS-through or EW-through phase by link-index state characters.

    Uses TLS_APPROACH_LINK_INDEX to locate the through-movement character for
    each approach.  This means the selection is automatically correct even if
    phase ORDER changes, as long as the link indices (the thing C3 bridges on)
    are stable.
    """
    label = "NS" if ns else "EW"
    for state in phases:
        if len(state) < _MIN_LEN:
            continue
        n_g = state[_N].upper() == "G"
        e_g = state[_E].upper() == "G"
        s_g = state[_S].upper() == "G"
        w_g = state[_W].upper() == "G"
        if ns and n_g and s_g and not e_g and not w_g:
            return state
        if not ns and e_g and w_g and not n_g and not s_g:
            return state
    raise AssertionError(
        f"No {label}-through phase found in built net.  "
        f"Phases: {phases}  "
        f"Indices used: north={_N}, east={_E}, south={_S}, west={_W}"
    )


# ---------------------------------------------------------------------------
# Minimal fake SUMO client (FakeSumoClient pattern from
# test_sumo_snapshot_mapping.py).  Only trafficlight methods are exercised;
# vehicles and lanes are empty so signal decode runs in isolation.
# ---------------------------------------------------------------------------

class _FakeSimulation:
    def getTime(self) -> float:
        return 0.0


class _FakeVehicleApi:
    def getIDList(self) -> list[str]:
        return []


class _FakeLaneApi:
    def getIDList(self) -> list[str]:
        return []


class _FakeTrafficLightApi:
    def __init__(self, state: str) -> None:
        self._state = state

    def getIDList(self) -> list[str]:
        return [_TLS_ID]

    def getRedYellowGreenState(self, _tls_id: str) -> str:
        return self._state


class _FakeSumoClient:
    simulation = _FakeSimulation()
    vehicle = _FakeVehicleApi()
    lane = _FakeLaneApi()

    def __init__(self, tls_state: str) -> None:
        self.trafficlight = _FakeTrafficLightApi(tls_state)


# ---------------------------------------------------------------------------
# Derive phase states at collection time so any XML/sumolib parse error
# surfaces as a collection failure (not a silent pass).
# ---------------------------------------------------------------------------

_ALL_PHASES: list[str] = _phases_from_built_net()
_NS_STATE: str = _pick_phase(_ALL_PHASES, ns=True)
_EW_STATE: str = _pick_phase(_ALL_PHASES, ns=False)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_built_net_ns_through_phase_decodes_north_south_green() -> None:
    """NS-through phase from built net → north=green, south=green, east=red, west=red."""
    frame = build_sumo_simulation_frame(
        scenario_id="tls_decode_ns",
        mode="sumo_traci",
        client=_FakeSumoClient(_NS_STATE),
        step_index=0,
    )
    signals = {s.direction: s.state for s in frame.signals}
    assert signals == {
        "north": "green",
        "east": "red",
        "south": "green",
        "west": "red",
    }, (
        f"NS-through decode mismatch.  "
        f"state={_NS_STATE!r}  decoded={signals}  "
        f"indices: north={_N}, east={_E}, south={_S}, west={_W}"
    )


def test_built_net_ew_through_phase_decodes_east_west_green() -> None:
    """EW-through phase from built net → east=green, west=green, north=red, south=red."""
    frame = build_sumo_simulation_frame(
        scenario_id="tls_decode_ew",
        mode="sumo_traci",
        client=_FakeSumoClient(_EW_STATE),
        step_index=0,
    )
    signals = {s.direction: s.state for s in frame.signals}
    assert signals == {
        "north": "red",
        "east": "green",
        "south": "red",
        "west": "green",
    }, (
        f"EW-through decode mismatch.  "
        f"state={_EW_STATE!r}  decoded={signals}  "
        f"indices: north={_N}, east={_E}, south={_S}, west={_W}"
    )
