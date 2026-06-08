# Smart Intersection Decision-Support MVP

Phase 1 smart-city intersection dashboard project.

The approved stack is:

- Next.js + React + TypeScript for the operator dashboard
- FastAPI + SQLAlchemy + Alembic for the API
- PostgreSQL through Docker Compose for local persistence

The current build has the backend domain model, scenario adapters, persistence,
deterministic recommendations, simulation comparison, chat summaries, and report
generation in place. The dashboard UI now follows the approved glassy
translucent panel concept with Korean/English language selection and a
replaceable central simulation viewport.

The approved dashboard direction includes Korean/English language selection and
a central digital-twin simulation viewport that can later be replaced by a real
simulation renderer without changing the surrounding API contracts.

## Source Of Truth

- Project instructions: `AGENTS.md`
- MVP design: `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md`
- Codex teammate setup: `docs/codex-team-setup.md`

## Local Setup

Install Python 3.12+, Node.js/npm, and Docker Desktop.

```bash
npm install
python3 -m venv apps/api/.venv
apps/api/.venv/bin/python -m pip install -e "apps/api[dev]"
docker compose -f infra/docker-compose.yml up -d postgres
cd apps/api
.venv/bin/alembic upgrade head
```

## Verification

Backend tests:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests -v
```

Frontend build:

```bash
npm run build:web
```

Docker/Postgres status:

```bash
docker compose -f infra/docker-compose.yml ps
```

## API Smoke Path

With PostgreSQL running and migrations applied, the Phase 1 API flow is:

```text
POST /api/scenarios/emergency/load
GET  /api/intersection/status
GET  /api/events
POST /api/analyze
POST /api/recommend-signal
POST /api/simulate-signal
POST /api/chat
POST /api/report
```

All recommendations are simulation-only. The app must not imply real traffic
signal control.

## Current Frontend Direction

The approved glassy translucent panel concept is recorded at:

```text
docs/design/assets/dashboard-concept-approved.png
docs/design/dashboard-concept-notes.md
```

The central viewport is intentionally a replaceable simulation boundary. Phase 2
should replace the scenario-backed adapters and simulation renderer without
changing the surrounding dashboard API contracts; see
`docs/superpowers/plans/2026-06-08-phase-2-integration-notes.md`.
