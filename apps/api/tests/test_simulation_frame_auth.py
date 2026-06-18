from collections.abc import Generator, Sequence

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import Base
from app.db.session import get_session
from app.domain.schemas import TrafficEventRead, VisionObservation
from app.main import app
from app.services.simulation_snapshot import build_fixture_simulation_frame

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


def test_frame_route_is_read_only_and_does_not_call_public_step_controls(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    class ReadOnlyProvider:
        def build_frame(
            self,
            scenario_id: str,
            observation: VisionObservation,
            event_reads: Sequence[TrafficEventRead],
        ):
            calls.append(scenario_id)
            return build_fixture_simulation_frame(
                scenario_id,
                observation,
                event_reads,
            )

        def step(self) -> None:
            raise AssertionError("GET /api/simulation/frame must not call step()")

    monkeypatch.setattr(
        "app.api.routes.get_simulation_frame_provider",
        lambda _settings: ReadOnlyProvider(),
    )

    response = client.get("/api/simulation/frame?scenario_id=normal&step=99")

    assert response.status_code == 200
    assert calls == ["normal"]


def test_frame_route_does_not_request_database_session_for_read_only_snapshot(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, int]] = []

    class ReadOnlyProvider:
        def build_frame(
            self,
            scenario_id: str,
            observation: VisionObservation,
            event_reads: Sequence[TrafficEventRead],
        ):
            calls.append((scenario_id, len(event_reads)))
            return build_fixture_simulation_frame(
                scenario_id,
                observation,
                event_reads,
            )

    def fail_get_session():
        raise AssertionError("GET /api/simulation/frame must not request DB session")

    monkeypatch.setattr(
        "app.api.routes.get_simulation_frame_provider",
        lambda _settings: ReadOnlyProvider(),
    )
    app.dependency_overrides[get_session] = fail_get_session
    try:
        response = TestClient(app, raise_server_exceptions=False).get(
            "/api/simulation/frame?scenario_id=emergency"
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert calls == [("emergency", 2)]


def test_privileged_simulation_control_routes_are_not_public(client: TestClient) -> None:
    for control_path in [
        "/api/simulation/session/emergency/step",
        "/api/simulation/session/emergency/reset",
        "/api/simulation/session/emergency/signal-phase",
    ]:
        response = client.post(control_path)

        assert response.status_code == 404
