import argparse
from collections.abc import Sequence

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.runtime_readiness import (
    RuntimeSection,
    filter_runtime_readiness,
    get_runtime_readiness,
    is_vector_extension_enabled,
)


def format_readiness_report(readiness: dict[str, RuntimeSection]) -> str:
    lines: list[str] = []
    for section, payload in readiness.items():
        lines.append(f"{section} ready={payload['ready']} mode={payload['mode']}")
        lines.append(f"missing: {', '.join(payload['missing']) or '-'}")
        for check in payload["checks"]:
            if not check["available"]:
                lines.append(f"detail: {check.get('detail', '-')}")
    return "\n".join(lines)


def readiness_exit_code(
    readiness: dict[str, RuntimeSection],
    *,
    fail_on_missing: bool,
    selected_sections: Sequence[str] | None = None,
) -> int:
    if not fail_on_missing:
        return 0
    selected_readiness = filter_runtime_readiness(readiness, selected_sections)
    return 1 if any(not payload["ready"] for payload in selected_readiness.values()) else 0


def build_readiness() -> dict[str, RuntimeSection]:
    return get_runtime_readiness(
        settings,
        vector_extension_verified=lambda: is_vector_extension_enabled(SessionLocal),
    )


def build_readiness_report() -> str:
    return format_readiness_report(build_readiness())


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Report optional smart-intersection runtime readiness gates."
    )
    parser.add_argument(
        "--fail-on-missing",
        action="store_true",
        help="return exit code 1 when any readiness gate has missing requirements",
    )
    parser.add_argument(
        "--section",
        action="append",
        choices=["vision", "simulation", "openai", "pgvector"],
        help="limit the report and strict exit check to one readiness section",
    )
    args = parser.parse_args(argv)
    readiness = build_readiness()
    selected_readiness = filter_runtime_readiness(readiness, args.section)
    print(format_readiness_report(selected_readiness))
    return readiness_exit_code(
        readiness,
        fail_on_missing=args.fail_on_missing,
        selected_sections=args.section,
    )


if __name__ == "__main__":
    raise SystemExit(main())
