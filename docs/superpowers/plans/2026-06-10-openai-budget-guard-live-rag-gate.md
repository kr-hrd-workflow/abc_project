# OpenAI Budget Guard And Live RAG Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every live OpenAI path requires both `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD`, then clear the live OpenAI smoke and pgvector-backed RAG gate only after explicit approval and local credential setup.

**Architecture:** Keep OpenAI calls behind the existing gateway layer in `apps/api/app/services/openai_clients.py`. Add a reusable monthly-budget guard beside the existing API-key guard, use it from the `/api/chat` pgvector retrieval path before client creation, and return a non-secret 503 setup error when the live gate is not configured. After the local guard is proven, run readiness and live smoke only when the user has approved the external API call.

**Tech Stack:** FastAPI, pytest, SQLAlchemy, pgvector, OpenAI Python SDK, root `npm` verification scripts.

---

## Current Evidence

- The main MVP tracker has one remaining unchecked external gate: run `npm run openai:smoke` after `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD` are present.
- `docs/runtime-setup.md` keeps the same live OpenAI gate unchecked and says the current strict OpenAI readiness check should fail until both values are configured.
- Current non-live check on 2026-06-10:

```bash
npm run runtime:readiness:strict -- --section openai
```

Expected/current result:

```text
openai ready=False mode=gpt-5.5
missing: OPENAI_API_KEY, OPENAI_MONTHLY_BUDGET_USD
```

- `apps/api/app/cli/openai_smoke.py` already blocks live smoke before client creation when either value is missing.
- `apps/api/app/api/routes.py` currently uses `require_openai_api_key()` in the pgvector chat path, but it does not enforce `settings.openai_monthly_budget_usd` before creating the live embedding client.
- Official OpenAI docs were checked on 2026-06-10:
  - `https://developers.openai.com/api/docs/guides/latest-model` names GPT-5.5 as the current latest guide and recommends the Responses API for reasoning, tools, and multi-turn work.
  - `https://developers.openai.com/api/docs/pricing` lists standard short-context `gpt-5.5` at `$5.00` input, `$0.50` cached input, and `$30.00` output per 1M tokens.
  - `https://developers.openai.com/api/docs/models/text-embedding-3-small` lists `text-embedding-3-small` at `$0.02` per 1M embedding tokens.
  - `https://developers.openai.com/api/docs/guides/embeddings` says the default vector length is `1536` for `text-embedding-3-small`.

## File Structure

Modify these files for the local guard slice:

```text
apps/api/app/services/openai_clients.py
apps/api/app/api/routes.py
apps/api/tests/test_openai_clients.py
apps/api/tests/test_api_flow.py
docs/runtime-setup.md
docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md
docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md
README.md
```

Do not edit `.env` in git. Keep `OPENAI_API_KEY` local only and never print it.

### Task 1: Add A Reusable OpenAI Budget Guard

**Files:**
- Modify: `apps/api/app/services/openai_clients.py`
- Modify: `apps/api/tests/test_openai_clients.py`

- [x] **Step 1: Update the OpenAI client test imports**

Update the existing `from app.services.openai_clients import (...)` block in `apps/api/tests/test_openai_clients.py` to include:

```python
    MissingOpenAIMonthlyBudgetError,
    require_openai_monthly_budget,
```

- [x] **Step 2: Write failing guard tests**

Append these tests after `test_require_openai_api_key_rejects_missing_or_blank_values` in `apps/api/tests/test_openai_clients.py`:

```python

def test_require_openai_monthly_budget_rejects_missing_value() -> None:
    try:
        require_openai_monthly_budget(None)
    except MissingOpenAIMonthlyBudgetError as exc:
        assert "OPENAI_MONTHLY_BUDGET_USD" in str(exc)
    else:
        raise AssertionError("expected missing monthly budget to fail")


def test_require_openai_monthly_budget_returns_configured_value() -> None:
    assert require_openai_monthly_budget(10.0) == 10.0
```

- [x] **Step 3: Run tests and verify failure**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_openai_clients.py -v
```

Expected: FAIL because `MissingOpenAIMonthlyBudgetError` and `require_openai_monthly_budget` do not exist yet.

- [x] **Step 4: Implement the guard**

In `apps/api/app/services/openai_clients.py`, add this class near `MissingOpenAIAPIKeyError`:

```python
class MissingOpenAIMonthlyBudgetError(RuntimeError):
    pass
```

Add this function after `require_openai_api_key`:

```python
def require_openai_monthly_budget(monthly_budget_usd: float | None) -> float:
    if monthly_budget_usd is None:
        raise MissingOpenAIMonthlyBudgetError(
            "OPENAI_MONTHLY_BUDGET_USD is required for live OpenAI calls"
        )
    return monthly_budget_usd
```

- [x] **Step 5: Run tests and verify pass**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_openai_clients.py -v
```

Expected: PASS.

Evidence: `apps/api/.venv/bin/python -m pytest apps/api/tests/test_openai_clients.py -v` passed with 5 tests, including the new monthly-budget guard coverage.

### Task 2: Enforce The Budget Guard In pgvector Chat

**Files:**
- Modify: `apps/api/app/api/routes.py`
- Modify: `apps/api/tests/test_api_flow.py`

- [x] **Step 1: Write failing route test for missing budget**

Append this test before `test_report_returns_summary_for_intersection` in `apps/api/tests/test_api_flow.py`:

```python
def test_chat_pgvector_mode_requires_openai_budget_before_client_creation(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    created_clients: list[str] = []

    monkeypatch.setattr("app.api.routes.settings.knowledge_search_mode", "pgvector")
    monkeypatch.setattr("app.api.routes.settings.openai_monthly_budget_usd", None)
    monkeypatch.setattr(
        "app.api.routes.require_openai_api_key",
        lambda: "sk-test-secret",
    )

    def fake_build_openai_client(api_key: str) -> object:
        created_clients.append(api_key)
        return object()

    monkeypatch.setattr(
        "app.api.routes.build_openai_client",
        fake_build_openai_client,
    )

    response = client.post(
        "/api/chat",
        json={"question": "Emergency status?"},
    )

    assert response.status_code == 503
    assert "OPENAI_MONTHLY_BUDGET_USD" in response.json()["detail"]
    assert created_clients == []
```

- [x] **Step 2: Update existing pgvector success test setup**

In `test_chat_uses_pgvector_policy_search_when_configured`, add this monkeypatch after the `knowledge_search_mode` monkeypatch:

```python
    monkeypatch.setattr("app.api.routes.settings.openai_monthly_budget_usd", 10.0)
```

- [x] **Step 3: Run focused API tests and verify failure**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_api_flow.py::test_chat_pgvector_mode_requires_openai_budget_before_client_creation apps/api/tests/test_api_flow.py::test_chat_uses_pgvector_policy_search_when_configured -v
```

Expected: the new missing-budget test fails because the route does not yet check the budget before client creation.

- [x] **Step 4: Implement route-level guard**

In `apps/api/app/api/routes.py`, update the OpenAI imports:

```python
from app.services.openai_clients import (
    MissingOpenAIAPIKeyError,
    MissingOpenAIMonthlyBudgetError,
    OpenAIEmbeddingGateway,
    build_openai_client,
    require_openai_api_key,
    require_openai_monthly_budget,
)
```

Replace the start of the pgvector branch in `_retrieve_policy_evidence` with:

```python
    if settings.knowledge_search_mode == "pgvector":
        try:
            require_openai_monthly_budget(settings.openai_monthly_budget_usd)
            api_key = require_openai_api_key()
        except (MissingOpenAIAPIKeyError, MissingOpenAIMonthlyBudgetError) as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        embedding_gateway = OpenAIEmbeddingGateway(
            client=build_openai_client(api_key),
            model=settings.openai_embedding_model,
            dimensions=settings.openai_embedding_dimensions,
        )
```

- [x] **Step 5: Run focused API tests and verify pass**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_openai_clients.py apps/api/tests/test_api_flow.py::test_chat_pgvector_mode_requires_openai_budget_before_client_creation apps/api/tests/test_api_flow.py::test_chat_uses_pgvector_policy_search_when_configured -v
```

Expected: PASS.

Evidence: `apps/api/.venv/bin/python -m pytest apps/api/tests/test_api_flow.py::test_chat_pgvector_mode_requires_openai_budget_before_client_creation apps/api/tests/test_api_flow.py::test_chat_uses_pgvector_policy_search_when_configured -v` passed; the new missing-budget test returned 503 and the existing pgvector success test still passed with `settings.openai_monthly_budget_usd=10.0`.

### Task 3: Sync Documentation For The New Guard

**Files:**
- Modify: `docs/runtime-setup.md`
- Modify: `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md`
- Modify: `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md`
- Modify: `README.md`

- [x] **Step 1: Update runtime setup current gate status**

In `docs/runtime-setup.md`, add this checked item under `## Current Gate Status`:

```markdown
- [x] The pgvector-backed `/api/chat` path now enforces the same live OpenAI
  budget guard as `npm run openai:smoke`; it refuses to create a live client
  until `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD` are configured.
```

- [x] **Step 2: Update OpenAI gate checklist**

In `docs/runtime-setup.md`, add this checked item after the guarded smoke command:

```markdown
- [x] Enforce `OPENAI_MONTHLY_BUDGET_USD` before pgvector chat creates a live
  OpenAI embedding client.
```

- [x] **Step 3: Update project trackers**

In both `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md` and `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md`, add this checked sub-item under the OpenAI live gate:

```markdown
  - [x] Enforce the OpenAI monthly budget guard on the pgvector-backed chat path
    before live embedding client creation.
```

- [x] **Step 4: Update README status**

In `README.md`, add this bullet under completed scope:

```markdown
- pgvector-backed chat retrieval path also requires the OpenAI monthly budget
  guard before live embedding client creation
```

Add this sentence to the OpenAI/pgvector current status section:

```markdown
`KNOWLEDGE_SEARCH_MODE=pgvector` now refuses to create a live OpenAI embedding
client unless both `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD` are present.
```

- [x] **Step 5: Check documentation formatting**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

Evidence: `git diff --check` returned clean after the README, runtime setup, spec, and plan doc sync.

### Task 4: Validate The Local Guard Slice

**Files:**
- Test: `apps/api/tests/test_openai_clients.py`
- Test: `apps/api/tests/test_api_flow.py`
- Test: full repo validation

- [x] **Step 1: Run backend focused tests**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_openai_clients.py apps/api/tests/test_api_flow.py -v
```

Expected: PASS.

- [x] **Step 2: Run full verification**

Run:

```bash
npm run verify
```

Expected: backend tests, frontend tests, frontend build, and `git diff --check` pass.

Evidence: `npm run verify` passed, including `apps/api/tests` (66 passed), `apps/web` tests (42 passed), `next build`, and `git diff --check`.

- [x] **Step 3: Re-run non-live OpenAI readiness**

Run:

```bash
npm run runtime:readiness:strict -- --section openai
```

Expected before credentials are configured: FAIL with `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD` missing. This failure is the correct evidence that the live gate remains closed and no external OpenAI call should be attempted yet.

Evidence: focused backend tests passed; `npm run runtime:readiness:strict -- --section openai` already failed with both gate values missing and did not call OpenAI.

### Task 5: Clear The Live OpenAI Gate After Approval

**Files:**
- Local only: `.env`
- Validate: `docs/runtime-setup.md`
- Validate: `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md`
- Validate: `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md`
- Validate: `README.md`

Stop before this task until the user explicitly approves live OpenAI API usage and confirms a local monthly budget value. This task can incur API charges.

- [ ] **Step 1: Confirm explicit approval**

Required approval text from the user:

```text
I approve one live OpenAI smoke call for this project and approve OPENAI_MONTHLY_BUDGET_USD=<approved numeric budget>.
```

Do not proceed without that approval.

- [ ] **Step 2: Confirm local env presence without printing secrets**

Run:

```bash
cd apps/api && .venv/bin/python - <<'PY'
import os
from app.core.config import Settings

settings = Settings()
print("OPENAI_API_KEY=set" if os.environ.get("OPENAI_API_KEY") else "OPENAI_API_KEY=missing")
print(
    "OPENAI_MONTHLY_BUDGET_USD=set"
    if settings.openai_monthly_budget_usd is not None
    else "OPENAI_MONTHLY_BUDGET_USD=missing"
)
PY
```

Expected: both lines end with `set`. If either line ends with `missing`, stop and ask the user to set the missing local value.

- [ ] **Step 3: Run strict OpenAI readiness**

Run:

```bash
npm run runtime:readiness:strict -- --section openai
```

Expected:

```text
openai ready=True mode=gpt-5.5
```

- [ ] **Step 4: Run the approved live smoke**

Run only after Step 1 approval and Step 3 success:

```bash
npm run openai:smoke
```

Expected:

```text
openai smoke ready=True
model=gpt-5.5
embedding_model=text-embedding-3-small
embedding_dimensions=1536
response_text_present=True
```

### Task 6: Verify pgvector-Backed Chat With Live Embeddings

**Files:**
- Local only: `.env`
- Validate: PostgreSQL runtime

This task also uses the live OpenAI embedding API. It requires the same explicit approval as Task 5 or a separate approval if Task 5 approval covered only one smoke call.

- [ ] **Step 1: Confirm pgvector database readiness**

Run:

```bash
npm run runtime:readiness:strict -- --section pgvector
```

Expected:

```text
pgvector ready=True mode=database
```

- [ ] **Step 2: Run a live pgvector chat smoke**

Run only after explicit approval:

```bash
cd apps/api && KNOWLEDGE_SEARCH_MODE=pgvector .venv/bin/python - <<'PY'
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
response = client.post(
    "/api/chat",
    params={"scenario_id": "emergency"},
    json={"question": "What policy evidence supports emergency priority?"},
)
print(f"status_code={response.status_code}")
payload = response.json()
print(f"policy_evidence_present={'Policy evidence:' in payload['answer']}")
print(f"referenced_event_count={len(payload['referenced_event_ids'])}")
PY
```

Expected:

```text
status_code=200
policy_evidence_present=True
referenced_event_count=1
```

- [ ] **Step 3: Update live-gate docs after evidence exists**

Only after successful live smoke evidence, change these OpenAI checkboxes from unchecked to checked:

```text
docs/runtime-setup.md
docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md
docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md
README.md
```

Record the exact date, command, and non-secret result. Do not store API keys, request IDs, raw model output, or billing details in docs.

### Task 7: Final Validation And Handoff

**Files:**
- Validate all changed files

- [ ] **Step 1: Run full validation**

Run:

```bash
npm run verify
npm run runtime:readiness:strict -- --section openai
npm run runtime:readiness:strict -- --section pgvector
git status --short
```

Expected:

```text
npm run verify passes
openai ready=True mode=gpt-5.5
pgvector ready=True mode=database
git status shows only intentional docs/code changes
```

- [ ] **Step 2: Ask before commit**

Do not commit automatically. Ask the user before staging or committing:

```text
The OpenAI guard/live-gate slice is validated. Do you want me to stage and commit these changes?
```

Suggested commit message after approval:

```bash
git commit -m "fix: enforce OpenAI budget guard for live RAG"
```

## Self-Review

- Spec coverage: covers the remaining OpenAI live gate, the repo's monthly-budget invariant, the pgvector-backed RAG path, and docs checkbox hygiene.
- Placeholder scan: no secrets or unresolved implementation placeholders are included; secret values must remain local and user-owned.
- Type consistency: uses existing `Settings.openai_monthly_budget_usd`, existing `OpenAIEmbeddingGateway`, and existing `pytest`/FastAPI test patterns.
- External side effects: live OpenAI calls are explicitly stopped until the user approves API usage and a monthly budget.
