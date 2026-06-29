#!/usr/bin/env node
// render-plate-guides.mjs
// Captures two structural-guide PNGs from the R3F scene with ?guide=1:
//   artifacts/plate-guides/wide-structural-guide.png   (operator-wide camera)
//   artifacts/plate-guides/cctv-structural-guide.png   (operator-cctv camera)
// These are conditioning inputs for plate image generation (SP2 Task A1).
//
// Reuses the same chromium launch + server setup as verify-r3f-dashboard.mjs.
// Usage:
//   node scripts/render-plate-guides.mjs
// Env overrides (same as verify script):
//   R3F_DASHBOARD_BASE_URL   — reuse a running server (skip build/start)
//   R3F_DASHBOARD_REUSE_SERVER=true  — probe localhost:3000/3001/3025

import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const outputDir = path.join(repoRoot, "artifacts", "plate-guides");
const wideGuidePath = path.join(outputDir, "wide-structural-guide.png");
const cctvGuidePath = path.join(outputDir, "cctv-structural-guide.png");

const routePath = "/dashboard";
// 1536×1024 — the target plate dimensions and guide output size.
const guideViewport = { width: 1536, height: 1024 };
const r3fCanvasSelector =
  "canvas.r3f-simulation-canvas, .r3f-simulation-canvas canvas";

// ── server ───────────────────────────────────────────────────────────────────

const nextEnv = {
  FORCE_COLOR: "0",
  NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8000",
  NEXT_PUBLIC_R3F_SIMULATION_ENABLED: "true",
  NEXT_PUBLIC_SIMULATION_STREAM_URL: " ",
  NEXT_PUBLIC_UNITY_WEBGL_URL: " "
};

async function prepareServer() {
  const providedBaseUrl = process.env.R3F_DASHBOARD_BASE_URL ?? process.env.DASHBOARD_BASE_URL;
  if (providedBaseUrl) {
    const baseUrl = providedBaseUrl.replace(/\/+$/, "");
    await waitForHttpOk(`${baseUrl}${routePath}`, 30000);
    return { baseUrl, stop: async () => {} };
  }

  if (process.env.R3F_DASHBOARD_REUSE_SERVER === "true") {
    for (const candidate of ["http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3025"]) {
      if (await probeServer(candidate, routePath)) return { baseUrl: candidate, stop: async () => {} };
    }
  }

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const isWin = process.platform === "win32";

  // Build first
  console.log("[plate-guides] building Next.js app…");
  await rm(webBuildDir, { recursive: true, force: true });
  if (isWin) {
    await runCommand({
      command: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", "npm --workspace apps/web run build"],
      env: nextEnv,
      cwd: repoRoot,
      label: "production build",
      timeoutMs: 300000
    });
  } else {
    await runCommand({
      command: "npm",
      args: ["--workspace", "apps/web", "run", "build"],
      env: nextEnv,
      cwd: repoRoot,
      label: "production build",
      timeoutMs: 300000
    });
  }

  // Start server
  const logs = [];
  const serverArgs = isWin
    ? ["/d", "/s", "/c", `npm --workspace apps/web run start -- --hostname 127.0.0.1 --port ${port}`]
    : ["--workspace", "apps/web", "run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)];
  const child = spawn(isWin ? (process.env.ComSpec ?? "cmd.exe") : "npm", serverArgs, {
    cwd: repoRoot,
    env: { ...process.env, ...nextEnv },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32"
  });
  const remember = (chunk) => { logs.push(String(chunk)); while (logs.length > 80) logs.shift(); };
  child.stdout.on("data", remember);
  child.stderr.on("data", remember);
  let exited = false;
  child.on("exit", (code, signal) => { exited = true; remember(`[server exited code=${code} signal=${signal}]`); });
  await waitForHttpOk(`${baseUrl}${routePath}`, 120000);
  if (exited) throw new Error(`Server exited before guide capture.\n${logs.join("")}`);
  return { baseUrl, stop: () => stopProcessTree(child) };
}

// ── browser + API fixture ─────────────────────────────────────────────────────

function buildFixturePayloads() {
  const now = "2026-06-27T00:00:00.000Z";
  const queues = { north: 0, south: 0, east: 0, west: 0 };
  const events = [];
  const status = {
    intersection_id: "INT-0001",
    captured_at: now,
    signal_phase: "guide",
    cycle_second: 0,
    queues,
    pedestrian_request: false,
    emergency_priority: false,
    congestion_level: "low",
    source: "guide_render_fixture"
  };
  const frame = {
    source: "guide_render_fixture",
    intersection_id: "INT-0001",
    scenario_id: "guide",
    sim_time_seconds: 0,
    captured_at: now,
    bounds_meters: { min_x: -180, max_x: 180, min_y: -180, max_y: 180 },
    vehicles: [],
    density_segments: [],
    signals: ["north", "south", "east", "west"].map((direction) => ({
      signal_id: `${direction}-main`,
      direction,
      state: "red",
      seconds_remaining: 30
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
      action: "guide",
      recommended_plan: { east: 30, north: 25, south: 25, west: 20 },
      evidence: { reason: "guide_render" },
      safety_boundary:
        "Recommendation and simulation only. No real traffic signal control is performed.",
      status: "draft"
    },
    simulation: {
      source: "guide_render_fixture",
      baseline: { average_wait_seconds: 60, total_delay_seconds: 100, throughput: 1800, emergency_vehicle_clearance_seconds: 30 },
      recommended: { average_wait_seconds: 50, total_delay_seconds: 85, throughput: 2000, emergency_vehicle_clearance_seconds: 20 },
      improvement: { average_wait_percent: -17, total_delay_percent: -15, throughput_percent: 11, emergency_vehicle_clearance_percent: -33 }
    },
    report: {
      id: 1,
      intersection_id: "INT-0001",
      period_start: now,
      period_end: now,
      summary: "Guide render fixture report.",
      generated_at: now
    },
    fixtures: [{
      fixture_id: "guide-render-fixture",
      scenario_id: "guide",
      media_type: "virtual_cctv",
      filename: "guide-render-fixture.mp4",
      description: "Plate guide render fixture.",
      source: "guide_render_fixture",
      renderer: "r3f_guide_renderer",
      safety_note: "Guide render fixture only. No real CCTV stream or traffic signal control."
    }],
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
  // Full fixture routes matching verify-r3f-dashboard.mjs so the dashboard
  // initialises completely and mounts the R3F canvas.
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
        body: JSON.stringify({ detail: `guide fixture: unhandled ${pathname}` })
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
    // Let R3F render a few frames so the structural guide is fully painted.
    await page.waitForTimeout(3000);
    return true;
  } catch (error) {
    console.warn("[plate-guides] waitForCanvas timeout:", error.message);
    return false;
  }
}

// Scale canvas PNG (any size) to 1536×1024, letterboxed on a dark background.
// Uses the sharp module (already a project dependency) for high-quality resize.
async function scaleToTarget(inputBuffer, targetW, targetH) {
  const sharpMod = (await import("/home/chan/abc_project/node_modules/sharp/lib/index.js")).default;
  return sharpMod(inputBuffer)
    .resize(targetW, targetH, {
      fit: "contain",
      background: { r: 34, g: 34, b: 42, alpha: 1 }
    })
    .png()
    .toBuffer();
}

async function captureCanvas(page, outputPath) {
  // Read raw canvas pixels via toDataURL — this gives the native WebGL canvas
  // content at whatever size the R3F renderer is running at.
  let canvasBuffer = null;
  try {
    const dataUrl = await page.evaluate((selector) => {
      const canvas =
        document.querySelector(selector) ??
        window.__r3fSimulationCanvasElement ??
        null;
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("guide canvas not found");
      return canvas.toDataURL("image/png");
    }, r3fCanvasSelector);
    const [, b64] = dataUrl.split(",");
    if (b64) canvasBuffer = Buffer.from(b64, "base64");
  } catch (error) {
    console.warn("[plate-guides] canvas toDataURL failed:", error.message);
  }

  // Fallback: screenshot clipped to the canvas element rect.
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
    if (clip) {
      canvasBuffer = await page.screenshot({ clip, fullPage: false, scale: "css", timeout: 30000 });
    } else {
      canvasBuffer = await page.screenshot({ fullPage: false, scale: "css", timeout: 30000 });
    }
  }

  // Scale canvas content to 1536×1024 (target plate dimensions) with dark
  // letterboxing so the output matches the plate format exactly.
  let finalBuffer = canvasBuffer;
  try {
    finalBuffer = await scaleToTarget(canvasBuffer, 1536, 1024);
  } catch (error) {
    console.warn("[plate-guides] scale failed, saving native size:", error.message);
  }

  await writeFile(outputPath, finalBuffer);
  console.log(`[plate-guides] saved ${path.relative(repoRoot, outputPath)}`);
  return finalBuffer;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(outputDir, { recursive: true });
  console.log("[plate-guides] preparing server…");
  const { baseUrl, stop } = await prepareServer();
  console.log(`[plate-guides] server at ${baseUrl}`);

  const { chromium } = await import("playwright");
  const browserLaunchOptions = {
    headless: true,
    args: [
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--disable-dev-shm-usage"
    ]
  };
  if (process.env.R3F_DASHBOARD_BROWSER_EXECUTABLE) {
    browserLaunchOptions.executablePath =
      process.env.R3F_DASHBOARD_BROWSER_EXECUTABLE.trim();
  }
  const browser = await chromium.launch(browserLaunchOptions);

  const errors = [];
  try {
    // ── wide guide ────────────────────────────────────────────────────────
    console.log("[plate-guides] capturing wide structural guide…");
    const wideCtx = await browser.newContext({ viewport: guideViewport });
    const widePage = await wideCtx.newPage();
    await installFixtureRoutes(widePage);
    await widePage.goto(`${baseUrl}${routePath}?guide=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    const wideReady = await waitForCanvas(widePage);
    if (!wideReady) console.warn("[plate-guides] wide canvas not fully confirmed");
    await captureCanvas(widePage, wideGuidePath);
    await wideCtx.close();

    // ── cctv guide ────────────────────────────────────────────────────────
    console.log("[plate-guides] capturing cctv structural guide…");
    const cctvCtx = await browser.newContext({ viewport: guideViewport });
    const cctvPage = await cctvCtx.newPage();
    await installFixtureRoutes(cctvPage);
    await cctvPage.goto(`${baseUrl}${routePath}?guide=1&viewpoint=cctv`, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    const cctvReady = await waitForCanvas(cctvPage);
    if (!cctvReady) console.warn("[plate-guides] cctv canvas not fully confirmed");
    await captureCanvas(cctvPage, cctvGuidePath);
    await cctvCtx.close();
  } catch (error) {
    errors.push(error);
    console.error("[plate-guides] capture error:", error.message);
  } finally {
    await browser.close().catch(() => {});
    await stop().catch(() => {});
  }

  if (errors.length > 0) {
    console.error("[plate-guides] FAILED");
    process.exitCode = 1;
  } else {
    console.log("[plate-guides] done.");
    console.log(`  ${path.relative(repoRoot, wideGuidePath)}`);
    console.log(`  ${path.relative(repoRoot, cctvGuidePath)}`);
  }
}

await main();
