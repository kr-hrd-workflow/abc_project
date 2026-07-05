// @vitest-environment jsdom

import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode
} from "react";
import { afterEach, describe, expect, test } from "vitest";

import { SimulationScene } from "./SimulationScene";
import { deriveSignalLightingPreset } from "./SignalLayer";
import { buildFixtureSceneSnapshot } from "./buildSceneSnapshot";

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

// First element (depth-first) whose resolved display name matches, or undefined.
function findElementByDisplayName(
  node: ReactNode,
  displayName: string
): ReactElement | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    if (getElementDisplayName(child) === displayName) return child;
    const childProps = child.props as { children?: ReactNode };
    if (childProps?.children) {
      const found = findElementByDisplayName(childProps.children, displayName);
      if (found) return found;
    }
  }
  return undefined;
}

describe("photoreal param retired", () => {
  test("?photoreal=1 renders the default scene (no PhotorealPlate)", () => {
    setSearch("?photoreal=1");
    const scene = SimulationScene({
      sceneSnapshot: snapshot(),
      weather: "clear",
      timeOfDay: "day",
      viewpoint: "wide"
    });
    const names = collectDeepDisplayNames(scene);
    expect(names).not.toContain("PhotorealPlate");
    setSearch("");
  });
});

describe("default scene (no URL params)", () => {
  test("mounts the photobash composition with pedestrians and orbit controls", () => {
    setSearch("");
    const scene = SimulationScene({ sceneSnapshot: snapshot() });
    const names = collectDeepDisplayNames(scene);
    expect(names).toContain("MarkingDecalLayer");
    expect(names).toContain("LimitedOrbitControls");
    expect(names).toContain("BuildingLayer");
    expect(names).toContain("DynamicPedestrianLayer");
    expect(names).toContain("SignalLayer");
    expect(names).toContain("GroundDressingLayer");
    expect(names).toContain("StreetFurnitureLayer");
    expect(names).toContain("RoadDetailProps");
    expect(names).not.toContain("StaticRoadLayer");
  });

  test("?photobash=1 is an accepted no-op alias of the default", () => {
    setSearch("?photobash=1");
    const withParam = collectDeepDisplayNames(
      SimulationScene({ sceneSnapshot: snapshot() })
    );
    setSearch("");
    const withoutParam = collectDeepDisplayNames(
      SimulationScene({ sceneSnapshot: snapshot() })
    );
    expect(withParam).toEqual(withoutParam);
  });

  test("?roadonly=1 strips buildings, vehicles, signals, post-FX", () => {
    setSearch("?roadonly=1");
    const names = collectDeepDisplayNames(
      SimulationScene({ sceneSnapshot: snapshot() })
    );
    expect(names).toContain("MarkingDecalLayer");
    expect(names).not.toContain("BuildingLayer");
    expect(names).not.toContain("DynamicVehicleLayer");
    expect(names).not.toContain("SignalLayer");
    expect(names).not.toContain("GroundDressingLayer");
    expect(names).not.toContain("StreetFurnitureLayer");
    expect(names).not.toContain("RoadDetailProps");
    setSearch("");
  });

  test("cctv viewpoint selects the operatorCctv camera preset", () => {
    setSearch("");
    const scene = SimulationScene({
      sceneSnapshot: snapshot(),
      viewpoint: "cctv"
    });
    const rig = findElementByDisplayName(scene, "Stage3CameraRig");
    expect((rig?.props as { preset?: string })?.preset).toBe("operatorCctv");
  });
});

describe("deriveSignalLightingPreset", () => {
  test.each([
    ["clear", "day", "day"],
    ["cloudy", "day", "cloudy"],
    ["rain", "day", "rain"],
    ["clear", "night", "night"],
    ["rain", "night", "night"]
  ] as const)("%s + %s → %s", (weather, timeOfDay, expected) => {
    expect(deriveSignalLightingPreset(weather, timeOfDay)).toBe(expected);
  });
});
