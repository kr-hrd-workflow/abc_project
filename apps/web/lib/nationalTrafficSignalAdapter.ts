import type { LiveSignalSnapshot } from "./liveInputContract";
import type { Direction } from "./types";

const SERVICE_ENDPOINT = "https://apis.data.go.kr/B551982/rti/tl_drct_info";
const SERVICE_NAME =
  "행정안전부 한국지역정보개발원_(전국 통합데이터) 교통안전 신호등 실시간 정보";

type SignalPhase = LiveSignalSnapshot["currentPhase"];

export type NationalTrafficSignalEvidence = {
  source: "national_traffic_signal_real_time";
  schemaVersion: "national-traffic-signal.v1";
  service: {
    name: typeof SERVICE_NAME;
    endpoint: typeof SERVICE_ENDPOINT;
  };
  sourceMessage: {
    stdgCd: string;
    lclgvNm: string;
    intersectionId: string;
    intersectionName: string | null;
    controllerId: string;
    capturedAt: string;
  };
  straightSignalCandidates: {
    direction: Direction;
    remainingSeconds: number;
    sourceField: string;
    statusField: string;
    statusName: string | null;
  }[];
  replayReadiness:
    | {
        status: "signal_snapshot_ready";
        adapterBoundary: "live-input.v1";
        missingInputs: [];
        selectedCurrentPhase: SignalPhase;
      }
    | {
        status: "needs_current_phase_candidate";
        adapterBoundary: "live-input.v1";
        missingInputs: ["cardinal_straight_signal_remaining_time"];
        selectedCurrentPhase: null;
      };
};

export type NationalTrafficSignalRowSelector = {
  crsrdId: string;
};

export type NationalTrafficSignalSnapshotOptions = {
  controllerMode: LiveSignalSnapshot["controllerMode"];
  manualOverride: boolean;
  nextPhase: LiveSignalSnapshot["nextPhase"];
};

const CARDINAL_STRAIGHT_FIELDS: {
  direction: Direction;
  sourceField: string;
  statusField: string;
}[] = [
  {
    direction: "north",
    sourceField: "ntStsgRmndCs",
    statusField: "ntStsgSttsNm"
  },
  {
    direction: "east",
    sourceField: "etStsgRmndCs",
    statusField: "etStsgSttsNm"
  },
  {
    direction: "south",
    sourceField: "stStsgRmndCs",
    statusField: "stStsgSttsNm"
  },
  {
    direction: "west",
    sourceField: "wtStsgRmndCs",
    statusField: "wtStsgSttsNm"
  }
];

export function buildNationalTrafficSignalEvidence(
  input: unknown,
  selector: NationalTrafficSignalRowSelector
): NationalTrafficSignalEvidence {
  const row = selectNationalTrafficSignalRow(input, selector);
  const normalized = normalizeNationalTrafficSignalRow(row);
  const straightSignalCandidates = buildStraightSignalCandidates(row);
  const selectedCandidate = straightSignalCandidates[0] ?? null;

  return {
    source: "national_traffic_signal_real_time",
    schemaVersion: "national-traffic-signal.v1",
    service: {
      name: SERVICE_NAME,
      endpoint: SERVICE_ENDPOINT
    },
    sourceMessage: normalized,
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

export function buildNationalTrafficSignalSnapshot(
  input: unknown,
  selector: NationalTrafficSignalRowSelector,
  options: NationalTrafficSignalSnapshotOptions
): LiveSignalSnapshot {
  const evidence = buildNationalTrafficSignalEvidence(input, selector);
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

function selectNationalTrafficSignalRow(
  input: unknown,
  selector: NationalTrafficSignalRowSelector
) {
  const rows = extractRows(input);
  const matches = rows.filter((row) => String(row.crsrdId) === selector.crsrdId);
  if (matches.length === 0) {
    throw new Error(`tl_drct_info row not found for crsrdId=${selector.crsrdId}`);
  }

  return [...matches].sort(
    (a, b) => parseTotDt(b.totDt).getTime() - parseTotDt(a.totDt).getTime()
  )[0];
}

function extractRows(input: unknown): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    return input.map((row) => requireRecord(row, "tl_drct_info row"));
  }

  const root = requireRecord(input, "national traffic signal response");
  const response = getOptionalRecord(root.response);
  const body = response ? getOptionalRecord(response.body) : getOptionalRecord(root.body);
  const items = body ? getOptionalRecord(body.items) : null;
  const item = items?.item ?? body?.item ?? root.item ?? input;

  if (Array.isArray(item)) {
    return item.map((row) => requireRecord(row, "tl_drct_info row"));
  }
  return [requireRecord(item, "tl_drct_info row")];
}

function normalizeNationalTrafficSignalRow(raw: Record<string, unknown>) {
  const stdgCd = requireNonEmptyString(raw.stdgCd, "stdgCd");
  const crsrdId = requireNonEmptyString(raw.crsrdId, "crsrdId");
  return {
    stdgCd,
    lclgvNm: requireNonEmptyString(raw.lclgvNm, "lclgvNm"),
    intersectionId: crsrdId,
    intersectionName:
      raw.crsrdNm === null || raw.crsrdNm === undefined || raw.crsrdNm === ""
        ? null
        : String(raw.crsrdNm),
    controllerId: `national-traffic-signal:${stdgCd}:${crsrdId}`,
    capturedAt: parseTotDt(raw.totDt).toISOString()
  };
}

function buildStraightSignalCandidates(raw: Record<string, unknown>) {
  return CARDINAL_STRAIGHT_FIELDS.map(
    ({ direction, sourceField, statusField }) => {
      const remainingSeconds = normalizeCentiseconds(raw[sourceField]);
      return remainingSeconds === null
        ? null
        : {
            direction,
            remainingSeconds,
            sourceField,
            statusField,
            statusName:
              raw[statusField] === null || raw[statusField] === undefined
                ? null
                : String(raw[statusField])
          };
    }
  )
    .filter(
      (
        candidate
      ): candidate is {
        direction: Direction;
        remainingSeconds: number;
        sourceField: string;
        statusField: string;
        statusName: string | null;
      } => Boolean(candidate)
    )
    .sort((a, b) => b.remainingSeconds - a.remainingSeconds);
}

function normalizeCentiseconds(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const centiseconds =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(centiseconds) || centiseconds <= 0) {
    return null;
  }
  return Math.ceil(centiseconds / 100);
}

function parseTotDt(value: unknown): Date {
  const text = requireNonEmptyString(value, "totDt");
  const match = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    throw new Error("totDt must use YYYYMMDDHHmmss");
  }
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 9,
      Number(minute),
      Number(second)
    )
  );
  if (Number.isNaN(date.getTime())) {
    throw new Error("totDt must be a valid timestamp");
  }
  return date;
}

function getOptionalRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}
