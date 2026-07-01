import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("demo evidence export route", () => {
  test("returns downloadable local demo evidence", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.source).toBe("demo_evidence_export");
    expect(body.schemaVersion).toBe("demo-evidence.v1");
    expect(body.syntheticBenchmark.totalCases).toBe(5000);
    expect(body.liveInputJsonSuites.at(-1)).toMatchObject({
      id: "10k",
      totalCases: 10000,
      passedCases: 10000,
      failedCases: 0
    });
    expect(body.liveInputGuardrails).toMatchObject({
      guardedCases: 6,
      missedCases: 0
    });
    expect(body.sourceAdapter.replayStatus).toBe("replay_input_ready");
    expect(body.operatorWorkflow.demonstratedStatuses).toEqual([
      "approval_review_ready",
      "manual_review_required"
    ]);
    expect(body.realSampleReadiness).toMatchObject({
      status: "blocked_waiting_for_authorized_samples",
      adapterBoundary: "live-input.v1",
      fixtureReplayStatus: "replay_input_ready",
      dropInEndpoint: "/api/real-sample-drop-in"
    });
  });
});
