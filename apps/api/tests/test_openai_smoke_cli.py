from app.cli.openai_smoke import (
    OpenAISmokeError,
    main,
    run_openai_smoke,
)
from app.core.config import Settings


class FakeResponses:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def create(self, **kwargs: object) -> object:
        self.calls.append(kwargs)

        class FakeResponse:
            output_text = "Simulation-only smoke response."

        return FakeResponse()


class FakeEmbeddings:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def create(self, **kwargs: object) -> object:
        self.calls.append(kwargs)

        class FakeEmbedding:
            embedding = [0.1] * 1536

        class FakeResponse:
            data = [FakeEmbedding()]

        return FakeResponse()


class FakeOpenAIClient:
    def __init__(self) -> None:
        self.responses = FakeResponses()
        self.embeddings = FakeEmbeddings()


def smoke_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "openai_monthly_budget_usd": 10.0,
        "openai_embedding_dimensions": 1536,
    }
    values.update(overrides)
    return Settings(**values)


def test_openai_smoke_rejects_missing_budget_before_client_creation() -> None:
    created_clients: list[str] = []

    def fake_client_factory(api_key: str) -> FakeOpenAIClient:
        created_clients.append(api_key)
        return FakeOpenAIClient()

    try:
        run_openai_smoke(
            settings=smoke_settings(openai_monthly_budget_usd=None),
            env={"OPENAI_API_KEY": "sk-test"},
            client_factory=fake_client_factory,
        )
    except OpenAISmokeError as exc:
        assert "OPENAI_MONTHLY_BUDGET_USD" in str(exc)
    else:
        raise AssertionError("expected missing budget to fail")

    assert created_clients == []


def test_openai_smoke_rejects_missing_api_key_before_client_creation() -> None:
    created_clients: list[str] = []

    def fake_client_factory(api_key: str) -> FakeOpenAIClient:
        created_clients.append(api_key)
        return FakeOpenAIClient()

    try:
        run_openai_smoke(
            settings=smoke_settings(),
            env={},
            client_factory=fake_client_factory,
        )
    except OpenAISmokeError as exc:
        assert "OPENAI_API_KEY" in str(exc)
    else:
        raise AssertionError("expected missing API key to fail")

    assert created_clients == []


def test_openai_smoke_calls_embeddings_and_responses_without_printing_secret() -> None:
    client = FakeOpenAIClient()

    report = run_openai_smoke(
        settings=smoke_settings(),
        env={"OPENAI_API_KEY": "sk-test-secret"},
        client_factory=lambda _api_key: client,
    )

    assert client.embeddings.calls == [
        {
            "model": "text-embedding-3-small",
            "input": "Emergency vehicle priority policy smoke test.",
            "dimensions": 1536,
        }
    ]
    assert client.responses.calls[0]["model"] == "gpt-5.5"
    assert "sk-test-secret" not in report
    assert "embedding_dimensions=1536" in report
    assert "response_text_present=True" in report


def test_openai_smoke_main_returns_failure_without_ready_env(
    capsys,
) -> None:
    exit_code = main(
        [],
        settings=smoke_settings(openai_monthly_budget_usd=None),
        env={},
    )

    captured = capsys.readouterr()

    assert exit_code == 1
    assert "OPENAI_MONTHLY_BUDGET_USD" in captured.err
    assert "OPENAI_API_KEY" in captured.err
