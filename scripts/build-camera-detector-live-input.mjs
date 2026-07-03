import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DIRECTIONS = ["north", "south", "east", "west"];
const DETECTION_CLASS_LABELS = [
  "vehicle",
  "emergency_vehicle",
  "pedestrian",
  "stalled_vehicle"
];
const SIGNAL_PHASES = [
  "north_priority",
  "south_priority",
  "east_priority",
  "west_priority",
  "normal_cycle"
];
const CONTROLLER_MODES = ["adaptive", "fixed", "manual"];

export async function buildCameraDetectorLiveInputFile({
  detectorPath,
  calibrationPath,
  signalPath,
  outputPath,
  now = () => new Date(),
  readFile: readFileImpl = readFile,
  writeFile: writeFileImpl = writeFile
}) {
  if (!detectorPath || !calibrationPath || !signalPath || !outputPath) {
    return {
      exitCode: 2,
      summary: null,
      output:
        "Usage: npm run real-sample:build-camera-envelope -- <detector-output.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>"
    };
  }

  try {
    const detector = normalizeDetectorOutput(
      await readJsonFile(detectorPath, readFileImpl)
    );
    const calibration = normalizeCalibration(
      await readJsonFile(calibrationPath, readFileImpl)
    );
    const signalSnapshot = normalizeSignalSnapshot(
      await readJsonFile(signalPath, readFileImpl)
    );
    const mapping = calibration.mappings.find(
      (candidate) =>
        candidate.intersectionId === detector.intersectionId &&
        candidate.cameraId === detector.cameraId
    );

    if (!mapping) {
      throw new Error(
        `camera-to-approach calibration is required for ${detector.cameraId} at ${detector.intersectionId}`
      );
    }

    const envelope = {
      schemaVersion: "live-input.v1",
      intersectionId: detector.intersectionId,
      receivedAt: now().toISOString(),
      cameraFrames: [
        {
          cameraId: detector.cameraId,
          frameId: detector.frameId,
          capturedAt: detector.capturedAt,
          detections: detector.detections.map((detection, index) => ({
            objectId: detection.objectId,
            classLabel: detection.classLabel,
            confidence: detection.confidence,
            direction: mapping.approachDirection,
            laneId: `${mapping.approachDirection}_${detector.cameraId}_${String(
              index + 1
            ).padStart(3, "0")}`,
            count: detection.count,
            ...(detection.distanceMeters === undefined
              ? {}
              : { distanceMeters: detection.distanceMeters }),
            ...(detection.waitingSeconds === undefined
              ? {}
              : { waitingSeconds: detection.waitingSeconds })
          }))
        }
      ],
      signalSnapshot
    };

    await writeFileImpl(outputPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");

    const summary = {
      outputPath,
      intersectionId: detector.intersectionId,
      cameraId: detector.cameraId,
      detectionCount: detector.detections.length,
      approachDirection: mapping.approachDirection,
      signalControllerId: signalSnapshot.controllerId
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

async function readJsonFile(filePath, readFileImpl) {
  let text;
  try {
    text = await readFileImpl(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read ${filePath}: ${message}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${filePath}: ${message}`);
  }
}

function normalizeDetectorOutput(input) {
  const root = requireRecord(input, "authorized camera detector output");

  if (root.source !== "authorized_camera_detector_output") {
    throw new Error("source must be authorized_camera_detector_output");
  }
  if (root.schemaVersion !== "authorized-camera-detector-output.v1") {
    throw new Error("schemaVersion must be authorized-camera-detector-output.v1");
  }

  return {
    intersectionId: requireNonEmptyString(root.intersectionId, "intersectionId"),
    cameraId: requireNonEmptyString(root.cameraId, "cameraId"),
    frameId: requireNonEmptyString(root.frameId, "frameId"),
    capturedAt: requireIsoDateString(root.capturedAt, "capturedAt"),
    detections: requireArray(root.detections, "detections").map(
      normalizeDetection
    )
  };
}

function normalizeDetection(input) {
  const detection = requireRecord(input, "detection");
  const confidence = requireFiniteNumber(detection.confidence, "confidence");

  if (confidence < 0 || confidence > 1) {
    throw new Error("confidence must be between 0 and 1");
  }

  return {
    objectId: requireNonEmptyString(detection.objectId, "objectId"),
    classLabel: requireOneOf(detection.classLabel, DETECTION_CLASS_LABELS, "classLabel"),
    confidence,
    count: requireNonNegativeInteger(detection.count, "count"),
    ...(detection.distanceMeters === undefined
      ? {}
      : { distanceMeters: requireFiniteNumber(detection.distanceMeters, "distanceMeters") }),
    ...(detection.waitingSeconds === undefined
      ? {}
      : { waitingSeconds: requireFiniteNumber(detection.waitingSeconds, "waitingSeconds") })
  };
}

function normalizeCalibration(input) {
  const root = requireRecord(input, "camera approach calibration");

  if (root.source !== "operator_camera_survey") {
    throw new Error("calibration source must be operator_camera_survey");
  }
  if (root.schemaVersion !== "camera-approach-calibration.v1") {
    throw new Error("schemaVersion must be camera-approach-calibration.v1");
  }

  return {
    mappings: requireArray(root.mappings, "mappings").map((mapping) => {
      const record = requireRecord(mapping, "calibration mapping");
      return {
        intersectionId: requireNonEmptyString(
          record.intersectionId,
          "mapping.intersectionId"
        ),
        cameraId: requireNonEmptyString(record.cameraId, "mapping.cameraId"),
        approachDirection: requireOneOf(
          record.approachDirection,
          DIRECTIONS,
          "mapping.approachDirection"
        ),
        evidence: requireNonEmptyString(record.evidence, "mapping.evidence")
      };
    })
  };
}

function normalizeSignalSnapshot(input) {
  const signal = requireRecord(input, "signal snapshot");

  return {
    controllerId: requireNonEmptyString(signal.controllerId, "controllerId"),
    capturedAt: requireIsoDateString(signal.capturedAt, "signal capturedAt"),
    currentPhase: requireOneOf(signal.currentPhase, SIGNAL_PHASES, "currentPhase"),
    remainingSeconds: requireNonNegativeInteger(
      signal.remainingSeconds,
      "remainingSeconds"
    ),
    nextPhase: requireOneOf(signal.nextPhase, SIGNAL_PHASES, "nextPhase"),
    controllerMode: requireOneOf(signal.controllerMode, CONTROLLER_MODES, "controllerMode"),
    manualOverride: requireBoolean(signal.manualOverride, "manualOverride")
  };
}

function formatBuildSummary(summary) {
  return [
    `wrote=${summary.outputPath}`,
    `intersectionId=${summary.intersectionId}`,
    `cameraId=${summary.cameraId}`,
    `detectionCount=${summary.detectionCount}`,
    `approachDirection=${summary.approachDirection}`,
    `signalControllerId=${summary.signalControllerId}`
  ].join("\n");
}

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireIsoDateString(value, label) {
  const text = requireNonEmptyString(value, label);
  if (Number.isNaN(Date.parse(text))) {
    throw new Error(`${label} must be an ISO date string`);
  }
  return text;
}

function requireFiniteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function requireNonNegativeInteger(value, label) {
  const numberValue = requireFiniteNumber(value, label);
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return numberValue;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function requireOneOf(value, allowed, label) {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${label} is not supported`);
  }
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [detectorPath, calibrationPath, signalPath, outputPath] =
    process.argv.slice(2);
  const result = await buildCameraDetectorLiveInputFile({
    detectorPath,
    calibrationPath,
    signalPath,
    outputPath
  });
  const write = result.exitCode === 0 ? console.log : console.error;
  write(result.output);
  process.exit(result.exitCode);
}
