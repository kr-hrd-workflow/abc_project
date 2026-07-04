import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  type Texture
} from "three";

import {
  SIGNAL_ACCENT_LIGHTS,
  STAGE5_LIGHT_COLORS,
  STREETLIGHT_POOLS,
  VEHICLE_EMISSIVE_ACCENTS,
  buildStage6SignalAccentLights,
  type Stage6SignalAccentSignal
} from "./LightingRig";
import { RainParticleLayer } from "./RainParticleLayer";
import { ROAD_WIDTH_METERS } from "./roadGeometry";
import type { Vector3Tuple } from "./roadGeometry";
import type { Stage6QualityPreset } from "./stage6Quality";
import type { Stage6WeatherPresetName } from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

export type WetRoadHighlightSource =
  | "streetlight"
  | "signal"
  | "headlight"
  | "taillight";

export type WetRoadHighlightSpec = {
  id: string;
  source: WetRoadHighlightSource;
  position: Vector3Tuple;
  size: [number, number];
  rotationY: number;
  color: string;
  opacity: number;
};

export type HazePlaneSpec = {
  id: string;
  position: Vector3Tuple;
  rotation: [number, number, number];
  size: [number, number];
  opacity: number;
};

export const STAGE5_ATMOSPHERE = {
  background: "#17242b",
  fog: "#23343c",
  fogNear: 28,
  fogFar: 170,
  haze: "#5d7378"
} as const;

// Clear/cloudy daytime aerial perspective: a light sky-toned haze fog (matches
// the GradientSky horizon + BuildingLayer's DISTANT_HAZE_TONE) with a pushed-out
// near plane so the near/mid intersection stays crisp while the distant ring and
// the far road/ground edges wash toward the sky — no dark navy cut-outs, no hard
// white periphery edge — at high operator/CCTV orbit angles. Rain keeps the
// darker STAGE5 mist above (weather === "rain"); night never mounts fog
// (WeatherAndAtmosphere is sceneryless at night), so both stay untouched.
export const DAY_HAZE_ATMOSPHERE = {
  // Soft daytime haze tone (a blue-grey with body, matched to the GradientSky
  // horizon + BuildingLayer DISTANT_HAZE_TONE) that the far field converges to.
  // Deliberately NOT near-white: a blown-white periphery read as a blank void,
  // and NOT dark: a dark tone read as navy cut-outs. Background carries the same
  // tone so the frame corners — where the high camera looks past the far edge of
  // the sky dome (clipped to the clear colour) — read as hazy sky.
  background: "#b9c7d6",
  fog: "#b9c7d6",
  fogNear: 130,
  fogFar: 340
} as const;

function resolveDayAtmosphere(weather: Stage6WeatherPresetName) {
  return weather === "rain" ? STAGE5_ATMOSPHERE : DAY_HAZE_ATMOSPHERE;
}

const REFLECTION_TINTS = {
  streetlight: "#ffb24a",
  headlight: "#ffc65a",
  taillight: "#b14438"
} as const;

const ROAD_EDGE_REFLECTION_OFFSET = ROAD_WIDTH_METERS / 2 - 2.8;
const ROAD_SURFACE_OVERLAY_Y = 0.046;
const HAZE_HEIGHT = 7.2;

export const WET_ROAD_REFLECTION_HIGHLIGHTS: WetRoadHighlightSpec[] = [
  ...STREETLIGHT_POOLS.map((light): WetRoadHighlightSpec => {
    const onNorthSouthCorridor = Math.abs(light.position[2]) > Math.abs(light.position[0]);
    const reflectionX = light.position[0] < 0
      ? -ROAD_EDGE_REFLECTION_OFFSET
      : ROAD_EDGE_REFLECTION_OFFSET;
    const reflectionZ = light.position[2] < 0
      ? -ROAD_EDGE_REFLECTION_OFFSET
      : ROAD_EDGE_REFLECTION_OFFSET;

    return {
      id: `${light.id}-wet-road-reflection`,
      source: "streetlight",
      position: onNorthSouthCorridor
        ? [reflectionX, ROAD_SURFACE_OVERLAY_Y, light.position[2]]
        : [light.position[0], ROAD_SURFACE_OVERLAY_Y, reflectionZ],
      size: onNorthSouthCorridor ? [7.6, 38] : [38, 7.6],
      rotationY: 0,
      color: REFLECTION_TINTS.streetlight,
      opacity: 0.68
    };
  }),
  ...SIGNAL_ACCENT_LIGHTS.map((light): WetRoadHighlightSpec => ({
    id: `${light.id}-wet-road-reflection`,
    source: "signal",
    position: [light.position[0], ROAD_SURFACE_OVERLAY_Y + 0.002, light.position[2]],
    size: Math.abs(light.position[2]) > Math.abs(light.position[0])
      ? [3.6, 10]
      : [10, 3.6],
    rotationY: 0,
    color: light.color,
    opacity: 0.25
  })),
  ...VEHICLE_EMISSIVE_ACCENTS.map((light): WetRoadHighlightSpec => ({
    id: `${light.id}-wet-road-reflection`,
    source: light.kind,
    position: [light.position[0], ROAD_SURFACE_OVERLAY_Y + 0.004, light.position[2]],
    size: light.kind === "headlight" ? [2.4, 22] : [1.6, 8.5],
    rotationY: light.rotationY,
    color: light.kind === "headlight"
      ? REFLECTION_TINTS.headlight
      : REFLECTION_TINTS.taillight,
    opacity: light.kind === "headlight" ? 0.72 : 0.34
  }))
];

export const HAZE_PLANES: HazePlaneSpec[] = [
  {
    id: "north-corridor-depth-haze",
    position: [0, HAZE_HEIGHT, -118],
    rotation: [0, 0, 0],
    size: [82, 42],
    opacity: 0.075
  },
  {
    id: "south-corridor-depth-haze",
    position: [0, HAZE_HEIGHT, 105],
    rotation: [0, Math.PI, 0],
    size: [78, 40],
    opacity: 0.06
  },
  // east-corridor-depth-haze removed 2026-07-04 (task 6 codex A/B): it read as a
  // floating gray slab across the east road from the operator camera.
  {
    id: "west-corridor-depth-haze",
    position: [-112, HAZE_HEIGHT, 0],
    rotation: [0, -Math.PI / 2, 0],
    size: [76, 38],
    opacity: 0.055
  }
];

function buildSignalWetRoadReflectionHighlights(
  signals: readonly Stage6SignalAccentSignal[]
): WetRoadHighlightSpec[] {
  return buildStage6SignalAccentLights(signals).map(
    (light): WetRoadHighlightSpec => ({
      id: `${light.id}-wet-road-reflection`,
      source: "signal",
      position: [light.position[0], ROAD_SURFACE_OVERLAY_Y + 0.002, light.position[2]],
      size: Math.abs(light.position[2]) > Math.abs(light.position[0])
        ? [3.6, 10]
        : [10, 3.6],
      rotationY: 0,
      color: light.color,
      opacity: 0.25
    })
  );
}

export function WeatherAndAtmosphere({
  qualityPreset = getStage6QualityPreset("high"),
  weather = "rain",
  signals = [],
  // sceneryless: mount only the weather treatment (rain streaks + wet-road
  // glow), NOT the day scenery (scene background colour, fog, distant-city
  // backdrop, depth haze). Night reuses this so rain reads as rain at night
  // while the night IBL/neon backdrop stays owned by the building/sky layer.
  sceneryless = false
}: {
  qualityPreset?: Stage6QualityPreset;
  weather?: Stage6WeatherPresetName;
  signals?: readonly Stage6SignalAccentSignal[];
  sceneryless?: boolean;
}) {
  const reflectionFalloffTexture = useSoftReflectionTexture();
  const hazeFalloffTexture = useSoftHazeTexture();
  const wetRoadReflectionHighlights = useMemo(
    () => [
      ...WET_ROAD_REFLECTION_HIGHLIGHTS,
      ...buildSignalWetRoadReflectionHighlights(signals)
    ],
    [signals]
  );

  return (
    <group name="stage5-weather-and-atmosphere">
      {!sceneryless && (
        <>
          <color attach="background" args={[resolveDayAtmosphere(weather).background]} />
          <fog
            attach="fog"
            args={[
              resolveDayAtmosphere(weather).fog,
              resolveDayAtmosphere(weather).fogNear,
              resolveDayAtmosphere(weather).fogFar
            ]}
          />

          {/* 2026-07-04 codex A/B (task 6): the north painted-skyline backdrop
              plane read as a DOUBLE-SKYLINE artifact over the real distant
              building boxes (now vertex-tinted in BuildingLayer), so it was
              removed. The east depth-haze card read as a floating gray slab
              across the east road (operator-camera complaint) — also removed.
              North/south/west corridor haze kept. */}
          {HAZE_PLANES.map((haze) => (
            <mesh
              key={haze.id}
              name={haze.id}
              position={haze.position}
              rotation={haze.rotation}
              renderOrder={1}
            >
              <planeGeometry args={haze.size} />
              <meshBasicMaterial
                color={STAGE5_ATMOSPHERE.haze}
                map={hazeFalloffTexture}
                transparent
                opacity={haze.opacity}
                depthWrite={false}
                side={DoubleSide}
              />
            </mesh>
          ))}
        </>
      )}

      <RainParticleLayer qualityPreset={qualityPreset} weather={weather} />

      {weather === "rain" &&
        wetRoadReflectionHighlights.map((highlight) => (
        <mesh
          key={highlight.id}
          name={highlight.id}
          position={highlight.position}
          rotation={[-Math.PI / 2, highlight.rotationY, 0]}
          renderOrder={2}
        >
          <planeGeometry args={highlight.size} />
          <meshBasicMaterial
            color={highlight.color}
            map={reflectionFalloffTexture}
            transparent
            opacity={highlight.opacity}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function useSoftReflectionTexture() {
  return useGeneratedTexture(createSoftReflectionCanvas);
}

function useSoftHazeTexture() {
  return useGeneratedTexture(createSoftHazeCanvas);
}

function useGeneratedTexture(createCanvas: () => HTMLCanvasElement | null) {
  const texture = useMemo<Texture | undefined>(() => {
    const canvas = createCanvas();
    if (!canvas) return undefined;

    const generatedTexture = new CanvasTexture(canvas);
    generatedTexture.minFilter = LinearFilter;
    generatedTexture.magFilter = LinearFilter;
    generatedTexture.needsUpdate = true;

    return generatedTexture;
  }, [createCanvas]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  return texture;
}

function createSoftReflectionCanvas() {
  if (!canUseBrowserCanvas()) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const image = context.createImageData(canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const u = (x / (canvas.width - 1)) * 2 - 1;
      const v = (y / (canvas.height - 1)) * 2 - 1;
      const lateralFalloff = Math.max(0, 1 - Math.abs(u) ** 1.55);
      const longitudinalFalloff = Math.max(0, 1 - Math.abs(v) ** 1.9);
      const alpha = Math.round(255 * lateralFalloff * longitudinalFalloff);
      const offset = (y * canvas.width + x) * 4;

      image.data[offset] = 255;
      image.data[offset + 1] = 255;
      image.data[offset + 2] = 255;
      image.data[offset + 3] = alpha;
    }
  }

  context.putImageData(image, 0, 0);
  return canvas;
}

function createSoftHazeCanvas() {
  if (!canUseBrowserCanvas()) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const image = context.createImageData(canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const u = (x / (canvas.width - 1)) * 2 - 1;
      const vertical = y / (canvas.height - 1);
      const lateralFalloff = Math.max(0, 1 - Math.abs(u) ** 2.2);
      const groundLift = Math.max(0, 1 - Math.abs(vertical - 0.72) / 0.72);
      const topFade = Math.max(0, 1 - vertical ** 2.4 * 0.55);
      const alpha = Math.round(255 * lateralFalloff * groundLift * topFade);
      const offset = (y * canvas.width + x) * 4;

      image.data[offset] = 255;
      image.data[offset + 1] = 255;
      image.data[offset + 2] = 255;
      image.data[offset + 3] = alpha;
    }
  }

  context.putImageData(image, 0, 0);
  return canvas;
}

function canUseBrowserCanvas() {
  return (
    typeof document !== "undefined" &&
    typeof window !== "undefined" &&
    !/jsdom/i.test(window.navigator.userAgent)
  );
}
