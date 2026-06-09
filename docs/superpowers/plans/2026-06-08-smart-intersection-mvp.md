# Smart Intersection MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 smart-intersection decision-support MVP with a Next.js dashboard, FastAPI backend, PostgreSQL persistence, scenario-backed adapters, deterministic recommendations, reports, and chat summaries.

**Architecture:** Use `Next.js + React + TypeScript` for the operator dashboard and `FastAPI + SQLAlchemy 2.x + Alembic + PostgreSQL` for the backend. Phase 1 uses seeded scenario adapters that return YOLO-shaped and SUMO-shaped outputs through stable interfaces, so Phase 2 can replace them with real OpenCV/YOLO and SUMO/TraCI implementations without changing frontend API contracts.

**Tech Stack:** Next.js, React, TypeScript, FastAPI, Pydantic, SQLAlchemy 2.x, Alembic, PostgreSQL, Docker Compose, pytest, Vitest or React Testing Library when frontend tests are added.

---

## Source Spec

Use this approved spec as the source of truth:

- `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md`

Key approved decisions:

- Keep `Next.js + FastAPI + PostgreSQL`.
- Use SQLAlchemy 2.x plus Alembic.
- Use deterministic Phase 1 recommendation and summary logic.
- Keep mocked YOLO/SUMO behind replaceable adapters.
- Add Korean/English language selection in the dashboard UI without adding a new i18n dependency in Phase 1.
- Keep the central dashboard simulation viewport replaceable so Phase 2 can swap in a real simulation renderer without changing surrounding API contracts.
- Do not add OpenAI, pgvector, real YOLO, real SUMO, or Unity in Phase 1 without a separate approval.
- Before visual dashboard implementation, create and approve a dashboard concept because the Build Web Apps skill requires this unless the user opts out.

## Current Execution Tracker

Current as of 2026-06-09. The detailed task steps below are retained as the
historical implementation recipe; this tracker is the current progress summary.

- [x] Task 1, repository scaffold and local service files: implemented.
- [x] Task 2, backend domain models and database schema: implemented.
- [x] Task 3, scenario data and replaceable adapters: implemented.
- [x] Task 4, recommendation, report, chat, persistence, and API flow:
  implemented.
- [x] Task 5, frontend visual concept gate: completed and recorded in
  `docs/design/dashboard-concept-notes.md` plus
  `docs/design/assets/dashboard-concept-approved.png`.
- [x] Task 6, frontend data types and API client: implemented.
- [x] Task 7, dashboard UI implementation plan and execution: implemented in
  `apps/web`.
- [x] Task 8 automated validation baseline: fresh checks passed with
  `apps/api/.venv/bin/python -m pytest apps/api/tests -v`,
  `npm --workspace apps/web run test`, and `npm run build:web`.
- [x] Task 8 live browser smoke and visual-fidelity comparison: Browser check at
  `http://localhost:3000` on 2026-06-09 verified page identity, rendered
  dashboard content, no console errors/warnings, language toggle, chat, report,
  simulation action, and visible safety copy.
- [x] Task 9, Phase 2 readiness notes: created and updated with implemented
  fixture ingestion plus YOLO adapter seam status.
- [x] Next build slice: implement a `SumoTraciTrafficSimulationAdapter` seam
  behind `TrafficSimulationAdapter` while preserving `SimulationComparison`.
- [x] Next unblocked build slice: add sample upload handling and analysis
  job status, still using fixture-backed analysis until real OpenCV/YOLO
  runtime setup is separately approved.
- [x] Next build slice: add optional OpenCV/YOLO runtime configuration and an
  `OpenCVYoloFrameAnalyzer` that can normalize real YOLO box output behind the
  existing upload adapter boundary.
- [ ] Remaining vision runtime gate: install/verify OpenCV, Ultralytics, model
  weights, and a live sample inference run before claiming fixture replacement
  is complete.
- [x] Next build slice: add optional SUMO/TraCI runtime configuration and a
  `TraciSumoSimulationRunner` that can collect real TraCI metrics behind the
  existing simulation adapter boundary.
- [ ] Remaining SUMO runtime gate: install/verify SUMO binaries, TraCI/sumolib,
  network config, and a live simulation run before claiming fixture replacement
  is complete.
- [x] Phase 3 local evidence slice: add policy/operation-guide ingestion,
  local policy evidence retrieval for chat, and configurable OpenAI
  model/embedding settings after checking official OpenAI docs.
- [x] Next build slice: add `/api/runtime/readiness` so remaining OpenCV/YOLO,
  SUMO/TraCI, OpenAI, and pgvector setup gates are observable without installing
  runtimes, calling external APIs, or returning secrets.
- [x] Next build slice: make pgvector readiness inspect the target database for
  an enabled PostgreSQL `vector` extension when the database is reachable,
  without enabling the extension or adding vector columns.
- [x] Next build slice: add actionable setup details to `/api/runtime/readiness`
  checks so missing optional modules, binaries, model files, API keys, and
  database extensions point to the required setup gate.
- [x] Documentation slice: add `docs/runtime-setup.md` with checkbox runbooks
  for the remaining YOLO/OpenCV, SUMO/TraCI, OpenAI, and pgvector gates.
- [x] Documentation handoff slice: rewrite `README.md` in Korean so teammates
  can see current status, setup commands, validation commands, remaining gates,
  and the next files to work from.
- [ ] Remaining AI/RAG gate: approve and verify API-key setup, pgvector database
  extension, live embeddings, and OpenAI client calls before claiming full
  RAG/AI integration is complete.

## File Structure

Create or modify these files:

```text
package.json
package-lock.json
.env.example
infra/docker-compose.yml
apps/api/pyproject.toml
apps/api/alembic.ini
apps/api/alembic/env.py
apps/api/alembic/versions/0001_initial_schema.py
apps/api/app/__init__.py
apps/api/app/adapters/__init__.py
apps/api/app/api/__init__.py
apps/api/app/main.py
apps/api/app/core/config.py
apps/api/app/core/__init__.py
apps/api/app/db/__init__.py
apps/api/app/db/session.py
apps/api/app/db/models.py
apps/api/app/domain/__init__.py
apps/api/app/domain/schemas.py
apps/api/app/domain/enums.py
apps/api/app/adapters/vision.py
apps/api/app/adapters/simulation.py
apps/api/app/scenarios/__init__.py
apps/api/app/scenarios/data.py
apps/api/app/services/__init__.py
apps/api/app/services/recommendations.py
apps/api/app/services/reports.py
apps/api/app/services/chat.py
apps/api/app/services/persistence.py
apps/api/app/api/routes.py
apps/api/tests/test_health.py
apps/api/tests/test_adapters.py
apps/api/tests/test_recommendations.py
apps/api/tests/test_api_flow.py
apps/web/package.json
apps/web/next.config.mjs
apps/web/tsconfig.json
apps/web/app/layout.tsx
apps/web/app/page.tsx
apps/web/app/globals.css
apps/web/components/DashboardShell.tsx
apps/web/components/DigitalTwin.tsx
apps/web/components/EventTimeline.tsx
apps/web/components/RecommendationPanel.tsx
apps/web/components/MetricsPanel.tsx
apps/web/components/ChatReportPanel.tsx
apps/web/lib/api.ts
apps/web/lib/i18n.ts
apps/web/lib/types.ts
docs/design/dashboard-concept-notes.md
docs/design/assets/dashboard-concept-approved.png
docs/superpowers/plans/2026-06-08-dashboard-ui-implementation.md
```

`packages/shared` is intentionally not created in Phase 1. Create it later only if duplicated schema types become painful after the first API and frontend pass.

## Task 1: Repository Scaffold And Local Services

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `infra/docker-compose.yml`
- Create: `apps/api/pyproject.toml`
- Create: `apps/api/app/__init__.py`
- Create: `apps/api/app/adapters/__init__.py`
- Create: `apps/api/app/api/__init__.py`
- Create: `apps/api/app/core/__init__.py`
- Create: `apps/api/app/db/__init__.py`
- Create: `apps/api/app/domain/__init__.py`
- Create: `apps/api/app/scenarios/__init__.py`
- Create: `apps/api/app/services/__init__.py`
- Create: `apps/api/app/main.py`
- Create: `apps/api/tests/test_health.py`
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`

- [x] **Step 1: Create root Node workspace metadata**

Create `package.json`:

```json
{
  "private": true,
  "scripts": {
    "dev:web": "npm --workspace apps/web run dev",
    "build:web": "npm --workspace apps/web run build"
  },
  "workspaces": [
    "apps/web"
  ]
}
```

- [x] **Step 2: Create local environment example**

Create `.env.example`:

```dotenv
DATABASE_URL=postgresql+psycopg://smart_intersection:smart_intersection@localhost:5432/smart_intersection
API_HOST=127.0.0.1
API_PORT=8000
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

- [x] **Step 3: Create PostgreSQL Docker Compose service**

Create `infra/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: smart-intersection-postgres
    environment:
      POSTGRES_USER: smart_intersection
      POSTGRES_PASSWORD: smart_intersection
      POSTGRES_DB: smart_intersection
    ports:
      - "5432:5432"
    volumes:
      - smart_intersection_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U smart_intersection -d smart_intersection"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  smart_intersection_pgdata:
```

- [x] **Step 4: Create FastAPI package metadata**

Create `apps/api/pyproject.toml`:

```toml
[project]
name = "smart-intersection-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "alembic>=1.13.2",
  "fastapi>=0.115.0",
  "psycopg[binary]>=3.2.1",
  "pydantic>=2.8.2",
  "pydantic-settings>=2.4.0",
  "sqlalchemy>=2.0.32",
  "uvicorn[standard]>=0.30.6"
]

[project.optional-dependencies]
dev = [
  "httpx>=0.27.2",
  "pytest>=8.3.2",
  "pytest-asyncio>=0.24.0"
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

- [x] **Step 5: Create minimal FastAPI health endpoint**

Create package marker files:

```python
"""Smart intersection API package."""
```

Write that same one-line module docstring in:

```text
apps/api/app/__init__.py
apps/api/app/adapters/__init__.py
apps/api/app/api/__init__.py
apps/api/app/core/__init__.py
apps/api/app/db/__init__.py
apps/api/app/domain/__init__.py
apps/api/app/scenarios/__init__.py
apps/api/app/services/__init__.py
```

Create `apps/api/app/main.py`:

```python
from fastapi import FastAPI

app = FastAPI(title="Smart Intersection API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [x] **Step 6: Write backend health test**

Create `apps/api/tests/test_health.py`:

```python
from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok() -> None:
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [x] **Step 7: Create minimal Next.js app metadata**

Create `apps/web/package.json`:

```json
{
  "name": "smart-intersection-web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0"
  }
}
```

Create `apps/web/next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

Create `apps/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [x] **Step 8: Create minimal Next.js page**

Create `apps/web/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Intersection Control Center",
  description: "Decision-support dashboard for smart intersection traffic operations"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `apps/web/app/page.tsx`:

```tsx
export default function Page() {
  return (
    <main className="shell">
      <h1>Smart Intersection Control Center</h1>
      <p>Recommendation and simulation-only MVP dashboard.</p>
    </main>
  );
}
```

Create `apps/web/app/globals.css`:

```css
:root {
  color: #111827;
  background: #f6f8fb;
  font-family: Arial, Helvetica, sans-serif;
}

body {
  margin: 0;
}

.shell {
  min-height: 100vh;
  padding: 32px;
}
```

- [x] **Step 9: Install dependencies**

Run:

```bash
npm install
python3 -m venv apps/api/.venv
apps/api/.venv/bin/python -m pip install -e "apps/api[dev]"
```

Expected: npm creates `package-lock.json`; pip installs FastAPI test dependencies.

- [x] **Step 10: Run initial verification**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_health.py -v
npm run build:web
```

Expected: backend health test passes; Next.js build completes.

- [x] **Step 11: Commit scaffold**

```bash
git add package.json package-lock.json .env.example infra/docker-compose.yml apps/api apps/web
git commit -m "chore: scaffold smart intersection app"
```

## Task 2: Backend Domain Models And Database Schema

**Files:**
- Create: `apps/api/app/core/config.py`
- Create: `apps/api/app/db/session.py`
- Create: `apps/api/app/db/models.py`
- Create: `apps/api/app/domain/enums.py`
- Create: `apps/api/app/domain/schemas.py`
- Create: `apps/api/alembic.ini`
- Create: `apps/api/alembic/env.py`
- Create: `apps/api/alembic/versions/0001_initial_schema.py`

- [x] **Step 1: Write domain enums**

Create `apps/api/app/domain/enums.py`:

```python
from enum import StrEnum


class Direction(StrEnum):
    NORTH = "north"
    SOUTH = "south"
    EAST = "east"
    WEST = "west"


class EventType(StrEnum):
    QUEUE_THRESHOLD_EXCEEDED = "queue_threshold_exceeded"
    PEDESTRIAN_WAITING = "pedestrian_waiting"
    EMERGENCY_VEHICLE_APPROACH = "emergency_vehicle_approach"
    INTERSECTION_BLOCKED = "intersection_blocked"
    NORMAL_FLOW = "normal_flow"


class Severity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class RecommendationAction(StrEnum):
    EMERGENCY_PRIORITY = "emergency_priority"
    ALL_RED_SAFETY = "all_red_safety"
    GREEN_EXTENSION = "green_extension"
    PEDESTRIAN_PHASE = "pedestrian_phase"
    MAINTAIN_CYCLE = "maintain_cycle"
```

- [x] **Step 2: Write Pydantic schemas**

Create `apps/api/app/domain/schemas.py`:

```python
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.domain.enums import Direction, EventType, RecommendationAction, Severity


class QueueMetrics(BaseModel):
    north: int = Field(ge=0)
    south: int = Field(ge=0)
    east: int = Field(ge=0)
    west: int = Field(ge=0)


class EmergencyVehicle(BaseModel):
    present: bool
    direction: Direction | None = None
    estimated_arrival_seconds: int | None = Field(default=None, ge=0)


class VisionObservation(BaseModel):
    source: str
    intersection_id: str
    captured_at: datetime
    objects: dict[str, int]
    queues: QueueMetrics
    pedestrian_waiting: bool
    emergency_vehicle: EmergencyVehicle
    intersection_blocked: bool
    congestion_level: str


class TrafficEventRead(BaseModel):
    id: int
    intersection_id: str
    occurred_at: datetime
    direction: Direction | None
    event_type: EventType
    severity: Severity
    object_count: int
    ai_summary: str
    recommendation: str
    status: str
    source: str


class IntersectionStatusRead(BaseModel):
    intersection_id: str
    captured_at: datetime
    signal_phase: str
    cycle_second: int
    queues: QueueMetrics
    pedestrian_request: bool
    emergency_priority: bool
    congestion_level: str
    source: str


class RecommendationRead(BaseModel):
    id: int
    intersection_id: str
    created_at: datetime
    action: RecommendationAction
    recommended_plan: dict[str, Any]
    evidence: dict[str, Any]
    safety_boundary: str
    status: str


class SimulationMetrics(BaseModel):
    average_wait_seconds: float
    total_delay_seconds: float
    throughput: int
    emergency_vehicle_clearance_seconds: float


class SimulationComparison(BaseModel):
    source: str
    baseline: SimulationMetrics
    recommended: SimulationMetrics
    improvement: dict[str, float]


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)


class ChatResponse(BaseModel):
    answer: str
    referenced_event_ids: list[int]


class ReportRead(BaseModel):
    id: int
    intersection_id: str
    period_start: datetime
    period_end: datetime
    summary: str
    generated_at: datetime
```

- [x] **Step 3: Write database config and session**

Create `apps/api/app/core/config.py`:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://smart_intersection:smart_intersection@localhost:5432/smart_intersection"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
```

Create `apps/api/app/db/session.py`:

```python
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
```

- [x] **Step 4: Write SQLAlchemy models**

Create `apps/api/app/db/models.py` with the tables from the spec:

```python
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Intersection(Base):
    __tablename__ = "intersections"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location_label: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class IntersectionStatus(Base):
    __tablename__ = "intersection_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    intersection_id: Mapped[str] = mapped_column(ForeignKey("intersections.id"), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    signal_phase: Mapped[str] = mapped_column(String(64), nullable=False)
    cycle_second: Mapped[int] = mapped_column(Integer, nullable=False)
    north_queue: Mapped[int] = mapped_column(Integer, nullable=False)
    south_queue: Mapped[int] = mapped_column(Integer, nullable=False)
    east_queue: Mapped[int] = mapped_column(Integer, nullable=False)
    west_queue: Mapped[int] = mapped_column(Integer, nullable=False)
    pedestrian_request: Mapped[bool] = mapped_column(Boolean, nullable=False)
    emergency_priority: Mapped[bool] = mapped_column(Boolean, nullable=False)
    congestion_level: Mapped[str] = mapped_column(String(32), nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)


class TrafficEvent(Base):
    __tablename__ = "traffic_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    intersection_id: Mapped[str] = mapped_column(ForeignKey("intersections.id"), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    direction: Mapped[str | None] = mapped_column(String(16), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    object_count: Mapped[int] = mapped_column(Integer, nullable=False)
    ai_summary: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)


class SignalRecommendation(Base):
    __tablename__ = "signal_recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    intersection_id: Mapped[str] = mapped_column(ForeignKey("intersections.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    trigger_event_id: Mapped[int | None] = mapped_column(ForeignKey("traffic_events.id"), nullable=True)
    recommended_action: Mapped[str] = mapped_column(String(64), nullable=False)
    recommended_plan_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    evidence_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    safety_boundary: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    intersection_id: Mapped[str] = mapped_column(ForeignKey("intersections.id"), nullable=False)
    recommendation_id: Mapped[int | None] = mapped_column(ForeignKey("signal_recommendations.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    baseline_metrics_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    recommended_metrics_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    improvement_summary: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    intersection_id: Mapped[str] = mapped_column(ForeignKey("intersections.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    referenced_event_ids_json: Mapped[list[int]] = mapped_column(JSON, nullable=False)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    intersection_id: Mapped[str] = mapped_column(ForeignKey("intersections.id"), nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
```

- [x] **Step 5: Write Alembic configuration**

Create `apps/api/alembic.ini`:

```ini
[alembic]
script_location = alembic
prepend_sys_path = .

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

Create `apps/api/alembic/env.py`:

```python
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.db.models import Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"}
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [x] **Step 6: Write initial migration**

Create `apps/api/alembic/versions/0001_initial_schema.py`:

```python
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "intersections",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("location_label", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False)
    )
    op.create_table(
        "intersection_status",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("signal_phase", sa.String(length=64), nullable=False),
        sa.Column("cycle_second", sa.Integer(), nullable=False),
        sa.Column("north_queue", sa.Integer(), nullable=False),
        sa.Column("south_queue", sa.Integer(), nullable=False),
        sa.Column("east_queue", sa.Integer(), nullable=False),
        sa.Column("west_queue", sa.Integer(), nullable=False),
        sa.Column("pedestrian_request", sa.Boolean(), nullable=False),
        sa.Column("emergency_priority", sa.Boolean(), nullable=False),
        sa.Column("congestion_level", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False)
    )
    op.create_table(
        "traffic_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("direction", sa.String(length=16), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("object_count", sa.Integer(), nullable=False),
        sa.Column("ai_summary", sa.Text(), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False)
    )
    op.create_table(
        "signal_recommendations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("trigger_event_id", sa.Integer(), sa.ForeignKey("traffic_events.id"), nullable=True),
        sa.Column("recommended_action", sa.String(length=64), nullable=False),
        sa.Column("recommended_plan_json", sa.JSON(), nullable=False),
        sa.Column("evidence_json", sa.JSON(), nullable=False),
        sa.Column("safety_boundary", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False)
    )
    op.create_table(
        "simulation_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("recommendation_id", sa.Integer(), sa.ForeignKey("signal_recommendations.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("baseline_metrics_json", sa.JSON(), nullable=False),
        sa.Column("recommended_metrics_json", sa.JSON(), nullable=False),
        sa.Column("improvement_summary", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False)
    )
    op.create_table(
        "chat_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("referenced_event_ids_json", sa.JSON(), nullable=False)
    )
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("intersection_id", sa.String(length=64), sa.ForeignKey("intersections.id"), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False)
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("chat_logs")
    op.drop_table("simulation_runs")
    op.drop_table("signal_recommendations")
    op.drop_table("traffic_events")
    op.drop_table("intersection_status")
    op.drop_table("intersections")
```

Run:

```bash
cd apps/api
.venv/bin/alembic upgrade head
```

Expected: all seven tables are created in PostgreSQL.

- [x] **Step 7: Commit backend schema**

```bash
git add apps/api/app/core apps/api/app/db apps/api/app/domain apps/api/alembic.ini apps/api/alembic
git commit -m "feat: add backend domain schema"
```

## Task 3: Scenario Data And Replaceable Adapters

**Files:**
- Create: `apps/api/app/scenarios/data.py`
- Create: `apps/api/app/adapters/vision.py`
- Create: `apps/api/app/adapters/simulation.py`
- Create: `apps/api/tests/test_adapters.py`

- [x] **Step 1: Write seeded scenarios**

Create `apps/api/app/scenarios/data.py`:

```python
from datetime import datetime
from zoneinfo import ZoneInfo

from app.domain.enums import Direction
from app.domain.schemas import EmergencyVehicle, QueueMetrics, SimulationComparison, SimulationMetrics, VisionObservation

SEOUL = ZoneInfo("Asia/Seoul")

EMERGENCY_SCENARIO = VisionObservation(
    source="scenario_mock",
    intersection_id="INT-0001",
    captured_at=datetime(2026, 6, 8, 10, 24, 30, tzinfo=SEOUL),
    objects={"car": 42, "bus": 2, "truck": 4, "person": 8, "traffic_light": 4},
    queues=QueueMetrics(north=32, south=11, east=18, west=8),
    pedestrian_waiting=True,
    emergency_vehicle=EmergencyVehicle(
        present=True,
        direction=Direction.EAST,
        estimated_arrival_seconds=21
    ),
    intersection_blocked=False,
    congestion_level="high"
)

PEDESTRIAN_SCENARIO = VisionObservation(
    source="scenario_mock",
    intersection_id="INT-0001",
    captured_at=datetime(2026, 6, 8, 10, 34, 30, tzinfo=SEOUL),
    objects={"car": 21, "bus": 1, "truck": 1, "person": 15, "traffic_light": 4},
    queues=QueueMetrics(north=9, south=10, east=7, west=8),
    pedestrian_waiting=True,
    emergency_vehicle=EmergencyVehicle(present=False),
    intersection_blocked=False,
    congestion_level="medium"
)

NORMAL_SCENARIO = VisionObservation(
    source="scenario_mock",
    intersection_id="INT-0001",
    captured_at=datetime(2026, 6, 8, 10, 44, 30, tzinfo=SEOUL),
    objects={"car": 16, "bus": 0, "truck": 1, "person": 3, "traffic_light": 4},
    queues=QueueMetrics(north=4, south=5, east=3, west=4),
    pedestrian_waiting=False,
    emergency_vehicle=EmergencyVehicle(present=False),
    intersection_blocked=False,
    congestion_level="low"
)

BLOCKED_SCENARIO = VisionObservation(
    source="scenario_mock",
    intersection_id="INT-0001",
    captured_at=datetime(2026, 6, 8, 10, 54, 30, tzinfo=SEOUL),
    objects={"car": 38, "bus": 2, "truck": 5, "person": 6, "traffic_light": 4},
    queues=QueueMetrics(north=31, south=27, east=29, west=26),
    pedestrian_waiting=True,
    emergency_vehicle=EmergencyVehicle(present=False),
    intersection_blocked=True,
    congestion_level="high"
)

SIMULATION_COMPARISON = SimulationComparison(
    source="scenario_mock",
    baseline=SimulationMetrics(
        average_wait_seconds=68,
        total_delay_seconds=128.4,
        throughput=1246,
        emergency_vehicle_clearance_seconds=45
    ),
    recommended=SimulationMetrics(
        average_wait_seconds=56,
        total_delay_seconds=105.3,
        throughput=1298,
        emergency_vehicle_clearance_seconds=24
    ),
    improvement={
        "total_delay_percent": 18.0,
        "average_wait_delta_seconds": -12,
        "emergency_clearance_delta_seconds": -21
    }
)

SCENARIOS = {
    "emergency": EMERGENCY_SCENARIO,
    "pedestrian": PEDESTRIAN_SCENARIO,
    "normal": NORMAL_SCENARIO,
    "blocked": BLOCKED_SCENARIO
}
```

- [x] **Step 2: Write vision adapter protocol and mock**

Create `apps/api/app/adapters/vision.py`:

```python
from typing import Protocol

from app.domain.schemas import VisionObservation
from app.scenarios.data import SCENARIOS


class VisionAnalysisAdapter(Protocol):
    def analyze(self, scenario_id: str) -> VisionObservation:
        """Return normalized traffic observation data for one scenario."""


class ScenarioVisionAnalysisAdapter:
    def analyze(self, scenario_id: str) -> VisionObservation:
        if scenario_id not in SCENARIOS:
            return SCENARIOS["emergency"]
        return SCENARIOS[scenario_id]
```

- [x] **Step 3: Write simulation adapter protocol and mock**

Create `apps/api/app/adapters/simulation.py`:

```python
from typing import Protocol

from app.domain.schemas import SimulationComparison
from app.scenarios.data import SIMULATION_COMPARISON


class TrafficSimulationAdapter(Protocol):
    def compare_signal_plan(self, scenario_id: str) -> SimulationComparison:
        """Return baseline and recommended-plan comparison metrics."""


class ScenarioTrafficSimulationAdapter:
    def compare_signal_plan(self, scenario_id: str) -> SimulationComparison:
        return SIMULATION_COMPARISON
```

- [x] **Step 4: Write adapter tests**

Create `apps/api/tests/test_adapters.py`:

```python
from app.adapters.simulation import ScenarioTrafficSimulationAdapter
from app.adapters.vision import ScenarioVisionAnalysisAdapter
from app.domain.enums import Direction


def test_vision_adapter_returns_yolo_shaped_emergency_scenario() -> None:
    adapter = ScenarioVisionAnalysisAdapter()

    observation = adapter.analyze("emergency")

    assert observation.source == "scenario_mock"
    assert observation.intersection_id == "INT-0001"
    assert observation.objects["car"] == 42
    assert observation.queues.north == 32
    assert observation.emergency_vehicle.present is True
    assert observation.emergency_vehicle.direction == Direction.EAST


def test_simulation_adapter_returns_sumo_shaped_comparison() -> None:
    adapter = ScenarioTrafficSimulationAdapter()

    comparison = adapter.compare_signal_plan("emergency")

    assert comparison.source == "scenario_mock"
    assert comparison.baseline.total_delay_seconds == 128.4
    assert comparison.recommended.total_delay_seconds == 105.3
    assert comparison.improvement["total_delay_percent"] == 18.0
```

- [x] **Step 5: Run adapter tests**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_adapters.py -v
```

Expected: both adapter tests pass.

- [x] **Step 6: Commit adapters**

```bash
git add apps/api/app/scenarios apps/api/app/adapters apps/api/tests/test_adapters.py
git commit -m "feat: add scenario adapters"
```

## Task 4: Recommendation, Report, Chat, And API Flow

**Files:**
- Create: `apps/api/app/services/recommendations.py`
- Create: `apps/api/app/services/reports.py`
- Create: `apps/api/app/services/chat.py`
- Create: `apps/api/app/services/persistence.py`
- Create: `apps/api/app/api/routes.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_recommendations.py`
- Create: `apps/api/tests/test_api_flow.py`

- [x] **Step 1: Write recommendation service**

Create `apps/api/app/services/recommendations.py`:

```python
from app.domain.enums import RecommendationAction
from app.domain.schemas import VisionObservation

QUEUE_THRESHOLD = 25


def recommend_signal_action(observation: VisionObservation) -> tuple[RecommendationAction, dict[str, object], dict[str, object]]:
    if observation.emergency_vehicle.present:
        direction = observation.emergency_vehicle.direction.value if observation.emergency_vehicle.direction else "unknown"
        return (
            RecommendationAction.EMERGENCY_PRIORITY,
            {"east": 35, "north": 20, "south": 20, "west": 15},
            {"reason": "emergency_vehicle_approach", "direction": direction}
        )

    if observation.intersection_blocked:
        return (
            RecommendationAction.ALL_RED_SAFETY,
            {"all_red": 10},
            {"reason": "intersection_blocked"}
        )

    queues = observation.queues.model_dump()
    highest_direction = max(queues, key=queues.get)
    highest_queue = queues[highest_direction]
    if highest_queue > QUEUE_THRESHOLD:
        return (
            RecommendationAction.GREEN_EXTENSION,
            {highest_direction: 40},
            {"reason": "queue_threshold_exceeded", "direction": highest_direction, "queue": highest_queue}
        )

    if observation.pedestrian_waiting:
        return (
            RecommendationAction.PEDESTRIAN_PHASE,
            {"pedestrian_crossing": 20},
            {"reason": "pedestrian_waiting"}
        )

    return (
        RecommendationAction.MAINTAIN_CYCLE,
        {"default_cycle": 90},
        {"reason": "normal_flow"}
    )
```

- [x] **Step 2: Write report and chat services**

Create `apps/api/app/services/reports.py`:

```python
from app.domain.schemas import VisionObservation


def generate_scenario_report(observation: VisionObservation) -> str:
    queues = observation.queues.model_dump()
    busiest_direction = max(queues, key=queues.get)
    busiest_count = queues[busiest_direction]
    emergency_text = "Emergency vehicle approach detected." if observation.emergency_vehicle.present else "No emergency vehicle approach detected."
    pedestrian_text = "Pedestrian waiting request is active." if observation.pedestrian_waiting else "No pedestrian waiting request is active."
    return (
        f"10-minute traffic summary for {observation.intersection_id}: "
        f"{busiest_direction} has the longest queue with {busiest_count} vehicles. "
        f"Congestion level is {observation.congestion_level}. "
        f"{emergency_text} {pedestrian_text}"
    )
```

Create `apps/api/app/services/chat.py`:

```python
from app.domain.schemas import VisionObservation


def answer_question(question: str, observation: VisionObservation) -> str:
    normalized = question.lower()
    queues = observation.queues.model_dump()
    busiest_direction = max(queues, key=queues.get)

    if "congest" in normalized or "busy" in normalized or "혼잡" in question:
        return f"The most congested direction is {busiest_direction} with {queues[busiest_direction]} queued vehicles."

    if "emergency" in normalized or "긴급" in question:
        if observation.emergency_vehicle.present:
            direction = observation.emergency_vehicle.direction.value if observation.emergency_vehicle.direction else "unknown"
            return f"Emergency priority is recommended for the {direction} approach."
        return "No emergency vehicle priority is needed in the current scenario."

    return (
        f"Current congestion is {observation.congestion_level}. "
        "The dashboard recommendation is simulation-only and does not control real traffic signals."
    )
```

- [x] **Step 3: Write persistence service**

Create `apps/api/app/services/persistence.py`:

```python
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.domain.enums import EventType, RecommendationAction, Severity
from app.domain.schemas import SimulationComparison, VisionObservation
from app.db import models

SEOUL = ZoneInfo("Asia/Seoul")
SAFETY_BOUNDARY = "Recommendation and simulation only. No real traffic signal control is performed."


def ensure_intersection(session: Session, observation: VisionObservation) -> models.Intersection:
    intersection = session.get(models.Intersection, observation.intersection_id)
    if intersection is not None:
        return intersection

    intersection = models.Intersection(
        id=observation.intersection_id,
        name="Seoul Smart Intersection Testbed",
        location_label="Scenario-backed MVP intersection",
        created_at=datetime.now(SEOUL)
    )
    session.add(intersection)
    session.flush()
    return intersection


def build_events(observation: VisionObservation) -> list[models.TrafficEvent]:
    events: list[models.TrafficEvent] = []

    if observation.intersection_blocked:
        events.append(models.TrafficEvent(
            intersection_id=observation.intersection_id,
            occurred_at=observation.captured_at,
            direction=None,
            event_type=EventType.INTERSECTION_BLOCKED.value,
            severity=Severity.CRITICAL.value,
            object_count=sum(observation.objects.values()),
            ai_summary="Intersection blockage detected in the conflict zone.",
            recommendation="Review all-red safety simulation.",
            status="open",
            source=observation.source
        ))

    if observation.emergency_vehicle.present:
        direction = observation.emergency_vehicle.direction.value if observation.emergency_vehicle.direction else None
        events.append(models.TrafficEvent(
            intersection_id=observation.intersection_id,
            occurred_at=observation.captured_at,
            direction=direction,
            event_type=EventType.EMERGENCY_VEHICLE_APPROACH.value,
            severity=Severity.CRITICAL.value,
            object_count=1,
            ai_summary="Emergency vehicle approach detected.",
            recommendation="Review emergency priority signal simulation.",
            status="open",
            source=observation.source
        ))

    queues = observation.queues.model_dump()
    for direction, queue in queues.items():
        if queue > 25:
            events.append(models.TrafficEvent(
                intersection_id=observation.intersection_id,
                occurred_at=observation.captured_at,
                direction=direction,
                event_type=EventType.QUEUE_THRESHOLD_EXCEEDED.value,
                severity=Severity.WARNING.value,
                object_count=queue,
                ai_summary=f"{direction} queue exceeds threshold.",
                recommendation="Review green extension simulation.",
                status="open",
                source=observation.source
            ))

    if observation.pedestrian_waiting and not events:
        events.append(models.TrafficEvent(
            intersection_id=observation.intersection_id,
            occurred_at=observation.captured_at,
            direction=None,
            event_type=EventType.PEDESTRIAN_WAITING.value,
            severity=Severity.INFO.value,
            object_count=observation.objects.get("person", 0),
            ai_summary="Pedestrian waiting request detected.",
            recommendation="Review pedestrian crossing phase simulation.",
            status="open",
            source=observation.source
        ))

    if not events:
        events.append(models.TrafficEvent(
            intersection_id=observation.intersection_id,
            occurred_at=observation.captured_at,
            direction=None,
            event_type=EventType.NORMAL_FLOW.value,
            severity=Severity.INFO.value,
            object_count=sum(observation.objects.values()),
            ai_summary="No priority event detected.",
            recommendation="Maintain normal cycle in the simulation.",
            status="closed",
            source=observation.source
        ))

    return events


def load_scenario_snapshot(session: Session, observation: VisionObservation) -> tuple[models.IntersectionStatus, list[models.TrafficEvent]]:
    ensure_intersection(session, observation)
    status = models.IntersectionStatus(
        intersection_id=observation.intersection_id,
        captured_at=observation.captured_at,
        signal_phase="east_priority" if observation.emergency_vehicle.present else "normal_cycle",
        cycle_second=24,
        north_queue=observation.queues.north,
        south_queue=observation.queues.south,
        east_queue=observation.queues.east,
        west_queue=observation.queues.west,
        pedestrian_request=observation.pedestrian_waiting,
        emergency_priority=observation.emergency_vehicle.present,
        congestion_level=observation.congestion_level,
        source=observation.source
    )
    events = build_events(observation)
    session.add(status)
    session.add_all(events)
    session.commit()
    session.refresh(status)
    for event in events:
        session.refresh(event)
    return status, events


def ensure_scenario_snapshot(session: Session, observation: VisionObservation) -> tuple[models.IntersectionStatus, list[models.TrafficEvent]]:
    status = session.scalar(
        select(models.IntersectionStatus)
        .where(models.IntersectionStatus.intersection_id == observation.intersection_id)
        .where(models.IntersectionStatus.captured_at == observation.captured_at)
        .where(models.IntersectionStatus.source == observation.source)
        .order_by(desc(models.IntersectionStatus.id))
    )
    events = list(session.scalars(
        select(models.TrafficEvent)
        .where(models.TrafficEvent.intersection_id == observation.intersection_id)
        .where(models.TrafficEvent.occurred_at == observation.captured_at)
        .where(models.TrafficEvent.source == observation.source)
        .order_by(models.TrafficEvent.id)
    ))
    if status is None or not events:
        return load_scenario_snapshot(session, observation)
    return status, events


def status_to_payload(status: models.IntersectionStatus) -> dict[str, object]:
    return {
        "intersection_id": status.intersection_id,
        "captured_at": status.captured_at.isoformat(),
        "signal_phase": status.signal_phase,
        "cycle_second": status.cycle_second,
        "queues": {
            "north": status.north_queue,
            "south": status.south_queue,
            "east": status.east_queue,
            "west": status.west_queue
        },
        "pedestrian_request": status.pedestrian_request,
        "emergency_priority": status.emergency_priority,
        "congestion_level": status.congestion_level,
        "source": status.source
    }


def event_to_payload(event: models.TrafficEvent) -> dict[str, object]:
    return {
        "id": event.id,
        "intersection_id": event.intersection_id,
        "occurred_at": event.occurred_at.isoformat(),
        "direction": event.direction,
        "event_type": event.event_type,
        "severity": event.severity,
        "object_count": event.object_count,
        "ai_summary": event.ai_summary,
        "recommendation": event.recommendation,
        "status": event.status,
        "source": event.source
    }


def create_recommendation(
    session: Session,
    observation: VisionObservation,
    action: RecommendationAction,
    plan: dict[str, object],
    evidence: dict[str, object],
    trigger_event_id: int | None
) -> models.SignalRecommendation:
    ensure_intersection(session, observation)
    recommendation = models.SignalRecommendation(
        intersection_id=observation.intersection_id,
        created_at=datetime.now(SEOUL),
        trigger_event_id=trigger_event_id,
        recommended_action=action.value,
        recommended_plan_json=plan,
        evidence_json=evidence,
        safety_boundary=SAFETY_BOUNDARY,
        status="proposed"
    )
    session.add(recommendation)
    session.commit()
    session.refresh(recommendation)
    return recommendation


def recommendation_to_payload(recommendation: models.SignalRecommendation) -> dict[str, object]:
    return {
        "id": recommendation.id,
        "intersection_id": recommendation.intersection_id,
        "created_at": recommendation.created_at.isoformat(),
        "action": recommendation.recommended_action,
        "recommended_plan": recommendation.recommended_plan_json,
        "evidence": recommendation.evidence_json,
        "safety_boundary": recommendation.safety_boundary,
        "status": recommendation.status
    }


def create_simulation_run(session: Session, observation: VisionObservation, comparison: SimulationComparison) -> models.SimulationRun:
    ensure_intersection(session, observation)
    simulation_run = models.SimulationRun(
        intersection_id=observation.intersection_id,
        recommendation_id=None,
        created_at=datetime.now(SEOUL),
        baseline_metrics_json=comparison.baseline.model_dump(),
        recommended_metrics_json=comparison.recommended.model_dump(),
        improvement_summary=f"{comparison.improvement['total_delay_percent']}% total delay reduction in scenario simulation.",
        source=comparison.source
    )
    session.add(simulation_run)
    session.commit()
    session.refresh(simulation_run)
    return simulation_run


def create_chat_log(session: Session, observation: VisionObservation, question: str, answer: str, event_ids: list[int]) -> models.ChatLog:
    ensure_intersection(session, observation)
    chat_log = models.ChatLog(
        intersection_id=observation.intersection_id,
        created_at=datetime.now(SEOUL),
        question=question,
        answer=answer,
        referenced_event_ids_json=event_ids
    )
    session.add(chat_log)
    session.commit()
    session.refresh(chat_log)
    return chat_log


def create_report(session: Session, observation: VisionObservation, summary: str) -> models.Report:
    ensure_intersection(session, observation)
    report = models.Report(
        intersection_id=observation.intersection_id,
        period_start=observation.captured_at,
        period_end=observation.captured_at,
        summary=summary,
        generated_at=datetime.now(SEOUL)
    )
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


def report_to_payload(report: models.Report) -> dict[str, object]:
    return {
        "id": report.id,
        "intersection_id": report.intersection_id,
        "period_start": report.period_start.isoformat(),
        "period_end": report.period_end.isoformat(),
        "summary": report.summary,
        "generated_at": report.generated_at.isoformat()
    }
```

- [x] **Step 4: Write recommendation tests**

Create `apps/api/tests/test_recommendations.py`:

```python
from app.domain.enums import RecommendationAction
from app.scenarios.data import BLOCKED_SCENARIO, EMERGENCY_SCENARIO, NORMAL_SCENARIO, PEDESTRIAN_SCENARIO
from app.services.recommendations import recommend_signal_action


def test_emergency_vehicle_outranks_queue_congestion() -> None:
    action, plan, evidence = recommend_signal_action(EMERGENCY_SCENARIO)

    assert action == RecommendationAction.EMERGENCY_PRIORITY
    assert plan["east"] == 35
    assert evidence["reason"] == "emergency_vehicle_approach"


def test_intersection_blocked_outranks_ordinary_congestion_and_pedestrians() -> None:
    action, plan, evidence = recommend_signal_action(BLOCKED_SCENARIO)

    assert action == RecommendationAction.ALL_RED_SAFETY
    assert plan["all_red"] == 10
    assert evidence["reason"] == "intersection_blocked"


def test_pedestrian_waiting_is_recommended_without_higher_priority_event() -> None:
    action, plan, evidence = recommend_signal_action(PEDESTRIAN_SCENARIO)

    assert action == RecommendationAction.PEDESTRIAN_PHASE
    assert plan["pedestrian_crossing"] == 20
    assert evidence["reason"] == "pedestrian_waiting"


def test_normal_flow_keeps_default_cycle() -> None:
    action, plan, evidence = recommend_signal_action(NORMAL_SCENARIO)

    assert action == RecommendationAction.MAINTAIN_CYCLE
    assert plan["default_cycle"] == 90
    assert evidence["reason"] == "normal_flow"
```

- [x] **Step 5: Write API routes**

Create `apps/api/app/api/routes.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.adapters.simulation import ScenarioTrafficSimulationAdapter
from app.adapters.vision import ScenarioVisionAnalysisAdapter
from app.db.session import get_session
from app.domain.schemas import ChatRequest, ChatResponse
from app.services.chat import answer_question
from app.services.persistence import (
    create_chat_log,
    create_recommendation,
    create_report,
    create_simulation_run,
    ensure_scenario_snapshot,
    event_to_payload,
    load_scenario_snapshot,
    recommendation_to_payload,
    report_to_payload,
    status_to_payload
)
from app.services.recommendations import recommend_signal_action
from app.services.reports import generate_scenario_report

router = APIRouter()
vision_adapter = ScenarioVisionAnalysisAdapter()
simulation_adapter = ScenarioTrafficSimulationAdapter()


@router.get("/api/intersection/status")
def get_status(scenario_id: str = "emergency", session: Session = Depends(get_session)) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    status, _events = ensure_scenario_snapshot(session, observation)
    return status_to_payload(status)


@router.get("/api/events")
def get_events(scenario_id: str = "emergency", session: Session = Depends(get_session)) -> list[dict[str, object]]:
    observation = vision_adapter.analyze(scenario_id)
    _status, events = ensure_scenario_snapshot(session, observation)
    return [event_to_payload(event) for event in events]


@router.post("/api/scenarios/{scenario_id}/load")
def load_scenario(scenario_id: str, session: Session = Depends(get_session)) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    status, events = load_scenario_snapshot(session, observation)
    return {
        "intersection_id": observation.intersection_id,
        "scenario_id": scenario_id,
        "status_id": status.id,
        "event_ids": [event.id for event in events],
        "status": "loaded"
    }


@router.post("/api/analyze")
def analyze(scenario_id: str = "emergency") -> dict[str, object]:
    return vision_adapter.analyze(scenario_id).model_dump(mode="json")


@router.post("/api/recommend-signal")
def recommend_signal(scenario_id: str = "emergency", session: Session = Depends(get_session)) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    _status, events = ensure_scenario_snapshot(session, observation)
    action, plan, evidence = recommend_signal_action(observation)
    trigger_event_id = events[0].id if events else None
    recommendation = create_recommendation(session, observation, action, plan, evidence, trigger_event_id)
    return recommendation_to_payload(recommendation)


@router.post("/api/simulate-signal")
def simulate_signal(scenario_id: str = "emergency", session: Session = Depends(get_session)) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    comparison = simulation_adapter.compare_signal_plan(scenario_id)
    create_simulation_run(session, observation, comparison)
    return comparison.model_dump()


@router.post("/api/chat")
def chat(request: ChatRequest, scenario_id: str = "emergency", session: Session = Depends(get_session)) -> ChatResponse:
    observation = vision_adapter.analyze(scenario_id)
    _status, events = ensure_scenario_snapshot(session, observation)
    event_ids = [event.id for event in events]
    answer = answer_question(request.question, observation)
    create_chat_log(session, observation, request.question, answer, event_ids)
    return ChatResponse(answer=answer, referenced_event_ids=event_ids)


@router.post("/api/report")
def report(scenario_id: str = "emergency", session: Session = Depends(get_session)) -> dict[str, object]:
    observation = vision_adapter.analyze(scenario_id)
    report_record = create_report(session, observation, generate_scenario_report(observation))
    return report_to_payload(report_record)
```

Modify `apps/api/app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(title="Smart Intersection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [x] **Step 6: Write API flow tests**

Create `apps/api/tests/test_api_flow.py`:

```python
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_session
from app.main import app

engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def override_get_session() -> Generator[Session, None, None]:
    with TestingSessionLocal() as session:
        yield session


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_session] = override_get_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_load_scenario_persists_status_and_events(client: TestClient) -> None:
    response = client.post("/api/scenarios/emergency/load")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "loaded"
    assert payload["status_id"] >= 1
    assert len(payload["event_ids"]) >= 1

    status_response = client.get("/api/intersection/status")
    events_response = client.get("/api/events")

    assert status_response.status_code == 200
    assert status_response.json()["intersection_id"] == "INT-0001"
    assert events_response.status_code == 200
    assert events_response.json()[0]["id"] in payload["event_ids"]


def test_recommend_signal_returns_safety_boundary(client: TestClient) -> None:
    response = client.post("/api/recommend-signal")

    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "emergency_priority"
    assert "No real traffic signal control" in payload["safety_boundary"]


def test_simulate_signal_returns_before_after_metrics(client: TestClient) -> None:
    response = client.post("/api/simulate-signal")

    assert response.status_code == 200
    payload = response.json()
    assert payload["baseline"]["total_delay_seconds"] == 128.4
    assert payload["recommended"]["total_delay_seconds"] == 105.3


def test_chat_references_persisted_events(client: TestClient) -> None:
    response = client.post("/api/chat", json={"question": "Which direction is most congested?"})

    assert response.status_code == 200
    payload = response.json()
    assert "most congested direction" in payload["answer"]
    assert payload["referenced_event_ids"]


def test_report_summarizes_current_scenario(client: TestClient) -> None:
    response = client.post("/api/report")

    assert response.status_code == 200
    payload = response.json()
    assert "10-minute traffic summary" in payload["summary"]
    assert payload["intersection_id"] == "INT-0001"
```

- [x] **Step 7: Run backend service tests**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests -v
```

Expected: health, adapter, recommendation, and API flow tests pass.

- [x] **Step 8: Commit backend API flow**

```bash
git add apps/api/app/api apps/api/app/services apps/api/app/main.py apps/api/tests
git commit -m "feat: add scenario-backed API flow"
```

## Task 5: Frontend Visual Concept Gate

**Files:**
- Create: `docs/design/dashboard-concept-notes.md`
- Create: `docs/design/assets/dashboard-concept-approved.png`

- [x] **Step 1: Use Build Web Apps frontend-app-builder and imagegen skills**

Before implementing the dashboard UI, generate a full dashboard concept image. The concept must show:

```text
top system bar
Korean/English language selector
central four-way digital twin
replaceable simulation viewport treatment
event timeline
Recommendation / AI Agent panel
metrics panel
chat/report panel
recommendation and simulation-only safety boundary
```

The approved visual direction is a glassy translucent panel UI with an Apple-style premium feel, without Apple branding or copied proprietary assets. Keep it calm, operational, and readable; avoid neon cyberpunk styling.

- [x] **Step 2: Ask user to approve visual direction**

Show the concept to the user and ask for approval. Do not implement dashboard UI before approval.

- [x] **Step 3: Record approved visual direction**

After approval, save the approved image as `docs/design/assets/dashboard-concept-approved.png`.

Create `docs/design/dashboard-concept-notes.md`:

```markdown
# Dashboard Concept Notes

Approved concept path: `docs/design/assets/dashboard-concept-approved.png`

Required information architecture:

- Top system bar
- Korean/English language selector
- Central digital twin
- Replaceable simulation viewport treatment
- Event timeline
- Recommendation / AI Agent panel
- Metrics panel
- Chat/report panel
- Recommendation and simulation-only safety boundary

Implementation constraints:

- Use code-native text and controls.
- Use a lightweight frontend dictionary for Korean and English labels in Phase 1.
- Keep backend API identifiers stable and localize labels in the frontend.
- Do not copy the old mockup literally.
- Keep the UI operations-first, not a landing page.
- Keep the central simulation component replaceable for real SUMO/TraCI or another renderer later.
- Preserve the approved Phase 1 API contracts.
```

- [x] **Step 4: Commit approved concept notes**

```bash
git add docs/design/dashboard-concept-notes.md docs/design/assets/dashboard-concept-approved.png
git commit -m "docs: record dashboard visual direction"
```

## Task 6: Frontend Data Types And API Client

**Files:**
- Create: `apps/web/lib/types.ts`
- Create: `apps/web/lib/api.ts`

- [x] **Step 1: Write frontend API types**

Create `apps/web/lib/types.ts`:

```ts
export type Direction = "north" | "south" | "east" | "west";

export type QueueMetrics = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type IntersectionStatus = {
  intersection_id: string;
  captured_at: string;
  signal_phase: string;
  cycle_second: number;
  queues: QueueMetrics;
  pedestrian_request: boolean;
  emergency_priority: boolean;
  congestion_level: string;
  source: string;
};

export type TrafficEvent = {
  id: number;
  intersection_id: string;
  occurred_at: string;
  direction: Direction | null;
  event_type: string;
  severity: "info" | "warning" | "critical";
  object_count: number;
  ai_summary: string;
  recommendation: string;
  status: string;
  source: string;
};

export type Recommendation = {
  id: number;
  intersection_id: string;
  created_at: string;
  action: string;
  recommended_plan: Record<string, number>;
  evidence: Record<string, string | number>;
  safety_boundary: string;
  status: string;
};

export type SimulationComparison = {
  source: string;
  baseline: {
    average_wait_seconds: number;
    total_delay_seconds: number;
    throughput: number;
    emergency_vehicle_clearance_seconds: number;
  };
  recommended: {
    average_wait_seconds: number;
    total_delay_seconds: number;
    throughput: number;
    emergency_vehicle_clearance_seconds: number;
  };
  improvement: Record<string, number>;
};

export type ChatResponse = {
  answer: string;
  referenced_event_ids: number[];
};

export type Report = {
  id: number;
  intersection_id: string;
  period_start: string;
  period_end: string;
  summary: string;
  generated_at: string;
};
```

- [x] **Step 2: Write frontend API client**

Create `apps/web/lib/api.ts`:

```ts
import type { ChatResponse, IntersectionStatus, Recommendation, Report, SimulationComparison, TrafficEvent } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function getIntersectionStatus(): Promise<IntersectionStatus> {
  return requestJson<IntersectionStatus>("/api/intersection/status");
}

export async function getEvents(): Promise<TrafficEvent[]> {
  return requestJson<TrafficEvent[]>("/api/events");
}

export async function recommendSignal(): Promise<Recommendation> {
  return requestJson<Recommendation>("/api/recommend-signal", { method: "POST" });
}

export async function simulateSignal(): Promise<SimulationComparison> {
  return requestJson<SimulationComparison>("/api/simulate-signal", { method: "POST" });
}

export async function askQuestion(question: string): Promise<ChatResponse> {
  return requestJson<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ question })
  });
}

export async function generateReport(): Promise<Report> {
  return requestJson<Report>("/api/report", { method: "POST" });
}
```

- [x] **Step 3: Run frontend type check through build**

Run:

```bash
npm run build:web
```

Expected: TypeScript build succeeds.

- [x] **Step 4: Commit frontend client**

```bash
git add apps/web/lib
git commit -m "feat: add dashboard API client"
```

## Task 7: Frontend Dashboard Implementation And Execution Gate

**Files:**
- Create: `docs/superpowers/plans/2026-06-08-dashboard-ui-implementation.md`
- Create through the Task 7 sub-plan: `apps/web/components/DashboardShell.tsx`
- Create through the Task 7 sub-plan: `apps/web/components/LanguageToggle.tsx`
- Create through the Task 7 sub-plan: `apps/web/components/DigitalTwin.tsx`
- Create through the Task 7 sub-plan: `apps/web/components/EventTimeline.tsx`
- Create through the Task 7 sub-plan: `apps/web/components/RecommendationPanel.tsx`
- Create through the Task 7 sub-plan: `apps/web/components/MetricsPanel.tsx`
- Create through the Task 7 sub-plan: `apps/web/components/ChatReportPanel.tsx`
- Create through the Task 7 sub-plan: `apps/web/lib/i18n.ts`
- Modify through the Task 7 sub-plan: `apps/web/app/page.tsx`
- Modify through the Task 7 sub-plan: `apps/web/app/globals.css`

- [x] **Step 1: Create the dashboard UI implementation plan after concept approval**

After Task 5 is complete, create `docs/superpowers/plans/2026-06-08-dashboard-ui-implementation.md`. That plan must be based on `docs/design/dashboard-concept-notes.md` and must include exact code for:

```text
apps/web/components/DashboardShell.tsx
apps/web/components/LanguageToggle.tsx
apps/web/components/DigitalTwin.tsx
apps/web/components/EventTimeline.tsx
apps/web/components/RecommendationPanel.tsx
apps/web/components/MetricsPanel.tsx
apps/web/components/ChatReportPanel.tsx
apps/web/lib/i18n.ts
apps/web/app/page.tsx
apps/web/app/globals.css
```

The dashboard UI plan must preserve this props contract:

```tsx
import type { ChatResponse, IntersectionStatus, Recommendation, Report, SimulationComparison, TrafficEvent } from "@/lib/types";

export type DashboardShellProps = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  recommendation: Recommendation;
  simulation: SimulationComparison;
  report: Report;
  chat: ChatResponse | null;
  onAskQuestion: (question: string) => Promise<void>;
  onGenerateReport: () => Promise<void>;
  onRefreshRecommendation: () => Promise<void>;
  onRunSimulation: () => Promise<void>;
};
```

The dashboard UI plan must include a lightweight language contract:

```tsx
export type Locale = "ko" | "en";
```

The implemented dashboard must show a `한국어 / EN` language selector, localize visible labels and status copy, and keep API payload identifiers stable.

The central digital twin component should be treated as a replaceable `SimulationViewport` boundary even if the first component name remains `DigitalTwin.tsx`. It must receive normalized dashboard data through props and avoid hard-coding backend calls inside the visualization, so a real simulation renderer can replace it later.

It must also include the exact safety copy required by the approved spec:

```text
Recommendation and simulation only. No real traffic signal control is performed.
```

The dashboard UI implementation plan must include tests or browser checks for this interaction contract:

```text
initial dashboard data loads from the FastAPI routes
language selector switches visible dashboard labels between Korean and English
question input submits to /api/chat and renders the answer
generate report action submits to /api/report and renders the latest summary
refresh recommendation action submits to /api/recommend-signal
run simulation action submits to /api/simulate-signal
the safety boundary remains visible after every action
```

- [x] **Step 2: Execute the dashboard UI implementation plan**

Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute `docs/superpowers/plans/2026-06-08-dashboard-ui-implementation.md` before starting Task 8.

- [x] **Step 3: Commit dashboard UI implementation**

```bash
git add docs/superpowers/plans/2026-06-08-dashboard-ui-implementation.md apps/web
git commit -m "feat: build dashboard UI"
```

## Task 8: End-To-End Local Smoke Test After Dashboard UI Execution

Run this task only after Task 7 has produced and executed the dashboard UI implementation plan. If Task 7 stops after creating the plan, pause execution and get the dashboard UI implementation approved before running this smoke test.

**Files:**
- Modify only if smoke test reveals a concrete bug in already-owned Phase 1 files.

- [x] **Step 1: Start PostgreSQL**

Run:

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

Expected: PostgreSQL container becomes healthy.

- [x] **Step 2: Run backend tests**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests -v
```

Expected: all backend tests pass.

- [x] **Step 3: Run frontend build**

Run:

```bash
npm run build:web
```

Expected: frontend build succeeds.

- [x] **Step 4: Start API**

Run:

```bash
cd apps/api
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Expected: API starts and `/health` returns `{"status":"ok"}`.

- [x] **Step 5: Start web app**

Run in another shell:

```bash
npm --workspace apps/web run dev
```

Expected: Next.js starts on `http://localhost:3000`.

- [x] **Step 6: Browser smoke test**

Use the Browser plugin to open `http://localhost:3000`.

Verify:

```text
dashboard renders
central digital twin is visible
event timeline is visible
Recommendation / AI Agent panel is visible
metrics panel is visible
chat/report panel is visible
safety boundary text is visible
no copy implies real traffic signal control
```

- [x] **Step 7: Commit smoke-test fixes**

If smoke testing required code changes:

```bash
git add apps/api apps/web
git commit -m "fix: pass local dashboard smoke test"
```

If no changes were required, do not create an empty commit.

## Task 9: Phase 2 Readiness Notes

**Files:**
- Create: `docs/superpowers/plans/2026-06-08-phase-2-integration-notes.md`

- [x] **Step 1: Record adapter replacement path**

Create `docs/superpowers/plans/2026-06-08-phase-2-integration-notes.md`:

```markdown
# Phase 2 Integration Notes

## Vision Adapter Replacement

Replace `ScenarioVisionAnalysisAdapter` with a YOLO/OpenCV implementation that returns the existing `VisionObservation` schema.

Required preserved contract:

- `source`
- `intersection_id`
- `captured_at`
- `objects`
- `queues`
- `pedestrian_waiting`
- `emergency_vehicle`
- `intersection_blocked`
- `congestion_level`

## Simulation Adapter Replacement

Replace `ScenarioTrafficSimulationAdapter` with a SUMO/TraCI implementation that returns the existing `SimulationComparison` schema.

Required preserved contract:

- `source`
- `baseline`
- `recommended`
- `improvement`

## API Stability Rule

Do not change dashboard API response shapes during Phase 2 unless real YOLO or SUMO data proves a missing field. If a new field is needed, add it as an optional field first and update frontend types in the same task.

## AI/RAG Rule

Do not add OpenAI, pgvector, or RAG until Phase 1 data contracts are stable and the user approves API-key setup plus current model and pricing verification.
```

- [x] **Step 2: Commit Phase 2 notes**

```bash
git add docs/superpowers/plans/2026-06-08-phase-2-integration-notes.md
git commit -m "docs: add phase two integration notes"
```

## Final Validation Checklist

Before claiming Phase 1 implementation is complete, run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests -v
npm run build:web
docker compose -f infra/docker-compose.yml ps
```

Then run a Browser smoke test against `http://localhost:3000` with the API running at `http://127.0.0.1:8000`.

Completion evidence must include:

- backend test output showing all tests passed
- frontend build output showing success
- browser smoke-test observations
- confirmation that safety-boundary copy is visible
- confirmation that no UI copy implies real traffic signal control
- current git status
