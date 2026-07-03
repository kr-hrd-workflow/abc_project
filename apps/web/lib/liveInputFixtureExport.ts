import type { LiveInputEnvelope } from "./liveInputContract";
import {
  buildFixtureLiveInputEnvelope,
  buildFixtureReplayInput
} from "./liveInputFixtureAdapter";
import { generateSyntheticScenarioDataset } from "./syntheticScenarios";
import type {
  SyntheticDetectionType,
  SyntheticScenarioFamily
} from "./syntheticScenarios";

export type LiveInputFixtureExport = {
  source: "local_fixture_adapter";
  schemaVersion: LiveInputEnvelope["schemaVersion"];
  scenario: {
    id: string;
    family: SyntheticScenarioFamily;
    expectedRecommendation: string;
  };
  envelope: LiveInputEnvelope;
  replaySummary: {
    status: "replay_input_ready";
    cameraId: string;
    detectionCount: number;
    detectionTypes: SyntheticDetectionType[];
    signalSnapshotReady: boolean;
    currentPhase: string;
  };
};

export function buildLiveInputFixtureExport(): LiveInputFixtureExport {
  const scenarioCase = generateSyntheticScenarioDataset({
    caseCount: 4,
    seed: 404
  }).find((fixture) => fixture.family === "emergency");

  if (!scenarioCase) {
    throw new Error("Emergency live-input fixture case is unavailable");
  }

  const envelope = buildFixtureLiveInputEnvelope(scenarioCase);
  const replayInput = buildFixtureReplayInput(scenarioCase);

  return {
    source: "local_fixture_adapter",
    schemaVersion: envelope.schemaVersion,
    scenario: {
      id: scenarioCase.id,
      family: scenarioCase.family,
      expectedRecommendation: scenarioCase.expected.recommendation
    },
    envelope,
    replaySummary: {
      status: "replay_input_ready",
      cameraId: replayInput.cameraId,
      detectionCount: replayInput.detections.reduce(
        (total, detection) => total + detection.count,
        0
      ),
      detectionTypes: Array.from(
        new Set(replayInput.detections.map((detection) => detection.type))
      ),
      signalSnapshotReady: Boolean(replayInput.signal),
      currentPhase: replayInput.signal.currentPhase
    }
  };
}
