# Runtime Setup Runbook

Use this runbook only after the user approves the relevant runtime, API-key, or
database setup. It exists to clear the remaining unchecked gates without
guesswork.

Do not commit secrets. Do not paste API keys into docs, tests, logs, screenshots,
or chat output. Keep `.env` local.

## Current Gate Status

Current as of 2026-06-10 15:10 KST:

- [x] Real YOLO/OpenCV inference is verified locally with OpenCV
  4.13.0.92, Ultralytics 8.4.62, local ignored
  `apps/api/models/yolov8n.pt`, strict vision readiness, and
  `/api/uploads/analyze` returning `observation.source = "opencv_yolo"`.
- [x] Real SUMO/TraCI execution is verified locally with packaged SUMO 1.27.0,
  TraCI/sumolib 1.27.0, `apps/api/networks/intersection.sumocfg`, strict
  simulation readiness, and `/api/simulate-signal` returning
  `source = "sumo_traci"`.
- [x] OpenAI client boundary is mocked and tested without secrets or live calls.
- [x] Live OpenAI client calls are intentionally deferred until the user buys
  API credits and sets `OPENAI_API_KEY` plus `OPENAI_MONTHLY_BUDGET_USD`.
- [x] OpenAI API pricing guidance is re-checked against official docs.
- [x] OpenAI monthly budget readiness guard is implemented without live calls.
- [x] The pgvector-backed `/api/chat` path also enforces
  `OPENAI_MONTHLY_BUDGET_USD` before creating a live OpenAI embedding client.
- [x] The pgvector Python package is installed locally.
- [x] Current local pgvector readiness is green.
  The local Docker PostgreSQL container is healthy, Alembic is at head,
  `vector` is present in `pg_extension`, `knowledge_chunks` exists, strict
  pgvector readiness passes, and a local pgvector retrieval smoke returns the
  expected emergency-priority guide.

Run this anytime to see the current local state:

```bash
npm run runtime:readiness
```

Latest local re-check at `2026-06-10 15:10 KST`:

- `npm run runtime:readiness` reports `openai ready=False` because
  `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD` are missing.
- `npm run runtime:readiness:strict -- --section pgvector` reports
  `pgvector ready=True mode=database`.
- `npm run runtime:readiness:strict -- --section openai` fails for the same
  OpenAI key and budget prerequisites.
- `npm run openai:smoke` fails before constructing a live client, as intended,
  until both OpenAI gate values are present.
- `KNOWLEDGE_SEARCH_MODE=pgvector` also refuses to create a live OpenAI
  embedding client if `OPENAI_MONTHLY_BUDGET_USD` is missing.
- `docker compose -f infra/docker-compose.yml ps postgres` shows
  `smart-intersection-postgres` healthy on `pgvector/pgvector:pg16`.
- Direct database verification returns `vector` from `pg_extension`, and a
  1536-dimensional local embedding smoke returns `emergency-priority-guide`.

After an approved gate is expected to be complete, use the strict command to
make missing requirements fail the shell step:

```bash
npm run runtime:readiness:strict
```

For one approved gate, scope strict mode to that section so unrelated
approval-gated work does not block the check:

```bash
npm run runtime:readiness:strict -- --section vision
npm run runtime:readiness:strict -- --section simulation
npm run runtime:readiness:strict -- --section openai
npm run runtime:readiness:strict -- --section pgvector
```

The HTTP readiness endpoint accepts the same section names for smoke checks:

```text
GET /api/runtime/readiness?section=vision
GET /api/runtime/readiness?section=simulation
GET /api/runtime/readiness?section=openai
GET /api/runtime/readiness?section=pgvector
```

## Gate 1: YOLO/OpenCV Inference

Approval required before installing optional dependencies or downloading model
weights.

- [x] Approve local vision runtime setup.
- [x] Install the vision extra:

```bash
apps/api/.venv/bin/python -m pip install -e "apps/api[vision]"
```

- [x] Place model weights at the configured path, or update `.env`:

```dotenv
VISION_ANALYSIS_MODE=opencv_yolo
YOLO_MODEL_PATH=models/yolov8n.pt
YOLO_CONFIDENCE_THRESHOLD=0.25
```

- [x] Verify readiness no longer reports missing `cv2`, `ultralytics`, or the
  model file.
- [x] Run strict section verification:

```bash
npm run runtime:readiness:strict -- --section vision
```

- [x] Run the adapter tests:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_adapters.py -v
```

- [x] Run a live sample upload with `VISION_ANALYSIS_MODE=opencv_yolo`.
- [x] Confirm the upload result returns `observation.source = "opencv_yolo"`.
- [x] Update these checkboxes after the live inference evidence exists:
  - `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md`
  - `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md`
  - `docs/superpowers/plans/2026-06-08-phase-2-integration-notes.md`
  - `README.md`

## Gate 2: SUMO/TraCI Execution

Approval required before installing binaries or adding network files.

- [x] Approve local SUMO/TraCI runtime setup.
- [x] Install the simulation extra:

```bash
apps/api/.venv/bin/python -m pip install -e "apps/api[simulation]"
```

- [x] Install SUMO binaries for this machine. This checkout uses the official
  `eclipse-sumo` Python package included in `apps/api[simulation]`, which
  provides packaged `sumo` and `netconvert` binaries.
- [x] Verify binaries are available:

```bash
apps/api/.venv/bin/sumo --version
apps/api/.venv/bin/netconvert --version
```

- [x] Add or point to a real SUMO config file, then update `.env`:

```dotenv
SUMO_SIMULATION_MODE=sumo_traci
SUMO_BINARY=sumo
SUMO_CONFIG_PATH=networks/intersection.sumocfg
SUMO_STEP_COUNT=300
```

- [x] Verify readiness no longer reports missing `traci`, `sumolib`, `sumo`,
  `netconvert`, or the SUMO config.
- [x] Run strict section verification:

```bash
npm run runtime:readiness:strict -- --section simulation
```

- [x] Run the simulation adapter tests:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_adapters.py -v
```

- [x] Run `/api/simulate-signal` with `SUMO_SIMULATION_MODE=sumo_traci`.
- [x] Confirm the response keeps the same `SimulationComparison` shape and
  returns `source = "sumo_traci"`.
- [x] Update the docs checkboxes after a live SUMO run is proven.

## Gate 3: OpenAI Client Calls

Approval required before setting `OPENAI_API_KEY` or calling external APIs.
This gate is deferred as of 2026-06-09; the user will buy OpenAI API credits
and add the key/budget values later.

- [x] Approve mocked OpenAI client-boundary setup without live external API
  calls.
- [x] Re-check current official OpenAI docs for model, Responses API, and
  embedding guidance before adding the mocked client boundary.
- [x] Re-check pricing guidance before approved live API calls or production use.
- [x] Install the AI extra:

```bash
apps/api/.venv/bin/python -m pip install -e "apps/api[ai]"
```

- [x] Mark local environment setup as deferred until OpenAI API credits are
  purchased.
- [ ] Future step: set local environment values in `.env`:

```dotenv
OPENAI_MODEL=gpt-5.5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536
OPENAI_MONTHLY_BUDGET_USD=...
OPENAI_API_KEY=...
```

- [x] Verify readiness no longer reports missing `openai`.
- [ ] Verify readiness no longer reports missing `OPENAI_API_KEY`.
- [ ] Verify readiness no longer reports missing `OPENAI_MONTHLY_BUDGET_USD`
  after the project spend limit is approved.
- [ ] Run strict section verification:

```bash
npm run runtime:readiness:strict -- --section openai
```

- [x] Add a minimal OpenAI client boundary that can be tested without returning
  or logging secrets.
- [x] Add tests that mock the client boundary and keep instructions scoped to
  provided scenario and policy evidence.
- [x] Add a non-secret monthly budget setting to readiness before live calls.
- [x] Add a guarded live OpenAI smoke command that refuses to run without
  `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD`:

```bash
npm run openai:smoke
```

- [x] Enforce `OPENAI_MONTHLY_BUDGET_USD` before pgvector chat creates a live
  OpenAI embedding client.
- [ ] Future step: run one approved live API smoke call.
- [ ] Future step: update docs checkboxes after live API evidence exists.

2026-06-09 live-readiness evidence:

- `npm run runtime:readiness:strict -- --section openai` failed as expected
  because local environment values are still missing:
  `OPENAI_API_KEY`, `OPENAI_MONTHLY_BUDGET_USD`.
- `npm run openai:smoke` is expected to fail until those values exist; it does
  not print secrets when it runs, and currently reports both missing gate values
  before constructing a live OpenAI client.
- No live OpenAI API call was attempted without those values.
- Per user direction, this missing live-key step is deferred rather than a
  blocker for the current build handoff.

Pricing evidence checked on 2026-06-09:

- Official API pricing lists `gpt-5.5` standard short-context rates at
  $5.00 input, $0.50 cached input, and $30.00 output per 1M tokens.
- Official API pricing lists `text-embedding-3-small` at $0.02 per 1M input
  tokens.
- Official pricing guidance says API usage is billed separately from ChatGPT
  subscriptions, and spending should be monitored through the usage dashboard
  or billing settings before live usage.

## Gate 4: pgvector And Embedding Search

Approval required before enabling database extensions or adding vector columns.

- [x] Approve target database setup.
- [x] Install the AI extra if it is not already installed:

```bash
apps/api/.venv/bin/python -m pip install -e "apps/api[ai]"
```

- [x] Current local PostgreSQL is running and the existing schema is applied:

```bash
docker compose -f infra/docker-compose.yml up -d postgres
cd apps/api
.venv/bin/alembic upgrade head
```

- [x] Enable and verify the PostgreSQL `vector` extension in the approved target
  database for the current local runtime.
- [x] Verify `/api/runtime/readiness` no longer reports missing `pgvector`.
- [x] Verify `/api/runtime/readiness` no longer reports missing
  `PostgreSQL vector extension`.
- [x] Run strict section verification:

```bash
npm run runtime:readiness:strict -- --section pgvector
```

- [x] Add an Alembic migration for vector columns only after the extension is
  verified.
- [x] Replace local keyword scoring with pgvector-backed embedding search.
- [x] Keep deterministic recommendation category selection in backend rules.
- [x] Add tests for embedding retrieval and no-invented-evidence behavior.
- [x] Update docs checkboxes after current pgvector readiness is proven again.

2026-06-09 pgvector evidence:

- `infra/docker-compose.yml` now uses `pgvector/pgvector:pg16`; plain
  `postgres:16` failed because `vector.control` was not installed.
- `.venv/bin/alembic upgrade head` applied
  `0002_pgvector_knowledge`.
- `npm run runtime:readiness:strict -- --section pgvector` passed.
- Direct database verification returned `extname = vector`, and
  `knowledge_chunks.embedding` is a PostgreSQL `vector` column.
- A local pgvector retrieval smoke using 1536-dimensional fake embeddings
  returned `emergency-priority-guide` for an ambulance-priority query without
  calling OpenAI.
- `KNOWLEDGE_SEARCH_MODE=pgvector` enables pgvector-backed retrieval; it still
  requires `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD` before live
  embeddings can run.
- Current local re-check at `2026-06-10 15:10 KST` reproduced the green
  pgvector gate with Docker Desktop running, the PostgreSQL container healthy,
  Alembic at head, `extname = vector`, `knowledge_chunks` present, strict
  pgvector readiness passing, and a local policy retrieval smoke returning
  `emergency-priority-guide`.

## Final Verification Before Completion

Run the full validation set after any gate changes:

```bash
npm run verify
```

After all approved runtime gates are expected to be ready, also run:

```bash
npm run runtime:readiness:strict
```

For a single approved gate, use the matching `--section` command above and keep
the other approval-gated checkboxes unchecked until their own evidence exists.

The goal is not complete until every unchecked runtime gate above has direct
evidence from the target runtime, database, or approved external API.
