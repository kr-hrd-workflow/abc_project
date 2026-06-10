// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import Page from "./page";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Landing page", () => {
  test("renders the approved Signal Assembly landing structure", () => {
    const { container } = render(<Page />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Intersections that think before they change",
      })
    ).toBeTruthy();
    expect(screen.getByText(/Simulation workspace for traffic teams/i)).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Open dashboard" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: "Watch the motion" }).getAttribute("href")).toBe(
      "#decision-workflow"
    );

    expect(container.querySelector('[data-section="hero"]')).toBeTruthy();
    expect(container.querySelector('[data-section="signal-overview"]')).toBeTruthy();
    expect(container.querySelector('[data-section="signal-assembly"]')).toBeTruthy();
    expect(container.querySelector('[data-section="decision-chapters"]')).toBeTruthy();
    expect(container.querySelector('[data-section="proof-marquee"]')).toBeTruthy();
    expect(container.querySelector('[data-section="final-cta"]')).toBeTruthy();
    expect(container.querySelector('[data-existing-intersection-image="true"]')).toBeTruthy();
    expect(screen.getAllByText(/Simulation-only. Never controls real signals./i).length).toBeGreaterThanOrEqual(1);
  });

  test("exposes the GSAP Signal Assembly scroll contract", () => {
    const { container } = render(<Page />);

    const assembly = screen.getByTestId("landing-signal-assembly");
    expect(assembly.getAttribute("data-gsap-scrolltrigger")).toBe("true");
    expect(assembly.getAttribute("data-reference-build-note")).toBe("watchmaker-persistent-parts");
    expect(assembly.getAttribute("data-remotion-sequence")).toBe("SignalAssemblyReel");
    expect(assembly.getAttribute("data-remotion-fps")).toBe("30");
    expect(assembly.getAttribute("data-motion-scenes")).toBe("4");
    expect(container.querySelectorAll("[data-assembly-stage]")).toHaveLength(4);
    expect(container.querySelectorAll("[data-assembly-layer]")).toHaveLength(4);
    expect(container.querySelector("[data-assembly-object='persistent-centered']")).toBeTruthy();
    expect(container.querySelectorAll("[data-assembly-piece][data-piece-persists='true']")).toHaveLength(4);
  });

  test("alternates assembly copy around the persistent visual object", () => {
    const { container } = render(<Page />);

    const stages = Array.from(container.querySelectorAll("[data-assembly-stage]"));

    expect(stages.map((stage) => stage.getAttribute("data-stage-side"))).toEqual([
      "left",
      "right",
      "left",
      "right",
    ]);
  });

  test("renders large decision chapters and proof without old card patterns", () => {
    const { container } = render(<Page />);

    expect(screen.getByText("Sense")).toBeTruthy();
    expect(screen.getByText("Compare")).toBeTruthy();
    expect(screen.getByText("Brief")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Open dashboard" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText("City team motion marquee")).toBeTruthy();

    expect(container.querySelector("[data-testid='landing-gapless-bento']")).toBeFalsy();
    expect(container.querySelector(".operator-accordion")).toBeFalsy();
    expect(container.textContent).not.toContain("SECTION");
    expect(container.textContent).not.toContain("QUESTION");
    expect(container.textContent).not.toContain("TRUST / PROOF");
  });

  test("switches visible landing copy between English and Korean", async () => {
    render(<Page />);

    await userEvent.click(screen.getByRole("button", { name: "한국어" }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "바꾸기 전에 생각하는 교차로",
      })
    ).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "대시보드 열기" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: "움직임 보기" }).getAttribute("href")).toBe(
      "#decision-workflow"
    );
  });
});
