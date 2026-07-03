import { describe, expect, test } from "vitest";

import { buildLiveInputFixtureExport } from "./liveInputFixtureExport";

describe("live input fixture export", () => {
  test("exports the local fixture adapter payload for external demo inspection", () => {
    const artifact = buildLiveInputFixtureExport();

    expect(artifact.source).toBe("local_fixture_adapter");
    expect(artifact.schemaVersion).toBe("live-input.v1");
    expect(artifact.scenario.family).toBe("emergency");
    expect(artifact.envelope.schemaVersion).toBe("live-input.v1");
    expect(artifact.envelope.cameraFrames).toHaveLength(1);
    expect(
      artifact.envelope.cameraFrames[0]?.detections.some(
        (detection) => detection.classLabel === "emergency_vehicle"
      )
    ).toBe(true);
    expect(artifact.replaySummary).toMatchObject({
      status: "replay_input_ready",
      signalSnapshotReady: true
    });
    expect(artifact.replaySummary.detectionTypes).toContain("emergency_vehicle");
    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
  });
});
