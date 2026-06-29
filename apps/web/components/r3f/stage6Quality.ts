export type Stage6QualityPresetName = "low" | "medium" | "high" | "ultra";
export type Stage6WeatherPresetName = "clear" | "cloudy" | "rain";
export type Stage6TimeOfDay = "day" | "night";

export type Stage6QualityPreset = {
  name: Stage6QualityPresetName;
  postFx: "off" | "lite" | "standard" | "cinematic";
  reflections: "fake" | "planar-lite" | "planar" | "planar-high";
  weatherParticles: "off" | "lite" | "standard" | "dense";
  heroVehicleRadiusMeters: number;
  nearVehicleRadiusMeters: number;
  maxShadowCasters: number;
  maxDpr: number;
  targetFrameTimeMs: number;
};

export type Stage6PresentationMode = {
  qualityPreset: Stage6QualityPreset;
  weather: Stage6WeatherPresetName;
  timeOfDay: Stage6TimeOfDay;
};

export const STAGE6_TEXTURE_MEMORY_ESTIMATE_MB = 12;

export const STAGE6_QUALITY_PRESETS: Record<
  Stage6QualityPresetName,
  Stage6QualityPreset
> = {
  low: {
    name: "low",
    postFx: "off",
    reflections: "fake",
    weatherParticles: "off",
    heroVehicleRadiusMeters: 0,
    nearVehicleRadiusMeters: 18,
    maxShadowCasters: 4,
    maxDpr: 1,
    targetFrameTimeMs: 40
  },
  medium: {
    name: "medium",
    postFx: "lite",
    reflections: "planar-lite",
    weatherParticles: "lite",
    heroVehicleRadiusMeters: 12,
    nearVehicleRadiusMeters: 28,
    maxShadowCasters: 8,
    maxDpr: 1.25,
    targetFrameTimeMs: 28
  },
  high: {
    name: "high",
    postFx: "standard",
    reflections: "planar",
    weatherParticles: "standard",
    heroVehicleRadiusMeters: 22,
    nearVehicleRadiusMeters: 42,
    maxShadowCasters: 14,
    maxDpr: 1.5,
    targetFrameTimeMs: 20
  },
  ultra: {
    name: "ultra",
    postFx: "cinematic",
    reflections: "planar-high",
    weatherParticles: "dense",
    heroVehicleRadiusMeters: 32,
    nearVehicleRadiusMeters: 58,
    maxShadowCasters: 24,
    maxDpr: 2,
    targetFrameTimeMs: 16.7
  }
};

export function getStage6QualityPreset(
  input: string | undefined
): Stage6QualityPreset {
  const key = input?.toLowerCase();

  if (key === "low" || key === "medium" || key === "high" || key === "ultra") {
    return STAGE6_QUALITY_PRESETS[key];
  }

  return STAGE6_QUALITY_PRESETS.high;
}

export function getStage6PresentationMode(): Stage6PresentationMode {
  return {
    qualityPreset: STAGE6_QUALITY_PRESETS.high,
    weather: "rain",
    timeOfDay: "day"
  };
}
