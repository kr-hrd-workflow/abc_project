import type { Direction, QueueMetrics, TrafficEvent } from "./types";

export type SimulationVehicleType =
  | "car"
  | "bus"
  | "taxi"
  | "truck"
  | "emergency";

export type SimulationVehicleSnapshot = {
  id: string;
  vehicle_type: SimulationVehicleType;
  lane_id: string;
  x_meters: number;
  y_meters: number;
  heading_degrees: number;
  speed_mps: number;
  waiting_seconds: number;
  emergency: boolean;
};

export type SimulationDensitySegmentSource =
  | "aggregate_density_proxy"
  | "fixture_density_proxy";

export type SimulationDensitySegment = {
  segment_id: string;
  approach: Direction;
  start_meters_from_stop_line: number;
  end_meters_from_stop_line: number;
  lane_count: number;
  vehicle_count: number;
  average_speed_mps: number;
  source: SimulationDensitySegmentSource;
};

export type SimulationSignalState = "red" | "yellow" | "green";

export type SimulationSignalSnapshot = {
  signal_id: string;
  direction: Direction;
  state: SimulationSignalState;
  seconds_remaining: number;
};

export type SimulationFrameSnapshot = {
  source: string;
  intersection_id: string;
  scenario_id: string;
  sim_time_seconds: number;
  captured_at: string;
  bounds_meters: Record<string, number>;
  vehicles: SimulationVehicleSnapshot[];
  density_segments: SimulationDensitySegment[];
  signals: SimulationSignalSnapshot[];
  queues: QueueMetrics;
  events: TrafficEvent[];
};

export type SimulationFrameBufferEntry = {
  frame: SimulationFrameSnapshot;
  receivedAtMs: number;
  networkLatencyMs: number;
  capturedAtMs: number;
};

export type SimulationFrameTelemetry = {
  frameAgeMs: number | null;
  networkLatencyMs: number | null;
  simToRenderDelayMs: number | null;
  authoritativeHz: number;
  authoritativeTickDriftMs: number | null;
  stale: boolean;
  staleReason: string | null;
};

export const SIMULATION_FRAME_AUTHORITATIVE_HZ = 10;
export const SIMULATION_FRAME_POLL_INTERVAL_MS =
  1000 / SIMULATION_FRAME_AUTHORITATIVE_HZ;
export const SIMULATION_FRAME_INTERPOLATION_DELAY_MS = 150;
export const SIMULATION_FRAME_MAX_EXTRAPOLATION_MS = 300;
export const SIMULATION_FRAME_STALE_AFTER_MS = 1000;
