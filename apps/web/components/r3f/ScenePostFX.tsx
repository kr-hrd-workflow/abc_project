"use client";

// ScenePostFX — unified post-processing pipeline for day AND night.
//
// Design constraints:
// - Only ONE EffectComposer may run. Stage6PostFX was removed from SimulationCanvas;
//   this component is now the single compositor.
// - Night: NO ACES tonemapping. The plate is a finished, display-referred photo and
//   ACES washes it milky. Night uses Bloom-only (high threshold, neon sources only)
//   plus renderer-exposure sync via NightExposureSync — same rule as NightSeamlessPostFX.
// - Day: full pipeline (ToneMapping ACES + SSAO + Bloom + Noise + Vignette) via Stage6PostFX.
// - Low quality (postFx "off"): returns null — no EffectComposer overhead.

import { useThree, type RootState } from "@react-three/fiber";
import type { ReactElement, ReactNode } from "react";

import { GANGNAM_NIGHT_GRADE } from "./seamlessGrade";

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" && /jsdom/i.test(window.navigator.userAgent)
  );
}
import { NightExposureSync, NightSeamlessPostFX } from "./NightSeamlessPostFX";
import { Stage6PostFX } from "./Stage6PostFX";
import { getStage6PostFXPreset } from "./stage6PostFXPresets";
import type { Stage6QualityPreset, Stage6TimeOfDay } from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

export type ScenePostFXProps = {
  timeOfDay?: Stage6TimeOfDay;
  qualityPreset?: Stage6QualityPreset;
};

export function ScenePostFX({
  timeOfDay = "day",
  qualityPreset = getStage6QualityPreset("high")
}: ScenePostFXProps): ReactElement | null {
  const preset = getStage6PostFXPreset(qualityPreset.name);

  // Low quality or explicit off: skip the EffectComposer entirely.
  if (!preset.enabled) {
    return null;
  }

  // jsdom (unit test env) does not provide a real WebGL Canvas context, so
  // EffectComposer would throw "Hooks can only be used within the Canvas
  // component!" when mounted. Return null — the existing NightSeamlessPostFX
  // tests cover the composer behaviour in isolation.
  if (isJsdomRuntime()) {
    return null;
  }

  // Night: Bloom-only composer (no ACES) + renderer exposure sync.
  if (timeOfDay === "night") {
    return (
      <PostProcessingContextGate>
        <NightExposureSync exposure={GANGNAM_NIGHT_GRADE.toneMappingExposure} />
        <NightSeamlessPostFX />
      </PostProcessingContextGate>
    );
  }

  // Day: full cinematic pipeline (ToneMapping ACES + SSAO + Bloom + grade effects).
  return (
    <PostProcessingContextGate>
      <Stage6PostFX qualityPreset={qualityPreset.name} />
    </PostProcessingContextGate>
  );
}

ScenePostFX.displayName = "ScenePostFX";

function PostProcessingContextGate({
  children
}: {
  children: ReactNode;
}): ReactElement | null {
  const { gl } = useThree();

  if (!canUsePostProcessingComposer(gl)) {
    return null;
  }

  return <>{children}</>;
}

export function canUsePostProcessingComposer(
  renderer: Pick<RootState["gl"], "getContext">
): boolean {
  try {
    const context = renderer.getContext();

    if (
      typeof context.isContextLost === "function" &&
      context.isContextLost()
    ) {
      return false;
    }

    if (typeof context.getContextAttributes !== "function") {
      return false;
    }

    return context.getContextAttributes() !== null;
  } catch {
    return false;
  }
}
