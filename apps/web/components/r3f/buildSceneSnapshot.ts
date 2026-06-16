import type {
  SimulationDensitySegment,
  SimulationFrameSnapshot,
  SimulationSignalSnapshot,
  SimulationVehicleSnapshot
} from "../../lib/simulationSnapshot";
import type { QueueMetrics, TrafficEvent } from "../../lib/types";

export type SceneDensityFillSource =
  | "density_segments"
  | "fixture_mode"
  | "none";

export type ScenePreciseVehicleSource =
  | "simulation_frame_snapshot"
  | "none";

export type SceneTrafficDensityMode =
  | "density_segments"
  | "fixture_queues"
  | "snapshot_vehicles"
  | "none";

export type SceneSnapshot = {
  source: string | null;
  vehicles: SimulationVehicleSnapshot[];
  densitySegments: SimulationDensitySegment[];
  signals: SimulationSignalSnapshot[];
  queues: QueueMetrics | null;
  events: TrafficEvent[];
  preciseVehicleSource: ScenePreciseVehicleSource;
  allowsDensityFill: boolean;
  densityFillSource: SceneDensityFillSource;
  trafficDensityMode: SceneTrafficDensityMode;
};

export function buildSceneSnapshot(
  frame?: SimulationFrameSnapshot | null
): SceneSnapshot {
  const source = typeof frame?.source === "string" ? frame.source : null;
  const vehicles = Array.isArray(frame?.vehicles) ? [...frame.vehicles] : [];
  const densitySegments = Array.isArray(frame?.density_segments)
    ? frame.density_segments.filter(isExplicitDensityProxy)
    : [];
  const densityFillSource = resolveDensityFillSource(source, densitySegments);
  const trafficDensityMode = resolveTrafficDensityMode(
    source,
    vehicles,
    densitySegments,
    densityFillSource
  );

  return {
    source,
    vehicles,
    densitySegments,
    signals: Array.isArray(frame?.signals) ? [...frame.signals] : [],
    queues: isQueueMetrics(frame?.queues) ? { ...frame.queues } : null,
    events: Array.isArray(frame?.events) ? [...frame.events] : [],
    preciseVehicleSource:
      vehicles.length > 0 ? "simulation_frame_snapshot" : "none",
    allowsDensityFill: densityFillSource !== "none",
    densityFillSource,
    trafficDensityMode
  };
}

export function buildFixtureSceneSnapshot({
  queues,
  events
}: {
  queues: QueueMetrics;
  events: TrafficEvent[];
}): SceneSnapshot {
  return {
    source: "simulation_snapshot_fixture",
    vehicles: [],
    densitySegments: [],
    signals: [],
    queues: { ...queues },
    events: [...events],
    preciseVehicleSource: "none",
    allowsDensityFill: true,
    densityFillSource: "fixture_mode",
    trafficDensityMode: "fixture_queues"
  };
}

function resolveDensityFillSource(
  source: string | null,
  densitySegments: SimulationDensitySegment[]
): SceneDensityFillSource {
  if (densitySegments.length > 0) return "density_segments";
  if (source === "simulation_snapshot_fixture") return "fixture_mode";
  return "none";
}

function resolveTrafficDensityMode(
  source: string | null,
  vehicles: SimulationVehicleSnapshot[],
  densitySegments: SimulationDensitySegment[],
  densityFillSource: SceneDensityFillSource
): SceneTrafficDensityMode {
  if (densitySegments.length > 0) return "density_segments";
  if (vehicles.length > 0) return "snapshot_vehicles";
  if (source === "simulation_snapshot_fixture") return "fixture_queues";
  return "none";
}

function isExplicitDensityProxy(
  segment: SimulationDensitySegment
): segment is SimulationDensitySegment {
  return (
    segment.source === "aggregate_density_proxy" ||
    segment.source === "fixture_density_proxy"
  );
}

function isQueueMetrics(value: unknown): value is QueueMetrics {
  if (!value || typeof value !== "object") return false;

  const queues = value as Partial<Record<keyof QueueMetrics, unknown>>;
  return (
    typeof queues.north === "number" &&
    typeof queues.south === "number" &&
    typeof queues.east === "number" &&
    typeof queues.west === "number"
  );
}
