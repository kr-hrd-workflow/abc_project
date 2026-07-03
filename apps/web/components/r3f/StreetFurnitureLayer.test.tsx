import { describe, expect, test } from "vitest";
import {
  STREET_FURNITURE_PLACEMENTS,
  STREET_FURNITURE_CONTACT_SHADOWS
} from "./StreetFurnitureLayer";
import { STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT } from "./shadowPolicy";

describe("street furniture placements", () => {
  test("dresses all four approaches with lights and trees", () => {
    const lights = STREET_FURNITURE_PLACEMENTS.filter(
      (p) => p.assetId === "props/streetlight"
    );
    const trees = STREET_FURNITURE_PLACEMENTS.filter(
      (p) => p.assetId === "props/tree_cluster"
    );
    expect(lights.length).toBeGreaterThanOrEqual(8);
    expect(trees.length).toBeGreaterThanOrEqual(6);
    // every placement sits OFF the carriageway: |x| or |z| beyond the road half-width (~14 m)
    for (const p of STREET_FURNITURE_PLACEMENTS) {
      expect(
        Math.min(Math.abs(p.position[0]), Math.abs(p.position[2]))
      ).toBeGreaterThanOrEqual(14);
    }
  });
  test("contact shadows exist and shadow casters respect the policy budget", () => {
    expect(STREET_FURNITURE_CONTACT_SHADOWS.length).toBeGreaterThanOrEqual(2);
    expect(STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT).toBe(2); // budget is NOT auto-raised by more lights
  });
});
