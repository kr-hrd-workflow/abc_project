import { buildSourceSpecificLiveInputExport } from "./sourceLiveInputAdapter";
import { buildSyntheticBenchmarkExport } from "./syntheticBenchmarkExport";
import {
  buildSyntheticLiveInputEvaluationReport,
  buildSyntheticLiveInputGuardrailReport,
  LIVE_INPUT_JSON_EXPORT_SUITES
} from "./syntheticLiveInputDataset";
import type { SyntheticLiveInputExportSuiteId } from "./syntheticLiveInputDataset";
import {
  POLICY_SCORECARD_BACKED_POLICIES,
  POLICY_SCORECARD_REQUIRED_EVIDENCE,
  type PolicyScorecardBackedPolicy,
  type PolicyScorecardRequiredEvidence
} from "./policyScorecardContract";

export type DemoEvidenceExport = {
  source: "demo_evidence_export";
  schemaVersion: "demo-evidence.v1";
  generatedAt: string;
  syntheticBenchmark: {
    totalCases: number;
    passedCases: number;
    failedCases: number;
    passRatePercent: number;
  };
  liveInputJsonSuites: {
    id: SyntheticLiveInputExportSuiteId;
    label: string;
    totalCases: number;
    passedCases: number;
    failedCases: number;
    passRatePercent: number;
  }[];
  liveInputGuardrails: {
    totalCases: number;
    guardedCases: number;
    missedCases: number;
  };
  sourceAdapter: {
    detectorFormat: string;
    signalFormat: string;
    schemaVersion: "live-input.v1";
    replayStatus: "replay_input_ready";
    detectionTypes: string[];
  };
  operatorWorkflow: {
    source: "policy_scorecard";
    contractEndpoint: "/api/policy-scorecard-contract";
    llmExplanationContractEndpoint: "/api/llm-explanation-contract";
    supportedStatuses: ("approval_review_ready" | "manual_review_required")[];
    demonstratedStatuses: ("approval_review_ready" | "manual_review_required")[];
    scorecardBackedPolicies: PolicyScorecardBackedPolicy[];
    requiredEvidence: PolicyScorecardRequiredEvidence[];
  };
  realSampleReadiness: {
    status: "adapter_ready_waiting_for_live_signal_response";
    adapterBoundary: "live-input.v1";
    fixtureReplayStatus: "replay_input_ready";
    dropInEndpoint: "/api/real-sample-drop-in";
    cctv: {
      status: "authorized_historical_sample_available";
      blocker: "fresh_camera_frame_required_for_live_drop_in";
    };
    signal: {
      status: "key_backed_live_sample_captured";
      blocker: "signal_phase_model_compatibility_required";
    };
    nextRequiredInputs: string[];
  };
  presentationClaims: string[];
};

export function buildDemoEvidenceExport({
  generatedAt = new Date().toISOString()
}: {
  generatedAt?: string;
} = {}): DemoEvidenceExport {
  const benchmark = buildSyntheticBenchmarkExport().report;
  const guardrails = buildSyntheticLiveInputGuardrailReport();
  const sourceAdapter = buildSourceSpecificLiveInputExport();
  const liveInputJsonSuites = LIVE_INPUT_JSON_EXPORT_SUITES.map((suite) => {
    const report = buildSyntheticLiveInputEvaluationReport({
      caseCount: suite.caseCount,
      seed: suite.seed
    });

    return {
      id: suite.id,
      label: suite.label,
      totalCases: report.totalCases,
      passedCases: report.passedCases,
      failedCases: report.failedCases,
      passRatePercent: report.passRatePercent
    };
  });

  return {
    source: "demo_evidence_export",
    schemaVersion: "demo-evidence.v1",
    generatedAt,
    syntheticBenchmark: {
      totalCases: benchmark.totalCases,
      passedCases: benchmark.passedCases,
      failedCases: benchmark.failedCases,
      passRatePercent: benchmark.passRatePercent
    },
    liveInputJsonSuites,
    liveInputGuardrails: {
      totalCases: guardrails.totalCases,
      guardedCases: guardrails.guardedCases,
      missedCases: guardrails.missedCases
    },
    sourceAdapter: {
      detectorFormat: sourceAdapter.sourceFormats.detector,
      signalFormat: sourceAdapter.sourceFormats.signal,
      schemaVersion: sourceAdapter.envelope.schemaVersion,
      replayStatus: sourceAdapter.replaySummary.status,
      detectionTypes: sourceAdapter.replaySummary.detectionTypes
    },
    operatorWorkflow: {
      source: "policy_scorecard",
      contractEndpoint: "/api/policy-scorecard-contract",
      llmExplanationContractEndpoint: "/api/llm-explanation-contract",
      supportedStatuses: [
        "approval_review_ready",
        "manual_review_required"
      ],
      demonstratedStatuses: [
        "approval_review_ready",
        "manual_review_required"
      ],
      scorecardBackedPolicies: [...POLICY_SCORECARD_BACKED_POLICIES],
      requiredEvidence: [...POLICY_SCORECARD_REQUIRED_EVIDENCE]
    },
    realSampleReadiness: {
      status: "adapter_ready_waiting_for_live_signal_response",
      adapterBoundary: "live-input.v1",
      fixtureReplayStatus: sourceAdapter.replaySummary.status,
      dropInEndpoint: "/api/real-sample-drop-in",
      cctv: {
        status: "authorized_historical_sample_available",
        blocker: "fresh_camera_frame_required_for_live_drop_in"
      },
      signal: {
        status: "key_backed_live_sample_captured",
        blocker: "signal_phase_model_compatibility_required"
      },
      nextRequiredInputs: [
        "cardinal signal phase sample or intentional 8-direction signal phase model support",
        "fresh camera frame captured within 30 seconds of receivedAt",
        "camera-to-approach direction calibration for detector labels"
      ]
    },
    presentationClaims: [
      "Synthetic benchmark passed 5,000 local policy cases.",
      "Generated live-input.v1 JSON payloads passed at 10K scale.",
      "Risky live-input.v1 payloads were guarded with zero misses.",
      "Source-specific detector and signal fixture mapped into replay-ready live-input.v1.",
      "Operator workflow status is derived from policy scorecards, not autonomous signal control.",
      "LLM explanations review local policy evidence and do not choose signal plans.",
      "Backend policy scorecards cover safety gates, emergency clearance, queue relief, pedestrian efficiency, and normal-cycle decisions.",
      "Real sample adapters are prepared with an AI-Hub historical sample and a key-backed Seoul V2X signal response, but live drop-in still requires fresh camera evidence, calibrated direction, and compatible signal phase modeling."
    ]
  };
}
