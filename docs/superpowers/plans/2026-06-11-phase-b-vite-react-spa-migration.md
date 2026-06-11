# Phase B Vite React SPA Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the current Next.js dashboard frontend to a Vite React SPA that keeps the Phase A simulation stream slot and remains ready for Unreal Pixel Streaming.

**Architecture:** Keep FastAPI as the only backend and preserve the existing API contract for status, recommendations, SUMO/TraCI simulation comparisons, OpenAI/RAG answers, reports, runtime readiness, and analysis jobs. Replace the Next.js App Router shell with a browser-only Vite entrypoint so WebRTC/Pixel Streaming integrations stay client-side and deployment can use static hosting. Keep the committed WebGL-style fallback and Phase A stream URL precedence: `NEXT_PUBLIC_SIMULATION_STREAM_URL` first, then `NEXT_PUBLIC_UNITY_WEBGL_URL` during migration, then Vite-prefixed aliases.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, FastAPI, PostgreSQL/pgvector, SUMO/TraCI, OpenAI/RAG, Unreal Pixel Streaming.

---

## File Structure

- Modify: `apps/web/package.json`
  - Replace Next dev/build/start scripts with Vite scripts while preserving `test`.
- Create: `apps/web/index.html`
  - Browser entry document with `<div id="root"></div>`.
- Create: `apps/web/src/main.tsx`
  - React bootstrap that renders the current dashboard route.
- Create: `apps/web/src/env.ts`
  - Reads Vite and legacy public env vars in one place.
- Create: `apps/web/src/App.tsx`
  - SPA route shell that renders the dashboard for `/` and `/dashboard`.
- Move or copy: `apps/web/app/dashboard/page.tsx` logic into `apps/web/src/dashboard/DashboardRoute.tsx`
  - Remove Next-only assumptions.
- Keep: `apps/web/components/*`
  - Reuse current React components where possible.
- Modify: `apps/web/lib/api.ts`
  - Read API base URL from `VITE_API_BASE_URL`, then `NEXT_PUBLIC_API_BASE_URL`, then `http://127.0.0.1:8000`.
- Modify: `apps/web/components/SimulationViewport.tsx`
  - Read stream URL via `apps/web/src/env.ts` instead of direct `process.env` access.
- Modify: `apps/web/components/DashboardShell.test.tsx`
  - Keep Phase A stream tests, move env stubs to Vite-compatible names.
- Create: `apps/web/src/App.test.tsx`
  - Verify `/dashboard` SPA route renders the dashboard.
- Modify: `.env.example`
  - Add Vite-prefixed equivalents while preserving legacy aliases for one transition phase.
- Modify: `README.md`
  - Update commands and environment variables.
- Modify: `docs/launch-runbook.md`
  - Update local launch steps to Vite dev server.
- Modify: `scripts/launch-local.sh`
  - Start Vite dev server on port 3000 or update documented web port if Vite uses 5173.

---

### Task 1: Add Vite env adapter with tests

**Files:**
- Create: `apps/web/src/env.ts`
- Create: `apps/web/src/env.test.ts`
- Modify: `apps/web/tsconfig.json` only if `src` is not already included

- [ ] **Step 1: Write the failing env tests**

Create `apps/web/src/env.test.ts`:

```ts
import { afterEach, describe, expect, test, vi } from "vitest";

import { getApiBaseUrl, getSimulationStreamUrl } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("web env adapter", () => {
  test("prefers VITE_SIMULATION_STREAM_URL over legacy public stream variables", () => {
    vi.stubEnv("VITE_SIMULATION_STREAM_URL", "https://vite-stream.example");
    vi.stubEnv("NEXT_PUBLIC_SIMULATION_STREAM_URL", "https://next-stream.example");
    vi.stubEnv("NEXT_PUBLIC_UNITY_WEBGL_URL", "/unity/index.html");

    expect(getSimulationStreamUrl()).toEqual({
      url: "https://vite-stream.example",
      source: "vite-simulation-stream"
    });
  });

  test("falls back to Phase A NEXT_PUBLIC_SIMULATION_STREAM_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SIMULATION_STREAM_URL", "https://phase-a.example");
    vi.stubEnv("NEXT_PUBLIC_UNITY_WEBGL_URL", "/unity/index.html");

    expect(getSimulationStreamUrl()).toEqual({
      url: "https://phase-a.example",
      source: "next-public-simulation-stream"
    });
  });

  test("keeps NEXT_PUBLIC_UNITY_WEBGL_URL as the last compatibility alias", () => {
    vi.stubEnv("NEXT_PUBLIC_UNITY_WEBGL_URL", "/unity/index.html");

    expect(getSimulationStreamUrl()).toEqual({
      url: "/unity/index.html",
      source: "next-public-unity-webgl"
    });
  });

  test("uses VITE_API_BASE_URL before the legacy API base URL", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:9000");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000");

    expect(getApiBaseUrl()).toBe("http://127.0.0.1:9000");
  });
});
```

- [ ] **Step 2: Run the env tests to verify RED**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm --workspace apps/web run test -- src/env.test.ts
```

Expected: FAIL because `apps/web/src/env.ts` does not exist.

- [ ] **Step 3: Implement the env adapter**

Create `apps/web/src/env.ts`:

```ts
type SimulationStreamSource =
  | "vite-simulation-stream"
  | "next-public-simulation-stream"
  | "next-public-unity-webgl";

type SimulationStreamConfig = {
  url: string;
  source: SimulationStreamSource;
};

function readEnv(name: string): string {
  const importMetaEnv =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env[name]
      : undefined;
  const processEnv =
    typeof process !== "undefined" && process.env ? process.env[name] : undefined;

  return String(importMetaEnv ?? processEnv ?? "").trim();
}

export function getApiBaseUrl(): string {
  return (
    readEnv("VITE_API_BASE_URL") ||
    readEnv("NEXT_PUBLIC_API_BASE_URL") ||
    "http://127.0.0.1:8000"
  );
}

export function getSimulationStreamUrl(): SimulationStreamConfig | null {
  const viteStreamUrl = readEnv("VITE_SIMULATION_STREAM_URL");
  if (viteStreamUrl) {
    return { url: viteStreamUrl, source: "vite-simulation-stream" };
  }

  const phaseAStreamUrl = readEnv("NEXT_PUBLIC_SIMULATION_STREAM_URL");
  if (phaseAStreamUrl) {
    return { url: phaseAStreamUrl, source: "next-public-simulation-stream" };
  }

  const unityAliasUrl = readEnv("NEXT_PUBLIC_UNITY_WEBGL_URL");
  if (unityAliasUrl) {
    return { url: unityAliasUrl, source: "next-public-unity-webgl" };
  }

  return null;
}
```

- [ ] **Step 4: Run the env tests to verify GREEN**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm --workspace apps/web run test -- src/env.test.ts
```

Expected: PASS, 4 tests.

---

### Task 2: Convert API client and viewport to the env adapter

**Files:**
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/components/SimulationViewport.tsx`
- Modify: `apps/web/lib/api.test.ts`
- Modify: `apps/web/components/DashboardShell.test.tsx`

- [ ] **Step 1: Write failing tests for Vite env names**

In `apps/web/lib/api.test.ts`, add a test that stubs `VITE_API_BASE_URL` and verifies the API client requests that base URL.

In `apps/web/components/DashboardShell.test.tsx`, add this test beside the Phase A stream tests:

```ts
test("mounts the Vite simulation stream URL before Phase A aliases", () => {
  vi.stubEnv("VITE_SIMULATION_STREAM_URL", "https://vite-pixel.example/stream");
  vi.stubEnv("NEXT_PUBLIC_SIMULATION_STREAM_URL", "https://next-pixel.example/stream");
  vi.stubEnv("NEXT_PUBLIC_UNITY_WEBGL_URL", "/unity/index.html");

  const { container } = renderDashboard();
  const streamFrame = container.querySelector("iframe.simulation-stream-frame");

  expect(streamFrame?.getAttribute("src")).toBe("https://vite-pixel.example/stream");
  expect(screen.getByText("Simulation Stream")).toBeTruthy();
});
```

- [ ] **Step 2: Run targeted tests to verify RED**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm --workspace apps/web run test -- lib/api.test.ts components/DashboardShell.test.tsx
```

Expected: FAIL because production code still reads direct `process.env.NEXT_PUBLIC_*` values.

- [ ] **Step 3: Update production code**

In `apps/web/lib/api.ts`, import and use `getApiBaseUrl()`.

In `apps/web/components/SimulationViewport.tsx`, import `getSimulationStreamUrl()` and replace direct env reads with:

```ts
const simulationStream = getSimulationStreamUrl();
const simulationStreamUrl = simulationStream?.url;
const renderMode = simulationStreamUrl
  ? simulationStream.source === "next-public-unity-webgl"
    ? "Unity WebGL"
    : "Simulation Stream"
  : "WebGL-style fallback";
```

- [ ] **Step 4: Run targeted tests to verify GREEN**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm --workspace apps/web run test -- lib/api.test.ts components/DashboardShell.test.tsx src/env.test.ts
```

Expected: PASS.

---

### Task 3: Add Vite app shell while preserving dashboard behavior

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/App.test.tsx`
- Create: `apps/web/src/dashboard/DashboardRoute.tsx`
- Modify: `apps/web/app/dashboard/page.tsx` only if keeping Next compatibility during transition

- [ ] **Step 1: Write failing SPA shell tests**

Create `apps/web/src/App.test.tsx`:

```tsx
// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { App } from "./App";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Vite SPA shell", () => {
  test("renders the dashboard route at /dashboard", async () => {
    window.history.pushState({}, "", "/dashboard");
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:8000");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "스마트 교차로 운영 시스템" })).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run the SPA shell test to verify RED**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm --workspace apps/web run test -- src/App.test.tsx
```

Expected: FAIL because `App.tsx` does not exist.

- [ ] **Step 3: Create SPA files**

Create `apps/web/index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Smart Intersection Ops</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/web/src/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";

import "../app/globals.css";
import { App } from "./App";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `apps/web/src/App.tsx`:

```tsx
import { DashboardRoute } from "./dashboard/DashboardRoute";

export function App() {
  return <DashboardRoute />;
}
```

Move the non-Next-specific dashboard data loading and handler logic from `apps/web/app/dashboard/page.tsx` into `apps/web/src/dashboard/DashboardRoute.tsx`. Keep all API calls going through `apps/web/lib/api.ts`.

- [ ] **Step 4: Run the SPA shell test to verify GREEN**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm --workspace apps/web run test -- src/App.test.tsx components/DashboardShell.test.tsx
```

Expected: PASS.

---

### Task 4: Replace Next scripts with Vite scripts

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Modify: root `package.json` only if scripts reference Next-specific commands

- [ ] **Step 1: Write the expected script contract**

Open `apps/web/package.json` and confirm the existing scripts. The target contract is:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 3000",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 127.0.0.1 --port 3000",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Create Vite config**

Create `apps/web/vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 3000,
    proxy: {
      "/api": "http://127.0.0.1:8000"
    }
  },
  preview: {
    host: "127.0.0.1",
    port: 3000
  },
  test: {
    environment: "jsdom"
  }
});
```

- [ ] **Step 3: Install Vite dependencies if absent**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm --workspace apps/web install -D vite @vitejs/plugin-react
```

- [ ] **Step 4: Run build to expose migration errors**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm run build:web
```

Expected initially: FAIL if any Next-only import remains. Fix each error by moving browser-only code into `src/` and deleting Next-only dependencies from the SPA path.

- [ ] **Step 5: Run build again to verify GREEN**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm run build:web
```

Expected: PASS.

---

### Task 5: Preserve backend, SUMO/TraCI, and OpenAI/RAG boundaries

**Files:**
- Modify: `apps/web/src/dashboard/DashboardRoute.tsx`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/components/DashboardShell.test.tsx`
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: Add boundary assertions to tests**

Add expectations that the dashboard still renders:

```ts
expect(screen.getByText("SUMO/TraCI Renderer")).toBeTruthy();
expect(screen.getByText("OPENAI_API_KEY 대기")).toBeTruthy();
expect(screen.getByText("Simulation only / No real signal control")).toBeTruthy();
```

- [ ] **Step 2: Run boundary tests**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm --workspace apps/web run test -- components/DashboardShell.test.tsx src/App.test.tsx
```

Expected: PASS. If any copy disappeared during migration, restore it before continuing.

- [ ] **Step 3: Confirm no secrets moved to frontend**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
git grep -n "OPENAI_API_KEY\|sk-" -- apps/web README.md docs .env.example
```

Expected: Only documentation mentions `OPENAI_API_KEY`; no real key values and no frontend code path that reads the secret.

---

### Task 6: Update docs and launch scripts

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/launch-runbook.md`
- Modify: `scripts/launch-local.sh`

- [ ] **Step 1: Update `.env.example`**

Add Vite-prefixed env vars while preserving legacy aliases:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SIMULATION_STREAM_URL=http://127.0.0.1
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
# NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1
# NEXT_PUBLIC_UNITY_WEBGL_URL=/unity/index.html
```

- [ ] **Step 2: Update README and launch runbook**

Document:

```bash
npm run dev:web
npm run build:web
npm run test:web
```

State that `dev:web` now starts Vite, not Next.js, while the dashboard URL remains `http://127.0.0.1:3000/dashboard`.

- [ ] **Step 3: Update launch script if it waits on Next-only output**

In `scripts/launch-local.sh`, replace any readiness checks that expect `next dev` output with a port check for `127.0.0.1:3000`.

- [ ] **Step 4: Run local launch help or dry check**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
bash -n scripts/launch-local.sh
```

Expected: exit 0.

---

### Task 7: Final verification, commit, and push

**Files:**
- All changed files

- [ ] **Step 1: Run full verification**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
npm run verify
```

Expected: all test, build, and `git diff --check` steps pass.

- [ ] **Step 2: Inspect diff**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
git diff --stat
git diff -- apps/web package.json README.md docs .env.example scripts
```

Expected: only the Vite migration files and docs changed.

- [ ] **Step 3: Commit**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
git add apps/web README.md docs .env.example scripts package.json package-lock.json
git commit -m "feat: migrate dashboard frontend to Vite SPA"
```

- [ ] **Step 4: Push and verify remote branch**

Run:

```bash
cd /mnt/c/Users/100ri/abc_project
git push origin main
git ls-remote origin refs/heads/main
```

Expected: remote `main` points at the pushed commit.

---

## Self-Review

- Spec coverage: This plan covers Vite SPA migration, Phase A stream URL preservation, FastAPI boundary preservation, SUMO/TraCI preservation, OpenAI/RAG secrecy, docs, launch scripts, tests, build, commit, and push.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation step remains.
- Type consistency: `getSimulationStreamUrl()` returns `{ url, source } | null`; all later tasks use that shape consistently.
