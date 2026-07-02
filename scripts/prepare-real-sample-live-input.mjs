import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { buildCameraDetectorLiveInputFile } from "./build-camera-detector-live-input.mjs";
import { buildSeoulV2xSignalSnapshotFile } from "./build-seoul-v2x-signal-snapshot.mjs";
import { checkRealSampleDropInFile } from "./real-sample-drop-in-check.mjs";

export async function prepareRealSampleLiveInputFiles({
  detectorPath,
  calibrationPath,
  seoulV2xResponsePath,
  signalOutputPath,
  envelopeOutputPath,
  nextPhase,
  controllerMode,
  manualOverride,
  now = () => new Date(),
  readFile: readFileImpl = readFile,
  writeFile: writeFileImpl = writeFile
}) {
  if (
    !detectorPath ||
    !calibrationPath ||
    !seoulV2xResponsePath ||
    !signalOutputPath ||
    !envelopeOutputPath ||
    !nextPhase ||
    !controllerMode ||
    typeof manualOverride !== "boolean"
  ) {
    return {
      exitCode: 2,
      summary: null,
      output:
        "Usage: npm run real-sample:prepare-live-input -- <detector-output.json> <camera-calibration.json> <seoul-v2x-response.json> <signal-snapshot.json> <live-input-envelope.json> <nextPhase> <controllerMode> <manualOverride>"
    };
  }

  const writes = new Map();
  const writeAndRemember = async (filePath, contents, encoding) => {
    writes.set(filePath, contents);
    await writeFileImpl(filePath, contents, encoding);
  };
  const readWithPreparedOutputs = async (filePath, encoding) => {
    if (writes.has(filePath)) {
      return writes.get(filePath);
    }
    return readFileImpl(filePath, encoding);
  };

  const signalResult = await buildSeoulV2xSignalSnapshotFile({
    responsePath: seoulV2xResponsePath,
    outputPath: signalOutputPath,
    nextPhase,
    controllerMode,
    manualOverride,
    readFile: readFileImpl,
    writeFile: writeAndRemember
  });
  if (signalResult.exitCode !== 0) {
    return signalResult;
  }

  const envelopeResult = await buildCameraDetectorLiveInputFile({
    detectorPath,
    calibrationPath,
    signalPath: signalOutputPath,
    outputPath: envelopeOutputPath,
    now,
    readFile: readWithPreparedOutputs,
    writeFile: writeAndRemember
  });
  if (envelopeResult.exitCode !== 0) {
    return envelopeResult;
  }

  const offlineCheck = await checkRealSampleDropInFile({
    filePath: envelopeOutputPath,
    offline: true,
    readFile: readWithPreparedOutputs
  });
  if (offlineCheck.exitCode !== 0) {
    return {
      exitCode: offlineCheck.exitCode,
      summary: null,
      output: offlineCheck.output
    };
  }

  const summary = {
    signalOutputPath,
    envelopeOutputPath,
    offlineAccepted: offlineCheck.summary.accepted,
    currentPhase: signalResult.summary.currentPhase,
    detectionCount: envelopeResult.summary.detectionCount
  };

  return {
    exitCode: 0,
    summary,
    output: formatPrepareSummary(summary)
  };
}

function formatPrepareSummary(summary) {
  return [
    `signalSnapshot=${summary.signalOutputPath}`,
    `liveInputEnvelope=${summary.envelopeOutputPath}`,
    `offlineAccepted=${summary.offlineAccepted}`,
    `currentPhase=${summary.currentPhase}`,
    `detectionCount=${summary.detectionCount}`
  ].join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [
    detectorPath,
    calibrationPath,
    seoulV2xResponsePath,
    signalOutputPath,
    envelopeOutputPath,
    nextPhase,
    controllerMode,
    manualOverrideText
  ] = process.argv.slice(2);
  const result = await prepareRealSampleLiveInputFiles({
    detectorPath,
    calibrationPath,
    seoulV2xResponsePath,
    signalOutputPath,
    envelopeOutputPath,
    nextPhase,
    controllerMode,
    manualOverride: parseManualOverride(manualOverrideText)
  });
  const write = result.exitCode === 0 ? console.log : console.error;
  write(result.output);
  process.exit(result.exitCode);
}

function parseManualOverride(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}
