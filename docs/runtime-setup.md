# Runtime Setup Runbook

Use this runbook only after the user approves the relevant runtime, API-key, or
database setup. It exists to clear the remaining unchecked gates without
guesswork.

Do not commit secrets. Do not paste API keys into docs, tests, logs, screenshots,
or chat output. Keep `.env` local.

## Current Gate Status

Current as of 2026-06-09:

- [ ] Real YOLO/OpenCV inference is not verified.
- [x] Real SUMO/TraCI execution is verified locally with packaged SUMO 1.27.0,
  TraCI/sumolib 1.27.0, `apps/api/networks/intersection.sumocfg`, strict
  simulation readiness, and `/api/simulate-signal` returning
  `source = "sumo_traci"`.
- [ ] OpenAI client calls are not verified.
- [ ] PostgreSQL `vector` extension, pgvector columns, and embedding search are
  not verified.

Run this anytime to see the current local state:

```bash
npm run runtime:readiness
```

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

- [ ] Approve local vision runtime setup.
- [ ] Install the vision extra:

```bash
apps/api/.venv/bin/python -m pip install -e "apps/api[vision]"
```

- [ ] Place model weights at the configured path, or update `.env`:

```dotenv
VISION_ANALYSIS_MODE=opencv_yolo
YOLO_MODEL_PATH=models/yolov8n.pt
YOLO_CONFIDENCE_THRESHOLD=0.25
```

- [ ] Verify readiness no longer reports missing `cv2`, `ultralytics`, or the
  model file.
- [ ] Run strict section verification:

```bash
npm run runtime:readiness:strict -- --section vision
```

- [ ] Run the adapter tests:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_adapters.py -v
```

- [ ] Run a live sample upload with `VISION_ANALYSIS_MODE=opencv_yolo`.
- [ ] Confirm the upload result returns `observation.source = "opencv_yolo"`.
- [ ] Update these checkboxes after the live inference evidence exists:
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

- [ ] Approve OpenAI API-key setup and external API calls.
- [ ] Re-check current official OpenAI docs for model, Responses API, embedding,
  and pricing guidance before implementation.
- [ ] Install the AI extra:

```bash
apps/api/.venv/bin/python -m pip install -e "apps/api[ai]"
```

- [ ] Set local environment values in `.env`:

```dotenv
OPENAI_MODEL=gpt-5.5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536
OPENAI_API_KEY=...
```

- [ ] Verify readiness no longer reports missing `openai` or `OPENAI_API_KEY`.
- [ ] Run strict section verification:

```bash
npm run runtime:readiness:strict -- --section openai
```

- [ ] Add a minimal OpenAI client boundary that can be tested without returning
  or logging secrets.
- [ ] Add tests that mock the client and prove chat/report code does not invent
  evidence.
- [ ] Run one approved live API smoke call.
- [ ] Update docs checkboxes after live API evidence exists.

## Gate 4: pgvector And Embedding Search

Approval required before enabling database extensions or adding vector columns.

- [ ] Approve target database setup.
- [ ] Install the AI extra if it is not already installed:

```bash
apps/api/.venv/bin/python -m pip install -e "apps/api[ai]"
```

- [ ] Start PostgreSQL and apply the existing schema:

```bash
docker compose -f infra/docker-compose.yml up -d postgres
cd apps/api
.venv/bin/alembic upgrade head
```

- [ ] Enable and verify the PostgreSQL `vector` extension in the approved target
  database.
- [ ] Verify `/api/runtime/readiness` no longer reports missing `pgvector` or
  `PostgreSQL vector extension`.
- [ ] Run strict section verification:

```bash
npm run runtime:readiness:strict -- --section pgvector
```

- [ ] Add an Alembic migration for vector columns only after the extension is
  verified.
- [ ] Replace local keyword scoring with pgvector-backed embedding search.
- [ ] Keep deterministic recommendation category selection in backend rules.
- [ ] Add tests for embedding retrieval and no-invented-evidence behavior.
- [ ] Update docs checkboxes after vector search is proven.

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
