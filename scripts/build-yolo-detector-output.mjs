import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON_EXECUTABLE = "apps/api/.venv/bin/python";
const DEFAULT_MODEL_PATH = "apps/api/models/yolov8n.pt";
const DEFAULT_CONFIDENCE_THRESHOLD = 0.25;

const VEHICLE_LABELS = new Set([
  "bicycle",
  "bus",
  "car",
  "motorbike",
  "motorcycle",
  "train",
  "truck"
]);
const EMERGENCY_LABELS = new Set([
  "ambulance",
  "emergency_vehicle",
  "fire_truck",
  "police_car"
]);

export async function buildYoloDetectorOutputFile({
  framePath,
  outputPath,
  intersectionId,
  cameraId,
  capturedAt,
  modelPath = DEFAULT_MODEL_PATH,
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
  runPython = runYoloPython,
  writeFile: writeFileImpl = writeFile
}) {
  if (
    !framePath ||
    !outputPath ||
    !intersectionId ||
    !cameraId ||
    !capturedAt
  ) {
    return {
      exitCode: 2,
      summary: null,
      output:
        "Usage: npm run real-sample:build-yolo-detector-output -- <frame-image.jpg> <detector-output.json> <intersectionId> <cameraId> <capturedAt> [modelPath] [confidenceThreshold]"
    };
  }

  try {
    const rawDetections = await runPython({
      framePath,
      modelPath,
      confidenceThreshold
    });
    const detections = normalizeYoloDetections(rawDetections);
    const output = {
      source: "authorized_camera_detector_output",
      schemaVersion: "authorized-camera-detector-output.v1",
      intersectionId,
      cameraId,
      frameId: frameIdFromPath(framePath),
      capturedAt: requireIsoDateString(capturedAt, "capturedAt"),
      detections
    };

    await writeFileImpl(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

    const summary = {
      outputPath,
      intersectionId,
      cameraId,
      frameId: output.frameId,
      detectionCount: detections.length,
      classCounts: countClasses(detections)
    };

    return {
      exitCode: 0,
      summary,
      output: formatBuildSummary(summary)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 1,
      summary: null,
      output: message
    };
  }
}

async function runYoloPython({ framePath, modelPath, confidenceThreshold }) {
  const script = `
import json
import sys
from ultralytics import YOLO

frame_path, model_path, confidence_threshold = sys.argv[1], sys.argv[2], float(sys.argv[3])
model = YOLO(model_path)
results = model(frame_path, conf=confidence_threshold, verbose=False)
result = results[0]
names = result.names if isinstance(result.names, dict) else {}
detections = []
for box in result.boxes:
    class_id = int(box.cls.item())
    detections.append({
        "label": str(names.get(class_id, class_id)),
        "confidence": float(box.conf.item())
    })
print(json.dumps(detections))
`;

  const { stdout } = await execFileAsync(PYTHON_EXECUTABLE, [
    "-c",
    script,
    framePath,
    modelPath,
    String(confidenceThreshold)
  ]);
  return JSON.parse(stdout);
}

function normalizeYoloDetections(rawDetections) {
  if (!Array.isArray(rawDetections)) {
    throw new Error("YOLO detections must be an array");
  }

  const counters = new Map();
  return rawDetections
    .map((detection) => {
      const normalizedClass = mapYoloClass(detection.label);
      if (!normalizedClass) {
        return null;
      }
      const nextCount = (counters.get(normalizedClass) ?? 0) + 1;
      counters.set(normalizedClass, nextCount);
      return {
        objectId: `${normalizedClass}-${String(nextCount).padStart(3, "0")}`,
        classLabel: normalizedClass,
        confidence: requireConfidence(detection.confidence),
        count: 1
      };
    })
    .filter(Boolean);
}

function mapYoloClass(label) {
  const normalized = String(label).trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (EMERGENCY_LABELS.has(normalized)) {
    return "emergency_vehicle";
  }
  if (VEHICLE_LABELS.has(normalized)) {
    return "vehicle";
  }
  if (normalized === "person") {
    return "pedestrian";
  }
  return null;
}

function frameIdFromPath(framePath) {
  const name = basename(framePath);
  const extension = extname(name);
  return extension ? name.slice(0, -extension.length) : name;
}

function countClasses(detections) {
  return detections.reduce((counts, detection) => {
    counts[detection.classLabel] = (counts[detection.classLabel] ?? 0) + 1;
    return counts;
  }, {});
}

function formatBuildSummary(summary) {
  return [
    `wrote=${summary.outputPath}`,
    `intersectionId=${summary.intersectionId}`,
    `cameraId=${summary.cameraId}`,
    `frameId=${summary.frameId}`,
    `detectionCount=${summary.detectionCount}`,
    `classCounts=${JSON.stringify(summary.classCounts)}`
  ].join("\n");
}

function requireIsoDateString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be an ISO date string`);
  }
  return value;
}

function requireConfidence(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("confidence must be between 0 and 1");
  }
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [
    framePath,
    outputPath,
    intersectionId,
    cameraId,
    capturedAt,
    modelPath = DEFAULT_MODEL_PATH,
    confidenceThreshold = String(DEFAULT_CONFIDENCE_THRESHOLD)
  ] = process.argv.slice(2);
  const result = await buildYoloDetectorOutputFile({
    framePath,
    outputPath,
    intersectionId,
    cameraId,
    capturedAt,
    modelPath,
    confidenceThreshold: Number(confidenceThreshold)
  });
  const write = result.exitCode === 0 ? console.log : console.error;
  write(result.output);
  process.exit(result.exitCode);
}
