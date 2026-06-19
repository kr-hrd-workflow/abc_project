"use client";

import { memo } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { SignalHardware } from "./SignalHardware";

type SignalLayerLightingPreset = "day" | "cloudy" | "rain" | "night";
const ACTIVE_SIGNAL_LAYER_LIGHTING_PRESET: SignalLayerLightingPreset = "rain";

function SignalLayerComponent({
  signals,
  lightingPreset = ACTIVE_SIGNAL_LAYER_LIGHTING_PRESET
}: {
  signals: SceneSnapshot["signals"];
  lightingPreset?: SignalLayerLightingPreset;
}) {
  return (
    <group
      name="stage5-signal-layer"
      userData={{
        signalCount: signals.length,
        signalStateSource: "SceneSnapshot.signals",
        realSignalControlClaim: false,
        lightingPreset
      }}
    >
      <SignalHardware signals={signals} lightingPreset={lightingPreset} />
    </group>
  );
}

export const SignalLayer = memo(SignalLayerComponent);
SignalLayer.displayName = "SignalLayer";
