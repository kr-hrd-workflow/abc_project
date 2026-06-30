#!/usr/bin/env node
// render-traffic-photoreal.mjs
// Renders the PRODUCTION photoreal-plate mode (?photoreal=1) with the realistic
// SUMO-truth traffic fixture (scripts/lib/traffic-fixture.mjs — the same fleet
// the verifier composites) and saves day + night canvas PNGs so the vehicles can
// be inspected ON the photoreal 강남역 plate:
//   <out>/traffic-photoreal-day.png    (?photoreal=1)
//   <out>/traffic-photoreal-night.png  (?photoreal=1&timeofday=night)
//
// Reuses the chromium + server setup pattern from render-plate-guides.mjs.
// Env:
//   R3F_DASHBOARD_BASE_URL          reuse a running server (skip build/start)
//   R3F_DASHBOARD_REUSE_SERVER=true probe localhost:3000/3001/3025
//   TRAFFIC_PHOTOREAL_OUT_DIR       output dir (default: scratchpad or artifacts)

import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildVehicles } from "./lib/traffic-fixture.mjs";
import {
  getFreePort,
  probeServer,
  runCommand,
  stopProcessTree,
  waitForHttpOk
} from "./lib/serverLifecycle.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const webBuildDir = path.join(repoRoot, "apps", "web", ".next");
const outputDir =
  process.env.TRAFFIC_PHOTOREAL_OUT_DIR ??
  path.join(repoRoot, "artifacts", "traffic-photoreal");

const routePath = "/dashboard";
// Viewport is env-driven (default 1440×1000); bump for a high-res facade/quality
// capture — the captured r3f canvas is ~0.63× the viewport width.
const viewport = {
  width: Number(process.env.TRAFFIC_PHOTOREAL_VIEWPORT_W ?? "1440") || 1440,
  height: Number(process.env.TRAFFIC_PHOTOREAL_VIEWPORT_H ?? "1000") || 1000
};
// Higher-res capture for calibration measurement (env-driven; default 1 = prod).
const deviceScaleFactor = Number(process.env.TRAFFIC_PHOTOREAL_DSF ?? "1") || 1;
const r3fCanvasSelector =
  "canvas.r3f-simulation-canvas, .r3f-simulation-canvas canvas";

// Optional extra query appended to every target (e.g. "&calv5=1&calB=north:1.5,1")
// so the v5 lane calibration can be iterated live against a reused server without
// a rebuild. Empty by default → committed production render.
const extraQuery = process.env.TRAFFIC_PHOTOREAL_EXTRA_QUERY ?? "";

// Base scene query — default ?photoreal=1 (committed production render). Override
// with e.g. "?photobash=1" to render the plate-free decal-marking photobash scene.
const baseQuery = process.env.TRAFFIC_PHOTOREAL_BASE_QUERY ?? "?photoreal=1";
const filePrefix = process.env.TRAFFIC_PHOTOREAL_FILE_PREFIX ?? "traffic-photoreal";

const targets = [
  { name: "day", query: `${baseQuery}${extraQuery}`, file: `${filePrefix}-day.png` },
  {
    name: "night",
    query: `${baseQuery}&timeofday=night${extraQuery}`,
    file: `${filePrefix}-night.png`
  }
];

// ── server ───────────────────────────────────────────────────────────────────

const nextEnv = {
  FORCE_COLOR: "0",
  NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8000",
  NEXT_PUBLIC_R3F_SIMULATION_ENABLED: "true",
  NEXT_PUBLIC_SIMULATION_STREAM_URL: " ",
  NEXT_PUBLIC_UNITY_WEBGL_URL: " "
};

async function prepareServer() {
  const providedBaseUrl =
    process.env.R3F_DASHBOARD_BASE_URL ?? process.env.DASHBOARD_BASE_URL;
  if (providedBaseUrl) {
    const baseUrl = providedBaseUrl.replace(/\/+$/, "");
    await waitForHttpOk(`${baseUrl}${routePath}`, 30000);
    return { baseUrl, stop: async () => {} };
  }

  if (process.env.R3F_DASHBOARD_REUSE_SERVER === "true") {
    for (const candidate of [
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3025"
    ]) {
      if (await probeServer(candidate, routePath)) return { baseUrl: candidate, stop: async () => {} };
    }
  }

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const isWin = process.platform === "win32";

  console.log("[traffic-photoreal] building Next.js app…");
  await rm(webBuildDir, { recursive: true, force: true });
  await runCommand({
    command: isWin ? process.env.ComSpec ?? "cmd.exe" : "npm",
    args: isWin
      ? ["/d", "/s", "/c", "npm --workspace apps/web run build"]
      : ["--workspace", "apps/web", "run", "build"],
    env: nextEnv,
    cwd: repoRoot,
    label: "production build",
    timeoutMs: 360000
  });

  const logs = [];
  const serverArgs = isWin
    ? ["/d", "/s", "/c", `npm --workspace apps/web run start -- --hostname 127.0.0.1 --port ${port}`]
    : ["--workspace", "apps/web", "run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)];
  const child = spawn(isWin ? process.env.ComSpec ?? "cmd.exe" : "npm", serverArgs, {
    cwd: repoRoot,
    env: { ...process.env, ...nextEnv },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32"
  });
  const remember = (chunk) => {
    logs.push(String(chunk));
    while (logs.length > 80) logs.shift();
  };
  child.stdout.on("data", remember);
  child.stderr.on("data", remember);
  let exited = false;
  child.on("exit", (code, signal) => {
    exited = true;
    remember(`[server exited code=${code} signal=${signal}]`);
  });
  await waitForHttpOk(`${baseUrl}${routePath}`, 120000);
  if (exited) throw new Error(`Server exited before capture.\n${logs.join("")}`);
  return { baseUrl, stop: () => stopProcessTree(child) };
}

// ── API fixture (verifier-equivalent: east-priority phase + realistic traffic) ─

function buildFixturePayloads() {
  const now = "2026-06-29T00:00:00.000Z";
  const vehicles = buildVehicles();
  const vehicleCount = vehicles.length;
  const queues = { north: 24, south: 22, east: 6, west: 18 };
  const events = [
    {
      id: 1,
      intersection_id: "INT-0001",
      occurred_at: now,
      direction: "east",
      event_type: "emergency_vehicle_approach",
      severity: "critical",
      object_count: vehicleCount,
      ai_summary: "Photoreal-plate render fixture with east emergency approach.",
      recommendation: "Review emergency priority signal simulation.",
      status: "open",
      source: "photoreal_render_fixture"
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
    source: "photoreal_render_fixture"
  };
  const frame = {
    source: "photoreal_render_fixture",
    intersection_id: "INT-0001",
    scenario_id: "photoreal",
    sim_time_seconds: 42,
    captured_at: now,
    bounds_meters: { min_x: -180, max_x: 180, min_y: -180, max_y: 180 },
    vehicles,
    density_segments: ["north", "south", "east", "west"].map((approach) => ({
      segment_id: `${approach}-photoreal-fixture`,
      approach,
      start_meters_from_stop_line: 10,
      end_meters_from_stop_line: 132,
      lane_count: 3,
      vehicle_count: vehicleCount,
      average_speed_mps: 2.4,
      source: "fixture_density_proxy"
    })),
    // East-priority phase (east green, the rest red) — matches the queue/flow
    // assumption baked into buildVehicles so the standing queues read correctly.
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
    simulation: {
      source: "photoreal_render_fixture",
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
    },
    report: {
      id: 1,
      intersection_id: "INT-0001",
      period_start: now,
      period_end: now,
      summary: "Photoreal render fixture report.",
      generated_at: now
    },
    fixtures: [
      {
        fixture_id: "photoreal-render-fixture",
        scenario_id: "photoreal",
        media_type: "virtual_cctv",
        filename: "photoreal-render-fixture.mp4",
        description: "Photoreal plate render fixture.",
        source: "photoreal_render_fixture",
        renderer: "r3f_photoreal_renderer",
        safety_note: "Render fixture only. No real CCTV stream or traffic signal control."
      }
    ],
    runtimeReadiness: {
      vision: { ready: true, mode: "fixture", missing: [], checks: [] },
      simulation: { ready: true, mode: "fixture", missing: [], checks: [] },
      openai: { ready: false, mode: "unavailable", missing: ["OPENAI_API_KEY"], checks: [] },
      pgvector: { ready: true, mode: "database", missing: [], checks: [] }
    },
    frame
  };
}

function installFixtureRoutes(page) {
  const apiHeaders = {
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };
  const payloads = buildFixturePayloads();

  return page.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: apiHeaders, body: "" });
      return;
    }
    const pathname = new URL(request.url()).pathname.replace(/\/+$/, "");
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
        body: JSON.stringify({ detail: `photoreal fixture: unhandled ${pathname}` })
      });
      return;
    }
    await route.fulfill({ status: 200, headers: apiHeaders, body: JSON.stringify(body) });
  });
}

async function waitForCanvas(page) {
  try {
    await page.locator('[data-testid="r3f-simulation-viewport"]').waitFor({
      state: "visible",
      timeout: 60000
    });
    await page.waitForFunction(
      (selector) => {
        const canvas =
          document.querySelector(selector) ??
          window.__r3fSimulationCanvasElement ??
          null;
        if (!(canvas instanceof HTMLCanvasElement)) return false;
        const rect = canvas.getBoundingClientRect();
        return (
          canvas.isConnected &&
          rect.width >= 120 &&
          rect.height >= 120 &&
          canvas.width > 0 &&
          canvas.height > 0
        );
      },
      r3fCanvasSelector,
      { timeout: 60000 }
    );
    await page.waitForTimeout(3500);
    return true;
  } catch (error) {
    console.warn("[traffic-photoreal] waitForCanvas timeout:", error.message);
    return false;
  }
}

async function captureCanvas(page, outputPath) {
  let canvasBuffer = null;
  try {
    const dataUrl = await page.evaluate((selector) => {
      const canvas =
        document.querySelector(selector) ??
        window.__r3fSimulationCanvasElement ??
        null;
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("photoreal canvas not found");
      return canvas.toDataURL("image/png");
    }, r3fCanvasSelector);
    const [, b64] = dataUrl.split(",");
    if (b64) canvasBuffer = Buffer.from(b64, "base64");
  } catch (error) {
    console.warn("[traffic-photoreal] canvas toDataURL failed:", error.message);
  }

  if (!canvasBuffer) {
    const clip = await page.evaluate((selector) => {
      const canvas = document.querySelector(selector);
      if (!(canvas instanceof HTMLCanvasElement)) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.floor(rect.left)),
        y: Math.max(0, Math.floor(rect.top)),
        width: Math.max(1, Math.ceil(rect.right) - Math.max(0, Math.floor(rect.left))),
        height: Math.max(1, Math.ceil(rect.bottom) - Math.max(0, Math.floor(rect.top)))
      };
    }, r3fCanvasSelector);
    canvasBuffer = clip
      ? await page.screenshot({ clip, fullPage: false, scale: "css", timeout: 30000 })
      : await page.screenshot({ fullPage: false, scale: "css", timeout: 30000 });
  }

  await writeFile(outputPath, canvasBuffer);
  console.log(`[traffic-photoreal] saved ${path.relative(repoRoot, outputPath)}`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  console.log("[traffic-photoreal] preparing server…");
  const { baseUrl, stop } = await prepareServer();
  console.log(`[traffic-photoreal] server at ${baseUrl}`);

  const { chromium } = await import("playwright");
  const browserLaunchOptions = {
    headless: true,
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"]
  };
  if (process.env.R3F_DASHBOARD_BROWSER_EXECUTABLE) {
    browserLaunchOptions.executablePath =
      process.env.R3F_DASHBOARD_BROWSER_EXECUTABLE.trim();
  }
  const browser = await chromium.launch(browserLaunchOptions);

  const errors = [];
  try {
    for (const target of targets) {
      console.log(`[traffic-photoreal] capturing ${target.name} (${target.query})…`);
      const ctx = await browser.newContext({ viewport, deviceScaleFactor });
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on("pageerror", (e) => consoleErrors.push(`[pageerror] ${e.message}`));
      await installFixtureRoutes(page);
      await page.goto(`${baseUrl}${routePath}${target.query}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000
      });
      const ready = await waitForCanvas(page);
      if (!ready) console.warn(`[traffic-photoreal] ${target.name} canvas not fully confirmed`);
      await captureCanvas(page, path.join(outputDir, target.file));
      if (consoleErrors.length > 0) {
        console.warn(`[traffic-photoreal] ${target.name} page errors:`, consoleErrors.slice(0, 3).join(" | "));
      }
      await ctx.close();
    }
  } catch (error) {
    errors.push(error);
    console.error("[traffic-photoreal] capture error:", error.message);
  } finally {
    await browser.close().catch(() => {});
    await stop().catch(() => {});
  }

  if (errors.length > 0) {
    console.error("[traffic-photoreal] FAILED");
    process.exitCode = 1;
  } else {
    console.log("[traffic-photoreal] done.");
    for (const target of targets) {
      console.log(`  ${path.relative(repoRoot, path.join(outputDir, target.file))}`);
    }
  }
}

await main();
