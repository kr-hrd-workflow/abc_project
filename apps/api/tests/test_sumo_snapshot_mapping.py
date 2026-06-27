from app.services.sumo_runtime import build_sumo_simulation_frame


class FakeSimulation:
    def getTime(self) -> float:
        return 12.5


class FakeVehicleApi:
    def getIDList(self) -> list[str]:
        return ["veh-1", "ambulance-east-9"]

    def getPosition(self, vehicle_id: str) -> tuple[float, float]:
        return {
            "veh-1": (10.25, -3.5),
            "ambulance-east-9": (42.0, 1.25),
        }[vehicle_id]

    def getAngle(self, vehicle_id: str) -> float:
        return {"veh-1": 91.0, "ambulance-east-9": 270.0}[vehicle_id]

    def getSpeed(self, vehicle_id: str) -> float:
        return {"veh-1": 8.75, "ambulance-east-9": 14.2}[vehicle_id]

    def getWaitingTime(self, vehicle_id: str) -> float:
        return {"veh-1": 0.0, "ambulance-east-9": 3.0}[vehicle_id]

    def getLaneID(self, vehicle_id: str) -> str:
        return {"veh-1": "north-inbound-1", "ambulance-east-9": "east-inbound-1"}[
            vehicle_id
        ]

    def getTypeID(self, vehicle_id: str) -> str:
        return {"veh-1": "passenger", "ambulance-east-9": "ambulance"}[vehicle_id]


class FakeTrafficLightApi:
    def getIDList(self) -> list[str]:
        return ["tls-main"]

    def getRedYellowGreenState(self, _signal_id: str) -> str:
        # 19-char built-net state (one char per connection). Through-movement link indices:
        # north=1 (G), east=6 (r), south=11 (y), west=16 (r); all other links 'r' here.
        return "rGrrrrrrrrryrrrrrrr"


class FakeLaneApi:
    def getIDList(self) -> list[str]:
        return ["north-inbound-1", "east-inbound-1"]

    def getLastStepVehicleNumber(self, lane_id: str) -> int:
        return {"north-inbound-1": 4, "east-inbound-1": 28}[lane_id]

    def getLastStepMeanSpeed(self, lane_id: str) -> float:
        return {"north-inbound-1": 7.5, "east-inbound-1": 0.4}[lane_id]

    def getLastStepHaltingNumber(self, lane_id: str) -> int:
        return {"north-inbound-1": 1, "east-inbound-1": 26}[lane_id]


class FakePersonApi:
    def getIDList(self) -> list[str]:
        return ["person-1", "person-waiting"]

    def getPosition(self, person_id: str) -> tuple[float, float]:
        return {
            "person-1": (2.5, -12.0),
            "person-waiting": (-4.0, 8.25),
        }[person_id]

    def getAngle(self, person_id: str) -> float:
        return {"person-1": 180.0, "person-waiting": 90.0}[person_id]

    def getSpeed(self, person_id: str) -> float:
        return {"person-1": 1.35, "person-waiting": 0.0}[person_id]

    def getRoadID(self, person_id: str) -> str:
        return {"person-1": "crosswalk-east", "person-waiting": "north-sidewalk"}[
            person_id
        ]

    def getWaitingTime(self, person_id: str) -> float:
        return {"person-1": 0.0, "person-waiting": 12.5}[person_id]


class FakeSumoClient:
    simulation = FakeSimulation()
    vehicle = FakeVehicleApi()
    trafficlight = FakeTrafficLightApi()
    lane = FakeLaneApi()


def test_fake_sumo_client_maps_to_simulation_frame_snapshot_fields() -> None:
    frame = build_sumo_simulation_frame(
        scenario_id="emergency",
        mode="sumo_traci",
        client=FakeSumoClient(),
        step_index=7,
    )

    assert frame.source == "sumo_traci"
    assert frame.scenario_id == "emergency"
    assert frame.sim_time_seconds == 12.5
    assert frame.bounds_meters == {
        "north": -160.0,
        "south": 140.0,
        "east": 160.0,
        "west": -160.0,
    }
    assert frame.vehicles[0].model_dump() == {
        "id": "veh-1",
        "vehicle_type": "car",
        "lane_id": "north-inbound-1",
        "x_meters": 10.25,
        "y_meters": 3.5,
        "heading_degrees": 91.0,
        "speed_mps": 8.75,
        "waiting_seconds": 0.0,
        "emergency": False,
    }
    assert frame.vehicles[1].vehicle_type == "emergency"
    assert frame.vehicles[1].emergency is True
    assert {
        (signal.direction, signal.state)
        for signal in frame.signals
    } == {
        ("north", "green"),
        ("east", "red"),
        ("south", "yellow"),
        ("west", "red"),
    }
    assert {
        (segment.segment_id, segment.source, segment.vehicle_count)
        for segment in frame.density_segments
    } == {
        ("north-inbound-1-density", "aggregate_density_proxy", 4),
        ("east-inbound-1-density", "aggregate_density_proxy", 28),
    }
    assert frame.queues.north == 1
    assert frame.queues.east == 26
    assert {(event.event_type, event.direction) for event in frame.events} == {
        ("emergency_vehicle_approach", "east"),
        ("queue_threshold_exceeded", "east"),
    }
    assert any("spillback" in event.ai_summary.lower() for event in frame.events)


def test_fake_sumo_client_maps_person_api_to_pedestrian_snapshots() -> None:
    class PersonClient(FakeSumoClient):
        person = FakePersonApi()

    frame = build_sumo_simulation_frame(
        scenario_id="normal",
        mode="sumo_traci",
        client=PersonClient(),
        step_index=8,
    )

    assert [pedestrian.model_dump() for pedestrian in frame.pedestrians] == [
        {
            "id": "person-1",
            "x_meters": 2.5,
            "y_meters": 12.0,
            "heading_degrees": 180.0,
            "speed_mps": 1.35,
            "lane_id": None,
            "edge_id": "crosswalk-east",
            "waiting_seconds": 0.0,
            "source": "sumo_person",
        },
        {
            "id": "person-waiting",
            "x_meters": -4.0,
            "y_meters": -8.25,
            "heading_degrees": 90.0,
            "speed_mps": 0.0,
            "lane_id": None,
            "edge_id": "north-sidewalk",
            "waiting_seconds": 12.5,
            "source": "sumo_person",
        },
    ]


def test_sumo_person_mapping_defaults_waiting_seconds_when_unavailable() -> None:
    class PersonApiWithoutWaiting:
        def getIDList(self) -> list[str]:
            return ["person-1"]

        def getPosition(self, _person_id: str) -> tuple[float, float]:
            return (2.5, -12.0)

        def getAngle(self, _person_id: str) -> float:
            return 180.0

        def getSpeed(self, _person_id: str) -> float:
            return 1.35

        def getLaneID(self, _person_id: str) -> str:
            return "north-crosswalk-lane"

        def getRoadID(self, _person_id: str) -> str:
            return ""

    class PersonClient(FakeSumoClient):
        person = PersonApiWithoutWaiting()

    frame = build_sumo_simulation_frame(
        scenario_id="normal",
        mode="sumo_libsumo",
        client=PersonClient(),
        step_index=8,
    )

    assert frame.pedestrians[0].waiting_seconds == 0.0
    assert frame.pedestrians[0].lane_id == "north-crosswalk-lane"
    assert frame.pedestrians[0].edge_id is None


def test_sumo_person_mapping_skips_invalid_positions_without_dropping_vehicles() -> None:
    class InvalidPositionPersonApi(FakePersonApi):
        def getIDList(self) -> list[str]:
            return ["person-1", "sentinel-person", "nan-person"]

        def getPosition(self, person_id: str) -> tuple[float, float]:
            if person_id == "sentinel-person":
                return (-1073741824.0, -1073741824.0)
            if person_id == "nan-person":
                return (float("nan"), 0.0)
            return super().getPosition(person_id)

    class PersonClient(FakeSumoClient):
        person = InvalidPositionPersonApi()

    frame = build_sumo_simulation_frame(
        scenario_id="normal",
        mode="sumo_traci",
        client=PersonClient(),
        step_index=8,
    )

    assert [pedestrian.id for pedestrian in frame.pedestrians] == ["person-1"]
    assert [vehicle.id for vehicle in frame.vehicles] == ["veh-1", "ambulance-east-9"]


def test_sumo_person_mapping_returns_empty_when_person_api_unavailable() -> None:
    class FailingPersonApi:
        def getIDList(self) -> list[str]:
            raise RuntimeError("TraCI person API unavailable")

    class PersonClient(FakeSumoClient):
        person = FailingPersonApi()

    frame = build_sumo_simulation_frame(
        scenario_id="normal",
        mode="sumo_traci",
        client=PersonClient(),
        step_index=8,
    )

    assert frame.pedestrians == []
    assert [vehicle.id for vehicle in frame.vehicles] == ["veh-1", "ambulance-east-9"]


def test_sumo_mapping_keeps_density_aggregate_when_no_precise_vehicles_exist() -> None:
    class NoVehicleApi(FakeVehicleApi):
        def getIDList(self) -> list[str]:
            return []

    class AggregateOnlyClient(FakeSumoClient):
        vehicle = NoVehicleApi()

    frame = build_sumo_simulation_frame(
        scenario_id="blocked",
        mode="sumo_libsumo",
        client=AggregateOnlyClient(),
        step_index=1,
    )

    assert frame.vehicles == []
    assert frame.density_segments
    assert all(
        segment.source == "aggregate_density_proxy"
        for segment in frame.density_segments
    )


def test_queue_derivation_prefers_near_stopped_vehicles_at_stop_line() -> None:
    class StopLineVehicleApi(FakeVehicleApi):
        def getIDList(self) -> list[str]:
            return ["near-stopped", "far-stopped", "near-moving"]

        def getPosition(self, vehicle_id: str) -> tuple[float, float]:
            return {
                "near-stopped": (3.0, 0.0),
                "far-stopped": (70.0, 0.0),
                "near-moving": (4.0, 0.0),
            }[vehicle_id]

        def getAngle(self, _vehicle_id: str) -> float:
            return 270.0

        def getSpeed(self, vehicle_id: str) -> float:
            return {
                "near-stopped": 0.2,
                "far-stopped": 0.1,
                "near-moving": 3.0,
            }[vehicle_id]

        def getWaitingTime(self, _vehicle_id: str) -> float:
            return 0.0

        def getLaneID(self, _vehicle_id: str) -> str:
            return "east-inbound-1"

        def getTypeID(self, _vehicle_id: str) -> str:
            return "passenger"

        def getLanePosition(self, vehicle_id: str) -> float:
            return {
                "near-stopped": 96.0,
                "far-stopped": 40.0,
                "near-moving": 97.0,
            }[vehicle_id]

    class StopLineLaneApi(FakeLaneApi):
        def getIDList(self) -> list[str]:
            return ["east-inbound-1"]

        def getLength(self, _lane_id: str) -> float:
            return 100.0

        def getLastStepHaltingNumber(self, _lane_id: str) -> int:
            raise AssertionError("precise stop-line vehicle data should be used")

    class StopLineClient(FakeSumoClient):
        vehicle = StopLineVehicleApi()
        lane = StopLineLaneApi()

    frame = build_sumo_simulation_frame(
        scenario_id="normal",
        mode="sumo_traci",
        client=StopLineClient(),
        step_index=3,
    )

    assert frame.queues.east == 1
    assert frame.queues.north == 0


def test_events_cover_blocked_lane_and_high_wait_derivations() -> None:
    class HighWaitVehicleApi(FakeVehicleApi):
        def getIDList(self) -> list[str]:
            return ["high-wait-west"]

        def getPosition(self, _vehicle_id: str) -> tuple[float, float]:
            return (-4.0, 0.0)

        def getAngle(self, _vehicle_id: str) -> float:
            return 90.0

        def getSpeed(self, _vehicle_id: str) -> float:
            return 0.1

        def getWaitingTime(self, _vehicle_id: str) -> float:
            return 75.0

        def getLaneID(self, _vehicle_id: str) -> str:
            return "west-inbound-1"

        def getTypeID(self, _vehicle_id: str) -> str:
            return "passenger"

    class BlockedLaneApi(FakeLaneApi):
        def getIDList(self) -> list[str]:
            return ["west-inbound-1"]

        def getLastStepVehicleNumber(self, _lane_id: str) -> int:
            return 6

        def getLastStepMeanSpeed(self, _lane_id: str) -> float:
            return 0.1

        def getLastStepHaltingNumber(self, _lane_id: str) -> int:
            return 6

    class IncidentClient(FakeSumoClient):
        vehicle = HighWaitVehicleApi()
        lane = BlockedLaneApi()

    frame = build_sumo_simulation_frame(
        scenario_id="blocked",
        mode="sumo_libsumo",
        client=IncidentClient(),
        step_index=4,
    )

    assert {
        (event.event_type, event.direction)
        for event in frame.events
    } == {
        ("intersection_blocked", "west"),
        ("queue_threshold_exceeded", "west"),
    }
    assert any("blocked lane" in event.ai_summary.lower() for event in frame.events)
    assert any("high wait" in event.ai_summary.lower() for event in frame.events)


import pytest

from app.services.sumo_runtime import _approach_from_lane_id


@pytest.mark.parametrize(
    ("lane_id", "expected"),
    [
        ("north_in_0", "north"), ("north_in_4", "north"), ("north_out_0", "north"),
        ("south_in_0", "south"), ("south_out_4", "south"),
        ("east_in_0", "east"), ("east_in_4", "east"), ("east_out_2", "east"),
        ("west_in_0", "west"), ("west_in_3", "west"), ("west_out_3", "west"),
    ],
)
def test_approach_from_lane_id_maps_new_inbound_and_outbound_scheme(
    lane_id: str, expected: str
) -> None:
    assert _approach_from_lane_id(lane_id) == expected


@pytest.mark.parametrize(
    "lane_id",
    ["A0A1_0", "A1B1_0", "B0B1_0", ":J0_0", "clockwise_0"],
)
def test_approach_from_lane_id_rejects_retired_grid_lane_ids(lane_id: str) -> None:
    assert _approach_from_lane_id(lane_id) is None


from app.services.sumo_runtime import (
    TLS_APPROACH_LINK_INDEX,
    TLS_DIRECTION_ORDER,
)


def test_map_signals_reads_per_approach_through_link_index() -> None:
    colors = {"north": "G", "east": "y", "south": "r", "west": "G"}
    length = max(TLS_APPROACH_LINK_INDEX.values()) + 1
    chars = ["r"] * length
    for approach, index in TLS_APPROACH_LINK_INDEX.items():
        chars[index] = colors[approach]

    class OneProgramTrafficLightApi:
        def getIDList(self) -> list[str]:
            return ["gangnam-center"]

        def getRedYellowGreenState(self, _signal_id: str) -> str:
            return "".join(chars)

    class OneProgramClient(FakeSumoClient):
        trafficlight = OneProgramTrafficLightApi()

    frame = build_sumo_simulation_frame(
        scenario_id="normal", mode="sumo_traci",
        client=OneProgramClient(), step_index=1,
    )

    assert [signal.direction for signal in frame.signals] == list(TLS_DIRECTION_ORDER)
    assert {(s.direction, s.state) for s in frame.signals} == {
        ("north", "green"), ("east", "yellow"), ("south", "red"), ("west", "green"),
    }
