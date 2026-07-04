import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PYTHON_EXECUTABLE = "apps/api/.venv/bin/python";

export async function buildCameraRoiFrameFile({
  framePath,
  outputPath,
  x,
  y,
  width,
  height,
  cropImage = cropImageWithPython
}) {
  if (
    !framePath ||
    !outputPath ||
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return {
      exitCode: 2,
      summary: null,
      output:
        "Usage: npm run real-sample:build-camera-roi-frame -- <frame-image.jpg> <roi-output.jpg> <x> <y> <width> <height>"
    };
  }

  try {
    const roi = {
      x: requireNonNegativeInteger(x, "x"),
      y: requireNonNegativeInteger(y, "y"),
      width: requirePositiveInteger(width, "width"),
      height: requirePositiveInteger(height, "height")
    };

    await cropImage({
      framePath,
      outputPath,
      ...roi
    });

    const summary = { framePath, outputPath, roi };
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

async function cropImageWithPython({ framePath, outputPath, x, y, width, height }) {
  const script = `
import sys
from PIL import Image

frame_path, output_path = sys.argv[1], sys.argv[2]
x, y, width, height = map(int, sys.argv[3:7])

image = Image.open(frame_path)
crop = image.crop((x, y, x + width, y + height))
crop.save(output_path, quality=95)
`;

  await execFileAsync(PYTHON_EXECUTABLE, [
    "-c",
    script,
    framePath,
    outputPath,
    String(x),
    String(y),
    String(width),
    String(height)
  ]);
}

function formatBuildSummary(summary) {
  const { x, y, width, height } = summary.roi;
  return [
    `wrote=${summary.outputPath}`,
    `framePath=${summary.framePath}`,
    `roi=${x},${y},${width},${height}`
  ].join("\n");
}

function requireNonNegativeInteger(value, label) {
  const numberValue = requireInteger(value, label);
  if (numberValue < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return numberValue;
}

function requirePositiveInteger(value, label) {
  const numberValue = requireInteger(value, label);
  if (numberValue <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return numberValue;
}

function requireInteger(value, label) {
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(numberValue)) {
    throw new Error(`${label} must be an integer`);
  }
  return numberValue;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [framePath, outputPath, x, y, width, height] = process.argv.slice(2);
  const result = await buildCameraRoiFrameFile({
    framePath,
    outputPath,
    x,
    y,
    width,
    height
  });
  const write = result.exitCode === 0 ? console.log : console.error;
  write(result.output);
  process.exit(result.exitCode);
}
