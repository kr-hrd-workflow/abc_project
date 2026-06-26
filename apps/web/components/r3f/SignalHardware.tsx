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
// Real Seoul vehicle head (가로형 4색등), left -> right on a black backplate:
// RED | YELLOW | GREEN-LEFT-ARROW | GREEN(circular). SUMO truth only carries
// red/yellow/green, so the protected-left arrow aspect has no truth phase and
// stays unlit (litWhen: null); signal.state still drives which lens glows.
const VEHICLE_SIGNAL_ASPECTS = [
  { color: "red", litWhen: "red", glyph: "circle" },
  { color: "yellow", litWhen: "yellow", glyph: "circle" },
  { color: "green", litWhen: null, glyph: "arrowLeft" },
  { color: "green", litWhen: "green", glyph: "circle" }
] as const satisfies ReadonlyArray<{
  color: keyof typeof LENS_COLORS;
  litWhen: SignalSnapshot["state"] | null;
  glyph: "circle" | "arrowLeft";
}>;
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
  vehicleAspectLayout: "horizontal_4_red_yellow_greenleft_green",
  hangulSafetyPlaques: ["보행신호", "정지선"],
  maxDrawCallMeshesPerDirection: 3,
  canvasFaceMeters: [3.6, 1.7],
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
  // The group is rotated by placement.rotationY so the face-plane normal (+Z)
  // already points back at the oncoming inbound traffic. Cantilever the mast arm
  // and head out over the roadway along local -X so the head hangs above the
  // inbound stop line instead of behind the roadside pole.
  const mastArmReach = isProofForeground ? 5.2 : 8.5;
  const mastArmPosition: Vector3Tuple = [-mastArmReach / 2, 0.12, 0];
  const mastArmScale: Vector3Tuple = [mastArmReach, 0.12, 0.12];
  const facePosition: Vector3Tuple = [-(mastArmReach - 0.3), -0.52, 0];

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
    canvas.width = 880;
    canvas.height = 416;
    const context = canvas.getContext("2d");

    if (!context) return null;

    // Wide horizontal 4-aspect vehicle head on its own black backplate.
    const headX = 28;
    const headY = 36;
    const headW = 612;
    const headH = 188;
    drawRoundedRect(context, headX, headY, headW, headH, 30, "#0a1014");

    // Pedestrian 2-aspect box (red over green) on a separate black backplate.
    const pedX = 668;
    const pedY = 36;
    const pedW = 156;
    const pedH = 244;
    drawRoundedRect(context, pedX, pedY, pedW, pedH, 26, "#0c1418");

    const aspectRadius = 62;
    const aspectY = headY + headH / 2;
    const aspectFirstX = headX + 86;
    const aspectGap = (headW - 2 * 86) / (VEHICLE_SIGNAL_ASPECTS.length - 1);

    VEHICLE_SIGNAL_ASPECTS.forEach((aspect, index) => {
      const active = aspect.litWhen !== null && signal.state === aspect.litWhen;
      const color = active ? LENS_COLORS[aspect.color] : LENS_OFF;
      drawSignalLens(
        context,
        aspectFirstX + index * aspectGap,
        aspectY,
        aspectRadius,
        color,
        active ? lensEmissiveScale : 0,
        aspect.glyph
      );
    });

    // Pedestrians walk only while the vehicle approach is stopped at red.
    const pedestrianWalk = signal.state === "red";
    const pedRadius = 44;
    const pedCx = pedX + pedW / 2;
    drawSignalLens(
      context,
      pedCx,
      pedY + 64,
      pedRadius,
      pedestrianWalk ? LENS_OFF : LENS_COLORS.red,
      pedestrianWalk ? 0 : lensEmissiveScale
    );
    drawSignalLens(
      context,
      pedCx,
      pedY + 168,
      pedRadius,
      pedestrianWalk ? LENS_COLORS.green : LENS_OFF,
      pedestrianWalk ? lensEmissiveScale : 0
    );

    context.font =
      "800 38px 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#effaf0";
    context.strokeStyle = "rgba(0,0,0,0.72)";
    context.lineWidth = 7;
    context.strokeText("보행신호", pedCx, pedY + pedH + 36);
    context.fillText("보행신호", pedCx, pedY + pedH + 36);

    context.font =
      "900 60px 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
    context.fillStyle = "#f5edca";
    context.strokeText("정지선", headX + headW / 2, headY + headH + 76);
    context.fillText("정지선", headX + headW / 2, headY + headH + 76);

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
  emissiveScale: number,
  glyph: "circle" | "arrowLeft" = "circle"
) {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = emissiveScale > 0 ? 26 * emissiveScale : 0;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();

  if (glyph === "arrowLeft") {
    drawLeftArrowGlyph(
      context,
      x,
      y,
      radius,
      emissiveScale > 0 ? "#04130b" : "#21503a"
    );
  }

  context.strokeStyle = "#05090c";
  context.lineWidth = 10;
  context.beginPath();
  context.arc(x, y, radius + 7, 0, Math.PI * 2);
  context.stroke();
}

function drawLeftArrowGlyph(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string
) {
  const reach = radius * 0.64;
  const headDepth = reach * 0.7;
  const shaftHalf = reach * 0.3;
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(cx - reach, cy);
  context.lineTo(cx - reach + headDepth, cy - headDepth);
  context.lineTo(cx - reach + headDepth, cy - shaftHalf);
  context.lineTo(cx + reach, cy - shaftHalf);
  context.lineTo(cx + reach, cy + shaftHalf);
  context.lineTo(cx - reach + headDepth, cy + shaftHalf);
  context.lineTo(cx - reach + headDepth, cy + headDepth);
  context.closePath();
  context.fill();
  context.restore();
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
