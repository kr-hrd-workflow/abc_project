import { describe, expect, it } from "vitest";
import { GANGNAM_NIGHT_GRADE, getSeamlessGrade } from "./seamlessGrade";

describe("seamlessGrade", () => {
  it("night grade enables emissive headlights for grounding", () => {
    expect(GANGNAM_NIGHT_GRADE.vehicleEmissiveIntensity).toBeGreaterThan(0);
  });

  it("night grade lowers exposure relative to a notional 1.0 baseline", () => {
    expect(GANGNAM_NIGHT_GRADE.toneMappingExposure).toBeLessThan(1);
  });

  it("returns the night grade for night", () => {
    expect(getSeamlessGrade("night")).toBe(GANGNAM_NIGHT_GRADE);
  });
});
