import type {
  ChatResponse,
  IntersectionStatus,
  Recommendation,
  Report,
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
    throw new Error(`API request failed: ${response.status} ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function getIntersectionStatus(): Promise<IntersectionStatus> {
  return requestJson<IntersectionStatus>("/api/intersection/status");
}

export async function getEvents(): Promise<TrafficEvent[]> {
  return requestJson<TrafficEvent[]>("/api/events");
}

export async function recommendSignal(): Promise<Recommendation> {
  return requestJson<Recommendation>("/api/recommend-signal", {
    method: "POST"
  });
}

export async function simulateSignal(): Promise<SimulationComparison> {
  return requestJson<SimulationComparison>("/api/simulate-signal", {
    method: "POST"
  });
}

export async function askQuestion(question: string): Promise<ChatResponse> {
  return requestJson<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ question })
  });
}

export async function generateReport(): Promise<Report> {
  return requestJson<Report>("/api/report", { method: "POST" });
}
