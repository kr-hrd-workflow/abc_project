import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("real sample intake package route", () => {
  test("returns the authorized sample intake package", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      source: "real_sample_intake_package",
      schemaVersion: "real-sample-intake-package.v1",
      status: "signal_ready_waiting_for_fresh_camera_and_calibration",
      adapterBoundary: "live-input.v1",
      dropInEndpoint: "/api/real-sample-drop-in",
      schemaEndpoint: "/api/live-input-submission-schema",
      sourceSchemaEndpoint: "/api/real-sample-source-schema",
      finalReadinessEndpoint: "/api/final-local-readiness",
      localCliCommand:
        "npm run real-sample:check -- <live-input-envelope.json>",
      offlineCliCommand:
        "npm run real-sample:check -- --offline <live-input-envelope.json>",
      noPersistence: true
    });
    expect(body.sampleSlotIds).toEqual([
      "authorized_cctv_frame_or_video",
      "signal_phase_remaining_time",
      "detector_output"
    ]);
    expect(body.envelopeRequirements.requiredTopLevelFields).toContain(
      "cameraFrames"
    );
    expect(body.envelopeRequirements.requiredSignalFields).toContain(
      "remainingSeconds"
    );
    expect(body.validationGuardrails).toContain(
      "manual review when any detection confidence is below 0.5"
    );
    expect(body.validationGuardrails).toContain(
      "manual review when vehicle queues exceed threshold on conflicting movement axes"
    );
    expect(body.prohibitedInputs).toContain("raw stream credentials");
    expect(body.submissionSteps).toContain(
      "run npm run real-sample:check -- --offline <live-input-envelope.json> for server-free shape, provenance, and guardrail checks"
    );
    expect(body.submissionSteps).toContain(
      "run npm run real-sample:check -- <live-input-envelope.json> for the same local drop-in validation path"
    );
  });
});
