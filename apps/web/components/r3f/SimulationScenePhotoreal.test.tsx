// @vitest-environment jsdom

import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode
} from "react";
import { afterEach, describe, expect, test } from "vitest";

import { SimulationScene } from "./SimulationScene";
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
    expect(names).toContain("BuildingLayer"); // metric Gangnam buildings fill the scene
    expect(names).not.toContain("PhotorealPlate");
    setSearch("");
  });
});
