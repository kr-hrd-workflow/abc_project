"use client";

import type { Direction } from "../../lib/types";
import type { SceneSnapshot } from "./buildSceneSnapshot";
import type { Vector3Tuple } from "./roadGeometry";
import { STAGE5_SHADOWS_ENABLED } from "./shadowPolicy";

export type SignalHardwareLightingPreset = "day" | "cloudy" | "rain" | "night";

type SignalHardwareProps = {
  signals: SceneSnapshot["signals"];
  lightingPreset?: SignalHardwareLightingPreset;
};

type SignalPlacement = {
  position: Vector3Tuple;
  rotationY: number;
};

const SIGNAL_PLACEMENTS: Record<Direction, SignalPlacement> = {
  north: { position: [-13.5, 5.2, -19.5], rotationY: Math.PI },
  south: { position: [13.5, 5.2, 19.5], rotationY: 0 },
  east: { position: [19.5, 5.2, -13.5], rotationY: Math.PI / 2 },
  west: { position: [-19.5, 5.2, 13.5], rotationY: -Math.PI / 2 }
};

const LENS_OFF = "#1b2427";
const LENS_COLORS = {
  red: "#ff3b30",
  yellow: "#ffd34d",
  green: "#35f090"
} as const;
const SIGNAL_MATERIALS = {
  pole: {
    color: "#2c383d",
    roughness: 0.64,
    metalness: 0.34,
    envMapIntensity: 0.72
  },
  housing: {
    color: "#10171c",
    roughness: 0.48,
    metalness: 0.42,
    envMapIntensity: 0.82
  },
  hood: {
    color: "#0a1014",
    roughness: 0.56,
    metalness: 0.32,
    envMapIntensity: 0.5
  },
  lensGlass: {
    roughness: 0.16,
    metalness: 0.01,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 1.08
  }
} as const;
const SIGNAL_LENS_EMISSIVE_SCALE_BY_PRESET = {
  day: 0.78,
  cloudy: 0.96,
  rain: 1.18,
  night: 1.45
} as const satisfies Record<SignalHardwareLightingPreset, number>;
const ACTIVE_SIGNAL_HARDWARE_LIGHTING_PRESET: SignalHardwareLightingPreset =
  "rain";

export function SignalHardware({
  signals,
  lightingPreset = ACTIVE_SIGNAL_HARDWARE_LIGHTING_PRESET
}: SignalHardwareProps) {
  const uniqueSignals = getSignalsByDirection(signals);
  const lensEmissiveScale = SIGNAL_LENS_EMISSIVE_SCALE_BY_PRESET[lightingPreset];

  if (uniqueSignals.length === 0) {
    return null;
  }

  return (
    <group
      name="stage6b-signal-hardware"
      userData={{
        signalStateSource: "SceneSnapshot.signals",
        realSignalControlClaim: false,
        lightingPreset,
        lensEmissiveScale
      }}
    >
      {uniqueSignals.map((signal) => {
        const placement = SIGNAL_PLACEMENTS[signal.direction];

        return (
          <group
            key={signal.direction}
            name={`signal-head-${signal.direction}-${signal.state}`}
            position={placement.position}
            rotation-y={placement.rotationY}
          >
            <mesh
              position={[0, -2.4, 0]}
              castShadow={STAGE5_SHADOWS_ENABLED}
              receiveShadow
            >
              <cylinderGeometry args={[0.09, 0.13, 5.1, 10]} />
              <meshStandardMaterial {...SIGNAL_MATERIALS.pole} />
            </mesh>
            <mesh
              name={`signal-housing-${signal.direction}`}
              position={[0, 0.28, 0]}
              castShadow={STAGE5_SHADOWS_ENABLED}
              receiveShadow
            >
              <boxGeometry args={[0.92, 1.72, 0.42]} />
              <meshStandardMaterial {...SIGNAL_MATERIALS.housing} />
            </mesh>
            {(["red", "yellow", "green"] as const).map((state, index) => {
              const active = signal.state === state;

              return (
                <group
                  key={state}
                  name={`signal-lens-assembly-${signal.direction}-${state}`}
                  position={[0, 0.82 - index * 0.54, -0.24]}
                >
                  <mesh
                    name={`signal-hood-${signal.direction}-${state}`}
                    position={[0, 0.08, -0.08]}
                    castShadow={STAGE5_SHADOWS_ENABLED}
                  >
                    <boxGeometry args={[0.52, 0.14, 0.34]} />
                    <meshStandardMaterial {...SIGNAL_MATERIALS.hood} />
                  </mesh>
                  <mesh name={`signal-lens-glass-${signal.direction}-${state}`}>
                    <sphereGeometry args={[0.19, 18, 12]} />
                    <meshStandardMaterial
                      {...SIGNAL_MATERIALS.lensGlass}
                      color={active ? LENS_COLORS[state] : LENS_OFF}
                    />
                  </mesh>
                  <mesh
                    name={`signal-emissive-core-${signal.direction}-${state}`}
                    position={[0, 0, -0.018]}
                    userData={{
                      signalStateSource: "SceneSnapshot.signals",
                      signalState: signal.state,
                      lensState: state,
                      active,
                      bloomEligible: active,
                      amberBloomEligible: active && state === "yellow",
                      realSignalControlClaim: false
                    }}
                  >
                    <sphereGeometry args={[0.115, 16, 10]} />
                    <meshStandardMaterial
                      color={active ? LENS_COLORS[state] : "#10181b"}
                      emissive={active ? LENS_COLORS[state] : "#000000"}
                      emissiveIntensity={active ? 2.15 * lensEmissiveScale : 0}
                      roughness={active ? 0.12 : 0.5}
                      metalness={0}
                      envMapIntensity={active ? 1.28 : 0.2}
                      toneMapped={!active}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

function getSignalsByDirection(signals: SceneSnapshot["signals"]) {
  const byDirection = new Map<Direction, SceneSnapshot["signals"][number]>();

  for (const signal of signals) {
    if (!byDirection.has(signal.direction)) {
      byDirection.set(signal.direction, signal);
    }
  }

  return Array.from(byDirection.values()).sort((left, right) =>
    left.direction.localeCompare(right.direction)
  );
}
