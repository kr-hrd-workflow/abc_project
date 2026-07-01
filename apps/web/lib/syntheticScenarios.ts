import type { Direction, ScenarioId } from "./types";

export type SyntheticScenarioFamily = ScenarioId;

export type SyntheticDetectionType =
  | "vehicle"
  | "emergency_vehicle"
  | "pedestrian"
  | "stalled_vehicle";

export type SyntheticDetection = {
  type: SyntheticDetectionType;
  lane: string;
  direction: Direction | null;
  count: number;
  confidence: number;
  distanceMeters?: number;
  waitingSeconds?: number;
};

export type SyntheticSignalSnapshot = {
  intersectionId: string;
  currentPhase: `${Direction}_priority` | "normal_cycle";
  remainingSeconds: number;
  nextPhase: `${Direction}_priority` | "normal_cycle";
  controllerMode: "adaptive" | "fixed" | "manual";
  manualOverride: boolean;
};

export type SyntheticExpectedOutcome = {
  recommendation:
    | "emergency_priority"
    | "safety_hold"
    | "pedestrian_priority"
    | "blocked_response"
    | "normal_cycle";
  mustIncludeReason: string;
  mustNotRecommend: string[];
};

export type SyntheticScenarioCase = {
  id: string;
  family: SyntheticScenarioFamily;
  timestamp: string;
  cameraId: string;
  signal: SyntheticSignalSnapshot;
  detections: SyntheticDetection[];
  expected: SyntheticExpectedOutcome;
};

export type SyntheticScenarioDatasetOptions = {
  caseCount: number;
  seed: number;
};

const FAMILIES: SyntheticScenarioFamily[] = ["emergency", "pedestrian", "blocked", "normal"];
const DIRECTIONS: Direction[] = ["east", "north", "west", "south"];

export function generateSyntheticScenarioDataset({
  caseCount,
  seed
}: SyntheticScenarioDatasetOptions): SyntheticScenarioCase[] {
  if (!Number.isInteger(caseCount) || caseCount < 0) {
    throw new Error("caseCount must be a non-negative integer");
  }
  if (!Number.isInteger(seed)) {
    throw new Error("seed must be an integer");
  }

  const random = createSeededRandom(seed);

  return Array.from({ length: caseCount }, (_, index) => {
    const family = FAMILIES[index % FAMILIES.length];
    const direction = DIRECTIONS[Math.floor(random() * DIRECTIONS.length)] ?? "east";
    const queueBase = 10 + Math.floor(random() * 26);
    const remainingSeconds = 8 + Math.floor(random() * 28);
    const timestamp = new Date(Date.UTC(2026, 5, 30, 1, 0, index * 10)).toISOString();

    return buildScenarioCase({
      id: `synthetic-${String(seed).padStart(4, "0")}-${String(index + 1).padStart(4, "0")}`,
      family,
      timestamp,
      direction,
      queueBase,
      remainingSeconds
    });
  });
}

function buildScenarioCase({
  id,
  family,
  timestamp,
  direction,
  queueBase,
  remainingSeconds
}: {
  id: string;
  family: SyntheticScenarioFamily;
  timestamp: string;
  direction: Direction;
  queueBase: number;
  remainingSeconds: number;
}): SyntheticScenarioCase {
  const signal = buildSignalSnapshot(direction, remainingSeconds, family === "normal");
  const baseVehicle: SyntheticDetection = {
    type: "vehicle",
    lane: `${direction}_through_1`,
    direction,
    count: queueBase,
    confidence: 0.94,
    waitingSeconds: family === "normal" ? 12 : 45
  };

  const familyDetails = buildFamilyDetails(family, direction, queueBase);

  return {
    id,
    family,
    timestamp,
    cameraId: `${direction}_cam_01`,
    signal,
    detections: [baseVehicle, ...familyDetails.detections],
    expected: familyDetails.expected
  };
}

function buildSignalSnapshot(
  direction: Direction,
  remainingSeconds: number,
  normalCycle: boolean
): SyntheticSignalSnapshot {
  const nextDirection = DIRECTIONS[(DIRECTIONS.indexOf(direction) + 1) % DIRECTIONS.length] ?? "north";

  return {
    intersectionId: "INT-SYN-0001",
    currentPhase: normalCycle ? "normal_cycle" : `${direction}_priority`,
    remainingSeconds,
    nextPhase: normalCycle ? `${nextDirection}_priority` : "normal_cycle",
    controllerMode: normalCycle ? "fixed" : "adaptive",
    manualOverride: false
  };
}

function buildFamilyDetails(
  family: SyntheticScenarioFamily,
  direction: Direction,
  queueBase: number
): {
  detections: SyntheticDetection[];
  expected: SyntheticExpectedOutcome;
} {
  if (family === "emergency") {
    return {
      detections: [
        {
          type: "emergency_vehicle",
          lane: `${direction}_approach_1`,
          direction,
          count: 1,
          confidence: 0.97,
          distanceMeters: 90 + queueBase
        }
      ],
      expected: {
        recommendation: "emergency_priority",
        mustIncludeReason: "emergency_vehicle_approach",
        mustNotRecommend: ["pedestrian_priority", "normal_cycle"]
      }
    };
  }

  if (family === "pedestrian") {
    return {
      detections: [
        {
          type: "pedestrian",
          lane: `${direction}_crosswalk`,
          direction,
          count: 4 + Math.round(queueBase / 8),
          confidence: 0.91,
          waitingSeconds: 70
        }
      ],
      expected: {
        recommendation: "pedestrian_priority",
        mustIncludeReason: "pedestrian_waiting",
        mustNotRecommend: ["emergency_priority", "normal_cycle"]
      }
    };
  }

  if (family === "blocked") {
    return {
      detections: [
        {
          type: "stalled_vehicle",
          lane: `${direction}_box`,
          direction,
          count: 2,
          confidence: 0.89,
          waitingSeconds: 110
        }
      ],
      expected: {
        recommendation: "blocked_response",
        mustIncludeReason: "intersection_blocked",
        mustNotRecommend: ["normal_cycle"]
      }
    };
  }

  return {
    detections: [],
    expected: {
      recommendation: "normal_cycle",
      mustIncludeReason: "normal_flow",
      mustNotRecommend: ["emergency_priority", "pedestrian_priority", "blocked_response"]
    }
  };
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
