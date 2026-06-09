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

## Suggested Phase 2 Order

1. Add a sample upload or fixture ingestion path for image/video inputs.
2. Implement `OpenCVYoloVisionAnalysisAdapter` behind the existing interface.
3. Add tests that compare real-adapter output against `VisionObservation`.
4. Implement `SumoTraciTrafficSimulationAdapter` behind the existing interface.
5. Add tests that compare SUMO output against `SimulationComparison`.
6. Replace the center viewport renderer while preserving dashboard props and API
   payload shapes.

## Implemented Phase 2 Slice: Fixture Ingestion Path

The backend now exposes a fixture-only ingestion path for Phase 2 adapter work:

- `GET /api/fixtures` lists the available image/video sample inputs.
- `POST /api/fixtures/{fixture_id}/ingest` ingests one sample fixture through
  the existing scenario-backed `VisionObservation` contract and persists the
  resulting status/events with `source = "fixture_ingestion_mock"`.

This does not add real YOLO/OpenCV, file upload handling, SUMO/TraCI, OpenAI,
pgvector, RAG, Unity, or frontend framework changes. The next implementation
slice should replace the fixture-backed vision path with an
`OpenCVYoloVisionAnalysisAdapter` while preserving the `VisionObservation`
fields listed above.

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
