export type Direction = "north" | "south" | "east" | "west";

export type ScenarioId = "emergency" | "pedestrian" | "normal" | "blocked";

export type CityId = "seoul" | "new_york" | "paris" | "london";

export type CityProfile = {
  id: CityId;
  labelKo: string;
  labelEn: string;
  intersectionId: string;
  intersectionNameKo: string;
  intersectionNameEn: string;
  districtKo: string;
  districtEn: string;
  countryCode: string;
  timezone: string;
  mobilityProfileKo: string;
  mobilityProfileEn: string;
};

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

export type AgentResponseSections = {
  current_situation: string;
  recommended_action: string;
  recommendation_rationale: string[];
  authority_limit: string;
  simulation_result: string;
};

export type ChatResponse = {
  answer: string;
  referenced_event_ids: number[];
  sections?: AgentResponseSections | null;
};

export type Report = {
  id: number;
  intersection_id: string;
  period_start: string;
  period_end: string;
  summary: string;
  generated_at: string;
};

export type AnalysisFixture = {
  fixture_id: string;
  scenario_id: ScenarioId;
  media_type: "image" | "video" | "virtual_cctv";
  filename: string;
  description: string;
  source: string;
  renderer: string;
  safety_note: string;
};

export type FixtureIngestResult = AnalysisFixture & {
  analysis_status: "ingested";
  observation: Record<string, unknown>;
  status_id: number;
  event_ids: number[];
};

export type AnalysisJob = {
  job_id: string;
  status: string;
  filename: string;
  media_type: string;
  media_kind: "image" | "video";
  scenario_id: ScenarioId;
  observation_source: string;
  status_id: number;
  event_ids: number[];
  size_bytes: number;
};

export type RuntimeCheck = {
  name: string;
  available: boolean;
  detail?: string;
};

export type RuntimeSection = {
  ready: boolean;
  mode: string;
  missing: string[];
  checks: RuntimeCheck[];
};

export type RuntimeReadiness = {
  vision: RuntimeSection;
  simulation: RuntimeSection;
  openai: RuntimeSection;
  pgvector: RuntimeSection;
};

export type UploadAnalysisResult = {
  job_id: string;
  analysis_status: "completed";
  job: AnalysisJob;
  observation: Record<string, unknown>;
  status_id: number;
  event_ids: number[];
};
