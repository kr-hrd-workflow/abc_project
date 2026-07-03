import pytest

from app.services.knowledge import KnowledgeChunk
from app.services.openai_clients import (
    MissingOpenAIAPIKeyError,
    MissingOpenAIMonthlyBudgetError,
    OpenAIEmbeddingGateway,
    OpenAITextGateway,
    require_openai_api_key,
    require_openai_monthly_budget,
)


class FakeResponses:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def create(self, **kwargs: object) -> object:
        self.calls.append(kwargs)

        class FakeResponse:
            output_text = "Recommended operator summary grounded in policy evidence."

        return FakeResponse()


class FakeEmbeddings:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def create(self, **kwargs: object) -> object:
        self.calls.append(kwargs)

        class FakeEmbedding:
            embedding = [0.1, 0.2, 0.3]

        class FakeResponse:
            data = [FakeEmbedding()]

        return FakeResponse()


class FakeOpenAIClient:
    def __init__(self) -> None:
        self.responses = FakeResponses()
        self.embeddings = FakeEmbeddings()


def test_openai_text_gateway_calls_responses_with_policy_evidence() -> None:
    client = FakeOpenAIClient()
    gateway = OpenAITextGateway(
        client=client,
        model="gpt-5.5",
    )
    evidence = [
        KnowledgeChunk(
            document_id="emergency-priority-guide",
            chunk_id="emergency-priority-guide:1",
            title="Emergency Vehicle Priority Guideline",
            content="Emergency priority remains simulation-only until validated.",
            title_keywords=frozenset({"emergency", "priority"}),
            keywords=frozenset({"emergency", "priority", "simulation"}),
        )
    ]

    result = gateway.generate_grounded_answer(
        question="Should we prioritize the emergency vehicle?",
        scenario_summary="Emergency vehicle is approaching from east.",
        policy_evidence=evidence,
    )

    assert result == "Recommended operator summary grounded in policy evidence."
    assert client.responses.calls == [
        {
            "model": "gpt-5.5",
            "instructions": (
                "You draft concise traffic-operator decision support. "
                "Use only the provided scenario and policy evidence. "
                "If evidence is insufficient, say what is missing. "
                "Answer in the same language as the operator question. "
                "Use Korean when the question is Korean. "
                "Always state that recommendations are simulation-only and "
                "do not control real traffic signals."
            ),
            "input": (
                "Question: Should we prioritize the emergency vehicle?\n"
                "Scenario: Emergency vehicle is approaching from east.\n"
                "Policy evidence:\n"
                "- Emergency Vehicle Priority Guideline: Emergency priority "
                "remains simulation-only until validated."
            ),
        }
    ]


def test_openai_embedding_gateway_requests_configured_dimensions() -> None:
    client = FakeOpenAIClient()
    gateway = OpenAIEmbeddingGateway(
        client=client,
        model="text-embedding-3-small",
        dimensions=1536,
    )

    embedding = gateway.embed_text("Emergency vehicle priority guideline")

    assert embedding == [0.1, 0.2, 0.3]
    assert client.embeddings.calls == [
        {
            "model": "text-embedding-3-small",
            "input": "Emergency vehicle priority guideline",
            "dimensions": 1536,
        }
    ]


def test_require_openai_api_key_rejects_missing_or_blank_values() -> None:
    with pytest.raises(MissingOpenAIAPIKeyError):
        require_openai_api_key({})

    with pytest.raises(MissingOpenAIAPIKeyError):
        require_openai_api_key({"OPENAI_API_KEY": "   "})

    assert require_openai_api_key({"OPENAI_API_KEY": "sk-test"}) == "sk-test"


def test_require_openai_monthly_budget_rejects_missing_value() -> None:
    with pytest.raises(MissingOpenAIMonthlyBudgetError):
        require_openai_monthly_budget(None)


def test_require_openai_monthly_budget_returns_configured_value() -> None:
    assert require_openai_monthly_budget(10.0) == 10.0
