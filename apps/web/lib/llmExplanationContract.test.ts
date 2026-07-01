import { describe, expect, test } from "vitest";

import { buildLlmExplanationContractExport } from "./llmExplanationContract";

describe("llm explanation contract export", () => {
  test("describes the LLM as an explanation and review layer only", () => {
    const artifact = buildLlmExplanationContractExport({
      generatedAt: "2026-07-01T11:20:00.000Z"
    });

    expect(artifact).toEqual({
      source: "llm_explanation_contract",
      schemaVersion: "llm-explanation-contract.v1",
      generatedAt: "2026-07-01T11:20:00.000Z",
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
    });

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
    expect(serialized).not.toContain("rtsp://");
  });
});
