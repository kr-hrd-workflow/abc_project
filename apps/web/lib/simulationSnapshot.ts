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
