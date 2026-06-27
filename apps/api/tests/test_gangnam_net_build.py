from pathlib import Path

import pytest

sumolib = pytest.importorskip("sumolib")

NET = Path(__file__).resolve().parents[1] / "networks" / "intersection.net.xml"


def _net():
    return sumolib.net.readNet(str(NET))


def test_net_has_four_real_gangnam_approaches() -> None:
    edge_ids = {e.getID() for e in _net().getEdges()}
    for approach in ("north", "south", "east", "west"):
        assert f"{approach}_in" in edge_ids
        assert f"{approach}_out" in edge_ids


def test_inbound_lane_counts_match_real_layout() -> None:
    net = _net()
    assert net.getEdge("north_in").getLaneNumber() == 5
    assert net.getEdge("south_in").getLaneNumber() == 5
    assert net.getEdge("east_in").getLaneNumber() == 5
    assert net.getEdge("west_in").getLaneNumber() == 4


def test_lane_ids_carry_approach_word() -> None:
    lane_ids = [lane.getID() for lane in _net().getEdge("north_in").getLanes()]
    assert lane_ids[0] == "north_in_0"
    assert lane_ids[4] == "north_in_4"


def test_median_bus_lane_on_gangnamdaero_only() -> None:
    net = _net()
    for edge_id in ("north_in", "north_out", "south_in", "south_out"):
        bus_lane = net.getEdge(edge_id).getLane(4)  # innermost
        assert bus_lane.allows("bus")
        assert not bus_lane.allows("passenger")
    for edge_id in ("east_in", "west_in"):
        for lane in net.getEdge(edge_id).getLanes():
            assert lane.allows("passenger")


def test_traffic_light_exists() -> None:
    tls_ids = {tls.getID() for tls in _net().getTrafficLights()}
    assert "gangnam_center" in tls_ids
