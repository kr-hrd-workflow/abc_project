import { afterEach, describe, expect, test, vi } from "vitest";

import { askQuestion, generateReport, recommendSignal } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body)
  } as Response);
}

describe("dashboard API client", () => {
  test("posts signal recommendation requests to the backend", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(mockJsonResponse({ id: 1, action: "emergency_priority" }));

    await recommendSignal();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/recommend-signal",
      expect.objectContaining({
        method: "POST",
        cache: "no-store"
      })
    );
  });

  test("adds scenario query parameters to dashboard API requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(mockJsonResponse({ id: 1, action: "pedestrian_service" }));

    await recommendSignal("pedestrian");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/recommend-signal?scenario_id=pedestrian",
      expect.objectContaining({
        method: "POST",
        cache: "no-store"
      })
    );
  });

  test("posts chat questions as JSON", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(mockJsonResponse({ answer: "ok", referenced_event_ids: [] }));

    await askQuestion("현재 상황은?");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ question: "현재 상황은?" }),
        headers: expect.objectContaining({ "Content-Type": "application/json" })
      })
    );
  });

  test("adds scenario query parameters to chat requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(mockJsonResponse({ answer: "ok", referenced_event_ids: [] }));

    await askQuestion("blocked?", "blocked");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/chat?scenario_id=blocked",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ question: "blocked?" }),
        headers: expect.objectContaining({ "Content-Type": "application/json" })
      })
    );
  });

  test("throws when the backend returns a non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(mockJsonResponse({}, false, 500));

    await expect(generateReport()).rejects.toThrow(
      "API request failed: 500 /api/report"
    );
  });
});
