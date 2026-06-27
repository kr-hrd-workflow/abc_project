import xml.etree.ElementTree as ET
from pathlib import Path

NET_DIR = Path(__file__).resolve().parents[1] / "networks"
VALID_EDGES = {f"{a}_{d}" for a in ("north", "south", "east", "west") for d in ("in", "out")}


def _root() -> ET.Element:
    return ET.parse(NET_DIR / "intersection.rou.xml").getroot()


def test_routes_traverse_junction_with_new_edge_ids() -> None:
    routes = _root().findall("route")
    assert routes
    for r in routes:
        edges = r.get("edges").split()
        assert all(e in VALID_EDGES for e in edges), r.get("id")
        assert edges[0].endswith("_in") and edges[-1].endswith("_out"), r.get("id")


def test_vtypes_define_passenger_bus_emergency() -> None:
    vtypes = {v.get("id"): v.get("vClass") for v in _root().findall("vType")}
    assert vtypes["passenger"] == "passenger"
    assert vtypes["bus"] == "bus"
    assert vtypes["emergency"] == "emergency"


def test_no_legacy_grid_routes_remain() -> None:
    text = (NET_DIR / "intersection.rou.xml").read_text(encoding="utf-8")
    for legacy in ("clockwise", "counter_clockwise", "A0A1", "A1B1", "B0A0", "B1B0"):
        assert legacy not in text
