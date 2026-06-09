export type Direction = "north" | "south" | "east" | "west";

export type ScenarioId = "emergency" | "pedestrian" | "normal" | "blocked";

export type ScenarioOption = {
  id: ScenarioId;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
  descriptionEn: string;
};

export const SCENARIO_OPTIONS: ScenarioOption[] = [
  {
    id: "emergency",
    labelKo: "긴급차량",
    labelEn: "Emergency",
    descriptionKo: "긴급차량 우선 통과",
    descriptionEn: "Emergency vehicle priority"
  },
  {
    id: "pedestrian",
    labelKo: "보행자",
    labelEn: "Pedestrian",
    descriptionKo: "보행자 대기 대응",
    descriptionEn: "Pedestrian wait response"
  },
  {
    id: "normal",
    labelKo: "정상",
    labelEn: "Normal",
    descriptionKo: "일반 교통 흐름",
    descriptionEn: "Normal traffic flow"
  },
  {
    id: "blocked",
    labelKo: "차단",
    labelEn: "Blocked",
    descriptionKo: "교차로 막힘 대응",
    descriptionEn: "Blocked intersection response"
  }
];

export type QueueMetrics = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type IntersectionStatus = {
  intersection_id: string;
  captured_at: string;
  signal_phase: string;
  cycle_second: number;
  queues: QueueMetrics;
  pedestrian_request: boolean;
  emergency_priority: boolean;
  congestion_level: string;
  source: string;
};

export type TrafficEvent = {
  id: number;
  intersection_id: string;
  occurred_at: string;
  direction: Direction | null;
  event_type: string;
  severity: "info" | "warning" | "critical";
  object_count: number;
  ai_summary: string;
  recommendation: string;
  status: string;
  source: string;
};

export type Recommendation = {
  id: number;
  intersection_id: string;
  created_at: string;
  action: string;
  recommended_plan: Record<string, number>;
  evidence: Record<string, string | number>;
  safety_boundary: string;
  status: string;
};

export type SimulationComparison = {
  source: string;
  baseline: SimulationMetrics;
  recommended: SimulationMetrics;
  improvement: Record<string, number>;
};

export type SimulationMetrics = {
  average_wait_seconds: number;
  total_delay_seconds: number;
  throughput: number;
  emergency_vehicle_clearance_seconds: number;
};

export type ChatResponse = {
  answer: string;
  referenced_event_ids: number[];
};

export type Report = {
  id: number;
  intersection_id: string;
  period_start: string;
  period_end: string;
  summary: string;
  generated_at: string;
};
