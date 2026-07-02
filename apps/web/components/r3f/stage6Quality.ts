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

export type ScenePresentationState = {
  weather: Stage6WeatherPresetName;
  timeOfDay: Stage6TimeOfDay;
  viewpoint: "wide" | "cctv";
};

export const DEFAULT_SCENE_PRESENTATION: ScenePresentationState = {
  weather: "clear",
  timeOfDay: "day",
  viewpoint: "wide"
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

export function getStage6PresentationMode(
  input?: string | URLSearchParams
): Stage6PresentationMode {
  const params = getStage6PresentationParams(input);

  return {
    qualityPreset: getStage6QualityPreset(params?.get("r3fQuality") ?? undefined),
    weather: getStage6WeatherPreset(params?.get("r3fWeather")),
    timeOfDay: getStage6TimeOfDay(params?.get("r3fTimeOfDay"))
  };
}

function getStage6PresentationParams(
  input?: string | URLSearchParams
): URLSearchParams | null {
  if (typeof input === "string") {
    return new URLSearchParams(input);
  }

  if (input) {
    return input;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search);
}

function getStage6WeatherPreset(
  input: string | null | undefined
): Stage6WeatherPresetName {
  const key = input?.toLowerCase();

  if (key === "clear" || key === "cloudy" || key === "rain") {
    return key;
  }

  return "clear";
}

function getStage6TimeOfDay(input: string | null | undefined): Stage6TimeOfDay {
  const key = input?.toLowerCase();

  if (key === "day" || key === "night") {
    return key;
  }

  return "day";
}
