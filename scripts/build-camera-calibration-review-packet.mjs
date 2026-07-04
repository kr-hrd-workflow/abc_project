import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const ALLOWED_APPROACH_DIRECTIONS = ["north", "south", "east", "west"];

export async function buildCameraCalibrationReviewPacketFile({
  detectorPath,
  framePath,
  outputPath,
  reviewContext,
  readFile: readFileImpl = readFile,
  writeFile: writeFileImpl = writeFile
}) {
  if (!detectorPath || !framePath || !outputPath || !reviewContext) {
    return {
      exitCode: 2,
      summary: null,
      output:
        "Usage: npm run real-sample:build-camera-calibration-review -- <detector-output.json> <frame-image.jpg> <camera-calibration-review.json> <reviewContext>"
    };
  }

  try {
    const detector = normalizeDetectorOutput(
      await readJsonFile(detectorPath, readFileImpl)
    );
    const packet = {
      source: "camera_calibration_review_packet",
      schemaVersion: "camera-calibration-review-packet.v1",
      status: "needs_operator_direction_confirmation",
      detectorOutputPath: detectorPath,
      framePath,
      reviewContext: requireNonEmptyString(reviewContext, "reviewContext"),
      intersectionId: detector.intersectionId,
      cameraId: detector.cameraId,
      frameId: detector.frameId,
      capturedAt: detector.capturedAt,
      detectionSummary: summarizeDetections(detector.detections),
      allowedApproachDirections: ALLOWED_APPROACH_DIRECTIONS,
      requiredEvidence: [
        "operator/map-reviewed approach direction",
        "evidence text describing the frame and map basis"
      ],
      prohibitedAssumptions: [
        "do not infer approachDirection from detector class counts",
        "do not infer approachDirection from cameraId, intersection name, or file name"
      ],
      calibrationCommandTemplate:
        `npm run real-sample:build-camera-calibration -- <camera-calibration.json> ${detector.intersectionId} ${detector.cameraId} <north|south|east|west> <operator/map-reviewed evidence>`
    };

    await writeFileImpl(outputPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

    const summary = {
      outputPath,
      intersectionId: detector.intersectionId,
      cameraId: detector.cameraId,
      status: packet.status
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
  const root = requireRecord(input, "detector output");
  if (root.source !== "authorized_camera_detector_output") {
    throw new Error("detector source must be authorized_camera_detector_output");
  }
  if (root.schemaVersion !== "authorized-camera-detector-output.v1") {
    throw new Error("schemaVersion must be authorized-camera-detector-output.v1");
  }

  return {
    intersectionId: requireNonEmptyString(root.intersectionId, "intersectionId"),
    cameraId: requireNonEmptyString(root.cameraId, "cameraId"),
    frameId: requireNonEmptyString(root.frameId, "frameId"),
    capturedAt: requireIsoDateString(root.capturedAt, "capturedAt"),
    detections: normalizeDetections(root.detections)
  };
}

function normalizeDetections(input) {
  if (!Array.isArray(input)) {
    throw new Error("detections must be an array");
  }
  return input.map((value) => {
    const detection = requireRecord(value, "detection");
    return {
      classLabel: requireNonEmptyString(detection.classLabel, "classLabel"),
      confidence: requireConfidence(detection.confidence)
    };
  });
}

function summarizeDetections(detections) {
  const confidences = detections.map((detection) => detection.confidence);
  return {
    detectionCount: detections.length,
    classCounts: detections.reduce((counts, detection) => {
      counts[detection.classLabel] = (counts[detection.classLabel] ?? 0) + 1;
      return counts;
    }, {}),
    minConfidence: confidences.length > 0 ? Math.min(...confidences) : null,
    maxConfidence: confidences.length > 0 ? Math.max(...confidences) : null
  };
}

function formatBuildSummary(summary) {
  return [
    `wrote=${summary.outputPath}`,
    `intersectionId=${summary.intersectionId}`,
    `cameraId=${summary.cameraId}`,
    `status=${summary.status}`
  ].join("\n");
}

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
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

function requireConfidence(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("confidence must be between 0 and 1");
  }
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [detectorPath, framePath, outputPath, ...reviewContextParts] =
    process.argv.slice(2);
  const result = await buildCameraCalibrationReviewPacketFile({
    detectorPath,
    framePath,
    outputPath,
    reviewContext: reviewContextParts.join(" ")
  });
  const write = result.exitCode === 0 ? console.log : console.error;
  write(result.output);
  process.exit(result.exitCode);
}
