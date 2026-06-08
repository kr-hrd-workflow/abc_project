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

## Local Development Setup

Install Docker Desktop, Node.js/npm, and Python 3.12+.

```bash
npm install
python3 -m venv apps/api/.venv
apps/api/.venv/bin/python -m pip install -e "apps/api[dev]"
docker compose -f infra/docker-compose.yml up -d postgres
cd apps/api
.venv/bin/alembic upgrade head
```

Useful verification commands:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests -v
npm run build:web
docker compose -f infra/docker-compose.yml ps
```

## Current Build State

- Backend scaffold, database schema, scenario adapters, API routes, deterministic recommendations, chat, reports, and simulation comparison are implemented.
- Docker Compose PostgreSQL is the shared local database path.
- Dashboard UI implementation should follow the approved glassy translucent dashboard concept.
- The dashboard must support Korean/English selection with a lightweight frontend dictionary.
- The central digital twin must stay replaceable for a later real simulation renderer.
- Do not add OpenAI, pgvector, real YOLO, real SUMO, or Unity in Phase 1 without a separate approval.

## Not Tracked Yet

- `.codex/config.toml` is not tracked because we have not standardized a project-specific MCP server, hook, sandbox policy, or model default.
- Add project-scoped `.codex/config.toml` later only after the team agrees on shared Codex settings and confirms there are no secrets or machine-specific paths.

## References

- Codex project instructions: https://developers.openai.com/codex/guides/agents-md.md
- Codex skills: https://developers.openai.com/codex/skills.md
- Codex MCP configuration: https://developers.openai.com/codex/mcp.md
