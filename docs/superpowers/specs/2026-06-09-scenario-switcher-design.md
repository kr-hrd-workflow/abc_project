# Scenario Switcher Design

## Goal

Add a non-OpenAI dashboard scenario switcher so operators can inspect the
existing `emergency`, `pedestrian`, `normal`, and `blocked` scenario flows from
the UI.

## Context

The backend already accepts `scenario_id` on the core read/action endpoints:

- `GET /api/intersection/status`
- `GET /api/events`
- `POST /api/analyze`
- `POST /api/recommend-signal`
- `POST /api/simulate-signal`
- `POST /api/chat`
- `POST /api/report`

The current frontend loads only the default emergency scenario. OpenAI live
calls remain deferred until `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD`
are provided later.

## Approved Scope

Build a frontend-first scenario switcher that uses the existing backend
scenario contract.

Included:

- Add typed scenario IDs and scenario option metadata to the web app.
- Pass `scenario_id` from frontend API helpers to existing backend endpoints.
- Add a compact segmented scenario control to the dashboard.
- Reload status, events, recommendation, simulation, and report when the
  scenario changes.
- Send chat questions for the currently selected scenario.
- Keep the selected scenario visible in the dashboard header.
- Add focused frontend tests for URL generation and scenario switching.

Not included:

- No OpenAI API key, monthly budget, live OpenAI smoke, or live embedding call.
- No new backend endpoint unless current frontend needs cannot be met with
  existing query parameters.
- No database schema change.
- No new scenario data.
- No change to safety boundary language; recommendations remain
  simulation-only decision support.

## User Experience

The scenario switcher should be visible near the existing scenario/status area
in the dashboard header or central viewport toolbar. It should use a segmented
control style with four options:

- Emergency priority
- Pedestrian wait
- Normal flow
- Blocked intersection

Changing the selected scenario reloads all scenario-dependent dashboard data.
While the new scenario loads, the previous dashboard can stay visible, but the
control should show that a refresh is in progress. If loading fails, the
existing error screen and retry behavior can be reused.

## Data Flow

`apps/web/app/page.tsx` owns the selected scenario state. On initial load it
uses `emergency`. On scenario change it calls the same dashboard loader with the
new scenario ID.

The web API helpers in `apps/web/lib/api.ts` add `scenario_id=<id>` to endpoint
URLs when a scenario ID is provided. This keeps the backend contract unchanged
and keeps the frontend responsible for selecting the scenario.

`DashboardShell` receives the selected scenario, available scenario options,
loading state, and an `onScenarioChange` callback. It passes only presentation
props to child components.

## Error Handling

If a scenario reload fails, the existing page-level error state should display
the API error and keep the retry button. Retry should reload the currently
selected scenario, not always the default scenario.

The scenario control should not allow unknown scenario IDs. The frontend type
should restrict IDs to the four known options.

## Testing

Use TDD for the implementation.

Frontend tests:

- API helper tests prove scenario IDs are encoded as `scenario_id` query
  parameters.
- Dashboard shell tests prove scenario options render and selecting another
  scenario calls the scenario-change handler.

Validation:

- `npm --workspace apps/web run test`
- `npm run verify`

Run backend tests only if backend code changes. If the backend is unchanged, the
existing API test coverage for `scenario_id` query behavior is sufficient.

## Skills

Use Superpowers for workflow, `karpathy-guidelines` for scoped coding judgment,
and `next-best-practices` for the Next.js implementation plan and code. Use
`webapp-testing` only if rendered browser verification is needed after the
automated tests.

## Implementation Evidence

- `npm --workspace apps/web run test -- lib/api.test.ts`: 5 tests passed.
- `npm --workspace apps/web run test -- components/DashboardShell.test.tsx`: 7 tests passed.
- `npm --workspace apps/web run test`: 2 test files and 12 tests passed.
- `npm run verify`: 61 API tests passed with 1 existing Starlette/httpx deprecation warning, 12 web tests passed, the Next.js production build passed, and `git diff --check` passed.
- Browser smoke at `http://127.0.0.1:3000`: scenario buttons rendered, selecting `보행자` changed `aria-pressed` to `true`, no API error text appeared, no console errors were reported, and the top bar had no horizontal overflow.
- OpenAI live smoke, API key, monthly budget, and live embedding checks remain deferred.
