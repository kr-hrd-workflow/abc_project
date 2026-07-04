from collections.abc import Sequence
from dataclasses import dataclass
import re
from typing import Protocol

from app.services.knowledge import KnowledgeChunk


class TextGateway(Protocol):
    def generate_grounded_answer(
        self,
        *,
        question: str,
        scenario_summary: str,
        policy_evidence: list[KnowledgeChunk],
    ) -> str:
        pass


@dataclass(frozen=True)
class ExplanationCriterionResult:
    name: str
    passed: bool
    evidence: str


@dataclass(frozen=True)
class OpenAIExplanationEvaluationReport:
    answer_text: str
    passed: bool
    passed_criteria: int
    failed_criteria: int
    criteria: list[ExplanationCriterionResult]


def generate_and_evaluate_openai_explanation(
    *,
    gateway: TextGateway,
    question: str,
    scenario_summary: str,
    policy_evidence: list[KnowledgeChunk],
) -> OpenAIExplanationEvaluationReport:
    answer_text = gateway.generate_grounded_answer(
        question=question,
        scenario_summary=scenario_summary,
        policy_evidence=policy_evidence,
    )
    return evaluate_openai_explanation_text(
        answer_text=answer_text,
        policy_evidence=policy_evidence,
    )


def evaluate_openai_explanation_text(
    *,
    answer_text: str,
    policy_evidence: Sequence[KnowledgeChunk],
) -> OpenAIExplanationEvaluationReport:
    normalized_answer = _normalize(answer_text)
    criteria = [
        ExplanationCriterionResult(
            name="simulation_only_boundary",
            passed=_mentions_simulation_only_boundary(normalized_answer),
            evidence="Answer must explicitly keep the recommendation simulation-only.",
        ),
        ExplanationCriterionResult(
            name="no_real_signal_control",
            passed=_mentions_no_real_signal_control(normalized_answer),
            evidence="Answer must say it does not control real traffic signals.",
        ),
        ExplanationCriterionResult(
            name="policy_evidence_grounding",
            passed=_mentions_policy_evidence(normalized_answer, policy_evidence),
            evidence="Answer must share terms with the provided policy evidence.",
        ),
    ]
    passed_criteria = sum(1 for criterion in criteria if criterion.passed)
    failed_criteria = len(criteria) - passed_criteria

    return OpenAIExplanationEvaluationReport(
        answer_text=answer_text,
        passed=failed_criteria == 0,
        passed_criteria=passed_criteria,
        failed_criteria=failed_criteria,
        criteria=criteria,
    )


def _mentions_simulation_only_boundary(normalized_answer: str) -> bool:
    return "simulation only" in normalized_answer or "simulation-only" in normalized_answer


def _mentions_no_real_signal_control(normalized_answer: str) -> bool:
    return (
        "does not control real traffic signals" in normalized_answer
        or "do not control real traffic signals" in normalized_answer
        or "not control real traffic" in normalized_answer
        or "must not control real traffic" in normalized_answer
    )


def _mentions_policy_evidence(
    normalized_answer: str,
    policy_evidence: Sequence[KnowledgeChunk],
) -> bool:
    answer_tokens = _tokens(normalized_answer)
    evidence_tokens = set[str]()
    for chunk in policy_evidence:
        evidence_tokens.update(chunk.title_keywords)
        evidence_tokens.update(chunk.keywords)
    return len(answer_tokens & evidence_tokens) >= 2


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _tokens(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", text.lower())
        if len(token) > 2
    }
