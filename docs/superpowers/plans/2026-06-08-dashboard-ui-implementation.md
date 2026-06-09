# Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved glassy bilingual smart-intersection dashboard UI and connect it to the Phase 1 FastAPI contracts.

**Architecture:** `apps/web/app/page.tsx` is the client-side container that loads API data and owns action handlers. `DashboardShell` is the presentational dashboard with the required props contract. `DigitalTwin` is implemented as a replaceable simulation viewport boundary: it receives normalized props and does not fetch backend data directly, so Phase 2 can swap in real SUMO/TraCI or another renderer.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, CSS modules through global CSS only for this MVP slice.

---

## Source Inputs

- Approved concept: `docs/design/assets/dashboard-concept-approved.png`
- Concept notes: `docs/design/dashboard-concept-notes.md`
- MVP spec: `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md`
- API client: `apps/web/lib/api.ts`
- API types: `apps/web/lib/types.ts`

## Current Execution Tracker

Current as of 2026-06-09. The task steps below remain useful as the historical
implementation recipe; this tracker is the current status.

- [x] Add lightweight Korean/English dictionary and language toggle.
- [x] Add `DashboardShell` and child dashboard components.
- [x] Keep `DigitalTwin` as a replaceable simulation viewport boundary that
  receives data through props and does not call backend APIs directly.
- [x] Extract the center renderer into `SimulationViewport`, with SUMO/TraCI
  source and delay telemetry supplied by normalized dashboard props.
- [x] Connect `apps/web/app/page.tsx` to the Phase 1 API client for initial
  data, chat, reports, recommendations, and simulation refresh.
- [x] Implement the approved restrained glassy dashboard CSS.
- [x] Cover dashboard interaction and API-client behavior with Vitest tests.
- [x] Validate frontend with `npm --workspace apps/web run test` and
  `npm run build:web`.
- [x] Rerun a fresh live browser smoke and compare the latest screenshot against
  `docs/design/assets/dashboard-concept-approved.png`. Evidence: Browser check
  at `http://localhost:3000` on 2026-06-09 verified page identity, rendered
  dashboard content, no console errors/warnings, language toggle, chat, report,
  simulation action, and visible safety copy. The live viewport remains a
  code-native replaceable renderer, not a photo-realistic simulation.

## File Structure

Create:

```text
apps/web/components/DashboardShell.tsx
apps/web/components/LanguageToggle.tsx
apps/web/components/DigitalTwin.tsx
apps/web/components/EventTimeline.tsx
apps/web/components/RecommendationPanel.tsx
apps/web/components/MetricsPanel.tsx
apps/web/components/ChatReportPanel.tsx
apps/web/lib/i18n.ts
```

Modify:

```text
apps/web/app/page.tsx
apps/web/app/globals.css
```

## Design System

Use these tokens in `apps/web/app/globals.css`:

```css
:root {
  --bg: #e8eef2;
  --surface: rgba(255, 255, 255, 0.72);
  --surface-strong: rgba(255, 255, 255, 0.86);
  --surface-dark: rgba(14, 26, 37, 0.84);
  --border: rgba(15, 35, 52, 0.14);
  --border-strong: rgba(15, 35, 52, 0.24);
  --text: #132232;
  --muted: #607080;
  --accent: #0b8f73;
  --accent-soft: rgba(11, 143, 115, 0.12);
  --warning: #d9911e;
  --danger: #e13d3d;
  --info: #2d7fc5;
  --shadow: 0 18px 55px rgba(18, 38, 54, 0.16);
  --radius: 8px;
}
```

Rules:

- Radius stays at `8px` or below.
- Frosted glass is subtle: `backdrop-filter: blur(18px)` only on major panels.
- No neon glow, decorative bokeh, gradient orbs, or marketing hero composition.
- The safety copy remains visible in Korean and English.

## Task 1: Add Lightweight i18n And Language Toggle

**Files:**
- Create: `apps/web/lib/i18n.ts`
- Create: `apps/web/components/LanguageToggle.tsx`

- [x] **Step 1: Write `apps/web/lib/i18n.ts`**

```ts
export type Locale = "ko" | "en";

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "EN"
};

export const copy = {
  ko: {
    appName: "스마트 교차로 운영 시스템",
    appSubtitle: "Smart Intersection Ops",
    intersection: "INT-0001 시청 교차로",
    intersectionSub: "City Hall Crossing",
    scenario: "시나리오 08:42",
    analysisReady: "분석 완료",
    fresh: "Fresh 12s",
    eventTimeline: "이벤트 타임라인",
    aiRecommendation: "AI 추천",
    simulationOnly: "시뮬레이션 전용",
    noRealControl: "실제 신호 제어 없음",
    currentSituation: "현재 상황",
    recommendedAction: "권고 조치",
    recommendEast: "동쪽 우선 신호 권고",
    evidence: "근거",
    performance: "성과 비교",
    aiAgent: "AI 에이전트",
    reports: "리포트",
    generateReport: "리포트 생성",
    askPlaceholder: "현재 교통 상황 질문",
    safetyCopy: "권고와 시뮬레이션만 제공합니다. 실제 교통 신호 제어는 수행하지 않습니다."
  },
  en: {
    appName: "Smart Intersection Ops",
    appSubtitle: "Decision Support System",
    intersection: "INT-0001 City Hall Crossing",
    intersectionSub: "City Hall Crossing",
    scenario: "Scenario 08:42",
    analysisReady: "Analysis complete",
    fresh: "Fresh 12s",
    eventTimeline: "Event Timeline",
    aiRecommendation: "AI Recommendation",
    simulationOnly: "Simulation only",
    noRealControl: "No real signal control",
    currentSituation: "Current Situation",
    recommendedAction: "Recommended Action",
    recommendEast: "Recommend East Priority Signal",
    evidence: "Evidence",
    performance: "Performance Comparison",
    aiAgent: "AI Agent",
    reports: "Reports",
    generateReport: "Generate Report",
    askPlaceholder: "Ask about current traffic situation",
    safetyCopy: "Recommendation and simulation only. No real traffic signal control is performed."
  }
} as const;

export function formatDirection(direction: string | null, locale: Locale): string {
  if (!direction) return locale === "ko" ? "전체" : "All";
  const labels: Record<string, Record<Locale, string>> = {
    north: { ko: "북", en: "North" },
    south: { ko: "남", en: "South" },
    east: { ko: "동", en: "East" },
    west: { ko: "서", en: "West" }
  };
  return labels[direction]?.[locale] ?? direction;
}
```

- [x] **Step 2: Write `apps/web/components/LanguageToggle.tsx`**

```tsx
import type { Locale } from "@/lib/i18n";
import { localeLabels } from "@/lib/i18n";

type LanguageToggleProps = {
  locale: Locale;
  onChange: (locale: Locale) => void;
};

export function LanguageToggle({ locale, onChange }: LanguageToggleProps) {
  return (
    <div className="language-toggle" aria-label="Language">
      {(["ko", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={option === locale ? "active" : ""}
          onClick={() => onChange(option)}
          aria-pressed={option === locale}
        >
          {localeLabels[option]}
        </button>
      ))}
    </div>
  );
}
```

## Task 2: Add Dashboard Component Skeletons

**Files:**
- Create: `apps/web/components/DashboardShell.tsx`
- Create: `apps/web/components/DigitalTwin.tsx`
- Create: `apps/web/components/EventTimeline.tsx`
- Create: `apps/web/components/RecommendationPanel.tsx`
- Create: `apps/web/components/MetricsPanel.tsx`
- Create: `apps/web/components/ChatReportPanel.tsx`

- [x] **Step 1: Write `DashboardShell` with the required props contract**

Use this exact exported type:

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

`DashboardShell` also owns local `locale` state and passes it to child components.

- [x] **Step 2: Implement child component responsibilities**

`DigitalTwin.tsx`:

- Props: `status`, `events`, `locale`, `onRunSimulation`.
- Render the replaceable simulation viewport label.
- Render directional queue labels from `status.queues`.
- Render the emergency event marker when an event has `event_type === "emergency_vehicle_approach"`.
- Do not call API functions inside this component.

`EventTimeline.tsx`:

- Props: `events`, `locale`.
- Render newest events in a compact vertical timeline.
- Show severity, time, direction, and `ai_summary`.

`RecommendationPanel.tsx`:

- Props: `recommendation`, `locale`, `onRefreshRecommendation`.
- Render current situation, action, evidence rows, and safety boundary.
- Always include `copy[locale].noRealControl`.

`MetricsPanel.tsx`:

- Props: `status`, `simulation`, `locale`.
- Render queue metrics and baseline vs recommended simulation values.
- Show delay improvement from `simulation.improvement.total_delay_percent`.

`ChatReportPanel.tsx`:

- Props: `chat`, `report`, `locale`, `onAskQuestion`, `onGenerateReport`.
- Keep a controlled question input.
- Submit with Enter or send button.
- Render latest answer and latest report summary.

## Task 3: Connect Page Container To API Client

**Files:**
- Modify: `apps/web/app/page.tsx`

- [x] **Step 1: Convert the page to a client-side dashboard container**

Use `"use client";`.

The page must:

- Track loading and error state.
- Load initial dashboard data with `Promise.all`.
- Pass all required props to `DashboardShell`.
- Re-run the relevant API call for chat, report, recommendation, and simulation actions.

Required initial calls:

```ts
getIntersectionStatus()
getEvents()
recommendSignal()
simulateSignal()
generateReport()
```

## Task 4: Implement Glassy Dashboard CSS

**Files:**
- Modify: `apps/web/app/globals.css`

- [x] **Step 1: Replace the scaffold CSS with the approved design tokens**

CSS must include:

- global font stack
- page background
- glass panels
- top system bar
- dashboard grid
- timeline rows
- digital twin roads and markers
- recommendation, metrics, chat, and report panels
- language toggle selected state
- mobile fallback below `900px`

## Task 5: Verify Implementation

**Files:**
- Modify only if validation finds a concrete bug.

- [x] **Step 1: Run frontend tests**

```bash
npm --workspace apps/web run test
```

Expected: all tests pass.

- [x] **Step 2: Run frontend build**

```bash
npm run build:web
```

Expected: Next.js compiles and typechecks.

- [x] **Step 3: Run local browser smoke after API and web are started**

Start API:

```bash
cd apps/api
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start web:

```bash
npm --workspace apps/web run dev
```

Browser checks:

```text
dashboard renders
한국어 / EN selector is visible
language selector switches visible labels
central replaceable simulation viewport is visible
event timeline is visible
AI recommendation panel is visible
metrics panel is visible
chat/report panel is visible
chat submit renders answer
generate report renders latest summary
refresh recommendation works
run simulation works
safety boundary remains visible after every action
no copy implies real traffic signal control
```

- [x] **Step 4: Visual fidelity check**

Use `view_image` on:

```text
docs/design/assets/dashboard-concept-approved.png
latest browser screenshot
```

Compare at least:

- top bar hierarchy and language toggle
- glassy panel treatment
- central simulation viewport dominance
- event timeline density
- recommendation safety boundary
- chat/report panel position
- color restraint without neon

- [x] **Step 5: Commit dashboard UI implementation**

```bash
git add docs/superpowers/plans/2026-06-08-dashboard-ui-implementation.md apps/web
git commit -m "feat: build dashboard UI"
```
