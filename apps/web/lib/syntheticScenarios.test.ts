import { describe, expect, test } from "vitest";

import { generateSyntheticScenarioDataset } from "./syntheticScenarios";

describe("generateSyntheticScenarioDataset", () => {
  test("creates the requested number of deterministic synthetic cases", () => {
    const first = generateSyntheticScenarioDataset({ caseCount: 12, seed: 42 });
    const second = generateSyntheticScenarioDataset({ caseCount: 12, seed: 42 });

    expect(first).toHaveLength(12);
    expect(second).toEqual(first);
    expect(first[0]?.id).toBe("synthetic-0042-0001");
  });

  test("covers the core scenario families used by recommendation evaluation", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 16, seed: 7 });
    const families = new Set(dataset.map((scenario) => scenario.family));

    expect(families).toEqual(new Set(["emergency", "pedestrian", "blocked", "normal"]));
  });

  test("emergency cases include emergency detections and expected priority recommendation", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 8, seed: 3 });
    const emergency = dataset.find((scenario) => scenario.family === "emergency");

    expect(emergency).toBeTruthy();
    expect(emergency?.detections.some((detection) => detection.type === "emergency_vehicle")).toBe(true);
    expect(emergency?.expected.recommendation).toBe("emergency_priority");
    expect(emergency?.expected.mustIncludeReason).toBe("emergency_vehicle_approach");
    expect(emergency?.signal.currentPhase).toMatch(/east|west|north|south/);
  });

  test("blocked cases encode stalled traffic and reject normal-cycle recommendations", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 8, seed: 5 });
    const blocked = dataset.find((scenario) => scenario.family === "blocked");

    expect(blocked).toBeTruthy();
    expect(blocked?.detections.some((detection) => detection.type === "stalled_vehicle")).toBe(true);
    expect(blocked?.expected.recommendation).toBe("blocked_response");
    expect(blocked?.expected.mustIncludeReason).toBe("intersection_blocked");
    expect(blocked?.expected.mustNotRecommend).toContain("normal_cycle");
  });

  test("normal cases use the backend normal-flow reason code", () => {
    const dataset = generateSyntheticScenarioDataset({ caseCount: 8, seed: 5 });
    const normal = dataset.find((scenario) => scenario.family === "normal");

    expect(normal).toBeTruthy();
    expect(normal?.expected.recommendation).toBe("normal_cycle");
    expect(normal?.expected.mustIncludeReason).toBe("normal_flow");
  });
});
