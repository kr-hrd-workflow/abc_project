import type {
  SimulationFrameBufferEntry,
  SimulationFrameSnapshot
} from "../lib/simulationSnapshot";

export type SimulationFrameWorkerInboundMessage =
  | {
      type: "simulation-frame";
      frame: unknown;
      receivedAtMs: number;
      networkLatencyMs: number;
    }
  | { type: "reset" };

export type SimulationFrameWorkerOutboundMessage = {
  type: "simulation-frame-buffer";
  frames: SimulationFrameBufferEntry[];
};

export function normalizeSimulationFrameMessage(
  message: unknown
): SimulationFrameBufferEntry | null {
  if (!isRecord(message) || message.type !== "simulation-frame") return null;

  const frame = normalizeSimulationFrame(message.frame);
  if (!frame) return null;

  const receivedAtMs = finiteNumber(message.receivedAtMs);
  const capturedAtMs = Date.parse(frame.captured_at);
  if (receivedAtMs === null || !Number.isFinite(capturedAtMs)) return null;

  return {
    frame,
    receivedAtMs,
    networkLatencyMs: Math.round(Math.max(0, finiteNumber(message.networkLatencyMs) ?? 0)),
    capturedAtMs
  };
}

export function createSimulationFrameRingBuffer(capacity = 2) {
  const frames: SimulationFrameBufferEntry[] = [];
  const maxSize = Math.max(1, capacity);
  let activeScenarioId: string | null = null;

  return {
    push(entry: SimulationFrameBufferEntry) {
      if (activeScenarioId && activeScenarioId !== entry.frame.scenario_id) {
        frames.length = 0;
      }
      activeScenarioId = entry.frame.scenario_id;

      const existingIndex = frames.findIndex(
        (candidate) =>
          candidate.frame.scenario_id === entry.frame.scenario_id &&
          candidate.frame.sim_time_seconds === entry.frame.sim_time_seconds
      );

      if (existingIndex >= 0) {
        frames.splice(existingIndex, 1, cloneEntry(entry));
      } else {
        frames.push(cloneEntry(entry));
      }

      frames.sort(
        (left, right) => left.frame.sim_time_seconds - right.frame.sim_time_seconds
      );

      while (frames.length > maxSize) {
        frames.shift();
      }
    },
    reset() {
      frames.length = 0;
      activeScenarioId = null;
    },
    latestTwo() {
      return frames.slice(-2).map(cloneEntry);
    }
  };
}

function normalizeSimulationFrame(value: unknown): SimulationFrameSnapshot | null {
  if (!isRecord(value)) return null;
  if (typeof value.intersection_id !== "string") return null;
  if (typeof value.scenario_id !== "string") return null;
  const simTimeSeconds = finiteNumber(value.sim_time_seconds);
  if (simTimeSeconds === null) return null;
  if (typeof value.captured_at !== "string") return null;
  if (!Number.isFinite(Date.parse(value.captured_at))) return null;
  const boundsMeters = normalizeNumberRecord(value.bounds_meters);
  if (!boundsMeters) return null;
  const vehicles = normalizeVehicles(value.vehicles);
  if (!vehicles) return null;
  const densitySegments = normalizeDensitySegments(value.density_segments);
  if (!densitySegments) return null;
  const signals = normalizeSignals(value.signals);
  if (!signals) return null;
  const queues = normalizeQueues(value.queues);
  if (!queues) return null;
  const events = normalizeEvents(value.events);
  if (!events) return null;

  const source = typeof value.source === "string" ? value.source.trim() : "";
  const capturedAt = new Date(value.captured_at).toISOString();

  return {
    source: source || "unknown",
    intersection_id: value.intersection_id,
    scenario_id: value.scenario_id,
    sim_time_seconds: simTimeSeconds,
    captured_at: capturedAt,
    bounds_meters: boundsMeters,
    vehicles,
    density_segments: densitySegments,
    signals,
    queues,
    events
  };
}

function normalizeVehicles(
  value: unknown
): SimulationFrameSnapshot["vehicles"] | null {
  if (!Array.isArray(value)) return null;

  const vehicles: SimulationFrameSnapshot["vehicles"] = [];
  for (const vehicle of value) {
    if (!isRecord(vehicle)) return null;
    if (typeof vehicle.id !== "string") return null;
    if (!isVehicleType(vehicle.vehicle_type)) return null;
    if (typeof vehicle.lane_id !== "string") return null;
    const xMeters = finiteNumber(vehicle.x_meters);
    const yMeters = finiteNumber(vehicle.y_meters);
    const headingDegrees = finiteNumber(vehicle.heading_degrees);
    const speedMps = finiteNumber(vehicle.speed_mps);
    const waitingSeconds = finiteNumber(vehicle.waiting_seconds);
    if (
      xMeters === null ||
      yMeters === null ||
      headingDegrees === null ||
      speedMps === null ||
      waitingSeconds === null ||
      typeof vehicle.emergency !== "boolean"
    ) {
      return null;
    }

    vehicles.push({
      id: vehicle.id,
      vehicle_type: vehicle.vehicle_type,
      lane_id: vehicle.lane_id,
      x_meters: xMeters,
      y_meters: yMeters,
      heading_degrees: headingDegrees,
      speed_mps: speedMps,
      waiting_seconds: waitingSeconds,
      emergency: vehicle.emergency
    });
  }

  return vehicles;
}

function normalizeDensitySegments(
  value: unknown
): SimulationFrameSnapshot["density_segments"] | null {
  if (!Array.isArray(value)) return null;

  const segments: SimulationFrameSnapshot["density_segments"] = [];
  for (const segment of value) {
    if (!isRecord(segment)) return null;
    if (typeof segment.segment_id !== "string") return null;
    if (!isDirection(segment.approach)) return null;
    if (!isDensitySource(segment.source)) return null;
    const startMeters = finiteNumber(segment.start_meters_from_stop_line);
    const endMeters = finiteNumber(segment.end_meters_from_stop_line);
    const averageSpeedMps = finiteNumber(segment.average_speed_mps);
    const laneCount = integerNumber(segment.lane_count);
    const vehicleCount = integerNumber(segment.vehicle_count);
    if (
      startMeters === null ||
      endMeters === null ||
      averageSpeedMps === null ||
      laneCount === null ||
      vehicleCount === null
    ) {
      return null;
    }

    segments.push({
      segment_id: segment.segment_id,
      approach: segment.approach,
      start_meters_from_stop_line: startMeters,
      end_meters_from_stop_line: endMeters,
      lane_count: laneCount,
      vehicle_count: vehicleCount,
      average_speed_mps: averageSpeedMps,
      source: segment.source
    });
  }

  return segments;
}

function normalizeSignals(
  value: unknown
): SimulationFrameSnapshot["signals"] | null {
  if (!Array.isArray(value)) return null;

  const signals: SimulationFrameSnapshot["signals"] = [];
  for (const signal of value) {
    if (!isRecord(signal)) return null;
    if (typeof signal.signal_id !== "string") return null;
    if (!isDirection(signal.direction)) return null;
    if (!isSignalState(signal.state)) return null;
    const secondsRemaining = finiteNumber(signal.seconds_remaining);
    if (secondsRemaining === null) return null;

    signals.push({
      signal_id: signal.signal_id,
      direction: signal.direction,
      state: signal.state,
      seconds_remaining: secondsRemaining
    });
  }

  return signals;
}

function normalizeQueues(value: unknown): SimulationFrameSnapshot["queues"] | null {
  if (!isRecord(value)) return null;

  const north = finiteNumber(value.north);
  const south = finiteNumber(value.south);
  const east = finiteNumber(value.east);
  const west = finiteNumber(value.west);
  if (north === null || south === null || east === null || west === null) {
    return null;
  }

  return { north, south, east, west };
}

function normalizeEvents(value: unknown): SimulationFrameSnapshot["events"] | null {
  if (!Array.isArray(value)) return null;

  const events: SimulationFrameSnapshot["events"] = [];
  for (const event of value) {
    if (!isRecord(event)) return null;
    const id = integerNumber(event.id);
    const objectCount = integerNumber(event.object_count);
    if (
      id === null ||
      typeof event.intersection_id !== "string" ||
      typeof event.occurred_at !== "string" ||
      !Number.isFinite(Date.parse(event.occurred_at)) ||
      !(event.direction === null || isDirection(event.direction)) ||
      typeof event.event_type !== "string" ||
      !isEventSeverity(event.severity) ||
      objectCount === null ||
      typeof event.ai_summary !== "string" ||
      typeof event.recommendation !== "string" ||
      typeof event.status !== "string" ||
      typeof event.source !== "string"
    ) {
      return null;
    }

    events.push({
      id,
      intersection_id: event.intersection_id,
      occurred_at: new Date(event.occurred_at).toISOString(),
      direction: event.direction,
      event_type: event.event_type,
      severity: event.severity,
      object_count: objectCount,
      ai_summary: event.ai_summary,
      recommendation: event.recommendation,
      status: event.status,
      source: event.source
    });
  }

  return events;
}

function normalizeNumberRecord(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;

  const result: Record<string, number> = {};
  for (const [key, recordValue] of Object.entries(value)) {
    const numberValue = finiteNumber(recordValue);
    if (numberValue === null) return null;
    result[key] = numberValue;
  }

  return result;
}

function cloneEntry(entry: SimulationFrameBufferEntry): SimulationFrameBufferEntry {
  return {
    ...entry,
    frame: {
      ...entry.frame,
      bounds_meters: { ...entry.frame.bounds_meters },
      vehicles: entry.frame.vehicles.map((vehicle) => ({ ...vehicle })),
      density_segments: entry.frame.density_segments.map((segment) => ({ ...segment })),
      signals: entry.frame.signals.map((signal) => ({ ...signal })),
      queues: { ...entry.frame.queues },
      events: entry.frame.events.map((event) => ({ ...event }))
    }
  };
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function integerNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isVehicleType(
  value: unknown
): value is SimulationFrameSnapshot["vehicles"][number]["vehicle_type"] {
  return (
    value === "car" ||
    value === "bus" ||
    value === "taxi" ||
    value === "truck" ||
    value === "emergency"
  );
}

function isDirection(
  value: unknown
): value is SimulationFrameSnapshot["signals"][number]["direction"] {
  return (
    value === "north" ||
    value === "south" ||
    value === "east" ||
    value === "west"
  );
}

function isSignalState(
  value: unknown
): value is SimulationFrameSnapshot["signals"][number]["state"] {
  return value === "red" || value === "yellow" || value === "green";
}

function isDensitySource(
  value: unknown
): value is SimulationFrameSnapshot["density_segments"][number]["source"] {
  return value === "aggregate_density_proxy" || value === "fixture_density_proxy";
}

function isEventSeverity(
  value: unknown
): value is SimulationFrameSnapshot["events"][number]["severity"] {
  return value === "info" || value === "warning" || value === "critical";
}

const workerGlobal = globalThis as {
  document?: unknown;
  addEventListener?: (
    type: "message",
    listener: (event: MessageEvent<SimulationFrameWorkerInboundMessage>) => void
  ) => void;
  postMessage?: (message: SimulationFrameWorkerOutboundMessage) => void;
};

if (
  typeof workerGlobal.document === "undefined" &&
  typeof workerGlobal.addEventListener === "function" &&
  typeof workerGlobal.postMessage === "function"
) {
  const buffer = createSimulationFrameRingBuffer(2);

  workerGlobal.addEventListener("message", (event) => {
    if (event.data?.type === "reset") {
      buffer.reset();
      workerGlobal.postMessage?.({
        type: "simulation-frame-buffer",
        frames: []
      });
      return;
    }

    const entry = normalizeSimulationFrameMessage(event.data);
    if (!entry) return;

    buffer.push(entry);
    workerGlobal.postMessage?.({
      type: "simulation-frame-buffer",
      frames: buffer.latestTwo()
    });
  });
}
