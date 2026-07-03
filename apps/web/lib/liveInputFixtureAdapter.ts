import type {
  LiveInputEnvelope,
  ReplayCompatibleLiveInput
} from "./liveInputContract";
import {
  normalizeLiveInputEnvelope,
  toSyntheticReplayInput
} from "./liveInputContract";
import type { SyntheticScenarioCase } from "./syntheticScenarios";

export function buildFixtureLiveInputEnvelope(
  scenarioCase: SyntheticScenarioCase
): LiveInputEnvelope {
  const rawEnvelope = {
    schemaVersion: "live-input.v1",
    intersectionId: scenarioCase.signal.intersectionId,
    receivedAt: scenarioCase.timestamp,
    cameraFrames: [
      {
        cameraId: scenarioCase.cameraId,
        frameId: `${scenarioCase.id}-frame`,
        capturedAt: scenarioCase.timestamp,
        detections: scenarioCase.detections.map((detection, index) => ({
          objectId: `${scenarioCase.id}-det-${String(index + 1).padStart(3, "0")}`,
          classLabel: detection.type,
          confidence: detection.confidence,
          direction: detection.direction,
          laneId: detection.lane,
          count: detection.count,
          ...(detection.distanceMeters === undefined
            ? {}
            : { distanceMeters: detection.distanceMeters }),
          ...(detection.waitingSeconds === undefined
            ? {}
            : { waitingSeconds: detection.waitingSeconds })
        }))
      }
    ],
    signalSnapshot: {
      controllerId: `${scenarioCase.signal.intersectionId}-controller`,
      capturedAt: scenarioCase.timestamp,
      currentPhase: scenarioCase.signal.currentPhase,
      remainingSeconds: scenarioCase.signal.remainingSeconds,
      nextPhase: scenarioCase.signal.nextPhase,
      controllerMode: scenarioCase.signal.controllerMode,
      manualOverride: scenarioCase.signal.manualOverride
    }
  };

  return normalizeLiveInputEnvelope(rawEnvelope);
}

export function buildFixtureReplayInput(
  scenarioCase: SyntheticScenarioCase
): ReplayCompatibleLiveInput {
  return toSyntheticReplayInput(buildFixtureLiveInputEnvelope(scenarioCase));
}
