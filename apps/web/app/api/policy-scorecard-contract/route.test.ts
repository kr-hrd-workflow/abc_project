import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("policy scorecard contract route", () => {
  test("returns the local policy scorecard contract for presenter inspection", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      source: "policy_scorecard_contract",
      schemaVersion: "policy-scorecard-contract.v1",
      operatorWorkflowSource: "policy_scorecard",
      adapterBoundary: "live-input.v1",
      decisionBoundary: "operator_decision_support_not_signal_control",
      policyCount: 6
    });
    expect(body.scorecardBackedPolicies).toEqual([
      "safety_gate",
      "emergency_clearance",
      "safety_hold",
      "queue_relief",
      "pedestrian_efficiency",
      "maintain_cycle"
    ]);
    expect(body.decisionOrder).toEqual([
      "safety_gate",
      "safety_hold",
      "emergency_clearance",
      "queue_relief",
      "pedestrian_efficiency",
      "maintain_cycle"
    ]);
    expect(body.scoringConstants).toMatchObject({
      queueThreshold: 25,
      safetyGateAllRedSeconds: 10,
      unknownEmergencyDirectionAllRedSeconds: 6,
      conflictingQueueAxesAllRedSeconds: 6
    });
    expect(body.requiredEvidence).toContain("selected_policy");
    expect(body.requiredEvidence).toContain("operator_note");
    expect(body.supportedStatuses).toEqual([
      "approval_review_ready",
      "manual_review_required"
    ]);
  });
});
