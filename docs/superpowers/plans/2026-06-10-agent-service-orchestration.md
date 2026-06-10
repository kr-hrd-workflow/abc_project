# Agent Service Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the planned FastAPI `agent_service` layer so AI-agent answers compose current status, events, policy evidence, rule-based recommendations, simulation comparison, and the safety boundary into the five sections required by the final project plan.

**Architecture:** Keep existing API paths stable. Move orchestration currently spread across `apps/api/app/api/routes.py` into `apps/api/app/services/agent_service.py`, add a backward-compatible structured `sections` field to `/api/chat`, and render those sections in the existing dashboard chat panel. Do not enable live OpenAI calls; keep the current local/mock and guarded pgvector behavior intact.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, Next.js, React, TypeScript, Vitest.

---

## Current Evidence

- Source requirement: `doc/smart_city_ai_final_plan.md` requires FastAPI `agent_service` and AI-agent responses split into `현재 상황`, `추천 조치`, `추천 근거`, `권한 한계`, `시뮬레이션 결과`.
- Existing backend pieces: `apps/api/app/services/recommendations.py`, `apps/api/app/services/chat.py`, `apps/api/app/services/reports.py`, `apps/api/app/services/persistence.py`, and `apps/api/app/adapters/simulation.py`.
- Existing API routes: `/api/recommend-signal`, `/api/simulate-signal`, `/api/chat`, `/api/report` in `apps/api/app/api/routes.py`.
- Existing frontend surface: `apps/web/components/ChatReportPanel.tsx` renders only `chat.answer`.
- Current blocker outside this plan: live OpenAI remains deferred until `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD` are present and approved for use.

## Subagent Execution Split

When current-thread `spawn_agent` is available, dispatch these non-overlapping worker scopes:

- Worker A, backend service owner: `apps/api/app/services/agent_service.py`, `apps/api/app/domain/schemas.py`, backend service tests.
- Worker B, route integration owner: `apps/api/app/api/routes.py`, `apps/api/tests/test_api_flow.py`.
- Worker C, frontend display owner: `apps/web/lib/types.ts`, `apps/web/components/ChatReportPanel.tsx`, related component tests.

Do not use `create_thread`, `fork_thread`, or worktree-based agents for this plan unless the user explicitly accepts that fallback.

## File Structure

- Create: `apps/api/app/services/agent_service.py`
  - Owns AI-agent orchestration and five-section response construction.
- Modify: `apps/api/app/domain/schemas.py`
  - Adds `AgentResponseSections` and makes `ChatResponse.sections` optional for backward compatibility.
- Modify: `apps/api/app/api/routes.py`
  - Calls `agent_service` functions instead of hand-composing chat/recommendation/report logic directly in the route layer.
- Create: `apps/api/tests/test_agent_service.py`
  - Unit coverage for section construction, safety boundary, recommendation rationale, and simulation summary.
- Modify: `apps/api/tests/test_api_flow.py`
  - API-level regression coverage for `/api/chat` returning `sections`.
- Modify: `apps/web/lib/types.ts`
  - Adds `AgentResponseSections` and `ChatResponse.sections`.
- Modify: `apps/web/components/ChatReportPanel.tsx`
  - Renders the five agent sections when present and falls back to `answer`.
- Modify: `apps/web/app/globals.css`
  - Adds compact styles for the five section blocks inside the existing assistant message bubble.
- Modify: `apps/web/components/DashboardShell.test.tsx`
  - Verifies the structured sections render without breaking existing chat behavior.

## Success Criteria

- `/api/chat` still returns `answer` and `referenced_event_ids`.
- `/api/chat` additionally returns `sections` with these exact keys:
  - `current_situation`
  - `recommended_action`
  - `recommendation_rationale`
  - `authority_limit`
  - `simulation_result`
- The authority limit explicitly says the system is simulation-only and does not control real traffic signals.
- Existing recommendation, simulation, report, and pgvector guard tests keep passing.
- The dashboard renders the five sections when available and still renders a flat answer if `sections` is absent.
- Validation passes with `npm run verify`.

---

### Task 1: Add Agent Response Schemas

**Files:**
- Modify: `apps/api/app/domain/schemas.py`
- Modify: `apps/web/lib/types.ts`

- [x] **Step 1: Add backend schema**

Add this Pydantic model above `ChatResponse` in `apps/api/app/domain/schemas.py`:

```python
class AgentResponseSections(BaseModel):
    current_situation: str
    recommended_action: str
    recommendation_rationale: list[str]
    authority_limit: str
    simulation_result: str
```

Then update `ChatResponse`:

```python
class ChatResponse(BaseModel):
    answer: str
    referenced_event_ids: list[int]
    sections: AgentResponseSections | None = None
```

- [x] **Step 2: Add frontend type**

Add this type in `apps/web/lib/types.ts` above `ChatResponse`:

```ts
export type AgentResponseSections = {
  current_situation: string;
  recommended_action: string;
  recommendation_rationale: string[];
  authority_limit: string;
  simulation_result: string;
};
```

Then update `ChatResponse`:

```ts
export type ChatResponse = {
  answer: string;
  referenced_event_ids: number[];
  sections?: AgentResponseSections | null;
};
```

- [x] **Step 3: Run type and API tests**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_api_flow.py::test_chat_returns_congestion_answer_with_event_references -v
npm --workspace apps/web run test -- DashboardShell.test.tsx
```

Expected: both commands pass because the new field is optional.

### Task 2: Create Backend Agent Service

**Files:**
- Create: `apps/api/app/services/agent_service.py`
- Create: `apps/api/tests/test_agent_service.py`

- [x] **Step 1: Write failing service tests**

Create `apps/api/tests/test_agent_service.py`:

```python
from app.adapters.simulation import FixtureSumoSimulationRunner, SumoTraciTrafficSimulationAdapter
from app.domain.enums import RecommendationAction
from app.scenarios.data import EMERGENCY_SCENARIO
from app.services.agent_service import build_agent_sections
from app.services.persistence import build_events
from app.services.recommendations import recommend_signal_action


def test_build_agent_sections_returns_required_plan_sections() -> None:
    events = build_events(EMERGENCY_SCENARIO)
    action, plan, evidence = recommend_signal_action(EMERGENCY_SCENARIO)
    simulation = SumoTraciTrafficSimulationAdapter(
        runner=FixtureSumoSimulationRunner(),
        source="sumo_traci_fixture",
    ).compare_signal_plan("emergency")

    sections = build_agent_sections(
        observation=EMERGENCY_SCENARIO,
        events=events,
        action=action,
        plan=plan,
        evidence=evidence,
        simulation=simulation,
    )

    assert "emergency" in sections.current_situation.lower()
    assert RecommendationAction.EMERGENCY_PRIORITY.value in sections.recommended_action
    assert sections.recommendation_rationale
    assert "No real traffic signal control" in sections.authority_limit
    assert "total delay" in sections.simulation_result


def test_build_agent_sections_describes_highest_queue() -> None:
    events = build_events(EMERGENCY_SCENARIO)
    action, plan, evidence = recommend_signal_action(EMERGENCY_SCENARIO)
    simulation = SumoTraciTrafficSimulationAdapter(
        runner=FixtureSumoSimulationRunner(),
        source="sumo_traci_fixture",
    ).compare_signal_plan("emergency")

    sections = build_agent_sections(
        observation=EMERGENCY_SCENARIO,
        events=events,
        action=action,
        plan=plan,
        evidence=evidence,
        simulation=simulation,
    )

    assert "east" in sections.current_situation.lower()
    assert "42" in sections.current_situation
```

- [x] **Step 2: Verify failing test before implementation**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_agent_service.py -v
```

Expected: fails with `ModuleNotFoundError: No module named 'app.services.agent_service'`.

- [x] **Step 3: Implement `agent_service.py`**

Create `apps/api/app/services/agent_service.py`:

```python
from app.domain.enums import RecommendationAction
from app.domain.schemas import AgentResponseSections, SimulationComparison, VisionObservation
from app.services.persistence import SAFETY_BOUNDARY


def build_agent_sections(
    observation: VisionObservation,
    events: list[object],
    action: RecommendationAction,
    plan: dict[str, object],
    evidence: dict[str, object],
    simulation: SimulationComparison,
) -> AgentResponseSections:
    queues = observation.queues.model_dump()
    busiest_direction = max(queues, key=queues.get)
    busiest_count = queues[busiest_direction]
    event_count = len(events)
    emergency_state = (
        "emergency vehicle detected"
        if observation.emergency_vehicle.present
        else "no emergency vehicle detected"
    )

    return AgentResponseSections(
        current_situation=(
            f"{observation.intersection_id} has {observation.congestion_level} "
            f"congestion, {busiest_direction} is the busiest direction with "
            f"{busiest_count} queued vehicles, {event_count} event(s) are active, "
            f"and {emergency_state}."
        ),
        recommended_action=_format_recommended_action(action, plan),
        recommendation_rationale=_format_rationale(evidence),
        authority_limit=SAFETY_BOUNDARY,
        simulation_result=_format_simulation_result(simulation),
    )


def _format_recommended_action(
    action: RecommendationAction,
    plan: dict[str, object],
) -> str:
    return f"{action.value}: {plan}"


def _format_rationale(evidence: dict[str, object]) -> list[str]:
    rationale = [f"{key}: {value}" for key, value in evidence.items()]
    return rationale or ["No priority evidence was detected."]


def _format_simulation_result(simulation: SimulationComparison) -> str:
    return (
        f"{simulation.source} estimates total delay changes from "
        f"{simulation.baseline.total_delay_seconds} seconds to "
        f"{simulation.recommended.total_delay_seconds} seconds, with "
        f"{simulation.improvement['total_delay_percent']}% total delay improvement."
    )
```

- [x] **Step 4: Run service tests**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_agent_service.py -v
```

Expected: 2 tests pass.

### Task 3: Wire `/api/chat` Through Agent Service

**Files:**
- Modify: `apps/api/app/api/routes.py`
- Modify: `apps/api/tests/test_api_flow.py`

- [x] **Step 1: Add API regression test**

Add this test after `test_chat_returns_congestion_answer_with_event_references` in `apps/api/tests/test_api_flow.py`:

```python
def test_chat_returns_structured_agent_sections(client: TestClient) -> None:
    response = client.post(
        "/api/chat",
        json={"question": "현재 상황과 추천 근거를 알려줘"},
    )

    assert response.status_code == 200
    sections = response.json()["sections"]
    assert set(sections) == {
        "current_situation",
        "recommended_action",
        "recommendation_rationale",
        "authority_limit",
        "simulation_result",
    }
    assert "No real traffic signal control" in sections["authority_limit"]
    assert sections["recommendation_rationale"]
```

- [x] **Step 2: Verify failing test**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_api_flow.py::test_chat_returns_structured_agent_sections -v
```

Expected: fails because `sections` is absent or `None`.

- [x] **Step 3: Update route imports**

In `apps/api/app/api/routes.py`, add:

```python
from app.services.agent_service import build_agent_sections
```

- [x] **Step 4: Build sections inside `/api/chat`**

Update the end of the `chat` route in `apps/api/app/api/routes.py`:

```python
    action, plan, evidence = recommend_signal_action(observation)
    simulation = simulation_adapter.compare_signal_plan(scenario_id)
    sections = build_agent_sections(
        observation=observation,
        events=events,
        action=action,
        plan=plan,
        evidence=evidence,
        simulation=simulation,
    )
    create_chat_log(session, observation, request.question, answer, event_ids)
    return ChatResponse(
        answer=answer,
        referenced_event_ids=event_ids,
        sections=sections,
    )
```

Do not create a recommendation or simulation run in `/api/chat`; those persisted records remain owned by `/api/recommend-signal` and `/api/simulate-signal`.

- [x] **Step 5: Run focused backend tests**

Run:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_agent_service.py apps/api/tests/test_api_flow.py::test_chat_returns_structured_agent_sections apps/api/tests/test_api_flow.py::test_chat_uses_pgvector_policy_search_when_configured apps/api/tests/test_api_flow.py::test_chat_pgvector_mode_requires_openai_budget_before_client_creation -v
```

Expected: all selected tests pass, including the pgvector guard tests.

### Task 4: Render Agent Sections In The Dashboard

**Files:**
- Modify: `apps/web/components/ChatReportPanel.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/components/DashboardShell.test.tsx`

- [x] **Step 1: Add render test**

In `apps/web/components/DashboardShell.test.tsx`, add a test that passes a `chat` value with `sections` and expects all five labels to render:

```tsx
it("renders structured AI agent sections when the API provides them", () => {
  renderDashboard({
    chat: {
      answer: "Fallback answer",
      referenced_event_ids: [1],
      sections: {
        current_situation: "현재 상황 내용",
        recommended_action: "추천 조치 내용",
        recommendation_rationale: ["근거 A", "근거 B"],
        authority_limit: "Recommendation and simulation only. No real traffic signal control is performed.",
        simulation_result: "시뮬레이션 결과 내용"
      }
    }
  });

  expect(screen.getByText("현재 상황")).toBeInTheDocument();
  expect(screen.getByText("추천 조치")).toBeInTheDocument();
  expect(screen.getByText("추천 근거")).toBeInTheDocument();
  expect(screen.getByText("권한 한계")).toBeInTheDocument();
  expect(screen.getByText("시뮬레이션 결과")).toBeInTheDocument();
  expect(screen.getByText("근거 A")).toBeInTheDocument();
});
```

- [x] **Step 2: Verify failing frontend test**

Run:

```bash
npm --workspace apps/web run test -- DashboardShell.test.tsx
```

Expected: fails because `ChatReportPanel` does not render `sections`.

- [x] **Step 3: Render sections in `ChatReportPanel.tsx`**

Inside the assistant message bubble, replace the single paragraph block with:

```tsx
{chat?.sections ? (
  <div className="agent-sections">
    <section>
      <h3>현재 상황</h3>
      <p>{chat.sections.current_situation}</p>
    </section>
    <section>
      <h3>추천 조치</h3>
      <p>{chat.sections.recommended_action}</p>
    </section>
    <section>
      <h3>추천 근거</h3>
      <ul>
        {chat.sections.recommendation_rationale.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
    <section>
      <h3>권한 한계</h3>
      <p>{chat.sections.authority_limit}</p>
    </section>
    <section>
      <h3>시뮬레이션 결과</h3>
      <p>{chat.sections.simulation_result}</p>
    </section>
  </div>
) : (
  <p className={chat ? "" : "chat-empty"}>{chat?.answer ?? t.chatEmpty}</p>
)}
```

- [x] **Step 4: Add minimal CSS**

Add styles near the existing `.assistant-message` rules in `apps/web/app/globals.css`:

```css
.agent-sections {
  display: grid;
  gap: 0.75rem;
}

.agent-sections section {
  display: grid;
  gap: 0.25rem;
}

.agent-sections h3 {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
}

.agent-sections p,
.agent-sections ul {
  margin: 0;
}
```

- [x] **Step 5: Run focused frontend tests**

Run:

```bash
npm --workspace apps/web run test -- DashboardShell.test.tsx
```

Expected: the new section rendering test and existing dashboard tests pass.

### Task 5: Final Validation And Documentation Sync

**Files:**
- Modify only if needed: `README.md`, `docs/runtime-setup.md`, `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md`

- [x] **Step 1: Run full verification**

Run:

```bash
npm run verify
```

Expected:
- API tests pass.
- Web tests pass.
- Next build passes.
- `git diff --check` passes.

- [x] **Step 2: Confirm runtime gates are not overclaimed**

Run:

```bash
npm run runtime:readiness
```

Expected:
- Vision and simulation may remain in fixture mode by default.
- OpenAI remains `ready=False` until `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD` are configured.
- Do not mark live OpenAI complete from the new `agent_service` code alone.

- [x] **Step 3: Update progress docs**

In `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md`, add or check only the item that says the local FastAPI `agent_service` orchestration layer exists. Leave live OpenAI/VLM gates unchecked unless a real approved smoke test has passed.

- [x] **Step 4: Prepare completion report**

Return:
- Files changed.
- Validation commands and results.
- Confirmation that no live OpenAI call was made.
- Remaining gates: live OpenAI smoke, VLM representative frame description, optional WebSocket alerts, deployment/presentation artifacts.
