"use client";

import { memo } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { SignalHardware } from "./SignalHardware";
import type { Stage6TimeOfDay, Stage6WeatherPresetName } from "./stage6Quality";

export type SignalLayerLightingPreset = "day" | "cloudy" | "rain" | "night";

export function deriveSignalLightingPreset(
  weather: Stage6WeatherPresetName,
  timeOfDay: Stage6TimeOfDay
): SignalLayerLightingPreset {
  if (timeOfDay === "night") return "night";
  if (weather === "rain") return "rain";
  if (weather === "cloudy") return "cloudy";
  return "day";
}

function SignalLayerComponent({
  signals,
  lightingPreset
}: {
  signals: SceneSnapshot["signals"];
  lightingPreset: SignalLayerLightingPreset;
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
