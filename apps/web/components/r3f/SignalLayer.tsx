"use client";

import { memo } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { SignalHardware } from "./SignalHardware";

function SignalLayerComponent({
  signals
}: {
  signals: SceneSnapshot["signals"];
}) {
  return (
    <group
      name="stage5-signal-layer"
      userData={{
        signalCount: signals.length
      }}
    >
      <SignalHardware signals={signals} />
    </group>
  );
}

export const SignalLayer = memo(SignalLayerComponent);
SignalLayer.displayName = "SignalLayer";
