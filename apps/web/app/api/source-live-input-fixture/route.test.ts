import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("source live input fixture route", () => {
  test("returns source-specific adapter evidence as JSON", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.source).toBe("source_specific_adapter_fixture");
    expect(body.sourceFormats).toEqual({
      detector: "road-vision.fixture.v1",
      signal: "signal-controller.fixture.v1"
    });
    expect(body.envelope.schemaVersion).toBe("live-input.v1");
    expect(body.replaySummary.status).toBe("replay_input_ready");
    expect(body.replaySummary.detectionTypes).toContain("emergency_vehicle");
  });
});
