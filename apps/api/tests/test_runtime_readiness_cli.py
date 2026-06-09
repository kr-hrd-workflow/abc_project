from app.cli.runtime_readiness import format_readiness_report


def test_format_readiness_report_includes_missing_details_without_secrets() -> None:
    report = format_readiness_report(
        {
            "openai": {
                "ready": False,
                "mode": "gpt-5.5",
                "missing": ["OPENAI_API_KEY"],
                "checks": [
                    {
                        "name": "OPENAI_API_KEY",
                        "available": False,
                        "detail": "presence only; value is never returned",
                    }
                ],
            },
            "vision": {
                "ready": True,
                "mode": "fixture",
                "missing": [],
                "checks": [],
            },
        }
    )

    assert "openai ready=False mode=gpt-5.5" in report
    assert "missing: OPENAI_API_KEY" in report
    assert "detail: presence only; value is never returned" in report
    assert "vision ready=True mode=fixture" in report
    assert "missing: -" in report
    assert "sk-test-secret" not in report
