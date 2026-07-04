import { buildDemoEvidenceExport } from "./demoEvidenceExport";
import { buildPolicyScorecardContractExport } from "./policyScorecardContractExport";

export type FinalLocalReadinessExport = {
  source: "final_local_readiness_reconciliation";
  schemaVersion: "final-local-readiness.v1";
  generatedAt: string;
  localRehearsalStatus: "ready_for_local_rehearsal";
  realSampleStatus: "signal_ready_waiting_for_fresh_camera_and_calibration";
  decisionBoundary: "operator_decision_support_not_signal_control";
  adapterBoundary: "live-input.v1";
  healthCheck: {
    expectedSummary: "16/16 checks passed";
    command: "npm run demo:health";
  };
  realSampleCheck: {
    command: "npm run real-sample:check -- <live-input-envelope.json>";
    offlineCommand: "npm run real-sample:check -- --offline <live-input-envelope.json>";
    requiresRunningWebServer: true;
    endpoint: "/api/real-sample-drop-in";
  };
  evidenceEndpoints: string[];
  localEvidence: {
    syntheticBenchmark: string;
    liveInputJson: string;
    guardrails: string;
    scorecardPolicies: number;
    crossroadMetadata: string;
    sourceAdapterReplayStatus: "replay_input_ready";
  };
  blockers: string[];
  nextRequiredInputs: string[];
  nextAction: string;
};

export function buildFinalLocalReadinessExport({
  generatedAt = new Date().toISOString()
}: {
  generatedAt?: string;
} = {}): FinalLocalReadinessExport {
  const demoEvidence = buildDemoEvidenceExport({ generatedAt });
  const scorecardContract = buildPolicyScorecardContractExport({ generatedAt });
  const tenKSuite = demoEvidence.liveInputJsonSuites.find((suite) => suite.id === "10k");

  return {
    source: "final_local_readiness_reconciliation",
    schemaVersion: "final-local-readiness.v1",
    generatedAt,
    localRehearsalStatus: "ready_for_local_rehearsal",
    realSampleStatus: demoEvidence.realSampleReadiness.status,
    decisionBoundary: scorecardContract.decisionBoundary,
    adapterBoundary: demoEvidence.realSampleReadiness.adapterBoundary,
    healthCheck: {
      expectedSummary: "16/16 checks passed",
      command: "npm run demo:health"
    },
    realSampleCheck: {
      command: "npm run real-sample:check -- <live-input-envelope.json>",
      offlineCommand:
        "npm run real-sample:check -- --offline <live-input-envelope.json>",
      requiresRunningWebServer: true,
      endpoint: demoEvidence.realSampleReadiness.dropInEndpoint
    },
    evidenceEndpoints: [
      "/api/demo-evidence-export",
      demoEvidence.operatorWorkflow.contractEndpoint,
      demoEvidence.operatorWorkflow.llmExplanationContractEndpoint,
      "/api/live-input-submission-schema",
      "/api/real-sample-source-schema",
      "/api/real-sample-intake-package",
      demoEvidence.realSampleReadiness.dropInEndpoint,
      "/api/live-input-fixture",
      "/api/source-live-input-fixture",
      "/api/synthetic-live-input-export?size=10k"
    ],
    localEvidence: {
      syntheticBenchmark: `${demoEvidence.syntheticBenchmark.passedCases}/${demoEvidence.syntheticBenchmark.totalCases}`,
      liveInputJson: tenKSuite
        ? `${tenKSuite.passedCases}/${tenKSuite.totalCases}`
        : "0/0",
      guardrails: `${demoEvidence.liveInputGuardrails.guardedCases} guarded / ${demoEvidence.liveInputGuardrails.missedCases} misses`,
      scorecardPolicies: scorecardContract.policyCount,
      crossroadMetadata: `${demoEvidence.realSampleReadiness.crossroadMetadata.normalizedCounts.intersections} intersections / ${demoEvidence.realSampleReadiness.crossroadMetadata.normalizedCounts.signalPlans} signal plans`,
      sourceAdapterReplayStatus: demoEvidence.sourceAdapter.replayStatus
    },
    blockers: [
      demoEvidence.realSampleReadiness.cctv.blocker,
      demoEvidence.realSampleReadiness.calibration.blocker
    ],
    nextRequiredInputs: demoEvidence.realSampleReadiness.nextRequiredInputs,
    nextAction:
      "Pair the key-backed cardinal signal evidence with a fresh authorized camera frame, calibrate approach direction, then POST a live-input.v1 envelope to /api/real-sample-drop-in."
  };
}
