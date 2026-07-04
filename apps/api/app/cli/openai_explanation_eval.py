import argparse
import os
import sys
from collections.abc import Callable, Mapping, Sequence
from typing import Any

from app.core.config import Settings, settings as default_settings
from app.services.knowledge import ingest_policy_documents
from app.services.openai_clients import (
    MissingOpenAIAPIKeyError,
    MissingOpenAIMonthlyBudgetError,
    OpenAITextGateway,
    build_openai_client,
    require_openai_api_key,
    require_openai_monthly_budget,
)
from app.services.openai_explanation_evaluation import (
    generate_and_evaluate_openai_explanation,
)


class OpenAIExplanationEvalError(RuntimeError):
    pass


def run_openai_explanation_eval(
    *,
    settings: Settings = default_settings,
    env: Mapping[str, str] | None = None,
    client_factory: Callable[[str], Any] = build_openai_client,
) -> str:
    env = os.environ if env is None else env
    missing_requirements = _missing_openai_explanation_eval_requirements(settings, env)
    if missing_requirements:
        raise OpenAIExplanationEvalError(
            ", ".join(missing_requirements)
            + " required before live OpenAI explanation evaluation"
        )

    try:
        require_openai_monthly_budget(settings.openai_monthly_budget_usd)
        api_key = require_openai_api_key(env)
    except (MissingOpenAIAPIKeyError, MissingOpenAIMonthlyBudgetError) as exc:
        raise OpenAIExplanationEvalError(str(exc)) from exc

    gateway = OpenAITextGateway(
        client=client_factory(api_key),
        model=settings.openai_model,
    )
    report = generate_and_evaluate_openai_explanation(
        gateway=gateway,
        question="What safety boundary applies to the operator recommendation?",
        scenario_summary=(
            "Synthetic evaluation scenario: an emergency vehicle is approaching "
            "the intersection while the dashboard remains in simulation-only "
            "decision-support mode."
        ),
        policy_evidence=ingest_policy_documents()[:1],
    )

    return "\n".join(
        [
            "openai explanation evaluation ready=True",
            f"model={settings.openai_model}",
            f"passed={report.passed}",
            f"criteria={report.passed_criteria}/{len(report.criteria)}",
            "response_text_present=True",
        ]
    )


def _missing_openai_explanation_eval_requirements(
    settings: Settings,
    env: Mapping[str, str],
) -> list[str]:
    missing = []
    if not env.get("OPENAI_API_KEY", "").strip():
        missing.append("OPENAI_API_KEY")
    if settings.openai_monthly_budget_usd is None:
        missing.append("OPENAI_MONTHLY_BUDGET_USD")
    return missing


def main(
    argv: Sequence[str] | None = None,
    *,
    settings: Settings = default_settings,
    env: Mapping[str, str] | None = None,
) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Run a live OpenAI explanation evaluation without printing secrets "
            "or full model output."
        )
    )
    parser.parse_args(argv)
    try:
        print(
            run_openai_explanation_eval(
                settings=settings,
                env=os.environ if env is None else env,
            )
        )
    except OpenAIExplanationEvalError as exc:
        print(f"openai explanation evaluation ready=False: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
