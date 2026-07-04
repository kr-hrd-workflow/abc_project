import type {
  SyntheticDetection,
  SyntheticExpectedOutcome,
  SyntheticScenarioCase,
  SyntheticScenarioFamily,
  SyntheticSignalSnapshot
} from "./syntheticScenarios";

export type SyntheticReplaySummary = {
  maxQueue: number;
  vehiclePressurePresent: boolean;
  emergencyDetected: boolean;
  emergencyDirectionKnown: boolean;
  pedestrianWaiting: boolean;
  blockedDetected: boolean;
  activePhase: SyntheticSignalSnapshot["currentPhase"];
};

export type SyntheticReplayFrame = {
  sequence: number;
  caseId: string;
  family: SyntheticScenarioFamily;
  timestamp: string;
  elapsedSeconds: number;
  input: {
    cameraId: string;
    detections: SyntheticDetection[];
    signal: SyntheticSignalSnapshot;
  };
  summary: SyntheticReplaySummary;
  expected: SyntheticExpectedOutcome;
};

export function buildSyntheticReplayTimeline(
  cases: SyntheticScenarioCase[]
): SyntheticReplayFrame[] {
  const sortedCases = [...cases].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const startMs = sortedCases.length > 0 ? Date.parse(sortedCases[0].timestamp) : 0;

  return sortedCases.map((scenarioCase, index) => ({
    sequence: index + 1,
    caseId: scenarioCase.id,
    family: scenarioCase.family,
    timestamp: scenarioCase.timestamp,
    elapsedSeconds: Math.max(0, Math.round((Date.parse(scenarioCase.timestamp) - startMs) / 1000)),
    input: {
      cameraId: scenarioCase.cameraId,
      detections: scenarioCase.detections,
      signal: scenarioCase.signal
    },
    summary: buildReplaySummary(scenarioCase),
    expected: scenarioCase.expected
  }));
}

function buildReplaySummary(scenarioCase: SyntheticScenarioCase): SyntheticReplaySummary {
  const emergencyDetections = scenarioCase.detections.filter(
    (detection) => detection.type === "emergency_vehicle"
  );
  const vehicleDetections = scenarioCase.detections.filter(
    (detection) => detection.type === "vehicle"
  );
  const maxQueue = Math.max(
    0,
    ...vehicleDetections.map((detection) => detection.count)
  );

  return {
    maxQueue,
    vehiclePressurePresent: maxQueue > 0,
    emergencyDetected: emergencyDetections.length > 0,
    emergencyDirectionKnown: emergencyDetections.every(
      (detection) => detection.direction !== null
    ),
    pedestrianWaiting: scenarioCase.detections.some(
      (detection) => detection.type === "pedestrian" && (detection.waitingSeconds ?? 0) >= 60
    ),
    blockedDetected: scenarioCase.detections.some(
      (detection) => detection.type === "stalled_vehicle"
    ),
    activePhase: scenarioCase.signal.currentPhase
  };
}
