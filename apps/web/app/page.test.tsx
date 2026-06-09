// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import Page from "./page";

afterEach(() => {
  cleanup();
});

describe("Landing page", () => {
  test("renders the living landing page entry points", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Smart Intersection Ops" })
    ).toBeTruthy();
    const dashboardLinks = screen.getAllByRole("link", { name: "Open dashboard" });

    expect(dashboardLinks).toHaveLength(2);
    dashboardLinks.forEach((link) => {
      expect(link.getAttribute("href")).toBe("/dashboard");
    });
    expect(
      screen.getByRole("link", { name: "View decision workflow" }).getAttribute("href")
    ).toBe("#decision-workflow");
    expect(screen.getByLabelText("Animated civic network map")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Live intersection picture" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Recommendation boundary" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Dashboard preview" })
    ).toBeTruthy();
    expect(screen.getByText(/does not control real signals/i)).toBeTruthy();
  });
});
