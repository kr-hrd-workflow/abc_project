# Codex Team Setup

This repository is intended for teammates who also work with Codex.

## Shared Files To Track

- `AGENTS.md` contains project-level Codex instructions and should stay tracked.
- `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md` is the approved MVP design source.
- `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md` is the implementation plan and next-step checklist.
- `.agents/skills/karpathy-guidelines/SKILL.md` provides a repo-scoped skill so every Codex user can apply the same coding judgment guidance.

## Local Files To Keep Ignored

- `.superpowers/` is local Superpowers session state.
- `tmp/` is local PDF extraction and scratch output.
- `.env`, `.env.*`, `.venv/`, `node_modules/`, build output, generated media, and model weights stay ignored.

## Recommended Codex Setup

1. Pull the latest `main`.
2. Start Codex from the repository root.
3. Confirm Codex sees `AGENTS.md`.
4. Enable or install the Superpowers and Build Web Apps plugins in your own Codex environment.
5. Use the repo-scoped `karpathy-guidelines` skill when coding, reviewing, debugging, or planning changes.

## Not Tracked Yet

- `.codex/config.toml` is not tracked because we have not standardized a project-specific MCP server, hook, sandbox policy, or model default.
- Add project-scoped `.codex/config.toml` later only after the team agrees on shared Codex settings and confirms there are no secrets or machine-specific paths.

## References

- Codex project instructions: https://developers.openai.com/codex/guides/agents-md.md
- Codex skills: https://developers.openai.com/codex/skills.md
- Codex MCP configuration: https://developers.openai.com/codex/mcp.md
