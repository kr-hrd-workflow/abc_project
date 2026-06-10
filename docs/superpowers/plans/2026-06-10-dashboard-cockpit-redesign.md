# Dashboard Cockpit Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/dashboard` into a launch-ready reduced-neon A+C cockpit that matches the approved mockup and adds a clear AI automatic operation / admin manual operation toggle.

**Architecture:** Keep `DashboardRoute` and backend/API contracts stable. Recompose `DashboardShell` into a top command bar, incident brief spine, dominant simulation viewport, response plan rail, and bottom scenario rail while preserving existing child component behaviors. Add operation mode as local UI state only so it does not imply real signal control.

**Tech Stack:** Next.js, React, TypeScript, Vitest, React Testing Library, CSS in `apps/web/app/globals.css`.

---

### Task 1: Red Tests For Cockpit And Operation Mode

**Files:**
- Modify: `apps/web/components/DashboardShell.test.tsx`

- [x] **Step 1: Assert the cockpit structure**

Update the first layout test to require these accessible surfaces:
- `Incident Brief Spine`
- `Simulation Viewport`
- `Response Plan`
- `Scenario Rail`
- `Simulation only / No real signal control`

- [x] **Step 2: Assert operation mode toggle behavior**

Add a test that starts in AI automatic operation mode, clicks the admin manual mode button, verifies `aria-pressed`, and verifies the visible Korean mode copy changes.

- [x] **Step 3: Run focused tests and verify they fail**

Run:

```bash
npm --workspace apps/web run test -- DashboardShell.test.tsx
```

Expected: FAIL because cockpit labels and operation mode controls do not exist yet.

Evidence: 2026-06-10, initial focused run failed on missing cockpit layout markers and operation mode controls before implementation.

### Task 2: Implement Launch-Ready Cockpit Composition

**Files:**
- Modify: `apps/web/components/DashboardShell.tsx`
- Modify: `apps/web/lib/i18n.ts`
- Modify: `apps/web/app/globals.css`

- [x] **Step 1: Add local operation mode state**

Add `const [operationMode, setOperationMode] = useState<"ai" | "manual">("ai");` in `DashboardShell`.

- [x] **Step 2: Recompose `DashboardShell`**

Replace the existing two-row header plus flow strip with a launch command bar and cockpit grid:
- left: `EventTimeline`
- center: `DigitalTwin`
- right: `RecommendationPanel`, `MetricsPanel`, and `ChatReportPanel`
- bottom: scenario rail using existing `SCENARIO_OPTIONS`

- [x] **Step 3: Add the operation mode toggle**

Render two buttons:
- AI automatic operation
- Admin manual operation

Both must be explicit that the app remains simulation-only and performs no real signal control.

- [x] **Step 4: Add reduced-neon cockpit styling**

Scope new CSS under `.launch-dashboard`:
- matte charcoal panels
- desaturated teal/amber/red accents
- thin borders
- large central map
- no strong glow
- responsive collapse at tablet/mobile widths

### Task 3: Verify And Review

**Files:**
- Test: `apps/web/components/DashboardShell.test.tsx`
- Test: `apps/web/components/DashboardRoute.test.tsx`
- Build: `apps/web`

- [x] **Step 1: Run focused tests**

```bash
npm --workspace apps/web run test -- DashboardShell.test.tsx DashboardRoute.test.tsx
```

Evidence: 2026-06-10, 2 files passed, 18 tests passed.

- [x] **Step 2: Run web build**

```bash
npm run build:web
```

Evidence: 2026-06-10, `next build` completed successfully and generated `/dashboard`.

- [x] **Step 3: Run browser visual verification**

Open `/dashboard` locally and inspect desktop and mobile widths for clipping, overlap, missing assets, and launch-page continuity.

Evidence: 2026-06-10, Playwright QA at `http://127.0.0.1:3000/dashboard` with route-level API fixtures because Docker/PostgreSQL was unavailable. Desktop 1440x1000 and mobile 390x844 had no console errors and no horizontal overflow. Screenshots were saved under `output/playwright/`.

- [x] **Step 4: Dispatch parallel reviewers**

Run one spec-compliance review and one code-quality review on the changed frontend files before finalizing.

Evidence: Spec-compliance review returned `APPROVED_WITH_CONCERNS`; its only concern was pending browser QA, now completed. Code-quality/regression-risk reviewer did not return after passive waits and was not used for the final verdict.

### Follow-up Slice: Analysis Intake And Job Status

**Files:**
- Modify: `apps/web/lib/types.ts`
- Modify: `apps/web/lib/api.ts`
- Create: `apps/web/components/AnalysisIntakePanel.tsx`
- Modify: `apps/web/components/DashboardShell.tsx`
- Modify: `apps/web/components/DashboardRoute.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `apps/web/lib/api.test.ts`
- Test: `apps/web/components/DashboardShell.test.tsx`
- Test: `apps/web/components/DashboardRoute.test.tsx`

- [x] Add typed API client coverage for `GET /api/fixtures`,
  `POST /api/fixtures/{fixture_id}/ingest`, `POST /api/uploads/analyze`, and
  `GET /api/analysis-jobs/{job_id}`.
- [x] Add a compact cockpit panel so operators can start fixture/upload analysis
  and inspect the latest job state from `/dashboard`.
- [x] Keep all copy simulation-only and avoid implying real signal control.
- [x] Verify with `npm --workspace apps/web run test`; evidence on 2026-06-10:
  5 test files and 41 tests passed.
