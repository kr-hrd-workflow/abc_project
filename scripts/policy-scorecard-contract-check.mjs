import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const apiDir = path.join(repoRoot, "apps", "api");
const webContractPath = path.join(
  repoRoot,
  "apps",
  "web",
  "lib",
  "policyScorecardContract.ts"
);

const backendDumpCode = `
import json
from app.services.recommendations import (
    POLICY_DECISION_ORDER,
    POLICY_SCORING_CONSTANTS,
    POLICY_SCORECARD_REQUIRED_EVIDENCE,
    POLICY_SCORECARD_BACKED_POLICIES,
)
print(json.dumps({
    "scorecardBackedPolicies": list(POLICY_SCORECARD_BACKED_POLICIES),
    "decisionOrder": list(POLICY_DECISION_ORDER),
    "scoringConstants": POLICY_SCORING_CONSTANTS,
    "requiredEvidence": list(POLICY_SCORECARD_REQUIRED_EVIDENCE),
}, sort_keys=True))
`;

function getApiPythonPath() {
  const candidates =
    process.platform === "win32"
      ? [
          path.join(apiDir, ".venv", "Scripts", "python.exe"),
          path.join(apiDir, ".venv", "bin", "python")
        ]
      : [
          path.join(apiDir, ".venv", "bin", "python"),
          path.join(apiDir, ".venv", "Scripts", "python.exe")
        ];

  const python = candidates.find((candidate) => existsSync(candidate));
  if (!python) {
    throw new Error(`API virtualenv python not found. Checked: ${candidates.join(", ")}`);
  }
  return python;
}

function defaultBackendContractDump() {
  return spawnSync(getApiPythonPath(), ["-c", backendDumpCode], {
    cwd: apiDir,
    encoding: "utf8"
  });
}

function extractStringArray(source, constantName) {
  const match = source.match(
    new RegExp(`export const ${constantName} = \\[([\\s\\S]*?)\\] as const;`)
  );
  if (!match) {
    throw new Error(`Could not find ${constantName}`);
  }
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function camelToSnake(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function extractScoringConstants(source) {
  const match = source.match(
    /export const POLICY_SCORING_CONSTANTS = \{([\s\S]*?)\} as const;/
  );
  if (!match) {
    throw new Error("Could not find POLICY_SCORING_CONSTANTS");
  }

  return Object.fromEntries(
    [...match[1].matchAll(/([a-zA-Z][a-zA-Z0-9]*):\s*(\d+)/g)].map(
      ([, key, value]) => [camelToSnake(key), Number(value)]
    )
  );
}

function parseWebPolicyContract(source) {
  return {
    scorecardBackedPolicies: extractStringArray(
      source,
      "POLICY_SCORECARD_BACKED_POLICIES"
    ),
    decisionOrder: extractStringArray(source, "POLICY_DECISION_ORDER"),
    scoringConstants: extractScoringConstants(source),
    requiredEvidence: extractStringArray(
      source,
      "POLICY_SCORECARD_REQUIRED_EVIDENCE"
    )
  };
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function appendMismatch(lines, label, backendValue, webValue) {
  if (stableJson(backendValue) === stableJson(webValue)) return;
  lines.push(`${label} mismatch`);
  lines.push(`backend=${stableJson(backendValue)}`);
  lines.push(`web=${stableJson(webValue)}`);
}

export async function checkPolicyScorecardContract({
  readFile: readFileImpl = readFile,
  runBackendContractDump = defaultBackendContractDump
} = {}) {
  const backendResult = runBackendContractDump();
  if (backendResult.status !== 0) {
    return {
      exitCode: 1,
      output: [
        "policy scorecard contract check failed",
        backendResult.stderr || "backend contract dump failed"
      ].join("\n")
    };
  }

  const backendContract = JSON.parse(backendResult.stdout);
  const webContract = parseWebPolicyContract(
    await readFileImpl(webContractPath, "utf8")
  );
  const mismatches = [];

  appendMismatch(
    mismatches,
    "scorecardBackedPolicies",
    backendContract.scorecardBackedPolicies,
    webContract.scorecardBackedPolicies
  );
  appendMismatch(
    mismatches,
    "decisionOrder",
    backendContract.decisionOrder,
    webContract.decisionOrder
  );
  appendMismatch(
    mismatches,
    "scoringConstants",
    backendContract.scoringConstants,
    webContract.scoringConstants
  );
  appendMismatch(
    mismatches,
    "requiredEvidence",
    backendContract.requiredEvidence,
    webContract.requiredEvidence
  );

  if (mismatches.length > 0) {
    return {
      exitCode: 1,
      output: ["policy scorecard contract drift detected", ...mismatches].join("\n")
    };
  }

  return {
    exitCode: 0,
    output: "policy scorecard contract aligned"
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await checkPolicyScorecardContract();
  console.log(result.output);
  process.exit(result.exitCode);
}
