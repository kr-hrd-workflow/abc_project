import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_ENDPOINT_URL = "http://localhost:3000/api/real-sample-drop-in";

export async function checkRealSampleDropInFile({
  filePath,
  endpointUrl = DEFAULT_ENDPOINT_URL,
  readFile: readFileImpl = readFile,
  fetchImpl = fetch
}) {
  if (!filePath) {
    return {
      exitCode: 2,
      summary: null,
      output:
        "Usage: npm run real-sample:check -- <live-input-envelope.json> [endpointUrl]"
    };
  }

  let payloadText;
  try {
    payloadText = await readFileImpl(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 2,
      summary: null,
      output: `Could not read ${filePath}: ${message}`
    };
  }

  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 2,
      summary: null,
      output: `Invalid JSON in ${filePath}: ${message}`
    };
  }

  const response = await fetchImpl(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await parseResponseBody(response);
  const summary = summarizeValidation(body);

  return {
    exitCode: summary.accepted ? 0 : 1,
    summary,
    output: formatValidationSummary(summary)
  };
}

async function parseResponseBody(response) {
  try {
    return await response.json();
  } catch {
    return {
      accepted: false,
      replayStatus: "rejected",
      recommendation: null,
      operatorWorkflowStatus: "manual_review_required",
      operatorWorkflow: {
        selectedPolicy: "safety_hold",
        confidence: "low",
        requiredInputs: [],
        blockedReasons: []
      },
      validationErrors: [`drop-in endpoint returned HTTP ${response.status}`]
    };
  }
}

function summarizeValidation(body) {
  return {
    accepted: Boolean(body?.accepted),
    replayStatus: body?.replayStatus ?? "rejected",
    recommendation: body?.recommendation ?? null,
    operatorWorkflowStatus:
      body?.operatorWorkflowStatus ?? "manual_review_required",
    selectedPolicy: body?.operatorWorkflow?.selectedPolicy ?? "safety_hold",
    confidence: body?.operatorWorkflow?.confidence ?? "low",
    requiredInputs: Array.isArray(body?.operatorWorkflow?.requiredInputs)
      ? body.operatorWorkflow.requiredInputs
      : [],
    validationErrors: Array.isArray(body?.validationErrors)
      ? body.validationErrors
      : []
  };
}

function formatValidationSummary(summary) {
  return [
    `accepted=${summary.accepted}`,
    `replayStatus=${summary.replayStatus}`,
    `recommendation=${summary.recommendation ?? "none"}`,
    `operatorWorkflowStatus=${summary.operatorWorkflowStatus}`,
    `selectedPolicy=${summary.selectedPolicy}`,
    `confidence=${summary.confidence}`,
    `requiredInputs=${summary.requiredInputs.join(",") || "none"}`,
    `validationErrors=${summary.validationErrors.join("; ") || "none"}`
  ].join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkRealSampleDropInFile({
    filePath: process.argv[2],
    endpointUrl: process.argv[3] ?? DEFAULT_ENDPOINT_URL
  });
  const write = result.exitCode === 0 ? console.log : console.error;
  write(result.output);
  process.exit(result.exitCode);
}
