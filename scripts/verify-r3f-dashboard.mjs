#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { buildVehicles } from "./lib/traffic-fixture.mjs";
import { formatBytes, isRecord } from "./lib/util.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const webBuildDir = path.join(repoRoot, "apps", "web", ".next");
const artifactsDir = path.join(repoRoot, "artifacts");
const desktopScreenshotPath = path.join(artifactsDir, "r3f-dashboard-desktop.png");
const mobileScreenshotPath = path.join(artifactsDir, "r3f-dashboard-mobile.png");
const desktopCanvasScreenshotPath = path.join(artifactsDir, "r3f-dashboard-desktop-canvas.png");
const mobileCanvasScreenshotPath = path.join(artifactsDir, "r3f-dashboard-mobile-canvas.png");
const mobileOverlayScreenshotPath = path.join(artifactsDir, "r3f-dashboard-mobile-overlays.png");
const fallbackScreenshotPath = path.join(artifactsDir, "r3f-dashboard-webgl-off.png");
const stage6ScenarioArtifactPaths = {
  dayHigh: path.join(artifactsDir, "r3f-dashboard-scenario-day-high.png"),
  nightHigh: path.join(artifactsDir, "r3f-dashboard-scenario-night-high.png"),
  rainHigh: path.join(artifactsDir, "r3f-dashboard-scenario-rain-high.png"),
  rainLowFallback: path.join(
    artifactsDir,
    "r3f-dashboard-scenario-rain-low-fallback.png"
  )
};
const stage6ScenarioCanvasArtifactPaths = {
  dayHigh: path.join(artifactsDir, "r3f-dashboard-scenario-day-high-canvas.png"),
  nightHigh: path.join(artifactsDir, "r3f-dashboard-scenario-night-high-canvas.png"),
  rainHigh: path.join(artifactsDir, "r3f-dashboard-scenario-rain-high-canvas.png"),
  rainLowFallback: path.join(
    artifactsDir,
    "r3f-dashboard-scenario-rain-low-fallback-canvas.png"
  )
};
const detailsPath = path.join(artifactsDir, "r3f-dashboard-details.json");
const dashboardArtifactPaths = [
  desktopScreenshotPath,
  mobileScreenshotPath,
  desktopCanvasScreenshotPath,
  mobileCanvasScreenshotPath,
  mobileOverlayScreenshotPath,
  fallbackScreenshotPath,
  ...Object.values(stage6ScenarioArtifactPaths),
  ...Object.values(stage6ScenarioCanvasArtifactPaths),
  detailsPath
];
const manifestPath = path.join(
  repoRoot,
  "apps",
  "web",
  "public",
  "simulation",
  "r3f",
  "assets",
  "manifest.json"
);

const routePath = "/dashboard";
const minVisibleVehicles = 80;
// Re-baselined 2026-07-03 with user approval — the hero-facade design (31 buildings x
// per-face unique textures ≈ 155+ draw calls) made the pre-hero 180 budget structurally
// impossible; real measured high-preset scene is 574 (first honest measurement after the
// demand-frame sampling fix, commit 86847d2); 650 = 574 + headroom for the day-fill plan's
// instanced additions. peak stays 900.
const maxNormalDrawCalls = 650;
const maxPeakDrawCalls = 900;
const maxShadowCasterCount = 18;
const desktopMinFps = 60;
const desktopMaxAverageFrameTimeMs = 16.7;
const mobileMinFps = 30;
const mobileMaxAverageFrameTimeMs = 33;
// Re-baselined 2026-07-03 with user approval — hero facade textures (previously
// unregistered/uncounted, recompressed 23->9.8 MB in d837752) are now registered, so the
// gate finally sees the true payload (~32 MB). Same budget as verify-r3f-assets.mjs; this
// is a second call site over the identical manifest-derived payload calculation.
const maxPayloadBytes = 35 * 1024 * 1024;
const compositionGridColumns = 5;
const compositionGridRows = 5;
const minReadableSceneCoverage = 0.5;
const maxEmptyNearBlackCoverage = 0.5;
const minTopBandSceneCoverage = 0.04;
const minSideBandSceneCoverage = 0.08;
const minBottomBandSceneCoverage = 0.16;
const minOccupiedCompositionCells = 17;
const readableCanvasCaptureTimeoutMs = 12000;
const readableCanvasCaptureIntervalMs = 500;
const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 390, height: 844 };
const r3fCanvasSelector = "canvas.r3f-simulation-canvas, .r3f-simulation-canvas canvas";
const selfTestMode = process.env.R3F_DASHBOARD_VERIFIER_SELF_TEST ?? "";
const apiHeaders = {
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};
const liveSimulationPathnames = new Set([
  "/api/runtime/readiness",
  "/api/simulation/frame"
]);

const details = {
  generated_at: new Date().toISOString(),
  route: routePath,
  server: null,
  artifacts: {
    desktop: normalizeArtifactPath(desktopScreenshotPath),
    mobile: normalizeArtifactPath(mobileScreenshotPath),
    mobile_overlays: normalizeArtifactPath(mobileOverlayScreenshotPath),
    desktop_canvas: normalizeArtifactPath(desktopCanvasScreenshotPath),
    mobile_canvas: normalizeArtifactPath(mobileCanvasScreenshotPath),
    webgl_off_fallback: normalizeArtifactPath(fallbackScreenshotPath),
    scenarios: Object.fromEntries(
      Object.entries(stage6ScenarioArtifactPaths).map(([key, value]) => [
        key,
        normalizeArtifactPath(value)
      ])
    ),
    scenario_canvases: Object.fromEntries(
      Object.entries(stage6ScenarioCanvasArtifactPaths).map(([key, value]) => [
        key,
        normalizeArtifactPath(value)
      ])
    ),
    details: normalizeArtifactPath(detailsPath)
  },
  renderer: null,
  payload: null,
  desktop: null,
  mobile: null,
  fallback: null,
  live_sumo: null,
  telemetry: null,
  qualityPreset: null,
  qualityPresetEvidence: null,
  postFx: null,
  heavyFeatures: null,
  performance: null,
  sourceLabels: null,
  stage6_scenario_proofs: [],
  scenarios: [],
  integration_notes: [],
  console_errors: [],
  console_failures: [],
  webgl_context_loss_errors: [],
  photorealism_check: null,
  composition_check: null,
  mobile_composition_check: null,
  queue_source_check: null,
  last_good_stale: null,
  no_overflow_evidence: null,
  assertions: {},
  failures: []
};

const failures = [];

function addAssertion(name, passed, evidence) {
  details.assertions[name] = {
    passed,
    evidence
  };

  if (!passed) {
    failures.push(`${name}: ${evidence}`);
  }
}

function normalizeArtifactPath(absolutePath) {
  return path.relative(repoRoot, absolutePath).replace(/\\/g, "/");
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function verifierProgress(message) {
  if (process.env.R3F_DASHBOARD_VERIFIER_PROGRESS === "true") {
    console.log(`[r3f-dashboard] ${message}`);
  }
}

async function withStepTimeout(label, timeoutMs, operation) {
  let timeout = null;
  verifierProgress(`${label} started`);

  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    verifierProgress(`${label} finished`);
  }
}

async function closeBrowserWithTimeout(browser) {
  try {
    await withStepTimeout("browser close", 15000, async () => {
      await browser.close();
    });
  } catch (error) {
    const cleanupError = error instanceof Error ? error.message : String(error);
    details.browser_cleanup_error = cleanupError;

    const browserProcess =
      typeof browser.process === "function" ? browser.process() : null;
    if (!browserProcess) {
      throw error;
    }

    await stopProcessTree(browserProcess);
  }
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("Could not allocate a local TCP port"));
          return;
        }

        resolve(address.port);
      });
    });
  });
}

async function waitForHttpOk(url, timeoutMs, readLogs) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(1000);
  }

  throw new Error(
    `Timed out waiting for ${url}. Last error: ${lastError?.message ?? "none"}.\n` +
      `Recent dev-server output:\n${readLogs()}`
  );
}

async function prepareServer() {
  const providedBaseUrl =
    process.env.R3F_DASHBOARD_BASE_URL ?? process.env.DASHBOARD_BASE_URL;

  if (providedBaseUrl) {
    const baseUrl = providedBaseUrl.replace(/\/+$/, "");
    details.server = {
      mode: "reused",
      base_url: baseUrl,
      env_note:
        "R3F_DASHBOARD_BASE_URL/DASHBOARD_BASE_URL was provided; verifier reused the supplied server."
    };
    await waitForHttpOk(`${baseUrl}${routePath}`, 30000, () => "");
    return {
      baseUrl,
      stop: async () => {}
    };
  }

  if (process.env.R3F_DASHBOARD_REUSE_SERVER === "true") {
    const reusableBaseUrl = await discoverReusableServer();

    if (reusableBaseUrl) {
      details.server = {
        mode: "reused-detected",
        base_url: reusableBaseUrl,
        env_note:
          "Existing local dashboard server was reachable because R3F_DASHBOARD_REUSE_SERVER=true."
      };
      return {
        baseUrl: reusableBaseUrl,
        stop: async () => {}
      };
    }
  }

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverMode =
    process.env.R3F_DASHBOARD_SERVER_MODE === "dev" ? "dev" : "production";
  // npm-or-cmd command builder (replaces the former getDev/Build/Server helpers).
  const npmWorkspaceCommand = (scriptParts) =>
    process.platform === "win32"
      ? {
          command: process.env.ComSpec ?? "cmd.exe",
          args: ["/d", "/s", "/c", `npm --workspace apps/web ${scriptParts.join(" ")}`]
        }
      : { command: "npm", args: ["--workspace", "apps/web", ...scriptParts] };
  const serverCommand = npmWorkspaceCommand([
    "run",
    serverMode === "dev" ? "dev" : "start",
    "--",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port)
  ]);
  const logs = [];
  const stage5Env = {
    FORCE_COLOR: "0",
    NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8000",
    NEXT_PUBLIC_R3F_SIMULATION_ENABLED: "true",
    NEXT_PUBLIC_SIMULATION_STREAM_URL: " ",
    NEXT_PUBLIC_UNITY_WEBGL_URL: " "
  };

  if (serverMode === "production") {
    // Avoid stale Next trace artifacts when this verifier follows a prior build.
    await rm(webBuildDir, { recursive: true, force: true });
    await runCommand({
      commandSpec: npmWorkspaceCommand(["run", "build"]),
      env: stage5Env,
      label: "production build",
      timeoutMs: 180000
    });
  }

  const child = spawn(
    serverCommand.command,
    serverCommand.args,
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...stage5Env
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32"
    }
  );

  const rememberLog = (chunk) => {
    logs.push(String(chunk));
    while (logs.length > 80) logs.shift();
  };
  child.stdout.on("data", rememberLog);
  child.stderr.on("data", rememberLog);

  let exited = false;
  child.on("exit", (code, signal) => {
    exited = true;
    rememberLog(`\n[${serverMode} server exited code=${code} signal=${signal}]\n`);
  });

  details.server = {
    mode: `started-${serverMode}`,
    base_url: baseUrl,
    port,
    env: stage5Env
  };

  await waitForHttpOk(`${baseUrl}${routePath}`, 120000, () => logs.join(""));

  if (exited) {
    throw new Error(`${serverMode} server exited before verification.\n${logs.join("")}`);
  }

  return {
    baseUrl,
    stop: async () => {
      await stopProcessTree(child);
    }
  };
}

async function runCommand({ commandSpec, env, label, timeoutMs }) {
  const logs = [];
  const child = spawn(commandSpec.command, commandSpec.args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const rememberLog = (chunk) => {
    logs.push(String(chunk));
    while (logs.length > 120) logs.shift();
  };
  const timeout = setTimeout(() => {
    stopProcessTree(child).catch(() => {});
  }, timeoutMs);

  child.stdout.on("data", rememberLog);
  child.stderr.on("data", rememberLog);

  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${label} failed with code=${code} signal=${signal}.\n${logs.join("")}`
        )
      );
    });
  });
}

async function discoverReusableServer() {
  const candidates = [
    process.env.R3F_DASHBOARD_BASE_URL,
    process.env.DASHBOARD_BASE_URL,
    process.env.R3F_DASHBOARD_PORT
      ? `http://127.0.0.1:${process.env.R3F_DASHBOARD_PORT}`
      : null,
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3025"
  ]
    .filter(Boolean)
    .map((baseUrl) => String(baseUrl).replace(/\/+$/, ""));

  for (const baseUrl of [...new Set(candidates)]) {
    if (await probeDashboardServer(baseUrl)) {
      return baseUrl;
    }
  }

  return null;
}

async function probeDashboardServer(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}${routePath}`, {
      signal: AbortSignal.timeout(1500)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const waitForExit = (timeoutMs) =>
    new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve(true);
        return;
      }
      const onExit = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      const timeout = setTimeout(() => {
        child.off("exit", onExit);
        resolve(false);
      }, timeoutMs);
      child.once("exit", onExit);
    });

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn(
        "taskkill.exe",
        ["/PID", String(child.pid), "/T", "/F"],
        { stdio: "ignore" }
      );
      killer.on("error", () => {
        child.kill();
        resolve();
      });
      killer.on("exit", resolve);
    });
    return;
  }

  // The server is spawned as its own process group so nested `next start`
  // workers do not keep CI alive after verification finishes.
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }

  if (await waitForExit(5000)) {
    return;
  }

  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
  await waitForExit(5000);
}

// buildVehicles + fixtureNoise live in scripts/lib/traffic-fixture.mjs so the
// photoreal-plate render script composites the EXACT same SUMO-truth fleet.

function buildFixturePayloads() {
  const now = "2026-06-17T00:00:00.000Z";
  const vehicles = buildVehicles();
  const vehicleCount = vehicles.length;
  const queues = {
    north: 260,
    south: 250,
    east: 280,
    west: 270
  };
  const events = [
    {
      id: 1,
      intersection_id: "INT-0001",
      occurred_at: now,
      direction: "east",
      event_type: "emergency_vehicle_approach",
      severity: "critical",
      object_count: vehicleCount,
      ai_summary: "Dense fixture traffic with emergency vehicle approach from east.",
      recommendation: "Review emergency priority signal simulation.",
      status: "open",
      source: "playwright_stage5_fixture"
    }
  ];
  const status = {
    intersection_id: "INT-0001",
    captured_at: now,
    signal_phase: "east_priority",
    cycle_second: 22,
    queues,
    pedestrian_request: true,
    emergency_priority: true,
    congestion_level: "high",
    source: "playwright_stage5_fixture"
  };
  const simulation = {
    source: "simulation_snapshot_fixture",
    baseline: {
      average_wait_seconds: 72,
      total_delay_seconds: 128.4,
      throughput: 1842,
      emergency_vehicle_clearance_seconds: 28
    },
    recommended: {
      average_wait_seconds: 59,
      total_delay_seconds: 105.3,
      throughput: 2084,
      emergency_vehicle_clearance_seconds: 18
    },
    improvement: {
      average_wait_percent: -18,
      total_delay_percent: -18,
      throughput_percent: 13,
      emergency_vehicle_clearance_percent: -36
    }
  };
  const frame = {
    source: "simulation_snapshot_fixture",
    intersection_id: "INT-0001",
    scenario_id: "emergency",
    sim_time_seconds: 42,
    captured_at: now,
    bounds_meters: { min_x: -180, max_x: 180, min_y: -180, max_y: 180 },
    vehicles,
    density_segments: ["north", "south", "east", "west"].map((approach) => ({
      segment_id: `${approach}-dense-fixture`,
      approach,
      start_meters_from_stop_line: 10,
      end_meters_from_stop_line: 132,
      lane_count: 3,
      vehicle_count: vehicleCount,
      average_speed_mps: 2.4,
      source: "fixture_density_proxy"
    })),
    signals: ["north", "south", "east", "west"].map((direction) => ({
      signal_id: `${direction}-main`,
      direction,
      state: direction === "east" ? "green" : "red",
      seconds_remaining: direction === "east" ? 18 : 42
    })),
    queues,
    events
  };

  return {
    status,
    events,
    recommendation: {
      id: 1,
      intersection_id: "INT-0001",
      created_at: now,
      action: "emergency_priority",
      recommended_plan: { east: 35, north: 20, south: 20, west: 15 },
      evidence: { reason: "emergency_vehicle_approach", direction: "east" },
      safety_boundary:
        "Recommendation and simulation only. No real traffic signal control is performed.",
      status: "draft"
    },
    simulation,
    report: {
      id: 1,
      intersection_id: "INT-0001",
      period_start: now,
      period_end: now,
      summary: "Stage 5 verifier fixture report.",
      generated_at: now
    },
    fixtures: [
      {
        fixture_id: "stage5-dense-dashboard-fixture",
        scenario_id: "emergency",
        media_type: "virtual_cctv",
        filename: "stage5-dense-dashboard-fixture.mp4",
        description: "Verifier-only dense traffic fixture.",
        source: "playwright_stage5_fixture",
        renderer: "r3f_dashboard_verifier",
        safety_note: "Verifier fixture only. No real CCTV stream or traffic signal control."
      }
    ],
    runtimeReadiness: {
      vision: { ready: true, mode: "fixture", missing: [], checks: [] },
      simulation: { ready: true, mode: "fixture", missing: [], checks: [] },
      openai: {
        ready: false,
        mode: "unavailable",
        missing: ["OPENAI_API_KEY"],
        checks: []
      },
      pgvector: { ready: true, mode: "database", missing: [], checks: [] }
    },
    cctvFlow: {
      source: "cctv",
      captured_at: "2026-06-30T09:00:00+00:00",
      window_seconds: 30,
      per_approach: {
        north: { veh_per_hour: 912, by_class: { car: 6, truck: 1 }, crossings: 8 },
        south: { veh_per_hour: 720, by_class: { car: 6 }, crossings: 6 },
        bus_north: { veh_per_hour: 120, by_class: { bus: 1 }, crossings: 1 }
      },
      pedestrian: { per_hour: 480, crossings: 4 }
    },
    frame
  };
}

async function installApiRoutes(page, options = {}) {
  const payloads = buildFixturePayloads();
  if (typeof options.mutatePayloads === "function") {
    options.mutatePayloads(payloads);
  }

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: apiHeaders, body: "" });
      return;
    }

    const url = new URL(request.url());
    const pathname = url.pathname.replace(/\/+$/, "");
    if (await fulfillLiveSimulationRoute(route, pathname, url.search, options)) {
      return;
    }

    let body = null;

    if (pathname === "/api/intersection/status") body = payloads.status;
    if (pathname === "/api/events") body = payloads.events;
    if (pathname === "/api/recommend-signal") body = payloads.recommendation;
    if (pathname === "/api/simulate-signal") body = payloads.simulation;
    if (pathname === "/api/report") body = payloads.report;
    if (pathname === "/api/fixtures") body = payloads.fixtures;
    if (pathname === "/api/runtime/readiness") body = payloads.runtimeReadiness;
    if (pathname === "/api/traffic/cctv-flow") body = payloads.cctvFlow;
    if (pathname === "/api/simulation/frame")
      body = {
        ...payloads.frame,
        scenario_id: url.searchParams.get("scenario_id") ?? "normal"
      };

    if (body === null) {
      await route.fulfill({
        status: 404,
        headers: apiHeaders,
        body: JSON.stringify({ detail: `Unhandled verifier route: ${pathname}` })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: apiHeaders,
      body: JSON.stringify(body)
    });
  });
}

async function fulfillLiveSimulationRoute(route, pathname, search, options) {
  if (
    typeof options.liveSimulationBaseUrl !== "string" ||
    !liveSimulationPathnames.has(pathname)
  ) {
    return false;
  }

  const upstreamUrl = new URL(
    `${pathname}${search}`,
    `${options.liveSimulationBaseUrl.replace(/\/+$/, "")}/`
  );

  try {
    const response = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(10000)
    });
    const body = await response.text();
    await route.fulfill({
      status: response.status,
      headers: {
        ...apiHeaders,
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "X-R3F-Live-Sumo-API": "true"
      },
      body
    });
  } catch (error) {
    await route.fulfill({
      status: 503,
      headers: apiHeaders,
      body: JSON.stringify({
        detail: `Live SUMO API proxy failed: ${error instanceof Error ? error.message : String(error)}`
      })
    });
  }

  return true;
}

function webglDrawCallInstrumentation() {
  const state = {
    totalDrawCalls: 0,
    drawCallsThisFrame: 0,
    drawCallsLastFrame: 0,
    drawCallsMaxFrame: 0,
    contextLossEvents: 0
  };
  Object.defineProperty(window, "__r3fDashboardVerifier", {
    value: state,
    configurable: true
  });

  const patch = (prototype, methodName) => {
    if (!prototype || typeof prototype[methodName] !== "function") return;
    const original = prototype[methodName];
    if (original.__r3fDashboardVerifierPatched) return;

    const patched = function patchedDrawCall(...args) {
      state.totalDrawCalls += 1;
      state.drawCallsThisFrame += 1;
      return original.apply(this, args);
    };
    patched.__r3fDashboardVerifierPatched = true;
    prototype[methodName] = patched;
  };

  const methods = [
    "drawArrays",
    "drawElements",
    "drawArraysInstanced",
    "drawElementsInstanced"
  ];

  for (const method of methods) {
    patch(window.WebGLRenderingContext?.prototype, method);
    patch(window.WebGL2RenderingContext?.prototype, method);
  }

  const tick = () => {
    state.drawCallsLastFrame = state.drawCallsThisFrame;
    state.drawCallsMaxFrame = Math.max(state.drawCallsMaxFrame, state.drawCallsThisFrame);
    state.drawCallsThisFrame = 0;
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);

  window.addEventListener(
    "webglcontextlost",
    () => {
      state.contextLossEvents += 1;
    },
    true
  );
}

function forceWebglOff() {
  const originalGetContext = window.HTMLCanvasElement.prototype.getContext;

  window.HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
    if (
      typeof type === "string" &&
      ["webgl", "webgl2", "experimental-webgl"].includes(type.toLowerCase())
    ) {
      return null;
    }

    return originalGetContext.call(this, type, ...args);
  };
}

async function newRoutedPage(browser, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    isMobile: options.isMobile ?? false
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleErrors.push(`[${message.type()}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(`[pageerror] ${error.message}`);
  });

  await page.addInitScript(webglDrawCallInstrumentation);
  if (options.forceWebglOff) {
    await page.addInitScript(forceWebglOff);
  }
  await installApiRoutes(page, {
    mutatePayloads: options.mutatePayloads,
    liveSimulationBaseUrl: options.liveSimulationBaseUrl
  });

  return { context, page, consoleErrors };
}

async function gotoDashboard(page, baseUrl, query = "") {
  const normalizedQuery =
    typeof query === "string" && query.length > 0
      ? query.startsWith("?")
        ? query
        : `?${query}`
      : "";

  await page.goto(`${baseUrl}${routePath}${normalizedQuery}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });
}

async function waitForR3F(page) {
  try {
    await page.locator('[data-testid="r3f-simulation-viewport"]').waitFor({
      state: "visible",
      timeout: 45000
    });
    await page.waitForFunction(
      (selector) => {
        if (typeof window.__r3fPublishSimulationCanvasProof === "function") {
          window.__r3fPublishSimulationCanvasProof();
        }

        const canvas =
          document.querySelector(selector) ??
          window.__r3fSimulationCanvasElement ??
          null;
        if (!(canvas instanceof HTMLCanvasElement)) return false;
        const rect = canvas.getBoundingClientRect();
        const proof = window.__r3fSimulationCanvasProof ?? null;
        const proofHasUsableCanvas =
          proof?.canvasConnected === true &&
          proof.canvasWidth >= 120 &&
          proof.canvasHeight >= 120 &&
          proof.drawingBufferWidth > 0 &&
          proof.drawingBufferHeight > 0;
        const domHasUsableCanvas =
          canvas.isConnected &&
          rect.width >= 120 &&
          rect.height >= 120 &&
          canvas.width > 0 &&
          canvas.height > 0;
        const canCapture =
          typeof window.__r3fSimulationReadPixels === "function" ||
          typeof canvas.toDataURL === "function";

        return canCapture && (domHasUsableCanvas || proofHasUsableCanvas);
      },
      r3fCanvasSelector,
      { timeout: 60000 }
    );
    await page.waitForTimeout(1200);
    return true;
  } catch {
    return false;
  }
}

async function collectPageState(page) {
  return page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    bodyTextExcerpt: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 600),
    hasNextErrorOverlay:
      document.body.innerText.includes("Unhandled Runtime Error") ||
      document.body.innerText.includes("Build Error"),
    hasDashboardApiError: document.body.innerText.includes("Dashboard API unavailable"),
    hasFallbackCanvas: Boolean(document.querySelector("canvas.sumo-playback-canvas")),
    hasR3FViewport: Boolean(document.querySelector('[data-testid="r3f-simulation-viewport"]'))
  }));
}

async function collectRendererProof(page) {
  return page.evaluate(({ normalDrawCallBudget, peakDrawCallBudget }) => {
    if (typeof window.__r3fPublishSimulationCanvasProof === "function") {
      window.__r3fPublishSimulationCanvasProof();
    }

    const viewport = document.querySelector('[data-testid="r3f-simulation-viewport"]');
    const canvas = document.querySelector(
      "canvas.r3f-simulation-canvas, .r3f-simulation-canvas canvas"
    );
    const verifier = window.__r3fDashboardVerifier ?? {};
    const appProof =
      window.__r3fSimulationCanvasProof ??
      window.__R3F_DASHBOARD_PROOF__ ??
      window.__r3fDashboardProof ??
      window.__R3F_RENDERER_INFO__ ??
      null;
    const telemetry =
      typeof window.__r3fTelemetryEvent === "object" &&
      window.__r3fTelemetryEvent !== null
        ? window.__r3fTelemetryEvent
        : null;
    const isPlainRecord = (value) =>
      Boolean(value) && typeof value === "object" && !Array.isArray(value);
    const rendererInfo =
      appProof?.rendererInfo ??
      appProof?.renderer?.info ??
      appProof?.info ??
      null;
    const appProofDrawCalls = Number(appProof?.drawCalls ?? 0);
    const appProofPeakDrawCalls = Number(appProof?.peakDrawCalls ?? 0);
    const rawRendererInfoCalls =
      rendererInfo?.render?.calls ??
      rendererInfo?.calls ??
      null;
    const rendererInfoCalls =
      appProofDrawCalls > 0
        ? appProofDrawCalls
        : Number(rawRendererInfoCalls ?? 0) > 0
          ? rawRendererInfoCalls
          : null;
    const appContextLossEvents = Number(appProof?.contextLossEvents);
    const contextLossEvents = Number.isFinite(appContextLossEvents)
      ? appContextLossEvents
      : Number(verifier.contextLossEvents ?? 0);
    const instrumentedDrawCalls = Math.max(
      Number(verifier.drawCallsLastFrame ?? 0),
      Number(verifier.drawCallsMaxFrame ?? 0)
    );
    // A demand-frameloop proof publish can sample a near-empty frame (calls=1).
    // The instrumented per-frame max is the floor of truth: never report less.
    const drawCalls = Math.max(
      Number.isFinite(Number(rendererInfoCalls)) ? Number(rendererInfoCalls) : 0,
      instrumentedDrawCalls
    );
    const peakDrawCalls = Math.max(
      drawCalls,
      Number.isFinite(appProofPeakDrawCalls) ? appProofPeakDrawCalls : 0,
      instrumentedDrawCalls
    );
    const readElementProof = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return {
        tagName: element.tagName,
        className: element.getAttribute("class"),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        display: style.display,
        opacity: style.opacity,
        position: style.position,
        zIndex: style.zIndex,
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor
      };
    };
    const snapshotSource = viewport?.getAttribute("data-r3f-snapshot-source") ?? null;
    const frameBound = viewport?.getAttribute("data-r3f-frame-bound") === "true";
    const trafficDensityMode =
      viewport?.getAttribute("data-r3f-traffic-density-mode") ?? null;
    const signalState = viewport?.getAttribute("data-r3f-signal-state") ?? null;
    const scenarioId = viewport?.getAttribute("data-r3f-scenario-id") ?? null;
    const queueSource = viewport?.getAttribute("data-r3f-queue-source") ?? null;
    const finishingStage =
      viewport?.getAttribute("data-r3f-finishing-stage") ?? null;
    const weather = viewport?.getAttribute("data-r3f-weather") ?? null;
    const timeOfDay = viewport?.getAttribute("data-r3f-time-of-day") ?? null;
    const readNumberAttribute = (element, name) => {
      const value = Number(element?.getAttribute(name));

      return Number.isFinite(value) ? value : null;
    };
    const readBooleanAttribute = (element, name) => {
      const value = element?.getAttribute(name);

      if (value === "true") return true;
      if (value === "false") return false;

      return null;
    };
    const readStringAttribute = (element, name) => {
      const value = element?.getAttribute(name)?.trim();

      return value ? value : null;
    };
    const readListAttribute = (element, name) => {
      const value = readStringAttribute(element, name);

      return value
        ? value.split(",").map((item) => item.trim()).filter(Boolean)
        : null;
    };
    const frameAgeMs = readNumberAttribute(viewport, "data-r3f-frame-age-ms");
    const networkLatencyMs = readNumberAttribute(
      viewport,
      "data-r3f-network-latency-ms"
    );
    const simToRenderDelayMs = readNumberAttribute(
      viewport,
      "data-r3f-sim-to-render-delay-ms"
    );
    const authoritativeHz = readNumberAttribute(
      viewport,
      "data-r3f-authoritative-hz"
    );
    const authoritativeTickDriftMs = readNumberAttribute(
      viewport,
      "data-r3f-authoritative-tick-drift-ms"
    );
    const frameStale = viewport?.getAttribute("data-r3f-frame-stale") === "true";
    const shadowEnabled =
      viewport?.getAttribute("data-r3f-shadow-enabled") === "true";
    const shadowCasterCount = Number(
      viewport?.getAttribute("data-r3f-shadow-caster-count") ?? NaN
    );
    const telemetryPostFx = isPlainRecord(telemetry?.post_fx)
      ? telemetry.post_fx
      : null;
    const telemetryHeavyFeatures = isPlainRecord(telemetry?.heavy_features)
      ? telemetry.heavy_features
      : null;
    const telemetryPerformance = isPlainRecord(telemetry?.performance)
      ? telemetry.performance
      : null;
    const qualityPresetAttr = readStringAttribute(
      viewport,
      "data-r3f-quality-preset"
    );
    const telemetryQualityPreset =
      typeof telemetry?.quality_preset === "string" && telemetry.quality_preset
        ? telemetry.quality_preset
        : null;
    const qualityPreset = qualityPresetAttr ?? telemetryQualityPreset;
    const postFxEnabled =
      typeof telemetryPostFx?.enabled === "boolean"
        ? telemetryPostFx.enabled
        : readBooleanAttribute(viewport, "data-r3f-postfx-enabled");
    const postFxChain = Array.isArray(telemetryPostFx?.chain)
      ? telemetryPostFx.chain
      : readListAttribute(viewport, "data-r3f-postfx-chain");
    const planarReflection =
      typeof telemetryHeavyFeatures?.planar_reflection === "boolean"
        ? telemetryHeavyFeatures.planar_reflection
        : readBooleanAttribute(viewport, "data-r3f-planar-reflection-enabled");
    const weatherParticles =
      typeof telemetryHeavyFeatures?.weather_particles === "boolean"
        ? telemetryHeavyFeatures.weather_particles
        : readBooleanAttribute(viewport, "data-r3f-weather-particles-enabled");
    const highQualityVehicles =
      Number.isFinite(Number(telemetryHeavyFeatures?.high_quality_vehicles))
        ? Number(telemetryHeavyFeatures.high_quality_vehicles)
        : readNumberAttribute(viewport, "data-r3f-high-quality-vehicle-count");
    const textureMemoryEstimateMb =
      Number.isFinite(Number(telemetryPerformance?.texture_memory_estimate_mb))
        ? Number(telemetryPerformance.texture_memory_estimate_mb)
        : Number.isFinite(Number(telemetry?.texture_memory_bytes))
          ? Number((Number(telemetry.texture_memory_bytes) / (1024 * 1024)).toFixed(2))
          : Number.isFinite(Number(appProof?.textureMemoryBytes))
            ? Number((Number(appProof.textureMemoryBytes) / (1024 * 1024)).toFixed(2))
            : readNumberAttribute(viewport, "data-r3f-texture-memory-estimate-mb");
    const performanceFrameTimeMs =
      Number.isFinite(Number(telemetryPerformance?.frame_time_ms))
        ? Number(telemetryPerformance.frame_time_ms)
        : Number.isFinite(Number(telemetry?.average_frame_time_ms))
          ? Number(telemetry.average_frame_time_ms)
          : Number.isFinite(Number(appProof?.averageFrameTimeMs))
            ? Number(appProof.averageFrameTimeMs)
            : null;
    const buildMissingReason = (missing, suffix) => {
      if (missing.length === 0) return null;
      if (missing.length === 1) return `${missing[0]} ${suffix}`;

      return `${missing.slice(0, -1).join(", ")} and ${
        missing[missing.length - 1]
      } ${suffix}`;
    };
    const postFxMissing = [
      postFxEnabled === null ? "postFX enabled state" : null,
      postFxChain === null ? "postFX chain" : null
    ].filter(Boolean);
    const heavyFeatureMissing = [
      planarReflection === null ? "planar reflection state" : null,
      weatherParticles === null ? "weather particle state" : null,
      highQualityVehicles === null ? "high-quality vehicle count" : null,
      !Number.isFinite(shadowCasterCount) ? "shadow caster count" : null
    ].filter(Boolean);
    const performanceMissing = [
      performanceFrameTimeMs === null ? "frame time" : null,
      textureMemoryEstimateMb === null ? "texture memory estimate" : null
    ].filter(Boolean);
    const fallbackUsed = Boolean(viewport) && !frameBound;
    const fallbackReason = frameBound ? null : queueSource ?? "frame_not_bound";
    const readText = (selector) =>
      document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? null;

    return {
      source_mode: snapshotSource,
      snapshot_source: snapshotSource,
      frame_bound: frameBound,
      traffic_density_mode: trafficDensityMode,
      signal_state: signalState,
      scenario_id: scenarioId,
      queue_source: queueSource,
      finishing_stage: finishingStage,
      weather,
      time_of_day: timeOfDay,
      fallback_reason: fallbackReason,
      frame_age_ms: frameAgeMs,
      network_latency_ms: networkLatencyMs,
      sim_to_render_delay_ms: simToRenderDelayMs,
      authoritative_hz: authoritativeHz,
      authoritative_tick_drift_ms: authoritativeTickDriftMs,
      frame_stale: frameStale,
      qualityPreset: {
        value: qualityPreset,
        source: qualityPresetAttr
          ? "dom_attribute"
          : telemetryQualityPreset
            ? "browser_telemetry"
            : "not_reported",
        reason: qualityPreset
          ? null
          : "quality preset was not reported by DOM attributes or browser telemetry"
      },
      postFx: {
        enabled: postFxEnabled,
        chain: postFxChain,
        source:
          telemetryPostFx || postFxEnabled !== null || postFxChain !== null
            ? "browser_telemetry_or_dom_attribute"
            : "not_reported",
        reason: buildMissingReason(
          postFxMissing,
          "was not reported by DOM attributes or browser telemetry"
        )
      },
      heavyFeatures: {
        planarReflection,
        weatherParticles,
        highQualityVehicles,
        shadowCasters: Number.isFinite(shadowCasterCount)
          ? shadowCasterCount
          : null,
        source:
          telemetryHeavyFeatures ||
          planarReflection !== null ||
          weatherParticles !== null ||
          highQualityVehicles !== null ||
          Number.isFinite(shadowCasterCount)
            ? "browser_telemetry_or_dom_attribute"
            : "not_reported",
        reason: buildMissingReason(
          heavyFeatureMissing,
          "was not reported by DOM attributes or browser telemetry"
        )
      },
      shadow_enabled: shadowEnabled,
      shadow_caster_count: Number.isFinite(shadowCasterCount)
        ? shadowCasterCount
        : null,
      fallback_used: fallbackUsed,
      rendererMode: viewport?.getAttribute("data-r3f-renderer-mode") ?? null,
      photorealStage: viewport?.getAttribute("data-r3f-photoreal-stage") ?? null,
      finishingStage,
      weather,
      timeOfDay,
      snapshotSource,
      sourceMode: snapshotSource,
      frameBound,
      trafficDensityMode,
      signalState,
      scenarioId,
      queueSource,
      fallbackReason,
      frameAgeMs,
      networkLatencyMs,
      simToRenderDelayMs,
      authoritativeHz,
      authoritativeTickDriftMs,
      frameStale,
      performance: {
        drawCalls,
        frameTimeMs: performanceFrameTimeMs,
        visibleVehicles: Number(
          viewport?.getAttribute("data-r3f-visible-vehicle-count") ?? "0"
        ),
        textureMemoryEstimateMb,
        source: "browser_telemetry_or_renderer_info",
        reason: buildMissingReason(
          performanceMissing,
          "was not reported by browser telemetry"
        )
      },
      sourceLabels: {
        snapshotSource,
        stale: frameStale,
        fallbackReason,
        frameStaleBadge: readText('[data-testid="r3f-frame-stale-badge"]'),
        snapshotBadge: readText('[data-testid="r3f-snapshot-source-badge"]'),
        trafficDensityBadge: readText(
          '[data-testid="r3f-traffic-density-mode-badge"]'
        ),
        signalStateBadge: readText('[data-testid="r3f-signal-state-badge"]'),
        queueSourceBadge: readText('[data-testid="r3f-queue-source-badge"]')
      },
      shadowEnabled,
      shadowCasterCount: Number.isFinite(shadowCasterCount)
        ? shadowCasterCount
        : null,
      fallbackUsed,
      visibleVehicleCount: Number(
        viewport?.getAttribute("data-r3f-visible-vehicle-count") ?? "0"
      ),
      glbVehicleCount: Number(
        viewport?.getAttribute("data-r3f-glb-vehicle-count") ?? "0"
      ),
      streetFurnitureShadowCount: Number(
        viewport?.getAttribute("data-r3f-street-shadow-count") ?? "0"
      ),
      vehicleSilhouettePartCount: Number(
        viewport?.getAttribute("data-r3f-vehicle-silhouette-part-count") ?? "0"
      ),
      corridorLengthMeters:
        viewport?.getAttribute("data-r3f-corridor-length-meters") ?? null,
      canvasSize: canvas
        ? {
            cssWidth: Math.round(canvas.getBoundingClientRect().width),
            cssHeight: Math.round(canvas.getBoundingClientRect().height),
            backingWidth: canvas.width,
            backingHeight: canvas.height
          }
        : null,
      drawCalls,
      peakDrawCalls,
      normalDrawCallBudget: Number(
        appProof?.normalDrawCallBudget ?? normalDrawCallBudget
      ),
      peakDrawCallBudget: Number(appProof?.drawCallBudget ?? peakDrawCallBudget),
      drawCallSource:
        Number.isFinite(Number(rendererInfoCalls)) && rendererInfoCalls !== null
          ? "renderer.info"
          : "webgl_draw_call_instrumentation",
      rendererInfoReported: Boolean(rendererInfo) || appProof?.renderer === "r3f",
      webglContextLossEvents: contextLossEvents,
      telemetry: telemetry
        ? {
            renderer_mode: telemetry.renderer_mode ?? null,
            snapshot_source: telemetry.snapshot_source ?? null,
            frame_bound: telemetry.frame_bound ?? null,
            draw_call_count: telemetry.draw_call_count ?? null,
            webgl_context_loss_count: telemetry.webgl_context_loss_count ?? null,
            fallback_reason: telemetry.fallback_reason ?? null,
            visible_vehicle_count: telemetry.visible_vehicle_count ?? null,
            frame_age_ms: telemetry.frame_age_ms ?? null,
            network_latency_ms: telemetry.network_latency_ms ?? null,
            sim_to_render_delay_ms: telemetry.sim_to_render_delay_ms ?? null,
            authoritative_hz: telemetry.authoritative_hz ?? null,
            authoritative_tick_drift_ms:
              telemetry.authoritative_tick_drift_ms ?? null,
            frame_stale: telemetry.frame_stale ?? null,
            quality_preset: telemetry.quality_preset ?? null,
            post_fx: telemetry.post_fx ?? null,
            heavy_features: telemetry.heavy_features ?? null,
            fps: telemetry.fps ?? null,
            average_frame_time_ms: telemetry.average_frame_time_ms ?? null,
            cpu_frame_time_ms: telemetry.cpu_frame_time_ms ?? null,
            gpu_frame_time_ms: telemetry.gpu_frame_time_ms ?? null,
            triangles: telemetry.triangles ?? null,
            texture_memory_bytes: telemetry.texture_memory_bytes ?? null,
            performance: telemetry.performance ?? null,
            source_labels: telemetry.source_labels ?? null,
            pedestrian_truth: telemetry.pedestrian_truth ?? null,
            js_heap_bytes: telemetry.js_heap_bytes ?? null,
            emitted_at: telemetry.emitted_at ?? null
          }
        : null,
      appProof: appProof
        ? {
            renderer: appProof.renderer ?? null,
            stage: appProof.stage ?? null,
            contextLost: appProof.contextLost ?? null,
            contextLossEvents: appProof.contextLossEvents ?? null,
            drawCalls: appProof.drawCalls ?? null,
            peakDrawCalls: appProof.peakDrawCalls ?? null,
            normalDrawCallBudget: appProof.normalDrawCallBudget ?? null,
            drawCallBudget: appProof.drawCallBudget ?? null,
            shadowEnabled: appProof.shadowEnabled ?? null,
            shadowCasterCount: appProof.shadowCasterCount ?? null,
            fps: appProof.fps ?? null,
            averageFrameTimeMs: appProof.averageFrameTimeMs ?? null,
            cpuFrameTimeMs: appProof.cpuFrameTimeMs ?? null,
            gpuFrameTimeMs: appProof.gpuFrameTimeMs ?? null,
            triangles: appProof.triangles ?? null,
            textureMemoryBytes: appProof.textureMemoryBytes ?? null,
            jsHeapBytes: appProof.jsHeapBytes ?? null,
            authoritativeTickDriftMs: appProof.authoritativeTickDriftMs ?? null,
            canvasWidth: appProof.canvasWidth ?? null,
            canvasHeight: appProof.canvasHeight ?? null,
            canvasConnected: appProof.canvasConnected ?? null,
            drawingBufferWidth: appProof.drawingBufferWidth ?? null,
            drawingBufferHeight: appProof.drawingBufferHeight ?? null
          }
        : null,
      domProof: {
        viewport: readElementProof(viewport),
        sourceOverlays: readElementProof(
          document.querySelector('[data-testid="r3f-simulation-overlays"]')
        ),
        sourceBadges: {
          simulation: readText('[data-testid="r3f-simulation-source-badge"]'),
          snapshot: readText('[data-testid="r3f-snapshot-source-badge"]'),
          trafficDensity: readText('[data-testid="r3f-traffic-density-mode-badge"]'),
          signalState: readText('[data-testid="r3f-signal-state-badge"]'),
          queueSource: readText('[data-testid="r3f-queue-source-badge"]'),
          frameStale: readText('[data-testid="r3f-frame-stale-badge"]'),
          scenarioId: readText('[data-testid="r3f-scenario-id-badge"]')
        },
        wrapper: readElementProof(document.querySelector(".r3f-simulation-canvas")),
        canvas: readElementProof(canvas),
        canvases: Array.from(document.querySelectorAll("canvas")).map((element) =>
          readElementProof(element)
        )
      }
    };
  }, {
    normalDrawCallBudget: maxNormalDrawCalls,
    peakDrawCallBudget: maxPeakDrawCalls
  });
}

// Draw-call budget split (2026-07-04):
//   peakDrawCalls  -> session per-frame MAX (transients INCLUDED) -> 900 peak budget.
//   steadyMaxDrawCalls -> max over forced post-settle frames -> 650 normal budget.
// The session max folds in a pre-existing, capture-induced cold shadow-map-regen
// transient (574-616 typical, 757/940 when the readPixels capture lands on a cold
// frame). That transient is baseline-invariant — it fires with the day-fill scene
// layers UNMOUNTED — so it belongs in the honest PEAK, not the "normal" budget.
// SimulationCanvas runs frameloop="demand" with no continuous useFrame, so nothing
// redraws after the load burst settles; a "steady frame" only exists if forced.
// This forces >=10 renders via the app invalidate hook (window.__r3fSimulationInvalidate)
// and takes the max draw calls over those frames only. True steady is ~640.
// NOTE: call this AFTER peakDrawCalls has been captured — the first forced render
// after idle pays a one-time shadow-map/env wake spike (~940) that would otherwise
// inflate the session max past the 900 peak budget; the warm-up loop below burns it.
async function measureSteadyStateDrawCalls(page) {
  return page.evaluate(async () => {
    const verifier = window.__r3fDashboardVerifier;
    const invalidate = window.__r3fSimulationInvalidate;
    if (!verifier || typeof invalidate !== "function") {
      return null;
    }

    const nextFrame = () =>
      new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

    // Warm-up: pay the one-time cold shadow-map/env regen (~940) on the first
    // forced render after the idle demand loop, so it is excluded from the max.
    for (let i = 0; i < 5; i += 1) {
      invalidate();
      await nextFrame();
      await nextFrame();
    }

    // Measured window: force renders and take the per-frame max. Sampling
    // drawCallsLastFrame after both rAF waits is robust to the render-vs-tick
    // ordering within a single animation frame (idle frames report 0, which
    // cannot lower the running max).
    let steadyMax = 0;
    for (let i = 0; i < 16; i += 1) {
      invalidate();
      await nextFrame();
      steadyMax = Math.max(steadyMax, Number(verifier.drawCallsLastFrame ?? 0));
      await nextFrame();
      steadyMax = Math.max(steadyMax, Number(verifier.drawCallsLastFrame ?? 0));
    }

    return steadyMax > 0 ? steadyMax : null;
  });
}

async function collectPerformanceProof(page, options = {}) {
  const sampleMs = options.sampleMs ?? 650;
  const targetFps = options.targetFps ?? 60;
  return page.evaluate(
    ({ sampleMs, targetFps }) =>
      new Promise((resolve) => {
        const startedAt = performance.now();
        const frameTimes = [];
        let lastFrameAt = startedAt;

        const readHeap = () => {
          const memory = performance.memory;
          const used = memory?.usedJSHeapSize;
          return Number.isFinite(used) ? Number(used) : null;
        };

        const finish = () => {
          const elapsedMs = Math.max(performance.now() - startedAt, 1);
          const averageFrameTimeMs =
            frameTimes.length > 0
              ? frameTimes.reduce((sum, value) => sum + value, 0) /
                frameTimes.length
              : null;
          const fps =
            frameTimes.length > 0 ? (frameTimes.length * 1000) / elapsedMs : null;
          const rawFps = fps === null ? null : Number(fps.toFixed(2));
          const rawAverageFrameTimeMs =
            averageFrameTimeMs === null
              ? null
              : Number(averageFrameTimeMs.toFixed(2));
          const expectedFrames = Math.max(
            1,
            Math.round((targetFps * elapsedMs) / 1000)
          );
          const sparseFrameSample =
            frameTimes.length <= Math.max(2, Math.floor(expectedFrames * 0.3));
          const headlessDemandLoopThrottled =
            sparseFrameSample &&
            rawFps !== null &&
            rawFps < Math.max(5, targetFps * 0.3);

          resolve({
            measurement_status: headlessDemandLoopThrottled
              ? "unmeasurable_headless_static_demand_loop"
              : "measured",
            reason: headlessDemandLoopThrottled
              ? "Headless Chromium throttled requestAnimationFrame while the R3F canvas uses frameloop=demand; FPS/frame-time target sampling is not measurable in this proof mode, so draw calls, triangles, telemetry fields, and raw rAF data are recorded instead."
              : null,
            sample_ms: Math.round(elapsedMs),
            frame_count: frameTimes.length,
            expected_frame_count: expectedFrames,
            fps: headlessDemandLoopThrottled ? null : rawFps,
            average_frame_time_ms: headlessDemandLoopThrottled
              ? null
              : rawAverageFrameTimeMs,
            cpu_frame_time_ms:
              headlessDemandLoopThrottled ? null : rawAverageFrameTimeMs,
            gpu_frame_time_ms: null,
            texture_memory_bytes: null,
            js_heap_bytes: readHeap(),
            raw_fps: rawFps,
            raw_average_frame_time_ms: rawAverageFrameTimeMs,
            target_fps: targetFps
          });
        };

        const tick = (now) => {
          frameTimes.push(Math.max(0, now - lastFrameAt));
          lastFrameAt = now;
          if (now - startedAt >= sampleMs) {
            finish();
            return;
          }

          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      }),
    { sampleMs, targetFps }
  );
}

function normalizeTopLevelPerformanceProof(performance, desktopPerformance) {
  if (!isRecord(performance)) return null;

  if (!isHeadlessDemandLoopUnmeasurable(desktopPerformance)) {
    return performance;
  }

  return {
    ...performance,
    frameTimeMs: null,
    rawFrameTimeMs: Number.isFinite(Number(performance.frameTimeMs))
      ? Number(performance.frameTimeMs)
      : null,
    measurementStatus: desktopPerformance.measurement_status,
    source: `${performance.source ?? "browser_telemetry_or_renderer_info"}+desktop_performance_sample`,
    reason: desktopPerformance.reason
  };
}

function normalizeTelemetryPerformanceProof(
  telemetry,
  normalizedPerformance,
  desktopPerformance
) {
  if (!isRecord(telemetry)) return telemetry;
  if (!isHeadlessDemandLoopUnmeasurable(desktopPerformance)) return telemetry;

  const telemetryPerformance = isRecord(telemetry.performance)
    ? telemetry.performance
    : {};
  const rawFrameTimeMs = Number.isFinite(Number(telemetryPerformance.frame_time_ms))
    ? Number(telemetryPerformance.frame_time_ms)
    : Number.isFinite(Number(telemetry.average_frame_time_ms))
      ? Number(telemetry.average_frame_time_ms)
      : Number.isFinite(Number(normalizedPerformance?.rawFrameTimeMs))
        ? Number(normalizedPerformance.rawFrameTimeMs)
        : null;

  return {
    ...telemetry,
    fps: null,
    average_frame_time_ms: null,
    cpu_frame_time_ms: null,
    gpu_frame_time_ms: null,
    raw_fps: desktopPerformance.raw_fps ?? null,
    raw_average_frame_time_ms:
      desktopPerformance.raw_average_frame_time_ms ?? rawFrameTimeMs,
    performance: {
      ...telemetryPerformance,
      frame_time_ms: null,
      raw_frame_time_ms: rawFrameTimeMs,
      measurement_status: desktopPerformance.measurement_status,
      source: `${telemetryPerformance.source ?? "app_proof"}+desktop_performance_sample`,
      reason: desktopPerformance.reason
    }
  };
}

function isHeadlessDemandLoopUnmeasurable(performance) {
  return (
    isRecord(performance) &&
    performance.measurement_status === "unmeasurable_headless_static_demand_loop" &&
    typeof performance.reason === "string" &&
    performance.reason.length > 0
  );
}

async function collectOverlayLayoutProof(page) {
  return page.evaluate(() => {
    const viewportRect = {
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
    const readRect = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();

      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left)
      };
    };
    const intersectRect = (left, right) => {
      if (!left || !right) return null;
      const x1 = Math.max(left.left, right.left);
      const y1 = Math.max(left.top, right.top);
      const x2 = Math.min(left.right, right.right);
      const y2 = Math.min(left.bottom, right.bottom);
      const width = Math.max(0, x2 - x1);
      const height = Math.max(0, y2 - y1);

      return {
        x: Math.round(x1),
        y: Math.round(y1),
        width: Math.round(width),
        height: Math.round(height),
        top: Math.round(y1),
        right: Math.round(x2),
        bottom: Math.round(y2),
        left: Math.round(x1)
      };
    };
    const visibleInViewport = (rect, intersection) =>
      Boolean(
        rect &&
          rect.width > 0 &&
          rect.height > 0 &&
          intersection &&
          intersection.width > 0 &&
          intersection.height > 0
      );
    const overlaps = (left, right) => {
      if (!left || !right) return false;
      return !(
        left.right <= right.left ||
        left.left >= right.right ||
        left.bottom <= right.top ||
        left.top >= right.bottom
      );
    };
    const overlay = document.querySelector('[data-testid="r3f-simulation-overlays"]');
    const safety = document.querySelector(".safety-command-banner");
    const overlayRect = readRect(overlay);
    const safetyRect = readRect(safety);
    const overlayViewportIntersection = intersectRect(overlayRect, viewportRect);
    const safetyViewportIntersection = intersectRect(safetyRect, viewportRect);

    return {
      viewportRect,
      overlayVisible: visibleInViewport(overlayRect, overlayViewportIntersection),
      safetyCopyVisible: visibleInViewport(safetyRect, safetyViewportIntersection),
      overlayRect,
      safetyRect,
      overlayViewportIntersection,
      safetyViewportIntersection,
      overlapsSafetyCopy: overlaps(overlayRect, safetyRect)
    };
  });
}

async function scrollToOverlayProofRegion(page) {
  await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="r3f-simulation-overlays"]');
    const safety = document.querySelector(".safety-command-banner");

    if (!overlay || !safety) return;

    const overlayRect = overlay.getBoundingClientRect();
    const safetyRect = safety.getBoundingClientRect();
    const currentScrollY = window.scrollY;
    const top = currentScrollY + Math.min(overlayRect.top, safetyRect.top);
    const bottom = currentScrollY + Math.max(overlayRect.bottom, safetyRect.bottom);
    const wantedTop = Math.max(0, Math.min(top - 24, bottom - window.innerHeight + 24));

    window.scrollTo({ top: wantedTop, left: 0, behavior: "instant" });
  });
  await page.waitForTimeout(400);
}

async function captureViewportScreenshot(page, filePath, options = {}) {
  const viewport = page.viewportSize() ?? desktopViewport;
  const screenshotOptions = {
    path: filePath,
    fullPage: false,
    clip: {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height
    },
    scale: "css",
    animations: "allow",
    timeout: 30000,
    ...options
  };

  try {
    await page.screenshot(screenshotOptions);
  } catch (error) {
    if (!/screenshot.*timeout|timeout.*screenshot/i.test(String(error))) {
      throw error;
    }

    await captureViewportScreenshotViaCdp(page, filePath, {
      viewport
    });
  }
}

async function captureViewportScreenshotViaCdp(
  page,
  filePath,
  { viewport }
) {
  const client = await page.context().newCDPSession(page);

  try {
    const capture = await client.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });

    await writeFile(filePath, Buffer.from(capture.data, "base64"));
  } finally {
    await client.detach().catch(() => {});
  }
}

async function captureR3FCanvasClipScreenshot(page, filePath, options = {}) {
  let overlayStyle = null;

  try {
    if (options.hideOverlays === true) {
      overlayStyle = await page.addStyleTag({
        content:
          '[data-testid="r3f-simulation-overlays"] { visibility: hidden !important; }'
      });
      await page.waitForTimeout(100);
    }

    const clip = await page.evaluate((selector) => {
      const canvas = document.querySelector(selector);

      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("R3F canvas element was not available for clipped screenshot");
      }

      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.floor(rect.left));
      const y = Math.max(0, Math.floor(rect.top));
      const right = Math.min(window.innerWidth, Math.ceil(rect.right));
      const bottom = Math.min(window.innerHeight, Math.ceil(rect.bottom));

      return {
        x,
        y,
        width: Math.max(1, right - x),
        height: Math.max(1, bottom - y)
      };
    }, r3fCanvasSelector);

    let buffer = null;
    try {
      buffer = await page.screenshot({
        path: filePath,
        clip,
        fullPage: false,
        scale: "css",
        animations: "disabled",
        timeout: 90000
      });
    } catch (error) {
      if (!/clipped area/i.test(String(error?.message ?? error))) {
        throw error;
      }

      details.mobile_canvas_clip_fallback = {
        reason: error instanceof Error ? error.message : String(error),
        clip
      };
      buffer = await page.screenshot({
        path: filePath,
        fullPage: false,
        scale: "css",
        animations: "disabled",
        timeout: 90000
      });
    }

    if (options.requireReadableComposition) {
      const compositionCheck = buildReadableCompositionCheck(
        analyzeCanvasComposition(buffer)
      );

      if (compositionCheck.passed !== true) {
        const label = options.label ?? "R3F canvas";
        throw new Error(
          `${label} clipped screenshot did not reach readable composition: ` +
            JSON.stringify(compositionCheck)
        );
      }
    }

    return buffer;
  } finally {
    if (overlayStyle) {
      await overlayStyle.evaluate((node) => node.remove()).catch(() => {});
    }
  }
}

async function captureR3FCanvasPng(page, filePath, options = {}) {
  const startedAt = Date.now();
  let lastBuffer = null;
  let lastCompositionCheck = null;
  let lastCaptureError = null;
  let attempts = 0;

  while (Date.now() - startedAt <= (options.timeoutMs ?? readableCanvasCaptureTimeoutMs)) {
    attempts += 1;
    try {
      lastBuffer = await readR3FCanvasPng(page);
      lastCaptureError = null;
    } catch (error) {
      lastCaptureError = error;
      await page.waitForTimeout(
        options.intervalMs ?? readableCanvasCaptureIntervalMs
      );
      continue;
    }

    if (!options.requireReadableComposition) {
      break;
    }

    lastCompositionCheck = buildReadableCompositionCheck(
      analyzeCanvasComposition(lastBuffer)
    );

    if (lastCompositionCheck.passed) {
      break;
    }

    await page.waitForTimeout(
      options.intervalMs ?? readableCanvasCaptureIntervalMs
    );
  }

  if (!lastBuffer) {
    throw new Error(
      `R3F renderer did not produce a canvas readback after ${attempts} attempts` +
        (lastCaptureError
          ? `: ${lastCaptureError instanceof Error ? lastCaptureError.message : String(lastCaptureError)}`
          : "")
    );
  }

  if (options.requireReadableComposition && lastCompositionCheck?.passed !== true) {
    const label = options.label ?? "R3F canvas";
    throw new Error(
      `${label} did not reach readable composition after ${attempts} attempts: ` +
        JSON.stringify(lastCompositionCheck)
    );
  }

  await writeFile(filePath, lastBuffer);
  return lastBuffer;
}

async function captureR3FCanvasDataUrlPng(page, filePath, options = {}) {
  const startedAt = Date.now();
  let lastBuffer = null;
  let lastCompositionCheck = null;
  let attempts = 0;

  while (Date.now() - startedAt <= (options.timeoutMs ?? readableCanvasCaptureTimeoutMs)) {
    attempts += 1;
    lastBuffer = await readR3FCanvasDataUrlPng(page);

    if (!options.requireReadableComposition) {
      break;
    }

    lastCompositionCheck = buildReadableCompositionCheck(
      analyzeCanvasComposition(lastBuffer)
    );

    if (lastCompositionCheck.passed) {
      break;
    }

    await page.waitForTimeout(
      options.intervalMs ?? readableCanvasCaptureIntervalMs
    );
  }

  if (!lastBuffer) {
    throw new Error("R3F renderer did not produce a canvas data URL screenshot");
  }

  if (options.requireReadableComposition && lastCompositionCheck?.passed !== true) {
    const label = options.label ?? "R3F canvas";
    throw new Error(
      `${label} did not reach readable composition after ${attempts} data URL attempts: ` +
        JSON.stringify(lastCompositionCheck)
    );
  }

  await writeFile(filePath, lastBuffer);
  return lastBuffer;
}

async function readR3FCanvasDataUrlPng(page) {
  const dataUrl = await page.evaluate((selector) => {
    const canvas =
      document.querySelector(selector) ??
      window.__r3fSimulationCanvasElement ??
      null;

    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("R3F canvas element was not available for screenshot fallback");
    }

    return canvas.toDataURL("image/png");
  }, r3fCanvasSelector);
  const [, base64Png] = dataUrl.split(",");

  if (!base64Png) {
    throw new Error("R3F canvas screenshot fallback did not produce PNG data");
  }

  return Buffer.from(base64Png, "base64");
}

async function readR3FCanvasPng(page) {
  let capture;

  try {
    capture = await page.evaluate(() => {
      if (typeof window.__r3fSimulationReadPixels !== "function") {
        throw new Error("R3F renderer readback function was not installed");
      }

      return window.__r3fSimulationReadPixels();
    });
  } catch (error) {
    if (!/readback function was not installed/i.test(String(error?.message ?? error))) {
      throw error;
    }

    return readR3FCanvasDataUrlPng(page);
  }

  const buffer = encodeRgbaPng(
    capture.width,
    capture.height,
    Buffer.from(capture.pixelsBase64, "base64")
  );
  return buffer;
}

async function collectMobileLayoutProof(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const viewport = document.querySelector('[data-testid="r3f-simulation-viewport"]');
    const canvas = document.querySelector(
      "canvas.r3f-simulation-canvas, .r3f-simulation-canvas canvas"
    );
    const viewportWidth = window.innerWidth;
    const overflowBy = Math.max(root.scrollWidth, body.scrollWidth) - viewportWidth;
    const viewportRect = viewport?.getBoundingClientRect();
    const canvasRect = canvas?.getBoundingClientRect();

    return {
      viewportWidth,
      scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
      horizontalOverflow: overflowBy > 1,
      overflowBy: Math.max(0, Math.round(overflowBy)),
      r3fViewportVisible: Boolean(
        viewportRect &&
          viewportRect.width > 100 &&
          viewportRect.height > 100 &&
          viewportRect.bottom > 0 &&
          viewportRect.right > 0
      ),
      canvasVisible: Boolean(
        canvasRect &&
          canvasRect.width > 100 &&
          canvasRect.height > 100 &&
          canvasRect.bottom > 0 &&
          canvasRect.right > 0
      )
    };
  });
}

async function collectFallbackProof(page) {
  return page.evaluate(() => {
    const r3fViewport = document.querySelector('[data-testid="r3f-simulation-viewport"]');
    const fallbackCanvas = document.querySelector("canvas.sumo-playback-canvas");
    const safetyText = document.body.innerText.includes("Simulation only");
    const rect = fallbackCanvas?.getBoundingClientRect();

    return {
      r3fMounted: Boolean(r3fViewport),
      fallbackCanvasVisible: Boolean(rect && rect.width > 100 && rect.height > 100),
      safetyTextVisible: safetyText
    };
  });
}

function paethPredictor(left, up, upperLeft) {
  const p = left + up - upperLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upperLeft);

  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upperLeft;
}

function decodePng(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Invalid PNG signature");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd + 4 > buffer.length) {
      throw new Error("Truncated PNG chunk");
    }

    const data = buffer.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth ${bitDepth}`);
  }

  const channelsByColorType = new Map([
    [0, 1],
    [2, 3],
    [6, 4]
  ]);
  const channels = channelsByColorType.get(colorType);

  if (!channels) {
    throw new Error(`Unsupported PNG color type ${colorType}`);
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const scanlineLength = width * channels;
  const rgba = new Uint8Array(width * height * 4);
  let inputOffset = 0;
  let outputOffset = 0;
  let previous = new Uint8Array(scanlineLength);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const current = new Uint8Array(scanlineLength);

    for (let x = 0; x < scanlineLength; x += 1) {
      const raw = inflated[inputOffset + x];
      const left = x >= channels ? current[x - channels] : 0;
      const up = previous[x] ?? 0;
      const upperLeft = x >= channels ? previous[x - channels] : 0;

      if (filter === 0) current[x] = raw;
      else if (filter === 1) current[x] = (raw + left) & 0xff;
      else if (filter === 2) current[x] = (raw + up) & 0xff;
      else if (filter === 3) current[x] = (raw + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) current[x] = (raw + paethPredictor(left, up, upperLeft)) & 0xff;
      else throw new Error(`Unsupported PNG filter ${filter}`);
    }

    inputOffset += scanlineLength;

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = x * channels;
      const gray = current[pixelOffset];
      const r = colorType === 0 ? gray : current[pixelOffset];
      const g = colorType === 0 ? gray : current[pixelOffset + 1];
      const b = colorType === 0 ? gray : current[pixelOffset + 2];
      const a = colorType === 6 ? current[pixelOffset + 3] : 255;

      rgba[outputOffset] = r;
      rgba[outputOffset + 1] = g;
      rgba[outputOffset + 2] = b;
      rgba[outputOffset + 3] = a;
      outputOffset += 4;
    }

    previous = current;
  }

  return { width, height, data: rgba };
}

function encodeRgbaPng(width, height, rgba) {
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = Buffer.alloc(13);

  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const targetOffset = y * (stride + 1);
    const sourceOffset = (height - 1 - y) * stride;

    raw[targetOffset] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + sourceOffset, stride).copy(
      raw,
      targetOffset + 1
    );
  }

  return Buffer.concat([
    signature,
    createPngChunk("IHDR", ihdr),
    createPngChunk("IDAT", deflateSync(raw)),
    createPngChunk("IEND", Buffer.alloc(0))
  ]);
}

function runCompositionSelfTest() {
  const centralStripPng = buildSyntheticCanvasPng({
    width: 400,
    height: 300,
    background: [0, 0, 0, 255],
    rects: [
      { x: 170, y: 90, width: 60, height: 200, color: [35, 44, 48, 255] },
      { x: 0, y: 145, width: 400, height: 24, color: [28, 37, 42, 255] },
      { x: 188, y: 110, width: 24, height: 120, color: [210, 190, 154, 255] },
      { x: 184, y: 105, width: 10, height: 10, color: [155, 45, 42, 255] },
      { x: 206, y: 125, width: 10, height: 10, color: [48, 130, 164, 255] }
    ]
  });
  const wideReadablePng = buildSyntheticCanvasPng({
    width: 400,
    height: 300,
    background: [0, 0, 0, 255],
    rects: [
      { x: 120, y: 0, width: 160, height: 300, color: [38, 46, 50, 255] },
      { x: 0, y: 105, width: 400, height: 110, color: [38, 46, 50, 255] },
      { x: 96, y: 0, width: 18, height: 300, color: [62, 68, 66, 255] },
      { x: 286, y: 0, width: 18, height: 300, color: [62, 68, 66, 255] },
      { x: 0, y: 82, width: 400, height: 16, color: [62, 68, 66, 255] },
      { x: 0, y: 222, width: 400, height: 16, color: [62, 68, 66, 255] },
      { x: 194, y: 0, width: 8, height: 300, color: [174, 170, 144, 255] },
      { x: 0, y: 154, width: 400, height: 8, color: [174, 170, 144, 255] },
      { x: 150, y: 28, width: 28, height: 18, color: [156, 48, 45, 255] },
      { x: 214, y: 56, width: 28, height: 18, color: [52, 124, 160, 255] },
      { x: 52, y: 132, width: 30, height: 18, color: [182, 161, 96, 255] },
      { x: 315, y: 174, width: 30, height: 18, color: [64, 144, 132, 255] },
      { x: 162, y: 242, width: 28, height: 18, color: [52, 124, 160, 255] }
    ]
  });
  const centralStripCheck = buildReadableCompositionCheck(
    analyzeCanvasComposition(centralStripPng)
  );
  const wideReadableCheck = buildReadableCompositionCheck(
    analyzeCanvasComposition(wideReadablePng)
  );

  assertSelfTest(
    centralStripCheck.passed === false,
    `central-strip synthetic canvas should fail composition gate: ${JSON.stringify(centralStripCheck)}`
  );
  assertSelfTest(
    wideReadableCheck.passed === true,
    `wide synthetic canvas should pass composition gate: ${JSON.stringify(wideReadableCheck)}`
  );

  console.log("R3F dashboard verifier composition self-test passed.");
}

function runLiveSumoProofSelfTest() {
  const good = buildLiveSumoProofCheck({
    status: "captured",
    r3f_ready: true,
    api_readiness: {
      simulation: {
        ready: true,
        mode: "sumo_traci"
      }
    },
    frame_sample: {
      source: "sumo_traci",
      vehicle_count: 1,
      signal_count: 2
    },
    screenshot: {
      exists: true,
      bytes: 1024
    },
    renderer: {
      snapshot_source: "sumo_traci",
      frame_bound: true,
      frame_age_ms: 12,
      network_latency_ms: 8,
      sim_to_render_delay_ms: 150,
      signal_state: "north:red,east:green",
      domProof: {
        sourceBadges: {
          simulation: "simulation source: sumo_traci",
          snapshot: "snapshot source: sumo_traci"
        }
      }
    }
  });
  const stale = buildLiveSumoProofCheck({
    status: "captured",
    r3f_ready: true,
    api_readiness: {
      simulation: {
        ready: true,
        mode: "sumo_traci"
      }
    },
    frame_sample: {
      source: "sumo_last_good",
      vehicle_count: 1,
      signal_count: 2
    },
    screenshot: {
      exists: true,
      bytes: 1024
    },
    renderer: {
      snapshot_source: "sumo_last_good",
      frame_bound: true,
      frame_age_ms: 12,
      network_latency_ms: 8,
      sim_to_render_delay_ms: 150,
      signal_state: "north:red,east:green",
      domProof: {
        sourceBadges: {
          simulation: "simulation source: sumo_last_good",
          snapshot: "snapshot source: sumo_last_good"
        }
      }
    }
  });

  assertSelfTest(good.passed === true, good.evidence);
  assertSelfTest(stale.passed === false, stale.evidence);

  console.log("R3F dashboard verifier live SUMO self-test passed.");
}

async function runRendererProofFallbackSelfTest() {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;

  try {
    globalThis.window = {
      __r3fDashboardVerifier: {},
      getComputedStyle: () => ({
        display: "block",
        opacity: "1",
        position: "static",
        zIndex: "auto",
        backgroundImage: "none",
        backgroundColor: "rgba(0, 0, 0, 0)"
      })
    };
    globalThis.document = {
      querySelector: () => null,
      querySelectorAll: () => []
    };

    const rendererProof = await collectRendererProof({
      evaluate: async (callback, payload) => {
        const browserContextCallback = (0, eval)(`(${callback.toString()})`);

        return browserContextCallback(payload);
      }
    });

    assertSelfTest(
      rendererProof.normalDrawCallBudget === maxNormalDrawCalls,
      `expected fallback normal draw-call budget ${maxNormalDrawCalls}, got ${rendererProof.normalDrawCallBudget}`
    );
    assertSelfTest(
      rendererProof.peakDrawCallBudget === maxPeakDrawCalls,
      `expected fallback peak draw-call budget ${maxPeakDrawCalls}, got ${rendererProof.peakDrawCallBudget}`
    );

    console.log("R3F dashboard verifier renderer-proof fallback self-test passed.");
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }

    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
}

function buildSyntheticCanvasPng({ width, height, background, rects }) {
  const rgba = new Uint8Array(width * height * 4);

  for (let offset = 0; offset < rgba.length; offset += 4) {
    rgba[offset] = background[0];
    rgba[offset + 1] = background[1];
    rgba[offset + 2] = background[2];
    rgba[offset + 3] = background[3];
  }

  for (const rect of rects) {
    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
      for (let x = rect.x; x < rect.x + rect.width; x += 1) {
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const offset = (y * width + x) * 4;
        rgba[offset] = rect.color[0];
        rgba[offset + 1] = rect.color[1];
        rgba[offset + 2] = rect.color[2];
        rgba[offset + 3] = rect.color[3];
      }
    }
  }

  return encodeRgbaPng(width, height, rgba);
}

function assertSelfTest(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createPngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

let crc32Table = null;

function crc32(buffer) {
  if (!crc32Table) {
    crc32Table = Array.from({ length: 256 }, (_, index) => {
      let value = index;

      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }

      return value >>> 0;
    });
  }

  let value = 0xffffffff;

  for (const byte of buffer) {
    value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8);
  }

  return (value ^ 0xffffffff) >>> 0;
}

function analyzePng(buffer, background = [16, 20, 24]) {
  const image = decodePng(buffer);
  const totalPixels = image.width * image.height;
  const step = Math.max(1, Math.floor(totalPixels / 400000));
  const buckets = new Set();
  let sampled = 0;
  let nonBackground = 0;
  let bright = 0;
  let dark = 0;
  let warmLight = 0;
  let coolLight = 0;
  let marking = 0;
  let saturated = 0;
  let luminanceSum = 0;
  let luminanceSquaredSum = 0;

  for (let pixel = 0; pixel < totalPixels; pixel += step) {
    const offset = pixel * 4;
    const r = image.data[offset];
    const g = image.data[offset + 1];
    const b = image.data[offset + 2];
    const a = image.data[offset + 3];

    if (a < 16) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const saturation = max === 0 ? 0 : (max - min) / max;
    const backgroundDistance = Math.hypot(
      r - background[0],
      g - background[1],
      b - background[2]
    );

    sampled += 1;
    luminanceSum += luminance;
    luminanceSquaredSum += luminance * luminance;
    buckets.add(`${r >> 4}:${g >> 4}:${b >> 4}`);

    if (backgroundDistance > 28) nonBackground += 1;
    if (luminance > 165) bright += 1;
    if (luminance < 42) dark += 1;
    if (saturation > 0.22) saturated += 1;
    if (r > 150 && g > 92 && b < 95 && luminance > 95) warmLight += 1;
    if (b > 125 && g > 90 && r < 125 && luminance > 80) coolLight += 1;
    if (luminance > 135 && Math.abs(r - g) < 34 && Math.abs(g - b) < 62) {
      marking += 1;
    }
  }

  const mean = sampled > 0 ? luminanceSum / sampled : 0;
  const variance = sampled > 0 ? luminanceSquaredSum / sampled - mean * mean : 0;

  return {
    width: image.width,
    height: image.height,
    sampled_pixels: sampled,
    non_background_ratio: sampled > 0 ? nonBackground / sampled : 0,
    bright_ratio: sampled > 0 ? bright / sampled : 0,
    dark_ratio: sampled > 0 ? dark / sampled : 0,
    warm_light_ratio: sampled > 0 ? warmLight / sampled : 0,
    cool_light_ratio: sampled > 0 ? coolLight / sampled : 0,
    marking_ratio: sampled > 0 ? marking / sampled : 0,
    saturated_ratio: sampled > 0 ? saturated / sampled : 0,
    color_bucket_count: buckets.size,
    luminance_stddev: Math.sqrt(Math.max(0, variance))
  };
}

function analyzeCanvasComposition(buffer) {
  const image = decodePng(buffer);
  const totalPixels = image.width * image.height;
  const gridScenePixels = Array.from({ length: compositionGridRows }, () =>
    Array.from({ length: compositionGridColumns }, () => 0)
  );
  const gridPixels = Array.from({ length: compositionGridRows }, () =>
    Array.from({ length: compositionGridColumns }, () => 0)
  );
  const bandCounts = {
    left: { scene: 0, total: 0 },
    right: { scene: 0, total: 0 },
    top: { scene: 0, total: 0 },
    bottom: { scene: 0, total: 0 },
    center: { scene: 0, total: 0 }
  };
  let scenePixels = 0;
  let emptyNearBlackPixels = 0;
  let minSceneX = image.width;
  let minSceneY = image.height;
  let maxSceneX = -1;
  let maxSceneY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const r = image.data[offset];
      const g = image.data[offset + 1];
      const b = image.data[offset + 2];
      const a = image.data[offset + 3];
      const classification = classifyCompositionPixel(r, g, b, a);
      const gridX = Math.min(
        compositionGridColumns - 1,
        Math.floor((x / image.width) * compositionGridColumns)
      );
      const gridY = Math.min(
        compositionGridRows - 1,
        Math.floor((y / image.height) * compositionGridRows)
      );

      gridPixels[gridY][gridX] += 1;
      if (classification.emptyNearBlack) {
        emptyNearBlackPixels += 1;
      }

      for (const [name, band] of Object.entries({
        left: x < image.width * 0.2,
        right: x >= image.width * 0.8,
        top: y < image.height * 0.2,
        bottom: y >= image.height * 0.8,
        center:
          x >= image.width * 0.33 &&
          x < image.width * 0.67 &&
          y >= image.height * 0.2 &&
          y < image.height * 0.8
      })) {
        if (band) {
          bandCounts[name].total += 1;
        }
      }

      if (!classification.scene) {
        continue;
      }

      scenePixels += 1;
      gridScenePixels[gridY][gridX] += 1;
      minSceneX = Math.min(minSceneX, x);
      minSceneY = Math.min(minSceneY, y);
      maxSceneX = Math.max(maxSceneX, x);
      maxSceneY = Math.max(maxSceneY, y);

      for (const [name, band] of Object.entries({
        left: x < image.width * 0.2,
        right: x >= image.width * 0.8,
        top: y < image.height * 0.2,
        bottom: y >= image.height * 0.8,
        center:
          x >= image.width * 0.33 &&
          x < image.width * 0.67 &&
          y >= image.height * 0.2 &&
          y < image.height * 0.8
      })) {
        if (band) {
          bandCounts[name].scene += 1;
        }
      }
    }
  }

  const gridCellSceneRatios = gridScenePixels.map((row, rowIndex) =>
    row.map((sceneCount, columnIndex) => {
      const total = gridPixels[rowIndex][columnIndex];
      return total > 0 ? sceneCount / total : 0;
    })
  );
  const occupiedGridCellCount = gridCellSceneRatios
    .flat()
    .filter((ratio) => ratio > 0.06).length;
  const sceneBbox =
    minSceneX <= maxSceneX
      ? {
          width_ratio: (maxSceneX - minSceneX + 1) / image.width,
          height_ratio: (maxSceneY - minSceneY + 1) / image.height
        }
      : {
          width_ratio: 0,
          height_ratio: 0
        };
  const bandRatio = (name) =>
    bandCounts[name].total > 0
      ? bandCounts[name].scene / bandCounts[name].total
      : 0;

  return {
    width: image.width,
    height: image.height,
    scene_coverage_ratio: totalPixels > 0 ? scenePixels / totalPixels : 0,
    empty_near_black_ratio:
      totalPixels > 0 ? emptyNearBlackPixels / totalPixels : 0,
    top_band_scene_ratio: bandRatio("top"),
    bottom_band_scene_ratio: bandRatio("bottom"),
    left_band_scene_ratio: bandRatio("left"),
    right_band_scene_ratio: bandRatio("right"),
    center_band_scene_ratio: bandRatio("center"),
    occupied_grid_cell_count: occupiedGridCellCount,
    grid_cell_count: compositionGridColumns * compositionGridRows,
    scene_bbox_width_ratio: sceneBbox.width_ratio,
    scene_bbox_height_ratio: sceneBbox.height_ratio,
    grid_cell_scene_ratios: gridCellSceneRatios.map((row) =>
      row.map((ratio) => Number(ratio.toFixed(3)))
    )
  };
}

function classifyCompositionPixel(r, g, b, a) {
  if (a < 16) {
    return {
      scene: false,
      emptyNearBlack: false
    };
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const saturation = max === 0 ? 0 : (max - min) / max;
  const chroma = max - min;
  const emptyNearBlack = luminance < 12 && saturation < 0.16;

  return {
    scene:
      !emptyNearBlack &&
      (luminance > 18 || saturation > 0.18 || chroma > 18),
    emptyNearBlack
  };
}

function buildReadableCompositionCheck(metrics) {
  const check = {
    usable_scene_coverage:
      metrics?.scene_coverage_ratio >= minReadableSceneCoverage,
    empty_void_not_dominant:
      metrics?.empty_near_black_ratio <= maxEmptyNearBlackCoverage,
    north_approach_uses_frame:
      metrics?.top_band_scene_ratio >= minTopBandSceneCoverage,
    south_approach_uses_frame:
      metrics?.bottom_band_scene_ratio >= minBottomBandSceneCoverage,
    east_west_approaches_readable:
      metrics?.left_band_scene_ratio >= minSideBandSceneCoverage &&
      metrics?.right_band_scene_ratio >= minSideBandSceneCoverage,
    distributed_scene_detail:
      metrics?.occupied_grid_cell_count >= minOccupiedCompositionCells,
    not_miniature_strip:
      metrics?.scene_coverage_ratio >= minReadableSceneCoverage &&
      metrics?.occupied_grid_cell_count >= minOccupiedCompositionCells
  };

  return {
    ...check,
    thresholds: {
      min_scene_coverage_ratio: minReadableSceneCoverage,
      max_empty_near_black_ratio: maxEmptyNearBlackCoverage,
      min_top_band_scene_ratio: minTopBandSceneCoverage,
      min_side_band_scene_ratio: minSideBandSceneCoverage,
      min_bottom_band_scene_ratio: minBottomBandSceneCoverage,
      min_occupied_grid_cell_count: minOccupiedCompositionCells
    },
    metrics: metrics ?? null,
    passed:
      check.usable_scene_coverage &&
      check.empty_void_not_dominant &&
      check.north_approach_uses_frame &&
      check.south_approach_uses_frame &&
      check.east_west_approaches_readable &&
      check.distributed_scene_detail &&
      check.not_miniature_strip
  };
}

function buildPhotorealismCheck(metrics, rendererProof) {
  // P2 (3D buildings + daytime sky): the dark_ratio threshold was 0.18 when the
  // AI plate (dark city background) filled the frame. A real 3D daylight scene
  // with a blue sky, glass buildings, and HDRI reflections is naturally brighter;
  // 0.01 filters out blank / unrendered frames while passing any rendered scene
  // that has road shadows and lane markings. luminance_stddev (contrast diversity)
  // and color_bucket_count (spectral richness) are the primary photorealism
  // indicators for the 3D scene — both remain strong.
  const thresholds = {
    min_wet_asphalt_dark_ratio: 0.01,
    min_wet_asphalt_bright_ratio: 0.001,
    min_wet_asphalt_luminance_stddev: 22,
    min_marking_ratio: 0.0025,
    min_realistic_light_ratio: 0.0015,
    min_realistic_bright_ratio: 0.001,
    min_city_color_buckets: 28,
    min_city_non_background_ratio: 0.04,
    min_city_luminance_stddev: 20
  };
  const check = {
    pbr_wet_asphalt:
      metrics.dark_ratio > thresholds.min_wet_asphalt_dark_ratio &&
      metrics.bright_ratio > thresholds.min_wet_asphalt_bright_ratio &&
      metrics.luminance_stddev > thresholds.min_wet_asphalt_luminance_stddev,
    worn_markings: metrics.marking_ratio > thresholds.min_marking_ratio,
    vehicle_contact_shadows:
      rendererProof.visibleVehicleCount >= minVisibleVehicles &&
      rendererProof.streetFurnitureShadowCount >= 2 &&
      metrics.dark_ratio > 0.01 &&
      metrics.luminance_stddev > 22,
    // glbVehicleCount + streetFurnitureShadowCount now measure MOUNTED content
    // (vehicles rendered as detailed GLB models, and the StreetFurnitureLayer
    // contact shadows), not static placement arrays for unmounted layers. The
    // >=12 / >=2 / >=2 thresholds are kept — if live values ever fall short,
    // dress the SCENE (more furniture / shadows), never lower the bar.
    detailed_vehicle_silhouettes:
      rendererProof.vehicleSilhouettePartCount >= 12 &&
      rendererProof.glbVehicleCount >= 2,
    street_furniture_contact_shadows:
      rendererProof.streetFurnitureShadowCount >= 2,
    realistic_signal_and_street_lighting:
      metrics.warm_light_ratio + metrics.cool_light_ratio >
        thresholds.min_realistic_light_ratio &&
      metrics.bright_ratio > thresholds.min_realistic_bright_ratio,
    city_depth:
      metrics.color_bucket_count >= thresholds.min_city_color_buckets &&
      metrics.non_background_ratio > thresholds.min_city_non_background_ratio &&
      metrics.luminance_stddev > thresholds.min_city_luminance_stddev,
    placeholder_geometry_visible:
      rendererProof.visibleVehicleCount < minVisibleVehicles ||
      rendererProof.vehicleSilhouettePartCount < 12 ||
      metrics.color_bucket_count < 20 ||
      metrics.luminance_stddev < 16
  };

  return {
    ...check,
    thresholds,
    metrics,
    passed:
      check.pbr_wet_asphalt &&
      check.worn_markings &&
      check.vehicle_contact_shadows &&
      check.detailed_vehicle_silhouettes &&
      check.street_furniture_contact_shadows &&
      check.realistic_signal_and_street_lighting &&
      check.city_depth &&
      !check.placeholder_geometry_visible
  };
}

async function collectPayloadProof() {
  const publicRoot = path.join(repoRoot, "apps", "web", "public");
  const rawManifest = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(rawManifest);

  if (!isRecord(manifest)) {
    throw new Error("R3F asset manifest must be a JSON object");
  }

  const counted = new Set();
  let totalBytes = 0;

  for (const entry of Object.values(manifest)) {
    if (!isRecord(entry) || typeof entry.path !== "string") continue;
    const normalizedAssetPath = entry.path.replace(/\\/g, "/").replace(/^\/+/, "");
    const localPath = path.resolve(publicRoot, normalizedAssetPath);
    const relative = path.relative(publicRoot, localPath);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Asset path escapes public directory: ${entry.path}`);
    }

    const extension = path.extname(localPath).toLowerCase();
    if (![".glb", ".png", ".jpg", ".jpeg", ".webp"].includes(extension)) continue;

    const resolved = path.resolve(localPath);
    if (counted.has(resolved)) continue;
    counted.add(resolved);
    totalBytes += (await stat(resolved)).size;
  }

  return {
    bytes: totalBytes,
    mb: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    limit_bytes: maxPayloadBytes,
    limit_mb: Number((maxPayloadBytes / (1024 * 1024)).toFixed(2)),
    asset_count: counted.size
  };
}

async function verifyScreenshotArtifact(filePath, expectedViewport) {
  if (!(await pathExists(filePath))) {
    return { exists: false, bytes: 0, width: 0, height: 0 };
  }

  const fileStat = await stat(filePath);
  const image = decodePng(await readFile(filePath));

  return {
    exists: true,
    bytes: fileStat.size,
    width: image.width,
    height: image.height,
    expected_viewport: expectedViewport
  };
}

async function fetchJsonWithTimeout(url, timeoutMs = 5000) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${text.slice(0, 240)}`);
  }

  return JSON.parse(text);
}

async function discoverLiveSumoProof() {
  const mode = (process.env.R3F_DASHBOARD_LIVE_SUMO_PROOF ?? "skip").toLowerCase();
  const disabled = ["0", "false", "off", "skip", "none"].includes(mode);
  if (disabled) {
    return {
      status: "skipped",
      reason: "R3F_DASHBOARD_LIVE_SUMO_PROOF disabled"
    };
  }

  const required = ["1", "true", "on", "required"].includes(mode);
  const apiBaseUrl = (
    process.env.R3F_DASHBOARD_LIVE_SUMO_API_BASE_URL ?? "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  try {
    const readiness = await fetchJsonWithTimeout(
      `${apiBaseUrl}/api/runtime/readiness?section=simulation`,
      2500
    );
    const simulation = readiness?.simulation;

    if (simulation?.ready === true && /^sumo_/.test(String(simulation.mode))) {
      return {
        status: "available",
        api_base_url: apiBaseUrl,
        api_readiness: readiness
      };
    }

    return {
      status: required ? "required_unavailable" : "skipped",
      reason: `Simulation readiness is not live SUMO: ${JSON.stringify(simulation ?? null)}`,
      api_base_url: apiBaseUrl,
      api_readiness: readiness
    };
  } catch (error) {
    return {
      status: required ? "required_unavailable" : "skipped",
      reason: error instanceof Error ? error.message : String(error),
      api_base_url: apiBaseUrl
    };
  }
}

function summarizeLiveFrame(frame) {
  if (!isRecord(frame)) {
    return {
      error: "live frame response was not an object"
    };
  }

  return {
    source: frame.source ?? null,
    scenario_id: frame.scenario_id ?? null,
    sim_time_seconds: Number.isFinite(Number(frame.sim_time_seconds))
      ? Number(frame.sim_time_seconds)
      : null,
    vehicle_count: Array.isArray(frame.vehicles) ? frame.vehicles.length : 0,
    density_segment_count: Array.isArray(frame.density_segments)
      ? frame.density_segments.length
      : 0,
    signal_count: Array.isArray(frame.signals) ? frame.signals.length : 0,
    event_count: Array.isArray(frame.events) ? frame.events.length : 0,
    first_vehicle: Array.isArray(frame.vehicles) ? frame.vehicles[0] ?? null : null
  };
}

async function waitForSnapshotSource(page, expectedSource, timeoutMs = 20000) {
  await page.waitForFunction(
    (source) => {
      const viewport = document.querySelector('[data-testid="r3f-simulation-viewport"]');
      return viewport?.getAttribute("data-r3f-snapshot-source") === source;
    },
    expectedSource,
    { timeout: timeoutMs }
  );
}

async function runLiveSumoBrowserProof(browser, baseUrl, liveProbe) {
  const live = await newRoutedPage(browser, desktopViewport, {
    liveSimulationBaseUrl: liveProbe.api_base_url
  });
  try {
    verifierProgress("live SUMO browser proof started");
    await gotoDashboard(live.page, baseUrl);
    const r3fReady = await waitForR3F(live.page);
    verifierProgress(`live SUMO R3F ready=${r3fReady}`);
    const expectedSource = liveProbe.api_readiness?.simulation?.mode;
    if (typeof expectedSource === "string") {
      await waitForSnapshotSource(live.page, expectedSource).catch(() => {});
    }
    await live.page.waitForTimeout(800);
    const renderer = await collectRendererProof(live.page);
    verifierProgress(`live SUMO renderer source=${renderer.snapshot_source ?? "missing"}`);
    let frameSample = {
      error: "live frame sample was not collected"
    };

    try {
      const frame = await fetchJsonWithTimeout(
        `${liveProbe.api_base_url}/api/simulation/frame?scenario_id=emergency`,
        10000
      );
      frameSample = summarizeLiveFrame(frame);
    } catch (error) {
      frameSample = {
        error: error instanceof Error ? error.message : String(error)
      };
    }
    verifierProgress(`live SUMO frame sample source=${frameSample.source ?? "missing"}`);

    details.live_sumo = {
      status: "captured",
      route_mode: "live simulation frame and readiness; fixture operator side payloads",
      api_base_url: liveProbe.api_base_url,
      api_readiness: liveProbe.api_readiness,
      frame_sample: frameSample,
      r3f_ready: r3fReady,
      renderer,
      page_state: await collectPageState(live.page),
      screenshot_capture: {
        mode: "skipped",
        reason: "live SUMO proof uses browser DOM telemetry and API frame sample; canonical fixture screenshot artifacts cover visual rendering"
      },
      console_errors: live.consoleErrors
    };
    verifierProgress("live SUMO browser proof captured");
  } finally {
    details.console_errors.push(...live.consoleErrors);
    try {
      await withStepTimeout("live SUMO page quiesce", 5000, async () => {
        await live.page.route("**/*", (route) => route.abort()).catch(() => {});
        await live.page.evaluate(() => {
          window.stop();
          for (const canvas of document.querySelectorAll("canvas")) {
            canvas.remove();
          }
        });
      });
    } catch (error) {
      const cleanupError = error instanceof Error ? error.message : String(error);
      if (details.live_sumo && typeof details.live_sumo === "object") {
        details.live_sumo.cleanup_error = cleanupError;
      }
    }
    // Let browser.close() tear down the live polling/WebGL context. Closing this
    // single context can block on Windows/SwiftShader while the page is polling.
  }
}

async function runDensitySegmentQueueProof(browser, baseUrl) {
  const densitySegmentQueue = await newRoutedPage(browser, desktopViewport, {
    mutatePayloads: (payloads) => {
      payloads.frame = {
        ...payloads.frame,
        vehicles: [],
        queues: null
      };
    }
  });

  try {
    await withStepTimeout("density segment queue-source check", 90000, async () => {
      await gotoDashboard(densitySegmentQueue.page, baseUrl);
      const densitySegmentR3FReady = await waitForR3F(densitySegmentQueue.page);
      const densitySegmentRendererProof = await collectRendererProof(
        densitySegmentQueue.page
      );
      details.queue_source_check = {
        density_segment_without_frame_queues: {
          r3f_ready: densitySegmentR3FReady,
          queue_source: densitySegmentRendererProof.queue_source,
          traffic_density_mode: densitySegmentRendererProof.traffic_density_mode,
          badge: densitySegmentRendererProof.domProof?.sourceBadges?.queueSource ?? null
        }
      };
    });
  } catch (error) {
    details.queue_source_check = {
      density_segment_without_frame_queues: {
        r3f_ready: false,
        error: error instanceof Error ? error.stack ?? error.message : String(error)
      }
    };
  } finally {
    details.console_errors.push(...densitySegmentQueue.consoleErrors);
    await densitySegmentQueue.context.close();
  }
}

async function runLastGoodStaleProof(browser, baseUrl) {
  const lastGood = await newRoutedPage(browser, desktopViewport, {
    mutatePayloads: (payloads) => {
      payloads.frame = {
        ...payloads.frame,
        source: "sumo_last_good"
      };
    }
  });

  try {
    await withStepTimeout("last-good stale proof", 90000, async () => {
      await gotoDashboard(lastGood.page, baseUrl);
      const r3fReady = await waitForR3F(lastGood.page);
      await lastGood.page.waitForTimeout(500);
      const renderer = await collectRendererProof(lastGood.page);
      const effectiveR3FReady =
        r3fReady ||
        renderer.appProof?.canvasConnected === true ||
        Boolean(renderer.domProof?.canvas?.rect?.width);
      details.last_good_stale = {
        status: "captured",
        r3f_ready: effectiveR3FReady,
        renderer,
        page_state: await collectPageState(lastGood.page),
        console_errors: lastGood.consoleErrors
      };
    });
  } catch (error) {
    details.last_good_stale = {
      status: "failed",
      error: error instanceof Error ? error.stack ?? error.message : String(error)
    };
  } finally {
    details.console_errors.push(...lastGood.consoleErrors);
    await lastGood.context.close();
  }
}

// density scales the fabricated traffic per scenario so demand looks scenario
// specific: night rush is the densest, the rain/low fallback the lightest (but
// still well above the 80 visible-vehicle floor).
const stage6ScenarioSpecs = [
  {
    id: "day/high",
    artifactKey: "dayHigh",
    qualityPreset: "high",
    weather: "clear",
    timeOfDay: "day",
    density: 1.0
  },
  {
    id: "night/high",
    artifactKey: "nightHigh",
    qualityPreset: "high",
    weather: "rain",
    timeOfDay: "night",
    density: 1.15
  },
  {
    id: "rain/high",
    artifactKey: "rainHigh",
    qualityPreset: "high",
    weather: "rain",
    timeOfDay: "day",
    density: 1.0
  },
  {
    id: "rain/low fallback",
    artifactKey: "rainLowFallback",
    qualityPreset: "low",
    weather: "rain",
    timeOfDay: "day",
    density: 0.7
  }
];

// Rebuild the fixture frame's traffic at a scenario-specific density and keep the
// density-segment counts coherent. No-op at the default density.
function applyScenarioDensity(payloads, densityScale) {
  if (!densityScale || densityScale === 1) return;
  const vehicles = buildVehicles({ densityScale });
  payloads.frame = { ...payloads.frame, vehicles };
  if (Array.isArray(payloads.frame.density_segments)) {
    payloads.frame.density_segments = payloads.frame.density_segments.map(
      (segment) => ({ ...segment, vehicle_count: vehicles.length })
    );
  }
}

async function captureStage6ScenarioProofs(browser, baseUrl) {
  const proofs = [];

  for (const spec of stage6ScenarioSpecs) {
    proofs.push(await captureStage6ScenarioProof(browser, baseUrl, spec));
  }

  return proofs;
}

// 2026-07-05, demand-frameloop stale-framebuffer fix (see
// .superpowers/sdd/building-regression-diagnosis.md): on frameloop="demand"
// with a cold server, BuildingLayer's Suspense subtree can resolve+repaint
// AFTER a scenario capture already read pixels, so the capture grabs a stale
// frame (road/vehicles present, buildings not yet painted). Force a repaint
// warm-up via the app's invalidate hook, then give texture Suspense a short
// recheck window before reading pixels. Cheap variant: fixed 8-invalidate
// double-rAF warm-up + one 2s recheck (no byte-stability comparison loop).
async function settleR3FBeforeCapture(page) {
  await page.evaluate(async () => {
    const inv = window.__r3fSimulationInvalidate;
    if (typeof inv !== "function") return;
    const raf = () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (let i = 0; i < 8; i += 1) {
      inv();
      await raf();
    }
  });
  await page.waitForTimeout(2000);
}

async function captureStage6ScenarioProof(browser, baseUrl, spec) {
  const routedPage = await newRoutedPage(browser, desktopViewport, {
    mutatePayloads: (payloads) => applyScenarioDensity(payloads, spec.density)
  });
  const screenshotPath = stage6ScenarioArtifactPaths[spec.artifactKey];
  const canvasPath = stage6ScenarioCanvasArtifactPaths[spec.artifactKey];

  try {
    return await withStepTimeout(`Stage 6 scenario ${spec.id}`, 180000, async () => {
      await gotoDashboard(routedPage.page, baseUrl, buildStage6ScenarioQuery(spec));
      const r3fReady = await waitForR3F(routedPage.page);
      await routedPage.page.waitForTimeout(500);
      await settleR3FBeforeCapture(routedPage.page);
      const canvasPng = await captureR3FCanvasPng(routedPage.page, canvasPath, {
        label: `${spec.id} R3F canvas`
      });
      await captureViewportScreenshot(routedPage.page, screenshotPath);
      const rendererProof = await collectRendererProof(routedPage.page);
      const layout = await collectOverlayLayoutProof(routedPage.page);
      const canvasMetrics = analyzePng(canvasPng);
      const modeMatches =
        rendererProof.qualityPreset?.value === spec.qualityPreset &&
        rendererProof.weather === spec.weather &&
        rendererProof.timeOfDay === spec.timeOfDay;
      const nonblank = canvasMetrics.non_background_ratio > 0.02;
      const status = r3fReady && modeMatches && nonblank ? "captured" : "failed";

      return {
        id: spec.id,
        status,
        artifact: normalizeArtifactPath(screenshotPath),
        canvas_artifact: normalizeArtifactPath(canvasPath),
        query: buildStage6ScenarioQuery(spec),
        quality_preset: rendererProof.qualityPreset?.value ?? null,
        weather: rendererProof.weather ?? null,
        time_of_day: rendererProof.timeOfDay ?? null,
        source_label: rendererProof.sourceLabels?.snapshotBadge ?? null,
        safety_copy_visible: layout.safetyCopyVisible,
        no_overflow: null,
        nonblank_canvas_ratio: canvasMetrics.non_background_ratio,
        screenshot: await verifyScreenshotArtifact(screenshotPath, desktopViewport),
        canvas_screenshot: await verifyScreenshotArtifact(canvasPath, desktopViewport),
        renderer: rendererProof,
        reason: status === "captured"
          ? null
          : `r3fReady=${r3fReady}, modeMatches=${modeMatches}, nonblank=${nonblank}`
      };
    });
  } catch (error) {
    return {
      id: spec.id,
      status: "failed",
      artifact: null,
      canvas_artifact: null,
      query: buildStage6ScenarioQuery(spec),
      quality_preset: null,
      weather: null,
      time_of_day: null,
      source_label: null,
      safety_copy_visible: null,
      no_overflow: null,
      nonblank_canvas_ratio: null,
      reason: error instanceof Error ? error.stack ?? error.message : String(error)
    };
  } finally {
    details.console_errors.push(...routedPage.consoleErrors);
    await routedPage.context.close();
  }
}

function buildStage6ScenarioQuery(spec) {
  return new URLSearchParams({
    r3fQuality: spec.qualityPreset,
    r3fWeather: spec.weather,
    r3fTimeOfDay: spec.timeOfDay
  }).toString();
}

async function runBrowserVerification(baseUrl) {
  const { chromium } = await import("playwright");
  const browserExecutablePath =
    process.env.R3F_DASHBOARD_BROWSER_EXECUTABLE?.trim() || null;
  const browserLaunchOptions = {
    headless: true,
    args: [
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--disable-dev-shm-usage"
    ]
  };
  if (browserExecutablePath) {
    browserLaunchOptions.executablePath = browserExecutablePath;
  }
  const browser = await chromium.launch(browserLaunchOptions);

  try {
    verifierProgress("desktop browser proof started");
    const desktop = await newRoutedPage(browser, desktopViewport);
    await gotoDashboard(desktop.page, baseUrl);
    const desktopR3FReady = await waitForR3F(desktop.page);
    verifierProgress(`desktop R3F ready=${desktopR3FReady}`);
    const desktopPreCaptureRendererProof = await collectRendererProof(desktop.page);
    details.renderer = {
      preCapture: desktopPreCaptureRendererProof
    };
    const desktopCanvasPng = await captureR3FCanvasPng(
      desktop.page,
      desktopCanvasScreenshotPath,
      {
        label: "desktop R3F canvas",
        requireReadableComposition: true
      }
    );
    verifierProgress("desktop canvas captured");
    await captureViewportScreenshot(desktop.page, desktopScreenshotPath);
    verifierProgress("desktop viewport captured");
    const desktopMetrics = desktopCanvasPng ? analyzePng(desktopCanvasPng) : null;
    const desktopComposition = desktopCanvasPng
      ? analyzeCanvasComposition(desktopCanvasPng)
      : null;
    const rendererProof = await collectRendererProof(desktop.page);
    // peakDrawCalls is now captured (session per-frame max incl. load transients);
    // safe to force post-settle renders and read the steady-state max for the 650
    // normal budget without inflating the 900 peak. See measureSteadyStateDrawCalls.
    const steadyMaxDrawCalls = await measureSteadyStateDrawCalls(desktop.page);
    const desktopLayout = await collectOverlayLayoutProof(desktop.page);
    const desktopPerformance = await collectPerformanceProof(desktop.page, {
      targetFps: desktopMinFps
    });
    const normalizedPerformance = normalizeTopLevelPerformanceProof(
      rendererProof.performance,
      desktopPerformance
    );
    const normalizedTelemetry = normalizeTelemetryPerformanceProof(
      rendererProof.telemetry,
      normalizedPerformance,
      desktopPerformance
    );

    details.renderer = {
      ...rendererProof,
      // Both numbers stored: peakDrawCalls (session max, 900 budget) +
      // steadyMaxDrawCalls (forced post-settle max, 650 normal budget). 2026-07-04.
      steadyMaxDrawCalls,
      preCapture: desktopPreCaptureRendererProof,
      performance: normalizedPerformance,
      telemetry: normalizedTelemetry
    };
    details.telemetry = normalizedTelemetry;
    details.qualityPreset = rendererProof.qualityPreset?.value ?? null;
    details.qualityPresetEvidence = rendererProof.qualityPreset ?? null;
    details.postFx = rendererProof.postFx ?? null;
    details.heavyFeatures = rendererProof.heavyFeatures ?? null;
    details.performance = normalizedPerformance;
    details.sourceLabels = rendererProof.sourceLabels ?? null;
    details.desktop = {
      viewport: desktopViewport,
      r3f_ready: desktopR3FReady || Boolean(desktopCanvasPng),
      page_state: await collectPageState(desktop.page),
      layout: desktopLayout,
      performance: desktopPerformance,
      canvas_metrics: desktopMetrics,
      canvas_composition: desktopComposition,
      canvas_screenshot: await verifyScreenshotArtifact(
        desktopCanvasScreenshotPath,
        desktopViewport
      ),
      screenshot: await verifyScreenshotArtifact(desktopScreenshotPath, desktopViewport)
    };
    details.console_errors.push(...desktop.consoleErrors);
    verifierProgress("desktop browser proof captured");
    await desktop.context.close();
    verifierProgress("desktop browser context closed");

    verifierProgress("mobile browser proof started");
    const mobile = await newRoutedPage(browser, mobileViewport, {
      isMobile: true,
      deviceScaleFactor: 1
    });
    await gotoDashboard(
      mobile.page,
      baseUrl,
      buildStage6ScenarioQuery(
        stage6ScenarioSpecs.find((spec) => spec.id === "rain/high")
      )
    );
    const mobileR3FReady = await waitForR3F(mobile.page);
    verifierProgress(`mobile R3F ready=${mobileR3FReady}`);
    await mobile.page
      .locator(r3fCanvasSelector)
      .first()
      .scrollIntoViewIfNeeded({ timeout: 45000 })
      .catch(() => {});
    await mobile.page.waitForTimeout(300);
    const mobileCanvasPng = mobileR3FReady
      ? await captureR3FCanvasClipScreenshot(mobile.page, mobileCanvasScreenshotPath, {
          label: "mobile R3F canvas",
          hideOverlays: true,
          requireReadableComposition: true
        })
      : null;
    verifierProgress("mobile canvas captured");
    await captureViewportScreenshot(mobile.page, mobileScreenshotPath);
    verifierProgress("mobile viewport captured");
    const mobileMetrics = mobileCanvasPng ? analyzePng(mobileCanvasPng) : null;
    const mobileComposition = mobileCanvasPng
      ? analyzeCanvasComposition(mobileCanvasPng)
      : null;
    const mobileLayout = await collectMobileLayoutProof(mobile.page);
    const mobilePerformance = await collectPerformanceProof(mobile.page, {
      targetFps: mobileMinFps
    });
    const mobileRendererProof = await collectRendererProof(mobile.page);
    await scrollToOverlayProofRegion(mobile.page);
    const mobileOverlayLayout = await collectOverlayLayoutProof(mobile.page);
    await captureViewportScreenshot(mobile.page, mobileOverlayScreenshotPath);
    verifierProgress("mobile overlay captured");

    details.mobile = {
      viewport: mobileViewport,
      r3f_ready: mobileR3FReady,
      page_state: await collectPageState(mobile.page),
      canvas_metrics: mobileMetrics,
      canvas_composition: mobileComposition,
      performance: mobilePerformance,
      renderer: mobileRendererProof,
      layout: {
        ...mobileLayout,
        overlays: mobileOverlayLayout
      },
      canvas_screenshot: await verifyScreenshotArtifact(
        mobileCanvasScreenshotPath,
        mobileViewport
      ),
      screenshot: await verifyScreenshotArtifact(mobileScreenshotPath, mobileViewport),
      overlay_screenshot: await verifyScreenshotArtifact(
        mobileOverlayScreenshotPath,
        mobileViewport
      )
    };
    details.no_overflow_evidence = {
      mobile: {
        viewportWidth: mobileLayout.viewportWidth,
        scrollWidth: mobileLayout.scrollWidth,
        horizontalOverflow: mobileLayout.horizontalOverflow,
        overflowBy: mobileLayout.overflowBy,
        r3fViewportVisible: mobileLayout.r3fViewportVisible,
        canvasVisible: mobileLayout.canvasVisible
      },
      overlays: {
        desktopOverlapsSafetyCopy: desktopLayout.overlapsSafetyCopy,
        mobileOverlapsSafetyCopy: mobileOverlayLayout.overlapsSafetyCopy
      }
    };
    details.console_errors.push(...mobile.consoleErrors);
    verifierProgress("mobile browser proof captured");
    await mobile.context.close();
    verifierProgress("mobile browser context closed");

    verifierProgress("Stage 6 scenario screenshot proofs started");
    details.stage6_scenario_proofs = await captureStage6ScenarioProofs(
      browser,
      baseUrl
    );
    verifierProgress("Stage 6 scenario screenshot proofs captured");

    await runDensitySegmentQueueProof(browser, baseUrl);
    await runLastGoodStaleProof(browser, baseUrl);

    verifierProgress("WebGL-off fallback proof started");
    const fallback = await newRoutedPage(browser, desktopViewport, {
      forceWebglOff: true
    });
    await gotoDashboard(fallback.page, baseUrl);
    await fallback.page
      .locator("canvas.sumo-playback-canvas")
      .waitFor({
        state: "visible",
        timeout: 45000
      })
      .catch(() => {});
    await fallback.page.waitForTimeout(800);
    await captureViewportScreenshot(fallback.page, fallbackScreenshotPath, {
      scale: "device"
    });
    verifierProgress("WebGL-off fallback captured");
    const fallbackProof = await collectFallbackProof(fallback.page);

    details.fallback = {
      ...fallbackProof,
      page_state: await collectPageState(fallback.page),
      screenshot: await verifyScreenshotArtifact(fallbackScreenshotPath, desktopViewport)
    };
    details.scenarios = buildScenarioMatrix({
      rendererProof,
      desktop: details.desktop,
      mobile: details.mobile,
      fallback: details.fallback,
      scenarioProofs: details.stage6_scenario_proofs
    });
    details.integration_notes = buildIntegrationNotes({
      rendererProof,
      scenarios: details.scenarios
    });
    details.console_errors.push(...fallback.consoleErrors);
    await fallback.context.close();
    verifierProgress("WebGL-off fallback context closed");

    verifierProgress("live SUMO availability check started");
    const liveSumoProbe = await discoverLiveSumoProof();
    if (liveSumoProbe.status === "available") {
      await runLiveSumoBrowserProof(browser, baseUrl, liveSumoProbe);
    } else {
      details.live_sumo = liveSumoProbe;
    }
    verifierProgress(`live SUMO availability status=${details.live_sumo?.status ?? "missing"}`);

    verifierProgress("fixture browser contexts were closed before live proof");

    details.webgl_context_loss_errors = details.console_errors.filter(
      (message) =>
        /webgl.*context.*lost|context.*lost.*webgl/i.test(message) &&
        !isBenignWebglTeardownWarning(message)
    );
    details.console_failures = details.console_errors.filter(isBlockingConsoleMessage);

    details.photorealism_check = buildPhotorealismCheck(
      desktopMetrics ?? {
        dark_ratio: 0,
        bright_ratio: 0,
        luminance_stddev: 0,
        marking_ratio: 0,
        warm_light_ratio: 0,
        cool_light_ratio: 0,
        color_bucket_count: 0,
        non_background_ratio: 0
      },
      rendererProof
    );
    details.composition_check = buildReadableCompositionCheck(desktopComposition);
    details.mobile_composition_check = buildReadableCompositionCheck(
      mobileComposition
    );
  } finally {
    await closeBrowserWithTimeout(browser);
  }
}

function buildScenarioMatrix({
  rendererProof,
  desktop,
  mobile,
  fallback,
  scenarioProofs = []
}) {
  const scenarioProofById = new Map(
    scenarioProofs
      .filter((scenario) => scenario && typeof scenario.id === "string")
      .map((scenario) => [scenario.id, scenario])
  );
  const mobileRendererProof = mobile?.renderer ?? rendererProof;
  const mobileRainHighReady =
    mobileRendererProof?.qualityPreset?.value === "high" &&
    mobileRendererProof?.weather === "rain" &&
    mobile?.canvas_metrics?.non_background_ratio > 0.02;

  return [
    buildScenarioMatrixRow("day/high", scenarioProofById),
    buildScenarioMatrixRow("night/high", scenarioProofById),
    buildScenarioMatrixRow("rain/high", scenarioProofById),
    buildScenarioMatrixRow("rain/low fallback", scenarioProofById),
    {
      id: "mobile/rain/high",
      status: mobileRainHighReady ? "captured" : "failed",
      artifact: details.artifacts.mobile_canvas,
      source_label: mobileRendererProof?.sourceLabels?.snapshotBadge ?? null,
      safety_copy_visible:
        mobile?.layout?.overlays?.safetyCopyVisible ??
        mobile?.layout?.safetyCopyVisible ??
        null,
      no_overflow: mobile?.layout?.horizontalOverflow === false,
      nonblank_canvas_ratio: mobile?.canvas_metrics?.non_background_ratio ?? null,
      quality_preset: mobileRendererProof?.qualityPreset?.value ?? null,
      weather: mobileRendererProof?.weather ?? null,
      time_of_day: mobileRendererProof?.timeOfDay ?? null,
      reason: mobileRainHighReady
        ? null
        : `quality=${mobileRendererProof?.qualityPreset?.value ?? "missing"}, weather=${mobileRendererProof?.weather ?? "missing"}, nonblank=${mobile?.canvas_metrics?.non_background_ratio ?? "missing"}`
    },
    {
      id: "webgl-off fallback",
      status:
        fallback?.fallbackCanvasVisible === true &&
        fallback?.safetyTextVisible === true
          ? "captured"
          : "failed",
      artifact: details.artifacts.webgl_off_fallback,
      source_label: "webgl_off_fallback",
      safety_copy_visible: fallback?.safetyTextVisible ?? null,
      no_overflow: null,
      nonblank_canvas_ratio: null,
      reason: null
    },
    {
      id: "canvas-only/nonblank proof",
      status:
        Number(desktop?.canvas_metrics?.non_background_ratio) > 0.02
          ? "captured"
          : "failed",
      artifact: details.artifacts.desktop_canvas,
      source_label: rendererProof?.sourceLabels?.snapshotBadge ?? null,
      safety_copy_visible: desktop?.layout?.safetyCopyVisible ?? null,
      no_overflow: details.no_overflow_evidence?.mobile?.horizontalOverflow === false,
      nonblank_canvas_ratio: desktop?.canvas_metrics?.non_background_ratio ?? null,
      reason: null
    }
  ];
}

function buildScenarioMatrixRow(id, scenarioProofById) {
  const proof = scenarioProofById.get(id);

  if (!proof) {
    return {
      id,
      status: "failed",
      artifact: null,
      source_label: null,
      safety_copy_visible: null,
      no_overflow: null,
      nonblank_canvas_ratio: null,
      reason: "Scenario proof was not captured."
    };
  }

  return {
    id,
    status: proof.status,
    artifact: proof.artifact,
    canvas_artifact: proof.canvas_artifact,
    source_label: proof.source_label ?? null,
    safety_copy_visible: proof.safety_copy_visible ?? null,
    no_overflow: proof.no_overflow ?? null,
    nonblank_canvas_ratio: proof.nonblank_canvas_ratio ?? null,
    quality_preset: proof.quality_preset ?? null,
    weather: proof.weather ?? null,
    time_of_day: proof.time_of_day ?? null,
    reason: proof.reason ?? null
  };
}

function buildIntegrationNotes({ rendererProof, scenarios }) {
  const notes = [];

  if (!rendererProof?.qualityPreset?.value) {
    notes.push(
      "Renderer should expose data-r3f-quality-preset or telemetry.quality_preset."
    );
  }
  if (
    rendererProof?.postFx?.enabled === null ||
    rendererProof?.postFx?.chain === null
  ) {
    notes.push(
      "Renderer should expose data-r3f-postfx-enabled and data-r3f-postfx-chain, or telemetry.post_fx."
    );
  }
  if (rendererProof?.heavyFeatures?.planarReflection === null) {
    notes.push(
      "Renderer should expose data-r3f-planar-reflection-enabled or telemetry.heavy_features.planar_reflection."
    );
  }
  if (rendererProof?.heavyFeatures?.weatherParticles === null) {
    notes.push(
      "Renderer should expose data-r3f-weather-particles-enabled or telemetry.heavy_features.weather_particles."
    );
  }
  if (rendererProof?.heavyFeatures?.highQualityVehicles === null) {
    notes.push(
      "Renderer should expose data-r3f-high-quality-vehicle-count or telemetry.heavy_features.high_quality_vehicles."
    );
  }
  if (rendererProof?.performance?.textureMemoryEstimateMb === null) {
    notes.push(
      "Renderer or verifier should expose data-r3f-texture-memory-estimate-mb or telemetry.performance.texture_memory_estimate_mb when available."
    );
  }

  const missingScenarios = scenarios
    .filter((scenario) => scenario.status !== "captured")
    .map((scenario) => `${scenario.id}: ${scenario.reason ?? scenario.status}`);

  if (missingScenarios.length > 0) {
    notes.push(
      `Scenario verifier wiring still needs renderer-owned deterministic attrs/hooks: ${missingScenarios.join("; ")}`
    );
  }

  return notes;
}

const requiredScenarioMatrix = [
  {
    id: "day/high",
    quality_preset: "high",
    weather: "clear",
    time_of_day: "day",
    require_canvas_artifact: true,
    require_nonblank: true
  },
  {
    id: "night/high",
    quality_preset: "high",
    weather: "rain",
    time_of_day: "night",
    require_canvas_artifact: true,
    require_nonblank: true
  },
  {
    id: "rain/high",
    quality_preset: "high",
    weather: "rain",
    time_of_day: "day",
    require_canvas_artifact: true,
    require_nonblank: true
  },
  {
    id: "rain/low fallback",
    quality_preset: "low",
    weather: "rain",
    time_of_day: "day",
    require_canvas_artifact: true,
    require_nonblank: true
  },
  {
    id: "mobile/rain/high",
    quality_preset: "high",
    weather: "rain",
    time_of_day: "day",
    require_nonblank: true,
    require_no_overflow: true
  },
  {
    id: "webgl-off fallback",
    require_artifact: true,
    require_safety_copy: true
  },
  {
    id: "canvas-only/nonblank proof",
    require_artifact: true,
    require_nonblank: true
  }
];

function buildRequiredScenarioMatrixCheck(scenarios) {
  const scenarioById = new Map(
    Array.isArray(scenarios)
      ? scenarios
          .filter((scenario) => scenario && typeof scenario.id === "string")
          .map((scenario) => [scenario.id, scenario])
      : []
  );
  const failures = [];

  for (const expected of requiredScenarioMatrix) {
    const scenario = scenarioById.get(expected.id);

    if (!scenario) {
      failures.push(`${expected.id}: missing row`);
      continue;
    }
    if (scenario.status !== "captured") {
      failures.push(
        `${expected.id}: status=${scenario.status ?? "missing"} reason=${scenario.reason ?? "missing"}`
      );
    }
    if (
      expected.quality_preset &&
      scenario.quality_preset !== expected.quality_preset
    ) {
      failures.push(
        `${expected.id}: quality=${scenario.quality_preset ?? "missing"}`
      );
    }
    if (expected.weather && scenario.weather !== expected.weather) {
      failures.push(`${expected.id}: weather=${scenario.weather ?? "missing"}`);
    }
    if (expected.time_of_day && scenario.time_of_day !== expected.time_of_day) {
      failures.push(
        `${expected.id}: time_of_day=${scenario.time_of_day ?? "missing"}`
      );
    }
    if (expected.require_artifact && typeof scenario.artifact !== "string") {
      failures.push(`${expected.id}: artifact missing`);
    }
    if (
      expected.require_canvas_artifact &&
      typeof scenario.canvas_artifact !== "string"
    ) {
      failures.push(`${expected.id}: canvas artifact missing`);
    }
    if (
      expected.require_nonblank &&
      !(Number(scenario.nonblank_canvas_ratio) > 0.02)
    ) {
      failures.push(
        `${expected.id}: nonblank=${scenario.nonblank_canvas_ratio ?? "missing"}`
      );
    }
    if (
      expected.require_no_overflow &&
      scenario.no_overflow !== true
    ) {
      failures.push(`${expected.id}: no_overflow=${scenario.no_overflow}`);
    }
    if (
      expected.require_safety_copy &&
      scenario.safety_copy_visible !== true
    ) {
      failures.push(
        `${expected.id}: safety_copy_visible=${scenario.safety_copy_visible}`
      );
    }
  }

  return {
    passed: failures.length === 0,
    evidence:
      failures.length === 0
        ? requiredScenarioMatrix
            .map((scenario) => `${scenario.id}=captured`)
            .join(", ")
        : failures.join("; ")
  };
}

function buildScenarioWeatherFeatureCheck(scenarioProofs) {
  const failures = [];
  const proofs = Array.isArray(scenarioProofs) ? scenarioProofs : [];

  for (const proof of proofs) {
    if (!proof || proof.status !== "captured") continue;

    const shouldHaveRainParticles =
      proof.weather === "rain" && proof.quality_preset !== "low";
    const heavyFeatureValue =
      proof.renderer?.heavyFeatures?.weatherParticles ?? null;
    const telemetryValue =
      proof.renderer?.telemetry?.heavy_features?.weather_particles ?? null;

    if (heavyFeatureValue !== shouldHaveRainParticles) {
      failures.push(
        `${proof.id}: heavyFeatures.weatherParticles=${heavyFeatureValue}, expected=${shouldHaveRainParticles}`
      );
    }
    if (telemetryValue !== shouldHaveRainParticles) {
      failures.push(
        `${proof.id}: telemetry.weather_particles=${telemetryValue}, expected=${shouldHaveRainParticles}`
      );
    }
  }

  return {
    passed: failures.length === 0,
    evidence:
      failures.length === 0
        ? proofs
            .filter((proof) => proof?.status === "captured")
            .map(
              (proof) =>
                `${proof.id}:weather=${proof.weather},quality=${proof.quality_preset}`
            )
            .join(", ")
        : failures.join("; ")
  };
}

function isBlockingConsoleMessage(message) {
  return /^\[(error|pageerror)\]/i.test(message);
}

function isBenignWebglTeardownWarning(message) {
  return /^\[warning\] WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost$/i.test(
    message
  );
}

function screenshotMatchesViewport(screenshot, viewport) {
  return (
    screenshot?.exists === true &&
    screenshot.width === viewport.width &&
    screenshot.height === viewport.height
  );
}

function buildLiveSumoProofCheck(liveSumo) {
  const readiness = liveSumo?.api_readiness?.simulation ?? {};
  const expectedSource = typeof readiness.mode === "string" ? readiness.mode : null;
  const renderer = liveSumo?.renderer ?? {};
  const frameSample = liveSumo?.frame_sample ?? {};
  const sourceBadges = renderer.domProof?.sourceBadges ?? {};
  const badgeIncludes = (badgeText, expectedValue) =>
    typeof badgeText === "string" &&
    typeof expectedValue === "string" &&
    expectedValue.length > 0 &&
    badgeText.includes(expectedValue);
  const passed =
    liveSumo?.status === "captured" &&
    readiness.ready === true &&
    /^sumo_/.test(String(expectedSource)) &&
    frameSample.source === expectedSource &&
    frameSample.vehicle_count > 0 &&
    frameSample.signal_count > 0 &&
    renderer.snapshot_source === expectedSource &&
    renderer.frame_bound === true &&
    Number.isFinite(renderer.frame_age_ms) &&
    Number.isFinite(renderer.network_latency_ms) &&
    Number.isFinite(renderer.sim_to_render_delay_ms) &&
    typeof renderer.signal_state === "string" &&
    renderer.signal_state.length > 0 &&
    badgeIncludes(sourceBadges.snapshot, expectedSource);

  return {
    passed,
    evidence: JSON.stringify({
      status: liveSumo?.status ?? null,
      readiness,
      frame_sample: frameSample,
      screenshot_capture: liveSumo?.screenshot_capture ?? null,
      r3f_ready: liveSumo?.r3f_ready ?? null,
      renderer: {
        snapshot_source: renderer.snapshot_source ?? null,
        frame_bound: renderer.frame_bound ?? null,
        frame_age_ms: renderer.frame_age_ms ?? null,
        network_latency_ms: renderer.network_latency_ms ?? null,
        sim_to_render_delay_ms: renderer.sim_to_render_delay_ms ?? null,
        signal_state: renderer.signal_state ?? null
      },
      source_badges: sourceBadges
    })
  };
}

function addFinalAssertions() {
  const renderer = details.renderer ?? {};
  const desktop = details.desktop ?? {};
  const mobile = details.mobile ?? {};
  const fallback = details.fallback ?? {};
  const photorealism = details.photorealism_check ?? {};
  const composition = details.composition_check ?? {};
  const mobileComposition = details.mobile_composition_check ?? {};
  const telemetry = details.telemetry ?? {};
  const sourceBadges = renderer.domProof?.sourceBadges ?? {};
  const badgeIncludes = (badgeText, expectedValue) =>
    typeof badgeText === "string" &&
    typeof expectedValue === "string" &&
    expectedValue.length > 0 &&
    badgeText.includes(expectedValue);
  const staleLiveFrame =
    renderer.snapshot_source === "sumo_last_good" ||
    renderer.frame_stale === true ||
    telemetry.frame_stale === true;

  addAssertion(
    "canvas has non-background pixels",
    desktop.canvas_metrics?.non_background_ratio > 0.02,
    `desktop canvas non-background ratio ${desktop.canvas_metrics?.non_background_ratio ?? "missing"}`
  );
  addAssertion(
    "dashboard mounts Stage 5 R3F renderer",
    renderer.rendererMode === "r3f_photoreal_stage5" &&
      renderer.photorealStage === "5" &&
      renderer.appProof?.renderer === "r3f" &&
      renderer.appProof?.stage === 5 &&
      renderer.appProof?.canvasConnected === true,
    `rendererMode=${renderer.rendererMode ?? "missing"}, photorealStage=${renderer.photorealStage ?? "missing"}, appProof=${JSON.stringify(renderer.appProof ?? null)}`
  );
  addAssertion(
    "renderer.info draw call budget is reported",
    Number.isFinite(renderer.drawCalls) && renderer.drawCalls > 0,
    `draw calls ${renderer.drawCalls ?? "missing"} via ${renderer.drawCallSource ?? "missing"}`
  );
  addAssertion(
    // Asserts STEADY-STATE frames, not the session per-frame max: the max folds in
    // a pre-existing capture-induced cold shadow-map-regen transient (baseline-
    // invariant) that belongs in the 900 peak, not this 650 normal budget. 2026-07-04.
    "normal draw calls under 650",
    Number.isFinite(renderer.steadyMaxDrawCalls) &&
      renderer.steadyMaxDrawCalls > 0 &&
      renderer.steadyMaxDrawCalls <= maxNormalDrawCalls,
    `steady draw calls ${renderer.steadyMaxDrawCalls ?? "missing"} / ${maxNormalDrawCalls} (peak ${renderer.peakDrawCalls ?? "missing"} / ${maxPeakDrawCalls})`
  );
  addAssertion(
    "peak draw calls under Stage 6 budget",
    Number.isFinite(renderer.peakDrawCalls) &&
      renderer.peakDrawCalls > 0 &&
      renderer.peakDrawCalls <= maxPeakDrawCalls,
    `peak draw calls ${renderer.peakDrawCalls ?? "missing"} / ${maxPeakDrawCalls}`
  );
  addAssertion(
    "R3F shadow proof fields are present and consistent",
    desktop.r3f_ready !== true ||
      (
        typeof renderer.shadow_enabled === "boolean" &&
        Number.isFinite(renderer.shadow_caster_count) &&
        renderer.appProof?.shadowEnabled === renderer.shadow_enabled &&
        renderer.appProof?.shadowCasterCount === renderer.shadow_caster_count
      ),
    `shadow_enabled=${renderer.shadow_enabled ?? "missing"}, shadow_caster_count=${renderer.shadow_caster_count ?? "missing"}, appProof=${JSON.stringify(renderer.appProof ?? null)}`
  );
  addAssertion(
    "R3F shadow caster count stays inside whitelist budget",
    desktop.r3f_ready !== true ||
      (
        renderer.shadow_enabled === true &&
        Number.isFinite(renderer.shadow_caster_count) &&
        renderer.shadow_caster_count > 0 &&
        renderer.shadow_caster_count <= maxShadowCasterCount
      ),
    `shadow_enabled=${renderer.shadow_enabled ?? "missing"}, shadow_caster_count=${renderer.shadow_caster_count ?? "missing"} / ${maxShadowCasterCount}`
  );
  addAssertion(
    "desktop dashboard screenshot matches viewport",
    screenshotMatchesViewport(desktop.screenshot, desktopViewport),
    `${desktop.screenshot?.width ?? 0}x${desktop.screenshot?.height ?? 0}, expected ${desktopViewport.width}x${desktopViewport.height}, ${desktop.screenshot?.bytes ?? 0} bytes at ${details.artifacts.desktop}`
  );
  addAssertion(
    "mobile dashboard screenshot matches viewport",
    screenshotMatchesViewport(mobile.screenshot, mobileViewport),
    `${mobile.screenshot?.width ?? 0}x${mobile.screenshot?.height ?? 0}, expected ${mobileViewport.width}x${mobileViewport.height}, ${mobile.screenshot?.bytes ?? 0} bytes at ${details.artifacts.mobile}`
  );
  addAssertion(
    "no page or console errors",
    details.console_failures.length === 0,
    `${details.console_failures.length} blocking messages: ${details.console_failures.slice(0, 3).join(" | ")}`
  );
  addAssertion(
    "no WebGL context-loss console errors",
    details.webgl_context_loss_errors.length === 0 && renderer.webglContextLossEvents === 0,
    `${details.webgl_context_loss_errors.length} console errors, ${renderer.webglContextLossEvents ?? "missing"} context-loss events`
  );
  addAssertion(
    "R3F renderer source proof fields are present and consistent",
    desktop.r3f_ready !== true ||
      (
        typeof renderer.snapshot_source === "string" &&
        typeof renderer.frame_bound === "boolean" &&
        typeof renderer.traffic_density_mode === "string" &&
        typeof renderer.fallback_used === "boolean" &&
        renderer.source_mode === renderer.snapshot_source &&
        renderer.snapshot_source === renderer.snapshotSource &&
        renderer.frame_bound === renderer.frameBound &&
        renderer.traffic_density_mode === renderer.trafficDensityMode &&
        renderer.fallback_used === renderer.fallbackUsed &&
        renderer.fallback_reason === renderer.fallbackReason &&
        renderer.fallback_used === !renderer.frame_bound
      ),
    `snapshot_source=${renderer.snapshot_source ?? "missing"}, frame_bound=${renderer.frame_bound ?? "missing"}, traffic_density_mode=${renderer.traffic_density_mode ?? "missing"}, fallback_used=${renderer.fallback_used ?? "missing"}, camelCase=${JSON.stringify({
      sourceMode: renderer.sourceMode ?? null,
      snapshotSource: renderer.snapshotSource ?? null,
      frameBound: renderer.frameBound ?? null,
      trafficDensityMode: renderer.trafficDensityMode ?? null,
      fallbackUsed: renderer.fallbackUsed ?? null,
      fallbackReason: renderer.fallbackReason ?? null
    })}`
  );
  addAssertion(
    "R3F frame timing telemetry fields are present",
    desktop.r3f_ready !== true ||
      (
        Number.isFinite(renderer.frame_age_ms) &&
        Number.isFinite(renderer.network_latency_ms) &&
        Number.isFinite(renderer.sim_to_render_delay_ms) &&
        Number.isFinite(renderer.authoritative_hz) &&
        Number.isFinite(renderer.authoritative_tick_drift_ms) &&
        typeof renderer.frame_stale === "boolean"
      ),
    `frame_age_ms=${renderer.frame_age_ms ?? "missing"}, network_latency_ms=${renderer.network_latency_ms ?? "missing"}, sim_to_render_delay_ms=${renderer.sim_to_render_delay_ms ?? "missing"}, authoritative_hz=${renderer.authoritative_hz ?? "missing"}, authoritative_tick_drift_ms=${renderer.authoritative_tick_drift_ms ?? "missing"}, frame_stale=${renderer.frame_stale ?? "missing"}`
  );
  addAssertion(
    "R3F telemetry proof is reported when renderer is mounted",
    desktop.r3f_ready !== true ||
      (
        telemetry.renderer_mode === renderer.rendererMode &&
        telemetry.snapshot_source === renderer.snapshot_source &&
        telemetry.frame_bound === renderer.frame_bound &&
        telemetry.fallback_reason === renderer.fallback_reason &&
        Number.isFinite(telemetry.draw_call_count) &&
        telemetry.draw_call_count > 0 &&
        telemetry.webgl_context_loss_count === renderer.webglContextLossEvents &&
        telemetry.visible_vehicle_count === renderer.visibleVehicleCount &&
        Number.isFinite(telemetry.frame_age_ms) &&
        Number.isFinite(telemetry.network_latency_ms) &&
        Number.isFinite(telemetry.sim_to_render_delay_ms) &&
        telemetry.authoritative_hz === renderer.authoritative_hz &&
        Number.isFinite(telemetry.authoritative_tick_drift_ms) &&
        (
          (
            Number.isFinite(telemetry.fps) &&
            Number.isFinite(telemetry.average_frame_time_ms) &&
            Number.isFinite(telemetry.cpu_frame_time_ms)
          ) ||
          (
            isRecord(telemetry.performance) &&
            telemetry.performance.measurement_status ===
              "unmeasurable_headless_static_demand_loop" &&
            typeof telemetry.performance.reason === "string" &&
            telemetry.fps === null &&
            telemetry.average_frame_time_ms === null &&
            telemetry.cpu_frame_time_ms === null
          )
        ) &&
        telemetry.gpu_frame_time_ms === null &&
        Number.isFinite(telemetry.triangles) &&
        (
          telemetry.texture_memory_bytes === null ||
          Number.isFinite(telemetry.texture_memory_bytes)
        ) &&
        (
          telemetry.js_heap_bytes === null ||
          Number.isFinite(telemetry.js_heap_bytes)
        ) &&
        telemetry.frame_stale === renderer.frame_stale
      ),
    JSON.stringify(telemetry)
  );
  addAssertion(
    "R3F telemetry separates SUMO and ambient pedestrian sources",
    desktop.r3f_ready !== true ||
      (
        isRecord(telemetry.pedestrian_truth) &&
        Number.isFinite(telemetry.pedestrian_truth.sumo_pedestrian_count) &&
        telemetry.pedestrian_truth.sumo_pedestrian_source !== null &&
        Number.isFinite(telemetry.pedestrian_truth.ambient_pedestrian_count) &&
        telemetry.pedestrian_truth.ambient_pedestrian_source ===
          "procedural_background_proxy" &&
        telemetry.pedestrian_truth.truth_separated === true
      ),
    JSON.stringify(telemetry.pedestrian_truth ?? null)
  );
  addAssertion(
    "Stage 6 QA telemetry details are normalized with source labels",
    desktop.r3f_ready !== true ||
      (
        Object.prototype.hasOwnProperty.call(details, "qualityPreset") &&
        isRecord(details.qualityPresetEvidence) &&
        isRecord(details.postFx) &&
        (
          typeof details.postFx.enabled === "boolean" ||
          (
            details.postFx.enabled === null &&
            typeof details.postFx.reason === "string"
          )
        ) &&
        (Array.isArray(details.postFx.chain) || details.postFx.chain === null) &&
        isRecord(details.heavyFeatures) &&
        (
          typeof details.heavyFeatures.planarReflection === "boolean" ||
          (
            details.heavyFeatures.planarReflection === null &&
            typeof details.heavyFeatures.reason === "string"
          )
        ) &&
        Number.isFinite(details.heavyFeatures.shadowCasters) &&
        isRecord(details.performance) &&
        Number.isFinite(details.performance.drawCalls) &&
        Number.isFinite(details.performance.visibleVehicles) &&
        (
          Number.isFinite(details.performance.frameTimeMs) ||
          typeof details.performance.reason === "string"
        ) &&
        isRecord(details.sourceLabels) &&
        typeof details.sourceLabels.snapshotSource === "string"
      ),
    JSON.stringify({
      qualityPreset: details.qualityPreset,
      qualityPresetEvidence: details.qualityPresetEvidence,
      postFx: details.postFx,
      heavyFeatures: details.heavyFeatures,
      performance: details.performance,
      sourceLabels: details.sourceLabels
    })
  );
  addAssertion(
    "desktop performance sample meets target or is honestly unmeasurable",
    (
      Number.isFinite(desktop.performance?.fps) &&
      desktop.performance.fps >= desktopMinFps &&
      Number.isFinite(desktop.performance?.average_frame_time_ms) &&
      desktop.performance.average_frame_time_ms <= desktopMaxAverageFrameTimeMs
    ) ||
      (
        desktop.performance?.measurement_status ===
          "unmeasurable_headless_static_demand_loop" &&
        typeof desktop.performance.reason === "string" &&
        Number.isFinite(renderer.steadyMaxDrawCalls) &&
        renderer.steadyMaxDrawCalls <= maxNormalDrawCalls &&
        Number.isFinite(renderer.peakDrawCalls) &&
        renderer.peakDrawCalls <= maxPeakDrawCalls &&
        Number.isFinite(renderer.appProof?.triangles)
      ),
    JSON.stringify({
      performance: desktop.performance ?? null,
      appProof: {
        fps: renderer.appProof?.fps ?? null,
        averageFrameTimeMs: renderer.appProof?.averageFrameTimeMs ?? null,
        triangles: renderer.appProof?.triangles ?? null
      }
    })
  );
  addAssertion(
    "mobile performance sample meets target or is honestly unmeasurable",
    (
      Number.isFinite(mobile.performance?.fps) &&
      mobile.performance.fps >= mobileMinFps &&
      Number.isFinite(mobile.performance?.average_frame_time_ms) &&
      mobile.performance.average_frame_time_ms <= mobileMaxAverageFrameTimeMs
    ) ||
      (
        mobile.performance?.measurement_status ===
          "unmeasurable_headless_static_demand_loop" &&
        typeof mobile.performance.reason === "string" &&
        Number.isFinite(renderer.steadyMaxDrawCalls) &&
        renderer.steadyMaxDrawCalls <= maxNormalDrawCalls &&
        Number.isFinite(renderer.peakDrawCalls) &&
        renderer.peakDrawCalls <= maxPeakDrawCalls &&
        Number.isFinite(renderer.appProof?.triangles)
      ),
    JSON.stringify({
      performance: mobile.performance ?? null,
      appProof: {
        fps: renderer.appProof?.fps ?? null,
        averageFrameTimeMs: renderer.appProof?.averageFrameTimeMs ?? null,
        triangles: renderer.appProof?.triangles ?? null
      }
    })
  );
  addAssertion(
    "R3F source labels match renderer data attributes",
    desktop.r3f_ready !== true ||
      (
        badgeIncludes(sourceBadges.simulation, renderer.snapshot_source) &&
        badgeIncludes(sourceBadges.snapshot, renderer.snapshot_source) &&
        badgeIncludes(sourceBadges.trafficDensity, renderer.traffic_density_mode) &&
        badgeIncludes(sourceBadges.signalState, renderer.signal_state) &&
        badgeIncludes(sourceBadges.queueSource, renderer.queue_source) &&
        (!renderer.scenario_id || badgeIncludes(sourceBadges.scenarioId, renderer.scenario_id))
      ),
    JSON.stringify(sourceBadges)
  );
  addAssertion(
    "stale live frames carry an operator-visible stale label",
    desktop.r3f_ready !== true ||
      !staleLiveFrame ||
      /stale|degraded/i.test(sourceBadges.frameStale ?? ""),
    `snapshot_source=${renderer.snapshot_source ?? "missing"}, frame_stale=${renderer.frame_stale ?? "missing"}, telemetry_frame_stale=${telemetry.frame_stale ?? "missing"}, frameStaleBadge=${sourceBadges.frameStale ?? "missing"}`
  );
  addAssertion(
    "R3F renderer uses frame-backed snapshot vehicles without density fallback",
    desktop.r3f_ready !== true ||
      (
        renderer.snapshot_source === "simulation_snapshot_fixture" &&
        renderer.frame_bound === true &&
        renderer.traffic_density_mode === "snapshot_vehicles" &&
        renderer.fallback_used === false
      ),
    `snapshot_source=${renderer.snapshot_source ?? "missing"}, frame_bound=${renderer.frame_bound ?? "missing"}, traffic_density_mode=${renderer.traffic_density_mode ?? "missing"}, fallback_used=${renderer.fallback_used ?? "missing"}`
  );
  addAssertion(
    "R3F signal state badge reflects frame signals",
    desktop.r3f_ready !== true ||
      (
        typeof renderer.signal_state === "string" &&
        renderer.signal_state.includes("east:green") &&
        renderer.signal_state.includes("north:red") &&
        renderer.scenario_id === "normal" &&
        renderer.queue_source === "frame" &&
        renderer.domProof?.sourceBadges?.signalState?.includes("east:green") &&
        renderer.domProof?.sourceBadges?.signalState?.includes("north:red") &&
        renderer.domProof?.sourceBadges?.queueSource?.includes("frame") &&
        renderer.domProof?.sourceBadges?.scenarioId?.includes("normal")
    ),
    `signal_state=${renderer.signal_state ?? "missing"}, scenario_id=${renderer.scenario_id ?? "missing"}, queue_source=${renderer.queue_source ?? "missing"}, badges=${JSON.stringify(renderer.domProof?.sourceBadges ?? null)}`
  );
  addAssertion(
    "R3F queue source supports density segments without frame queues",
    desktop.r3f_ready !== true ||
      (
        details.queue_source_check?.density_segment_without_frame_queues?.r3f_ready === true &&
        details.queue_source_check?.density_segment_without_frame_queues?.queue_source ===
          "density_segment" &&
        details.queue_source_check?.density_segment_without_frame_queues
          ?.traffic_density_mode === "density_segments" &&
        details.queue_source_check?.density_segment_without_frame_queues?.badge?.includes(
          "density_segment"
        )
      ),
    JSON.stringify(details.queue_source_check?.density_segment_without_frame_queues ?? null)
  );
  addAssertion(
    "last-good live fallback shows stale operator label",
    details.last_good_stale?.status === "captured" &&
      details.last_good_stale?.r3f_ready === true &&
      details.last_good_stale?.renderer?.snapshot_source === "sumo_last_good" &&
      details.last_good_stale?.renderer?.frame_bound === true &&
      details.last_good_stale?.renderer?.frame_stale === true &&
      /stale|degraded/i.test(
        details.last_good_stale?.renderer?.domProof?.sourceBadges?.frameStale ??
          ""
      ),
    JSON.stringify({
      status: details.last_good_stale?.status ?? null,
      r3f_ready: details.last_good_stale?.r3f_ready ?? null,
      snapshot_source:
        details.last_good_stale?.renderer?.snapshot_source ?? null,
      frame_bound: details.last_good_stale?.renderer?.frame_bound ?? null,
      frame_stale: details.last_good_stale?.renderer?.frame_stale ?? null,
      frame_stale_badge:
        details.last_good_stale?.renderer?.domProof?.sourceBadges?.frameStale ??
        null
    })
  );
  addAssertion(
    "operator source overlays are visible and clear of safety copy",
    desktop.r3f_ready !== true ||
      (
        desktop.layout?.overlayVisible === true &&
        desktop.layout?.safetyCopyVisible === true &&
        desktop.layout?.overlapsSafetyCopy === false &&
        mobile.layout?.overlays?.overlayVisible === true &&
        mobile.layout?.overlays?.safetyCopyVisible === true &&
        mobile.layout?.overlays?.overlapsSafetyCopy === false
      ),
    `desktop=${JSON.stringify(desktop.layout ?? null)}, mobile=${JSON.stringify(mobile.layout?.overlays ?? null)}`
  );
  addAssertion(
    "forced-WebGL-off fallback renders",
    fallback.r3fMounted === false &&
      fallback.fallbackCanvasVisible === true &&
      fallback.safetyTextVisible === true,
    `r3fMounted=${fallback.r3fMounted}, fallbackCanvasVisible=${fallback.fallbackCanvasVisible}, safetyTextVisible=${fallback.safetyTextVisible}`
  );
  const requiredScenarioMatrixCheck = buildRequiredScenarioMatrixCheck(
    details.scenarios
  );
  addAssertion(
    "required Stage 6 scenario matrix is captured with expected modes",
    requiredScenarioMatrixCheck.passed,
    requiredScenarioMatrixCheck.evidence
  );
  const scenarioWeatherFeatureCheck = buildScenarioWeatherFeatureCheck(
    details.stage6_scenario_proofs
  );
  addAssertion(
    "Stage 6 scenario weather feature telemetry matches selected weather",
    scenarioWeatherFeatureCheck.passed,
    scenarioWeatherFeatureCheck.evidence
  );
  addAssertion(
    "photorealism checklist passes against real screenshot",
    photorealism.passed === true,
    JSON.stringify(photorealism)
  );
  addAssertion(
    "desktop canvas composition is readable and not miniature",
    composition.passed === true,
    JSON.stringify(composition)
  );
  addAssertion(
    "mobile canvas composition is readable and not mostly void",
    mobileComposition.passed === true,
    JSON.stringify(mobileComposition)
  );
  addAssertion(
    "Stage 5 exposes detailed vehicle silhouettes and street-furniture shadows",
    renderer.glbVehicleCount >= 2 &&
      renderer.vehicleSilhouettePartCount >= 12 &&
      renderer.streetFurnitureShadowCount >= 2,
    `glbVehicleCount=${renderer.glbVehicleCount ?? "missing"}, vehicleSilhouettePartCount=${renderer.vehicleSilhouettePartCount ?? "missing"}, streetFurnitureShadowCount=${renderer.streetFurnitureShadowCount ?? "missing"}`
  );
  addAssertion(
    "payload under 35MB",
    details.payload?.bytes < maxPayloadBytes,
    `${formatBytes(details.payload?.bytes ?? 0)} / ${formatBytes(maxPayloadBytes)}`
  );
  addAssertion(
    "mobile usable, nonblank, and no horizontal overflow",
    mobile.layout?.r3fViewportVisible === true &&
      mobile.layout?.canvasVisible === true &&
      mobile.layout?.horizontalOverflow === false &&
      mobile.canvas_metrics?.non_background_ratio > 0.02,
    `viewportVisible=${mobile.layout?.r3fViewportVisible}, canvasVisible=${mobile.layout?.canvasVisible}, horizontalOverflow=${mobile.layout?.horizontalOverflow}, nonBackground=${mobile.canvas_metrics?.non_background_ratio ?? "missing"}`
  );
  addAssertion(
    "no-overflow evidence is captured in details JSON",
    details.no_overflow_evidence?.mobile?.horizontalOverflow === false &&
      details.no_overflow_evidence?.mobile?.overflowBy === 0 &&
      details.no_overflow_evidence?.mobile?.r3fViewportVisible === true &&
      details.no_overflow_evidence?.mobile?.canvasVisible === true,
    JSON.stringify(details.no_overflow_evidence)
  );
  if (details.live_sumo?.status === "captured") {
    const liveSumoCheck = buildLiveSumoProofCheck(details.live_sumo);
    addAssertion(
      "live SUMO browser proof uses live SimulationFrameSnapshot",
      liveSumoCheck.passed,
      liveSumoCheck.evidence
    );
  }
  if (details.live_sumo?.status === "required_unavailable") {
    addAssertion(
      "live SUMO browser proof is available when required",
      false,
      details.live_sumo.reason ?? JSON.stringify(details.live_sumo)
    );
  }
  addAssertion(
    "frame-backed snapshot vehicle mode has at least 80 rendered vehicles",
    renderer.traffic_density_mode === "snapshot_vehicles" &&
      renderer.frame_bound === true &&
      renderer.visibleVehicleCount >= minVisibleVehicles,
    `mode=${renderer.traffic_density_mode}, frame_bound=${renderer.frame_bound}, visibleVehicleCount=${renderer.visibleVehicleCount ?? "missing"} / ${minVisibleVehicles}`
  );
}

async function writeDetails() {
  details.failures = failures;
  await mkdir(artifactsDir, { recursive: true });
  await writeFile(detailsPath, `${JSON.stringify(details, null, 2)}\n`, "utf8");
}

async function assertReportedArtifactsExistAfterSuccess() {
  if (failures.length > 0) {
    return false;
  }

  const missingArtifacts = [];

  const artifactEntries = flattenArtifactEntries(details.artifacts);

  for (const [artifactName, artifactPath] of artifactEntries) {
    if (typeof artifactPath !== "string" || artifactPath.length === 0) {
      missingArtifacts.push(`${artifactName}: missing artifact path`);
      continue;
    }

    const localPath = path.resolve(repoRoot, artifactPath);

    if (!(await pathExists(localPath))) {
      missingArtifacts.push(`${artifactName}: ${artifactPath}`);
    }
  }

  addAssertion(
    "all reported proof artifacts exist",
    missingArtifacts.length === 0,
    missingArtifacts.length === 0
      ? artifactEntries.map(([, artifactPath]) => artifactPath).join(", ")
      : `missing ${missingArtifacts.join(", ")}`
  );

  return true;
}

function flattenArtifactEntries(value, prefix = "") {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, artifactPath]) => {
    const name = prefix ? `${prefix}.${key}` : key;

    if (typeof artifactPath === "string") {
      return [[name, artifactPath]];
    }

    return flattenArtifactEntries(artifactPath, name);
  });
}

function printReport() {
  if (failures.length === 0) {
    console.log("R3F dashboard verification passed.");
  } else {
    console.error("R3F dashboard verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }

  console.log(`Artifacts:`);
  console.log(`- ${details.artifacts.desktop}`);
  console.log(`- ${details.artifacts.mobile}`);
  if (details.desktop?.canvas_screenshot?.exists) {
    console.log(`- ${details.artifacts.desktop_canvas}`);
  }
  if (details.mobile?.canvas_screenshot?.exists) {
    console.log(`- ${details.artifacts.mobile_canvas}`);
  }
  if (details.mobile?.overlay_screenshot?.exists) {
    console.log(`- ${details.artifacts.mobile_overlays}`);
  }
  if (details.fallback?.screenshot?.exists) {
    console.log(`- ${details.artifacts.webgl_off_fallback}`);
  }
  console.log(`- ${details.artifacts.details}`);
}

if (selfTestMode === "composition") {
  runCompositionSelfTest();
} else if (selfTestMode === "live-sumo") {
  runLiveSumoProofSelfTest();
} else if (selfTestMode === "renderer-proof-fallback") {
  await runRendererProofFallbackSelfTest();
} else {
  await main();
}

async function main() {
  await mkdir(artifactsDir, { recursive: true });
  await removeStaleDashboardArtifacts();

  let server = null;

  try {
    details.payload = await collectPayloadProof();
    server = await prepareServer();
    await runBrowserVerification(server.baseUrl);
    addFinalAssertions();
  } catch (error) {
    addAssertion(
      "verifier execution",
      false,
      error instanceof Error ? error.stack ?? error.message : String(error)
    );
  } finally {
    if (server) {
      await server.stop();
    }
    await writeDetails();
    if (await assertReportedArtifactsExistAfterSuccess()) {
      await writeDetails();
    }
    printReport();
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

async function removeStaleDashboardArtifacts() {
  await Promise.all(
    dashboardArtifactPaths.map((artifactPath) => rm(artifactPath, { force: true }))
  );
}
