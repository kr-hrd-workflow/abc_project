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

// Walk the whole subtree (through Suspense, fragments, arrays) collecting every
// element display name — used to assert a layer is or is not mounted anywhere.
function collectDeepDisplayNames(node: ReactNode): string[] {
  const names: string[] = [];
  Children.toArray(node).forEach((child) => {
    if (!isValidElement(child)) return;
    names.push(getElementDisplayName(child));
    const childProps = child.props as { children?: ReactNode };
    if (childProps?.children) {
      names.push(...collectDeepDisplayNames(childProps.children));
    }
  });
  return names;
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

  // ⚠️ LOCKED DECISION GUARDRAIL — v5 is the production default plate and its R3F
  // lane-markings overlay MUST stay OFF: overlaying the metric R3F lanes on v5's
  // baked lanes DOUBLES them (render-verified 2026-06-30). If you arrived here
  // wanting v5 to draw the R3F lanes, DON'T — see apps/web/AGENTS.md. roadlock is
  // the geometry-locked escape hatch (?plate=roadlock) that DOES get the overlay.
  test("default ?photoreal=1 uses the v5 plate with the R3F markings overlay OFF", () => {
    setSearch("?photoreal=1");
    const scene = SimulationScene({ sceneSnapshot: snapshot(), timeOfDay: "day" });
    const plate = findChildByDisplayName(scene, "PhotorealPlate") as ReactElement<{
      variant?: string;
    }>;
    expect(plate.props.variant).toBe("v5");
    expect(collectDeepDisplayNames(scene)).not.toContain("RoadSurfaceLayer");
  });

  test("?photoreal=1&plate=roadlock escape hatch restores roadlock + R3F overlay", () => {
    setSearch("?photoreal=1&plate=roadlock");
    const scene = SimulationScene({ sceneSnapshot: snapshot(), timeOfDay: "day" });
    const plate = findChildByDisplayName(scene, "PhotorealPlate") as ReactElement<{
      variant?: string;
    }>;
    expect(plate.props.variant).toBe("roadlock");
    expect(collectDeepDisplayNames(scene)).toContain("RoadSurfaceLayer");
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

describe("photobash mode (?photobash=1)", () => {
  test("photobash mode mounts MarkingDecalLayer and no PhotorealPlate", () => {
    setSearch("?photobash=1");
    const scene = SimulationScene({
      sceneSnapshot: snapshot(),
      weather: "clear",
      timeOfDay: "day",
      viewpoint: "wide"
    });
    const names = collectDeepDisplayNames(scene);
    expect(names).toContain("MarkingDecalLayer");
    expect(names).toContain("LimitedOrbitControls");
    expect(names).not.toContain("PhotorealPlate");
    setSearch("");
  });
});
