"use client";

import { useEffect } from "react";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import { BlendFunction } from "postprocessing";
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
    // High threshold so only genuinely bright emitters (headlights, neon signs)
    // bloom — the plate's many mid-bright lit windows must NOT bloom, or the
    // distant city washes the upper frame into a milky haze.
    bloomLuminanceThreshold: 0.85,
    bloomLuminanceSmoothing: 0.2
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

  // NO ACES tonemapping: the plate is a finished, display-referred photo, and
  // ACES washed its bright distance into a milky haze. The plate round-trips
  // sRGB->linear->sRGB unchanged; only a gentle bloom adds glow to the bright
  // emitters (headlights, neon) so the live cars sit in the neon scene.
  return (
    <EffectComposer enabled multisampling={0}>
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
