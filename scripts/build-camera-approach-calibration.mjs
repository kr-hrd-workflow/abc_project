import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DIRECTIONS = ["north", "south", "east", "west"];

export async function buildCameraApproachCalibrationFile({
  outputPath,
  intersectionId,
  cameraId,
  approachDirection,
  evidence,
  writeFile: writeFileImpl = writeFile
}) {
  if (!outputPath || !intersectionId || !cameraId || !approachDirection || !evidence) {
    return {
      exitCode: 2,
      summary: null,
      output:
        "Usage: npm run real-sample:build-camera-calibration -- <camera-calibration.json> <intersectionId> <cameraId> <approachDirection> <evidence>"
    };
  }

  try {
    const direction = requireOneOf(
      approachDirection,
      DIRECTIONS,
      "approachDirection"
    );
    const calibration = {
      source: "operator_camera_survey",
      schemaVersion: "camera-approach-calibration.v1",
      mappings: [
        {
          intersectionId: requireNonEmptyString(intersectionId, "intersectionId"),
          cameraId: requireNonEmptyString(cameraId, "cameraId"),
          approachDirection: direction,
          evidence: requireNonEmptyString(evidence, "evidence")
        }
      ]
    };

    await writeFileImpl(outputPath, `${JSON.stringify(calibration, null, 2)}\n`, "utf8");

    const summary = {
      outputPath,
      intersectionId,
      cameraId,
      approachDirection: direction
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

function formatBuildSummary(summary) {
  return [
    `wrote=${summary.outputPath}`,
    `intersectionId=${summary.intersectionId}`,
    `cameraId=${summary.cameraId}`,
    `approachDirection=${summary.approachDirection}`
  ].join("\n");
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
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
  const [outputPath, intersectionId, cameraId, approachDirection, ...evidenceParts] =
    process.argv.slice(2);
  const result = await buildCameraApproachCalibrationFile({
    outputPath,
    intersectionId,
    cameraId,
    approachDirection,
    evidence: evidenceParts.join(" ")
  });
  const write = result.exitCode === 0 ? console.log : console.error;
  write(result.output);
  process.exit(result.exitCode);
}
