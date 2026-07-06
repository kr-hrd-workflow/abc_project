import type {
  AnalysisFixture,
  AnalysisJob,
  CctvFlow,
  ChatResponse,
  FixtureIngestResult,
  IntersectionStatus,
  Recommendation,
  Report,
  RuntimeReadiness,
  ScenarioId,
  SimulationComparison,
  TrafficEvent,
  UploadAnalysisResult
} from "./types";
import type { Locale } from "./i18n";
import type { SimulationFrameSnapshot } from "./simulationSnapshot";

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
);

export function normalizeApiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(
      detail
        ? `API request failed: ${response.status} ${path}: ${detail}`
        : `API request failed: ${response.status} ${path}`
    );
  }

  return response.json() as Promise<T>;
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : null;
  } catch {
    return null;
  }
}

async function requestScenarioJson<T>(
  path: string,
  scenarioId?: ScenarioId,
  init?: RequestInit
): Promise<T> {
  if (!scenarioId) {
    return requestJson<T>(path, init);
  }

  try {
    return await requestJson<T>(withScenario(path, scenarioId), init);
  } catch (error) {
    if (error instanceof Error && error.message.includes("API request failed: 404")) {
      return requestJson<T>(path, init);
    }
    throw error;
  }
}

function withScenario(path: string, scenarioId?: ScenarioId): string {
  if (!scenarioId) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}scenario_id=${encodeURIComponent(scenarioId)}`;
}

export async function getIntersectionStatus(
  scenarioId?: ScenarioId
): Promise<IntersectionStatus> {
  return requestScenarioJson<IntersectionStatus>("/api/intersection/status", scenarioId);
}

export async function getEvents(scenarioId?: ScenarioId): Promise<TrafficEvent[]> {
  return requestScenarioJson<TrafficEvent[]>("/api/events", scenarioId);
}

export async function recommendSignal(
  scenarioId?: ScenarioId
): Promise<Recommendation> {
  try {
    return await requestScenarioJson<Recommendation>("/api/recommend-signal", scenarioId, {
      method: "POST"
    });
  } catch (error) {
    if (isMissingRouteError(error)) return fallbackRecommendation();
    throw error;
  }
}

export async function simulateSignal(
  scenarioId?: ScenarioId
): Promise<SimulationComparison> {
  try {
    return await requestScenarioJson<SimulationComparison>("/api/simulate-signal", scenarioId, {
      method: "POST"
    });
  } catch (error) {
    if (isMissingRouteError(error)) return fallbackSimulation();
    throw error;
  }
}

export async function getSimulationFrame(
  scenarioId?: ScenarioId
): Promise<SimulationFrameSnapshot> {
  return requestJson<SimulationFrameSnapshot>(
    withScenario("/api/simulation/frame", scenarioId)
  );
}

export function isSimulationFrameRouteMissingError(error: unknown): boolean {
  return isMissingRouteError(error, "/api/simulation/frame");
}

export async function askQuestion(
  question: string,
  scenarioId?: ScenarioId,
  locale?: Locale
): Promise<ChatResponse> {
  try {
    return await requestScenarioJson<ChatResponse>("/api/chat", scenarioId, {
      method: "POST",
      body: JSON.stringify({ question, locale })
    });
  } catch (error) {
    if (isMissingRouteError(error)) {
      return {
        answer:
          "The live AI route is unavailable in this runtime. The dashboard is showing simulation-only fallback guidance.",
        referenced_event_ids: [],
        sections: null
      };
    }
    throw error;
  }
}

export async function generateReport(scenarioId?: ScenarioId): Promise<Report> {
  try {
    return await requestScenarioJson<Report>("/api/report", scenarioId, { method: "POST" });
  } catch (error) {
    if (isMissingRouteError(error)) {
      const now = new Date().toISOString();
      return {
        id: 0,
        intersection_id: "INT-0001",
        period_start: now,
        period_end: now,
        summary: "Runtime report route unavailable; showing simulation-only dashboard fallback.",
        generated_at: now
      };
    }
    throw error;
  }
}

export async function getFixtures(): Promise<AnalysisFixture[]> {
  try {
    return await requestJson<AnalysisFixture[]>("/api/fixtures");
  } catch (error) {
    if (error instanceof Error && error.message.includes("API request failed: 404")) {
      return [];
    }
    throw error;
  }
}

export async function ingestFixture(fixtureId: string): Promise<FixtureIngestResult> {
  return requestJson<FixtureIngestResult>(
    `/api/fixtures/${encodeURIComponent(fixtureId)}/ingest`,
    { method: "POST" }
  );
}

export async function analyzeUpload(file: File): Promise<UploadAnalysisResult> {
  const filename = encodeURIComponent(file.name || "uploaded-sample");
  return requestJson<UploadAnalysisResult>(`/api/uploads/analyze?filename=${filename}`, {
    method: "POST",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream"
    }
  });
}

export async function getRuntimeReadiness(): Promise<RuntimeReadiness> {
  try {
    return await requestJson<RuntimeReadiness>("/api/runtime/readiness");
  } catch (error) {
    if (error instanceof Error && error.message.includes("API request failed: 404")) {
      const unavailableSection = {
        ready: false,
        mode: "unavailable",
        missing: ["runtime readiness endpoint"],
        checks: []
      };
      return {
        vision: unavailableSection,
        simulation: unavailableSection,
        openai: unavailableSection,
        pgvector: unavailableSection
      };
    }
    throw error;
  }
}

export async function getAnalysisJob(jobId: string): Promise<AnalysisJob> {
  return requestJson<AnalysisJob>(
    `/api/analysis-jobs/${encodeURIComponent(jobId)}`
  );
}

// Returns null when the backend has no CCTV source configured / measurement
// failed (503), so the dashboard tile can show an empty state instead of erroring.
export async function getCctvFlow(): Promise<CctvFlow | null> {
  try {
    return await requestJson<CctvFlow>("/api/traffic/cctv-flow");
  } catch (error) {
    if (error instanceof Error && error.message.includes("API request failed: 503")) {
      return null;
    }
    throw error;
  }
}

function isMissingRouteError(error: unknown, path?: string): boolean {
  if (!(error instanceof Error)) return false;
  if (!error.message.includes("API request failed: 404")) return false;

  return path ? error.message.includes(path) : true;
}

function fallbackRecommendation(): Recommendation {
  return {
    id: 0,
    intersection_id: "INT-0001",
    created_at: new Date().toISOString(),
    action: "emergency_priority",
    recommended_plan: { east: 35, north: 20, south: 20, west: 15 },
    evidence: { reason: "emergency_vehicle_approach", direction: "east" },
    safety_boundary:
      "Recommendation and simulation only. No real traffic signal control is performed.",
    status: "fallback"
  };
}

function fallbackSimulation(): SimulationComparison {
  return {
    source: "dashboard_fallback",
    baseline: {
      average_wait_seconds: 68,
      total_delay_seconds: 128.4,
      throughput: 1246,
      emergency_vehicle_clearance_seconds: 42
    },
    recommended: {
      average_wait_seconds: 56,
      total_delay_seconds: 105.3,
      throughput: 1298,
      emergency_vehicle_clearance_seconds: 24
    },
    improvement: {
      average_wait_delta_seconds: -12,
      average_wait_percent: -17.6,
      total_delay_percent: 18,
      throughput_percent: 4.2
    }
  };
}
