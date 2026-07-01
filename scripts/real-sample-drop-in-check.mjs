import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_ENDPOINT_URL = "http://localhost:3000/api/real-sample-drop-in";

export async function checkRealSampleDropInFile({
  filePath,
  endpointUrl = DEFAULT_ENDPOINT_URL,
  offline = false,
  readFile: readFileImpl = readFile,
  fetchImpl = fetch
}) {
  if (!filePath) {
    return {
      exitCode: 2,
      summary: null,
      output:
        "Usage: npm run real-sample:check -- [--offline] <live-input-envelope.json> [endpointUrl]"
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

  if (offline) {
    const summary = validateOfflinePayload(payload);
    return {
      exitCode: summary.accepted ? 0 : 1,
      summary,
      output: formatValidationSummary(summary)
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
    ...(summary.validationMode ? [`validationMode=${summary.validationMode}`] : []),
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
  const args = process.argv.slice(2);
  const offline = args.includes("--offline");
  const positionalArgs = args.filter((arg) => arg !== "--offline");
  const result = await checkRealSampleDropInFile({
    filePath: positionalArgs[0],
    endpointUrl: positionalArgs[1] ?? DEFAULT_ENDPOINT_URL,
    offline
  });
  const write = result.exitCode === 0 ? console.log : console.error;
  write(result.output);
  process.exit(result.exitCode);
}

function validateOfflinePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    errors.push("live input envelope must be an object");
  } else {
    validateOfflineEnvelope(payload, errors);
  }

  if (errors.length > 0) {
    return buildOfflineSummary({
      accepted: false,
      operatorWorkflowStatus: "manual_review_required",
      selectedPolicy: "safety_hold",
      confidence: "low",
      requiredInputs: inferOfflineRequiredInputs(errors),
      validationErrors: errors
    });
  }

  return buildOfflineSummary({
    accepted: true,
    operatorWorkflowStatus: "approval_review_ready",
    selectedPolicy: "offline_shape_check",
    confidence: "high",
    requiredInputs: [],
    validationErrors: []
  });
}

function validateOfflineEnvelope(envelope, errors) {
  if (envelope.schemaVersion !== "live-input.v1") {
    errors.push("schemaVersion must be live-input.v1");
  }
  requireNonEmptyString(envelope.intersectionId, "intersectionId", errors);
  requireIsoDateString(envelope.receivedAt, "receivedAt", errors);

  const frames = Array.isArray(envelope.cameraFrames)
    ? envelope.cameraFrames
    : null;
  if (!frames || frames.length === 0) {
    errors.push("cameraFrames must contain at least one frame");
  } else {
    frames.forEach((frame, index) =>
      validateOfflineCameraFrame(frame, `cameraFrames[${index}]`, errors)
    );
  }

  if (!envelope.signalSnapshot || typeof envelope.signalSnapshot !== "object") {
    errors.push("signalSnapshot is required for replay-compatible input");
  } else {
    validateOfflineSignalSnapshot(envelope.signalSnapshot, errors);
  }

  const provenanceError = getProhibitedSampleIdentifierError(envelope);
  if (provenanceError) {
    errors.push(provenanceError);
  }
}

function validateOfflineCameraFrame(frame, label, errors) {
  if (!frame || typeof frame !== "object" || Array.isArray(frame)) {
    errors.push(`${label} must be an object`);
    return;
  }

  requireNonEmptyString(frame.cameraId, `${label}.cameraId`, errors);
  requireNonEmptyString(frame.frameId, `${label}.frameId`, errors);
  requireIsoDateString(frame.capturedAt, `${label}.capturedAt`, errors);

  if (!Array.isArray(frame.detections)) {
    errors.push(`${label}.detections must be an array`);
    return;
  }

  frame.detections.forEach((detection, index) =>
    validateOfflineDetection(
      detection,
      `${label}.detections[${index}]`,
      errors
    )
  );
}

function validateOfflineDetection(detection, label, errors) {
  if (!detection || typeof detection !== "object" || Array.isArray(detection)) {
    errors.push(`${label} must be an object`);
    return;
  }

  requireNonEmptyString(detection.objectId, `${label}.objectId`, errors);
  requireOneOf(
    detection.classLabel,
    ["vehicle", "emergency_vehicle", "pedestrian", "stalled_vehicle"],
    `${label}.classLabel`,
    errors
  );
  requireNumberInRange(detection.confidence, `${label}.confidence`, 0, 1, errors);
  requireOneOf(
    detection.direction,
    ["north", "south", "east", "west"],
    `${label}.direction`,
    errors
  );
  requireNonEmptyString(detection.laneId, `${label}.laneId`, errors);
  requireNonNegativeInteger(detection.count, `${label}.count`, errors);
}

function validateOfflineSignalSnapshot(signal, errors) {
  requireNonEmptyString(signal.controllerId, "signalSnapshot.controllerId", errors);
  requireIsoDateString(signal.capturedAt, "signalSnapshot.capturedAt", errors);
  requireOneOf(
    signal.currentPhase,
    ["north_priority", "south_priority", "east_priority", "west_priority", "normal_cycle"],
    "signalSnapshot.currentPhase",
    errors
  );
  requireNonNegativeInteger(
    signal.remainingSeconds,
    "signalSnapshot.remainingSeconds",
    errors
  );
  requireOneOf(
    signal.nextPhase,
    ["north_priority", "south_priority", "east_priority", "west_priority", "normal_cycle"],
    "signalSnapshot.nextPhase",
    errors
  );
  requireOneOf(
    signal.controllerMode,
    ["adaptive", "fixed", "manual"],
    "signalSnapshot.controllerMode",
    errors
  );
  if (typeof signal.manualOverride !== "boolean") {
    errors.push("signalSnapshot.manualOverride must be a boolean");
  }
}

function buildOfflineSummary({
  accepted,
  operatorWorkflowStatus,
  selectedPolicy,
  confidence,
  requiredInputs,
  validationErrors
}) {
  return {
    validationMode: "offline_shape_check",
    accepted,
    replayStatus: accepted ? "replay_input_ready" : "rejected",
    recommendation: null,
    operatorWorkflowStatus,
    selectedPolicy,
    confidence,
    requiredInputs,
    validationErrors
  };
}

function getProhibitedSampleIdentifierError(envelope) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    return null;
  }

  const frames = Array.isArray(envelope.cameraFrames) ? envelope.cameraFrames : [];
  const identifiers = [
    envelope.intersectionId,
    ...frames.flatMap((frame) => [
      frame?.cameraId,
      frame?.frameId,
      ...(Array.isArray(frame?.detections)
        ? frame.detections.map((detection) => detection?.objectId)
        : [])
    ]),
    envelope.signalSnapshot?.controllerId
  ];

  if (
    identifiers.some(
      (identifier) =>
        typeof identifier === "string" && /(?:fixture|synthetic)/i.test(identifier)
    )
  ) {
    return "fixture_or_synthetic_sample_not_allowed";
  }
  if (
    identifiers.some(
      (identifier) =>
        typeof identifier === "string" &&
        /(?:placeholder|example|mock|demo)/i.test(identifier)
    )
  ) {
    return "placeholder_or_demo_sample_not_allowed";
  }
  return null;
}

function hasProhibitedSampleIdentifierError(errors) {
  return errors.some(
    (identifier) =>
      identifier === "fixture_or_synthetic_sample_not_allowed" ||
      identifier === "placeholder_or_demo_sample_not_allowed"
  );
}

function inferOfflineRequiredInputs(errors) {
  if (hasProhibitedSampleIdentifierError(errors)) {
    return ["authorized_real_sample_identifiers"];
  }
  if (errors.some((error) => error.includes("signalSnapshot"))) {
    return ["signalSnapshot"];
  }
  if (errors.some((error) => error.includes("cameraFrames"))) {
    return ["cameraFrames"];
  }
  if (errors.some((error) => error.includes("schemaVersion"))) {
    return ["schemaVersion"];
  }
  return ["live-input.v1 envelope"];
}

function requireNonEmptyString(value, label, errors) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${label} must be a non-empty string`);
  }
}

function requireIsoDateString(value, label, errors) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    errors.push(`${label} must be an ISO date string`);
  }
}

function requireOneOf(value, allowed, label, errors) {
  if (!allowed.includes(value)) {
    errors.push(`${label} must be one of ${allowed.join(", ")}`);
  }
}

function requireNumberInRange(value, label, min, max, errors) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    errors.push(`${label} must be a number between ${min} and ${max}`);
  }
}

function requireNonNegativeInteger(value, label, errors) {
  if (!Number.isInteger(value) || value < 0) {
    errors.push(`${label} must be a non-negative integer`);
  }
}
