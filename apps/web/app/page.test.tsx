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
  test("renders the approved cinematic six-section landing structure", () => {
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
    expect(container.querySelector('[data-section="signal-bento"]')).toBeTruthy();
    expect(container.querySelector('[data-section="scroll-reel"]')).toBeTruthy();
    expect(container.querySelector('[data-section="operator-accordion"]')).toBeTruthy();
    expect(container.querySelector('[data-section="proof-marquee"]')).toBeTruthy();
    expect(container.querySelector('[data-section="final-cta"]')).toBeTruthy();
    expect(container.querySelector('[data-existing-intersection-image="true"]')).toBeTruthy();
  });

  test("exposes the GSAP scroll contract and bento density markers", () => {
    const { container } = render(<Page />);

    const scrollReel = screen.getByTestId("landing-gsap-scroll-reel");
    expect(scrollReel.getAttribute("data-gsap-scrolltrigger")).toBe("true");
    expect(scrollReel.getAttribute("data-remotion-sequence")).toBe("LandingScrollReel");
    expect(scrollReel.getAttribute("data-remotion-fps")).toBe("30");
    expect(scrollReel.getAttribute("data-motion-scenes")).toBe("4");
    expect(container.querySelectorAll("[data-scroll-panel]")).toHaveLength(4);

    const bento = screen.getByTestId("landing-gapless-bento");
    expect(bento.getAttribute("data-grid-flow")).toBe("dense");
    expect(bento.querySelectorAll("[data-bento-cell]")).toHaveLength(4);
    expect(bento.textContent).toContain("Sense");
    expect(bento.textContent).toContain("Compare");
    expect(bento.textContent).toContain("Brief");
    expect(bento.textContent).toContain("Simulation-only boundary");
  });

  test("renders the operator accordion and proof marquee without meta labels", () => {
    const { container } = render(<Page />);

    expect(screen.getByText("Live sensing")).toBeTruthy();
    expect(screen.getByText("Scenario compare")).toBeTruthy();
    expect(screen.getByText("Recommendation evidence")).toBeTruthy();
    expect(screen.getByText("Operator handoff")).toBeTruthy();
    expect(screen.getByLabelText("City team motion marquee")).toBeTruthy();
    expect(screen.getByText(/Simulation-only. Never controls real signals./i)).toBeTruthy();

    expect(container.textContent).not.toContain("SECTION");
    expect(container.textContent).not.toContain("QUESTION");
    expect(container.textContent).not.toContain("TRUST / PROOF");
  });

  test("exposes the operator accordion active state accessibly", async () => {
    render(<Page />);

    const liveSensing = screen.getByRole("button", { name: /Live sensing/i });
    const scenarioCompare = screen.getByRole("button", { name: /Scenario compare/i });

    expect(liveSensing.getAttribute("aria-pressed")).toBe("true");
    expect(liveSensing.getAttribute("aria-expanded")).toBe("true");
    expect(scenarioCompare.getAttribute("aria-pressed")).toBe("false");
    expect(scenarioCompare.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(scenarioCompare);

    expect(liveSensing.getAttribute("aria-pressed")).toBe("false");
    expect(liveSensing.getAttribute("aria-expanded")).toBe("false");
    expect(scenarioCompare.getAttribute("aria-pressed")).toBe("true");
    expect(scenarioCompare.getAttribute("aria-expanded")).toBe("true");
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
