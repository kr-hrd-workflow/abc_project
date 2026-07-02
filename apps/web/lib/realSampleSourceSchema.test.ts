import { describe, expect, test } from "vitest";

import { buildRealSampleSourceSchemaExport } from "./realSampleSourceSchema";

describe("real sample source schema export", () => {
  test("describes source adapter JSON contracts without sample data", () => {
    const artifact = buildRealSampleSourceSchemaExport({
      generatedAt: "2026-07-02T05:00:00.000Z"
    });

    expect(artifact.source).toBe("real_sample_source_schema");
    expect(artifact.schemaVersion).toBe("real-sample-source-schema.v1");
    expect(artifact.generatedAt).toBe("2026-07-02T05:00:00.000Z");
    expect(artifact.adapterBoundary).toBe("live-input.v1");
    expect(artifact.buildCommands).toEqual({
      signalSnapshot:
        "npm run real-sample:build-signal-snapshot -- <seoul-v2x-response.json> <signal-snapshot.json> <nextPhase> <controllerMode> <manualOverride>",
      cameraEnvelope:
        "npm run real-sample:build-camera-envelope -- <detector-output.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>",
      prepareLiveInput:
        "npm run real-sample:prepare-live-input -- <detector-output.json> <camera-calibration.json> <seoul-v2x-response.json> <signal-snapshot.json> <live-input-envelope.json> <nextPhase> <controllerMode> <manualOverride>"
    });
    expect(Object.keys(artifact.sourceSchemas)).toEqual([
      "authorized-camera-detector-output.v1",
      "camera-approach-calibration.v1",
      "seoul-v2x-signal-response.v1",
      "signal-snapshot-input.v1",
      "police-crossroad-info-list-response.v1",
      "police-crossroad-info-detail-response.v1"
    ]);
    expect(
      artifact.sourceSchemas["authorized-camera-detector-output.v1"].required
    ).toEqual([
      "source",
      "schemaVersion",
      "intersectionId",
      "cameraId",
      "frameId",
      "capturedAt",
      "detections"
    ]);
    expect(
      artifact.sourceSchemas["authorized-camera-detector-output.v1"].properties
        .detections.items.properties.classLabel.enum
    ).toEqual(["vehicle", "emergency_vehicle", "pedestrian", "stalled_vehicle"]);
    expect(
      artifact.sourceSchemas["camera-approach-calibration.v1"].properties
        .mappings.items.required
    ).toContain("evidence");
    expect(
      artifact.sourceSchemas["seoul-v2x-signal-response.v1"].oneOf[0].items
        .properties.trsmUtcTime
    ).toEqual({
      anyOf: [{ type: "number" }, { type: "string", minLength: 1 }]
    });
    expect(
      artifact.sourceSchemas["signal-snapshot-input.v1"].properties.currentPhase
        .enum
    ).toContain("east_priority");
    expect(
      artifact.sourceSchemas["police-crossroad-info-list-response.v1"].items
        .anyOf[1].required
    ).toEqual([
      "REGION_CD",
      "INT_NO",
      "INT_NM",
      "X_COORD",
      "Y_COORD",
      "UPD_DTIME"
    ]);
    expect(
      artifact.sourceSchemas["police-crossroad-info-detail-response.v1"].items
        .anyOf[1].required
    ).toEqual(["REGION_CD", "INT_NO", "INT_NM", "MAP_NO", "INT_MAINPHASE"]);
    expect(artifact.guardrailNotes).toContain(
      "source schemas describe file shape only; freshness, provenance, and policy guardrails still run through real-sample:check"
    );
    expect(artifact.guardrailNotes).toContain(
      "camera approach direction must come from camera-approach-calibration.v1, not from detector guesses"
    );
    expect(artifact.guardrailNotes).toContain(
      "Police CrossRoadInfo responses provide intersection and signal-plan metadata only; they do not prove live detections, emergency telemetry, camera calibration, or currentPhase"
    );

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
    expect(serialized).not.toContain("rtsp://");
  });
});
