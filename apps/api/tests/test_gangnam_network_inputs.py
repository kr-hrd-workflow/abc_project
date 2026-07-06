import json
import xml.etree.ElementTree as ET
from pathlib import Path

NET_DIR = Path(__file__).resolve().parents[1] / "networks"


def _truth() -> dict:
    return json.loads((NET_DIR / "intersection_truth.json").read_text(encoding="utf-8"))["approaches"]


def _edges() -> dict[str, ET.Element]:
    root = ET.parse(NET_DIR / "gangnam.edg.xml").getroot()
    return {e.get("id"): e for e in root.findall("edge")}


def test_sumo_config_uses_frontend_authoritative_tick_length() -> None:
    root = ET.parse(NET_DIR / "intersection.sumocfg").getroot()
    step_length = root.find("./time/step-length")

    assert step_length is not None
    assert float(step_length.get("value")) == 0.1


def test_nodes_follow_coordinate_contract() -> None:
    nodes = {n.get("id"): n for n in ET.parse(NET_DIR / "gangnam.nod.xml").getroot().findall("node")}
    assert (float(nodes["center"].get("x")), float(nodes["center"].get("y"))) == (0.0, 0.0)
    assert nodes["center"].get("type") == "traffic_light"
    assert nodes["center"].get("tl") == "gangnam_center"
    # north = -z scene = +y SUMO; south = -y; east = +x; west = -x
    assert float(nodes["north_end"].get("y")) > 0
    assert float(nodes["south_end"].get("y")) < 0
    assert float(nodes["east_end"].get("x")) > 0
    assert float(nodes["west_end"].get("x")) < 0


def test_edges_match_truth_lane_counts() -> None:
    truth, edges = _truth(), _edges()
    for approach, spec in truth.items():
        assert int(edges[f"{approach}_in"].get("numLanes")) == spec["inboundLanes"]
        assert int(edges[f"{approach}_out"].get("numLanes")) == spec["outboundLanes"]


def test_median_bus_lane_innermost_on_gangnamdaero_only() -> None:
    truth, edges = _truth(), _edges()
    for approach, spec in truth.items():
        for suffix in ("in", "out"):
            edge = edges[f"{approach}_{suffix}"]
            bus_lanes = [lane for lane in edge.findall("lane") if lane.get("allow") == "bus"]
            if spec["hasMedianBus"]:
                assert len(bus_lanes) == 1
                assert int(bus_lanes[0].get("index")) == spec["inboundLanes"] - 1
            else:
                assert bus_lanes == []
