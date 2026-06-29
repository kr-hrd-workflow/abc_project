import argparse
import os
import sys
from collections.abc import Callable, Mapping, Sequence
from typing import Any

from app.core.config import Settings, settings as default_settings
from app.services.knowledge import ingest_policy_documents
from app.services.openai_clients import (
    MissingOpenAIAPIKeyError,
    OpenAIEmbeddingGateway,
    OpenAITextGateway,
    build_openai_client,
    require_openai_api_key,
)


class OpenAISmokeError(RuntimeError):
    pass


def run_openai_smoke(
    *,
    settings: Settings = default_settings,
    env: Mapping[str, str] | None = None,
    client_factory: Callable[[str], Any] = build_openai_client,
) -> str:
    env = os.environ if env is None else env
    missing_requirements = _missing_openai_smoke_requirements(settings, env)
    if missing_requirements:
        raise OpenAISmokeError(
            ", ".join(missing_requirements)
            + " required before live OpenAI smoke calls"
        )

    try:
        api_key = require_openai_api_key(env)
    except MissingOpenAIAPIKeyError as exc:
        raise OpenAISmokeError(str(exc)) from exc

    client = client_factory(api_key)
    embedding_gateway = OpenAIEmbeddingGateway(
        client=client,
        model=settings.openai_embedding_model,
        dimensions=settings.openai_embedding_dimensions,
    )
    embedding = embedding_gateway.embed_text(
        "Emergency vehicle priority policy smoke test."
    )
    if len(embedding) != settings.openai_embedding_dimensions:
        raise OpenAISmokeError(
            "OpenAI embedding dimension mismatch: "
            f"expected {settings.openai_embedding_dimensions}, got {len(embedding)}"
        )

    answer = OpenAITextGateway(
        client=client,
        model=settings.openai_model,
    ).generate_grounded_answer(
        question="What safety boundary applies to this recommendation?",
        scenario_summary=(
            "Smoke test scenario: an emergency vehicle is approaching an "
            "intersection in simulation-only mode."
        ),
        policy_evidence=ingest_policy_documents()[:1],
    )
    if not answer.strip():
        raise OpenAISmokeError("OpenAI Responses smoke returned empty output text")

    return "\n".join(
        [
            "openai smoke ready=True",
            f"model={settings.openai_model}",
            f"embedding_model={settings.openai_embedding_model}",
            f"embedding_dimensions={len(embedding)}",
            "response_text_present=True",
        ]
    )


def _missing_openai_smoke_requirements(
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
            "Run the approved live OpenAI smoke check without printing secrets."
        )
    )
    parser.parse_args(argv)
    try:
        print(
            run_openai_smoke(
                settings=settings,
                env=os.environ if env is None else env,
            )
        )
    except OpenAISmokeError as exc:
        print(f"openai smoke ready=False: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
