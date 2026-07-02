import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("real sample source schema route", () => {
  test("returns source adapter schemas for real sample builders", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      source: "real_sample_source_schema",
      schemaVersion: "real-sample-source-schema.v1",
      adapterBoundary: "live-input.v1"
    });
    expect(body.buildCommands.signalSnapshot).toContain(
      "real-sample:build-signal-snapshot"
    );
    expect(body.buildCommands.cameraEnvelope).toContain(
      "real-sample:build-camera-envelope"
    );
    expect(body.buildCommands.prepareLiveInput).toContain(
      "real-sample:prepare-live-input"
    );
    expect(body.sourceSchemas).toHaveProperty(
      "authorized-camera-detector-output.v1"
    );
    expect(body.sourceSchemas).toHaveProperty("camera-approach-calibration.v1");
    expect(body.sourceSchemas).toHaveProperty("seoul-v2x-signal-response.v1");
    expect(body.sourceSchemas).toHaveProperty("signal-snapshot-input.v1");
    expect(body.guardrailNotes).toContain(
      "source schemas describe file shape only; freshness, provenance, and policy guardrails still run through real-sample:check"
    );
  });
});
