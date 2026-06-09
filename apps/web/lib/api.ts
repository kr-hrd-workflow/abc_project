import type {
  ChatResponse,
  IntersectionStatus,
  Recommendation,
  Report,
  ScenarioId,
  SimulationComparison,
  TrafficEvent
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

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

function withScenario(path: string, scenarioId?: ScenarioId): string {
  if (!scenarioId) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}scenario_id=${encodeURIComponent(scenarioId)}`;
}

export async function getIntersectionStatus(
  scenarioId?: ScenarioId
): Promise<IntersectionStatus> {
  return requestJson<IntersectionStatus>(
    withScenario("/api/intersection/status", scenarioId)
  );
}

export async function getEvents(scenarioId?: ScenarioId): Promise<TrafficEvent[]> {
  return requestJson<TrafficEvent[]>(withScenario("/api/events", scenarioId));
}

export async function recommendSignal(
  scenarioId?: ScenarioId
): Promise<Recommendation> {
  return requestJson<Recommendation>(withScenario("/api/recommend-signal", scenarioId), {
    method: "POST"
  });
}

export async function simulateSignal(
  scenarioId?: ScenarioId
): Promise<SimulationComparison> {
  return requestJson<SimulationComparison>(withScenario("/api/simulate-signal", scenarioId), {
    method: "POST"
  });
}

export async function askQuestion(
  question: string,
  scenarioId?: ScenarioId
): Promise<ChatResponse> {
  return requestJson<ChatResponse>(withScenario("/api/chat", scenarioId), {
    method: "POST",
    body: JSON.stringify({ question })
  });
}

export async function generateReport(scenarioId?: ScenarioId): Promise<Report> {
  return requestJson<Report>(withScenario("/api/report", scenarioId), { method: "POST" });
}
