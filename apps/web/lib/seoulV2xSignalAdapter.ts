import type { LiveSignalSnapshot } from "./liveInputContract";
import type { Direction } from "./types";

const SERVICE_ENDPOINT =
  "http://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingInformation/1.0";

type SignalPhase = LiveSignalSnapshot["currentPhase"];

export type SeoulV2xSignalEvidence = {
  source: "seoul_v2x_signal_remaining_time";
  schemaVersion: "seoul-v2x-signal.v1";
  service: {
    name: "신호제어기 잔여시간 정보 서비스";
    endpoint: typeof SERVICE_ENDPOINT;
  };
  sourceMessage: {
    dataId: string;
    intersectionId: string;
    controllerId: string;
    capturedAt: string;
  };
  straightSignalCandidates: {
    direction: Direction;
    remainingSeconds: number;
    sourceField: string;
  }[];
  replayReadiness: {
    status: "signal_snapshot_ready" | "needs_current_phase_candidate";
    adapterBoundary: "live-input.v1";
    missingInputs: [] | ["cardinal_straight_signal_remaining_time"];
    selectedCurrentPhase: SignalPhase | null;
  };
};

export type SeoulV2xSignalSnapshotOptions = {
  controllerMode: LiveSignalSnapshot["controllerMode"];
  manualOverride: boolean;
  nextPhase: LiveSignalSnapshot["nextPhase"];
};

const CARDINAL_STRAIGHT_FIELDS: {
  direction: Direction;
  sourceField: string;
}[] = [
  { direction: "north", sourceField: "ntStsgRmdrCs" },
  { direction: "east", sourceField: "etStsgRmdrCs" },
  { direction: "south", sourceField: "stStsgRmdrCs" },
  { direction: "west", sourceField: "wtStsgRmdrCs" }
];

export function buildSeoulV2xSignalEvidence(
  input: unknown
): SeoulV2xSignalEvidence {
  const message = normalizeSeoulV2xMessage(input);
  const straightSignalCandidates = buildStraightSignalCandidates(message.raw);
  const selectedCandidate = straightSignalCandidates[0] ?? null;

  return {
    source: "seoul_v2x_signal_remaining_time",
    schemaVersion: "seoul-v2x-signal.v1",
    service: {
      name: "신호제어기 잔여시간 정보 서비스",
      endpoint: SERVICE_ENDPOINT
    },
    sourceMessage: {
      dataId: message.dataId,
      intersectionId: message.intersectionId,
      controllerId: message.controllerId,
      capturedAt: message.capturedAt
    },
    straightSignalCandidates,
    replayReadiness: selectedCandidate
      ? {
          status: "signal_snapshot_ready",
          adapterBoundary: "live-input.v1",
          missingInputs: [],
          selectedCurrentPhase: `${selectedCandidate.direction}_priority`
        }
      : {
          status: "needs_current_phase_candidate",
          adapterBoundary: "live-input.v1",
          missingInputs: ["cardinal_straight_signal_remaining_time"],
          selectedCurrentPhase: null
        }
  };
}

export function buildSeoulV2xSignalSnapshot(
  input: unknown,
  options: SeoulV2xSignalSnapshotOptions
): LiveSignalSnapshot {
  const evidence = buildSeoulV2xSignalEvidence(input);
  const selected = evidence.straightSignalCandidates[0];

  if (!selected || !evidence.replayReadiness.selectedCurrentPhase) {
    throw new Error("cardinal straight signal remaining time is required");
  }

  return {
    controllerId: evidence.sourceMessage.controllerId,
    capturedAt: evidence.sourceMessage.capturedAt,
    currentPhase: evidence.replayReadiness.selectedCurrentPhase,
    remainingSeconds: selected.remainingSeconds,
    nextPhase: options.nextPhase,
    controllerMode: options.controllerMode,
    manualOverride: options.manualOverride
  };
}

export function selectLatestSeoulV2xSignalMessage(
  input: unknown
): Record<string, unknown> {
  const messages = requireArray(input, "Seoul V2X signal API response").map(
    (message) => requireRecord(message, "Seoul V2X signal message")
  );
  if (messages.length === 0) {
    throw new Error("Seoul V2X signal API response must not be empty");
  }

  return [...messages].sort(
    (a, b) =>
      requireFiniteNumber(b.trsmUtcTime, "trsmUtcTime") -
      requireFiniteNumber(a.trsmUtcTime, "trsmUtcTime")
  )[0];
}

function normalizeSeoulV2xMessage(input: unknown) {
  const raw = requireRecord(input, "Seoul V2X signal message");

  return {
    raw,
    dataId: requireNonEmptyString(raw.dataId, "dataId"),
    intersectionId: String(requireFiniteNumber(raw.itstId, "itstId")),
    controllerId: requireNonEmptyString(raw.eqmnId, "eqmnId"),
    capturedAt: buildCapturedAt(raw)
  };
}

function buildStraightSignalCandidates(raw: Record<string, unknown>) {
  return CARDINAL_STRAIGHT_FIELDS.map(({ direction, sourceField }) => {
    const remainingSeconds = normalizeRemainingSeconds(raw[sourceField]);
    return remainingSeconds === null
      ? null
      : { direction, remainingSeconds, sourceField };
  })
    .filter(
      (
        candidate
      ): candidate is {
        direction: Direction;
        remainingSeconds: number;
        sourceField: string;
      } => Boolean(candidate)
    )
    .sort((a, b) => b.remainingSeconds - a.remainingSeconds);
}

function normalizeRemainingSeconds(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const deciseconds =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(deciseconds) || deciseconds <= 0) {
    return null;
  }
  return Math.ceil(deciseconds / 10);
}

function buildCapturedAt(raw: Record<string, unknown>): string {
  const utcMillis = requireFiniteNumber(raw.trsmUtcTime, "trsmUtcTime");
  const date = new Date(utcMillis);
  if (Number.isNaN(date.getTime())) {
    throw new Error("trsmUtcTime must be a valid UTC epoch milliseconds value");
  }
  return date.toISOString();
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

function requireFiniteNumber(value: unknown, label: string): number {
  const numberValue =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${label} must be a finite number`);
  }
  return numberValue;
}
