import { describe, expect, test } from "vitest";

import {
  buildFixtureLiveInputEnvelope,
  buildFixtureReplayInput
} from "./liveInputFixtureAdapter";
import { generateSyntheticScenarioDataset } from "./syntheticScenarios";

describe("live input fixture adapter", () => {
  test("builds a live-input.v1 envelope from a local synthetic fixture case", () => {
    const [scenarioCase] = generateSyntheticScenarioDataset({ caseCount: 1, seed: 404 });

    const envelope = buildFixtureLiveInputEnvelope(scenarioCase);

    expect(envelope.schemaVersion).toBe("live-input.v1");
    expect(envelope.intersectionId).toBe(scenarioCase.signal.intersectionId);
    expect(envelope.receivedAt).toBe(scenarioCase.timestamp);
    expect(envelope.cameraFrames).toHaveLength(1);
    expect(envelope.cameraFrames[0]).toMatchObject({
      cameraId: scenarioCase.cameraId,
      frameId: `${scenarioCase.id}-frame`,
      capturedAt: scenarioCase.timestamp
    });
    expect(envelope.cameraFrames[0]?.detections[0]).toMatchObject({
      objectId: `${scenarioCase.id}-det-001`,
      classLabel: scenarioCase.detections[0]?.type,
      laneId: scenarioCase.detections[0]?.lane
    });
    expect(envelope.signalSnapshot).toMatchObject({
      controllerId: `${scenarioCase.signal.intersectionId}-controller`,
      currentPhase: scenarioCase.signal.currentPhase,
      remainingSeconds: scenarioCase.signal.remainingSeconds
    });
  });

  test("feeds local fixture output through the live contract into replay input", () => {
    const emergencyCase = generateSyntheticScenarioDataset({
      caseCount: 4,
      seed: 404
    }).find((scenarioCase) => scenarioCase.family === "emergency");

    expect(emergencyCase).toBeTruthy();

    const replayInput = buildFixtureReplayInput(emergencyCase!);

    expect(replayInput.cameraId).toBe(emergencyCase?.cameraId);
    expect(replayInput.signal.currentPhase).toBe(emergencyCase?.signal.currentPhase);
    expect(
      replayInput.detections.some(
        (detection) => detection.type === "emergency_vehicle"
      )
    ).toBe(true);
  });
});
