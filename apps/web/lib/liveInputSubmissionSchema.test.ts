import { describe, expect, test } from "vitest";

import { buildLiveInputSubmissionSchemaExport } from "./liveInputSubmissionSchema";

describe("live input submission schema export", () => {
  test("describes replay-ready live-input.v1 submissions without sample data", () => {
    const artifact = buildLiveInputSubmissionSchemaExport({
      generatedAt: "2026-07-01T10:45:00.000Z"
    });

    expect(artifact.source).toBe("live_input_submission_schema");
    expect(artifact.schemaVersion).toBe("live-input-submission-schema.v1");
    expect(artifact.generatedAt).toBe("2026-07-01T10:45:00.000Z");
    expect(artifact.adapterBoundary).toBe("live-input.v1");
    expect(artifact.dropInEndpoint).toBe("/api/real-sample-drop-in");
    expect(artifact.decisionBoundary).toBe(
      "operator_decision_support_not_signal_control"
    );
    expect(artifact.jsonSchema.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema"
    );
    expect(artifact.jsonSchema.required).toEqual([
      "schemaVersion",
      "intersectionId",
      "receivedAt",
      "cameraFrames",
      "signalSnapshot"
    ]);
    expect(artifact.jsonSchema.properties.schemaVersion).toEqual({
      const: "live-input.v1"
    });
    expect(
      artifact.jsonSchema.properties.cameraFrames.items.properties.detections.items
        .properties.classLabel.enum
    ).toContain("emergency_vehicle");
    expect(
      artifact.jsonSchema.properties.cameraFrames.items.properties.detections.items
        .properties.confidence
    ).toEqual({ type: "number", minimum: 0, maximum: 1 });
    expect(
      artifact.jsonSchema.properties.signalSnapshot.properties.currentPhase.enum
    ).toContain("normal_cycle");
    expect(artifact.guardrailNotes).toContain(
      "schema allows confidence values from 0 to 1; policy guardrail routes values below 0.5 to manual review"
    );
    expect(artifact.guardrailNotes).toContain(
      "schema requires a signal snapshot because /api/real-sample-drop-in validates replay-ready submissions"
    );
    expect(artifact.guardrailNotes).toContain(
      "real-sample drop-in validation routes fixture or synthetic sample identifiers to manual review"
    );

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
    expect(serialized).not.toContain("rtsp://");
  });
});
