#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const dashboardUrl =
  process.env.STAGE5_DASHBOARD_URL ?? "http://127.0.0.1:3000/dashboard";
const streamUrl = process.env.STAGE5_STREAM_URL ?? "http://127.0.0.1";
const screenshotPath = resolve(
  repoRoot,
  process.env.STAGE5_SCREENSHOT_PATH ??
    "artifacts/unreal-operator-map-stage5-dashboard-stream-proof.png"
);
const detailsPath = resolve(
  repoRoot,
  process.env.STAGE5_DETAILS_PATH ??
    "artifacts/unreal-operator-map-stage5-dashboard-stream-details.json"
);
const manifestPath = resolve(
  repoRoot,
  process.env.STAGE5_MANIFEST_PATH ??
    "renderer/unreal/SmartIntersection/GeneratedProof/smart_intersection_rebuild_operator_stage5_pixel_streaming_manifest.json"
);

function repoRelative(path) {
  return relative(repoRoot, path).replaceAll("\\", "/");
}

mkdirSync(dirname(screenshotPath), { recursive: true });
mkdirSync(dirname(detailsPath), { recursive: true });
mkdirSync(dirname(manifestPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1
});

try {
  await page.goto(dashboardUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

  const frame = page.locator("iframe.simulation-stream-frame.unreal-pixel-streaming-frame");
  await frame.waitFor({ state: "visible", timeout: 30_000 });
  await frame.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_500);

  const iframeElement = await page.$("iframe.simulation-stream-frame.unreal-pixel-streaming-frame");
  const pixelFrame = iframeElement ? await iframeElement.contentFrame() : null;
  let pixelStreamingFrontendUrl = null;
  let pixelStreamingStarted = false;
  let selectedStreamer = null;
  let streamerOptions = [];
  let pixelStreamingStatsText = "";
  let videoResolution = null;
  let framesDecoded = null;
  let framerate = null;
  let videoCodec = null;

  if (pixelFrame) {
    pixelStreamingFrontendUrl = pixelFrame.url();
    await pixelFrame
      .getByText(/CLICK TO START/i)
      .click({ timeout: 5_000 })
      .catch(() => undefined);
    await page.waitForTimeout(2_000);

    const streamSelects = await pixelFrame.locator("select").count();
    for (let index = 0; index < streamSelects; index += 1) {
      const options = await pixelFrame
        .locator("select")
        .nth(index)
        .locator("option")
        .evaluateAll((items) =>
          items.map((item) => ({
            text: item.textContent?.trim() ?? "",
            value: item.value
          }))
        )
        .catch(() => []);
      if (options.some((option) => option.value === "DefaultStreamer")) {
        streamerOptions = options;
        selectedStreamer = "DefaultStreamer";
        await pixelFrame.locator("select").nth(index).selectOption("DefaultStreamer");
        break;
      }
      if (streamerOptions.length === 0 && options.length > 0) {
        streamerOptions = options;
      }
    }

    await page.waitForTimeout(8_000);
    pixelStreamingStatsText = await pixelFrame
      .locator("body")
      .innerText({ timeout: 5_000 })
      .catch(() => "");
    pixelStreamingStarted =
      /Frames Decoded:\s*[1-9]/.test(pixelStreamingStatsText) ||
      /Video resolution:\s*\d+x\d+/.test(pixelStreamingStatsText);
    videoResolution =
      pixelStreamingStatsText.match(/Video resolution:\s*([0-9]+x[0-9]+)/)?.[1] ?? null;
    framesDecoded =
      Number(pixelStreamingStatsText.match(/Frames Decoded:\s*([0-9]+)/)?.[1] ?? NaN) || null;
    framerate =
      Number(pixelStreamingStatsText.match(/Framerate:\s*([0-9]+)/)?.[1] ?? NaN) || null;
    videoCodec = pixelStreamingStatsText.match(/Video codec:\s*([A-Za-z0-9]+)/)?.[1] ?? null;
  }

  const frameBox = await frame.boundingBox();
  const iframeSrc = await frame.getAttribute("src");
  const iframeClass = await frame.getAttribute("class");
  const iframeAllow = await frame.getAttribute("allow");
  const streamFrameVisible = Boolean(frameBox && frameBox.width >= 320 && frameBox.height >= 180);
  const safetyCopyVisible = await page
    .getByText("Simulation only / No real signal control")
    .isVisible()
    .catch(() => false);
  const sumoRendererVisible = await page
    .getByText("SUMO/TraCI Renderer")
    .isVisible()
    .catch(() => false);
  const pixelStreamingLabelVisible = await page
    .getByText("Unreal Pixel Streaming")
    .first()
    .isVisible()
    .catch(() => false);
  const dashboardShellVisible = (await page.locator(".dashboard-shell").count()) > 0;

  await page.screenshot({ path: screenshotPath, fullPage: false });

  const capturedAt = new Date().toISOString();
  const rendererPolicy =
    "SUMO/TraCI is truth, FastAPI orchestrates, Unreal renders, Pixel Streaming transports frames.";
  const details = {
    schema: "operator-stage5-pixel-streaming-dashboard-proof-v1",
    mode: "OperatorStage5",
    base_stage: "OperatorStage4Fixture",
    dashboard_url: dashboardUrl,
    stream_url: streamUrl,
    iframe_src: iframeSrc,
    iframe_class: iframeClass,
    iframe_allow: iframeAllow,
    stream_frame_visible: streamFrameVisible,
    stream_frame_box: frameBox,
    safety_copy_visible: safetyCopyVisible,
    sumo_renderer_visible: sumoRendererVisible,
    pixel_streaming_label_visible: pixelStreamingLabelVisible,
    dashboard_shell_visible: dashboardShellVisible,
    pixel_streaming_frontend_url: pixelStreamingFrontendUrl,
    pixel_streaming_started: pixelStreamingStarted,
    selected_streamer: selectedStreamer,
    streamer_options: streamerOptions,
    video_resolution: videoResolution,
    frames_decoded: framesDecoded,
    framerate,
    video_codec: videoCodec,
    renderer_policy: rendererPolicy,
    simulation_source_claim: "fixture_or_live_as_reported_by_runtime_readiness",
    live_sumo_status: "deferred_unless_real_sumo_traci_run_passes",
    no_real_control: true,
    captured_at: capturedAt,
    screenshot_path: repoRelative(screenshotPath)
  };

  writeFileSync(detailsPath, JSON.stringify(details, null, 2) + "\n", "utf8");

  const manifest = {
    schema: "operator-stage5-pixel-streaming-dashboard-proof-v1",
    mode: "OperatorStage5",
    base_stage: "OperatorStage4Fixture",
    dashboard_url: dashboardUrl,
    stream_url: streamUrl,
    proof_image: repoRelative(screenshotPath),
    details_json: repoRelative(detailsPath),
    renderer_policy: rendererPolicy,
    transport_boundary: "Pixel Streaming transports rendered frames only.",
    simulation_source_claim: "fixture_or_live_as_reported_by_runtime_readiness",
    live_sumo_status: "deferred_unless_real_sumo_traci_run_passes",
    no_real_control: true,
    pixel_streaming_launch_flags: [
      "-PixelStreamingURL=ws://127.0.0.1:8888",
      "-RenderOffscreen",
      "-AudioMixer"
    ],
    unreal_launch_command:
      "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/open-unreal-project.ps1 -PixelStreaming -Game",
    signalling_command: "npm run unreal:pixel-streaming",
    dashboard_home_command: "npm run unreal:home",
    captured_at: capturedAt
  };

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log(`STAGE5_DASHBOARD_PROOF=${repoRelative(screenshotPath)}`);
  console.log(`STAGE5_DASHBOARD_DETAILS=${repoRelative(detailsPath)}`);
  console.log(`STAGE5_MANIFEST=${repoRelative(manifestPath)}`);
} finally {
  await browser.close();
}
