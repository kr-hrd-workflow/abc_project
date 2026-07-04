import { describe, expect, test } from "vitest";

import {
  buildRoadDetailInstancingPlan,
  ROAD_DETAIL_PROP_SPECS
} from "./RoadDetailProps";

// Structural pin for the instancing refactor: RoadDetailProps used to render ~38
// individual procedural meshes (one draw call each, doubled by the SSAO normal
// pass). The instancing plan groups same-geometry+same-material repeats so each
// group renders as a single InstancedMesh. These assertions guard that the plan
// is a complete partition (no spec dropped or double-counted) and stays batched.
// 2026-07-04: the render pass merges further — material-KIND-compatible
// sub-groups share one InstancedMesh via instanceColor (14 -> 7 instanced
// draws) and all unique canvas labels bake into ONE atlas mesh (5 -> 1).
describe("buildRoadDetailInstancingPlan", () => {
  const plan = buildRoadDetailInstancingPlan(ROAD_DETAIL_PROP_SPECS);

  test("assigns every spec to exactly one instancing group", () => {
    const groupedIds = plan.flatMap((group) =>
      group.specs.map((spec) => spec.id)
    );
    const specIds = ROAD_DETAIL_PROP_SPECS.map((spec) => spec.id);

    expect(new Set(groupedIds).size).toBe(groupedIds.length); // no duplicates
    expect([...groupedIds].sort()).toEqual([...specIds].sort()); // covers all
  });

  test("batches into at most 7 kind groups (one per prop kind)", () => {
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.length).toBeLessThanOrEqual(7);
  });

  test("each group is homogeneous (same kind → same geometry+material family)", () => {
    for (const group of plan) {
      expect(group.specs.length).toBeGreaterThan(0);
      expect(new Set(group.specs.map((spec) => spec.kind)).size).toBe(1);
      expect(group.kind).toBe(group.specs[0].kind);
      expect(group.key).toContain(group.kind);
    }
  });
});
