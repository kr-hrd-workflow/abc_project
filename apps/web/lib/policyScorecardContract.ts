export const POLICY_SCORECARD_BACKED_POLICIES = [
  "safety_gate",
  "emergency_clearance",
  "safety_hold",
  "queue_relief",
  "pedestrian_efficiency",
  "maintain_cycle"
] as const;

export const POLICY_SCORECARD_REQUIRED_EVIDENCE = [
  "selected_policy",
  "candidate_scores",
  "constraints",
  "blocked_reasons",
  "required_inputs",
  "objective_metrics",
  "confidence",
  "operator_note"
] as const;

export const POLICY_DECISION_ORDER = [
  "safety_gate",
  "safety_hold",
  "emergency_clearance",
  "queue_relief",
  "pedestrian_efficiency",
  "maintain_cycle"
] as const;

export const POLICY_SCORING_CONSTANTS = {
  queueThreshold: 25,
  safetyGateAllRedSeconds: 10,
  unknownEmergencyDirectionAllRedSeconds: 6,
  conflictingQueueAxesAllRedSeconds: 6,
  queueReliefBaseScore: 60,
  pedestrianEfficiencyScore: 45,
  pedestrianNoVehicleBonus: 10,
  maintainCycleScore: 10
} as const;

export type PolicyScorecardBackedPolicy =
  (typeof POLICY_SCORECARD_BACKED_POLICIES)[number];

export type PolicyScorecardRequiredEvidence =
  (typeof POLICY_SCORECARD_REQUIRED_EVIDENCE)[number];

export type PolicyDecisionOrderItem = (typeof POLICY_DECISION_ORDER)[number];
