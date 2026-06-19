import type {
  SimulationDensitySegmentSource,
  SimulationVehicleType
} from "../../lib/simulationSnapshot";
import type {
  Stage6QualityPreset,
  Stage6QualityPresetName
} from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

export type Stage6VehicleLodTier = "hero" | "near" | "mid" | "far";

export type Stage6VehicleSourceLabel =
  | "snapshot"
  | "fixture"
  | SimulationDensitySegmentSource;

export type Stage6VehicleMaterialCues = {
  paint: "clearcoat_pbr";
  glass: "transparent_reflective";
  tire: "rough_rubber";
  headLight: "warm_projector";
  brakeLight: "red_emissive" | "dim_red_lens";
  emergencyLight: "red_blue_roof_beacon" | "none";
};

export type Stage6VehicleTruthSource = "precise" | "proxy";

export type Stage6VehicleLodDecision = {
  tier: Stage6VehicleLodTier;
  highQualityGlbEligible: boolean;
  operatorRelevant: boolean;
  materialCues: Stage6VehicleMaterialCues;
};

export const STAGE6_VEHICLE_MATERIAL_RESPONSE_CUES = [
  "paint",
  "glass",
  "tire",
  "headLight",
  "brakeLight",
  "emergencyLight"
] as const satisfies readonly (keyof Stage6VehicleMaterialCues)[];

export const STAGE6_VEHICLE_LOD_POLICY = {
  defaultQualityPresetName: "high",
  midRadiusMultiplier: 2,
  highQualityGlbTiers: ["hero", "near"],
  aggregateDensityTier: "far"
} as const satisfies {
  defaultQualityPresetName: Stage6QualityPresetName;
  midRadiusMultiplier: number;
  highQualityGlbTiers: readonly Stage6VehicleLodTier[];
  aggregateDensityTier: Stage6VehicleLodTier;
};

export function decideStage6VehicleLod({
  distanceMeters,
  sourceLabel,
  vehicleType,
  emergency,
  speedMps = 0,
  waitingSeconds = 0,
  qualityPreset,
  operatorRelevant = false
}: {
  distanceMeters: number;
  sourceLabel: Stage6VehicleSourceLabel;
  vehicleType: SimulationVehicleType;
  emergency: boolean;
  speedMps?: number;
  waitingSeconds?: number;
  qualityPreset?: Stage6QualityPreset | Stage6QualityPresetName;
  operatorRelevant?: boolean;
}): Stage6VehicleLodDecision {
  const isPreciseSnapshot = sourceLabel === "snapshot";
  const resolvedQualityPreset = resolveStage6VehicleQualityPreset(qualityPreset);
  const isOperatorRelevant =
    operatorRelevant || emergency || vehicleType === "emergency";
  const tier = isPreciseSnapshot
    ? decidePreciseSnapshotTier(distanceMeters, resolvedQualityPreset)
    : STAGE6_VEHICLE_LOD_POLICY.aggregateDensityTier;

  return {
    tier,
    highQualityGlbEligible:
      isPreciseSnapshot &&
      (tier === "hero" || (tier === "near" && isOperatorRelevant)),
    operatorRelevant: isOperatorRelevant,
    materialCues: getStage6VehicleMaterialCues({
      vehicleType,
      emergency,
      speedMps,
      waitingSeconds,
      truthSource: isPreciseSnapshot ? "precise" : "proxy"
    })
  };
}

export function getStage6VehicleMaterialCues({
  vehicleType,
  emergency,
  speedMps,
  waitingSeconds,
  truthSource
}: {
  vehicleType: SimulationVehicleType;
  emergency: boolean;
  speedMps: number;
  waitingSeconds: number;
  truthSource: Stage6VehicleTruthSource;
}): Stage6VehicleMaterialCues {
  const hasPreciseTruth = truthSource === "precise";
  const braking = hasPreciseTruth && (waitingSeconds > 0.5 || speedMps < 0.5);

  return {
    paint: "clearcoat_pbr",
    glass: "transparent_reflective",
    tire: "rough_rubber",
    headLight: "warm_projector",
    brakeLight: braking ? "red_emissive" : "dim_red_lens",
    emergencyLight:
      hasPreciseTruth && (emergency || vehicleType === "emergency")
        ? "red_blue_roof_beacon"
        : "none"
  };
}

function decidePreciseSnapshotTier(
  distanceMeters: number,
  qualityPreset: Stage6QualityPreset
): Stage6VehicleLodTier {
  if (distanceMeters <= qualityPreset.heroVehicleRadiusMeters) {
    return "hero";
  }
  if (distanceMeters <= qualityPreset.nearVehicleRadiusMeters) {
    return "near";
  }
  if (
    distanceMeters <=
    qualityPreset.nearVehicleRadiusMeters *
      STAGE6_VEHICLE_LOD_POLICY.midRadiusMultiplier
  ) {
    return "mid";
  }
  return "far";
}

function resolveStage6VehicleQualityPreset(
  qualityPreset: Stage6QualityPreset | Stage6QualityPresetName | undefined
) {
  if (!qualityPreset) {
    return getStage6QualityPreset(STAGE6_VEHICLE_LOD_POLICY.defaultQualityPresetName);
  }

  return typeof qualityPreset === "string"
    ? getStage6QualityPreset(qualityPreset)
    : qualityPreset;
}
