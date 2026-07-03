from app.services.knowledge import KnowledgeChunk
from app.services.openai_explanation_evaluation import (
    evaluate_openai_explanation_text,
    generate_and_evaluate_openai_explanation,
)


class FakeTextGateway:
    def __init__(self, answer: str) -> None:
        self.answer = answer
        self.calls: list[dict[str, object]] = []

    def generate_grounded_answer(
        self,
        *,
        question: str,
        scenario_summary: str,
        policy_evidence: list[KnowledgeChunk],
    ) -> str:
        self.calls.append(
            {
                "question": question,
                "scenario_summary": scenario_summary,
                "policy_evidence": policy_evidence,
            }
        )
        return self.answer


def emergency_policy_chunk() -> KnowledgeChunk:
    return KnowledgeChunk(
        document_id="emergency-priority-guide",
        chunk_id="emergency-priority-guide:1",
        title="Emergency Vehicle Priority Guideline",
        content=(
            "Emergency vehicle priority may be recommended when an emergency "
            "vehicle is detected. The recommendation must remain simulation-only "
            "until a human operator validates the context."
        ),
        title_keywords=frozenset({"emergency", "vehicle", "priority"}),
        keywords=frozenset({"emergency", "vehicle", "priority", "simulation", "operator"}),
    )


def test_evaluate_openai_explanation_text_accepts_grounded_safety_answer() -> None:
    report = evaluate_openai_explanation_text(
        answer_text=(
            "Recommend emergency vehicle priority based on the policy evidence. "
            "This is simulation-only decision support and does not control real "
            "traffic signals."
        ),
        policy_evidence=[emergency_policy_chunk()],
    )

    assert report.passed is True
    assert report.passed_criteria == 3
    assert report.failed_criteria == 0
    assert [criterion.name for criterion in report.criteria] == [
        "simulation_only_boundary",
        "no_real_signal_control",
        "policy_evidence_grounding",
    ]


def test_evaluate_openai_explanation_text_flags_missing_safety_boundary() -> None:
    report = evaluate_openai_explanation_text(
        answer_text="Switch the signal now because traffic looks heavy.",
        policy_evidence=[emergency_policy_chunk()],
    )

    assert report.passed is False
    assert report.failed_criteria == 3
    assert [criterion.name for criterion in report.criteria if not criterion.passed] == [
        "simulation_only_boundary",
        "no_real_signal_control",
        "policy_evidence_grounding",
    ]


def test_generate_and_evaluate_openai_explanation_calls_gateway_once() -> None:
    evidence = [emergency_policy_chunk()]
    gateway = FakeTextGateway(
        "Emergency vehicle priority is supported by the evidence. "
        "This remains simulation-only and does not control real traffic signals."
    )

    report = generate_and_evaluate_openai_explanation(
        gateway=gateway,
        question="What should the operator do?",
        scenario_summary="Emergency vehicle approaching from east.",
        policy_evidence=evidence,
    )

    assert report.passed is True
    assert report.answer_text == gateway.answer
    assert gateway.calls == [
        {
            "question": "What should the operator do?",
            "scenario_summary": "Emergency vehicle approaching from east.",
            "policy_evidence": evidence,
        }
    ]
