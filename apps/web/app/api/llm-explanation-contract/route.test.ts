import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("llm explanation contract route", () => {
  test("returns the local LLM explanation boundary contract", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      source: "llm_explanation_contract",
      schemaVersion: "llm-explanation-contract.v1",
      role: "explanation_review_only",
      decisionSource: "local_policy_scorecard",
      decisionBoundary: "operator_decision_support_not_signal_control",
      noOpenAICallRequired: true
    });
    expect(body.evidenceEndpoints).toContain("/api/policy-scorecard-contract");
    expect(body.prohibitedResponsibilities).toContain(
      "choose a signal plan independently"
    );
    expect(body.evaluationCriteria).toEqual([
      "simulation_only_boundary",
      "no_real_signal_control",
      "policy_evidence_grounding"
    ]);
  });
});
