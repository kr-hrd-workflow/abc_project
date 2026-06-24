#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const detailsPath = path.join(repoRoot, "artifacts", "r3f-dashboard-details.json");
const maxPeakDrawCalls = 900;
const maxHighPresetDrawCalls = 180;
const targetFrameTimeMsByQuality = {
  low: 40,
  medium: 28,
  high: 20,
  ultra: 16.7
};

const failures = [];
const concerns = [];
const checks = [];

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function addCheck(name, passed, evidence, options = {}) {
  const severity = options.severity ?? "failure";
  checks.push({ name, passed, evidence, severity });
  if (!passed) {
    if (severity === "concern") {
      concerns.push(`${name}: ${evidence}`);
    } else {
      failures.push(`${name}: ${evidence}`);
    }
  }
}

async function readDetails() {
  try {
    const raw = await readFile(detailsPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Could not read ${path.relative(repoRoot, detailsPath)}. Run npm run verify:r3f-dashboard first. ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function readPerformance(details) {
  const renderer = isRecord(details.renderer) ? details.renderer : {};
  const performance = isRecord(details.performance) ? details.performance : {};

  return {
    drawCalls: numberOrNull(performance.drawCalls ?? renderer.drawCalls),
    frameTimeMs: numberOrNull(performance.frameTimeMs),
    visibleVehicles: numberOrNull(
      performance.visibleVehicles ?? renderer.visibleVehicleCount
    ),
    textureMemoryEstimateMb: numberOrNull(performance.textureMemoryEstimateMb),
    rawFrameTimeMs: numberOrNull(performance.rawFrameTimeMs),
    measurementStatus:
      typeof performance.measurementStatus === "string"
        ? performance.measurementStatus
        : null,
    reason: typeof performance.reason === "string" ? performance.reason : null
  };
}

function readQualityPreset(details) {
  if (typeof details.qualityPreset === "string") return details.qualityPreset;

  const renderer = isRecord(details.renderer) ? details.renderer : {};
  const rendererQuality = isRecord(renderer.qualityPreset)
    ? renderer.qualityPreset
    : {};

  return typeof rendererQuality.value === "string" ? rendererQuality.value : null;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function hasStaleLabel(details) {
  const renderer = isRecord(details.renderer) ? details.renderer : {};
  const sourceLabels = isRecord(details.sourceLabels) ? details.sourceLabels : {};
  const badges = isRecord(renderer.domProof?.sourceBadges)
    ? renderer.domProof.sourceBadges
    : {};
  const staleBadge = String(
    sourceLabels.frameStaleBadge ?? badges.frameStale ?? ""
  );
  const stale =
    renderer.snapshot_source === "sumo_last_good" ||
    renderer.frame_stale === true ||
    details.telemetry?.frame_stale === true ||
    sourceLabels.stale === true;

  return {
    stale,
    staleBadge,
    passed: !stale || /stale|degraded/i.test(staleBadge)
  };
}

function printReport() {
  if (failures.length === 0) {
    if (concerns.length === 0) {
      console.log("R3F performance verification passed.");
    } else {
      console.log("R3F performance verification PASS_WITH_CONCERNS.");
      console.log("Concerns:");
      for (const concern of concerns) {
        console.log(`- ${concern}`);
      }
    }
  } else {
    console.error("R3F performance verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }

  console.log("Checks:");
  for (const check of checks) {
    const status = check.passed
      ? "PASS"
      : check.severity === "concern"
        ? "CONCERN"
        : "FAIL";
    console.log(
      `- ${status} ${check.name}: ${check.evidence}`
    );
  }
}

const details = await readDetails();
const performance = readPerformance(details);
const qualityPreset = readQualityPreset(details);
const targetFrameTimeMs =
  typeof qualityPreset === "string"
    ? targetFrameTimeMsByQuality[qualityPreset] ?? null
    : null;
const postFx = isRecord(details.postFx) ? details.postFx : null;
const heavyFeatures = isRecord(details.heavyFeatures) ? details.heavyFeatures : null;
const staleLabel = hasStaleLabel(details);
const dashboardFailures = Array.isArray(details.failures) ? details.failures : [];
const measuredFrameTimePass =
  performance.frameTimeMs !== null &&
  targetFrameTimeMs !== null &&
  performance.frameTimeMs <= targetFrameTimeMs;
const honestlyUnmeasurable =
  performance.measurementStatus === "unmeasurable_headless_static_demand_loop" &&
  typeof performance.reason === "string" &&
  performance.reason.length > 0;

addCheck(
  "dashboard details are from a passing verifier run",
  dashboardFailures.length === 0,
  dashboardFailures.length === 0
    ? "details.failures is empty"
    : dashboardFailures.slice(0, 3).join(" | ")
);
addCheck(
  "draw calls stay under peak budget",
  performance.drawCalls !== null &&
    performance.drawCalls > 0 &&
    performance.drawCalls <= maxPeakDrawCalls,
  `drawCalls=${performance.drawCalls ?? "missing"} / ${maxPeakDrawCalls}`
);
if (details.qualityPreset === "high") {
  addCheck(
    "high preset draw calls stay under normal budget",
    performance.drawCalls !== null &&
      performance.drawCalls <= maxHighPresetDrawCalls,
    `qualityPreset=high drawCalls=${performance.drawCalls ?? "missing"} / ${maxHighPresetDrawCalls}`
  );
}
addCheck(
  "visible vehicle count is reported",
  performance.visibleVehicles !== null,
  `visibleVehicles=${performance.visibleVehicles ?? "missing"}`
);
addCheck(
  "postFX active state is reported",
  postFx !== null &&
    typeof postFx.enabled === "boolean" &&
    (postFx.enabled === false || Array.isArray(postFx.chain)),
  JSON.stringify(postFx)
);
addCheck(
  "reflection active state is reported",
  heavyFeatures !== null && typeof heavyFeatures.planarReflection === "boolean",
  JSON.stringify(heavyFeatures)
);
addCheck(
  "stale frame label is visible when the source is stale",
  staleLabel.passed,
  `stale=${staleLabel.stale}, label=${staleLabel.staleBadge || "missing"}`
);
addCheck(
  "frame-time target has final measurable proof",
  measuredFrameTimePass,
  `qualityPreset=${qualityPreset ?? "missing"}, frameTimeMs=${performance.frameTimeMs ?? "missing"}, target=${targetFrameTimeMs ?? "missing"}, measurementStatus=${performance.measurementStatus ?? "missing"}, rawFrameTimeMs=${performance.rawFrameTimeMs ?? "missing"}, reason=${performance.reason ?? "missing"}`,
  { severity: honestlyUnmeasurable ? "concern" : "failure" }
);
addCheck(
  "headless fallback is honestly labeled when frame-time is unmeasurable",
  performance.frameTimeMs !== null || honestlyUnmeasurable,
  `measurementStatus=${performance.measurementStatus ?? "missing"}, reason=${performance.reason ?? "missing"}`
);

printReport();

if (failures.length > 0) {
  process.exitCode = 1;
}
