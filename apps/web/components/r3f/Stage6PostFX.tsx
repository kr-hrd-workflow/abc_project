"use client";

import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  Noise,
  SMAA,
  SSAO,
  ToneMapping,
  Vignette
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import type { ReactElement } from "react";

import type { Stage6QualityPresetName } from "./stage6Quality";
import {
  getStage6PostFXPreset,
  type Stage6BloomLevel,
  type Stage6SSAOLevel
} from "./stage6PostFXPresets";

export type Stage6PostFXProps = {
  qualityPreset?: Stage6QualityPresetName | string;
  enabled?: boolean;
  renderPriority?: number;
};

export function Stage6PostFX({
  qualityPreset = "high",
  enabled = true,
  renderPriority = 1
}: Stage6PostFXProps): ReactElement | null {
  const preset = getStage6PostFXPreset(qualityPreset);

  if (!enabled || !preset.enabled) {
    return null;
  }

  const ssao = getStage6SSAOSettings(preset.ssao);
  const bloom = getStage6BloomSettings(preset.bloom);
  const effects: ReactElement[] = [];

  if (preset.smaa) {
    effects.push(<SMAA key="smaa" />);
  }
  if (ssao) {
    effects.push(
      <SSAO
        key="ssao"
        blendFunction={BlendFunction.MULTIPLY}
        samples={ssao.samples}
        rings={ssao.rings}
        radius={ssao.radius}
        intensity={ssao.intensity}
        luminanceInfluence={0.72}
        worldDistanceThreshold={ssao.worldDistanceThreshold}
        worldDistanceFalloff={0.18}
        worldProximityThreshold={ssao.worldProximityThreshold}
        worldProximityFalloff={0.18}
        resolutionScale={ssao.resolutionScale}
      />
    );
  }
  if (bloom) {
    effects.push(
      <Bloom
        key="bloom"
        blendFunction={BlendFunction.SCREEN}
        intensity={bloom.intensity}
        luminanceThreshold={bloom.luminanceThreshold}
        luminanceSmoothing={bloom.luminanceSmoothing}
        mipmapBlur
      />
    );
  }

  effects.push(
    <ToneMapping
      key="tone-mapping"
      blendFunction={BlendFunction.NORMAL}
      mode={ToneMappingMode.ACES_FILMIC}
      whitePoint={4 * preset.toneMappingExposure}
      middleGrey={0.6 / preset.toneMappingExposure}
      minLuminance={0.01}
    />,
    <HueSaturation
      key="hue-saturation"
      blendFunction={BlendFunction.NORMAL}
      hue={0}
      saturation={preset.saturation - 1}
    />,
    <BrightnessContrast
      key="brightness-contrast"
      blendFunction={BlendFunction.NORMAL}
      brightness={-preset.blackLevel}
      contrast={preset.contrast - 1}
    />
  );

  if (preset.noiseOpacity > 0) {
    effects.push(
      <Noise
        key="noise"
        blendFunction={BlendFunction.SOFT_LIGHT}
        opacity={Math.max(preset.noiseOpacity, preset.cctvCompressionNoise)}
        premultiply
      />
    );
  }
  if (preset.vignetteDarkness > 0) {
    effects.push(
      <Vignette
        key="vignette"
        blendFunction={BlendFunction.NORMAL}
        eskil={false}
        // Pushed out to the extreme corners (was 0.18) so the high
        // traffic-monitoring camera shows all four approach ends evenly instead
        // of fading them to near-black.
        offset={0.62}
        darkness={preset.vignetteDarkness}
      />
    );
  }

  return (
    <EffectComposer
      enabled
      depthBuffer={ssao !== null}
      enableNormalPass={ssao !== null}
      multisampling={0}
      renderPriority={renderPriority}
      resolutionScale={ssao?.resolutionScale ?? 1}
    >
      {effects}
    </EffectComposer>
  );
}

type Stage6SSAOSettings = {
  samples: number;
  rings: number;
  radius: number;
  intensity: number;
  worldDistanceThreshold: number;
  worldProximityThreshold: number;
  resolutionScale: number;
};

function getStage6SSAOSettings(level: Stage6SSAOLevel): Stage6SSAOSettings | null {
  if (level === "off") {
    return null;
  }

  if (level === "lite") {
    return {
      samples: 8,
      rings: 3,
      radius: 0.12,
      intensity: 0.9,
      worldDistanceThreshold: 8,
      worldProximityThreshold: 0.8,
      resolutionScale: 0.65
    };
  }

  if (level === "standard") {
    return {
      samples: 16,
      rings: 4,
      radius: 0.18,
      intensity: 1.15,
      worldDistanceThreshold: 12,
      worldProximityThreshold: 1.1,
      resolutionScale: 0.8
    };
  }

  return {
    samples: 24,
    rings: 5,
    radius: 0.22,
    intensity: 1.25,
    worldDistanceThreshold: 14,
    worldProximityThreshold: 1.25,
    resolutionScale: 0.9
  };
}

type Stage6BloomSettings = {
  intensity: number;
  luminanceThreshold: number;
  luminanceSmoothing: number;
};

function getStage6BloomSettings(
  level: Stage6BloomLevel
): Stage6BloomSettings | null {
  if (level === "off") {
    return null;
  }

  if (level === "signal-lite") {
    return {
      intensity: 0.28,
      luminanceThreshold: 0.74,
      luminanceSmoothing: 0.38
    };
  }

  if (level === "headlight") {
    return {
      intensity: 0.42,
      luminanceThreshold: 0.62,
      luminanceSmoothing: 0.34
    };
  }

  return {
    intensity: 0.54,
    luminanceThreshold: 0.56,
    luminanceSmoothing: 0.32
  };
}
