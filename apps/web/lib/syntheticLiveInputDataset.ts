import type { LiveInputEnvelope } from "./liveInputContract";
import {
  normalizeLiveInputEnvelope,
  toSyntheticReplayInput
} from "./liveInputContract";
import { buildFixtureLiveInputEnvelope } from "./liveInputFixtureAdapter";
import type {
  SyntheticExpectedOutcome,
  SyntheticScenarioDatasetOptions,
  SyntheticScenarioFamily
} from "./syntheticScenarios";
import { generateSyntheticScenarioDataset } from "./syntheticScenarios";
import { POLICY_SCORING_CONSTANTS } from "./policyScorecardContract";

export type SyntheticLiveInputJsonCase = {
  id: string;
  family: SyntheticScenarioFamily;
  expectedRecommendation: SyntheticExpectedOutcome["recommendation"];
  expectedReason: string;
  envelope: LiveInputEnvelope;
};

export type SyntheticLiveInputFamilySummary = {
  total: number;
  passed: number;
  failed: number;
};

export type SyntheticLiveInputEvaluationFailure = {
  caseId: string;
  family: SyntheticScenarioFamily;
  expected: SyntheticExpectedOutcome["recommendation"];
  actual: SyntheticExpectedOutcome["recommendation"];
  reason: string;
};

export type SyntheticLiveInputEvaluationReport = {
  source: "synthetic_live_input_json";
  schemaVersion: "live-input.v1";
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRatePercent: number;
  byFamily: Record<SyntheticScenarioFamily, SyntheticLiveInputFamilySummary>;
  failures: SyntheticLiveInputEvaluationFailure[];
};

export type SyntheticLiveInputGuardrail =
  | "reject_payload"
  | "reject_replay_input"
  | "manual_review_stale_signal"
  | "manual_review_low_confidence"
  | "emergency_priority_with_conflict_note"
  | "manual_review_conflicting_queue_axes";

export type SyntheticLiveInputGuardrailCase = {
  id: string;
  label: string;
  expectedGuardrail: SyntheticLiveInputGuardrail;
  actualGuardrail: SyntheticLiveInputGuardrail;
  guarded: boolean;
  reason: string;
};

export type SyntheticLiveInputGuardrailReport = {
  source: "synthetic_live_input_json_guardrails";
  schemaVersion: "live-input.v1";
  totalCases: number;
  guardedCases: number;
  missedCases: number;
  cases: SyntheticLiveInputGuardrailCase[];
};

export type SyntheticLiveInputJsonExport = {
  source: "synthetic_live_input_json";
  schemaVersion: "live-input.v1";
  generator: {
    caseCount: number;
    seed: number;
  };
  dataset: SyntheticLiveInputJsonCase[];
  evaluation: SyntheticLiveInputEvaluationReport;
};

export type SyntheticLiveInputExportSuiteId = "100" | "1k" | "5k" | "10k";

export type SyntheticLiveInputExportSuite = {
  id: SyntheticLiveInputExportSuiteId;
  label: string;
  caseCount: number;
  seed: number;
};

export const LIVE_INPUT_JSON_EXPORT_SUITES: SyntheticLiveInputExportSuite[] = [
  { id: "100", label: "100", caseCount: 100, seed: 404 },
  { id: "1k", label: "1K", caseCount: 1000, seed: 404 },
  { id: "5k", label: "5K", caseCount: 5000, seed: 404 },
  { id: "10k", label: "10K", caseCount: 10000, seed: 404 }
];

const EMPTY_FAMILY_SUMMARY: Record<SyntheticScenarioFamily, SyntheticLiveInputFamilySummary> = {
  emergency: { total: 0, passed: 0, failed: 0 },
  congestion: { total: 0, passed: 0, failed: 0 },
  pedestrian: { total: 0, passed: 0, failed: 0 },
  blocked: { total: 0, passed: 0, failed: 0 },
  normal: { total: 0, passed: 0, failed: 0 }
};

export function buildSyntheticLiveInputJsonDataset(
  options: SyntheticScenarioDatasetOptions
): SyntheticLiveInputJsonCase[] {
  return generateSyntheticScenarioDataset(options).map((scenarioCase) => ({
    id: scenarioCase.id,
    family: scenarioCase.family,
    expectedRecommendation: scenarioCase.expected.recommendation,
    expectedReason: scenarioCase.expected.mustIncludeReason,
    envelope: buildFixtureLiveInputEnvelope(scenarioCase)
  }));
}

export function buildSyntheticLiveInputEvaluationReport(
  options: SyntheticScenarioDatasetOptions
): SyntheticLiveInputEvaluationReport {
  const dataset = buildSyntheticLiveInputJsonDataset(options);
  const byFamily = cloneFamilySummary();
  const failures: SyntheticLiveInputEvaluationFailure[] = [];

  for (const item of dataset) {
    const normalizedEnvelope = normalizeLiveInputEnvelope(item.envelope);
    const replayInput = toSyntheticReplayInput(normalizedEnvelope);
    const actual = recommendFromLiveReplayInput(replayInput.detections);
    const familySummary = byFamily[item.family];
    familySummary.total += 1;

    if (actual === item.expectedRecommendation) {
      familySummary.passed += 1;
      continue;
    }

    familySummary.failed += 1;
    failures.push({
      caseId: item.id,
      family: item.family,
      expected: item.expectedRecommendation,
      actual,
      reason: `Live-input JSON policy returned ${actual}, expected ${item.expectedRecommendation}.`
    });
  }

  const totalCases = dataset.length;
  const failedCases = failures.length;
  const passedCases = totalCases - failedCases;

  return {
    source: "synthetic_live_input_json",
    schemaVersion: "live-input.v1",
    totalCases,
    passedCases,
    failedCases,
    passRatePercent: totalCases === 0 ? 0 : toPercent(passedCases / totalCases),
    byFamily,
    failures
  };
}

export function buildSyntheticLiveInputJsonExport(
  options: SyntheticScenarioDatasetOptions
): SyntheticLiveInputJsonExport {
  return {
    source: "synthetic_live_input_json",
    schemaVersion: "live-input.v1",
    generator: {
      caseCount: options.caseCount,
      seed: options.seed
    },
    dataset: buildSyntheticLiveInputJsonDataset(options),
    evaluation: buildSyntheticLiveInputEvaluationReport(options)
  };
}

export function buildSyntheticLiveInputGuardrailReport(): SyntheticLiveInputGuardrailReport {
  const dataset = buildSyntheticLiveInputJsonDataset({ caseCount: 8, seed: 606 });
  const emergencyCase = requireSyntheticLiveInputCase(dataset, "emergency");
  const pedestrianCase = requireSyntheticLiveInputCase(dataset, "pedestrian");
  const blockedCase = requireSyntheticLiveInputCase(dataset, "blocked");
  const normalCase = requireSyntheticLiveInputCase(dataset, "normal");

  const staleSignalEnvelope = cloneEnvelope(normalCase.envelope);
  staleSignalEnvelope.receivedAt = "2026-07-01T09:01:40.000Z";
  if (staleSignalEnvelope.signalSnapshot) {
    staleSignalEnvelope.signalSnapshot.capturedAt = "2026-07-01T09:00:00.000Z";
  }

  const lowConfidenceEnvelope = cloneEnvelope(emergencyCase.envelope);
  const lowConfidenceDetection = lowConfidenceEnvelope.cameraFrames[0]?.detections[0];
  if (lowConfidenceDetection) {
    lowConfidenceDetection.confidence = 0.42;
  }

  const conflictEnvelope = cloneEnvelope(emergencyCase.envelope);
  const pedestrianDetection =
    cloneEnvelope(pedestrianCase.envelope).cameraFrames[0]?.detections.find(
      (detection) => detection.classLabel === "pedestrian"
    );
  if (pedestrianDetection) {
    conflictEnvelope.cameraFrames[0]?.detections.push({
      ...pedestrianDetection,
      objectId: "conflict-pedestrian-001",
      waitingSeconds: 120
    });
  }

  const conflictingQueueEnvelope = cloneEnvelope(normalCase.envelope);
  const conflictingQueueFrame = conflictingQueueEnvelope.cameraFrames[0];
  if (conflictingQueueFrame) {
    conflictingQueueFrame.detections = [
      {
        objectId: "conflict-north-queue-001",
        classLabel: "vehicle",
        confidence: 0.92,
        direction: "north",
        laneId: "north_through_1",
        count: 32,
        waitingSeconds: 90
      },
      {
        objectId: "conflict-east-queue-001",
        classLabel: "vehicle",
        confidence: 0.91,
        direction: "east",
        laneId: "east_through_1",
        count: 31,
        waitingSeconds: 88
      }
    ];
  }

  const cases = [
    evaluateGuardrailPayload({
      id: "guardrail-invalid-schema",
      label: "Invalid schema version",
      expectedGuardrail: "reject_payload",
      payload: {
        ...blockedCase.envelope,
        schemaVersion: "live-input.v0"
      }
    }),
    evaluateGuardrailPayload({
      id: "guardrail-missing-signal",
      label: "Missing signal snapshot",
      expectedGuardrail: "reject_replay_input",
      payload: {
        ...normalCase.envelope,
        signalSnapshot: null
      }
    }),
    evaluateGuardrailPayload({
      id: "guardrail-stale-signal",
      label: "Stale signal state",
      expectedGuardrail: "manual_review_stale_signal",
      payload: staleSignalEnvelope
    }),
    evaluateGuardrailPayload({
      id: "guardrail-low-confidence",
      label: "Low-confidence emergency detection",
      expectedGuardrail: "manual_review_low_confidence",
      payload: lowConfidenceEnvelope
    }),
    evaluateGuardrailPayload({
      id: "guardrail-conflicting-priority",
      label: "Emergency and pedestrian conflict",
      expectedGuardrail: "emergency_priority_with_conflict_note",
      payload: conflictEnvelope
    }),
    evaluateGuardrailPayload({
      id: "guardrail-conflicting-queue-axes",
      label: "Conflicting queue axes",
      expectedGuardrail: "manual_review_conflicting_queue_axes",
      payload: conflictingQueueEnvelope
    })
  ];
  const guardedCases = cases.filter((item) => item.guarded).length;

  return {
    source: "synthetic_live_input_json_guardrails",
    schemaVersion: "live-input.v1",
    totalCases: cases.length,
    guardedCases,
    missedCases: cases.length - guardedCases,
    cases
  };
}

export function resolveSyntheticLiveInputExportOptions(
  size: string | null | undefined
): SyntheticScenarioDatasetOptions {
  const suite =
    LIVE_INPUT_JSON_EXPORT_SUITES.find((candidate) => candidate.id === size) ??
    LIVE_INPUT_JSON_EXPORT_SUITES[0];

  return {
    caseCount: suite.caseCount,
    seed: suite.seed
  };
}

export function recommendFromLiveReplayInput(
  detections: ReturnType<typeof toSyntheticReplayInput>["detections"]
): SyntheticExpectedOutcome["recommendation"] {
  if (detections.some((detection) => detection.type === "stalled_vehicle")) {
    return "blocked_response";
  }
  if (
    detections.some(
      (detection) =>
        detection.type === "emergency_vehicle" && detection.direction === null
    )
  ) {
    return "safety_hold";
  }
  if (detections.some((detection) => detection.type === "emergency_vehicle")) {
    return "emergency_priority";
  }
  if (
    detections.some(
      (detection) =>
        detection.type === "vehicle" &&
        detection.count > POLICY_SCORING_CONSTANTS.queueThreshold
    )
  ) {
    return "queue_relief";
  }
  if (
    detections.some(
      (detection) =>
        detection.type === "pedestrian" && (detection.waitingSeconds ?? 0) >= 60
    )
  ) {
    return "pedestrian_priority";
  }
  return "normal_cycle";
}

function evaluateGuardrailPayload({
  id,
  label,
  expectedGuardrail,
  payload
}: {
  id: string;
  label: string;
  expectedGuardrail: SyntheticLiveInputGuardrail;
  payload: unknown;
}): SyntheticLiveInputGuardrailCase {
  const actualGuardrail = detectLiveInputGuardrail(payload);

  return {
    id,
    label,
    expectedGuardrail,
    actualGuardrail,
    guarded: actualGuardrail === expectedGuardrail,
    reason: `Expected ${expectedGuardrail}, observed ${actualGuardrail}.`
  };
}

function detectLiveInputGuardrail(payload: unknown): SyntheticLiveInputGuardrail {
  let envelope: LiveInputEnvelope;

  try {
    envelope = normalizeLiveInputEnvelope(payload);
  } catch {
    return "reject_payload";
  }

  if (isSignalSnapshotStale(envelope)) {
    return "manual_review_stale_signal";
  }

  if (
    envelope.cameraFrames.some((frame) =>
      frame.detections.some((detection) => detection.confidence < 0.5)
    )
  ) {
    return "manual_review_low_confidence";
  }

  try {
    const replayInput = toSyntheticReplayInput(envelope);
    const hasEmergency = replayInput.detections.some(
      (detection) => detection.type === "emergency_vehicle"
    );
    const hasWaitingPedestrian = replayInput.detections.some(
      (detection) =>
        detection.type === "pedestrian" && (detection.waitingSeconds ?? 0) >= 60
    );
    if (!hasEmergency && hasConflictingQueueAxes(replayInput.detections)) {
      return "manual_review_conflicting_queue_axes";
    }
    if (
      hasEmergency &&
      hasWaitingPedestrian &&
      recommendFromLiveReplayInput(replayInput.detections) === "emergency_priority"
    ) {
      return "emergency_priority_with_conflict_note";
    }
  } catch {
    return "reject_replay_input";
  }

  return "reject_payload";
}

function hasConflictingQueueAxes(
  detections: ReturnType<typeof toSyntheticReplayInput>["detections"]
): boolean {
  const queueThreshold = POLICY_SCORING_CONSTANTS.queueThreshold;
  const northSouthQueue = Math.max(
    0,
    ...detections
      .filter(
        (detection) =>
          detection.type === "vehicle" &&
          (detection.direction === "north" || detection.direction === "south")
      )
      .map((detection) => detection.count)
  );
  const eastWestQueue = Math.max(
    0,
    ...detections
      .filter(
        (detection) =>
          detection.type === "vehicle" &&
          (detection.direction === "east" || detection.direction === "west")
      )
      .map((detection) => detection.count)
  );

  return northSouthQueue > queueThreshold && eastWestQueue > queueThreshold;
}

function isSignalSnapshotStale(envelope: LiveInputEnvelope): boolean {
  if (!envelope.signalSnapshot) return false;

  const receivedAt = Date.parse(envelope.receivedAt);
  const capturedAt = Date.parse(envelope.signalSnapshot.capturedAt);

  return receivedAt - capturedAt > 30_000;
}

function cloneEnvelope(envelope: LiveInputEnvelope): LiveInputEnvelope {
  return structuredClone(envelope);
}

function requireSyntheticLiveInputCase(
  dataset: SyntheticLiveInputJsonCase[],
  family: SyntheticScenarioFamily
): SyntheticLiveInputJsonCase {
  const item = dataset.find((candidate) => candidate.family === family);
  if (!item) {
    throw new Error(`Missing synthetic live-input case for ${family}.`);
  }
  return item;
}

function cloneFamilySummary() {
  return {
    emergency: { ...EMPTY_FAMILY_SUMMARY.emergency },
    congestion: { ...EMPTY_FAMILY_SUMMARY.congestion },
    pedestrian: { ...EMPTY_FAMILY_SUMMARY.pedestrian },
    blocked: { ...EMPTY_FAMILY_SUMMARY.blocked },
    normal: { ...EMPTY_FAMILY_SUMMARY.normal }
  };
}

function toPercent(rate: number): number {
  return Math.round(rate * 1000) / 10;
}
