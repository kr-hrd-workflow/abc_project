# Smart Intersection Decision-Support MVP Design

## Status

Approved design direction: C - build `Next.js + FastAPI + PostgreSQL` first, with mocked YOLO and SUMO outputs behind replaceable adapter boundaries.

This design is based on:

- `doc/8기_워크플로우팀_수행계획서_정귀인_260601.pdf`
- `doc/smart_city_ai_final_plan.md`
- User approval that stack direction C is acceptable, with the requirement that mocks stay on track for later real integrations.

No real traffic signal control is in scope for this MVP. The product must present recommendations and simulation-only outcomes.

## Product Goal

Build a public traffic-control decision-support dashboard for a four-way smart-city intersection. The system helps an operator understand current traffic conditions, inspect event evidence, review rule-based signal recommendations with AI-ready explanations, compare simulated signal-plan outcomes, ask natural-language questions, and generate a short traffic situation report.

The first build must be useful as a working demo while preserving a direct path to the original project plan:

```text
sample scenario data
-> mocked vision and simulation adapters
-> normalized traffic events and intersection status
-> PostgreSQL persistence
-> rule-based recommendation service
-> dashboard, report, and chat surfaces
-> later replacement with real YOLO/OpenCV and SUMO/TraCI integrations
```

## Scope

### Phase 1 MVP

Phase 1 must deliver a working web application and backend with realistic scenario data:

- Next.js dashboard UI.
- Korean/English language selection in the dashboard UI.
- FastAPI backend API.
- PostgreSQL database.
- Seeded scenario data for at least one intersection.
- Mocked `vision_analysis` adapter that returns YOLO-shaped object and queue metrics.
- Mocked `traffic_simulation` adapter that returns SUMO-shaped before/after metrics.
- Normalized traffic event creation and storage.
- Rule-based signal recommendation service.
- Simulation comparison result display.
- 10-minute report generation from stored scenario data.
- Chat/Q&A endpoint using stored status, events, recommendations, and reports.
- Clear UI copy showing recommendations are not real signal-control commands.

### Phase 2 Planned Integrations

Phase 2 replaces mocked adapters without changing dashboard contracts:

- Real YOLO/OpenCV analysis for uploaded sample image or short video.
- Real SUMO/TraCI simulation for queue length, waiting time, throughput, and recommended-plan comparison.
- Replacement of the central dashboard simulation viewport with a real simulation renderer while preserving surrounding dashboard API contracts.
- File upload and analysis job status.
- More complete event ingestion from real analysis outputs.

### Phase 3 Planned AI/RAG Enhancements

Phase 3 adds stronger AI evidence and retrieval:

- pgvector extension.
- Policy/operation-guide document chunks.
- Event/report embeddings.
- RAG-backed evidence lookup.
- Configurable OpenAI model selection after checking current official OpenAI docs and project budget.
- VLM scene summary for representative frames only, not every frame.

### Explicitly Out Of Scope For MVP

- Real traffic signal controller integration.
- Real CCTV streaming.
- Real emergency-vehicle network integration.
- Reinforcement-learning signal control.
- Large custom model training.
- Unity traffic physics simulation.
- CARLA-based autonomous-driving simulation.

Unity remains optional presentation support only.

## System Architecture

```text
Operator Browser
    |
    v
Next.js Dashboard
    |
    v
FastAPI Backend
    |
    +--> PostgreSQL
    +--> Scenario Data Loader
    +--> Vision Analysis Adapter
    |       +--> Phase 1: seeded/mock YOLO-shaped output
    |       +--> Phase 2: real OpenCV + YOLO output
    +--> Traffic Simulation Adapter
    |       +--> Phase 1: seeded/mock SUMO-shaped output
    |       +--> Phase 2: real SUMO + TraCI output
    +--> Event Service
    +--> Recommendation Service
    +--> Report Service
    +--> Chat Service
```

## Frontend Design

The dashboard does not have to copy the provided mockup. The mockup is an information-architecture reference only.

The first usable screen should be an operations dashboard, not a marketing or landing page. It should prioritize scan speed, clear operator hierarchy, and safe decision support.

Required dashboard regions:

- Top system bar:
  - intersection ID/name
  - current scenario time
  - analysis status
  - connection/data freshness status
  - compact Korean/English language selector
- Central digital twin:
  - four-way intersection
  - current signal phase
  - queue lengths by direction
  - pedestrian waiting state
  - emergency vehicle approach marker when scenario includes it
  - replaceable simulation viewport boundary for future real SUMO/TraCI or another renderer
- Event timeline:
  - recent events ordered by time
  - severity
  - direction
  - event type
  - short summary
- Recommendation / AI Agent panel:
  - current situation
  - recommended action
  - evidence
  - permission boundary: recommendation and simulation only
- Metrics panel:
  - queue length by direction
  - congestion level
  - average waiting time
  - fixed-plan vs recommended-plan comparison
- Chat/report panel:
  - user question input
  - answer area
  - generate report action
  - latest report summary

Frontend visual direction is the approved glassy translucent panel concept at `docs/design/assets/dashboard-concept-approved.png`. Any implementation must preserve this information architecture unless the user approves a change.

Language behavior:

- Phase 1 uses a lightweight frontend text dictionary for Korean and English.
- The operator can switch between Korean and English without changing backend API contracts.
- API payload values remain stable identifiers where they are part of the contract; the frontend maps them to localized labels.
- Do not add a full i18n framework unless the UI grows beyond the first dashboard screen.

## Backend Design

FastAPI owns the domain workflow and exposes stable APIs to the dashboard.

Required API surface for Phase 1:

```text
GET  /api/intersection/status
GET  /api/events
POST /api/scenarios/{scenario_id}/load
POST /api/analyze
POST /api/recommend-signal
POST /api/simulate-signal
POST /api/chat
POST /api/report
```

WebSocket events are useful but optional for Phase 1. If added later, the REST APIs remain the source of truth for initial implementation.

## Database Design

Use PostgreSQL from the beginning so the MVP does not outgrow local-only storage.

Required tables:

```text
intersections
- id
- name
- location_label
- created_at

intersection_status
- id
- intersection_id
- captured_at
- signal_phase
- cycle_second
- north_queue
- south_queue
- east_queue
- west_queue
- pedestrian_request
- emergency_priority
- congestion_level
- source

traffic_events
- id
- intersection_id
- occurred_at
- direction
- event_type
- severity
- object_count
- ai_summary
- recommendation
- status
- source

signal_recommendations
- id
- intersection_id
- created_at
- trigger_event_id
- recommended_action
- recommended_plan_json
- evidence_json
- safety_boundary
- status

simulation_runs
- id
- intersection_id
- recommendation_id
- created_at
- baseline_metrics_json
- recommended_metrics_json
- improvement_summary
- source

chat_logs
- id
- intersection_id
- created_at
- question
- answer
- referenced_event_ids_json

reports
- id
- intersection_id
- period_start
- period_end
- summary
- generated_at
```

The JSON columns preserve Phase 1 speed while allowing Phase 2 adapters to store richer YOLO/SUMO output without forcing a premature schema expansion.

## Adapter Contracts

### Vision Analysis Adapter

The adapter returns normalized traffic observations, regardless of whether the source is seeded data or real YOLO.

Required output shape:

```json
{
  "source": "scenario_mock",
  "intersection_id": "INT-0001",
  "captured_at": "2026-06-08T10:24:30+09:00",
  "objects": {
    "car": 42,
    "bus": 2,
    "truck": 4,
    "person": 8,
    "traffic_light": 4
  },
  "queues": {
    "north": 32,
    "south": 11,
    "east": 18,
    "west": 8
  },
  "pedestrian_waiting": true,
  "emergency_vehicle": {
    "present": true,
    "direction": "east",
    "estimated_arrival_seconds": 21
  },
  "intersection_blocked": false,
  "congestion_level": "high"
}
```

### Traffic Simulation Adapter

The adapter returns fixed-plan and recommended-plan comparison metrics, regardless of whether the source is seeded data or real SUMO/TraCI.

Required output shape:

```json
{
  "source": "scenario_mock",
  "baseline": {
    "average_wait_seconds": 68,
    "total_delay_seconds": 128.4,
    "throughput": 1246,
    "emergency_vehicle_clearance_seconds": 45
  },
  "recommended": {
    "average_wait_seconds": 56,
    "total_delay_seconds": 105.3,
    "throughput": 1298,
    "emergency_vehicle_clearance_seconds": 24
  },
  "improvement": {
    "total_delay_percent": 18.0,
    "average_wait_delta_seconds": -12,
    "emergency_clearance_delta_seconds": -21
  }
}
```

## Recommendation Rules

Phase 1 uses deterministic rules before adding LLM-based explanation:

```text
if emergency_vehicle.present:
    recommend emergency direction priority signal
elif intersection_blocked:
    recommend all-red safety phase
elif any direction queue exceeds threshold:
    recommend green extension for congested axis
elif pedestrian waiting time exceeds threshold:
    recommend pedestrian crossing phase insertion
else:
    recommend maintaining default signal cycle
```

The AI explanation can summarize and phrase the recommendation, but the safety-sensitive recommendation category must come from deterministic backend rules in Phase 1.

## AI Boundaries

Phase 1 may use deterministic local summaries for chat and reports. After API-key setup and current model/pricing verification are approved, the AI layer may:

- summarize the current situation
- answer questions using current status and recent events
- explain recommendation evidence
- generate a 10-minute report
- improve presentation wording

The AI layer must not:

- send real signal-control commands
- call external government or emergency systems
- delete source traffic logs
- invent unavailable sensor evidence
- present a recommendation as an executed real-world action

OpenAI model names, pricing, and availability must be verified against current official OpenAI docs before implementation or deployment. The code should use environment configuration for model selection rather than hardcoding a planning-document model slug.

## Build Status Checklist

Current as of 2026-06-09 after reading the Superpowers docs and current
source/tests.

### Phase 1 MVP

- [x] Create repository structure for `apps/web`, `apps/api`, and
  `infra/docker-compose.yml`; `packages/shared` remains intentionally absent.
- [x] Define backend domain schemas, SQLAlchemy models, and Alembic migration.
- [x] Add PostgreSQL local development setup and `.env.example` defaults.
- [x] Implement seeded scenario data for emergency, pedestrian, normal, and
  blocked-intersection flows.
- [x] Implement replaceable `VisionAnalysisAdapter` and
  `TrafficSimulationAdapter` interfaces with scenario-backed adapters.
- [x] Implement backend services and APIs for scenario load, status, events,
  analyze, recommend, simulate, chat, and report.
- [x] Implement the bilingual dashboard shell, digital twin boundary, event
  timeline, recommendation panel, metrics panel, chat/report panel, and safety
  copy.
- [x] Connect the dashboard to backend API calls for initial load, chat, report,
  recommendation refresh, and simulation refresh.
- [x] Validate Phase 1 with fresh automated checks:
  `apps/api/.venv/bin/python -m pytest apps/api/tests -v`,
  `npm --workspace apps/web run test`, and `npm run build:web`.
- [x] Run a fresh live browser smoke and visual-fidelity screenshot comparison.
  Evidence: Browser check at `http://localhost:3000` on 2026-06-09 verified
  page identity, nonblank dashboard content, no console errors/warnings,
  language toggle, chat, report, simulation action, and visible safety copy.

### Phase 2 Integration

- [x] Plan the adapter replacement path while preserving dashboard API
  contracts.
- [x] Add fixture-only image/video ingestion endpoints:
  `GET /api/fixtures` and `POST /api/fixtures/{fixture_id}/ingest`.
- [x] Add `OpenCVYoloVisionAnalysisAdapter` as the current YOLO/OpenCV adapter
  seam, backed by fixture analysis rather than a real runtime.
- [x] Add contract tests for fixture ingestion and the YOLO-shaped
  `VisionObservation` output.
- [x] Add sample upload handling and analysis job status.
- [ ] Add real OpenCV/YOLO dependency, model/runtime configuration, and
  inference after separate approval for dependency/runtime work.
  - [x] Add optional API `vision` dependencies for OpenCV and Ultralytics.
  - [x] Add `VISION_ANALYSIS_MODE`, `YOLO_MODEL_PATH`, and
    `YOLO_CONFIDENCE_THRESHOLD` runtime configuration.
  - [x] Add `OpenCVYoloFrameAnalyzer` and tests that map YOLO box output into
    the existing `VisionObservation` contract.
  - [x] Add `/api/runtime/readiness` checks for OpenCV, Ultralytics, and model
    file availability without importing the optional runtime.
  - [x] Add `docs/runtime-setup.md` with approval and validation checkboxes for
    live YOLO/OpenCV setup.
  - [x] Add `python -m app.cli.runtime_readiness` as the canonical local
    readiness command.
  - [ ] Install and verify real OpenCV/Ultralytics/model weights in the target
    runtime before marking real inference complete.
- [x] Implement `SumoTraciTrafficSimulationAdapter` behind the existing
  `TrafficSimulationAdapter` interface. This is the recommended next build
  slice.
- [x] Add contract tests that compare SUMO output against the existing
  `SimulationComparison` schema.
- [ ] Replace fixture-backed SUMO metrics with real SUMO/TraCI execution after
  dependency/runtime setup.
  - [x] Add optional API `simulation` dependencies for TraCI and sumolib.
  - [x] Add `SUMO_SIMULATION_MODE`, `SUMO_BINARY`, `SUMO_CONFIG_PATH`, and
    `SUMO_STEP_COUNT` runtime configuration.
  - [x] Add `TraciSumoSimulationRunner` and tests that collect wait, delay,
    throughput, emergency clearance, and recommended-plan metrics from a TraCI
    module.
  - [x] Add `/api/runtime/readiness` checks for TraCI, sumolib, SUMO binaries,
    netconvert, and configured SUMO network file availability.
  - [x] Add `docs/runtime-setup.md` with approval and validation checkboxes for
    live SUMO/TraCI setup.
  - [ ] Install and verify the SUMO binary/network config in the target runtime
    before marking real SUMO execution complete.
- [x] Replace the center simulation viewport renderer while preserving
  surrounding dashboard props and API payload shapes.

### Phase 3 AI/RAG

- [ ] Add pgvector only after event/report contracts settle.
  - [x] Add optional API `ai` dependencies for `openai` and `pgvector`.
  - [x] Add `/api/runtime/readiness` checks for the pgvector Python module and
    target-database vector extension verification status.
  - [x] Wire the pgvector readiness check to inspect `pg_extension` on the
    configured database when it is reachable, without enabling the extension.
  - [x] Add `docs/runtime-setup.md` with approval and validation checkboxes for
    pgvector setup and embedding search.
  - [ ] Enable PostgreSQL `vector` extension and vector columns after target
    database setup is approved and verified.
- [x] Add policy and operation-guide document ingestion.
- [x] Add local RAG-style policy evidence retrieval for chat answers.
  - [x] Retrieve policy chunks for emergency priority, pedestrian safety, and
    blocked-intersection guidance without external API calls.
  - [ ] Replace local keyword scoring with pgvector-backed embedding search
    after database extension and embedding setup are verified.
- [ ] Add configurable OpenAI model and prompt settings only after API-key setup
  approval and current official OpenAI docs verification.
  - [x] Verify official docs for `gpt-5.5` and Responses API guidance on
    2026-06-09 via `developers.openai.com`.
  - [x] Add `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL`, and
    `OPENAI_EMBEDDING_DIMENSIONS` runtime configuration.
  - [x] Add `/api/runtime/readiness` checks for OpenAI client package and
    API-key presence without returning secret values.
  - [x] Add `docs/runtime-setup.md` with approval and validation checkboxes for
    OpenAI client setup.
  - [ ] Add an OpenAI client call path only after API-key setup is approved and
    validated.

## Testing Plan

Phase 1 tests:

- Unit test recommendation priority:
  - emergency vehicle outranks queue congestion
  - intersection blocked outranks ordinary congestion
  - pedestrian waiting is recommended when no higher-priority safety event exists
  - normal flow keeps default signal cycle
- Unit test adapters:
  - seeded vision adapter returns required queue and event fields
  - seeded simulation adapter returns baseline and recommended metrics
- API tests:
  - scenario load creates status and events
  - recommend endpoint returns recommendation, evidence, and safety boundary
  - simulate endpoint returns before/after metrics
  - report endpoint summarizes recent events
- Frontend checks:
  - dashboard renders the default scenario
  - recommendation and simulation panels update after user action
  - no UI copy implies real signal control

## Risks And Mitigations

- Risk: mocked adapters become throwaway demo code.
  - Mitigation: define adapter contracts before UI wiring and keep mock output shaped like real YOLO/SUMO outputs.

- Risk: PostgreSQL setup slows early work.
  - Mitigation: use Docker Compose and a single seeded scenario path first.

- Risk: pgvector/RAG expands scope too early.
  - Mitigation: store events/reports first; add pgvector after data contracts stabilize.

- Risk: LLM output invents evidence.
  - Mitigation: deterministic rules own recommendation category; AI only summarizes provided status, events, simulation output, and reports.

- Risk: users think the app controls real signals.
  - Mitigation: UI and API responses consistently label actions as recommendations and simulation-only.

## Acceptance Criteria

The Phase 1 MVP is accepted when:

- A local developer can run the web app, API, and PostgreSQL.
- The dashboard displays a seeded smart-intersection scenario.
- The backend persists intersection status, traffic events, recommendations, simulation runs, chats, and reports.
- The recommendation endpoint returns deterministic recommendation output with evidence and safety boundaries.
- The simulation endpoint returns baseline vs recommended metrics.
- The report endpoint returns a 10-minute-style summary.
- Frontend copy clearly states recommendation/simulation-only authority.
- Tests cover recommendation rules and adapter contracts.
- The architecture has clear replacement points for real YOLO/OpenCV, SUMO/TraCI integrations, and the central simulation viewport renderer.

## Implementation Decisions For The Next Plan

- Frontend framework: keep `Next.js + React + TypeScript` as stated in the project plan and approved C direction.
- Frontend language handling: support Korean and English with a small local dictionary first; avoid adding a new i18n dependency until a larger localization surface exists.
- Backend persistence: use SQLAlchemy 2.x plus Alembic for PostgreSQL migrations.
- Phase 1 chat/report behavior: use deterministic summaries from stored data. Add OpenAI later behind a service interface after API-key setup and current model/pricing verification are approved.
- Frontend visual implementation: before coding the dashboard UI, create and approve a visual concept because the Build Web Apps skill requires concept approval for new dashboard work unless the user explicitly opts out.
- Stack-change rule: any future proposal to replace a planned technology must be presented to the user and approved before implementation.
