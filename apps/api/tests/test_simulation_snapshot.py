from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import Base
from app.db.session import get_session
from app.main import app

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_session() -> Generator[Session, None, None]:
        with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_emergency_simulation_frame_exposes_typed_fixture_snapshot(
    client: TestClient,
) -> None:
    response = client.get("/api/simulation/frame?scenario_id=emergency")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "simulation_snapshot_fixture"
    assert payload["intersection_id"] == "INT-0001"
    assert payload["scenario_id"] == "emergency"
    assert payload["sim_time_seconds"] == 0
    assert payload["captured_at"] == "2026-06-08T10:24:30+09:00"
    assert payload["bounds_meters"] == {
        "north": -160.0,
        "south": 140.0,
        "east": 160.0,
        "west": -160.0,
    }
    assert payload["queues"] == {"north": 32, "south": 11, "east": 18, "west": 8}
    assert set(payload) == {
        "source",
        "intersection_id",
        "scenario_id",
        "sim_time_seconds",
        "captured_at",
        "bounds_meters",
        "vehicles",
        "density_segments",
        "signals",
        "queues",
        "events",
    }

    emergency_vehicles = [
        vehicle for vehicle in payload["vehicles"] if vehicle["vehicle_type"] == "emergency"
    ]
    assert emergency_vehicles == [
        {
            "id": "emergency-east-1",
            "vehicle_type": "emergency",
            "lane_id": "east-inbound-1",
            "x_meters": 96.0,
            "y_meters": 0.0,
            "heading_degrees": 270.0,
            "speed_mps": 12.0,
            "waiting_seconds": 0.0,
            "emergency": True,
        }
    ]
    assert {
        (segment["approach"], segment["source"])
        for segment in payload["density_segments"]
    } == {
        ("north", "fixture_density_proxy"),
        ("south", "fixture_density_proxy"),
        ("east", "fixture_density_proxy"),
        ("west", "fixture_density_proxy"),
    }
    assert all(
        segment["end_meters_from_stop_line"] >= 120.0
        for segment in payload["density_segments"]
    )
    assert {
        (signal["direction"], signal["state"])
        for signal in payload["signals"]
    } == {
        ("north", "red"),
        ("south", "red"),
        ("east", "green"),
        ("west", "red"),
    }
    assert {
        (event["event_type"], event["direction"])
        for event in payload["events"]
    } == {
        ("emergency_vehicle_approach", "east"),
        ("queue_threshold_exceeded", "north"),
    }


def test_all_fixture_scenarios_have_deterministic_snapshot_markers(
    client: TestClient,
) -> None:
    snapshots = {}
    for scenario_id in ["emergency", "pedestrian", "normal", "blocked"]:
        first = client.get(f"/api/simulation/frame?scenario_id={scenario_id}")
        second = client.get(f"/api/simulation/frame?scenario_id={scenario_id}")

        assert first.status_code == 200
        assert second.status_code == 200
        assert first.json() == second.json()
        snapshots[scenario_id] = first.json()
        assert snapshots[scenario_id]["source"] == "simulation_snapshot_fixture"
        assert snapshots[scenario_id]["scenario_id"] == scenario_id
        assert len(snapshots[scenario_id]["signals"]) == 4

    pedestrian = snapshots["pedestrian"]
    assert "pedestrians" not in pedestrian
    assert {
        event["event_type"] for event in pedestrian["events"]
    } == {"pedestrian_waiting"}
    assert any(signal["state"] == "yellow" for signal in pedestrian["signals"])

    normal = snapshots["normal"]
    assert len(normal["vehicles"]) <= 3
    assert any(signal["state"] == "green" for signal in normal["signals"])

    blocked = snapshots["blocked"]
    assert all(signal["state"] == "red" for signal in blocked["signals"])
    assert {
        event["event_type"] for event in blocked["events"]
    } == {"intersection_blocked", "queue_threshold_exceeded"}
    assert all(
        segment["vehicle_count"] >= 26
        for segment in blocked["density_segments"]
    )


def test_simulate_signal_remains_aggregate_comparison_without_vehicle_trajectories(
    client: TestClient,
) -> None:
    response = client.post("/api/simulate-signal?scenario_id=emergency")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "sumo_traci_fixture"
    assert "baseline" in payload
    assert "recommended" in payload
    assert "vehicles" not in payload
    assert "density_segments" not in payload
    assert "signals" not in payload
