import { pathToFileURL } from "node:url";

const DEFAULT_WEB_BASE_URL = process.env.DEMO_WEB_BASE_URL ?? "http://localhost:3000";
const DEFAULT_API_BASE_URL = process.env.DEMO_API_BASE_URL ?? "http://127.0.0.1:8000";
const DEFAULT_TIMEOUT_MS = 5000;

export async function runDemoHealthCheck({
  fetchImpl = globalThis.fetch,
  webBaseUrl = DEFAULT_WEB_BASE_URL,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const normalizedWebBaseUrl = trimTrailingSlash(webBaseUrl);
  const normalizedApiBaseUrl = trimTrailingSlash(apiBaseUrl);
  const checks = [];

  checks.push(
    await runCheck(
      "web dashboard",
      `${normalizedWebBaseUrl}/dashboard`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        await expectOk(response);
        return "dashboard responded";
      }
    )
  );

  checks.push(
    await runCheck(
      "live input fixture export",
      `${normalizedWebBaseUrl}/api/live-input-fixture`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (
          payload.source !== "local_fixture_adapter" ||
          payload.schemaVersion !== "live-input.v1" ||
          payload.replaySummary?.status !== "replay_input_ready"
        ) {
          throw new Error("unexpected live-input fixture payload");
        }
        return "live-input.v1 replay fixture ready";
      }
    )
  );

  checks.push(
    await runCheck(
      "source-specific live input fixture export",
      `${normalizedWebBaseUrl}/api/source-live-input-fixture`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (
          payload.source !== "source_specific_adapter_fixture" ||
          payload.sourceFormats?.detector !== "road-vision.fixture.v1" ||
          payload.sourceFormats?.signal !== "signal-controller.fixture.v1" ||
          payload.envelope?.schemaVersion !== "live-input.v1" ||
          payload.replaySummary?.status !== "replay_input_ready" ||
          !Array.isArray(payload.replaySummary?.detectionTypes) ||
          !payload.replaySummary.detectionTypes.includes("emergency_vehicle")
        ) {
          throw new Error("unexpected source-specific live-input fixture payload");
        }
        return "source-specific adapter replay fixture ready";
      }
    )
  );

  checks.push(
    await runCheck(
      "demo evidence export",
      `${normalizedWebBaseUrl}/api/demo-evidence-export`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        const tenKSuite = Array.isArray(payload.liveInputJsonSuites)
          ? payload.liveInputJsonSuites.find((suite) => suite.id === "10k")
          : null;
        if (
          payload.source !== "demo_evidence_export" ||
          payload.schemaVersion !== "demo-evidence.v1" ||
          payload.syntheticBenchmark?.totalCases !== 5000 ||
          payload.syntheticBenchmark?.passedCases !== 5000 ||
          payload.syntheticBenchmark?.failedCases !== 0 ||
          tenKSuite?.totalCases !== 10000 ||
          tenKSuite?.passedCases !== 10000 ||
          tenKSuite?.failedCases !== 0 ||
          payload.liveInputGuardrails?.guardedCases !== 5 ||
          payload.liveInputGuardrails?.missedCases !== 0 ||
          payload.sourceAdapter?.replayStatus !== "replay_input_ready" ||
          payload.realSampleReadiness?.status !==
            "adapter_ready_waiting_for_live_signal_response" ||
          payload.realSampleReadiness?.adapterBoundary !== "live-input.v1" ||
          payload.realSampleReadiness?.dropInEndpoint !== "/api/real-sample-drop-in"
        ) {
          throw new Error("unexpected demo evidence export payload");
        }
        return "downloadable evidence summary ready";
      }
    )
  );

  checks.push(
    await runCheck(
      "policy scorecard contract export",
      `${normalizedWebBaseUrl}/api/policy-scorecard-contract`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (
          payload.source !== "policy_scorecard_contract" ||
          payload.schemaVersion !== "policy-scorecard-contract.v1" ||
          payload.operatorWorkflowSource !== "policy_scorecard" ||
          payload.adapterBoundary !== "live-input.v1" ||
          payload.decisionBoundary !== "operator_decision_support_not_signal_control" ||
          payload.policyCount !== 6 ||
          !Array.isArray(payload.scorecardBackedPolicies) ||
          !payload.scorecardBackedPolicies.includes("safety_gate") ||
          !payload.scorecardBackedPolicies.includes("emergency_clearance") ||
          !payload.scorecardBackedPolicies.includes("queue_relief") ||
          !Array.isArray(payload.decisionOrder) ||
          payload.decisionOrder.join(">") !==
            "safety_gate>safety_hold>emergency_clearance>queue_relief>pedestrian_efficiency>maintain_cycle" ||
          payload.scoringConstants?.queueThreshold !== 25 ||
          payload.scoringConstants?.safetyGateAllRedSeconds !== 10 ||
          payload.scoringConstants?.unknownEmergencyDirectionAllRedSeconds !== 6 ||
          payload.scoringConstants?.conflictingQueueAxesAllRedSeconds !== 6 ||
          !Array.isArray(payload.requiredEvidence) ||
          !payload.requiredEvidence.includes("selected_policy") ||
          !payload.requiredEvidence.includes("operator_note")
        ) {
          throw new Error("unexpected policy scorecard contract payload");
        }
        return "policy scorecard contract ready";
      }
    )
  );

  checks.push(
    await runCheck(
      "final local readiness export",
      `${normalizedWebBaseUrl}/api/final-local-readiness`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (
          payload.source !== "final_local_readiness_reconciliation" ||
          payload.schemaVersion !== "final-local-readiness.v1" ||
          payload.localRehearsalStatus !== "ready_for_local_rehearsal" ||
          payload.realSampleStatus !==
            "adapter_ready_waiting_for_live_signal_response" ||
          payload.decisionBoundary !== "operator_decision_support_not_signal_control" ||
          payload.adapterBoundary !== "live-input.v1" ||
          payload.healthCheck?.expectedSummary !== "15/15 checks passed" ||
          !Array.isArray(payload.evidenceEndpoints) ||
          !payload.evidenceEndpoints.includes("/api/demo-evidence-export") ||
          !payload.evidenceEndpoints.includes("/api/policy-scorecard-contract") ||
          !payload.evidenceEndpoints.includes("/api/llm-explanation-contract") ||
          !payload.evidenceEndpoints.includes("/api/live-input-submission-schema") ||
          !payload.evidenceEndpoints.includes("/api/real-sample-drop-in") ||
          payload.localEvidence?.syntheticBenchmark !== "5000/5000" ||
          payload.localEvidence?.liveInputJson !== "10000/10000" ||
          payload.localEvidence?.scorecardPolicies !== 6 ||
          !Array.isArray(payload.blockers) ||
          !payload.blockers.includes("fresh_camera_frame_required_for_live_drop_in") ||
          !payload.blockers.includes("live_signal_phase_remaining_time_required")
        ) {
          throw new Error("unexpected final local readiness payload");
        }
        return "final local readiness reconciled";
      }
    )
  );

  checks.push(
    await runCheck(
      "llm explanation contract",
      `${normalizedWebBaseUrl}/api/llm-explanation-contract`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (
          payload.source !== "llm_explanation_contract" ||
          payload.schemaVersion !== "llm-explanation-contract.v1" ||
          payload.role !== "explanation_review_only" ||
          payload.decisionSource !== "local_policy_scorecard" ||
          payload.decisionBoundary !== "operator_decision_support_not_signal_control" ||
          payload.noOpenAICallRequired !== true ||
          !Array.isArray(payload.evidenceEndpoints) ||
          !payload.evidenceEndpoints.includes("/api/policy-scorecard-contract") ||
          !Array.isArray(payload.prohibitedResponsibilities) ||
          !payload.prohibitedResponsibilities.includes(
            "choose a signal plan independently"
          ) ||
          !Array.isArray(payload.evaluationCriteria) ||
          payload.evaluationCriteria.join(">") !==
            "simulation_only_boundary>no_real_signal_control>policy_evidence_grounding"
        ) {
          throw new Error("unexpected llm explanation contract payload");
        }
        return "LLM explanation boundary ready";
      }
    )
  );

  checks.push(
    await runCheck(
      "real sample intake package",
      `${normalizedWebBaseUrl}/api/real-sample-intake-package`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (
          payload.source !== "real_sample_intake_package" ||
          payload.schemaVersion !== "real-sample-intake-package.v1" ||
          payload.status !== "adapter_ready_waiting_for_live_signal_response" ||
          payload.adapterBoundary !== "live-input.v1" ||
          payload.dropInEndpoint !== "/api/real-sample-drop-in" ||
          payload.schemaEndpoint !== "/api/live-input-submission-schema" ||
          payload.finalReadinessEndpoint !== "/api/final-local-readiness" ||
          payload.noPersistence !== true ||
          !Array.isArray(payload.sampleSlotIds) ||
          !payload.sampleSlotIds.includes("authorized_cctv_frame_or_video") ||
          !payload.sampleSlotIds.includes("signal_phase_remaining_time") ||
          !payload.sampleSlotIds.includes("detector_output") ||
          !Array.isArray(payload.envelopeRequirements?.requiredTopLevelFields) ||
          !payload.envelopeRequirements.requiredTopLevelFields.includes("cameraFrames") ||
          !Array.isArray(payload.validationGuardrails) ||
          !payload.validationGuardrails.includes(
            "manual review when any detection confidence is below 0.5"
          ) ||
          !Array.isArray(payload.prohibitedInputs) ||
          !payload.prohibitedInputs.includes("raw stream credentials")
        ) {
          throw new Error("unexpected real sample intake package payload");
        }
        return "real-sample intake package ready";
      }
    )
  );

  checks.push(
    await runCheck(
      "live input submission schema",
      `${normalizedWebBaseUrl}/api/live-input-submission-schema`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (
          payload.source !== "live_input_submission_schema" ||
          payload.schemaVersion !== "live-input-submission-schema.v1" ||
          payload.adapterBoundary !== "live-input.v1" ||
          payload.dropInEndpoint !== "/api/real-sample-drop-in" ||
          payload.decisionBoundary !== "operator_decision_support_not_signal_control" ||
          payload.jsonSchema?.properties?.schemaVersion?.const !== "live-input.v1" ||
          !Array.isArray(payload.jsonSchema?.required) ||
          !payload.jsonSchema.required.includes("signalSnapshot") ||
          payload.jsonSchema?.properties?.signalSnapshot?.type !== "object" ||
          !Array.isArray(payload.guardrailNotes) ||
          !payload.guardrailNotes.includes(
            "schema requires a signal snapshot because /api/real-sample-drop-in validates replay-ready submissions"
          )
        ) {
          throw new Error("unexpected live-input submission schema payload");
        }
        return "live-input.v1 submission schema ready";
      }
    )
  );

  checks.push(
    await runCheck(
      "real sample drop-in readiness",
      `${normalizedWebBaseUrl}/api/real-sample-drop-in`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        const slotIds = Array.isArray(payload.sampleSlots)
          ? payload.sampleSlots.map((slot) => slot.id)
          : [];
        if (
          payload.source !== "real_sample_drop_in_readiness" ||
          payload.schemaVersion !== "real-sample-drop-in.v1" ||
          payload.status !== "adapter_ready_waiting_for_live_signal_response" ||
          payload.adapterBoundary !== "live-input.v1" ||
          !slotIds.includes("authorized_cctv_frame_or_video") ||
          !slotIds.includes("signal_phase_remaining_time") ||
          !slotIds.includes("detector_output") ||
          !Array.isArray(payload.validationFlow) ||
          !payload.validationFlow.includes("run local recommendation policy")
        ) {
          throw new Error("unexpected real sample drop-in payload");
        }
        return "real-sample drop-in slot ready";
      }
    )
  );

  checks.push(
    await runCheck(
      "real sample drop-in validation",
      `${normalizedWebBaseUrl}/api/real-sample-drop-in`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (
          payload.source !== "real_sample_drop_in_validation" ||
          payload.accepted !== true ||
          payload.replayStatus !== "replay_input_ready" ||
          payload.recommendation !== "emergency_priority" ||
          payload.operatorWorkflowStatus !== "approval_review_ready" ||
          payload.operatorWorkflow?.source !== "policy_scorecard" ||
          payload.operatorWorkflow?.contractEndpoint !==
            "/api/policy-scorecard-contract" ||
          payload.operatorWorkflow?.status !== "approval_review_ready" ||
          payload.operatorWorkflow?.selectedPolicy !== "emergency_clearance" ||
          payload.operatorWorkflow?.confidence !== "high"
        ) {
          throw new Error("unexpected real sample drop-in validation payload");
        }
        return "real-sample drop-in validation path ready";
      },
      {
        method: "POST",
        body: JSON.stringify(buildDemoLiveInputEnvelope()),
        headers: { "Content-Type": "application/json" }
      }
    )
  );

  checks.push(
    await runCheck(
      "synthetic benchmark export",
      `${normalizedWebBaseUrl}/api/synthetic-benchmark-export`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (
          payload.source !== "synthetic_benchmark" ||
          payload.report?.totalCases !== 5000 ||
          payload.report?.passedCases !== 5000 ||
          payload.report?.failedCases !== 0
        ) {
          throw new Error("unexpected synthetic benchmark payload");
        }
        return "5K synthetic benchmark passed";
      }
    )
  );

  checks.push(
    await runCheck(
      "synthetic live-input JSON export",
      `${normalizedWebBaseUrl}/api/synthetic-live-input-export?size=1k`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (
          payload.source !== "synthetic_live_input_json" ||
          payload.schemaVersion !== "live-input.v1" ||
          !Array.isArray(payload.dataset) ||
          payload.dataset.length !== 1000 ||
          payload.evaluation?.totalCases !== 1000 ||
          payload.evaluation?.passedCases !== 1000 ||
          payload.evaluation?.failedCases !== 0
        ) {
          throw new Error("unexpected synthetic live-input JSON payload");
        }
        return "1K live-input.v1 JSON cases passed";
      }
    )
  );

  checks.push(
    await runCheck(
      "api health",
      `${normalizedApiBaseUrl}/health`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        if (payload.status !== "ok") {
          throw new Error("API health did not return status=ok");
        }
        return "API health ok";
      }
    )
  );

  checks.push(
    await runCheck(
      "openai readiness",
      `${normalizedApiBaseUrl}/api/runtime/readiness?section=openai`,
      fetchImpl,
      timeoutMs,
      async (response) => {
        const payload = await expectJson(response);
        const openai = payload.openai;
        if (!openai || openai.ready !== true) {
          const missing = Array.isArray(openai?.missing)
            ? openai.missing.join(", ") || "-"
            : "-";
          throw new Error(
            `OpenAI readiness missing: ${missing}. If .env.local was updated recently, restart the API server.`
          );
        }
        return `OpenAI ready mode=${openai.mode ?? "unknown"}`;
      }
    )
  );

  const passedCount = checks.filter((check) => check.passed).length;

  return {
    passed: passedCount === checks.length,
    checks,
    summary: `${passedCount}/${checks.length} checks passed`
  };
}

export function formatDemoHealthCheckResult(result) {
  const lines = ["Demo health check"];

  for (const check of result.checks) {
    const status = check.passed ? "PASS" : "FAIL";
    lines.push(`${status} ${check.name}: ${check.detail}`);
  }

  lines.push(`Summary: ${result.summary}`);
  return lines.join("\n");
}

async function runCheck(name, url, fetchImpl, timeoutMs, evaluate, init = {}) {
  try {
    const response = await fetchImpl(url, buildFetchOptions(timeoutMs, init));
    const detail = await evaluate(response);
    return { name, url, passed: true, detail };
  } catch (error) {
    return {
      name,
      url,
      passed: false,
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function expectOk(response) {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

async function expectJson(response) {
  await expectOk(response);
  try {
    return await response.json();
  } catch {
    throw new Error("response was not valid JSON");
  }
}

function buildFetchOptions(timeoutMs, init = {}) {
  const options = { ...init };
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return { ...options, signal: AbortSignal.timeout(timeoutMs) };
  }
  return options;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function buildDemoLiveInputEnvelope() {
  return {
    schemaVersion: "live-input.v1",
    intersectionId: "INT-REAL-SAMPLE-0001",
    receivedAt: "2026-07-01T09:10:01.000Z",
    cameraFrames: [
      {
        cameraId: "authorized-cctv-east-01",
        frameId: "authorized-frame-0001",
        capturedAt: "2026-07-01T09:10:00.000Z",
        detections: [
          {
            objectId: "det-emergency-001",
            classLabel: "emergency_vehicle",
            confidence: 0.96,
            direction: "east",
            laneId: "east_approach_1",
            count: 1,
            distanceMeters: 70
          }
        ]
      }
    ],
    signalSnapshot: {
      controllerId: "signal-controller-real-01",
      capturedAt: "2026-07-01T09:10:00.000Z",
      currentPhase: "east_priority",
      remainingSeconds: 18,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    }
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runDemoHealthCheck();
  const output = formatDemoHealthCheckResult(result);
  if (result.passed) {
    console.log(output);
  } else {
    console.error(output);
  }
  process.exit(result.passed ? 0 : 1);
}
