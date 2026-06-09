# Civic Living UI Design

## Status

Draft for user review.

This spec follows the user's approved visual direction from the brainstorming
companion: **B. Civic Nervous System**. The selected direction is a lighter,
trust-first civic interface where the city appears as a connected responsive
network, with subtle pulsing paths and a clearer dashboard hierarchy.

Skill pairing for this design:

- Lead: `ui-ux-pro-max` for accessibility, layout, typography, color,
  responsive behavior, interaction states, and component quality.
- Support: `design-taste-frontend` for the living landing-page aesthetic and
  anti-generic visual direction.

`impeccable` is not the lead for this slice. It remains available as an audit
or polish pass after the UI exists, but the implementation plan should treat
`ui-ux-pro-max` as the primary design authority.

## Product Goal

Create the next UI step for Smart Intersection Ops:

- A stunning landing page that feels alive without becoming decorative noise.
- A stronger main dashboard UI that feels brighter, more civic, more organized,
  and more trustworthy.

The UI should communicate that the product is a decision-support system for
traffic operators. It must not imply real autonomous traffic-signal control.

## Design Read

Reading this as: public-sector civic technology landing plus operator dashboard
for traffic staff and project reviewers, with a living network language,
leaning toward a bright civic command system rather than dark sci-fi telemetry.

Design dials:

- Structure: high clarity, predictable navigation, no hidden core actions.
- Motion: medium, meaningful, reduced-motion safe.
- Density: landing page medium-low, dashboard medium-high.
- Palette: light neutral civic base with one green-teal operational accent and
  restrained semantic colors for traffic status.

## Scope

### In Scope

- Add a real landing page at `/`.
- Move the current dashboard experience to `/dashboard`.
- Add a clear landing-page call to action that opens the dashboard.
- Upgrade the dashboard visual system around the Civic Nervous System direction.
- Preserve the scenario switcher and all existing API behavior.
- Preserve Korean/English dashboard language switching.
- Add accessible loading, focus, hover, selected, disabled, and reduced-motion
  behavior for touched UI elements.
- Add tests for route separation and changed UI behavior.
- Validate in browser on desktop and mobile viewports.

### Out Of Scope

- Backend API changes.
- New OpenAI, YOLO, SUMO, pgvector, or runtime-readiness gates.
- New authentication or user roles.
- Real traffic-signal-control behavior.
- New third-party animation dependencies unless separately approved.
- Commit, push, deploy, or external side effects.

## Route Architecture

The current dashboard lives in `apps/web/app/page.tsx` at `/`. To support an
actual landing page, the implementation should split routes:

```text
apps/web/app/page.tsx
  Landing page at /

apps/web/app/dashboard/page.tsx
  Dashboard data loader and DashboardShell at /dashboard
```

The dashboard route should keep the existing client-side behavior:

- Initial load uses the default scenario.
- Scenario changes reload status, events, recommendation, simulation, and report.
- Chat, report generation, recommendation refresh, and simulation actions keep
  passing the selected scenario ID.
- Existing dashboard API contracts remain unchanged.

## Landing Page Experience

### First View

The first viewport should make the product signal obvious:

- Primary name: `Smart Intersection Ops`.
- Plain-language promise: see traffic conditions, compare signal recommendations,
  and brief operators from one live civic view.
- Primary action: `Open dashboard`.
- Secondary anchor: `View decision workflow`, scrolling to the workflow section.
- Full-bleed living civic network scene as the visual asset.

The hero should not be a centered generic SaaS block. It should use an
asymmetric layout: copy on the left, animated city-network visual on the right
or behind the upper-right field. The next section should peek into the first
viewport on desktop and mobile.

### Living Network Scene

The living feel should come from product-relevant motion:

- Small network nodes represent intersections, sensors, emergency approach, and
  pedestrian demand.
- Thin routes pulse to show signal priority paths.
- One status path should move slowly enough to feel alive, not busy.
- Motion uses CSS transforms and opacity, not layout animation.
- `prefers-reduced-motion: reduce` disables pulsing and keeps a static,
  readable scene.

No decorative orbs, generic gradient blobs, diagonal stripe backgrounds, emoji,
or hand-drawn sketch illustrations.

### Landing Sections

Keep the page focused:

- `Live intersection picture`: explains status, events, and emergency priority.
- `Recommendation boundary`: states that the system recommends and simulates,
  but does not control real signals.
- `Scenario workflow`: shows how a scenario moves from events to recommendation,
  simulation, chat, and report.
- `Dashboard preview`: uses real product panels or simplified live UI fragments,
  not fake marketing cards.

## Dashboard UI Upgrade

The dashboard should continue to feel like an operator tool, but less cramped
and less heavy than the current glassy shell.

### Main Changes

- Replace the dense eight-column top bar with a clearer two-tier structure:
  brand and intersection identity first, scenario/language/actions second.
- Keep scenario switching prominent because it is now a core demo control.
- Reduce decorative glass treatment. Use light surfaces, crisp borders, and
  purposeful shadows only where hierarchy needs it.
- Use civic network cues as subtle separators, section headers, and data-flow
  accents rather than as decorative background clutter.
- Keep the central digital twin visually dominant.
- Give recommendation and simulation outcomes clearer action hierarchy.
- Make empty, loading, and error states visually consistent with the final UI.

### Dashboard Layout

Target desktop layout:

```text
Header: brand, intersection, freshness, language, actions
Scenario rail: selected scenario description and segmented control
Main grid:
  Left: event timeline
  Center: digital twin and simulation controls
  Right: recommendation and operational status
Bottom: metrics, chat, report
```

Target mobile layout:

```text
Header
Scenario control
Digital twin
Recommendation
Events
Metrics
Chat/report
```

Mobile must not require horizontal scrolling. Touch targets should be at least
44px tall where the user taps buttons, toggles, and segmented controls.

## Visual System

### Color

Use a restrained light civic palette:

- Background: cool near-white to pale blue-gray.
- Surface: white or very lightly tinted panels.
- Ink: high-contrast blue-black.
- Muted text: darker blue-gray that still passes contrast.
- Accent: one green-teal operational color for primary actions, selected state,
  and active network paths.
- Semantic colors: warning, danger, info, and success reserved for status.

Avoid a one-note blue/purple tech palette. Avoid beige, sand, brown, espresso,
and purple-blue gradient defaults.

### Typography

- Use the existing sans-serif approach unless implementation confirms a local
  font choice is already configured.
- Landing headings may use larger scale, capped so text does not overflow.
- Dashboard type stays fixed and practical, with clear label, body, heading,
  and data styles.
- Do not use tiny uppercase tracked labels as repeated section grammar.
- Do not use gradient text.

### Shape And Elevation

- Cards and panels use a consistent small radius, matching the existing 8px
  direction unless implementation reveals a stronger local token.
- Avoid nested cards.
- Avoid `border + large soft shadow` on the same repeated panels.
- Use grid, separators, and whitespace for grouping before adding more cards.

### Motion

- Landing motion can be expressive but must stay product-relevant.
- Dashboard motion is state-driven only: refresh, selected scenario, panel
  reveal, button feedback, loading skeletons.
- Typical UI transitions should stay in the 150-300ms range.
- Reduced-motion support is required for every animation introduced.

## Accessibility And UX Requirements

- One `h1` per route.
- Keyboard-visible focus states on all links, buttons, segmented controls, and
  language controls.
- Icon-only or visual-only controls must have accessible names.
- Text contrast must pass WCAG AA: 4.5:1 for body, 3:1 for large text.
- Status cannot be communicated by color alone.
- Buttons must show disabled/loading state during async work.
- Route navigation must preserve a clear path from landing to dashboard.
- Landing and dashboard must work at common mobile, tablet, and desktop widths.

## Implementation Boundaries

- Keep changes scoped to `apps/web` UI files and frontend tests unless a test
  fixture requires a small update.
- Do not change backend endpoints, response payloads, or scenario identifiers.
- Do not introduce a new design-system dependency for this slice.
- Use CSS and React components already available in the Next app.
- Keep interactive/client components isolated where needed.
- Prefer a small route split over broad app restructuring.

## Test And Validation Plan

Implementation should prove:

- `/` renders the landing page and includes the primary `Open dashboard` link.
- `/dashboard` renders the existing data-driven dashboard behavior.
- Existing scenario API helper tests still pass.
- Dashboard shell tests cover scenario controls after any markup changes.
- No horizontal overflow on mobile browser smoke.
- Animated visual scene renders nonblank and has reduced-motion fallback.

Commands:

```text
npm --workspace apps/web run test
npm run build:web
git diff --check
```

If the implementation touches backend assumptions, also run:

```text
npm run verify
```

Browser validation:

- Open `/` in the in-app browser.
- Open `/dashboard` in the in-app browser.
- Check desktop and mobile viewports.
- Inspect for clipping, overlap, unreadable text, broken links, and missing
  focus/disabled/loading states.

## Open Questions Resolved By This Spec

- The landing page and dashboard should be separate routes, not one combined
  page.
- The landing page should feel alive through a product-relevant network scene,
  not generic decorative animation.
- The dashboard should remain an operator tool, not become a marketing page.
- The current backend and scenario contracts should stay intact.

## User Review Gate

Before implementation, the user should review this spec and approve, revise, or
reject the route split and Civic Nervous System visual system.
