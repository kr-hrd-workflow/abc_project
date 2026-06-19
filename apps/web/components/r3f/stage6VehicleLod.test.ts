import { describe, expect, test } from "vitest";

import {
  decideStage6VehicleLod,
  getStage6VehicleMaterialCues
} from "./stage6VehicleLod";
import { STAGE6_QUALITY_PRESETS } from "./stage6Quality";

describe("stage6VehicleLod", () => {
  test("assigns the four Stage 6 vehicle LOD tiers from distance and operator relevance", () => {
    expect(
      decideStage6VehicleLod({
        distanceMeters: 9,
        sourceLabel: "snapshot",
        vehicleType: "car",
        emergency: false
      }).tier
    ).toBe("hero");
    expect(
      decideStage6VehicleLod({
        distanceMeters: 30,
        sourceLabel: "snapshot",
        vehicleType: "emergency",
        emergency: true
      }).tier
    ).toBe("near");
    expect(
      decideStage6VehicleLod({
        distanceMeters: 64,
        sourceLabel: "snapshot",
        vehicleType: "bus",
        emergency: false
      }).tier
    ).toBe("mid");
    expect(
      decideStage6VehicleLod({
        distanceMeters: 96,
        sourceLabel: "aggregate_density_proxy",
        vehicleType: "car",
        emergency: false
      }).tier
    ).toBe("far");
  });

  test("allows high-quality GLB vehicles only for precise close or operator-relevant vehicles", () => {
    expect(
      decideStage6VehicleLod({
        distanceMeters: 12,
        sourceLabel: "snapshot",
        vehicleType: "car",
        emergency: false
      }).highQualityGlbEligible
    ).toBe(true);
    expect(
      decideStage6VehicleLod({
        distanceMeters: 30,
        sourceLabel: "snapshot",
        vehicleType: "emergency",
        emergency: true
      }).highQualityGlbEligible
    ).toBe(true);
    expect(
      decideStage6VehicleLod({
        distanceMeters: 30,
        sourceLabel: "snapshot",
        vehicleType: "car",
        emergency: false
      }).highQualityGlbEligible
    ).toBe(false);
    const aggregateDecision = decideStage6VehicleLod({
      distanceMeters: 12,
      sourceLabel: "aggregate_density_proxy",
      vehicleType: "car",
      emergency: false
    });

    expect(aggregateDecision.tier).toBe("far");
    expect(aggregateDecision.highQualityGlbEligible).toBe(false);
  });

  test("uses the active Stage 6 quality preset for precise vehicle LOD radius decisions", () => {
    expect(
      decideStage6VehicleLod({
        distanceMeters: 20,
        sourceLabel: "snapshot",
        vehicleType: "car",
        emergency: false,
        qualityPreset: "low"
      })
    ).toMatchObject({
      tier: "mid",
      highQualityGlbEligible: false
    });
    expect(
      decideStage6VehicleLod({
        distanceMeters: 20,
        sourceLabel: "snapshot",
        vehicleType: "car",
        emergency: false,
        qualityPreset: STAGE6_QUALITY_PRESETS.high
      })
    ).toMatchObject({
      tier: "hero",
      highQualityGlbEligible: true
    });
  });

  test("declares the material response cues expected by Stage 6 vehicle rendering", () => {
    expect(
      getStage6VehicleMaterialCues({
        vehicleType: "emergency",
        emergency: true,
        speedMps: 0.2,
        waitingSeconds: 8,
        truthSource: "precise"
      })
    ).toEqual({
      paint: "clearcoat_pbr",
      glass: "transparent_reflective",
      tire: "rough_rubber",
      headLight: "warm_projector",
      brakeLight: "red_emissive",
      emergencyLight: "red_blue_roof_beacon"
    });
  });

  test("keeps proxy material cues brake-neutral even when proxy speed is zero", () => {
    expect(
      getStage6VehicleMaterialCues({
        vehicleType: "car",
        emergency: false,
        speedMps: 0,
        waitingSeconds: 9,
        truthSource: "proxy"
      }).brakeLight
    ).toBe("dim_red_lens");
  });
});
