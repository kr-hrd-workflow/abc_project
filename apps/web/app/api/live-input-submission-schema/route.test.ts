import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("live input submission schema route", () => {
  test("returns the replay-ready live-input.v1 submission schema", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      source: "live_input_submission_schema",
      schemaVersion: "live-input-submission-schema.v1",
      adapterBoundary: "live-input.v1",
      dropInEndpoint: "/api/real-sample-drop-in",
      decisionBoundary: "operator_decision_support_not_signal_control"
    });
    expect(body.jsonSchema.properties.schemaVersion).toEqual({
      const: "live-input.v1"
    });
    expect(body.jsonSchema.required).toContain("signalSnapshot");
    expect(body.jsonSchema.properties.signalSnapshot.type).toBe("object");
    expect(body.guardrailNotes).toContain(
      "schema requires a signal snapshot because /api/real-sample-drop-in validates replay-ready submissions"
    );
  });
});
