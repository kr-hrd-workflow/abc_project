import { normalizeLiveInputEnvelope } from "./liveInputContract";
import type { LiveInputEnvelope, LiveSignalSnapshot } from "./liveInputContract";
import type { Direction } from "./types";

export type AiHubVehicleEvidence = {
  source: "aihub_vehicle_sample";
  schemaVersion: "aihub-vehicle-sample.v1";
  dataset: {
    id: "71573";
    name: "CCTV 기반 차량정보 및 교통정보 계측 데이터";
    sampleKind: "AI-Hub sample(light)";
  };
  sourceFrame: {
    frameId: string;
    rawDataId: string;
    locationId: string;
    locationName: string;
    cameraId: string;
    capturedAt: string;
    imageExtension: string;
    resolution: {
      width: number;
      height: number;
    };
    gps: {
      latitude: number;
      longitude: number;
    } | null;
  };
  detectorSummary: {
    vehicleBoxCount: number;
    classCounts: Record<string, number>;
    confidence: "label_ground_truth";
    canPopulateDetections: boolean;
  };
  replayReadiness: {
    status: "needs_direction_and_signal_calibration";
    adapterBoundary: "live-input.v1";
    missingInputs: ["approach_direction_by_camera", "signal_phase_remaining_time"];
    reason: string;
  };
};

export type AiHubVehicleLiveInputOptions = {
  approachDirection: Direction;
  receivedAt: string;
  signalSnapshot: LiveSignalSnapshot;
};

export type AiHubCameraApproachCalibration = {
  source: "operator_camera_survey";
  schemaVersion: "aihub-camera-approach-calibration.v1";
  mappings: {
    locationId: string;
    cameraId: string;
    approachDirection: Direction;
    evidence: string;
  }[];
};

export type AiHubVehicleLiveInputCalibrationOptions = {
  calibration: AiHubCameraApproachCalibration;
  receivedAt: string;
  signalSnapshot: LiveSignalSnapshot;
};

type AiHubVehicleAnnotation = {
  class_id?: unknown;
  type?: unknown;
  coord?: unknown;
};

export function buildAiHubVehicleEvidence(input: unknown): AiHubVehicleEvidence {
  const label = normalizeAiHubVehicleLabel(input);
  const vehicleAnnotations = getVehicleAnnotations(label.annotations);
  const classCounts = countClasses(vehicleAnnotations);

  return {
    source: "aihub_vehicle_sample",
    schemaVersion: "aihub-vehicle-sample.v1",
    dataset: {
      id: "71573",
      name: "CCTV 기반 차량정보 및 교통정보 계측 데이터",
      sampleKind: "AI-Hub sample(light)"
    },
    sourceFrame: {
      frameId: label.sourceDataId,
      rawDataId: label.rawDataId,
      locationId: label.locationId,
      locationName: label.locationName,
      cameraId: buildCameraId(label.locationId, label.cctvNumber),
      capturedAt: buildCapturedAt(label.date, label.extractTime),
      imageExtension: label.imageExtension,
      resolution: label.resolution,
      gps: label.gps
    },
    detectorSummary: {
      vehicleBoxCount: vehicleAnnotations.length,
      classCounts,
      confidence: "label_ground_truth",
      canPopulateDetections: vehicleAnnotations.length > 0
    },
    replayReadiness: {
      status: "needs_direction_and_signal_calibration",
      adapterBoundary: "live-input.v1",
      missingInputs: [
        "approach_direction_by_camera",
        "signal_phase_remaining_time"
      ],
      reason:
        "AI-Hub vehicle appearance labels provide authorized frame and bbox evidence but do not include approach direction or signal phase."
    }
  };
}

export function buildAiHubVehicleLiveInputEnvelope(
  input: unknown,
  options: AiHubVehicleLiveInputOptions
): LiveInputEnvelope {
  const evidence = buildAiHubVehicleEvidence(input);

  return normalizeLiveInputEnvelope({
    schemaVersion: "live-input.v1",
    intersectionId: `AIHUB-${evidence.sourceFrame.locationId}`,
    receivedAt: options.receivedAt,
    cameraFrames: [
      {
        cameraId: evidence.sourceFrame.cameraId,
        frameId: evidence.sourceFrame.frameId,
        capturedAt: evidence.sourceFrame.capturedAt,
        detections: [
          {
            objectId: `${evidence.sourceFrame.frameId}-vehicle-001`,
            classLabel: "vehicle",
            confidence: 1,
            direction: options.approachDirection,
            laneId: `${options.approachDirection}_aihub_${evidence.sourceFrame.locationId}_${getCameraNumber(evidence.sourceFrame.cameraId)}`,
            count: evidence.detectorSummary.vehicleBoxCount
          }
        ]
      }
    ],
    signalSnapshot: options.signalSnapshot
  });
}

export function buildAiHubVehicleLiveInputEnvelopeFromCalibration(
  input: unknown,
  options: AiHubVehicleLiveInputCalibrationOptions
): LiveInputEnvelope {
  const evidence = buildAiHubVehicleEvidence(input);
  const mapping = options.calibration.mappings.find(
    (candidate) =>
      candidate.locationId === evidence.sourceFrame.locationId &&
      candidate.cameraId === evidence.sourceFrame.cameraId
  );

  if (!mapping) {
    throw new Error(
      `camera-to-approach calibration is required for ${evidence.sourceFrame.cameraId} at ${evidence.sourceFrame.locationId}`
    );
  }

  return buildAiHubVehicleLiveInputEnvelope(input, {
    approachDirection: mapping.approachDirection,
    receivedAt: options.receivedAt,
    signalSnapshot: options.signalSnapshot
  });
}

function normalizeAiHubVehicleLabel(input: unknown) {
  const root = requireRecord(input, "AI-Hub label");
  const raw = requireRecord(
    root["Raw Data Info"] ?? root.Raw_Data_Info,
    "Raw Data Info"
  );
  const source = requireRecord(
    root["Source Data Info"] ?? root.Source_Data_Info,
    "Source Data Info"
  );
  const learning = requireRecord(
    root["Learning Data Info"] ?? root.Learning_Data_Info,
    "Learning Data Info"
  );

  const resolution = parseResolution(
    requireNonEmptyString(raw.resolution, "resolution")
  );
  const gps = parseGps(raw.cctv_gps);

  return {
    rawDataId: requireNonEmptyString(
      raw.raw_data_id ?? raw.raw_data_ID,
      "raw data id"
    ),
    locationId: requireNonEmptyString(
      raw.location_id ?? raw.location_ID,
      "location id"
    ),
    locationName: requireNonEmptyString(
      raw.location_name,
      "location name"
    ),
    cctvNumber: requireNonEmptyString(raw.cctv_number, "cctv number"),
    date: requireNonEmptyString(raw.date, "date"),
    sourceDataId: requireNonEmptyString(
      source.source_data_id ?? source.source_data_ID,
      "source data id"
    ),
    extractTime: requireNonEmptyString(source.extract_time, "extract time"),
    imageExtension: requireNonEmptyString(
      source.file_extension,
      "source file extension"
    ),
    resolution,
    gps,
    annotations: requireArray(learning.annotations, "annotations")
  };
}

function getVehicleAnnotations(annotations: unknown[]): AiHubVehicleAnnotation[] {
  return annotations.filter((annotation): annotation is AiHubVehicleAnnotation => {
    if (!annotation || typeof annotation !== "object" || Array.isArray(annotation)) {
      return false;
    }
    const candidate = annotation as AiHubVehicleAnnotation;
    return (
      candidate.type === "bbox" &&
      typeof candidate.class_id === "string" &&
      candidate.class_id.startsWith("car-") &&
      Array.isArray(candidate.coord)
    );
  });
}

function countClasses(annotations: AiHubVehicleAnnotation[]): Record<string, number> {
  return annotations.reduce<Record<string, number>>((counts, annotation) => {
    const classId = String(annotation.class_id);
    counts[classId] = (counts[classId] ?? 0) + 1;
    return counts;
  }, {});
}

function buildCameraId(locationId: string, cctvNumber: string): string {
  return `aihub-${locationId}-${cctvNumber.padStart(2, "0")}`;
}

function buildCapturedAt(date: string, extractTime: string): string {
  return `${date}T${extractTime}.000+09:00`;
}

function getCameraNumber(cameraId: string): string {
  return cameraId.split("-").at(-1) ?? "unknown";
}

function parseResolution(value: string): { width: number; height: number } {
  const parts = value.split(",").map((part) => Number(part.trim()));
  const [width, height] = parts;
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error("resolution must contain width and height");
  }
  return { width, height };
}

function parseGps(value: unknown): { latitude: number; longitude: number } | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error("cctv_gps must contain latitude and longitude");
  }
  const [latitude, longitude] = value;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error("cctv_gps values must be finite numbers");
  }
  return { latitude, longitude };
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
