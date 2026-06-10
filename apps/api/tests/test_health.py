from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.db.session import get_session
from app.main import app


def test_health_returns_ok() -> None:
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_local_web_dev_port() -> None:
    client = TestClient(app)
    response = client.options(
        "/api/intersection/status",
        headers={
            "Origin": "http://127.0.0.1:3001",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3001"


def test_database_errors_return_service_unavailable() -> None:
    class BrokenSession:
        def scalar(self, *_args: object, **_kwargs: object) -> object:
            raise OperationalError("select 1", {}, Exception("db down"))

    def override_get_session():
        yield BrokenSession()

    app.dependency_overrides[get_session] = override_get_session
    try:
        client = TestClient(app)
        response = client.get("/api/intersection/status")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Database unavailable. Start PostgreSQL and run migrations."
    }
