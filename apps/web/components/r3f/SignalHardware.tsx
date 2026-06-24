"use client";

import { useEffect, useMemo } from "react";
import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  SRGBColorSpace
} from "three";

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
type SignalSnapshot = SceneSnapshot["signals"][number];
type SignalAssemblyVariant = "standard" | "proof_foreground";

const SIGNAL_PLACEMENTS: Record<Direction, SignalPlacement> = {
  north: { position: [-13.5, 5.2, -19.5], rotationY: Math.PI },
  south: { position: [13.5, 5.2, 19.5], rotationY: 0 },
  east: { position: [19.5, 5.2, -13.5], rotationY: Math.PI / 2 },
  west: { position: [-19.5, 5.2, 13.5], rotationY: -Math.PI / 2 }
};

const LENS_OFF = "#172024";
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
const SEOUL_FOREGROUND_PROOF_SIGNAL = {
  direction: "west" as Direction,
  faceMeters: [3.65, 1.78] as [number, number],
  position: [-19.2, 5.35, 14.2] as Vector3Tuple,
  rotationY: Math.PI / 3,
  hangulLabelPlacement: "signal_face_texture" as const,
  signalStateSource: "SceneSnapshot.signals" as const,
  visibilityTier: "proof_foreground" as const
};

export const SEOUL_SIGNAL_HARDWARE_CUES = {
  horizontalOverheadHeads: true,
  pedestrianSignalBoxes: true,
  blackBackplates: true,
  hangulSafetyPlaques: ["보행신호", "정지선"],
  maxDrawCallMeshesPerDirection: 3,
  canvasFaceMeters: [3.35, 1.7],
  foregroundProofSignal: SEOUL_FOREGROUND_PROOF_SIGNAL
} as const;

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
        lensEmissiveScale,
        ...SEOUL_SIGNAL_HARDWARE_CUES
      }}
    >
      {uniqueSignals.map((signal) => {
        const placement = SIGNAL_PLACEMENTS[signal.direction];

        return (
          <SeoulSignalHardwareAssembly
            key={signal.direction}
            lensEmissiveScale={lensEmissiveScale}
            placement={placement}
            signal={signal}
          />
        );
      })}
      <SeoulSignalHardwareAssembly
        faceMeters={SEOUL_SIGNAL_HARDWARE_CUES.foregroundProofSignal.faceMeters}
        key="foreground-proof-seoul-signal"
        lensEmissiveScale={lensEmissiveScale}
        placement={SEOUL_SIGNAL_HARDWARE_CUES.foregroundProofSignal}
        signal={getForegroundProofSignal(uniqueSignals)}
        variant="proof_foreground"
      />
    </group>
  );
}

function SeoulSignalHardwareAssembly({
  faceMeters = SEOUL_SIGNAL_HARDWARE_CUES.canvasFaceMeters,
  lensEmissiveScale,
  placement,
  signal,
  variant = "standard"
}: {
  faceMeters?: readonly [number, number];
  lensEmissiveScale: number;
  placement: SignalPlacement;
  signal: SignalSnapshot;
  variant?: SignalAssemblyVariant;
}) {
  const faceTexture = useSeoulSignalFaceTexture(signal, lensEmissiveScale);
  const isProofForeground = variant === "proof_foreground";
  const nameSuffix = isProofForeground
    ? `foreground-${signal.direction}`
    : signal.direction;
  const facePosition: Vector3Tuple = isProofForeground
    ? [1.96, 0.52, -0.42]
    : [1.84, 0.48, -0.42];
  const mastArmPosition: Vector3Tuple = isProofForeground
    ? [1.16, 1.02, -0.02]
    : [0.95, 1.02, -0.02];
  const mastArmScale: Vector3Tuple = isProofForeground
    ? [3.1, 0.08, 0.08]
    : [2.78, 0.075, 0.075];

  return (
    <group
      name={`seoul-signal-head-${nameSuffix}-${signal.state}`}
      position={placement.position}
      rotation-y={placement.rotationY}
      userData={{
        ...SEOUL_SIGNAL_HARDWARE_CUES,
        signalStateSource: "SceneSnapshot.signals",
        signalState: signal.state,
        realSignalControlClaim: false,
        visibilityTier: isProofForeground ? "proof_foreground" : "background"
      }}
    >
      <mesh
        name={`seoul-signal-pole-${nameSuffix}`}
        position={[0, -2.42, 0]}
        castShadow={STAGE5_SHADOWS_ENABLED}
        receiveShadow
      >
        <cylinderGeometry args={[0.09, 0.13, 5.05, 10]} />
        <meshStandardMaterial {...SIGNAL_MATERIALS.pole} />
      </mesh>
      <mesh
        name={`seoul-signal-mast-arm-${nameSuffix}`}
        position={mastArmPosition}
        scale={mastArmScale}
        castShadow={STAGE5_SHADOWS_ENABLED}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial {...SIGNAL_MATERIALS.pole} />
      </mesh>
      <mesh
        name={`seoul-signal-canvas-face-${nameSuffix}`}
        position={facePosition}
        userData={{
          signalStateSource: "SceneSnapshot.signals",
          signalState: signal.state,
          realSignalControlClaim: false,
          hangulSafetyPlaques: SEOUL_SIGNAL_HARDWARE_CUES.hangulSafetyPlaques,
          visibilityTier: isProofForeground ? "proof_foreground" : "background"
        }}
      >
        <planeGeometry args={faceMeters} />
        <meshBasicMaterial
          color={faceTexture ? "#ffffff" : SIGNAL_MATERIALS.housing.color}
          map={faceTexture ?? undefined}
          side={DoubleSide}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
}

function useSeoulSignalFaceTexture(
  signal: SignalSnapshot,
  lensEmissiveScale: number
) {
  const texture = useMemo(() => {
    if (typeof document === "undefined" || isJsdomRuntime()) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 416;
    const context = canvas.getContext("2d");

    if (!context) return null;

    drawRoundedRect(context, 22, 24, 724, 368, 34, "#0b1216");
    drawRoundedRect(context, 50, 54, 492, 154, 42, "#10191e");
    drawRoundedRect(context, 568, 54, 130, 218, 24, "#111a1f");

    (["red", "yellow", "green"] as const).forEach((state, index) => {
      const active = signal.state === state;
      const color = active ? LENS_COLORS[state] : LENS_OFF;
      drawSignalLens(
        context,
        128 + index * 158,
        132,
        48,
        color,
        active ? lensEmissiveScale : 0
      );
    });

    const pedestrianGreen = signal.state === "green";
    drawSignalLens(
      context,
      633,
      116,
      28,
      pedestrianGreen ? LENS_OFF : LENS_COLORS.red,
      pedestrianGreen ? 0 : lensEmissiveScale
    );
    drawSignalLens(
      context,
      633,
      178,
      28,
      pedestrianGreen ? LENS_COLORS.green : LENS_OFF,
      pedestrianGreen ? lensEmissiveScale : 0
    );

    context.font =
      "800 42px 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#effaf0";
    context.strokeStyle = "rgba(0,0,0,0.72)";
    context.lineWidth = 7;
    context.strokeText("보행신호", 633, 247);
    context.fillText("보행신호", 633, 247);

    context.font =
      "900 54px 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
    context.fillStyle = "#f5edca";
    context.strokeText("정지선", 296, 298);
    context.fillText("정지선", 296, 298);

    const nextTexture = new CanvasTexture(canvas);
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.anisotropy = 8;
    nextTexture.minFilter = LinearFilter;
    nextTexture.magFilter = LinearFilter;
    nextTexture.needsUpdate = true;

    return nextTexture;
  }, [lensEmissiveScale, signal.state]);

  useEffect(
    () => () => {
      texture?.dispose();
    },
    [texture]
  );

  return texture;
}

function drawSignalLens(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  emissiveScale: number
) {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = emissiveScale > 0 ? 22 * emissiveScale : 0;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.strokeStyle = "#05090c";
  context.lineWidth = 10;
  context.beginPath();
  context.arc(x, y, radius + 7, 0, Math.PI * 2);
  context.stroke();
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string
) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.fill();
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

function getForegroundProofSignal(signals: SceneSnapshot["signals"]) {
  return (
    signals.find(
      (signal) =>
        signal.direction ===
        SEOUL_SIGNAL_HARDWARE_CUES.foregroundProofSignal.direction
    ) ?? signals[0]
  );
}

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" &&
    /jsdom/i.test(window.navigator.userAgent)
  );
}
