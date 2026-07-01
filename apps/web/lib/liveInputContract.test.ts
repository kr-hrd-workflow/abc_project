import { describe, expect, test } from "vitest";

import {
  normalizeLiveInputEnvelope,
  toSyntheticReplayInput
} from "./liveInputContract";

describe("live input adapter contract", () => {
  test("normalizes live CCTV detections and signal snapshots for replay input", () => {
    const envelope = normalizeLiveInputEnvelope({
      schemaVersion: "live-input.v1",
      intersectionId: "INT-SEO-0001",
      receivedAt: "2026-06-30T13:00:00.000Z",
      cameraFrames: [
        {
          cameraId: "east_cam_01",
          frameId: "frame-0001",
          capturedAt: "2026-06-30T13:00:00.000Z",
          detections: [
            {
              objectId: "ev-1",
              classLabel: "emergency_vehicle",
              confidence: 0.97,
              direction: "east",
              laneId: "east_approach_1",
              count: 1,
              distanceMeters: 82
            }
          ]
        }
      ],
      signalSnapshot: {
        controllerId: "seo-signal-01",
        capturedAt: "2026-06-30T13:00:00.000Z",
        currentPhase: "east_priority",
        remainingSeconds: 18,
        nextPhase: "normal_cycle",
        controllerMode: "adaptive",
        manualOverride: false
      }
    });

    const replayInput = toSyntheticReplayInput(envelope);

    expect(replayInput.cameraId).toBe("east_cam_01");
    expect(replayInput.detections).toEqual([
      {
        type: "emergency_vehicle",
        lane: "east_approach_1",
        direction: "east",
        count: 1,
        confidence: 0.97,
        distanceMeters: 82
      }
    ]);
    expect(replayInput.signal).toEqual({
      intersectionId: "INT-SEO-0001",
      currentPhase: "east_priority",
      remainingSeconds: 18,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    });
  });

  test("rejects live detections with confidence outside the contract range", () => {
    expect(() =>
      normalizeLiveInputEnvelope({
        schemaVersion: "live-input.v1",
        intersectionId: "INT-SEO-0001",
        receivedAt: "2026-06-30T13:00:00.000Z",
        cameraFrames: [
          {
            cameraId: "east_cam_01",
            frameId: "frame-0001",
            capturedAt: "2026-06-30T13:00:00.000Z",
            detections: [
              {
                objectId: "bad-1",
                classLabel: "vehicle",
                confidence: 1.2,
                direction: "east",
                laneId: "east_through_1",
                count: 1
              }
            ]
          }
        ],
        signalSnapshot: null
      })
    ).toThrow("detection confidence must be between 0 and 1");
  });
});
