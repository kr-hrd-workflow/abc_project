// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  resolveNightVehicleTreatment
} from "./NightVehicleTreatment";
import { getSeamlessGrade } from "./seamlessGrade";

describe("NightVehicleTreatment", () => {
  it("drives emissive head/taillight intensity from the shared night grade", () => {
    const grade = getSeamlessGrade("night");
    const treatment = resolveNightVehicleTreatment("night");

    expect(treatment.emissiveIntensity).toBe(grade.vehicleEmissiveIntensity);
    expect(treatment.emissiveIntensity).toBeGreaterThan(0);
  });

  it("grounds vehicles with a contact shadow and a wet reflection at night", () => {
    const treatment = resolveNightVehicleTreatment("night");

    expect(treatment.contactShadow.enabled).toBe(true);
    expect(treatment.wetReflection.enabled).toBe(true);
    // The headlight pool keeps cars from looking pasted on dry tarmac.
    expect(treatment.roadLightPoolIntensity).toBeGreaterThan(0);
  });

  it("does not force night emissive grounding during the day path", () => {
    const treatment = resolveNightVehicleTreatment("day");

    expect(treatment.contactShadow.enabled).toBe(false);
    expect(treatment.wetReflection.enabled).toBe(false);
    expect(treatment.emissiveIntensity).toBe(
      getSeamlessGrade("day").vehicleEmissiveIntensity
    );
  });
});
