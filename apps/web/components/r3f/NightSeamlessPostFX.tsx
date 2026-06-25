"use client";

import { useEffect } from "react";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import type { ReactElement } from "react";

import { GANGNAM_NIGHT_GRADE } from "./seamlessGrade";

export type NightPostFXConfig = {
  toneMappingExposure: number;
  bloomIntensity: number;
  bloomLuminanceThreshold: number;
  bloomLuminanceSmoothing: number;
};

// Fresh night image-formation config sourced ONLY from the shared night grade so
// the plate and the dynamic SUMO layer pass through one exposure + bloom. This
// is built fresh on @react-three/postprocessing directly; it does NOT reuse the
// failed Stage6PostFX look.
export function resolveNightPostFXConfig(): NightPostFXConfig {
  return {
    toneMappingExposure: GANGNAM_NIGHT_GRADE.toneMappingExposure,
    bloomIntensity: GANGNAM_NIGHT_GRADE.bloomIntensity,
    // Neon signage and headlights sit well above mid-grey; threshold keeps the
    // bloom on the bright emitters rather than washing the whole night frame.
    bloomLuminanceThreshold: 0.6,
    bloomLuminanceSmoothing: 0.3
  };
}

// Pushes the grade's exposure onto the WebGL renderer so every layer (plate +
// vehicles) shares one tonemapped exposure. No-op outside a live GL context.
function NightExposureSync({ exposure }: { exposure: number }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!gl || typeof gl.toneMappingExposure !== "number") {
      return;
    }
    const previous = gl.toneMappingExposure;
    gl.toneMappingExposure = exposure;
    invalidate();

    return () => {
      gl.toneMappingExposure = previous;
      invalidate();
    };
  }, [gl, invalidate, exposure]);

  return null;
}

NightExposureSync.displayName = "NightExposureSync";

export function NightSeamlessPostFX(): ReactElement {
  const config = resolveNightPostFXConfig();

  return (
    <EffectComposer enabled multisampling={0}>
      <ToneMapping
        blendFunction={BlendFunction.NORMAL}
        mode={ToneMappingMode.ACES_FILMIC}
      />
      <Bloom
        blendFunction={BlendFunction.SCREEN}
        intensity={config.bloomIntensity}
        luminanceThreshold={config.bloomLuminanceThreshold}
        luminanceSmoothing={config.bloomLuminanceSmoothing}
        mipmapBlur
      />
    </EffectComposer>
  );
}

NightSeamlessPostFX.displayName = "NightSeamlessPostFX";

export { NightExposureSync };
