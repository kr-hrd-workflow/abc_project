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
  {
    direction: "north",
    sourceField: "ntStsgRmndCs",
    statusField: "ntStsgSttsNm"
  },
  {
    direction: "east",
    sourceField: "etStsgRmndCs",
    statusField: "etStsgSttsNm"
  },
  {
    direction: "south",
    sourceField: "stStsgRmndCs",
    statusField: "stStsgSttsNm"
  },
  {
    direction: "west",
    sourceField: "wtStsgRmndCs",
    statusField: "wtStsgSttsNm"
  }
];

export async function buildNationalTrafficSignalSnapshotFile({
  responsePath,
  outputPath,
  crsrdId,
  nextPhase,
  controllerMode,
  manualOverride,
  readFile: readFileImpl = readFile,
  writeFile: writeFileImpl = writeFile
}) {
  if (
    !responsePath ||
    !outputPath ||
    !crsrdId ||
    !nextPhase ||
    !controllerMode ||
    typeof manualOverride !== "boolean"
  ) {
    return {
      exitCode: 2,
      summary: null,
      output:
        "Usage: npm run real-sample:build-national-signal-snapshot -- <national-tl-drct-info-response.json> <signal-snapshot.json> <crsrdId> <nextPhase> <controllerMode> <manualOverride>"
    };
  }

  try {
    const response = await readJsonFile(responsePath, readFileImpl);
    const row = selectNationalTrafficSignalRow(response, { crsrdId });
    const normalized = normalizeNationalTrafficSignalRow(row);
    const selected = buildStraightSignalCandidates(row)[0];

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

function selectNationalTrafficSignalRow(input, selector) {
  const rows = extractRows(input);
  const matches = rows.filter((row) => String(row.crsrdId) === selector.crsrdId);
  if (matches.length === 0) {
    throw new Error(`tl_drct_info row not found for crsrdId=${selector.crsrdId}`);
  }

  return [...matches].sort(
    (a, b) => parseTotDt(b.totDt).getTime() - parseTotDt(a.totDt).getTime()
  )[0];
}

function extractRows(input) {
  if (Array.isArray(input)) {
    return input.map((row) => requireRecord(row, "tl_drct_info row"));
  }

  const root = requireRecord(input, "national traffic signal response");
  const response = getOptionalRecord(root.response);
  const body = response ? getOptionalRecord(response.body) : getOptionalRecord(root.body);
  const items = body ? getOptionalRecord(body.items) : null;
  const item = items?.item ?? body?.item ?? root.item ?? input;

  if (Array.isArray(item)) {
    return item.map((row) => requireRecord(row, "tl_drct_info row"));
  }
  return [requireRecord(item, "tl_drct_info row")];
}

function normalizeNationalTrafficSignalRow(raw) {
  const stdgCd = requireNonEmptyString(raw.stdgCd, "stdgCd");
  const crsrdId = requireNonEmptyString(raw.crsrdId, "crsrdId");
  return {
    controllerId: `national-traffic-signal:${stdgCd}:${crsrdId}`,
    capturedAt: parseTotDt(raw.totDt).toISOString()
  };
}

function buildStraightSignalCandidates(raw) {
  return CARDINAL_STRAIGHT_FIELDS.map(({ direction, sourceField, statusField }) => {
    const remainingSeconds = normalizeCentiseconds(raw[sourceField]);
    return remainingSeconds === null
      ? null
      : {
          direction,
          remainingSeconds,
          sourceField,
          statusField,
          statusName:
            raw[statusField] === null || raw[statusField] === undefined
              ? null
              : String(raw[statusField])
        };
  })
    .filter(Boolean)
    .sort((a, b) => b.remainingSeconds - a.remainingSeconds);
}

function normalizeCentiseconds(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const centiseconds =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(centiseconds) || centiseconds <= 0) {
    return null;
  }
  return Math.ceil(centiseconds / 100);
}

function parseTotDt(value) {
  const text = requireNonEmptyString(value, "totDt");
  const match = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    throw new Error("totDt must use YYYYMMDDHHmmss");
  }
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 9,
      Number(minute),
      Number(second)
    )
  );
  if (Number.isNaN(date.getTime())) {
    throw new Error("totDt must be a valid timestamp");
  }
  return date;
}

function getOptionalRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
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

function requireOneOf(value, allowed, label) {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${label} is not supported`);
  }
  return value;
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [
    responsePath,
    outputPath,
    crsrdId,
    nextPhase,
    controllerMode,
    manualOverrideText
  ] = process.argv.slice(2);
  const result = await buildNationalTrafficSignalSnapshotFile({
    responsePath,
    outputPath,
    crsrdId,
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
