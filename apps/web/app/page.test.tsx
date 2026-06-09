// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";

import Page from "./page";

afterEach(() => {
  cleanup();
});

describe("Landing page", () => {
  test("renders the living civic pulse landing page in English and Korean", async () => {
    const user = userEvent.setup();

    render(<Page />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "See the intersection before the signal changes",
      })
    ).toBeTruthy();
    expect(
      screen.getByText(
        "One sharp product view for live awareness, phase-plan comparison, and operator-ready simulation briefings."
      )
    ).toBeTruthy();

    const dashboardLinks = screen.getAllByRole("link", { name: "Open dashboard" });
    expect(dashboardLinks).toHaveLength(2);
    dashboardLinks.forEach((link) => {
      expect(link.getAttribute("href")).toBe("/dashboard");
    });
    expect(
      screen.getByRole("link", { name: "See the workflow" }).getAttribute("href")
    ).toBe("#decision-workflow");
    expect(screen.getByText("Simulation-only. Never controls real signals.")).toBeTruthy();
    expect(screen.getByLabelText("Interactive product preview")).toBeTruthy();
    expect(screen.getByText("Phase plan comparison")).toBeTruthy();
    expect(screen.getByText("Switch to Plan B")).toBeTruthy();
    expect(screen.getByText("Scroll-driven product tour")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "The intersection breathes before it decides",
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Operator boundary" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Dashboard preview" })
    ).toBeTruthy();
    expect(screen.getByText(/does not control real signals/i)).toBeTruthy();
    expect(screen.getByText("Emergency approach")).toBeTruthy();
    expect(screen.getByText("Pedestrian demand")).toBeTruthy();
    expect(screen.getByText("SMART INTERSECTION OPS")).toBeTruthy();
    expect(screen.getByText("Operator in control")).toBeTruthy();
    expect(screen.getByText("Test safely")).toBeTruthy();
    expect(screen.getByText("See the impact")).toBeTruthy();
    expect(screen.getByText("Built for teams")).toBeTruthy();
    expect(screen.getByText("Live events")).toBeTruthy();
    expect(screen.getAllByText("Live awareness").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Compare phase plans").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lock the briefing").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "한국어" }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "신호가 바뀌기 전에 교차로를 먼저 확인하세요",
      })
    ).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "대시보드 열기" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "흐름 보기" }).getAttribute("href")).toBe(
      "#decision-workflow"
    );
    expect(screen.getByText("시뮬레이션 전용. 실제 신호는 제어하지 않습니다.")).toBeTruthy();
    expect(screen.getByLabelText("인터랙티브 제품 미리보기")).toBeTruthy();
    expect(screen.getAllByText("단계 계획 비교").length).toBeGreaterThan(0);
    expect(screen.getByText("B안으로 전환")).toBeTruthy();
    expect(screen.getByText("긴급차량 접근")).toBeTruthy();
    expect(screen.getByText("보행자 수요")).toBeTruthy();
    expect(screen.getByText("운영자 통제 유지")).toBeTruthy();
    expect(screen.getByText("실시간 이벤트")).toBeTruthy();
    expect(screen.getByText("운영자 판단 경계")).toBeTruthy();
    expect(screen.getByText("스크롤 기반 제품 투어")).toBeTruthy();
    expect(screen.getAllByText("실시간 인식").length).toBeGreaterThan(0);
    expect(screen.getAllByText("단계 계획 비교").length).toBeGreaterThan(0);
    expect(screen.getAllByText("브리핑 고정").length).toBeGreaterThan(0);
  });
});
