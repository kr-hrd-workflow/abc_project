#!/usr/bin/env node

import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatBytes, isRecord } from "./lib/util.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const publicRoot = path.join(repoRoot, "apps", "web", "public");
const assetsRoot = path.join(publicRoot, "simulation", "r3f", "assets");
const manifestPath = path.join(assetsRoot, "manifest.json");
// Re-baselined 2026-07-03 with user approval — hero facade textures (previously
// unregistered/uncounted, recompressed 23->9.8 MB in d837752) are now registered, so the
// gate finally sees the true payload (~32 MB).
const firstPassPayloadLimitBytes = 35 * 1024 * 1024;
const stage6EFirstPassRuntimeAssetIds = new Set([
  "vehicles/bus_near",
  "vehicles/emergency_ambulance_medium",
  "vehicles/passenger_car_near",
  "vehicles/taxi_near",
  "vehicles/truck_near",
  "props/streetlight",
  "props/tree_cluster",
  "props/curb_details",
  "props/outdoor_table_chair_set_01",
  "vehicles/passenger_car_far",
  "vehicles/taxi_far",
  "vehicles/bus_far",
  "vehicles/truck_far",
  "textures/wet_asphalt_albedo",
  "textures/wet_asphalt_roughness",
  "decals/worn_lane_markings",
  "decals/crosswalk_wear",
  "decals/curb_grime",
  "textures/sidewalk_paver_variation",
  "textures/facade_window_emissive"
]);
const stage6GeneratedAssetIds = new Set([
  "sprites/stage6_weather_material_source_atlas"
]);

const failures = [];
const reports = [];
const seenStage6EFirstPassAssetIds = new Set();
const seenStage6GeneratedAssetIds = new Set();
let allManifestPayloadBytes = 0;
let stage6EFirstPassPayloadBytes = 0;

function addFailure(message) {
  failures.push(message);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toRepoRelative(localPath) {
  return path.relative(repoRoot, localPath).replace(/\\/g, "/");
}

function toAssetLocalPath(assetPath) {
  const normalizedPath = String(assetPath ?? "").replace(/\\/g, "/");
  const relativePath = normalizedPath.startsWith("/")
    ? normalizedPath.slice(1)
    : normalizedPath;

  return path.resolve(publicRoot, relativePath);
}

function isInsideDirectory(childPath, parentPath) {
  const relativePath = path.relative(parentPath, childPath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function getSuggestedOptimizedPath(localPath) {
  const extension = path.extname(localPath);
  const basePath = localPath.slice(0, -extension.length);

  return `${basePath}.optimized${extension}`;
}

function getGltfTransformCommand(inputPath, outputPath) {
  return [
    "npm --workspace apps/web exec gltf-transform -- optimize",
    toRepoRelative(inputPath),
    toRepoRelative(outputPath),
    "--compress meshopt"
  ].join(" ");
}

async function readManifest() {
  const rawManifest = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(rawManifest);

  if (!isRecord(manifest)) {
    throw new Error("manifest root must be an object keyed by asset IDs");
  }

  return manifest;
}

async function checkOptimizedPath(assetId, entry) {
  if (typeof entry.optimizedPath !== "string" || entry.optimizedPath.trim() === "") {
    return null;
  }

  const optimizedLocalPath = toAssetLocalPath(entry.optimizedPath);

  if (!isInsideDirectory(optimizedLocalPath, assetsRoot)) {
    addFailure(`${assetId}: optimizedPath escapes the R3F assets directory`);
    return optimizedLocalPath;
  }

  try {
    const optimizedStat = await stat(optimizedLocalPath);

    if (!optimizedStat.isFile()) {
      addFailure(`${assetId}: optimizedPath is not a file (${entry.optimizedPath})`);
    }
  } catch {
    addFailure(`${assetId}: optimized output missing at ${entry.optimizedPath}`);
  }

  return optimizedLocalPath;
}

function validateOptimizationMetadata(assetId, entry) {
  if (!isRecord(entry.compression)) {
    addFailure(`${assetId}: compression metadata is required for optimization audit`);
  } else {
    for (const field of ["status", "geometry", "texture", "evidence"]) {
      if (!hasText(entry.compression[field])) {
        addFailure(`${assetId}: compression.${field} is required for optimization audit`);
      }
    }
  }

  if (
    (entry.authorship === "generated" || entry.kind === "sprite") &&
    !hasText(entry.runtimeUsage)
  ) {
    addFailure(`${assetId}: generated and sprite assets must declare runtimeUsage`);
  }
}

async function main() {
  const manifest = await readManifest();
  const entries = Object.entries(manifest);

  for (const [assetId, entry] of entries) {
    if (!isRecord(entry) || typeof entry.path !== "string") {
      addFailure(`${assetId}: manifest entry path is required`);
      continue;
    }

    validateOptimizationMetadata(assetId, entry);

    const localPath = toAssetLocalPath(entry.path);

    if (!isInsideDirectory(localPath, assetsRoot)) {
      addFailure(`${assetId}: resolved path escapes the R3F assets directory`);
      continue;
    }

    let fileStat;

    try {
      fileStat = await stat(localPath);
    } catch {
      addFailure(`${assetId}: missing asset file at ${entry.path}`);
      continue;
    }

    if (!fileStat.isFile()) {
      addFailure(`${assetId}: asset path is not a file`);
      continue;
    }

    allManifestPayloadBytes += fileStat.size;

    if (stage6EFirstPassRuntimeAssetIds.has(assetId)) {
      seenStage6EFirstPassAssetIds.add(assetId);
      stage6EFirstPassPayloadBytes += fileStat.size;
    }

    if (stage6GeneratedAssetIds.has(assetId)) {
      seenStage6GeneratedAssetIds.add(assetId);
    }

    if (path.extname(localPath).toLowerCase() !== ".glb") {
      continue;
    }

    const optimizedLocalPath =
      (await checkOptimizedPath(assetId, entry)) ?? getSuggestedOptimizedPath(localPath);

    reports.push({
      assetId,
      bytes: fileStat.size,
      command: getGltfTransformCommand(localPath, optimizedLocalPath),
      hasDeclaredOptimizedPath: typeof entry.optimizedPath === "string"
    });
  }

  for (const assetId of stage6EFirstPassRuntimeAssetIds) {
    if (!seenStage6EFirstPassAssetIds.has(assetId)) {
      addFailure(`Stage 6E first-pass asset ${assetId} is missing from manifest`);
    }
  }

  for (const assetId of stage6GeneratedAssetIds) {
    if (!seenStage6GeneratedAssetIds.has(assetId)) {
      addFailure(`Stage 6 generated source asset ${assetId} is missing from manifest`);
    }
  }

  if (stage6EFirstPassPayloadBytes > firstPassPayloadLimitBytes) {
    addFailure(
      `Stage 6E first-pass runtime payload ${formatBytes(stage6EFirstPassPayloadBytes)} exceeds ${formatBytes(firstPassPayloadLimitBytes)}`
    );
  }
}

try {
  await main();
} catch (error) {
  addFailure(`optimizer: ${error.message}`);
}

console.log(
  "R3F asset optimization audit: no files rewritten by this script."
);

for (const report of reports) {
  console.log(
    `${report.assetId}: raw ${report.bytes} bytes (${formatBytes(report.bytes)})`
  );
  console.log(`  optimize: ${report.command}`);
  if (report.hasDeclaredOptimizedPath) {
    console.log("  optimized output declared and checked.");
  }
}

console.log(
  `All manifest payload: ${formatBytes(allManifestPayloadBytes)}.`
);
console.log(
  `Stage 6E first-pass runtime payload: ${formatBytes(stage6EFirstPassPayloadBytes)} / ${formatBytes(firstPassPayloadLimitBytes)}.`
);

if (failures.length > 0) {
  console.error("R3F asset optimization check failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exitCode = 1;
}
