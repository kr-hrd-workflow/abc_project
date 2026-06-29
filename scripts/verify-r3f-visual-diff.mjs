#!/usr/bin/env node

import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isRecord } from "./lib/util.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const detailsPath = path.join(repoRoot, "artifacts", "r3f-dashboard-details.json");
const defaultBaselineDetailsPath = path.join(
  repoRoot,
  "scripts",
  "baselines",
  "r3f-dashboard-visual-baseline.json"
);
const baselineDetailsPath = process.env.R3F_VISUAL_BASELINE_DETAILS
  ? path.resolve(repoRoot, process.env.R3F_VISUAL_BASELINE_DETAILS)
  : defaultBaselineDetailsPath;
const allowSelfBaseline = process.env.R3F_VISUAL_ALLOW_SELF_BASELINE === "1";
const requiredScenarios = [
  "day/high",
  "night/high",
  "rain/high",
  "rain/low fallback",
  "mobile/rain/high",
  "webgl-off fallback",
  "canvas-only/nonblank proof"
];
const metricThresholds = {
  non_background_ratio: 0.1,
  bright_ratio: 0.16,
  dark_ratio: 0.18,
  marking_ratio: 0.2,
  luminance_stddev: 22,
  color_bucket_count: 80
};

const failures = [];
const checks = [];

function addCheck(name, passed, evidence) {
  checks.push({ name, passed, evidence });
  if (!passed) {
    failures.push(`${name}: ${evidence}`);
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function fileExists(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    return false;
  }

  try {
    await stat(path.resolve(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

function compareMetrics(current, baseline) {
  const deltas = {};
  let passed = true;

  for (const [metric, threshold] of Object.entries(metricThresholds)) {
    const currentValue = Number(current?.[metric]);
    const baselineValue = Number(baseline?.[metric]);

    if (!Number.isFinite(currentValue) || !Number.isFinite(baselineValue)) {
      passed = false;
      deltas[metric] = "missing";
      continue;
    }

    const delta = Math.abs(currentValue - baselineValue);
    deltas[metric] = Number(delta.toFixed(4));
    if (delta > threshold) {
      passed = false;
    }
  }

  return { passed, deltas };
}

function scenarioById(details) {
  const scenarios = Array.isArray(details.scenarios) ? details.scenarios : [];
  return new Map(
    scenarios
      .filter((scenario) => isRecord(scenario) && typeof scenario.id === "string")
      .map((scenario) => [scenario.id, scenario])
  );
}

function printReport() {
  if (failures.length === 0) {
    console.log("R3F visual diff verification passed.");
  } else {
    console.error("R3F visual diff verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }

  console.log("Checks:");
  for (const check of checks) {
    console.log(
      `- ${check.passed ? "PASS" : "FAIL"} ${check.name}: ${check.evidence}`
    );
  }
}

let details;
let baselineDetails;

try {
  details = await readJson(detailsPath);
  baselineDetails = await readJson(baselineDetailsPath);
} catch (error) {
  console.error(
    `Could not read visual details JSON. Run npm run verify:r3f-dashboard first. ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}

const artifacts = isRecord(details.artifacts) ? details.artifacts : {};
const currentMetrics = details.desktop?.canvas_metrics;
const baselineMetrics = baselineDetails.desktop?.canvas_metrics;
const comparison = compareMetrics(currentMetrics, baselineMetrics);
const scenarios = scenarioById(details);
const selfBaseline = baselineDetailsPath === detailsPath;

addCheck(
  "desktop canvas artifact exists",
  await fileExists(artifacts.desktop_canvas),
  artifacts.desktop_canvas ?? "missing"
);
addCheck(
  "visual baseline is stable for final readiness",
  !selfBaseline || allowSelfBaseline,
  JSON.stringify({
    baseline: path.relative(repoRoot, baselineDetailsPath).replace(/\\/g, "/"),
    self_baseline: selfBaseline,
    mode: selfBaseline && allowSelfBaseline ? "non_final_self_baseline" : "final"
  })
);
addCheck(
  "desktop canvas is structurally nonblank",
  Number(currentMetrics?.non_background_ratio) > 0.02 &&
    Number(currentMetrics?.color_bucket_count) >= 32 &&
    Number(currentMetrics?.luminance_stddev) >= 10,
  JSON.stringify({
    non_background_ratio: currentMetrics?.non_background_ratio ?? null,
    color_bucket_count: currentMetrics?.color_bucket_count ?? null,
    luminance_stddev: currentMetrics?.luminance_stddev ?? null
  })
);
addCheck(
  "current canvas metrics stay within baseline histogram thresholds",
  comparison.passed,
  JSON.stringify({
    baseline: path.relative(repoRoot, baselineDetailsPath).replace(/\\/g, "/"),
    deltas: comparison.deltas,
    self_baseline: selfBaseline
  })
);

for (const scenarioId of requiredScenarios) {
  const scenario = scenarios.get(scenarioId);
  addCheck(
    `scenario captured: ${scenarioId}`,
    scenario?.status === "captured",
    scenario
      ? JSON.stringify({
          status: scenario.status,
          artifact: scenario.artifact,
          reason: scenario.reason
        })
      : "missing"
  );
}

printReport();

if (failures.length > 0) {
  process.exitCode = 1;
}
