import { describe, expect, test } from "vitest";

import { buildSyntheticReplayTimeline } from "./syntheticReplay";
import { generateSyntheticScenarioDataset } from "./syntheticScenarios";

describe("buildSyntheticReplayTimeline", () => {
  test("sorts generated cases into a deterministic replay timeline", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 6, seed: 11 });
    const timeline = buildSyntheticReplayTimeline([...dataset].reverse());

    expect(timeline).toHaveLength(6);
    expect(timeline.map((frame) => frame.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(timeline[0]?.caseId).toBe(dataset[0]?.id);
    expect(timeline[5]?.caseId).toBe(dataset[5]?.id);
  });

  test("preserves expected outcomes for evaluator consumption", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 4, seed: 21 });
    const timeline = buildSyntheticReplayTimeline(dataset);
    const emergencyFrame = timeline.find((frame) => frame.family === "emergency");

    expect(emergencyFrame?.expected.recommendation).toBe("emergency_priority");
    expect(emergencyFrame?.expected.mustIncludeReason).toBe("emergency_vehicle_approach");
    expect(emergencyFrame?.input.signal.currentPhase).toMatch(/priority|normal_cycle/);
  });

  test("derives compact state summaries from detections and signals", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 8, seed: 31 });
    const timeline = buildSyntheticReplayTimeline(dataset);

    expect(timeline.find((frame) => frame.family === "emergency")?.summary.emergencyDetected).toBe(true);
    expect(timeline.find((frame) => frame.family === "pedestrian")?.summary.pedestrianWaiting).toBe(true);
    expect(timeline.find((frame) => frame.family === "blocked")?.summary.blockedDetected).toBe(true);
    expect(timeline.every((frame) => frame.summary.maxQueue >= 0)).toBe(true);
  });
});
