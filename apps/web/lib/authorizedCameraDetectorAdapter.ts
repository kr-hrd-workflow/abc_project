import {
  normalizeLiveInputEnvelope,
  type LiveDetectionClassLabel,
  type LiveInputEnvelope,
  type LiveSignalSnapshot
} from "./liveInputContract";
import type { Direction } from "./types";

const DETECTION_CLASS_LABELS: LiveDetectionClassLabel[] = [
  "vehicle",
  "emergency_vehicle",
  "pedestrian",
  "stalled_vehicle"
];

export type AuthorizedCameraDetectorOutputSummary = {
  source: "authorized_camera_detector_output";
  schemaVersion: "authorized-camera-detector-summary.v1";
  intersectionId: string;
  cameraId: string;
  frameId: string;
  capturedAt: string;
  detectionCount: number;
  classCounts: Record<string, number>;
  replayReadiness: {
    status: "needs_camera_approach_calibration";
    adapterBoundary: "live-input.v1";
    missingInputs: ["camera_approach_calibration"];
    reason: string;
  };
};

export type CameraApproachCalibration = {
  source: "operator_camera_survey";
  schemaVersion: "camera-approach-calibration.v1";
  mappings: {
    intersectionId: string;
    cameraId: string;
    approachDirection: Direction;
    evidence: string;
  }[];
};

export type AuthorizedCameraDetectorAdapterOptions = {
  calibration: CameraApproachCalibration;
  receivedAt: string;
  signalSnapshot: LiveSignalSnapshot;
};

type AuthorizedCameraDetectorOutput = {
  intersectionId: string;
  cameraId: string;
  frameId: string;
  capturedAt: string;
  detections: AuthorizedCameraDetection[];
};

type AuthorizedCameraDetection = {
  objectId: string;
  classLabel: LiveDetectionClassLabel;
  confidence: number;
  count: number;
  distanceMeters?: number;
  waitingSeconds?: number;
};

export function summarizeAuthorizedCameraDetectorOutput(
  input: unknown
): AuthorizedCameraDetectorOutputSummary {
  const output = normalizeAuthorizedCameraDetectorOutput(input);

  return {
    source: "authorized_camera_detector_output",
    schemaVersion: "authorized-camera-detector-summary.v1",
    intersectionId: output.intersectionId,
    cameraId: output.cameraId,
    frameId: output.frameId,
    capturedAt: output.capturedAt,
    detectionCount: output.detections.length,
    classCounts: countClasses(output.detections),
    replayReadiness: {
      status: "needs_camera_approach_calibration",
      adapterBoundary: "live-input.v1",
      missingInputs: ["camera_approach_calibration"],
      reason:
        "Authorized detector output supplies fresh frame detections, but approach direction must come from camera calibration."
    }
  };
}

export function buildLiveInputEnvelopeFromAuthorizedCameraDetectorOutput(
  input: unknown,
  options: AuthorizedCameraDetectorAdapterOptions
): LiveInputEnvelope {
  const output = normalizeAuthorizedCameraDetectorOutput(input);
  const mapping = options.calibration.mappings.find(
    (candidate) =>
      candidate.intersectionId === output.intersectionId &&
      candidate.cameraId === output.cameraId
  );

  if (!mapping) {
    throw new Error(
      `camera-to-approach calibration is required for ${output.cameraId} at ${output.intersectionId}`
    );
  }

  return normalizeLiveInputEnvelope({
    schemaVersion: "live-input.v1",
    intersectionId: output.intersectionId,
    receivedAt: options.receivedAt,
    cameraFrames: [
      {
        cameraId: output.cameraId,
        frameId: output.frameId,
        capturedAt: output.capturedAt,
        detections: output.detections.map((detection, index) => ({
          objectId: detection.objectId,
          classLabel: detection.classLabel,
          confidence: detection.confidence,
          direction: mapping.approachDirection,
          laneId: `${mapping.approachDirection}_${output.cameraId}_${String(
            index + 1
          ).padStart(3, "0")}`,
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
    signalSnapshot: options.signalSnapshot
  });
}

function normalizeAuthorizedCameraDetectorOutput(
  input: unknown
): AuthorizedCameraDetectorOutput {
  const root = requireRecord(input, "authorized camera detector output");

  if (root.source !== "authorized_camera_detector_output") {
    throw new Error("source must be authorized_camera_detector_output");
  }
  if (root.schemaVersion !== "authorized-camera-detector-output.v1") {
    throw new Error("schemaVersion must be authorized-camera-detector-output.v1");
  }

  return {
    intersectionId: requireNonEmptyString(root.intersectionId, "intersectionId"),
    cameraId: requireNonEmptyString(root.cameraId, "cameraId"),
    frameId: requireNonEmptyString(root.frameId, "frameId"),
    capturedAt: requireIsoDateString(root.capturedAt, "capturedAt"),
    detections: requireArray(root.detections, "detections").map(
      normalizeAuthorizedCameraDetection
    )
  };
}

function normalizeAuthorizedCameraDetection(
  input: unknown
): AuthorizedCameraDetection {
  const detection = requireRecord(input, "detection");
  const confidence = requireFiniteNumber(detection.confidence, "confidence");

  if (confidence < 0 || confidence > 1) {
    throw new Error("confidence must be between 0 and 1");
  }

  return {
    objectId: requireNonEmptyString(detection.objectId, "objectId"),
    classLabel: requireOneOf(
      detection.classLabel,
      DETECTION_CLASS_LABELS,
      "classLabel"
    ),
    confidence,
    count: requireNonNegativeInteger(detection.count, "count"),
    ...(detection.distanceMeters === undefined
      ? {}
      : { distanceMeters: requireFiniteNumber(detection.distanceMeters, "distanceMeters") }),
    ...(detection.waitingSeconds === undefined
      ? {}
      : { waitingSeconds: requireFiniteNumber(detection.waitingSeconds, "waitingSeconds") })
  };
}

function countClasses(
  detections: AuthorizedCameraDetection[]
): Record<string, number> {
  return detections.reduce<Record<string, number>>((counts, detection) => {
    counts[detection.classLabel] = (counts[detection.classLabel] ?? 0) + 1;
    return counts;
  }, {});
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
