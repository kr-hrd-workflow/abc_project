import { describe, expect, test } from "vitest";

import { buildPolicyScorecardContractExport } from "./policyScorecardContractExport";
import {
  POLICY_SCORECARD_BACKED_POLICIES,
  POLICY_SCORECARD_REQUIRED_EVIDENCE
} from "./policyScorecardContract";

describe("policy scorecard contract export", () => {
  test("exposes the inspectable local policy scorecard contract", () => {
    const artifact = buildPolicyScorecardContractExport({
      generatedAt: "2026-07-01T10:00:00.000Z"
    });

    expect(artifact).toEqual({
      source: "policy_scorecard_contract",
      schemaVersion: "policy-scorecard-contract.v1",
      generatedAt: "2026-07-01T10:00:00.000Z",
      operatorWorkflowSource: "policy_scorecard",
      adapterBoundary: "live-input.v1",
      decisionBoundary: "operator_decision_support_not_signal_control",
      scorecardBackedPolicies: POLICY_SCORECARD_BACKED_POLICIES,
      decisionOrder: [
        "safety_gate",
        "safety_hold",
        "emergency_clearance",
        "queue_relief",
        "pedestrian_efficiency",
        "maintain_cycle"
      ],
      scoringConstants: {
        queueThreshold: 25,
        safetyGateAllRedSeconds: 10,
        unknownEmergencyDirectionAllRedSeconds: 6,
        conflictingQueueAxesAllRedSeconds: 6,
        queueReliefBaseScore: 60,
        pedestrianEfficiencyScore: 45,
        pedestrianNoVehicleBonus: 10,
        maintainCycleScore: 10
      },
      policyCount: 6,
      requiredEvidence: POLICY_SCORECARD_REQUIRED_EVIDENCE,
      supportedStatuses: [
        "approval_review_ready",
        "manual_review_required"
      ],
      presentationUse:
        "Inspectable local contract for policy scorecard-backed recommendations."
    });

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
    expect(serialized).not.toContain("rtsp://");
  });
});
