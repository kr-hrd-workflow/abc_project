import { describe, expect, test } from "vitest";
import { GROUND_DRESSING_BATCHES } from "./GroundDressingLayer";
import { CURB_SEGMENTS, SIDEWALK_SLABS, CITY_GROUND_APRON } from "./roadGeometry";

describe("GroundDressingLayer batches", () => {
  test("covers base ground + sidewalks + curbs + apron with instanced batches", () => {
    const names = GROUND_DRESSING_BATCHES.map((b) => b.name);
    expect(names).toContain("ground-dressing-base-plane");
    expect(names).toContain("ground-dressing-sidewalk-slabs");
    expect(names).toContain("ground-dressing-curbs");
    expect(names).toContain("ground-dressing-city-apron");
    const sidewalks = GROUND_DRESSING_BATCHES.find((b) => b.name === "ground-dressing-sidewalk-slabs");
    expect(sidewalks?.specs).toBe(SIDEWALK_SLABS);
    const curbs = GROUND_DRESSING_BATCHES.find((b) => b.name === "ground-dressing-curbs");
    expect(curbs?.specs).toBe(CURB_SEGMENTS);
  });
  test("base plane is large enough to kill the sky-dome ground void and sits under the road", () => {
    const base = GROUND_DRESSING_BATCHES.find((b) => b.name === "ground-dressing-base-plane");
    expect(base?.specs[0].size[0]).toBeGreaterThanOrEqual(700);
    expect(base?.specs[0].position[1]).toBeLessThan(0);
  });
});
