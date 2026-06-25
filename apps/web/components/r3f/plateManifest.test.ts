import { describe, expect, it } from "vitest";
import { getPlateEntry, PLATE_ASSET_ID_BY_ANGLE } from "./plateManifest";

describe("plateManifest", () => {
  it("resolves the operator-wide night plate entry", () => {
    const entry = getPlateEntry("operator-wide");
    expect(entry.runtimeUsage).toBe("background-plate");
    expect(entry.visualRejectIfToyLike).toBe(true);
  });

  it("maps the operator-wide angle to a stable plate asset id", () => {
    expect(PLATE_ASSET_ID_BY_ANGLE["operator-wide"]).toBe(
      "plates/gangnam_night_operator_wide"
    );
  });

  it("throws for an unmapped angle", () => {
    expect(() => getPlateEntry("nope")).toThrow(/no plate/i);
  });
});
