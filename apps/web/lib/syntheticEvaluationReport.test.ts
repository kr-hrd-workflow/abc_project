import { describe, expect, test } from "vitest";

import {
  buildSyntheticBenchmarkReport,
  buildSyntheticEdgeCaseReport,
  buildSyntheticFailureDemoReport,
  buildSyntheticEvaluationReport,
  summarizeSyntheticEvaluationReport
} from "./syntheticEvaluationReport";
import { evaluateSyntheticReplayTimeline } from "./syntheticEvaluation";
import { buildSyntheticReplayTimeline } from "./syntheticReplay";
import { generateSyntheticScenarioDataset } from "./syntheticScenarios";

describe("buildSyntheticEvaluationReport", () => {
  test("builds a presentation-ready report from generated synthetic data", () => {
    const report = buildSyntheticEvaluationReport({ caseCount: 100, seed: 404 });

    expect(report.caseCount).toBe(100);
    expect(report.seed).toBe(404);
    expect(report.generatedAt).toBe("2026-06-30T01:16:30.000Z");
    expect(report.passedCases).toBe(100);
    expect(report.failedCases).toBe(0);
    expect(report.passRatePercent).toBe(100);
    expect(report.headline).toContain("100/100");
    expect(report.riskNotes).toEqual(["No synthetic policy failures detected."]);
    expect(report.failures).toEqual([]);
    expect(report.scenarioBreakdown).toEqual([
      { family: "emergency", total: 20, passed: 20, failed: 0, passRatePercent: 100 },
      { family: "congestion", total: 20, passed: 20, failed: 0, passRatePercent: 100 },
      { family: "pedestrian", total: 20, passed: 20, failed: 0, passRatePercent: 100 },
      { family: "blocked", total: 20, passed: 20, failed: 0, passRatePercent: 100 },
      { family: "normal", total: 20, passed: 20, failed: 0, passRatePercent: 100 }
    ]);
    expect(report.policyEvidence).toEqual([
      {
        policy: "safety_gate",
        family: "blocked",
        recommendation: "blocked_response",
        passed: 20,
        total: 20,
        evidence: "intersection_blocked"
      },
      {
        policy: "emergency_clearance",
        family: "emergency",
        recommendation: "emergency_priority",
        passed: 20,
        total: 20,
        evidence: "emergency_vehicle_approach"
      },
      {
        policy: "queue_relief",
        family: "congestion",
        recommendation: "queue_relief",
        passed: 20,
        total: 20,
        evidence: "queue_threshold_exceeded"
      },
      {
        policy: "pedestrian_efficiency",
        family: "pedestrian",
        recommendation: "pedestrian_priority",
        passed: 20,
        total: 20,
        evidence: "pedestrian_waiting"
      },
      {
        policy: "maintain_cycle",
        family: "normal",
        recommendation: "normal_cycle",
        passed: 20,
        total: 20,
        evidence: "normal_flow"
      }
    ]);
  });
});

describe("buildSyntheticFailureDemoReport", () => {
  test("builds a deterministic report with a drilldown failure", () => {
    const report = buildSyntheticFailureDemoReport({ caseCount: 8, seed: 606 });

    expect(report.caseCount).toBe(8);
    expect(report.passedCases).toBe(7);
    expect(report.failedCases).toBe(1);
    expect(report.passRatePercent).toBe(87.5);
    expect(report.riskNotes).toEqual([
      "1 synthetic case failed local policy checks.",
      "Emergency scenarios have 1 failed case."
    ]);
    expect(report.failures[0]).toMatchObject({
      caseId: "synthetic-0606-0001",
      family: "emergency",
      expected: "normal_cycle",
      actual: "emergency_priority"
    });
  });
});

describe("buildSyntheticBenchmarkReport", () => {
  test("aggregates deterministic reports across multiple seeds", () => {
    const report = buildSyntheticBenchmarkReport({
      caseCountPerSeed: 1000,
      seeds: [101, 202, 303, 404, 505]
    });

    expect(report.seedCount).toBe(5);
    expect(report.caseCountPerSeed).toBe(1000);
    expect(report.totalCases).toBe(5000);
    expect(report.passedCases).toBe(5000);
    expect(report.failedCases).toBe(0);
    expect(report.passRatePercent).toBe(100);
    expect(report.headline).toContain("5,000/5,000");
    expect(report.seedResults.map((result) => result.seed)).toEqual([
      101, 202, 303, 404, 505
    ]);
    expect(report.seedResults.every((result) => result.passRatePercent === 100)).toBe(true);
  });
});

describe("buildSyntheticEdgeCaseReport", () => {
  test("summarizes noisy edge cases with expected guardrails", () => {
    const report = buildSyntheticEdgeCaseReport();

    expect(report.totalCases).toBe(4);
    expect(report.passedCases).toBe(4);
    expect(report.failedCases).toBe(0);
    expect(report.passRatePercent).toBe(100);
    expect(report.cases.map((edgeCase) => edgeCase.kind)).toEqual([
      "low_confidence_detection",
      "stale_signal_state",
      "missing_signal_state",
      "emergency_pedestrian_conflict"
    ]);
    expect(report.cases.map((edgeCase) => edgeCase.expectedGuardrail)).toEqual([
      "manual_review",
      "stale_signal_review",
      "missing_signal_review",
      "emergency_priority"
    ]);
  });
});

describe("summarizeSyntheticEvaluationReport", () => {
  test("surfaces failed cases and family risk notes", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 4, seed: 505 });
    const timeline = buildSyntheticReplayTimeline(dataset);
    const tamperedTimeline = timeline.map((frame) =>
      frame.family === "emergency"
        ? {
            ...frame,
            expected: {
              ...frame.expected,
              recommendation: "normal_cycle" as const
            }
          }
        : frame
    );
    const evaluation = evaluateSyntheticReplayTimeline(tamperedTimeline);

    const report = summarizeSyntheticEvaluationReport(evaluation, {
      seed: 505,
      generatedAt: "2026-06-30T01:00:30.000Z"
    });

    expect(report.caseCount).toBe(4);
    expect(report.passedCases).toBe(3);
    expect(report.failedCases).toBe(1);
    expect(report.passRatePercent).toBe(75);
    expect(report.headline).toContain("3/4");
    expect(report.riskNotes).toEqual([
      "1 synthetic case failed local policy checks.",
      "Emergency scenarios have 1 failed case."
    ]);
    expect(report.failures[0]?.family).toBe("emergency");
  });
});
