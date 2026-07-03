"use client";

import { memo, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator, type Scene, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { GANGNAM_NIGHT_GRADE } from "./seamlessGrade";

// Fresh night lighting derived ONLY from the shared night grade. Built from the
// PMREM/RoomEnvironment API as a reference but written fresh — it does NOT import
// or mount EnvironmentLayer's failed night preset. The intent: SUMO vehicles
// pick up the plate's neon cast so they sit in the scene instead of on top of it.

export type NightLightingConfig = {
  environmentIntensity: number;
  neonColor: string;
  // Warm sodium counter-cast keeps the neon from reading monochromatic blue.
  groundBounceColor: string;
  ambientIntensity: number;
  keyIntensity: number;
};

export function resolveNightLightingConfig(): NightLightingConfig {
  return {
    environmentIntensity: GANGNAM_NIGHT_GRADE.environmentIntensity,
    neonColor: GANGNAM_NIGHT_GRADE.neonColor,
    groundBounceColor: "#3a1f12",
    // Ambient + key scale with the IBL intensity so the whole night look is one
    // dial driven by the grade rather than per-light magic numbers.
    ambientIntensity: GANGNAM_NIGHT_GRADE.environmentIntensity * 0.6,
    keyIntensity: GANGNAM_NIGHT_GRADE.environmentIntensity * 1.4
  };
}

function NightSeamlessLightingComponent() {
  const config = useMemo(() => resolveNightLightingConfig(), []);

  return (
    <group
      name="gangnam-night-seamless-lighting"
      userData={{
        lightingSource: "fresh_night_neon_ibl",
        environmentIntensity: config.environmentIntensity,
        neonColor: config.neonColor
      }}
    >
      <NightNeonIBL config={config} />
      {/* Neon-biased hemisphere: sky takes the dominant neon cast, ground takes a
          warm sodium bounce so vehicle undersides do not go flat black. */}
      <hemisphereLight
        color={config.neonColor}
        groundColor={config.groundBounceColor}
        intensity={config.ambientIntensity}
      />
      {/* Soft fill so emissive headlights still read against graded shadows. */}
      <ambientLight color={config.neonColor} intensity={config.ambientIntensity * 0.4} />
      {/* High, cool key approximating spill from the towers in the plate. */}
      <directionalLight
        color={config.neonColor}
        intensity={config.keyIntensity}
        position={[18, 42, -8]}
      />
    </group>
  );
}

// Installs a neon-tinted PMREM environment as the scene IBL at the grade's
// intensity. No-op under jsdom / a non-GL renderer so unit tests stay headless.
function NightNeonIBL({ config }: { config: NightLightingConfig }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (isJsdomRuntime() || !canUseRenderer(gl)) {
      return;
    }

    const pmrem = new PMREMGenerator(gl);
    const environmentScene = new RoomEnvironment();
    const environmentTexture = pmrem.fromScene(environmentScene, 0.06).texture;

    const previousEnvironment = scene.environment;
    const previousIntensity = readEnvironmentIntensity(scene);

    scene.environment = environmentTexture;
    writeEnvironmentIntensity(scene, config.environmentIntensity);
    // Background is owned by the 3D building/sky layer, not this IBL.
    // This IBL only drives lighting, never the visible backdrop, so it must not
    // clobber the backdrop with a solid color.
    invalidate();

    return () => {
      if (scene.environment === environmentTexture) {
        scene.environment = previousEnvironment;
        writeEnvironmentIntensity(scene, previousIntensity);
      }
      environmentTexture.dispose();
      pmrem.dispose();
      invalidate();
    };
  }, [config.environmentIntensity, config.neonColor, gl, invalidate, scene]);

  return null;
}

NightNeonIBL.displayName = "NightNeonIBL";

function canUseRenderer(renderer: unknown): renderer is WebGLRenderer {
  return (
    typeof renderer === "object" &&
    renderer !== null &&
    "getRenderTarget" in renderer &&
    "setRenderTarget" in renderer
  );
}

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" && /jsdom/i.test(window.navigator.userAgent)
  );
}

function readEnvironmentIntensity(scene: Scene) {
  return (
    (scene as Scene & { environmentIntensity?: number }).environmentIntensity ?? 1
  );
}

function writeEnvironmentIntensity(scene: Scene, intensity: number) {
  (scene as Scene & { environmentIntensity?: number }).environmentIntensity =
    intensity;
}

export const NightSeamlessLighting = memo(NightSeamlessLightingComponent);
NightSeamlessLighting.displayName = "NightSeamlessLighting";
