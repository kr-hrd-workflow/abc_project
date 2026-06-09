# Scenario Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-OpenAI dashboard scenario switcher for `emergency`, `pedestrian`, `normal`, and `blocked`.

**Architecture:** Keep the backend contract unchanged. The web app owns selected scenario state, passes it to API helpers as `scenario_id`, and renders a compact segmented control in `DashboardShell`. Scenario changes reload existing status, events, recommendation, simulation, and report data.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library.

---

## Files

- Modify: `apps/web/lib/types.ts`
  - Add `ScenarioId`, `ScenarioOption`, and `SCENARIO_OPTIONS`.
- Modify: `apps/web/lib/api.ts`
  - Add optional scenario query handling to existing API helpers.
- Modify: `apps/web/lib/api.test.ts`
  - Add failing tests for scenario query URLs.
- Modify: `apps/web/components/DashboardShell.tsx`
  - Add scenario props and render the segmented scenario control.
- Modify: `apps/web/components/DashboardShell.test.tsx`
  - Add failing tests for scenario control rendering and selection.
- Modify: `apps/web/app/page.tsx`
  - Own selected scenario state and reload dashboard data by scenario.
- Modify: `apps/web/app/globals.css`
  - Add compact scenario-control styling only if existing segmented styles are not enough.
- Modify: `docs/superpowers/specs/2026-06-09-scenario-switcher-design.md`
  - Mark implementation evidence only after validation passes.

## Task 1: Scenario Types And API Query Support

**Files:**
- Modify: `apps/web/lib/types.ts`
- Modify: `apps/web/lib/api.ts`
- Test: `apps/web/lib/api.test.ts`

- [x] **Step 1: Write failing API helper tests**

Add tests showing scenario IDs are encoded as query params:

```ts
test("adds scenario query parameters to dashboard API requests", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockReturnValue(mockJsonResponse({ id: 1, action: "pedestrian_service" }));

  await recommendSignal("pedestrian");

  expect(fetchMock).toHaveBeenCalledWith(
    "http://127.0.0.1:8000/api/recommend-signal?scenario_id=pedestrian",
    expect.objectContaining({
      method: "POST",
      cache: "no-store"
    })
  );
});

test("adds scenario query parameters to chat requests", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockReturnValue(mockJsonResponse({ answer: "ok", referenced_event_ids: [] }));

  await askQuestion("blocked?", "blocked");

  expect(fetchMock).toHaveBeenCalledWith(
    "http://127.0.0.1:8000/api/chat?scenario_id=blocked",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ question: "blocked?" }),
      headers: expect.objectContaining({ "Content-Type": "application/json" })
    })
  );
});
```

- [x] **Step 2: Run API helper tests and verify RED**

Run:

```bash
npm --workspace apps/web run test -- lib/api.test.ts
```

Expected: fail because helper signatures do not accept scenario IDs and URLs do
not include `scenario_id`.

- [x] **Step 3: Add scenario types and URL helper**

Add to `apps/web/lib/types.ts`:

```ts
export type ScenarioId = "emergency" | "pedestrian" | "normal" | "blocked";

export type ScenarioOption = {
  id: ScenarioId;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
  descriptionEn: string;
};

export const SCENARIO_OPTIONS: ScenarioOption[] = [
  {
    id: "emergency",
    labelKo: "긴급차량",
    labelEn: "Emergency",
    descriptionKo: "긴급차량 우선 통과",
    descriptionEn: "Emergency vehicle priority"
  },
  {
    id: "pedestrian",
    labelKo: "보행자",
    labelEn: "Pedestrian",
    descriptionKo: "보행자 대기 대응",
    descriptionEn: "Pedestrian wait response"
  },
  {
    id: "normal",
    labelKo: "정상",
    labelEn: "Normal",
    descriptionKo: "일반 교통 흐름",
    descriptionEn: "Normal traffic flow"
  },
  {
    id: "blocked",
    labelKo: "차단",
    labelEn: "Blocked",
    descriptionKo: "교차로 막힘 대응",
    descriptionEn: "Blocked intersection response"
  }
];
```

Update `apps/web/lib/api.ts` so existing helpers accept an optional
`ScenarioId` and call a small query helper:

```ts
function withScenario(path: string, scenarioId?: ScenarioId): string {
  if (!scenarioId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}scenario_id=${encodeURIComponent(scenarioId)}`;
}
```

Then update `getIntersectionStatus`, `getEvents`, `recommendSignal`,
`simulateSignal`, `askQuestion`, and `generateReport` to pass the scenario path.

- [x] **Step 4: Run API helper tests and verify GREEN**

Run:

```bash
npm --workspace apps/web run test -- lib/api.test.ts
```

Expected: all API helper tests pass.

## Task 2: Dashboard Scenario Control

**Files:**
- Modify: `apps/web/components/DashboardShell.tsx`
- Modify: `apps/web/components/DashboardShell.test.tsx`
- Modify: `apps/web/app/globals.css`

- [x] **Step 1: Write failing DashboardShell scenario tests**

Add props to test render helper and test scenario rendering/selection:

```ts
test("renders scenario options and marks the selected scenario", () => {
  renderDashboard({ selectedScenarioId: "blocked" });

  expect(screen.getByRole("button", { name: /차단/ })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(screen.getByRole("button", { name: /긴급차량/ })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
});

test("calls scenario change handler from the segmented control", async () => {
  const onScenarioChange = vi.fn();
  renderDashboard({
    selectedScenarioId: "emergency",
    onScenarioChange
  });

  await userEvent.click(screen.getByRole("button", { name: /보행자/ }));

  expect(onScenarioChange).toHaveBeenCalledWith("pedestrian");
});
```

- [x] **Step 2: Run DashboardShell tests and verify RED**

Run:

```bash
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
```

Expected: fail because scenario props and controls do not exist.

- [x] **Step 3: Add scenario props and control**

Update `DashboardShellProps`:

```ts
selectedScenarioId: ScenarioId;
scenarioOptions: ScenarioOption[];
scenarioLoading: boolean;
onScenarioChange: (scenarioId: ScenarioId) => void;
```

Render a compact control in the top bar where scenario metadata currently
appears. Each button uses:

```tsx
aria-pressed={option.id === selectedScenarioId}
disabled={scenarioLoading || option.id === selectedScenarioId}
onClick={() => onScenarioChange(option.id)}
```

Display localized label and description from `ScenarioOption`.

- [x] **Step 4: Add or reuse styling**

Prefer existing `.segment-control` styles. Add only scenario-specific layout
classes if text spacing requires it:

```css
.scenario-control {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
}

.scenario-control .segment-control button {
  min-width: 74px;
  padding: 0 10px;
}
```

- [x] **Step 5: Run DashboardShell tests and verify GREEN**

Run:

```bash
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
```

Expected: all DashboardShell tests pass.

## Task 3: Page State And Scenario Reload

**Files:**
- Modify: `apps/web/app/page.tsx`
- Test: `apps/web/components/DashboardShell.test.tsx`
- Test: `apps/web/lib/api.test.ts`

- [x] **Step 1: Update page state and loader**

Use `ScenarioId` and `SCENARIO_OPTIONS`:

```ts
const [selectedScenarioId, setSelectedScenarioId] =
  useState<ScenarioId>("emergency");
const [scenarioLoading, setScenarioLoading] = useState(false);
```

Change `loadDashboard` to accept a scenario ID:

```ts
async function loadDashboard(scenarioId: ScenarioId) {
  const [status, events, recommendation, simulation, report] =
    await Promise.all([
      getIntersectionStatus(scenarioId),
      getEvents(scenarioId),
      recommendSignal(scenarioId),
      simulateSignal(scenarioId),
      generateReport(scenarioId)
    ]);
}
```

Call `askQuestion(question, selectedScenarioId)` and reload retry with the
currently selected scenario.

- [x] **Step 2: Add scenario change handler**

Add:

```ts
async function handleScenarioChange(scenarioId: ScenarioId) {
  if (scenarioId === selectedScenarioId) return;
  setSelectedScenarioId(scenarioId);
  setScenarioLoading(true);
  try {
    await loadDashboard(scenarioId);
  } finally {
    setScenarioLoading(false);
  }
}
```

Pass `selectedScenarioId`, `SCENARIO_OPTIONS`, `scenarioLoading`, and
`onScenarioChange` into `DashboardShell`.

- [x] **Step 3: Run web tests**

Run:

```bash
npm --workspace apps/web run test
```

Expected: all web tests pass.

## Task 4: Documentation And Validation

**Files:**
- Modify: `docs/superpowers/specs/2026-06-09-scenario-switcher-design.md`

- [x] **Step 1: Update design spec evidence**

Append a short `Implementation Evidence` section with the exact validation
commands run and note that OpenAI live gate remains deferred.

- [x] **Step 2: Run full verification**

Run:

```bash
npm run verify
```

Expected: API tests, web tests, web build, and `git diff --check` pass.

- [x] **Step 3: Leave work uncommitted**

Do not commit, push, stage, merge, or deploy unless the user explicitly approves
that action. Report changed files and validation results in the final answer.
