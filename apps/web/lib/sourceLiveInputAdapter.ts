import type {
  LiveDetectionClassLabel,
  LiveInputEnvelope,
  LiveSignalSnapshot,
  ReplayCompatibleLiveInput
} from "./liveInputContract";
import {
  normalizeLiveInputEnvelope,
  toSyntheticReplayInput
} from "./liveInputContract";
import type { Direction } from "./types";
import type { SyntheticDetectionType } from "./syntheticScenarios";

export type RoadVisionObjectClass =
  | "ambulance"
  | "fire_truck"
  | "car"
  | "bus"
  | "pedestrian"
  | "stopped_vehicle";

export type RoadVisionDetectorFrame = {
  provider: "road-vision.fixture.v1";
  siteId: string;
  camera: {
    id: string;
    approach: Direction;
  };
  frame: {
    id: string;
    capturedAt: string;
  };
  objects: {
    trackId: string;
    className: RoadVisionObjectClass;
    score: number;
    approach: Direction;
    laneRef: string;
    objectCount: number;
    distanceToStopLineM?: number;
    stationarySeconds?: number;
  }[];
};

export type SignalControllerFrame = {
  provider: "signal-controller.fixture.v1";
  siteId: string;
  controllerRef: string;
  sampledAt: string;
  activePlan: "adaptive" | "fixed" | "manual";
  phase: {
    active: "N_GREEN" | "S_GREEN" | "E_GREEN" | "W_GREEN" | "NORMAL";
    secondsRemaining: number;
    next: "N_GREEN" | "S_GREEN" | "E_GREEN" | "W_GREEN" | "NORMAL";
  };
  operatorOverride: boolean;
};

export type SourceSpecificLiveInputFixture = {
  detector: RoadVisionDetectorFrame;
  signal: SignalControllerFrame;
  receivedAt: string;
};

export type SourceSpecificLiveInputExport = {
  source: "source_specific_adapter_fixture";
  sourceFormats: {
    detector: RoadVisionDetectorFrame["provider"];
    signal: SignalControllerFrame["provider"];
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

export function buildSourceSpecificLiveInputFixture(): SourceSpecificLiveInputFixture {
  const capturedAt = "2026-07-01T09:10:00.000Z";

  return {
    receivedAt: "2026-07-01T09:10:01.000Z",
    detector: {
      provider: "road-vision.fixture.v1",
      siteId: "INT-SEO-0001",
      camera: {
        id: "rv-east-01",
        approach: "east"
      },
      frame: {
        id: "rv-frame-20260701-0001",
        capturedAt
      },
      objects: [
        {
          trackId: "trk-amb-001",
          className: "ambulance",
          score: 0.96,
          approach: "east",
          laneRef: "east_approach_1",
          objectCount: 1,
          distanceToStopLineM: 68
        },
        {
          trackId: "trk-ped-014",
          className: "pedestrian",
          score: 0.91,
          approach: "south",
          laneRef: "south_crosswalk",
          objectCount: 3,
          stationarySeconds: 72
        },
        {
          trackId: "trk-car-221",
          className: "car",
          score: 0.88,
          approach: "west",
          laneRef: "west_approach_2",
          objectCount: 8,
          distanceToStopLineM: 24
        }
      ]
    },
    signal: {
      provider: "signal-controller.fixture.v1",
      siteId: "INT-SEO-0001",
      controllerRef: "sc-seo-01",
      sampledAt: capturedAt,
      activePlan: "adaptive",
      phase: {
        active: "E_GREEN",
        secondsRemaining: 18,
        next: "NORMAL"
      },
      operatorOverride: false
    }
  };
}

export function buildSourceSpecificLiveInputEnvelope(
  fixture: SourceSpecificLiveInputFixture
): LiveInputEnvelope {
  if (fixture.detector.siteId !== fixture.signal.siteId) {
    throw new Error("detector and signal site ids must match");
  }

  return normalizeLiveInputEnvelope({
    schemaVersion: "live-input.v1",
    intersectionId: fixture.detector.siteId,
    receivedAt: fixture.receivedAt,
    cameraFrames: [
      {
        cameraId: fixture.detector.camera.id,
        frameId: fixture.detector.frame.id,
        capturedAt: fixture.detector.frame.capturedAt,
        detections: fixture.detector.objects.map((object) => ({
          objectId: object.trackId,
          classLabel: mapRoadVisionClass(object.className),
          confidence: object.score,
          direction: object.approach,
          laneId: object.laneRef,
          count: object.objectCount,
          ...(object.distanceToStopLineM === undefined
            ? {}
            : { distanceMeters: object.distanceToStopLineM }),
          ...(object.stationarySeconds === undefined
            ? {}
            : { waitingSeconds: object.stationarySeconds })
        }))
      }
    ],
    signalSnapshot: {
      controllerId: fixture.signal.controllerRef,
      capturedAt: fixture.signal.sampledAt,
      currentPhase: mapSignalPhase(fixture.signal.phase.active),
      remainingSeconds: fixture.signal.phase.secondsRemaining,
      nextPhase: mapSignalPhase(fixture.signal.phase.next),
      controllerMode: fixture.signal.activePlan,
      manualOverride: fixture.signal.operatorOverride
    }
  });
}

export function buildSourceSpecificReplayInput(
  fixture: SourceSpecificLiveInputFixture
): ReplayCompatibleLiveInput {
  return toSyntheticReplayInput(buildSourceSpecificLiveInputEnvelope(fixture));
}

export function buildSourceSpecificLiveInputExport(): SourceSpecificLiveInputExport {
  const fixture = buildSourceSpecificLiveInputFixture();
  const envelope = buildSourceSpecificLiveInputEnvelope(fixture);
  const replayInput = toSyntheticReplayInput(envelope);

  return {
    source: "source_specific_adapter_fixture",
    sourceFormats: {
      detector: fixture.detector.provider,
      signal: fixture.signal.provider
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

function mapRoadVisionClass(
  className: RoadVisionObjectClass
): LiveDetectionClassLabel {
  switch (className) {
    case "ambulance":
    case "fire_truck":
      return "emergency_vehicle";
    case "pedestrian":
      return "pedestrian";
    case "stopped_vehicle":
      return "stalled_vehicle";
    case "car":
    case "bus":
      return "vehicle";
  }
}

function mapSignalPhase(
  phase: SignalControllerFrame["phase"]["active"]
): LiveSignalSnapshot["currentPhase"] {
  switch (phase) {
    case "N_GREEN":
      return "north_priority";
    case "S_GREEN":
      return "south_priority";
    case "E_GREEN":
      return "east_priority";
    case "W_GREEN":
      return "west_priority";
    case "NORMAL":
      return "normal_cycle";
  }
}
