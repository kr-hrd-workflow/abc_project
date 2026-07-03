import { describe, expect, test } from "vitest";

import { buildSyntheticBenchmarkExport } from "./syntheticBenchmarkExport";

describe("synthetic benchmark export", () => {
  test("exports benchmark evidence for external demo inspection", () => {
    const artifact = buildSyntheticBenchmarkExport();

    expect(artifact.source).toBe("synthetic_benchmark");
    expect(artifact.format).toBe("json");
    expect(artifact.suite).toEqual({
      label: "5K local policy benchmark",
      caseCountPerSeed: 1000,
      seeds: [101, 202, 303, 404, 505]
    });
    expect(artifact.report.totalCases).toBe(5000);
    expect(artifact.report.passedCases).toBe(5000);
    expect(artifact.report.failedCases).toBe(0);
    expect(artifact.report.passRatePercent).toBe(100);
    expect(artifact.report.seedResults).toHaveLength(5);
    expect(artifact.presentationSummary).toContain("5,000/5,000");

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
  });
});
