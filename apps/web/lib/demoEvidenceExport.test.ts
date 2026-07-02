import { describe, expect, test } from "vitest";

import { buildDemoEvidenceExport } from "./demoEvidenceExport";
import {
  POLICY_SCORECARD_BACKED_POLICIES,
  POLICY_SCORECARD_REQUIRED_EVIDENCE
} from "./policyScorecardContract";

describe("demo evidence export", () => {
  test("summarizes benchmark, live-input JSON, guardrail, and source-adapter evidence", () => {
    const artifact = buildDemoEvidenceExport({
      generatedAt: "2026-07-01T09:45:00.000Z"
    });

    expect(artifact.source).toBe("demo_evidence_export");
    expect(artifact.generatedAt).toBe("2026-07-01T09:45:00.000Z");
    expect(artifact.schemaVersion).toBe("demo-evidence.v1");
    expect(artifact.syntheticBenchmark).toMatchObject({
      totalCases: 5000,
      passedCases: 5000,
      failedCases: 0,
      passRatePercent: 100
    });
    expect(artifact.liveInputJsonSuites.map((suite) => suite.id)).toEqual([
      "100",
      "1k",
      "5k",
      "10k"
    ]);
    expect(artifact.liveInputJsonSuites.at(-1)).toMatchObject({
      id: "10k",
      totalCases: 10000,
      passedCases: 10000,
      failedCases: 0,
      passRatePercent: 100
    });
    expect(artifact.liveInputGuardrails).toMatchObject({
      totalCases: 6,
      guardedCases: 6,
      missedCases: 0
    });
    expect(artifact.sourceAdapter).toMatchObject({
      detectorFormat: "road-vision.fixture.v1",
      signalFormat: "signal-controller.fixture.v1",
      schemaVersion: "live-input.v1",
      replayStatus: "replay_input_ready"
    });
    expect(artifact.operatorWorkflow).toEqual({
      source: "policy_scorecard",
      contractEndpoint: "/api/policy-scorecard-contract",
      llmExplanationContractEndpoint: "/api/llm-explanation-contract",
      supportedStatuses: [
        "approval_review_ready",
        "manual_review_required"
      ],
      demonstratedStatuses: [
        "approval_review_ready",
        "manual_review_required"
      ],
      scorecardBackedPolicies: POLICY_SCORECARD_BACKED_POLICIES,
      requiredEvidence: POLICY_SCORECARD_REQUIRED_EVIDENCE
    });
    expect(artifact.realSampleReadiness).toEqual({
      status: "adapter_ready_waiting_for_live_signal_response",
      adapterBoundary: "live-input.v1",
      fixtureReplayStatus: "replay_input_ready",
      dropInEndpoint: "/api/real-sample-drop-in",
      cctv: {
        status: "authorized_historical_sample_available",
        blocker: "fresh_camera_frame_required_for_live_drop_in"
      },
      signal: {
        status: "adapter_ready_live_key_required",
        blocker: "live_signal_phase_remaining_time_required"
      },
      nextRequiredInputs: [
        "T-DATA API key-backed signal phase and remaining-time response",
        "fresh camera frame captured within 30 seconds of receivedAt",
        "camera-to-approach direction calibration for detector labels"
      ]
    });
    expect(artifact.presentationClaims).toContain(
      "Generated live-input.v1 JSON payloads passed at 10K scale."
    );
    expect(artifact.presentationClaims).toContain(
      "Operator workflow status is derived from policy scorecards, not autonomous signal control."
    );
    expect(artifact.presentationClaims).toContain(
      "LLM explanations review local policy evidence and do not choose signal plans."
    );
    expect(artifact.presentationClaims).toContain(
      "Backend policy scorecards cover safety gates, emergency clearance, queue relief, pedestrian efficiency, and normal-cycle decisions."
    );

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
    expect(serialized).not.toContain("rtsp://");
  });
});
