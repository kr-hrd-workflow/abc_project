#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const artifactsDir = path.join(repoRoot, "artifacts");
const desktopScreenshotPath = path.join(artifactsDir, "r3f-dashboard-desktop.png");
const mobileScreenshotPath = path.join(artifactsDir, "r3f-dashboard-mobile.png");
const desktopCanvasScreenshotPath = path.join(artifactsDir, "r3f-dashboard-desktop-canvas.png");
const mobileCanvasScreenshotPath = path.join(artifactsDir, "r3f-dashboard-mobile-canvas.png");
const fallbackScreenshotPath = path.join(artifactsDir, "r3f-dashboard-webgl-off.png");
const detailsPath = path.join(artifactsDir, "r3f-dashboard-details.json");
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
const maxDrawCalls = 250;
const maxPayloadBytes = 25 * 1024 * 1024;
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

const details = {
  generated_at: new Date().toISOString(),
  route: routePath,
  server: null,
  artifacts: {
    desktop: normalizeArtifactPath(desktopScreenshotPath),
    mobile: normalizeArtifactPath(mobileScreenshotPath),
    desktop_canvas: normalizeArtifactPath(desktopCanvasScreenshotPath),
    mobile_canvas: normalizeArtifactPath(mobileCanvasScreenshotPath),
    webgl_off_fallback: normalizeArtifactPath(fallbackScreenshotPath),
    details: normalizeArtifactPath(detailsPath)
  },
  renderer: null,
  payload: null,
  desktop: null,
  mobile: null,
  fallback: null,
  console_errors: [],
  console_failures: [],
  webgl_context_loss_errors: [],
  photorealism_check: null,
  composition_check: null,
  mobile_composition_check: null,
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

function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  const serverCommand =
    serverMode === "dev" ? getDevServerCommand(port) : getProductionServerCommand(port);
  const logs = [];
  const stage5Env = {
    FORCE_COLOR: "0",
    NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8000",
    NEXT_PUBLIC_R3F_SIMULATION_ENABLED: "true",
    NEXT_PUBLIC_SIMULATION_STREAM_URL: " ",
    NEXT_PUBLIC_UNITY_WEBGL_URL: " "
  };

  if (serverMode === "production") {
    await runCommand({
      commandSpec: getProductionBuildCommand(),
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
      stdio: ["ignore", "pipe", "pipe"]
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

  child.kill("SIGTERM");
}

function getDevServerCommand(port) {
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec ?? "cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        `npm --workspace apps/web run dev -- --hostname 127.0.0.1 --port ${port}`
      ]
    };
  }

  return {
    command: "npm",
    args: [
      "--workspace",
      "apps/web",
      "run",
      "dev",
      "--",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port)
    ]
  };
}

function getProductionBuildCommand() {
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", "npm --workspace apps/web run build"]
    };
  }

  return {
    command: "npm",
    args: ["--workspace", "apps/web", "run", "build"]
  };
}

function getProductionServerCommand(port) {
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec ?? "cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        `npm --workspace apps/web run start -- --hostname 127.0.0.1 --port ${port}`
      ]
    };
  }

  return {
    command: "npm",
    args: [
      "--workspace",
      "apps/web",
      "run",
      "start",
      "--",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port)
    ]
  };
}

function buildVehicles(count) {
  const types = ["car", "taxi", "bus", "truck"];

  return Array.from({ length: count }, (_, index) => {
    const approachIndex = index % 4;
    const laneIndex = index % 3;
    const spacing = 7 + Math.floor(index / 4) * 6;
    const laneOffset = (laneIndex - 1) * 3.6;
    const vehicleType = index === 0 ? "emergency" : types[index % types.length];

    if (approachIndex === 0) {
      return {
        id: `fixture-north-${index}`,
        vehicle_type: vehicleType,
        lane_id: `north_in_${laneIndex}`,
        x_meters: laneOffset,
        y_meters: -18 - spacing,
        heading_degrees: 0,
        speed_mps: 2.4,
        waiting_seconds: index % 8,
        emergency: vehicleType === "emergency"
      };
    }

    if (approachIndex === 1) {
      return {
        id: `fixture-south-${index}`,
        vehicle_type: vehicleType,
        lane_id: `south_in_${laneIndex}`,
        x_meters: laneOffset,
        y_meters: 18 + spacing,
        heading_degrees: 180,
        speed_mps: 2.8,
        waiting_seconds: index % 7,
        emergency: vehicleType === "emergency"
      };
    }

    if (approachIndex === 2) {
      return {
        id: `fixture-east-${index}`,
        vehicle_type: vehicleType,
        lane_id: `east_in_${laneIndex}`,
        x_meters: 18 + spacing,
        y_meters: laneOffset,
        heading_degrees: 270,
        speed_mps: 3.1,
        waiting_seconds: index % 6,
        emergency: vehicleType === "emergency"
      };
    }

    return {
      id: `fixture-west-${index}`,
      vehicle_type: vehicleType,
      lane_id: `west_in_${laneIndex}`,
      x_meters: -18 - spacing,
      y_meters: laneOffset,
      heading_degrees: 90,
      speed_mps: 2.6,
      waiting_seconds: index % 9,
      emergency: vehicleType === "emergency"
    };
  });
}

function buildFixturePayloads() {
  const now = "2026-06-17T00:00:00.000Z";
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
      object_count: 96,
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
    source: "sumo_traci",
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
    vehicles: buildVehicles(96),
    density_segments: ["north", "south", "east", "west"].map((approach) => ({
      segment_id: `${approach}-dense-fixture`,
      approach,
      start_meters_from_stop_line: 10,
      end_meters_from_stop_line: 132,
      lane_count: 3,
      vehicle_count: 96,
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
    frame
  };
}

async function installApiRoutes(page) {
  const payloads = buildFixturePayloads();

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: apiHeaders, body: "" });
      return;
    }

    const url = new URL(request.url());
    const pathname = url.pathname.replace(/\/+$/, "");
    let body = null;

    if (pathname === "/api/intersection/status") body = payloads.status;
    if (pathname === "/api/events") body = payloads.events;
    if (pathname === "/api/recommend-signal") body = payloads.recommendation;
    if (pathname === "/api/simulate-signal") body = payloads.simulation;
    if (pathname === "/api/report") body = payloads.report;
    if (pathname === "/api/fixtures") body = payloads.fixtures;
    if (pathname === "/api/runtime/readiness") body = payloads.runtimeReadiness;
    if (pathname === "/api/simulation/frame") body = payloads.frame;

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
  await installApiRoutes(page);

  return { context, page, consoleErrors };
}

async function gotoDashboard(page, baseUrl) {
  await page.goto(`${baseUrl}${routePath}`, {
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
    await page.locator(r3fCanvasSelector).first().waitFor({
      state: "attached",
      timeout: 45000
    });
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector(
          "canvas.r3f-simulation-canvas, .r3f-simulation-canvas canvas"
        );
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        return rect.width >= 120 && rect.height >= 120;
      },
      null,
      { timeout: 30000 }
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
  return page.evaluate(() => {
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
    const rendererInfo =
      appProof?.rendererInfo ??
      appProof?.renderer?.info ??
      appProof?.info ??
      null;
    const appProofDrawCalls = Number(appProof?.drawCalls ?? 0);
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
    const drawCalls = Number.isFinite(Number(rendererInfoCalls))
      ? Number(rendererInfoCalls)
      : instrumentedDrawCalls;
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
    const fallbackUsed = Boolean(viewport) && !frameBound;

    return {
      snapshot_source: snapshotSource,
      frame_bound: frameBound,
      traffic_density_mode: trafficDensityMode,
      fallback_used: fallbackUsed,
      rendererMode: viewport?.getAttribute("data-r3f-renderer-mode") ?? null,
      photorealStage: viewport?.getAttribute("data-r3f-photoreal-stage") ?? null,
      snapshotSource,
      frameBound,
      trafficDensityMode,
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
      drawCallSource:
        Number.isFinite(Number(rendererInfoCalls)) && rendererInfoCalls !== null
          ? "renderer.info"
          : "webgl_draw_call_instrumentation",
      rendererInfoReported: Boolean(rendererInfo) || appProof?.renderer === "r3f",
      webglContextLossEvents: contextLossEvents,
      appProof: appProof
        ? {
            renderer: appProof.renderer ?? null,
            stage: appProof.stage ?? null,
            contextLost: appProof.contextLost ?? null,
            contextLossEvents: appProof.contextLossEvents ?? null,
            drawCalls: appProof.drawCalls ?? null,
            canvasWidth: appProof.canvasWidth ?? null,
            canvasHeight: appProof.canvasHeight ?? null,
            canvasConnected: appProof.canvasConnected ?? null,
            drawingBufferWidth: appProof.drawingBufferWidth ?? null,
            drawingBufferHeight: appProof.drawingBufferHeight ?? null
          }
        : null,
      domProof: {
        viewport: readElementProof(viewport),
        wrapper: readElementProof(document.querySelector(".r3f-simulation-canvas")),
        canvas: readElementProof(canvas),
        canvases: Array.from(document.querySelectorAll("canvas")).map((element) =>
          readElementProof(element)
        )
      }
    };
  });
}

async function captureR3FCanvasPng(page, filePath, options = {}) {
  const startedAt = Date.now();
  let lastBuffer = null;
  let lastCompositionCheck = null;
  let attempts = 0;

  while (Date.now() - startedAt <= (options.timeoutMs ?? readableCanvasCaptureTimeoutMs)) {
    attempts += 1;
    lastBuffer = await readR3FCanvasPng(page);

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
    throw new Error("R3F renderer did not produce a canvas readback");
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

async function readR3FCanvasPng(page) {
  const capture = await page.evaluate(() => {
    if (typeof window.__r3fSimulationReadPixels !== "function") {
      throw new Error("R3F renderer readback function was not installed");
    }

    return window.__r3fSimulationReadPixels();
  });
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
  const check = {
    pbr_wet_asphalt:
      metrics.dark_ratio > 0.22 &&
      metrics.bright_ratio > 0.0015 &&
      metrics.luminance_stddev > 24,
    worn_markings: metrics.marking_ratio > 0.0025,
    vehicle_contact_shadows:
      rendererProof.visibleVehicleCount >= minVisibleVehicles &&
      rendererProof.streetFurnitureShadowCount >= 2 &&
      metrics.dark_ratio > 0.18 &&
      metrics.luminance_stddev > 22,
    detailed_vehicle_silhouettes:
      rendererProof.vehicleSilhouettePartCount >= 12 &&
      rendererProof.glbVehicleCount >= 2,
    street_furniture_contact_shadows:
      rendererProof.streetFurnitureShadowCount >= 2,
    realistic_signal_and_street_lighting:
      metrics.warm_light_ratio + metrics.cool_light_ratio > 0.0015 &&
      metrics.bright_ratio > 0.001,
    city_depth:
      metrics.color_bucket_count >= 28 &&
      metrics.non_background_ratio > 0.04 &&
      metrics.luminance_stddev > 20,
    placeholder_geometry_visible:
      rendererProof.visibleVehicleCount < minVisibleVehicles ||
      rendererProof.vehicleSilhouettePartCount < 12 ||
      metrics.color_bucket_count < 20 ||
      metrics.luminance_stddev < 16
  };

  return {
    ...check,
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

async function runBrowserVerification(baseUrl) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--disable-dev-shm-usage"
    ]
  });

  try {
    const desktop = await newRoutedPage(browser, desktopViewport);
    await gotoDashboard(desktop.page, baseUrl);
    const desktopR3FReady = await waitForR3F(desktop.page);
    const desktopPreCaptureRendererProof = await collectRendererProof(desktop.page);
    details.renderer = {
      preCapture: desktopPreCaptureRendererProof
    };
    const desktopCanvasPng = desktopR3FReady
      ? await captureR3FCanvasPng(desktop.page, desktopCanvasScreenshotPath, {
          label: "desktop R3F canvas",
          requireReadableComposition: true
        })
      : null;
    await desktop.page.screenshot({
      path: desktopScreenshotPath,
      fullPage: false,
      scale: "css"
    });
    const desktopMetrics = desktopCanvasPng ? analyzePng(desktopCanvasPng) : null;
    const desktopComposition = desktopCanvasPng
      ? analyzeCanvasComposition(desktopCanvasPng)
      : null;
    const rendererProof = await collectRendererProof(desktop.page);

    details.renderer = {
      ...rendererProof,
      preCapture: desktopPreCaptureRendererProof
    };
    details.desktop = {
      viewport: desktopViewport,
      r3f_ready: desktopR3FReady,
      page_state: await collectPageState(desktop.page),
      canvas_metrics: desktopMetrics,
      canvas_composition: desktopComposition,
      canvas_screenshot: await verifyScreenshotArtifact(
        desktopCanvasScreenshotPath,
        desktopViewport
      ),
      screenshot: await verifyScreenshotArtifact(desktopScreenshotPath, desktopViewport)
    };
    details.console_errors.push(...desktop.consoleErrors);

    const mobile = await newRoutedPage(browser, mobileViewport, {
      isMobile: true,
      deviceScaleFactor: 2
    });
    await gotoDashboard(mobile.page, baseUrl);
    const mobileR3FReady = await waitForR3F(mobile.page);
    const mobileCanvasPng = mobileR3FReady
      ? await captureR3FCanvasPng(mobile.page, mobileCanvasScreenshotPath, {
          label: "mobile R3F canvas",
          requireReadableComposition: true
        })
      : null;
    await mobile.page.screenshot({
      path: mobileScreenshotPath,
      fullPage: false,
      scale: "css"
    });
    const mobileMetrics = mobileCanvasPng ? analyzePng(mobileCanvasPng) : null;
    const mobileComposition = mobileCanvasPng
      ? analyzeCanvasComposition(mobileCanvasPng)
      : null;
    const mobileLayout = await collectMobileLayoutProof(mobile.page);

    details.mobile = {
      viewport: mobileViewport,
      r3f_ready: mobileR3FReady,
      page_state: await collectPageState(mobile.page),
      canvas_metrics: mobileMetrics,
      canvas_composition: mobileComposition,
      layout: mobileLayout,
      canvas_screenshot: await verifyScreenshotArtifact(
        mobileCanvasScreenshotPath,
        mobileViewport
      ),
      screenshot: await verifyScreenshotArtifact(mobileScreenshotPath, mobileViewport)
    };
    details.console_errors.push(...mobile.consoleErrors);

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
    await fallback.page.screenshot({
      path: fallbackScreenshotPath,
      fullPage: false
    });
    const fallbackProof = await collectFallbackProof(fallback.page);

    details.fallback = {
      ...fallbackProof,
      page_state: await collectPageState(fallback.page),
      screenshot: await verifyScreenshotArtifact(fallbackScreenshotPath, desktopViewport)
    };
    details.console_errors.push(...fallback.consoleErrors);

    await desktop.context.close();
    await mobile.context.close();
    await fallback.context.close();

    details.webgl_context_loss_errors = details.console_errors.filter((message) =>
      /webgl.*context.*lost|context.*lost.*webgl/i.test(message)
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
    await browser.close();
  }
}

function isBlockingConsoleMessage(message) {
  return /^\[(error|pageerror)\]/i.test(message);
}

function screenshotMatchesViewport(screenshot, viewport) {
  return (
    screenshot?.exists === true &&
    screenshot.width === viewport.width &&
    screenshot.height === viewport.height
  );
}

function addFinalAssertions() {
  const renderer = details.renderer ?? {};
  const desktop = details.desktop ?? {};
  const mobile = details.mobile ?? {};
  const fallback = details.fallback ?? {};
  const photorealism = details.photorealism_check ?? {};
  const composition = details.composition_check ?? {};
  const mobileComposition = details.mobile_composition_check ?? {};

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
    "draw calls under 250",
    Number.isFinite(renderer.drawCalls) &&
      renderer.drawCalls > 0 &&
      renderer.drawCalls < maxDrawCalls,
    `draw calls ${renderer.drawCalls ?? "missing"} / ${maxDrawCalls}`
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
        renderer.snapshot_source === renderer.snapshotSource &&
        renderer.frame_bound === renderer.frameBound &&
        renderer.traffic_density_mode === renderer.trafficDensityMode &&
        renderer.fallback_used === renderer.fallbackUsed &&
        renderer.fallback_used === !renderer.frame_bound
      ),
    `snapshot_source=${renderer.snapshot_source ?? "missing"}, frame_bound=${renderer.frame_bound ?? "missing"}, traffic_density_mode=${renderer.traffic_density_mode ?? "missing"}, fallback_used=${renderer.fallback_used ?? "missing"}, camelCase=${JSON.stringify({
      snapshotSource: renderer.snapshotSource ?? null,
      frameBound: renderer.frameBound ?? null,
      trafficDensityMode: renderer.trafficDensityMode ?? null,
      fallbackUsed: renderer.fallbackUsed ?? null
    })}`
  );
  addAssertion(
    "R3F renderer uses frame-backed simulation snapshot",
    desktop.r3f_ready !== true ||
      (
        renderer.snapshot_source === "simulation_snapshot_fixture" &&
        renderer.frame_bound === true &&
        renderer.traffic_density_mode === "density_segments" &&
        renderer.fallback_used === false
      ),
    `snapshot_source=${renderer.snapshot_source ?? "missing"}, frame_bound=${renderer.frame_bound ?? "missing"}, traffic_density_mode=${renderer.traffic_density_mode ?? "missing"}, fallback_used=${renderer.fallback_used ?? "missing"}`
  );
  addAssertion(
    "forced-WebGL-off fallback renders",
    fallback.r3fMounted === false &&
      fallback.fallbackCanvasVisible === true &&
      fallback.safetyTextVisible === true,
    `r3fMounted=${fallback.r3fMounted}, fallbackCanvasVisible=${fallback.fallbackCanvasVisible}, safetyTextVisible=${fallback.safetyTextVisible}`
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
    "payload under 25MB",
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
    "frame-backed density mode has at least 80 rendered vehicles",
    renderer.traffic_density_mode === "density_segments" &&
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
  if (details.fallback?.screenshot?.exists) {
    console.log(`- ${details.artifacts.webgl_off_fallback}`);
  }
  console.log(`- ${details.artifacts.details}`);
}

if (selfTestMode === "composition") {
  runCompositionSelfTest();
} else {
  await main();
}

async function main() {
  await mkdir(artifactsDir, { recursive: true });

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
    printReport();
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}
