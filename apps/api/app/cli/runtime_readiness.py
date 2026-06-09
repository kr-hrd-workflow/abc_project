from app.core.config import settings
from app.db.session import SessionLocal
from app.services.runtime_readiness import (
    RuntimeSection,
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


def build_readiness_report() -> str:
    readiness = get_runtime_readiness(
        settings,
        vector_extension_verified=lambda: is_vector_extension_enabled(SessionLocal),
    )
    return format_readiness_report(readiness)


def main() -> None:
    print(build_readiness_report())


if __name__ == "__main__":
    main()
