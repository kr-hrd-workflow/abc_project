import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SIGNAL_PHASES = [
  "north_priority",
  "south_priority",
  "east_priority",
  "west_priority",
  "normal_cycle"
];
const CONTROLLER_MODES = ["adaptive", "fixed", "manual"];
const CARDINAL_STRAIGHT_FIELDS = [
  { direction: "north", sourceField: "ntStsgRmdrCs" },
  { direction: "east", sourceField: "etStsgRmdrCs" },
  { direction: "south", sourceField: "stStsgRmdrCs" },
  { direction: "west", sourceField: "wtStsgRmdrCs" }
];

export async function buildSeoulV2xSignalSnapshotFile({
  responsePath,
  outputPath,
  nextPhase,
  controllerMode,
  manualOverride,
  readFile: readFileImpl = readFile,
  writeFile: writeFileImpl = writeFile
}) {
  if (
    !responsePath ||
    !outputPath ||
    !nextPhase ||
    !controllerMode ||
    typeof manualOverride !== "boolean"
  ) {
    return {
      exitCode: 2,
      summary: null,
      output:
        "Usage: npm run real-sample:build-signal-snapshot -- <seoul-v2x-response.json> <signal-snapshot.json> <nextPhase> <controllerMode> <manualOverride>"
    };
  }

  try {
    const response = await readJsonFile(responsePath, readFileImpl);
    const message = selectLatestMessage(response);
    const normalized = normalizeMessage(message);
    const selected = buildStraightSignalCandidates(message)[0];

    if (!selected) {
      throw new Error("cardinal straight signal remaining time is required");
    }

    const signalSnapshot = {
      controllerId: normalized.controllerId,
      capturedAt: normalized.capturedAt,
      currentPhase: `${selected.direction}_priority`,
      remainingSeconds: selected.remainingSeconds,
      nextPhase: requireOneOf(nextPhase, SIGNAL_PHASES, "nextPhase"),
      controllerMode: requireOneOf(controllerMode, CONTROLLER_MODES, "controllerMode"),
      manualOverride
    };

    await writeFileImpl(
      outputPath,
      `${JSON.stringify(signalSnapshot, null, 2)}\n`,
      "utf8"
    );

    const summary = {
      outputPath,
      controllerId: signalSnapshot.controllerId,
      capturedAt: signalSnapshot.capturedAt,
      currentPhase: signalSnapshot.currentPhase,
      remainingSeconds: signalSnapshot.remainingSeconds,
      sourceField: selected.sourceField
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

function selectLatestMessage(input) {
  const messages = Array.isArray(input) ? input : [input];
  if (messages.length === 0) {
    throw new Error("Seoul V2X signal API response must not be empty");
  }

  return [...messages]
    .map((message) => requireRecord(message, "Seoul V2X signal message"))
    .sort(
      (a, b) =>
        requireFiniteNumber(b.trsmUtcTime, "trsmUtcTime") -
        requireFiniteNumber(a.trsmUtcTime, "trsmUtcTime")
    )[0];
}

function normalizeMessage(raw) {
  return {
    controllerId: requireNonEmptyString(raw.eqmnId, "eqmnId"),
    capturedAt: buildCapturedAt(raw)
  };
}

function buildStraightSignalCandidates(raw) {
  return CARDINAL_STRAIGHT_FIELDS.map(({ direction, sourceField }) => {
    const remainingSeconds = normalizeRemainingSeconds(raw[sourceField]);
    return remainingSeconds === null
      ? null
      : { direction, remainingSeconds, sourceField };
  })
    .filter(Boolean)
    .sort((a, b) => b.remainingSeconds - a.remainingSeconds);
}

function normalizeRemainingSeconds(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const deciseconds =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(deciseconds) || deciseconds <= 0) {
    return null;
  }
  return Math.ceil(deciseconds / 10);
}

function buildCapturedAt(raw) {
  const utcMillis = requireFiniteNumber(raw.trsmUtcTime, "trsmUtcTime");
  const date = new Date(utcMillis);
  if (Number.isNaN(date.getTime())) {
    throw new Error("trsmUtcTime must be a valid UTC epoch milliseconds value");
  }
  return date.toISOString();
}

function formatBuildSummary(summary) {
  return [
    `wrote=${summary.outputPath}`,
    `controllerId=${summary.controllerId}`,
    `capturedAt=${summary.capturedAt}`,
    `currentPhase=${summary.currentPhase}`,
    `remainingSeconds=${summary.remainingSeconds}`,
    `sourceField=${summary.sourceField}`
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

function requireFiniteNumber(value, label) {
  const numberValue =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${label} must be a finite number`);
  }
  return numberValue;
}

function requireOneOf(value, allowed, label) {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${label} is not supported`);
  }
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [responsePath, outputPath, nextPhase, controllerMode, manualOverrideText] =
    process.argv.slice(2);
  const result = await buildSeoulV2xSignalSnapshotFile({
    responsePath,
    outputPath,
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
