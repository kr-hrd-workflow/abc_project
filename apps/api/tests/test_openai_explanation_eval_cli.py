from app.cli.openai_explanation_eval import (
    OpenAIExplanationEvalError,
    main,
    run_openai_explanation_eval,
)
from app.core.config import Settings


class FakeResponses:
    def __init__(self, output_text: str) -> None:
        self.output_text = output_text
        self.calls: list[dict[str, object]] = []

    def create(self, **kwargs: object) -> object:
        self.calls.append(kwargs)
        output_text = self.output_text

        class FakeResponse:
            pass

        response = FakeResponse()
        response.output_text = output_text
        return response


class FakeOpenAIClient:
    def __init__(self, output_text: str) -> None:
        self.responses = FakeResponses(output_text)


def eval_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "openai_monthly_budget_usd": 10.0,
    }
    values.update(overrides)
    return Settings(**values)


def test_openai_explanation_eval_calls_responses_without_printing_secret() -> None:
    client = FakeOpenAIClient(
        "Emergency vehicle priority is supported by policy evidence. "
        "This is simulation-only and does not control real traffic signals."
    )

    report = run_openai_explanation_eval(
        settings=eval_settings(),
        env={"OPENAI_API_KEY": "sk-test-secret"},
        client_factory=lambda _api_key: client,
    )

    assert client.responses.calls[0]["model"] == "gpt-5.5"
    assert "sk-test-secret" not in report
    assert "passed=True" in report
    assert "criteria=3/3" in report
    assert "response_text_present=True" in report


def test_openai_explanation_eval_rejects_missing_api_key_before_client_creation() -> None:
    created_clients: list[str] = []

    def fake_client_factory(api_key: str) -> FakeOpenAIClient:
        created_clients.append(api_key)
        return FakeOpenAIClient("")

    try:
        run_openai_explanation_eval(
            settings=eval_settings(),
            env={},
            client_factory=fake_client_factory,
        )
    except OpenAIExplanationEvalError as exc:
        assert "OPENAI_API_KEY" in str(exc)
    else:
        raise AssertionError("expected missing API key to fail")

    assert created_clients == []


def test_openai_explanation_eval_main_returns_failure_without_ready_env(capsys) -> None:
    exit_code = main(
        [],
        settings=eval_settings(openai_monthly_budget_usd=None),
        env={},
    )

    captured = capsys.readouterr()

    assert exit_code == 1
    assert "OPENAI_API_KEY" in captured.err
    assert "OPENAI_MONTHLY_BUDGET_USD" in captured.err
