import xml.etree.ElementTree as ET
from pathlib import Path

NET_DIR = Path(__file__).resolve().parents[1] / "networks"


def _connections() -> list[ET.Element]:
    return ET.parse(NET_DIR / "gangnam.con.xml").getroot().findall("connection")


def test_through_link_indices_follow_tls_direction_order() -> None:
    # TLS_DIRECTION_ORDER = (north, east, south, west) -> through groups 0,1,2,3
    through = {
        ("north_in", "south_out"): 0,
        ("east_in", "west_out"): 1,
        ("south_in", "north_out"): 2,
        ("west_in", "east_out"): 3,
    }
    seen = set()
    for c in _connections():
        key = (c.get("from"), c.get("to"))
        if key in through:
            assert int(c.get("linkIndex")) == through[key], key
            seen.add(key)
    assert seen == set(through)


def test_left_turns_use_protected_indices_4_to_7() -> None:
    left = {
        ("north_in", "east_out"): 4,
        ("east_in", "south_out"): 5,
        ("south_in", "west_out"): 6,
        ("west_in", "north_out"): 7,
    }
    seen = set()
    for c in _connections():
        key = (c.get("from"), c.get("to"))
        if key in left:
            assert int(c.get("linkIndex")) == left[key], key
            seen.add(key)
    assert seen == set(left)


def test_no_general_traffic_enters_gangnamdaero_bus_outbound_lane() -> None:
    # only the bus-through (fromLane 4) may feed the innermost (index 4) outbound bus lane
    for c in _connections():
        if c.get("to") in ("north_out", "south_out") and c.get("toLane") == "4":
            assert c.get("fromLane") == "4", (c.get("from"), c.get("to"))


def test_every_inbound_lane_has_a_connection() -> None:
    counts = {"north_in": 5, "east_in": 5, "south_in": 5, "west_in": 4}
    by_edge: dict[str, set[str]] = {edge: set() for edge in counts}
    for c in _connections():
        if c.get("from") in by_edge:
            by_edge[c.get("from")].add(c.get("fromLane"))
    for edge, n in counts.items():
        assert by_edge[edge] == {str(i) for i in range(n)}, edge


def test_tls_is_eight_phase_protected_left() -> None:
    logic = ET.parse(NET_DIR / "gangnam.tll.xml").getroot().find("tlLogic")
    assert logic.get("id") == "gangnam_center"
    phases = logic.findall("phase")
    assert len(phases) == 8
    for p in phases:
        assert len(p.get("state")) == 8
    ns = phases[0].get("state")   # NS through green
    assert ns[0] == "G" and ns[2] == "G" and ns[1] == "r" and ns[3] == "r"
    ew = phases[4].get("state")   # EW through green
    assert ew[1] == "G" and ew[3] == "G" and ew[0] == "r" and ew[2] == "r"
