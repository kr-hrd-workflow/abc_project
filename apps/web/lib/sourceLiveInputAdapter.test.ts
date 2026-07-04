import { describe, expect, test } from "vitest";

import {
  buildSourceSpecificLiveInputExport,
  buildSourceSpecificLiveInputFixture,
  buildSourceSpecificLiveInputEnvelope,
  buildSourceSpecificReplayInput
} from "./sourceLiveInputAdapter";

describe("source-specific live input adapter", () => {
  test("maps detector and signal source fixtures into a normalized live-input.v1 envelope", () => {
    const fixture = buildSourceSpecificLiveInputFixture();

    const envelope = buildSourceSpecificLiveInputEnvelope(fixture);

    expect(fixture.detector.provider).toBe("road-vision.fixture.v1");
    expect(fixture.signal.provider).toBe("signal-controller.fixture.v1");
    expect(envelope.schemaVersion).toBe("live-input.v1");
    expect(envelope.intersectionId).toBe("INT-SEO-0001");
    expect(envelope.cameraFrames).toHaveLength(1);
    expect(envelope.cameraFrames[0]).toMatchObject({
      cameraId: "rv-east-01",
      frameId: "rv-frame-20260701-0001"
    });
    expect(envelope.cameraFrames[0]?.detections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectId: "trk-amb-001",
          classLabel: "emergency_vehicle",
          direction: "east",
          laneId: "east_approach_1"
        }),
        expect.objectContaining({
          objectId: "trk-ped-014",
          classLabel: "pedestrian",
          waitingSeconds: 72
        })
      ])
    );
    expect(envelope.signalSnapshot).toMatchObject({
      controllerId: "sc-seo-01",
      currentPhase: "east_priority",
      remainingSeconds: 18,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    });
  });

  test("feeds source-specific adapter output through the live contract into replay input", () => {
    const replayInput = buildSourceSpecificReplayInput(
      buildSourceSpecificLiveInputFixture()
    );

    expect(replayInput.cameraId).toBe("rv-east-01");
    expect(replayInput.signal.currentPhase).toBe("east_priority");
    expect(
      replayInput.detections.some(
        (detection) => detection.type === "emergency_vehicle"
      )
    ).toBe(true);
    expect(
      replayInput.detections.some(
        (detection) => detection.type === "pedestrian" && detection.waitingSeconds === 72
      )
    ).toBe(true);
  });

  test("exports source-specific adapter evidence without secrets or raw stream credentials", () => {
    const artifact = buildSourceSpecificLiveInputExport();

    expect(artifact.source).toBe("source_specific_adapter_fixture");
    expect(artifact.sourceFormats).toEqual({
      detector: "road-vision.fixture.v1",
      signal: "signal-controller.fixture.v1"
    });
    expect(artifact.envelope.schemaVersion).toBe("live-input.v1");
    expect(artifact.replaySummary).toMatchObject({
      status: "replay_input_ready",
      cameraId: "rv-east-01",
      signalSnapshotReady: true,
      currentPhase: "east_priority"
    });
    expect(artifact.replaySummary.detectionTypes).toContain("emergency_vehicle");

    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain(["OPENAI", "API", "KEY"].join("_"));
    expect(serialized).not.toContain(["sk", "proj"].join("-"));
    expect(serialized).not.toContain("rtsp://");
  });
});
