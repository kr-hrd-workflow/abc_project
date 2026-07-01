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
    status: "blocked_waiting_for_authorized_samples";
    adapterBoundary: "live-input.v1";
    fixtureReplayStatus: "replay_input_ready";
    dropInEndpoint: "/api/real-sample-drop-in";
    cctv: {
      status: "metadata_only";
      blocker: "authorized_frame_or_stream_access_required";
    };
    signal: {
      status: "blocked_without_api_key";
      blocker: "seoul_v2x_or_signal_controller_sample_required";
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
      status: "blocked_waiting_for_authorized_samples",
      adapterBoundary: "live-input.v1",
      fixtureReplayStatus: sourceAdapter.replaySummary.status,
      dropInEndpoint: "/api/real-sample-drop-in",
      cctv: {
        status: "metadata_only",
        blocker: "authorized_frame_or_stream_access_required"
      },
      signal: {
        status: "blocked_without_api_key",
        blocker: "seoul_v2x_or_signal_controller_sample_required"
      },
      nextRequiredInputs: [
        "authorized CCTV frame or video sample",
        "signal phase and remaining-time sample",
        "detector output mapped through live-input.v1"
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
      "Real sample validation is blocked until authorized CCTV frames and signal timing samples are available."
    ]
  };
}
