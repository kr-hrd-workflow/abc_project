export type LlmExplanationContractExport = {
  source: "llm_explanation_contract";
  schemaVersion: "llm-explanation-contract.v1";
  generatedAt: string;
  role: "explanation_review_only";
  decisionSource: "local_policy_scorecard";
  adapterBoundary: "live-input.v1";
  decisionBoundary: "operator_decision_support_not_signal_control";
  noOpenAICallRequired: true;
  evidenceEndpoints: string[];
  allowedResponsibilities: string[];
  prohibitedResponsibilities: string[];
  evaluationCriteria: string[];
  presentationUse: string;
};

export function buildLlmExplanationContractExport({
  generatedAt = new Date().toISOString()
}: {
  generatedAt?: string;
} = {}): LlmExplanationContractExport {
  return {
    source: "llm_explanation_contract",
    schemaVersion: "llm-explanation-contract.v1",
    generatedAt,
    role: "explanation_review_only",
    decisionSource: "local_policy_scorecard",
    adapterBoundary: "live-input.v1",
    decisionBoundary: "operator_decision_support_not_signal_control",
    noOpenAICallRequired: true,
    evidenceEndpoints: [
      "/api/policy-scorecard-contract",
      "/api/demo-evidence-export",
      "/api/real-sample-drop-in",
      "/api/final-local-readiness"
    ],
    allowedResponsibilities: [
      "explain local policy recommendations",
      "summarize policy scorecard evidence",
      "flag missing evidence or manual-review reasons",
      "check explanation text against local guardrails"
    ],
    prohibitedResponsibilities: [
      "choose a signal plan independently",
      "override local policy recommendations",
      "claim autonomous traffic signal control",
      "invent live CCTV or signal-controller evidence"
    ],
    evaluationCriteria: [
      "simulation_only_boundary",
      "no_real_signal_control",
      "policy_evidence_grounding"
    ],
    presentationUse:
      "Inspectable local contract showing that LLM output explains and reviews local policy evidence rather than deciding signals."
  };
}
