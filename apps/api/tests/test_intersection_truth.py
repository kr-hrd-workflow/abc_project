import json
from pathlib import Path

TRUTH = Path(__file__).resolve().parents[1] / "networks" / "intersection_truth.json"


def _data() -> dict:
    return json.loads(TRUTH.read_text(encoding="utf-8"))


def test_intersection_truth_mirrors_real_gangnam_layout() -> None:
    data = _data()
    assert data["laneWidthM"] == 3.6
    a = data["approaches"]
    assert (a["north"]["inboundLanes"], a["north"]["outboundLanes"]) == (5, 5)
    assert (a["south"]["inboundLanes"], a["south"]["outboundLanes"]) == (5, 5)
    assert (a["east"]["inboundLanes"], a["east"]["outboundLanes"]) == (5, 5)
    assert (a["west"]["inboundLanes"], a["west"]["outboundLanes"]) == (4, 4)


def test_median_bus_only_on_gangnamdaero() -> None:
    a = _data()["approaches"]
    assert a["north"]["hasMedianBus"] is True
    assert a["south"]["hasMedianBus"] is True
    assert a["east"]["hasMedianBus"] is False
    assert a["west"]["hasMedianBus"] is False


def test_crosswalk_on_all_four_approaches() -> None:
    # SP3: N/S crosswalks on 강남대로 restored (pedestrian-responsive signals).
    a = _data()["approaches"]
    assert a["north"]["hasCrosswalk"] is True
    assert a["south"]["hasCrosswalk"] is True
    assert a["east"]["hasCrosswalk"] is True
    assert a["west"]["hasCrosswalk"] is True


def test_roads_and_corridor_lengths_match_ts_truth() -> None:
    a = _data()["approaches"]
    assert a["north"]["road"] == "강남대로"
    assert a["south"]["road"] == "강남대로"
    assert a["east"]["road"] == "테헤란로"
    assert a["west"]["road"] == "서초대로"
    assert a["north"]["corridorLengthM"] == 140
    assert a["south"]["corridorLengthM"] == 120
    assert a["east"]["corridorLengthM"] == 140
    assert a["west"]["corridorLengthM"] == 140
