import { describe, expect, test } from "vitest";
import { buildMarkingDecalDescriptors } from "./markingDecalDescriptors";
import {
  CENTER_LINE_MARKINGS,
  CROSSWALK_STRIPES,
  STOP_LINE_MARKINGS,
  MARKING_HEIGHT,
} from "./roadGeometry";

describe("buildMarkingDecalDescriptors", () => {
  const decals = buildMarkingDecalDescriptors();
  const byKey = (k: string) => decals.filter((d) => d.textureKey === k);

  test("emits one decal per source marking spec, preserving x/z position", () => {
    expect(byKey("center_yellow")).toHaveLength(CENTER_LINE_MARKINGS.length);
    expect(byKey("crosswalk")).toHaveLength(CROSSWALK_STRIPES.length);
    expect(byKey("stop_bar")).toHaveLength(STOP_LINE_MARKINGS.length);

    const firstCw = byKey("crosswalk")[0];
    const srcCw = CROSSWALK_STRIPES[0];
    expect(firstCw.position[0]).toBeCloseTo(srcCw.position[0], 6); // x preserved
    expect(firstCw.position[2]).toBeCloseTo(srcCw.position[2], 6); // z preserved
    expect(firstCw.size).toEqual(srcCw.size);
    expect(firstCw.rotationY).toBeCloseTo(srcCw.rotationY ?? 0, 6);
  });

  test("lifts every decal above the asphalt to avoid z-fighting", () => {
    for (const d of decals) expect(d.position[1]).toBeGreaterThanOrEqual(MARKING_HEIGHT);
  });

  test("ids are unique", () => {
    expect(new Set(decals.map((d) => d.id)).size).toBe(decals.length);
  });
});
