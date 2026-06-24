import type {
  SimulationDensitySegment,
  SimulationFrameSnapshot,
  SimulationPedestrianSnapshot,
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

export type ScenePrecisePedestrianSource =
  | "simulation_frame_snapshot"
  | "none";

export type SceneTrafficDensityMode =
  | "density_segments"
  | "fixture_queues"
  | "snapshot_vehicles"
  | "none";

export type SceneQueueSource =
  | "frame"
  | "density_segment"
  | "fixture_fallback"
  | "none";

export type SceneSnapshot = {
  source: string | null;
  scenarioId: string | null;
  vehicles: SimulationVehicleSnapshot[];
  pedestrians: SimulationPedestrianSnapshot[];
  densitySegments: SimulationDensitySegment[];
  signals: SimulationSignalSnapshot[];
  queues: QueueMetrics | null;
  events: TrafficEvent[];
  preciseVehicleSource: ScenePreciseVehicleSource;
  precisePedestrianSource: ScenePrecisePedestrianSource;
  allowsDensityFill: boolean;
  densityFillSource: SceneDensityFillSource;
  trafficDensityMode: SceneTrafficDensityMode;
  queueSource: SceneQueueSource;
};

export function buildSceneSnapshot(
  frame?: SimulationFrameSnapshot | null
): SceneSnapshot {
  const source = typeof frame?.source === "string" ? frame.source : null;
  const vehicles = Array.isArray(frame?.vehicles) ? [...frame.vehicles] : [];
  const pedestrians = Array.isArray(frame?.pedestrians)
    ? frame.pedestrians.map((pedestrian) => ({ ...pedestrian }))
    : [];
  const densitySegments = Array.isArray(frame?.density_segments)
    ? frame.density_segments.filter(isExplicitDensityProxy)
    : [];
  const densityFillSource = resolveDensityFillSource(
    source,
    vehicles,
    densitySegments
  );
  const trafficDensityMode = resolveTrafficDensityMode(
    source,
    vehicles,
    densitySegments,
    densityFillSource
  );

  return {
    source,
    scenarioId: typeof frame?.scenario_id === "string" ? frame.scenario_id : null,
    vehicles,
    pedestrians,
    densitySegments,
    signals: Array.isArray(frame?.signals) ? [...frame.signals] : [],
    queues: isQueueMetrics(frame?.queues) ? { ...frame.queues } : null,
    events: Array.isArray(frame?.events) ? [...frame.events] : [],
    preciseVehicleSource:
      vehicles.length > 0 ? "simulation_frame_snapshot" : "none",
    precisePedestrianSource:
      pedestrians.length > 0 ? "simulation_frame_snapshot" : "none",
    allowsDensityFill: densityFillSource !== "none",
    densityFillSource,
    trafficDensityMode,
    queueSource: resolveFrameQueueSource(frame, densitySegments)
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
    scenarioId: null,
    vehicles: [],
    pedestrians: [],
    densitySegments: [],
    signals: [],
    queues: { ...queues },
    events: [...events],
    preciseVehicleSource: "none",
    precisePedestrianSource: "none",
    allowsDensityFill: true,
    densityFillSource: "fixture_mode",
    trafficDensityMode: "fixture_queues",
    queueSource: "fixture_fallback"
  };
}

function resolveFrameQueueSource(
  frame: SimulationFrameSnapshot | null | undefined,
  densitySegments: SimulationDensitySegment[]
): SceneQueueSource {
  if (isQueueMetrics(frame?.queues)) return "frame";
  if (densitySegments.length > 0) return "density_segment";
  return "none";
}

function resolveDensityFillSource(
  source: string | null,
  vehicles: SimulationVehicleSnapshot[],
  densitySegments: SimulationDensitySegment[]
): SceneDensityFillSource {
  if (vehicles.length > 0) return "none";
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
  if (vehicles.length > 0) return "snapshot_vehicles";
  if (densitySegments.length > 0) return "density_segments";
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
