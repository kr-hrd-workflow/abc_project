import type { Direction } from "./types";
import type {
  SyntheticDetection,
  SyntheticDetectionType,
  SyntheticSignalSnapshot
} from "./syntheticScenarios";

export type LiveInputSchemaVersion = "live-input.v1";

export type LiveDetectionClassLabel = SyntheticDetectionType;

export type LiveDetection = {
  objectId: string;
  classLabel: LiveDetectionClassLabel;
  confidence: number;
  direction: Direction | null;
  laneId: string;
  count: number;
  distanceMeters?: number;
  waitingSeconds?: number;
};

export type LiveCameraFrame = {
  cameraId: string;
  frameId: string;
  capturedAt: string;
  detections: LiveDetection[];
};

export type LiveSignalSnapshot = {
  controllerId: string;
  capturedAt: string;
  currentPhase: SyntheticSignalSnapshot["currentPhase"];
  remainingSeconds: number;
  nextPhase: SyntheticSignalSnapshot["nextPhase"];
  controllerMode: SyntheticSignalSnapshot["controllerMode"];
  manualOverride: boolean;
};

export type LiveInputEnvelope = {
  schemaVersion: LiveInputSchemaVersion;
  intersectionId: string;
  receivedAt: string;
  cameraFrames: LiveCameraFrame[];
  signalSnapshot: LiveSignalSnapshot | null;
};

export type ReplayCompatibleLiveInput = {
  cameraId: string;
  detections: SyntheticDetection[];
  signal: SyntheticSignalSnapshot;
};

const DIRECTIONS: Direction[] = ["north", "south", "east", "west"];
const DETECTION_CLASS_LABELS: LiveDetectionClassLabel[] = [
  "vehicle",
  "emergency_vehicle",
  "pedestrian",
  "stalled_vehicle"
];
const SIGNAL_PHASES: SyntheticSignalSnapshot["currentPhase"][] = [
  "north_priority",
  "south_priority",
  "east_priority",
  "west_priority",
  "normal_cycle"
];
const CONTROLLER_MODES: SyntheticSignalSnapshot["controllerMode"][] = [
  "adaptive",
  "fixed",
  "manual"
];

export function normalizeLiveInputEnvelope(input: unknown): LiveInputEnvelope {
  const envelope = requireRecord(input, "live input envelope");

  if (envelope.schemaVersion !== "live-input.v1") {
    throw new Error("schemaVersion must be live-input.v1");
  }

  return {
    schemaVersion: "live-input.v1",
    intersectionId: requireNonEmptyString(envelope.intersectionId, "intersectionId"),
    receivedAt: requireIsoDateString(envelope.receivedAt, "receivedAt"),
    cameraFrames: requireArray(envelope.cameraFrames, "cameraFrames").map(
      normalizeCameraFrame
    ),
    signalSnapshot:
      envelope.signalSnapshot === null
        ? null
        : normalizeSignalSnapshot(envelope.signalSnapshot)
  };
}

export function toSyntheticReplayInput(
  envelope: LiveInputEnvelope
): ReplayCompatibleLiveInput {
  const firstFrame = envelope.cameraFrames[0];
  if (!firstFrame) {
    throw new Error("cameraFrames must contain at least one frame");
  }
  if (!envelope.signalSnapshot) {
    throw new Error("signalSnapshot is required for replay-compatible input");
  }

  return {
    cameraId: firstFrame.cameraId,
    detections: envelope.cameraFrames.flatMap((frame) =>
      frame.detections.map(toSyntheticDetection)
    ),
    signal: {
      intersectionId: envelope.intersectionId,
      currentPhase: envelope.signalSnapshot.currentPhase,
      remainingSeconds: envelope.signalSnapshot.remainingSeconds,
      nextPhase: envelope.signalSnapshot.nextPhase,
      controllerMode: envelope.signalSnapshot.controllerMode,
      manualOverride: envelope.signalSnapshot.manualOverride
    }
  };
}

function normalizeCameraFrame(input: unknown): LiveCameraFrame {
  const frame = requireRecord(input, "camera frame");

  return {
    cameraId: requireNonEmptyString(frame.cameraId, "cameraId"),
    frameId: requireNonEmptyString(frame.frameId, "frameId"),
    capturedAt: requireIsoDateString(frame.capturedAt, "capturedAt"),
    detections: requireArray(frame.detections, "detections").map(normalizeDetection)
  };
}

function normalizeDetection(input: unknown): LiveDetection {
  const detection = requireRecord(input, "detection");
  const confidence = requireFiniteNumber(detection.confidence, "detection confidence");
  const classLabel = requireOneOf(
    detection.classLabel,
    DETECTION_CLASS_LABELS,
    "classLabel"
  );

  if (confidence < 0 || confidence > 1) {
    throw new Error("detection confidence must be between 0 and 1");
  }

  return {
    objectId: requireNonEmptyString(detection.objectId, "objectId"),
    classLabel,
    confidence,
    direction:
      classLabel === "emergency_vehicle" && detection.direction === null
        ? null
        : requireOneOf(detection.direction, DIRECTIONS, "direction"),
    laneId: requireNonEmptyString(detection.laneId, "laneId"),
    count: requireNonNegativeInteger(detection.count, "count"),
    ...(detection.distanceMeters === undefined
      ? {}
      : { distanceMeters: requireFiniteNumber(detection.distanceMeters, "distanceMeters") }),
    ...(detection.waitingSeconds === undefined
      ? {}
      : { waitingSeconds: requireFiniteNumber(detection.waitingSeconds, "waitingSeconds") })
  };
}

function normalizeSignalSnapshot(input: unknown): LiveSignalSnapshot {
  const signal = requireRecord(input, "signal snapshot");

  return {
    controllerId: requireNonEmptyString(signal.controllerId, "controllerId"),
    capturedAt: requireIsoDateString(signal.capturedAt, "signal capturedAt"),
    currentPhase: requireOneOf(signal.currentPhase, SIGNAL_PHASES, "currentPhase"),
    remainingSeconds: requireNonNegativeInteger(
      signal.remainingSeconds,
      "remainingSeconds"
    ),
    nextPhase: requireOneOf(signal.nextPhase, SIGNAL_PHASES, "nextPhase"),
    controllerMode: requireOneOf(signal.controllerMode, CONTROLLER_MODES, "controllerMode"),
    manualOverride: requireBoolean(signal.manualOverride, "manualOverride")
  };
}

function toSyntheticDetection(detection: LiveDetection): SyntheticDetection {
  return {
    type: detection.classLabel,
    lane: detection.laneId,
    direction: detection.direction,
    count: detection.count,
    confidence: detection.confidence,
    ...(detection.distanceMeters === undefined
      ? {}
      : { distanceMeters: detection.distanceMeters }),
    ...(detection.waitingSeconds === undefined
      ? {}
      : { waitingSeconds: detection.waitingSeconds })
  };
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireIsoDateString(value: unknown, label: string): string {
  const text = requireNonEmptyString(value, label);
  if (Number.isNaN(Date.parse(text))) {
    throw new Error(`${label} must be an ISO date string`);
  }
  return text;
}

function requireFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function requireNonNegativeInteger(value: unknown, label: string): number {
  const numberValue = requireFiniteNumber(value, label);
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return numberValue;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function requireOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${label} is not supported`);
  }
  return value as T;
}
