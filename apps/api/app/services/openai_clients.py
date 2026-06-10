from collections.abc import Mapping, Sequence
from dataclasses import dataclass
import os
from typing import Protocol, cast

from app.services.knowledge import KnowledgeChunk


OPENAI_OPERATOR_INSTRUCTIONS = (
    "You draft concise traffic-operator decision support. "
    "Use only the provided scenario and policy evidence. "
    "If evidence is insufficient, say what is missing. "
    "Always state that recommendations are simulation-only and "
    "do not control real traffic signals."
)


class MissingOpenAIAPIKeyError(RuntimeError):
    pass


class MissingOpenAIMonthlyBudgetError(RuntimeError):
    pass


class ResponsesResource(Protocol):
    def create(self, **kwargs: object) -> object:
        pass


class EmbeddingsResource(Protocol):
    def create(self, **kwargs: object) -> object:
        pass


class OpenAIClientProtocol(Protocol):
    responses: ResponsesResource
    embeddings: EmbeddingsResource


@dataclass(frozen=True)
class OpenAITextGateway:
    client: OpenAIClientProtocol
    model: str

    def generate_grounded_answer(
        self,
        *,
        question: str,
        scenario_summary: str,
        policy_evidence: Sequence[KnowledgeChunk],
    ) -> str:
        response = self.client.responses.create(
            model=self.model,
            instructions=OPENAI_OPERATOR_INSTRUCTIONS,
            input=_grounded_answer_input(
                question,
                scenario_summary,
                policy_evidence,
            ),
        )
        return str(getattr(response, "output_text", ""))


@dataclass(frozen=True)
class OpenAIEmbeddingGateway:
    client: OpenAIClientProtocol
    model: str
    dimensions: int

    def embed_text(self, text: str) -> list[float]:
        response = self.client.embeddings.create(
            model=self.model,
            input=text,
            dimensions=self.dimensions,
        )
        first_embedding = cast(object, getattr(response, "data")[0])
        return [float(value) for value in getattr(first_embedding, "embedding")]


def require_openai_api_key(env: Mapping[str, str] | None = None) -> str:
    env = os.environ if env is None else env
    api_key = env.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise MissingOpenAIAPIKeyError("OPENAI_API_KEY is required for live OpenAI calls")
    return api_key


def require_openai_monthly_budget(monthly_budget_usd: float | None) -> float:
    if monthly_budget_usd is None:
        raise MissingOpenAIMonthlyBudgetError(
            "OPENAI_MONTHLY_BUDGET_USD is required for live OpenAI calls"
        )
    return monthly_budget_usd


def build_openai_client(api_key: str) -> OpenAIClientProtocol:
    from openai import OpenAI

    return cast(OpenAIClientProtocol, OpenAI(api_key=api_key))


def _grounded_answer_input(
    question: str,
    scenario_summary: str,
    policy_evidence: Sequence[KnowledgeChunk],
) -> str:
    evidence_lines = [
        f"- {chunk.title}: {chunk.content}"
        for chunk in policy_evidence
    ]
    if not evidence_lines:
        evidence_lines = ["- No policy evidence was provided."]
    return "\n".join(
        [
            f"Question: {question}",
            f"Scenario: {scenario_summary}",
            "Policy evidence:",
            *evidence_lines,
        ]
    )
