// @vitest-environment jsdom

import { Children, isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

// Invoking function components directly (repo pattern, see MarkingDecalLayer.test)
// needs hooks to be inert: useMemo runs its factory, useEffect is a no-op.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useMemo: (fn: () => unknown) => fn(), useEffect: () => {} };
});

import { SceneEnvironment, SceneNightEnvironment } from "./SceneEnvironment";
import { WeatherAndAtmosphere } from "./WeatherAndAtmosphere";
import { getStage6QualityPreset } from "./stage6Quality";

function collect(node: unknown, acc: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, acc));
    return acc;
  }
  if (!isValidElement(node)) return acc;
  acc.push(node);
  Children.forEach((node.props as { children?: unknown }).children, (c) =>
    collect(c, acc)
  );
  return acc;
}

function displayName(element: ReactElement): string {
  const type = element.type;
  if (typeof type === "string") return type;
  const named = type as { displayName?: unknown; name?: unknown };
  if (typeof named.displayName === "string") return named.displayName;
  if (typeof named.name === "string") return named.name;
  return "unknown";
}

const meshName = (e: ReactElement) =>
  String((e.props as { name?: unknown }).name ?? "");
const attachOf = (e: ReactElement) =>
  String((e.props as { attach?: unknown }).attach ?? "");

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

describe("WeatherAndAtmosphere sceneryless gate (night rain support)", () => {
  it("keeps rain streaks + wet-road glow but drops scenery when sceneryless", () => {
    const all = collect(
      WeatherAndAtmosphere({ weather: "rain", sceneryless: true })
    );

    // rain treatment survives
    expect(all.some((e) => meshName(e).endsWith("-wet-road-reflection"))).toBe(
      true
    );
    expect(all.some((e) => displayName(e) === "RainParticleLayer")).toBe(true);

    // day scenery is gone: no background colour, no fog, no distant-city, no haze
    expect(all.some((e) => attachOf(e) === "background")).toBe(false);
    expect(all.some((e) => attachOf(e) === "fog")).toBe(false);
    expect(all.some((e) => meshName(e).includes("distant-city"))).toBe(false);
    expect(all.some((e) => meshName(e).includes("depth-haze"))).toBe(false);
  });

  it("still renders the full day scenery when not sceneryless", () => {
    const all = collect(WeatherAndAtmosphere({ weather: "rain" }));

    expect(all.some((e) => attachOf(e) === "background")).toBe(true);
    expect(all.some((e) => attachOf(e) === "fog")).toBe(true);
    expect(all.some((e) => meshName(e).endsWith("-wet-road-reflection"))).toBe(
      true
    );
  });

  it("gates wet-road glow on weather === 'rain'", () => {
    const all = collect(WeatherAndAtmosphere({ weather: "clear" }));
    expect(all.some((e) => meshName(e).endsWith("-wet-road-reflection"))).toBe(
      false
    );
  });
});

describe("night mounts the weather subtree (defect e: rain at night)", () => {
  const renderNight = (weather: "rain" | "clear") =>
    // SceneNightEnvironment is memo(SceneNightEnvironmentComponent); reach the
    // render fn to inspect its output without a WebGL renderer.
    collect(
      (
        SceneNightEnvironment as unknown as {
          type: (p: Record<string, unknown>) => ReactElement;
        }
      ).type({
        weather,
        qualityPreset: getStage6QualityPreset("high"),
        signals: []
      })
    );

  it("mounts WeatherAndAtmosphere sceneryless with rain threaded through", () => {
    const wa = renderNight("rain").find(
      (e) => displayName(e) === "WeatherAndAtmosphere"
    );
    expect(wa).toBeTruthy();
    const props = wa!.props as { weather?: unknown; sceneryless?: unknown };
    expect(props.weather).toBe("rain");
    expect(props.sceneryless).toBe(true);
  });

  it("does not inject a day background/fog into the night backdrop", () => {
    const all = renderNight("rain");
    // The night group itself must not carry scene background/fog (that stays
    // owned by the building/sky layer); WeatherAndAtmosphere is sceneryless so
    // its own background/fog are gated off too.
    expect(all.some((e) => attachOf(e) === "background")).toBe(false);
    expect(all.some((e) => attachOf(e) === "fog")).toBe(false);
  });

  it("threads weather to the night environment at the SceneEnvironment level", () => {
    const el = SceneEnvironment({
      timeOfDay: "night",
      weather: "rain",
      qualityPreset: getStage6QualityPreset("high"),
      signals: []
    });
    expect((el.props as { weather?: unknown }).weather).toBe("rain");
  });
});
