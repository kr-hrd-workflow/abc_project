#!/usr/bin/env python3
"""Print the SmartIntersection Simulator Builder Agent prompt.

This is a lightweight runner for dispatching a focused worker agent from any
agent shell. It does not call a model itself; it emits the exact role prompt and
context package that should be pasted into/delegated to a worker.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENT_SPEC = ROOT / "docs" / "agents" / "simulator-builder-agent.md"
PLAN = ROOT / "docs" / "superpowers" / "plans" / "2026-06-12-ue57-simulator-builder-agent-rebuild.md"
DOC_DIGEST = ROOT / "docs" / "technotes" / "ue57-doc-digest"


def main() -> None:
    spec = AGENT_SPEC.read_text(encoding="utf-8")
    plan_note = ""
    if PLAN.exists():
        plan_note = f"\nActive implementation plan: `{PLAN.relative_to(ROOT)}`\n"
    digest_files = sorted(path.relative_to(ROOT).as_posix() for path in DOC_DIGEST.glob("*.txt"))
    prompt = f"""Role:
You are a worker agent reporting to the primary agent. Do not claim the overall user task is complete. Your scope is the SmartIntersection Unreal simulator renderer.

Task:
Use the Simulator Builder Agent spec below to rebuild or maintain the Unreal traffic-control simulator. Follow official UE 5.7 docs before editing. Do not touch landing-page imagery/layout unless explicitly assigned.
{plan_note}
Official UE 5.7 doc digest files:
{chr(10).join(f'- `{path}`' for path in digest_files)}

Simulator Builder Agent spec:

{spec}
"""
    print(prompt)


if __name__ == "__main__":
    main()
