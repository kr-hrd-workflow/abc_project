import {
  POLICY_DECISION_ORDER,
  POLICY_SCORING_CONSTANTS,
  POLICY_SCORECARD_BACKED_POLICIES,
  POLICY_SCORECARD_REQUIRED_EVIDENCE,
  type PolicyDecisionOrderItem,
  type PolicyScorecardBackedPolicy,
  type PolicyScorecardRequiredEvidence
} from "./policyScorecardContract";

export type PolicyScorecardContractExport = {
  source: "policy_scorecard_contract";
  schemaVersion: "policy-scorecard-contract.v1";
  generatedAt: string;
  operatorWorkflowSource: "policy_scorecard";
  adapterBoundary: "live-input.v1";
  decisionBoundary: "operator_decision_support_not_signal_control";
  scorecardBackedPolicies: PolicyScorecardBackedPolicy[];
  decisionOrder: PolicyDecisionOrderItem[];
  scoringConstants: typeof POLICY_SCORING_CONSTANTS;
  policyCount: number;
  requiredEvidence: PolicyScorecardRequiredEvidence[];
  supportedStatuses: ("approval_review_ready" | "manual_review_required")[];
  presentationUse: string;
};

export function buildPolicyScorecardContractExport({
  generatedAt = new Date().toISOString()
}: {
  generatedAt?: string;
} = {}): PolicyScorecardContractExport {
  return {
    source: "policy_scorecard_contract",
    schemaVersion: "policy-scorecard-contract.v1",
    generatedAt,
    operatorWorkflowSource: "policy_scorecard",
    adapterBoundary: "live-input.v1",
    decisionBoundary: "operator_decision_support_not_signal_control",
    scorecardBackedPolicies: [...POLICY_SCORECARD_BACKED_POLICIES],
    decisionOrder: [...POLICY_DECISION_ORDER],
    scoringConstants: POLICY_SCORING_CONSTANTS,
    policyCount: POLICY_SCORECARD_BACKED_POLICIES.length,
    requiredEvidence: [...POLICY_SCORECARD_REQUIRED_EVIDENCE],
    supportedStatuses: [
      "approval_review_ready",
      "manual_review_required"
    ],
    presentationUse:
      "Inspectable local contract for policy scorecard-backed recommendations."
  };
}
