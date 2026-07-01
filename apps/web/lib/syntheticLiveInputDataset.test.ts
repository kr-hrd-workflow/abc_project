import { describe, expect, test } from "vitest";

import {
  LIVE_INPUT_JSON_EXPORT_SUITES,
  buildSyntheticLiveInputGuardrailReport,
  buildSyntheticLiveInputJsonExport,
  buildSyntheticLiveInputEvaluationReport,
  buildSyntheticLiveInputJsonDataset,
  recommendFromLiveReplayInput,
  resolveSyntheticLiveInputExportOptions
} from "./syntheticLiveInputDataset";

describe("synthetic live-input JSON dataset", () => {
  test("generates deterministic live-input.v1 JSON cases with expected outcomes", () => {
    const dataset = buildSyntheticLiveInputJsonDataset({ caseCount: 100, seed: 404 });

    expect(dataset).toHaveLength(100);
    expect(dataset.filter((item) => item.family === "emergency")).toHaveLength(25);
    expect(dataset.filter((item) => item.family === "pedestrian")).toHaveLength(25);
    expect(dataset.filter((item) => item.family === "blocked")).toHaveLength(25);
    expect(dataset.filter((item) => item.family === "normal")).toHaveLength(25);

    const emergencyCase = dataset.find((item) => item.family === "emergency");
    expect(emergencyCase).toBeTruthy();
    expect(emergencyCase?.expectedRecommendation).toBe("emergency_priority");
    expect(emergencyCase?.envelope.schemaVersion).toBe("live-input.v1");
    expect(
      emergencyCase?.envelope.cameraFrames[0]?.detections.some(
        (detection) => detection.classLabel === "emergency_vehicle"
      )
    ).toBe(true);
    expect(emergencyCase?.envelope.signalSnapshot?.controllerMode).toBe("adaptive");
  });

  test("evaluates recommendations from the generated live-input.v1 JSON payloads", () => {
    const report = buildSyntheticLiveInputEvaluationReport({
      caseCount: 100,
      seed: 404
    });

    expect(report.source).toBe("synthetic_live_input_json");
    expect(report.schemaVersion).toBe("live-input.v1");
    expect(report.totalCases).toBe(100);
    expect(report.passedCases).toBe(100);
    expect(report.failedCases).toBe(0);
    expect(report.passRatePercent).toBe(100);
    expect(report.byFamily.emergency).toEqual({ total: 25, passed: 25, failed: 0 });
    expect(report.byFamily.pedestrian).toEqual({ total: 25, passed: 25, failed: 0 });
    expect(report.byFamily.blocked).toEqual({ total: 25, passed: 25, failed: 0 });
    expect(report.byFamily.normal).toEqual({ total: 25, passed: 25, failed: 0 });
  });

  test("exports generated live-input.v1 JSON cases with an evaluation summary", () => {
    const artifact = buildSyntheticLiveInputJsonExport({
      caseCount: 100,
      seed: 404
    });

    expect(artifact.source).toBe("synthetic_live_input_json");
    expect(artifact.schemaVersion).toBe("live-input.v1");
    expect(artifact.dataset).toHaveLength(100);
    expect(artifact.evaluation).toMatchObject({
      totalCases: 100,
      passedCases: 100,
      failedCases: 0,
      passRatePercent: 100
    });
    expect(artifact.dataset[0]).toMatchObject({
      id: "synthetic-0404-0001",
      expectedRecommendation: "emergency_priority"
    });
    expect(artifact.dataset[0]?.envelope.schemaVersion).toBe("live-input.v1");

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
  });

  test("resolves supported bulk live-input JSON export sizes", () => {
    expect(LIVE_INPUT_JSON_EXPORT_SUITES.map((suite) => suite.id)).toEqual([
      "100",
      "1k",
      "5k",
      "10k"
    ]);
    expect(resolveSyntheticLiveInputExportOptions("100")).toEqual({
      caseCount: 100,
      seed: 404
    });
    expect(resolveSyntheticLiveInputExportOptions("1k")).toEqual({
      caseCount: 1000,
      seed: 404
    });
    expect(resolveSyntheticLiveInputExportOptions("5k")).toEqual({
      caseCount: 5000,
      seed: 404
    });
    expect(resolveSyntheticLiveInputExportOptions("10k")).toEqual({
      caseCount: 10000,
      seed: 404
    });
    expect(resolveSyntheticLiveInputExportOptions("unsupported")).toEqual({
      caseCount: 100,
      seed: 404
    });
  });

  test("exports 1K live-input.v1 JSON cases with balanced scenario families", () => {
    const artifact = buildSyntheticLiveInputJsonExport(
      resolveSyntheticLiveInputExportOptions("1k")
    );

    expect(artifact.generator.caseCount).toBe(1000);
    expect(artifact.dataset).toHaveLength(1000);
    expect(artifact.evaluation.totalCases).toBe(1000);
    expect(artifact.evaluation.passedCases).toBe(1000);
    expect(artifact.evaluation.failedCases).toBe(0);
    expect(artifact.evaluation.byFamily.emergency).toEqual({
      total: 250,
      passed: 250,
      failed: 0
    });
  });

  test("guards malformed, stale, low-confidence, and conflicting live-input JSON payloads", () => {
    const report = buildSyntheticLiveInputGuardrailReport();

    expect(report.source).toBe("synthetic_live_input_json_guardrails");
    expect(report.schemaVersion).toBe("live-input.v1");
    expect(report.totalCases).toBe(6);
    expect(report.guardedCases).toBe(6);
    expect(report.missedCases).toBe(0);
    expect(report.cases.map((guardrailCase) => guardrailCase.expectedGuardrail)).toEqual([
      "reject_payload",
      "reject_replay_input",
      "manual_review_stale_signal",
      "manual_review_low_confidence",
      "emergency_priority_with_conflict_note",
      "manual_review_conflicting_queue_axes"
    ]);
    expect(report.cases.every((guardrailCase) => guardrailCase.guarded)).toBe(true);
  });

  test("uses safety-gate-first priority for live-input replay detections", () => {
    expect(
      recommendFromLiveReplayInput([
        {
          type: "emergency_vehicle",
          lane: "east_approach_1",
          direction: "east",
          count: 1,
          confidence: 0.97,
          distanceMeters: 80
        },
        {
          type: "stalled_vehicle",
          lane: "east_box",
          direction: "east",
          count: 1,
          confidence: 0.9,
          waitingSeconds: 120
        }
      ])
    ).toBe("blocked_response");
  });
});
