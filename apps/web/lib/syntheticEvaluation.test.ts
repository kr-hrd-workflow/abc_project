import { describe, expect, test } from "vitest";

import {
  evaluateSyntheticReplayTimeline,
  recommendFromSyntheticFrame
} from "./syntheticEvaluation";
import { buildSyntheticReplayTimeline } from "./syntheticReplay";
import { generateSyntheticScenarioDataset } from "./syntheticScenarios";

describe("evaluateSyntheticReplayTimeline", () => {
  test("passes deterministic generated cases with the local recommendation policy", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 20, seed: 101 });
    const timeline = buildSyntheticReplayTimeline(dataset);
    const report = evaluateSyntheticReplayTimeline(timeline);

    expect(report.totalCases).toBe(20);
    expect(report.passedCases).toBe(20);
    expect(report.failedCases).toBe(0);
    expect(report.passRate).toBe(1);
    expect(report.failures).toEqual([]);
    expect(report.byFamily.emergency.passed).toBeGreaterThan(0);
    expect(report.byFamily.blocked.passed).toBeGreaterThan(0);
  });

  test("records failed cases with expected and actual recommendations", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 4, seed: 202 });
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
    const report = evaluateSyntheticReplayTimeline(tamperedTimeline);

    expect(report.totalCases).toBe(4);
    expect(report.failedCases).toBe(1);
    expect(report.passRate).toBe(0.75);
    expect(report.failures[0]?.family).toBe("emergency");
    expect(report.failures[0]?.expected).toBe("normal_cycle");
    expect(report.failures[0]?.actual).toBe("emergency_priority");
    expect(report.failures[0]?.reason).toContain("expected normal_cycle");
  });

  test("uses the same safety-gate-first priority as the backend policy", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 4, seed: 303 });
    const emergencyFrame = buildSyntheticReplayTimeline(dataset).find(
      (frame) => frame.family === "emergency"
    );

    expect(emergencyFrame).toBeTruthy();

    const blockedEmergencyFrame = {
      ...emergencyFrame!,
      summary: {
        ...emergencyFrame!.summary,
        blockedDetected: true,
        emergencyDetected: true
      }
    };

    expect(recommendFromSyntheticFrame(blockedEmergencyFrame)).toBe(
      "blocked_response"
    );
  });
});
