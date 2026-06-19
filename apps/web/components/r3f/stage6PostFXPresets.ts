import {
  getStage6QualityPreset,
  type Stage6QualityPresetName
} from "./stage6Quality";

export type Stage6SSAOLevel = "off" | "lite" | "standard" | "dual";
export type Stage6BloomLevel =
  | "off"
  | "signal-lite"
  | "headlight"
  | "cinematic";
export type Stage6PostFXChainItem =
  | "SMAA"
  | "SSAO"
  | "Bloom"
  | "ToneMapping"
  | "Noise"
  | "Vignette";

export type Stage6PostFXPreset = {
  enabled: boolean;
  smaa: boolean;
  ssao: Stage6SSAOLevel;
  bloom: Stage6BloomLevel;
  noiseOpacity: number;
  vignetteDarkness: number;
  toneMappingExposure: number;
  saturation: number;
  contrast: number;
  blackLevel: number;
  cctvCompressionNoise: number;
  scanlineOpacity: number;
  lensDistortion: number;
};

export type Stage6PostFXState = {
  qualityPreset: Stage6QualityPresetName;
  enabled: boolean;
  chain: Stage6PostFXChainItem[];
  chainLabel: string;
};

export const STAGE6_POSTFX_PRESETS: Record<
  Stage6QualityPresetName,
  Stage6PostFXPreset
> = {
  low: {
    enabled: false,
    smaa: false,
    ssao: "off",
    bloom: "off",
    noiseOpacity: 0,
    vignetteDarkness: 0,
    toneMappingExposure: 1,
    saturation: 1,
    contrast: 1,
    blackLevel: 0,
    cctvCompressionNoise: 0,
    scanlineOpacity: 0,
    lensDistortion: 0
  },
  medium: {
    enabled: true,
    smaa: true,
    ssao: "lite",
    bloom: "signal-lite",
    noiseOpacity: 0.025,
    vignetteDarkness: 0.12,
    toneMappingExposure: 1,
    saturation: 0.96,
    contrast: 1.1,
    blackLevel: 0.02,
    cctvCompressionNoise: 0.035,
    scanlineOpacity: 0.025,
    lensDistortion: 0.01
  },
  high: {
    enabled: true,
    smaa: true,
    ssao: "standard",
    bloom: "headlight",
    noiseOpacity: 0.035,
    vignetteDarkness: 0.18,
    toneMappingExposure: 1.04,
    saturation: 0.92,
    contrast: 1.12,
    blackLevel: 0.026,
    cctvCompressionNoise: 0.045,
    scanlineOpacity: 0.035,
    lensDistortion: 0.015
  },
  ultra: {
    enabled: true,
    smaa: true,
    ssao: "dual",
    bloom: "cinematic",
    noiseOpacity: 0.045,
    vignetteDarkness: 0.24,
    toneMappingExposure: 1.08,
    saturation: 0.9,
    contrast: 1.16,
    blackLevel: 0.034,
    cctvCompressionNoise: 0.055,
    scanlineOpacity: 0.045,
    lensDistortion: 0.02
  }
};

export function getStage6PostFXPreset(
  input: Stage6QualityPresetName | string | undefined
): Stage6PostFXPreset {
  return STAGE6_POSTFX_PRESETS[getStage6QualityPreset(input).name];
}

export function getStage6PostFXChain(
  input: Stage6QualityPresetName | string | undefined
): Stage6PostFXChainItem[] {
  const preset = getStage6PostFXPreset(input);

  if (!preset.enabled) {
    return [];
  }

  const chain: Stage6PostFXChainItem[] = [];

  if (preset.smaa) chain.push("SMAA");
  if (preset.ssao !== "off") chain.push("SSAO");
  if (preset.bloom !== "off") chain.push("Bloom");

  chain.push("ToneMapping");

  if (preset.noiseOpacity > 0 || preset.cctvCompressionNoise > 0) {
    chain.push("Noise");
  }
  if (preset.vignetteDarkness > 0) {
    chain.push("Vignette");
  }

  return chain;
}

export function buildStage6PostFXState(
  input: Stage6QualityPresetName | string | undefined
): Stage6PostFXState {
  const qualityPreset = getStage6QualityPreset(input).name;
  const preset = STAGE6_POSTFX_PRESETS[qualityPreset];
  const chain = getStage6PostFXChain(qualityPreset);

  return {
    qualityPreset,
    enabled: preset.enabled,
    chain,
    chainLabel: chain.length > 0 ? chain.join(",") : "off"
  };
}
