#!/usr/bin/env python3
"""Verify the Simulator Builder Agent guardrails and docs are present."""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "docs" / "agents" / "simulator-builder-agent.md"
RUNNER = ROOT / "scripts" / "run-simulator-builder-agent.py"
DOC_DIGEST = ROOT / "docs" / "technotes" / "ue57-doc-digest"
REQUIRED_DOCS = [
    "python_editor.txt",
    "actors.txt",
    "levels.txt",
    "static_meshes.txt",
    "materials.txt",
    "lights.txt",
    "post_process.txt",
    "cinematic_cameras.txt",
    "pixel_streaming.txt",
]
REQUIRED_SPEC_TOKENS = [
    "SmartIntersection Simulator Builder Agent",
    "modify landing-page imagery",
    "oversized proof strips",
    "SUMO/TraCI is truth; FastAPI orchestrates; Unreal renders",
    "Use Python for editor automation only",
    "Use Actors and Components",
    "Use Static Meshes",
    "Use Material Instances/Functions",
    "Use CineCameraActor",
    "Pixel Streaming",
    "npm run unreal:precheck",
    "python3 scripts/verify-complete-simulation-renderer.py",
]


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def main() -> None:
    if not SPEC.exists():
        fail(f"missing {SPEC}")
    if not RUNNER.exists():
        fail(f"missing {RUNNER}")
    spec = SPEC.read_text(encoding="utf-8")
    for token in REQUIRED_SPEC_TOKENS:
        if token not in spec:
            fail(f"spec missing token: {token}")
    for doc in REQUIRED_DOCS:
        path = DOC_DIGEST / doc
        if not path.exists():
            fail(f"missing UE 5.7 doc digest file: {path}")
        if path.stat().st_size < 500:
            fail(f"doc digest file is too small: {path}")
    runner = RUNNER.read_text(encoding="utf-8")
    for token in ["AGENT_SPEC", "DOC_DIGEST", "Active implementation plan", "Do not touch landing-page imagery/layout"]:
        if token not in runner:
            fail(f"runner missing token: {token}")
    print("SIMULATOR_BUILDER_AGENT_PASS")


if __name__ == "__main__":
    main()
