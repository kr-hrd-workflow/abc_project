// @vitest-environment jsdom

import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode
} from "react";
import { afterEach, describe, expect, test } from "vitest";

import { SimulationScene } from "./SimulationScene";
import { resolvePhotorealPlate } from "./PhotorealPlate";
import { buildFixtureSceneSnapshot } from "./buildSceneSnapshot";

type TestElementProps = {
  name?: string;
  children?: ReactNode;
};

function setSearch(search: string) {
  window.history.replaceState(null, "", `/dashboard${search}`);
}

afterEach(() => {
  setSearch("");
});

function snapshot() {
  return buildFixtureSceneSnapshot({
    queues: { north: 4, south: 4, east: 4, west: 4 },
    events: []
  });
}

function getElementDisplayName(element: ReactElement) {
  const type = element.type as unknown;

  if (typeof type === "string") return type;
  if (type && (typeof type === "function" || typeof type === "object")) {
    const candidate = type as { displayName?: unknown; name?: unknown };
    if (typeof candidate.displayName === "string") return candidate.displayName;
    if (typeof candidate.name === "string") return candidate.name;
  }

  return "unknown";
}

function getChildDisplayNames(element: ReactElement<TestElementProps>) {
  return Children.toArray(element.props.children)
    .filter((child): child is ReactElement => isValidElement(child))
    .map(getElementDisplayName);
}

function findChildByDisplayName(
  element: ReactElement<TestElementProps>,
  displayName: string
) {
  return Children.toArray(element.props.children)
    .filter((child): child is ReactElement => isValidElement(child))
    .find((child) => getElementDisplayName(child) === displayName);
}

describe("photoreal production mode (?photoreal=1)", () => {
  test("default scene is unchanged when ?photoreal=1 is absent", () => {
    setSearch("");
    const scene = SimulationScene({ sceneSnapshot: snapshot() });

    expect(scene.props.name).toMatch(/^smart-intersection-stage5-/);
    // The plate must never leak into the default scene.
    expect(getChildDisplayNames(scene)).not.toContain("PhotorealPlate");
  });

  test("?photoreal=1 mounts the gated production photoreal scene", () => {
    setSearch("?photoreal=1");
    const scene = SimulationScene({ sceneSnapshot: snapshot(), timeOfDay: "day" });

    expect(scene.props.name).toBe("photoreal-production-scene");
    expect(getChildDisplayNames(scene)).toEqual(
      expect.arrayContaining([
        "Stage3CameraRig",
        "SceneEnvironment",
        "PhotorealPlate",
        "DynamicVehicleLayer",
        "DynamicPedestrianLayer",
        "SignalLayer",
        "ScenePostFX"
      ])
    );
  });

  test("threads the active timeOfDay into the plate for day/night selection", () => {
    setSearch("?photoreal=1");
    const dayPlate = findChildByDisplayName(
      SimulationScene({ sceneSnapshot: snapshot(), timeOfDay: "day" }),
      "PhotorealPlate"
    ) as ReactElement<{ timeOfDay?: string }>;
    const nightPlate = findChildByDisplayName(
      SimulationScene({ sceneSnapshot: snapshot(), timeOfDay: "night" }),
      "PhotorealPlate"
    ) as ReactElement<{ timeOfDay?: string }>;

    expect(dayPlate.props.timeOfDay).toBe("day");
    expect(nightPlate.props.timeOfDay).toBe("night");
  });

  test("resolvePhotorealPlate maps timeOfDay to the roadlock day/night webp", () => {
    expect(resolvePhotorealPlate("day").path).toBe(
      "/simulation/r3f/assets/plates/gangnam_photoreal_roadlock_day.webp"
    );
    expect(resolvePhotorealPlate("night").path).toBe(
      "/simulation/r3f/assets/plates/gangnam_photoreal_roadlock_night.webp"
    );
  });
});
