from app.cli import runtime_readiness as cli


def test_format_readiness_report_includes_missing_details_without_secrets() -> None:
    report = cli.format_readiness_report(
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


def test_readiness_exit_code_can_fail_when_any_gate_is_missing() -> None:
    readiness = {
        "vision": {
            "ready": False,
            "mode": "opencv_yolo",
            "missing": ["python module cv2"],
            "checks": [],
        },
        "simulation": {
            "ready": True,
            "mode": "sumo_traci",
            "missing": [],
            "checks": [],
        },
    }

    assert cli.readiness_exit_code(readiness, fail_on_missing=False) == 0
    assert cli.readiness_exit_code(readiness, fail_on_missing=True) == 1


def test_readiness_exit_code_can_scope_strict_mode_to_selected_sections() -> None:
    readiness = {
        "vision": {
            "ready": False,
            "mode": "opencv_yolo",
            "missing": ["python module cv2"],
            "checks": [],
        },
        "simulation": {
            "ready": True,
            "mode": "sumo_traci",
            "missing": [],
            "checks": [],
        },
    }

    assert (
        cli.readiness_exit_code(
            readiness,
            fail_on_missing=True,
            selected_sections=["simulation"],
        )
        == 0
    )
    assert (
        cli.readiness_exit_code(
            readiness,
            fail_on_missing=True,
            selected_sections=["vision"],
        )
        == 1
    )


def test_readiness_exit_code_passes_strict_mode_when_all_gates_are_ready() -> None:
    readiness = {
        "vision": {
            "ready": True,
            "mode": "opencv_yolo",
            "missing": [],
            "checks": [],
        }
    }

    assert cli.readiness_exit_code(readiness, fail_on_missing=True) == 0


def test_main_fail_on_missing_prints_report_and_returns_failure(
    monkeypatch, capsys
) -> None:
    readiness = {
        "vision": {
            "ready": False,
            "mode": "opencv_yolo",
            "missing": ["python module cv2"],
            "checks": [],
        }
    }

    monkeypatch.setattr(
        cli,
        "get_runtime_readiness",
        lambda *_args, **_kwargs: readiness,
    )

    assert cli.main(["--fail-on-missing"]) == 1
    assert "vision ready=False mode=opencv_yolo" in capsys.readouterr().out


def test_main_can_fail_on_missing_for_one_selected_section(
    monkeypatch, capsys
) -> None:
    readiness = {
        "vision": {
            "ready": False,
            "mode": "opencv_yolo",
            "missing": ["python module cv2"],
            "checks": [],
        },
        "simulation": {
            "ready": True,
            "mode": "sumo_traci",
            "missing": [],
            "checks": [],
        },
    }

    monkeypatch.setattr(
        cli,
        "get_runtime_readiness",
        lambda *_args, **_kwargs: readiness,
    )

    assert cli.main(["--fail-on-missing", "--section", "simulation"]) == 0
    output = capsys.readouterr().out
    assert "simulation ready=True mode=sumo_traci" in output
    assert "vision ready=False" not in output
