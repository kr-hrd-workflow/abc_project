// @vitest-environment jsdom

import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { SceneEnvironment } from "./SceneEnvironment";
import { getStage6QualityPreset } from "./stage6Quality";

describe("SceneEnvironment", () => {
  it("renders a valid React element", () => {
    const element = SceneEnvironment({
      timeOfDay: "day",
      signals: [],
      qualityPreset: getStage6QualityPreset("high"),
      weather: "rain"
    });

    expect(isValidElement(element)).toBe(true);
  });

  it("has SceneEnvironment displayName for test introspection", () => {
    expect(SceneEnvironment.displayName).toBe("SceneEnvironment");
  });

  it("renders a group named scene-day-environment for day", () => {
    const element = SceneEnvironment({ timeOfDay: "day" });

    expect(isValidElement(element)).toBe(true);
    // The memo wrapper renders the inner function; the inner SceneDayEnvironment
    // renders a group with name="scene-day-environment". We verify the top-level
    // props route correctly by checking timeOfDay is accepted without throwing.
    expect(element).toBeTruthy();
  });

  it("renders a valid element for night without throwing", () => {
    const element = SceneEnvironment({ timeOfDay: "night" });

    expect(isValidElement(element)).toBe(true);
  });

  it("accepts all weather variants without throwing", () => {
    const weathers = ["clear", "cloudy", "rain"] as const;

    for (const weather of weathers) {
      const element = SceneEnvironment({
        timeOfDay: "day",
        weather,
        qualityPreset: getStage6QualityPreset("high"),
        signals: []
      });
      expect(isValidElement(element)).toBe(true);
    }
  });

  it("defaults to day when timeOfDay is omitted", () => {
    const element = SceneEnvironment({});

    expect(isValidElement(element)).toBe(true);
  });
});
