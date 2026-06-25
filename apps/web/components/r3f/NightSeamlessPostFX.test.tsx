// @vitest-environment jsdom

import { isValidElement } from "react";
import { EffectComposer } from "@react-three/postprocessing";
import { describe, expect, it } from "vitest";

import {
  NightSeamlessPostFX,
  resolveNightPostFXConfig
} from "./NightSeamlessPostFX";
import { getSeamlessGrade } from "./seamlessGrade";

describe("NightSeamlessPostFX", () => {
  it("derives exposure and bloom from the shared night grade", () => {
    const grade = getSeamlessGrade("night");
    const config = resolveNightPostFXConfig();

    expect(config.toneMappingExposure).toBe(grade.toneMappingExposure);
    expect(config.bloomIntensity).toBe(grade.bloomIntensity);
  });

  it("renders a bloom composer driven by the grade (no plate-washing tonemap)", () => {
    const element = NightSeamlessPostFX();

    expect(isValidElement(element)).toBe(true);
    // The fresh night composer is built directly on @react-three/postprocessing
    // (EffectComposer) and is NOT the legacy Stage6PostFX look. ACES tonemapping
    // is intentionally omitted so the display-referred plate is not washed out.
    expect(element.type).toBe(EffectComposer);
  });
});
