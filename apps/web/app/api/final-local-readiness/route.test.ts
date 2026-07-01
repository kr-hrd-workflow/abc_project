import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("final local readiness route", () => {
  test("returns the final local readiness reconciliation", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      source: "final_local_readiness_reconciliation",
      schemaVersion: "final-local-readiness.v1",
      localRehearsalStatus: "ready_for_local_rehearsal",
      realSampleStatus: "blocked_waiting_for_authorized_samples",
      decisionBoundary: "operator_decision_support_not_signal_control",
      adapterBoundary: "live-input.v1"
    });
    expect(body.healthCheck.expectedSummary).toBe("15/15 checks passed");
    expect(body.realSampleCheck).toEqual({
      command: "npm run real-sample:check -- <live-input-envelope.json>",
      offlineCommand:
        "npm run real-sample:check -- --offline <live-input-envelope.json>",
      requiresRunningWebServer: true,
      endpoint: "/api/real-sample-drop-in"
    });
    expect(body.evidenceEndpoints).toContain("/api/demo-evidence-export");
    expect(body.evidenceEndpoints).toContain("/api/policy-scorecard-contract");
    expect(body.evidenceEndpoints).toContain("/api/llm-explanation-contract");
    expect(body.evidenceEndpoints).toContain("/api/live-input-submission-schema");
    expect(body.evidenceEndpoints).toContain("/api/real-sample-drop-in");
    expect(body.localEvidence.scorecardPolicies).toBe(6);
    expect(body.blockers).toEqual([
      "authorized_frame_or_stream_access_required",
      "seoul_v2x_or_signal_controller_sample_required"
    ]);
  });
});
