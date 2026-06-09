# Phase 2 Integration Notes

## Purpose

Phase 2 replaces scenario-backed adapters with real integrations while keeping
the Phase 1 dashboard and API contracts stable.

Do not add real YOLO/OpenCV, SUMO/TraCI, OpenAI, pgvector, RAG, Unity, or a new
frontend framework without separate user approval.

## Vision Adapter Replacement

Replace `ScenarioVisionAnalysisAdapter` with a YOLO/OpenCV implementation that
returns the existing `VisionObservation` schema.

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

The real adapter may add optional metadata only after real input proves a
contract gap. Keep existing fields stable so current recommendation, report,
chat, and dashboard code continue to work.

## Simulation Adapter Replacement

Replace `ScenarioTrafficSimulationAdapter` with a SUMO/TraCI implementation that
returns the existing `SimulationComparison` schema.

Required preserved contract:

- `source`
- `baseline`
- `recommended`
- `improvement`

The adapter should keep returning fixed-plan and recommended-plan metrics in the
same shape used by `/api/simulate-signal`. If SUMO exposes additional metrics,
add them as optional fields in the backend schema and update frontend types in
the same task.

## Dashboard Simulation Viewport Replacement

The current `DigitalTwin` component is a replaceable simulation viewport
boundary. A real renderer should be introduced behind that boundary instead of
rewiring surrounding dashboard panels.

Preserve these dashboard contracts:

- `DashboardShell` receives normalized `status`, `events`, `recommendation`,
  `simulation`, `report`, and `chat` props.
- The simulation viewport receives dashboard data through props and does not
  call backend APIs directly.
- `apps/web/lib/types.ts` mirrors API payload shapes.
- Safety copy remains visible: recommendation and simulation only, no real
  traffic signal control.

## API Stability Rule

Do not change dashboard API response shapes during Phase 2 unless real YOLO or
SUMO data proves a missing field. If a new field is needed, add it as optional
first and update frontend types, tests, and UI handling in the same task.

## AI/RAG Rule

Do not add OpenAI, pgvector, or RAG until Phase 1 data contracts are stable and
the user approves API-key setup plus current model and pricing verification.

When AI/RAG is approved, deterministic rules still own recommendation category
selection. AI output should summarize provided events, status, simulation
metrics, reports, and policy evidence; it must not invent sensor evidence or
present recommendations as executed real-world actions.

## Phase 2 Tracker

Current as of 2026-06-09.

- [x] Add a fixture ingestion path for image/video sample inputs.
- [x] Implement `OpenCVYoloVisionAnalysisAdapter` behind the existing
  `VisionAnalysisAdapter` interface.
- [x] Add tests that compare YOLO-shaped adapter output against
  `VisionObservation`.
- [x] Add sample upload handling and analysis job status.
- [x] Replace the fixture-backed YOLO detector with real OpenCV/YOLO inference
  after separate approval for dependency/runtime setup.
  - [x] Add optional API `vision` dependencies for `opencv-python-headless` and
    `ultralytics`.
  - [x] Add runtime settings for `VISION_ANALYSIS_MODE`, `YOLO_MODEL_PATH`, and
    `YOLO_CONFIDENCE_THRESHOLD`.
  - [x] Add `OpenCVYoloFrameAnalyzer` with tested YOLO-box-to-observation
    normalization.
  - [x] Add `/api/runtime/readiness` checks for OpenCV, Ultralytics, and model
    file availability without importing the optional runtime.
  - [x] Install/verify OpenCV, Ultralytics, and real model weights in the target
    runtime before marking fixture replacement complete.
- [x] Implement `SumoTraciTrafficSimulationAdapter` behind the existing
  `TrafficSimulationAdapter` interface. This is the recommended next build
  slice because the vision seam already exists.
- [x] Add tests that compare SUMO output against `SimulationComparison`.
- [x] Replace fixture-backed SUMO metrics with real SUMO/TraCI execution after
  approval for SUMO runtime setup.
  - [x] Add optional API `simulation` dependencies for `eclipse-sumo`,
    `traci`, and `sumolib`.
  - [x] Add runtime settings for `SUMO_SIMULATION_MODE`, `SUMO_BINARY`,
    `SUMO_CONFIG_PATH`, and `SUMO_STEP_COUNT`.
  - [x] Add `TraciSumoSimulationRunner` with tested TraCI metric collection.
  - [x] Add `/api/runtime/readiness` checks for TraCI, sumolib, SUMO binaries,
    netconvert, and configured SUMO network file availability.
  - [x] Install/verify the SUMO binary and network config in the target runtime
    before marking fixture replacement complete.
- [x] Replace the center viewport renderer while preserving dashboard props and
  API payload shapes.
- [x] Start Phase 3 local policy/RAG groundwork after current OpenAI
  docs/model verification.
  - [x] Add policy and operation-guide document ingestion.
  - [x] Add local policy evidence retrieval for chat answers.
  - [x] Add configurable OpenAI model and embedding settings.
  - [x] Add `/api/runtime/readiness` checks for OpenAI API-key presence and
    pgvector setup status without returning secrets or calling external APIs.
  - [x] Make pgvector readiness inspect the configured database for an enabled
    PostgreSQL `vector` extension when the database is reachable.
  - [x] Add setup-detail text to runtime readiness checks so missing gates point
    to the needed optional dependency, binary, model path, API key, or database
    setup.
  - [x] Add `docs/runtime-setup.md` as the approval-gated checklist for live
    YOLO/OpenCV, SUMO/TraCI, OpenAI, and pgvector setup.
  - [x] Add `python -m app.cli.runtime_readiness` as the canonical local
    readiness command.
  - [x] Add root `npm` scripts for API tests, web tests, runtime readiness, and
    full verification.
  - [x] Add `--fail-on-missing` strict readiness mode and a root strict script
    for future gate completion checks.
  - [x] Add section-scoped strict readiness checks for `vision`, `simulation`,
    `openai`, and `pgvector`.
  - [x] Add section filtering to `/api/runtime/readiness` for targeted HTTP
    smoke checks.
  - [x] Keep OpenAI client calls and pgvector execution out of this slice until
    API-key and target database setup are approved and verified.

## Implemented Phase 2 Slice: Fixture Ingestion Path

The backend now exposes a fixture-only ingestion path for Phase 2 adapter work:

- `GET /api/fixtures` lists the available image/video sample inputs.
- `POST /api/fixtures/{fixture_id}/ingest` ingests one sample fixture through
  the existing `VisionObservation` contract and persists the resulting
  status/events. The endpoint now flows through the fixture-backed
  `OpenCVYoloVisionAnalysisAdapter`, so ingested observations use
  `source = "opencv_yolo"`.

This does not add real YOLO/OpenCV inference, file upload handling, SUMO/TraCI,
OpenAI, pgvector, RAG, Unity, or frontend framework changes. Remaining vision
work is to replace the fixture-backed detector with real OpenCV/YOLO inference
after separate approval for that dependency/runtime setup.

## Implemented Phase 2 Slice: OpenCV/YOLO Adapter Seam

The backend now has an `OpenCVYoloVisionAnalysisAdapter` that implements the
existing `VisionAnalysisAdapter` shape:

- accepts YOLO-shaped frame analysis from a detector object
- normalizes object counts, queue metrics, emergency vehicle metadata,
  pedestrian state, blocked-intersection state, and congestion level
- returns the existing `VisionObservation` contract with `source = "opencv_yolo"`

The fixture-ingestion endpoint now flows through this adapter seam by using a
fixture-backed detector. This keeps the dashboard/API contract stable while
preparing the next slice, where the detector can be replaced with real
OpenCV/YOLO inference after separate approval for that dependency/runtime work.

## Next Implementation Slice: SUMO/TraCI Adapter Seam

Build the SUMO path the same way the YOLO path was advanced: add the backend
adapter boundary and contract tests first, without changing dashboard API
payloads.

**Files:**

- Modify: `apps/api/app/adapters/simulation.py`
- Modify: `apps/api/app/api/routes.py` only if the route needs adapter
  injection or fixture selection.
- Test: `apps/api/tests/test_adapters.py`
- Test: `apps/api/tests/test_api_flow.py` only if route behavior changes.

- [x] Add a `SumoSimulationRunner` protocol that returns SUMO-shaped baseline
  and recommended metrics.
- [x] Add a fixture-backed runner so tests can exercise the adapter seam without
  requiring local SUMO installation.
- [x] Add `SumoTraciTrafficSimulationAdapter` that normalizes runner output to
  the existing `SimulationComparison` schema.
- [x] Keep `/api/simulate-signal` returning the same payload shape:
  `source`, `baseline`, `recommended`, and `improvement`.
- [x] Add adapter contract tests for average wait, total delay, throughput,
  emergency clearance, and improvement fields.
- [x] Run `apps/api/.venv/bin/python -m pytest apps/api/tests/test_adapters.py apps/api/tests/test_api_flow.py -v`.
- [x] Update this tracker after the SUMO seam is implemented.

## Implemented Phase 2 Slice: SUMO/TraCI Adapter Seam

The backend now has a `SumoTraciTrafficSimulationAdapter` that implements the
existing `TrafficSimulationAdapter` shape:

- accepts SUMO-shaped baseline and recommended metrics from a runner object
- uses a fixture-backed runner for local tests, so no local SUMO installation is
  required for this seam
- normalizes output to the existing `SimulationComparison` contract
- keeps `/api/simulate-signal` shape-compatible while returning
  `source = "sumo_traci"`

This does not add a real SUMO/TraCI process, route-file generation, network
connection, or live simulation renderer. Remaining simulation work is to replace
the fixture-backed runner with real SUMO/TraCI execution and then replace the
center viewport renderer without changing surrounding dashboard props.

## Implemented Phase 2 Slice: Upload Handling And Job Status

The backend now exposes a sample upload path before real OpenCV/YOLO inference:

- `POST /api/uploads/analyze` accepts uploaded sample bytes with an image/video
  `Content-Type`
- `GET /api/analysis-jobs/{job_id}` returns analysis job status
- uploaded image samples use the emergency fixture path
- uploaded video samples use the blocked-intersection fixture path
- uploaded analysis still returns the existing `VisionObservation` contract
  through the fixture-backed `OpenCVYoloVisionAnalysisAdapter`

This does not add multipart parsing, durable job persistence, object storage, or
real OpenCV/YOLO inference. Those belong with the real runtime setup after
separate approval.

**Files:**

- Modify: `apps/api/app/api/routes.py`
- Modify: `apps/api/app/scenarios/fixtures.py` only if uploaded samples need a
  reusable payload helper.
- Test: `apps/api/tests/test_api_flow.py`

- [x] Add an upload endpoint for image/video samples.
- [x] Add an analysis job status endpoint.
- [x] Keep uploaded-sample analysis returning the existing `VisionObservation`
  contract.
- [x] Add API tests for accepted upload, rejected media type, and job status.
- [x] Run `apps/api/.venv/bin/python -m pytest apps/api/tests/test_api_flow.py -v`.
- [x] Update this tracker after upload/job status is implemented.

## Remaining Approval-Gated Phase 2 Work

- [x] Replace fixture-backed YOLO detection with real OpenCV/YOLO inference
  after approval for dependency/runtime setup.
  - [x] Runtime configuration, optional dependency metadata, and
    `OpenCVYoloFrameAnalyzer` are implemented.
  - [x] Real OpenCV/Ultralytics installation, model weights, and a live sample
    inference run are verified in this checkout.
- [x] Replace fixture-backed SUMO metrics with real SUMO/TraCI execution after
  approval for SUMO runtime setup.
  - [x] Runtime configuration, optional dependency metadata, and
    `TraciSumoSimulationRunner` are implemented.
  - [x] Local `sumo`/`netconvert` binaries and a real SUMO network/config run
    are verified in this checkout.
- [x] Replace the center viewport renderer while preserving dashboard props and
  API payload shapes.

## Implemented Phase 2 Slice: OpenCV/YOLO Runtime Config And Analyzer

The API now has the first real-runtime vision path behind the existing upload
adapter boundary:

- `apps/api/pyproject.toml` exposes a `vision` optional dependency group for
  `opencv-python-headless` and `ultralytics`
- `.env.example` documents `VISION_ANALYSIS_MODE`, `YOLO_MODEL_PATH`, and
  `YOLO_CONFIDENCE_THRESHOLD`
- `OpenCVYoloFrameAnalyzer` lazily loads OpenCV and Ultralytics only when
  `VISION_ANALYSIS_MODE=opencv_yolo`
- uploaded media still defaults to fixture analysis unless that mode is enabled
- tests verify YOLO box output is normalized into queues, object counts,
  pedestrian state, emergency vehicle detection, and congestion level

Local runtime verification on 2026-06-09 installed the approved vision extra,
verified OpenCV 4.13.0.92 and Ultralytics 8.4.62, downloaded the ignored local
`apps/api/models/yolov8n.pt` weight file, passed strict vision readiness, and
proved `/api/uploads/analyze` can return `observation.source = "opencv_yolo"`
through the live OpenCV/YOLO path.

## Implemented Phase 2 Slice: SUMO/TraCI Runtime Config And Runner

The API now has the first real-runtime simulation path behind the existing
simulation adapter boundary:

- `apps/api/pyproject.toml` exposes a `simulation` optional dependency group
  for `eclipse-sumo`, `traci`, and `sumolib`
- `.env.example` documents `SUMO_SIMULATION_MODE`, `SUMO_BINARY`,
  `SUMO_CONFIG_PATH`, and `SUMO_STEP_COUNT`
- `TraciSumoSimulationRunner` lazily loads TraCI only when
  `SUMO_SIMULATION_MODE=sumo_traci`
- `/api/simulate-signal` still defaults to the fixture-backed runner unless
  that mode is enabled
- tests verify baseline and recommended TraCI runs collect average wait, total
  delay, throughput, emergency clearance, and recommended phase-duration
  application

Local runtime verification on 2026-06-09 installed the approved simulation
extra with packaged SUMO 1.27.0, verified `sumo`, `netconvert`, `traci`, and
`sumolib`, added `apps/api/networks/intersection.sumocfg`, passed strict
simulation readiness, and proved `/api/simulate-signal` can return
`source = "sumo_traci"` through the live TraCI path.

## Implemented Phase 2 Slice: Dashboard Simulation Viewport Renderer

The dashboard center viewport now renders through `SimulationViewport` instead
of keeping the scene embedded directly inside `DigitalTwin`:

- `DashboardShell` passes normalized `simulation`, `status`, `events`, and
  `locale` data down through props
- `DigitalTwin` remains the panel shell and action owner
- `SimulationViewport` owns the renderer surface, queue markers, emergency
  marker, live timestamp, and SUMO/TraCI source/delay telemetry
- no viewport code calls backend APIs directly

This preserves the existing dashboard contracts while making the renderer
replaceable when real SUMO/TraCI execution is approved.

## Implemented Phase 3 Slice: Local Policy Evidence Retrieval

The API now has local Phase 3 evidence-retrieval groundwork without requiring an
OpenAI API key or pgvector runtime:

- `apps/api/app/services/knowledge.py` ingests built-in policy and operation
  guide chunks for emergency priority, pedestrian safety, and blocked
  intersections
- `/api/chat` retrieves relevant policy chunks and appends policy evidence when
  the operator asks evidence-oriented questions
- `apps/api/pyproject.toml` exposes an `ai` optional dependency group for
  future `openai` and `pgvector` work
- `.env.example` documents `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL`, and
  `OPENAI_EMBEDDING_DIMENSIONS`
- official OpenAI docs were checked on 2026-06-09 for `gpt-5.5`,
  Responses API guidance, and embedding-model constraints before adding config

This does not create an OpenAI client, store API keys, call external AI
services, enable the PostgreSQL `vector` extension, or perform live embedding
search. Those remain gated by API-key approval and target database setup.

## Implemented Slice: Runtime Gate Readiness

The API now exposes `/api/runtime/readiness` so operators and agents can see
which optional runtime gates are available before trying live integrations:

- vision readiness checks `cv2`, `ultralytics`, and configured YOLO model file
  presence
- simulation readiness checks `traci`, `sumolib`, configured `sumo` binary,
  `netconvert`, and configured SUMO config file presence
- OpenAI readiness checks client-package availability and API-key presence
  without returning secret values
- pgvector readiness checks Python package availability and inspects the
  configured database for an enabled PostgreSQL `vector` extension when the
  database is reachable
- each readiness check includes setup-detail text for the missing dependency,
  binary, path, API key, or database gate without returning secret values

This does not install OpenCV/Ultralytics, model weights, SUMO, TraCI, OpenAI,
pgvector, or a database extension. It only makes the remaining gates observable.

Use `docs/runtime-setup.md` for the step-by-step approval and validation
checklist before marking any live runtime gate complete.

From `apps/api`, run `.venv/bin/python -m app.cli.runtime_readiness` for the
same DB-aware readiness report used by the runbook.

From the repository root, `npm run runtime:readiness` runs that readiness report
and `npm run verify` runs the full local validation sequence.

Use `npm run runtime:readiness:strict` only when a runtime gate is expected to be
complete; it exits nonzero if any readiness section still has missing
requirements.

For one approved runtime gate, scope the strict check with `--section vision`,
`--section simulation`, `--section openai`, or `--section pgvector`.

The HTTP readiness endpoint accepts the same section values with
`/api/runtime/readiness?section=<gate>`.
