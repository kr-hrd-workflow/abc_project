# Civic Living UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a living Civic Nervous System landing page at `/` and move the existing Smart Intersection dashboard to `/dashboard`, then upgrade the dashboard visual hierarchy without changing backend contracts.

**Architecture:** Extract the current client dashboard route into a focused `DashboardRoute` component, make `apps/web/app/page.tsx` a static landing page, and add a new `apps/web/app/dashboard/page.tsx` route. Keep existing dashboard data flow and scenario API calls intact, while styling the landing and dashboard through shared CSS tokens in `globals.css`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS modules via global stylesheet, Vitest, Testing Library, in-app browser smoke testing.

---

## Constraints

- Lead design authority: `ui-ux-pro-max`.
- Aesthetic support: `design-taste-frontend`.
- Approved spec: `docs/superpowers/specs/2026-06-09-civic-living-ui-design.md`.
- Do not change backend endpoints, payloads, scenario IDs, OpenAI gates, YOLO, SUMO, pgvector, or runtime-readiness behavior.
- Do not add a third-party animation or design dependency.
- Do not commit unless the user explicitly approves commits for this task.

## File Structure

- Create: `apps/web/components/DashboardRoute.tsx`
  - Owns the existing dashboard data loading, scenario selection, chat, report, recommendation refresh, and simulation actions.
- Create: `apps/web/app/dashboard/page.tsx`
  - Renders `DashboardRoute` at `/dashboard`.
- Create: `apps/web/components/LandingNetworkScene.tsx`
  - Renders the living civic network hero visual with semantic labels and CSS-driven motion.
- Create: `apps/web/app/page.test.tsx`
  - Verifies the landing route renders its main heading, dashboard link, workflow anchor, and network scene.
- Modify: `apps/web/app/page.tsx`
  - Replace the current dashboard route with the landing page.
- Modify: `apps/web/components/DashboardShell.tsx`
  - Replace the dense top bar with a clearer header plus scenario rail, keep all props and callback contracts.
- Modify: `apps/web/components/DashboardShell.test.tsx`
  - Add coverage for the dashboard `h1`, scenario rail, and refreshed recommendation loading state if touched.
- Modify: `apps/web/components/RecommendationPanel.tsx`
  - Add a short disabled/loading state around recommendation refresh.
- Modify: `apps/web/app/globals.css`
  - Add the civic visual system, landing scene, route split classes, dashboard header layout, motion tokens, focus states, responsive rules, and reduced-motion fallback.
- Optional modify: `apps/web/app/layout.tsx`
  - Update metadata if the final landing copy changes the public product description.

## Task 1: Route Split With Failing Landing Test

**Files:**
- Create: `apps/web/app/page.test.tsx`
- Create: `apps/web/components/DashboardRoute.tsx`
- Create: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/app/page.tsx`

- [x] **Step 1: Write the failing landing route test**

Create `apps/web/app/page.test.tsx`:

```tsx
// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import Page from "./page";

afterEach(() => {
  cleanup();
});

describe("Landing page", () => {
  test("renders the living landing page entry points", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Smart Intersection Ops" })
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Open dashboard" }).getAttribute("href")
    ).toBe("/dashboard");
    expect(
      screen.getByRole("link", { name: "View decision workflow" }).getAttribute("href")
    ).toBe("#decision-workflow");
    expect(screen.getByLabelText("Animated civic network map")).toBeTruthy();
  });
});
```

- [x] **Step 2: Run the new test and verify it fails**

Run:

```bash
npm --workspace apps/web run test -- app/page.test.tsx
```

Expected: FAIL because the current `/` route still renders the dashboard loading shell and does not render the `Open dashboard` link.

- [x] **Step 3: Extract the existing dashboard route into `DashboardRoute`**

Create `apps/web/components/DashboardRoute.tsx` by moving the current code from `apps/web/app/page.tsx` and renaming the exported component:

```tsx
"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "./DashboardShell";
import {
  askQuestion,
  generateReport,
  getEvents,
  getIntersectionStatus,
  recommendSignal,
  simulateSignal
} from "../lib/api";
import type {
  ChatResponse,
  IntersectionStatus,
  Recommendation,
  Report,
  ScenarioId,
  SimulationComparison,
  TrafficEvent
} from "../lib/types";
import { SCENARIO_OPTIONS } from "../lib/types";

const DEFAULT_SCENARIO_ID: ScenarioId = "emergency";

type DashboardData = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  recommendation: Recommendation;
  simulation: SimulationComparison;
  report: Report;
  chat: ChatResponse | null;
};

export function DashboardRoute() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<ScenarioId>(DEFAULT_SCENARIO_ID);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  useEffect(() => {
    void loadDashboard(DEFAULT_SCENARIO_ID);
  }, []);

  async function loadDashboard(scenarioId: ScenarioId) {
    try {
      const [status, events, recommendation, simulation, report] =
        await Promise.all([
          getIntersectionStatus(scenarioId),
          getEvents(scenarioId),
          recommendSignal(scenarioId),
          simulateSignal(scenarioId),
          generateReport(scenarioId)
        ]);

      setData({ status, events, recommendation, simulation, report, chat: null });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
    }
  }

  async function handleAskQuestion(question: string) {
    const chat = await askQuestion(question, selectedScenarioId);
    setData((current) => (current ? { ...current, chat } : current));
  }

  async function handleGenerateReport() {
    const report = await generateReport(selectedScenarioId);
    setData((current) => (current ? { ...current, report } : current));
  }

  async function handleRefreshRecommendation() {
    const recommendation = await recommendSignal(selectedScenarioId);
    setData((current) => (current ? { ...current, recommendation } : current));
  }

  async function handleRunSimulation() {
    const simulation = await simulateSignal(selectedScenarioId);
    setData((current) => (current ? { ...current, simulation } : current));
  }

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

  if (error) {
    return (
      <main className="loading-shell">
        <h1>Smart Intersection Ops</h1>
        <p>{error}</p>
        <button type="button" onClick={() => void loadDashboard(selectedScenarioId)}>
          Retry
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="loading-shell">
        <h1>Smart Intersection Ops</h1>
        <p>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <DashboardShell
      status={data.status}
      events={data.events}
      recommendation={data.recommendation}
      simulation={data.simulation}
      report={data.report}
      chat={data.chat}
      selectedScenarioId={selectedScenarioId}
      scenarioOptions={SCENARIO_OPTIONS}
      scenarioLoading={scenarioLoading}
      onAskQuestion={handleAskQuestion}
      onGenerateReport={handleGenerateReport}
      onRefreshRecommendation={handleRefreshRecommendation}
      onRunSimulation={handleRunSimulation}
      onScenarioChange={(scenarioId) => void handleScenarioChange(scenarioId)}
    />
  );
}
```

- [x] **Step 4: Add the dashboard route**

Create `apps/web/app/dashboard/page.tsx`:

```tsx
import { DashboardRoute } from "../../components/DashboardRoute";

export default function DashboardPage() {
  return <DashboardRoute />;
}
```

- [x] **Step 5: Replace the root page with a minimal landing shell**

Replace `apps/web/app/page.tsx` with:

```tsx
import Link from "next/link";

import { LandingNetworkScene } from "../components/LandingNetworkScene";

export default function Page() {
  return (
    <main className="landing-shell">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Civic traffic decision support</p>
          <h1 id="landing-title">Smart Intersection Ops</h1>
          <p>
            See traffic conditions, compare signal recommendations, and brief
            operators from one live civic view.
          </p>
          <div className="landing-actions">
            <Link href="/dashboard" className="primary-link">
              Open dashboard
            </Link>
            <a href="#decision-workflow" className="secondary-link">
              View decision workflow
            </a>
          </div>
        </div>
        <LandingNetworkScene />
      </section>
      <section id="decision-workflow" className="landing-band">
        <h2>Decision workflow</h2>
        <p>
          Events become evidence, evidence becomes recommendations, and every
          recommendation stays simulation-only.
        </p>
      </section>
    </main>
  );
}
```

- [x] **Step 6: Add the minimal network component**

Create `apps/web/components/LandingNetworkScene.tsx`:

```tsx
const nodes = ["north", "east", "south", "west", "center", "emergency"];
const routes = ["route-east", "route-west", "route-emergency"];

export function LandingNetworkScene() {
  return (
    <div className="landing-network" aria-label="Animated civic network map">
      <div className="network-grid" aria-hidden="true" />
      {routes.map((route) => (
        <span key={route} className={`network-route ${route}`} aria-hidden="true" />
      ))}
      {nodes.map((node) => (
        <span key={node} className={`network-node node-${node}`} aria-hidden="true" />
      ))}
      <div className="network-status">
        <strong>INT-0001</strong>
        <span>Recommendation and simulation only</span>
      </div>
    </div>
  );
}
```

- [x] **Step 7: Run the route test and verify it passes**

Run:

```bash
npm --workspace apps/web run test -- app/page.test.tsx
```

Expected: PASS for the landing route test.

## Task 2: Living Landing Page Content And Motion

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/LandingNetworkScene.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/page.test.tsx`

- [x] **Step 1: Extend the landing test for spec-required content**

Modify `apps/web/app/page.test.tsx` so the test also checks the safety boundary and preview sections:

```tsx
expect(screen.getByRole("heading", { level: 2, name: "Live intersection picture" })).toBeTruthy();
expect(screen.getByRole("heading", { level: 2, name: "Recommendation boundary" })).toBeTruthy();
expect(screen.getByRole("heading", { level: 2, name: "Dashboard preview" })).toBeTruthy();
expect(screen.getByText(/does not control real signals/i)).toBeTruthy();
```

- [x] **Step 2: Run the test and verify it fails**

Run:

```bash
npm --workspace apps/web run test -- app/page.test.tsx
```

Expected: FAIL because the minimal landing page does not render all three landing sections.

- [x] **Step 3: Expand `apps/web/app/page.tsx` with the approved landing sections**

Keep the hero from Task 1 and replace the single `landing-band` section with:

```tsx
<section className="landing-section landing-proof" aria-labelledby="live-picture-title">
  <div>
    <h2 id="live-picture-title">Live intersection picture</h2>
    <p>
      Queue lengths, pedestrian demand, emergency approach, and recent events
      stay visible before any recommendation is considered.
    </p>
  </div>
  <div className="landing-proof-grid" aria-label="Dashboard preview metrics">
    <span><strong>16</strong> west queue</span>
    <span><strong>12s</strong> emergency ETA</span>
    <span><strong>-18%</strong> simulated wait</span>
  </div>
</section>

<section className="landing-section landing-boundary" aria-labelledby="boundary-title">
  <h2 id="boundary-title">Recommendation boundary</h2>
  <p>
    Smart Intersection Ops recommends and simulates traffic plans. It does not
    control real signals, connect to live controllers, or override operator
    judgment.
  </p>
</section>

<section id="decision-workflow" className="landing-section landing-workflow" aria-labelledby="workflow-title">
  <h2 id="workflow-title">Scenario workflow</h2>
  <ol>
    <li><strong>Events</strong><span>Traffic evidence is normalized by direction, severity, and source.</span></li>
    <li><strong>Recommendation</strong><span>The system proposes a simulation-only signal plan.</span></li>
    <li><strong>Simulation</strong><span>Fixed and recommended plans are compared before operator review.</span></li>
    <li><strong>Brief</strong><span>Chat and report surfaces turn the scenario into a readable handoff.</span></li>
  </ol>
</section>

<section className="landing-section landing-dashboard-preview" aria-labelledby="dashboard-preview-title">
  <div>
    <h2 id="dashboard-preview-title">Dashboard preview</h2>
    <p>
      The dashboard stays practical: scenario switching, digital twin, event
      timeline, recommendation evidence, metrics, chat, and reports remain in
      one operator flow.
    </p>
  </div>
  <Link href="/dashboard" className="primary-link compact">
    Open dashboard
  </Link>
</section>
```

- [x] **Step 4: Add landing CSS and motion fallback**

Append these groups to `apps/web/app/globals.css` after the base button styles and before dashboard-specific layout styles:

```css
a {
  color: inherit;
}

a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 3px solid rgba(7, 141, 118, 0.42);
  outline-offset: 3px;
}

.landing-shell {
  min-height: 100dvh;
  overflow-x: hidden;
  background:
    linear-gradient(180deg, rgba(247, 252, 255, 0.96), rgba(225, 237, 244, 0.76)),
    radial-gradient(circle at 75% 8%, rgba(7, 141, 118, 0.1), transparent 34%);
}

.landing-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(320px, 1.1fr);
  gap: clamp(28px, 5vw, 80px);
  align-items: center;
  min-height: min(760px, 92dvh);
  padding: clamp(28px, 6vw, 80px);
}

.landing-hero-copy {
  display: grid;
  gap: 22px;
  max-width: 680px;
}

.landing-kicker {
  margin: 0;
  color: var(--accent-strong);
  font-size: 0.95rem;
  font-weight: 800;
}

.landing-hero h1 {
  margin: 0;
  max-width: 11ch;
  font-size: clamp(3.4rem, 9vw, 6rem);
  line-height: 0.98;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.landing-hero p {
  margin: 0;
  max-width: 62ch;
  color: #344f63;
  font-size: clamp(1rem, 2vw, 1.25rem);
  line-height: 1.6;
}

.landing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.primary-link,
.secondary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  border-radius: 8px;
  padding: 0 18px;
  font-weight: 800;
  text-decoration: none;
}

.primary-link {
  color: white;
  background: var(--accent);
}

.secondary-link {
  border: 1px solid var(--border-strong);
  color: var(--text);
  background: rgba(255, 255, 255, 0.62);
}

.landing-network {
  position: relative;
  min-height: 520px;
  border: 1px solid rgba(48, 75, 96, 0.2);
  border-radius: 8px;
  overflow: hidden;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(219, 233, 241, 0.7)),
    radial-gradient(circle at 52% 48%, rgba(7, 141, 118, 0.12), transparent 28%);
}

.network-grid {
  position: absolute;
  inset: 28px;
  background-image:
    linear-gradient(rgba(39, 71, 94, 0.11) 1px, transparent 1px),
    linear-gradient(90deg, rgba(39, 71, 94, 0.11) 1px, transparent 1px);
  background-size: 52px 52px;
}

.network-route,
.network-node {
  position: absolute;
  display: block;
}

.network-route {
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.78;
  transform-origin: left center;
  animation: networkPulse 3.8s ease-in-out infinite;
}

.route-east {
  top: 48%;
  left: 18%;
  width: 62%;
}

.route-west {
  top: 58%;
  left: 12%;
  width: 44%;
  transform: rotate(-18deg);
}

.route-emergency {
  top: 36%;
  left: 42%;
  width: 42%;
  background: linear-gradient(90deg, transparent, var(--danger), transparent);
  transform: rotate(28deg);
}

.network-node {
  width: 16px;
  height: 16px;
  border: 3px solid white;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 8px rgba(7, 141, 118, 0.1);
}

.node-north { top: 20%; left: 47%; }
.node-east { top: 46%; right: 14%; }
.node-south { bottom: 18%; left: 49%; }
.node-west { top: 55%; left: 14%; }
.node-center { top: 48%; left: 49%; }
.node-emergency { top: 34%; right: 18%; background: var(--danger); box-shadow: 0 0 0 8px rgba(226, 71, 71, 0.1); }

.network-status {
  position: absolute;
  left: 24px;
  bottom: 24px;
  display: grid;
  gap: 4px;
  max-width: min(320px, calc(100% - 48px));
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
}

.network-status span {
  color: var(--muted);
  font-size: 0.9rem;
}

@keyframes networkPulse {
  0%, 100% { opacity: 0.36; transform: scaleX(0.72); }
  50% { opacity: 0.9; transform: scaleX(1); }
}

.landing-section {
  display: grid;
  gap: 18px;
  padding: clamp(34px, 6vw, 76px);
  border-top: 1px solid var(--border);
}

.landing-section h2 {
  margin: 0;
  font-size: clamp(1.7rem, 4vw, 3.4rem);
  line-height: 1.05;
  letter-spacing: -0.025em;
}

.landing-section p,
.landing-section li span {
  max-width: 68ch;
  color: #344f63;
  line-height: 1.6;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

@media (max-width: 820px) {
  .landing-hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .landing-network {
    min-height: 360px;
  }
}
```

- [x] **Step 5: Run the landing test and verify it passes**

Run:

```bash
npm --workspace apps/web run test -- app/page.test.tsx
```

Expected: PASS for all landing route assertions.

## Task 3: Dashboard Header And Scenario Rail

**Files:**
- Modify: `apps/web/components/DashboardShell.test.tsx`
- Modify: `apps/web/components/DashboardShell.tsx`
- Modify: `apps/web/app/globals.css`

- [x] **Step 1: Add dashboard hierarchy tests**

Add this test inside `describe("DashboardShell", ...)`:

```tsx
test("renders a clear dashboard heading and scenario rail", () => {
  renderDashboard({ selectedScenarioId: "emergency" });

  expect(
    screen.getByRole("heading", { level: 1, name: "스마트 교차로 운영 시스템" })
  ).toBeTruthy();
  expect(screen.getByLabelText("시나리오 08:42")).toBeTruthy();
  expect(screen.getByText("긴급차량 우선 통과")).toBeTruthy();
});
```

- [x] **Step 2: Run the dashboard test and verify it fails**

Run:

```bash
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
```

Expected: FAIL because `DashboardShell` does not currently render an `h1` and the scenario area is embedded in the dense top bar.

- [x] **Step 3: Replace the dashboard header markup**

In `apps/web/components/DashboardShell.tsx`, replace the current `<header className="top-bar">...</header>` block with:

```tsx
<header className="dashboard-header">
  <div className="dashboard-identity-row">
    <div className="brand-block">
      <div className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="brand-copy">
        <h1>{t.appName}</h1>
        <span>{t.appSubtitle}</span>
      </div>
    </div>
    <div className="top-meta">
      <strong>{t.intersection}</strong>
      <span>{t.intersectionSub}</span>
    </div>
    <div className="status-strip" aria-label="Dashboard status">
      <div className="status-chip success">
        <span>
          <strong>{t.analysisReady}</strong>
          <small>{t.analysisReadySub}</small>
        </span>
      </div>
      <div className="status-chip freshness">
        <span>
          <strong>{t.fresh}</strong>
          <small>{t.freshSub}</small>
        </span>
      </div>
    </div>
    <LanguageToggle locale={locale} onChange={setLocale} />
  </div>

  <div className="dashboard-scenario-row">
    <section className="scenario-control" aria-label={t.scenario}>
      <div className="scenario-control-copy">
        <strong>{selectedScenarioLabel ? selectedScenarioLabel : t.scenario}</strong>
        <span>
          {scenarioLoading
            ? scenarioLoadingText
            : selectedScenarioDescription
              ? selectedScenarioDescription
              : t.scenario}
        </span>
      </div>
      <div className="segment-control" aria-label={t.scenario}>
        {scenarioOptions.map((option) => {
          const selected = option.id === selectedScenarioId;
          const label = locale === "ko" ? option.labelKo : option.labelEn;

          return (
            <button
              key={option.id}
              type="button"
              className={selected ? "active" : ""}
              aria-pressed={selected}
              disabled={scenarioLoading || selected}
              onClick={() => onScenarioChange(option.id)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>

    <nav className="top-actions" aria-label="Dashboard actions">
      <button type="button" className="icon-action alert-action">
        <span aria-hidden="true" className="toolbar-icon bell" />
        <span>{t.alerts}</span>
      </button>
      <button type="button" className="icon-action">
        <span aria-hidden="true" className="toolbar-icon document" />
        <span>{t.reports}</span>
      </button>
      <button type="button" className="icon-action">
        <span aria-hidden="true" className="toolbar-icon gear" />
        <span>{t.settings}</span>
      </button>
    </nav>

    <div className="operator-card" aria-label={t.operator}>
      <span aria-hidden="true" className="operator-avatar" />
      <div>
        <strong>{t.operator}</strong>
        <small>Operator A</small>
      </div>
      <span aria-hidden="true" className="chevron" />
    </div>
  </div>
</header>
```

- [x] **Step 4: Add dashboard header CSS**

In `apps/web/app/globals.css`, replace the `.top-bar` layout rules with:

```css
.dashboard-header,
.panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(222, 235, 243, 0.62)),
    var(--surface);
  box-shadow: var(--inner-shadow);
}

.dashboard-header {
  display: grid;
  overflow: hidden;
}

.dashboard-identity-row,
.dashboard-scenario-row {
  display: grid;
  align-items: stretch;
}

.dashboard-identity-row {
  grid-template-columns: minmax(240px, 1fr) minmax(220px, auto) minmax(220px, auto) auto;
  border-bottom: 1px solid var(--border);
}

.dashboard-scenario-row {
  grid-template-columns: minmax(320px, 1fr) minmax(180px, auto) minmax(150px, auto);
}

.brand-copy h1 {
  margin: 0;
  overflow: hidden;
  font-size: 17px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(110px, auto));
}

.dashboard-header .scenario-control {
  border-left: 0;
  grid-template-columns: minmax(220px, 0.8fr) minmax(280px, 1fr);
  align-items: center;
}

.dashboard-header .segment-control button {
  min-height: 44px;
}

@media (max-width: 1120px) {
  .dashboard-identity-row,
  .dashboard-scenario-row {
    grid-template-columns: 1fr;
  }

  .brand-block,
  .top-meta,
  .status-strip,
  .language-toggle,
  .scenario-control,
  .top-actions,
  .operator-card {
    border-left: 0;
    border-top: 1px solid var(--border);
  }

  .brand-block {
    border-top: 0;
  }
}
```

- [x] **Step 5: Run dashboard shell tests and verify they pass**

Run:

```bash
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
```

Expected: PASS for existing dashboard behavior and the new header hierarchy test.

## Task 4: Recommendation Refresh Loading State

**Files:**
- Modify: `apps/web/components/DashboardShell.test.tsx`
- Modify: `apps/web/components/RecommendationPanel.tsx`

- [x] **Step 1: Add a refresh loading test**

Add this test to `apps/web/components/DashboardShell.test.tsx`:

```tsx
test("disables recommendation refresh while refresh is running", async () => {
  const user = userEvent.setup();
  let resolveRefresh: () => void = () => undefined;
  const onRefreshRecommendation = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      })
  );

  renderDashboard({ onRefreshRecommendation });

  const refreshButton = screen.getByRole("button", { name: "추천 새로고침" });
  await user.click(refreshButton);

  expect((refreshButton as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("추천 새로고침 중")).toBeTruthy();

  resolveRefresh();
});
```

- [x] **Step 2: Run the dashboard test and verify it fails**

Run:

```bash
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
```

Expected: FAIL because `RecommendationPanel` does not yet manage a loading state.

- [x] **Step 3: Add loading state to `RecommendationPanel`**

Modify `apps/web/components/RecommendationPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Recommendation } from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy, formatDirection } from "../lib/i18n";
```

Inside `RecommendationPanel`, add:

```tsx
const [refreshState, setRefreshState] = useState<"idle" | "running">("idle");

async function handleRefreshRecommendation() {
  setRefreshState("running");
  try {
    await onRefreshRecommendation();
  } finally {
    setRefreshState("idle");
  }
}
```

Replace the refresh button with:

```tsx
<button
  type="button"
  aria-label={t.refreshRecommendation}
  onClick={handleRefreshRecommendation}
  disabled={refreshState === "running"}
>
  {refreshState === "running" ? "..." : "i"}
</button>
```

Add the status message inside `.simulation-mode` after the button:

```tsx
{refreshState === "running" ? (
  <small role="status">
    {locale === "ko" ? "추천 새로고침 중" : "Refreshing recommendation"}
  </small>
) : null}
```

- [x] **Step 4: Run dashboard shell tests and verify they pass**

Run:

```bash
npm --workspace apps/web run test -- components/DashboardShell.test.tsx
```

Expected: PASS for recommendation refresh loading behavior and existing dashboard behavior.

## Task 5: Civic Visual System And Responsive Dashboard Polish

**Files:**
- Modify: `apps/web/app/globals.css`

- [x] **Step 1: Add responsive and interaction CSS checks by inspection**

Before editing CSS, inspect existing selectors that set fixed heights, wide grid columns, and hidden overflow:

```bash
rg -n "100vh|min-height|grid-template-columns|overflow|box-shadow|border-radius" apps/web/app/globals.css
```

Expected: output includes `.dashboard-shell`, `.dashboard-grid`, `.top-bar`, `.panel`, and existing responsive sections.

- [x] **Step 2: Adjust base tokens for the civic palette**

At the top of `apps/web/app/globals.css`, update `:root` to keep the same token names and use a lighter civic palette:

```css
:root {
  --bg: #edf4f8;
  --surface: rgba(255, 255, 255, 0.76);
  --surface-soft: rgba(236, 246, 250, 0.64);
  --surface-strong: rgba(255, 255, 255, 0.9);
  --surface-dark: rgba(16, 29, 41, 0.9);
  --border: rgba(47, 78, 99, 0.18);
  --border-strong: rgba(47, 78, 99, 0.34);
  --text: #102235;
  --muted: #455f73;
  --accent: #078d76;
  --accent-strong: #057661;
  --accent-soft: rgba(7, 141, 118, 0.12);
  --warning: #b9770e;
  --danger: #c93f3f;
  --info: #236fa8;
  --navy: #27475e;
  --shadow: 0 10px 28px rgba(22, 42, 57, 0.1);
  --inner-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.54);
  --radius: 8px;
}
```

- [x] **Step 3: Make the dashboard grid responsive without horizontal overflow**

Append this responsive block after the current dashboard grid rules:

```css
@media (max-width: 1180px) {
  .dashboard-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    grid-template-rows: auto;
  }

  .timeline-panel,
  .simulation-panel,
  .recommendation-panel,
  .metrics-panel,
  .chat-report-grid {
    grid-column: 1 / -1;
    grid-row: auto;
  }
}

@media (max-width: 760px) {
  .dashboard-shell {
    padding: 10px;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .panel {
    padding: 12px;
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .top-actions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .top-actions button {
    min-height: 54px;
  }

  .metrics-table,
  .metrics-table-head,
  .metric-row {
    min-width: 0;
  }
}
```

- [x] **Step 4: Run frontend tests after CSS changes**

Run:

```bash
npm --workspace apps/web run test
```

Expected: PASS for all web tests.

## Task 6: Build, Browser Smoke, And Final Verification

**Files:**
- No required file edits.

- [x] **Step 1: Run the web test suite**

Run:

```bash
npm --workspace apps/web run test
```

Expected: PASS for all frontend tests.

- [x] **Step 2: Run the Next.js production build**

Run:

```bash
npm run build:web
```

Expected: PASS with a successful Next.js build.

- [x] **Step 3: Run whitespace validation**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [x] **Step 4: Start the local web server for browser validation**

Run:

```bash
npm run dev:web -- --hostname 127.0.0.1
```

Expected: Next.js starts and prints a local URL, normally `http://127.0.0.1:3000`.

- [x] **Step 5: Browser-smoke the landing route**

Open `http://127.0.0.1:3000/` in the in-app browser.

Expected:

- The first viewport shows `Smart Intersection Ops`.
- `Open dashboard` links to `/dashboard`.
- The living network scene is visible and nonblank.
- The next section is visible below the hero fold.
- No clipped headline or horizontal overflow at desktop width.

- [x] **Step 6: Browser-smoke the dashboard route**

Open `http://127.0.0.1:3000/dashboard` in the in-app browser.

Expected:

- The dashboard loads with scenario data.
- Scenario buttons still work.
- Korean/English toggle still works.
- Simulation run button still shows running and ready feedback.
- Recommendation refresh button disables while refreshing.
- No horizontal overflow on mobile viewport.
- No text overlap in the header, scenario rail, panels, or buttons.

- [x] **Step 7: Stop the dev server**

Stop the `npm run dev:web` process with Ctrl-C.

Expected: no lingering dev server session needed for this task.

## Self-Review Checklist

- Spec coverage:
  - `/` landing page: Task 1 and Task 2.
  - `/dashboard` route: Task 1.
  - Living civic network visual: Task 2.
  - Dashboard hierarchy upgrade: Task 3 and Task 5.
  - Scenario/API preservation: Task 1 keeps the current dashboard route logic unchanged.
  - Loading/focus/reduced-motion behavior: Task 2, Task 4, Task 5.
  - Tests/build/browser validation: Task 1 through Task 6.
- Type consistency:
  - `DashboardRoute` preserves existing `DashboardData`, `ScenarioId`, and callback signatures.
  - `LandingNetworkScene` has no props and no client state.
  - `RecommendationPanel` keeps its public props unchanged.
- Scope control:
  - Backend files are untouched.
  - No new dependency is introduced.
  - Existing dashboard API client functions remain unchanged.
