"use client";

import type { Direction } from "../../lib/types";
import type { SceneSnapshot } from "./buildSceneSnapshot";
import type { Vector3Tuple } from "./roadGeometry";
import { STAGE5_SHADOWS_ENABLED } from "./shadowPolicy";

type SignalHardwareProps = {
  signals: SceneSnapshot["signals"];
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

export function SignalHardware({ signals }: SignalHardwareProps) {
  const uniqueSignals = getSignalsByDirection(signals);

  if (uniqueSignals.length === 0) {
    return null;
  }

  return (
    <group name="stage6b-signal-hardware">
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
              <meshStandardMaterial
                color="#2c383d"
                roughness={0.64}
                metalness={0.34}
                envMapIntensity={0.72}
              />
            </mesh>
            <mesh
              position={[0, 0.28, 0]}
              castShadow={STAGE5_SHADOWS_ENABLED}
              receiveShadow
            >
              <boxGeometry args={[0.92, 1.72, 0.42]} />
              <meshStandardMaterial
                color="#10171c"
                roughness={0.48}
                metalness={0.42}
                envMapIntensity={0.82}
              />
            </mesh>
            {(["red", "yellow", "green"] as const).map((state, index) => {
              const active = signal.state === state;

              return (
                <mesh key={state} position={[0, 0.82 - index * 0.54, -0.24]}>
                  <sphereGeometry args={[0.18, 18, 12]} />
                  <meshStandardMaterial
                    color={active ? LENS_COLORS[state] : LENS_OFF}
                    emissive={active ? LENS_COLORS[state] : "#000000"}
                    emissiveIntensity={active ? 2.1 : 0.02}
                    roughness={active ? 0.18 : 0.46}
                    metalness={0.02}
                    envMapIntensity={active ? 1.15 : 0.28}
                    toneMapped={!active}
                  />
                </mesh>
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
