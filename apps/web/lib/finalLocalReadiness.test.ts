import { describe, expect, test } from "vitest";

import { buildFinalLocalReadinessExport } from "./finalLocalReadiness";

describe("final local readiness export", () => {
  test("reconciles local demo evidence with real-sample blockers", () => {
    const artifact = buildFinalLocalReadinessExport({
      generatedAt: "2026-07-01T10:15:00.000Z"
    });

    expect(artifact).toEqual({
      source: "final_local_readiness_reconciliation",
      schemaVersion: "final-local-readiness.v1",
      generatedAt: "2026-07-01T10:15:00.000Z",
      localRehearsalStatus: "ready_for_local_rehearsal",
      realSampleStatus: "blocked_waiting_for_authorized_samples",
      decisionBoundary: "operator_decision_support_not_signal_control",
      adapterBoundary: "live-input.v1",
      healthCheck: {
        expectedSummary: "15/15 checks passed",
        command: "npm run demo:health"
      },
      realSampleCheck: {
        command: "npm run real-sample:check -- <live-input-envelope.json>",
        offlineCommand:
          "npm run real-sample:check -- --offline <live-input-envelope.json>",
        requiresRunningWebServer: true,
        endpoint: "/api/real-sample-drop-in"
      },
      evidenceEndpoints: [
        "/api/demo-evidence-export",
        "/api/policy-scorecard-contract",
        "/api/llm-explanation-contract",
        "/api/live-input-submission-schema",
        "/api/real-sample-intake-package",
        "/api/real-sample-drop-in",
        "/api/live-input-fixture",
        "/api/source-live-input-fixture",
        "/api/synthetic-live-input-export?size=10k"
      ],
      localEvidence: {
        syntheticBenchmark: "5000/5000",
        liveInputJson: "10000/10000",
        guardrails: "6 guarded / 0 misses",
        scorecardPolicies: 6,
        sourceAdapterReplayStatus: "replay_input_ready"
      },
      blockers: [
        "authorized_frame_or_stream_access_required",
        "seoul_v2x_or_signal_controller_sample_required"
      ],
      nextRequiredInputs: [
        "authorized CCTV frame or video sample",
        "signal phase and remaining-time sample",
        "detector output mapped through live-input.v1"
      ],
      nextAction:
        "Obtain authorized CCTV frame/video and signal timing samples, then POST a live-input.v1 envelope to /api/real-sample-drop-in."
    });

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
    expect(serialized).not.toContain("rtsp://");
  });
});
