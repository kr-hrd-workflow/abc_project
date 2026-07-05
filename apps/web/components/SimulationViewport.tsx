"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import {
  SimulationViewportFallback,
  type SimulationViewportProps
} from "./SimulationViewportFallback";
import { supportsWebGL } from "./r3f/webglSupport";

const R3FSimulationViewport = dynamic(
  () => import("./r3f/R3FSimulationViewport").then((mod) => mod.R3FSimulationViewport),
  { ssr: false }
);

export function SimulationViewport(props: SimulationViewportProps) {
  const genericStreamUrl = process.env.NEXT_PUBLIC_SIMULATION_STREAM_URL?.trim();
  const legacyStreamUrl = process.env.NEXT_PUBLIC_UNITY_WEBGL_URL?.trim();
  const simulationStreamUrl = genericStreamUrl || legacyStreamUrl;
  const r3fEnabled = process.env.NEXT_PUBLIC_R3F_SIMULATION_ENABLED === "true";
  const [webglSupported, setWebglSupported] = useState(false);
  const [webglChecked, setWebglChecked] = useState(false);

  useEffect(() => {
    if (!r3fEnabled || simulationStreamUrl) {
      setWebglSupported(false);
      setWebglChecked(true);
      return;
    }

    setWebglSupported(supportsWebGL());
    setWebglChecked(true);
  }, [r3fEnabled, simulationStreamUrl]);

  if (simulationStreamUrl) {
    return (
      <SimulationViewportFallback
        {...props}
        simulationStreamUrl={simulationStreamUrl}
        renderMode={genericStreamUrl ? "hosted_stream" : "legacy_stream"}
      />
    );
  }

  if (r3fEnabled && webglChecked && webglSupported) {
    return <R3FSimulationViewport {...props} />;
  }

  return <SimulationViewportFallback {...props} renderMode="digital_twin_fallback" />;
}
