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
  VEHICLE_EMISSIVE_ACCENTS
} from "./LightingRig";
import { ROAD_WIDTH_METERS } from "./roadGeometry";
import type { Vector3Tuple } from "./roadGeometry";

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

export type DistantCityBackdropSpec = {
  id: string;
  position: Vector3Tuple;
  size: [number, number];
  color: string;
  opacity: number;
};

export const STAGE5_ATMOSPHERE = {
  background: "#172126",
  fog: "#28343a",
  fogNear: 52,
  fogFar: 300,
  haze: "#b9c4bf"
} as const;

const REFLECTION_TINTS = {
  streetlight: "#ffd9a4",
  headlight: "#fff7e8",
  taillight: "#b14438"
} as const;

const ROAD_EDGE_REFLECTION_OFFSET = ROAD_WIDTH_METERS / 2 - 2.8;
const ROAD_SURFACE_OVERLAY_Y = 0.046;
const HAZE_HEIGHT = 7.2;

const DISTANT_CITY_BACKDROP: DistantCityBackdropSpec = {
  id: "north-distant-city-depth-backdrop",
  position: [0, 42, -210],
  size: [360, 120],
  color: "#2d3a40",
  opacity: 0.74
};

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
      size: onNorthSouthCorridor ? [5.6, 30] : [30, 5.6],
      rotationY: 0,
      color: REFLECTION_TINTS.streetlight,
      opacity: 0.42
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
    opacity: light.kind === "headlight" ? 0.55 : 0.28
  }))
];

export const HAZE_PLANES: HazePlaneSpec[] = [
  {
    id: "north-corridor-depth-haze",
    position: [0, HAZE_HEIGHT, -118],
    rotation: [0, 0, 0],
    size: [82, 42],
    opacity: 0.16
  },
  {
    id: "south-corridor-depth-haze",
    position: [0, HAZE_HEIGHT, 105],
    rotation: [0, Math.PI, 0],
    size: [78, 40],
    opacity: 0.125
  },
  {
    id: "east-corridor-depth-haze",
    position: [118, HAZE_HEIGHT, 0],
    rotation: [0, Math.PI / 2, 0],
    size: [76, 38],
    opacity: 0.115
  },
  {
    id: "west-corridor-depth-haze",
    position: [-112, HAZE_HEIGHT, 0],
    rotation: [0, -Math.PI / 2, 0],
    size: [76, 38],
    opacity: 0.12
  }
];

export function WeatherAndAtmosphere() {
  const reflectionFalloffTexture = useSoftReflectionTexture();
  const hazeFalloffTexture = useSoftHazeTexture();
  const distantCityTexture = useDistantCityTexture();

  return (
    <group name="stage5-weather-and-atmosphere">
      <color attach="background" args={[STAGE5_ATMOSPHERE.background]} />
      <fog
        attach="fog"
        args={[
          STAGE5_ATMOSPHERE.fog,
          STAGE5_ATMOSPHERE.fogNear,
          STAGE5_ATMOSPHERE.fogFar
        ]}
      />

      <mesh
        name={DISTANT_CITY_BACKDROP.id}
        position={DISTANT_CITY_BACKDROP.position}
        renderOrder={-1}
      >
        <planeGeometry args={DISTANT_CITY_BACKDROP.size} />
        <meshBasicMaterial
          color="#ffffff"
          map={distantCityTexture}
          transparent
          opacity={DISTANT_CITY_BACKDROP.opacity}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>

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

      {WET_ROAD_REFLECTION_HIGHLIGHTS.map((highlight) => (
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

function useDistantCityTexture() {
  return useGeneratedTexture(createDistantCityCanvas);
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

function createDistantCityCanvas() {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const skyGradient = context.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "rgba(74, 94, 104, 0)");
  skyGradient.addColorStop(0.18, "rgba(74, 94, 104, 0.46)");
  skyGradient.addColorStop(0.56, "rgba(48, 66, 74, 0.44)");
  skyGradient.addColorStop(1, "rgba(18, 27, 32, 0)");
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const buildings = [
    { x: 12, width: 42, height: 82 },
    { x: 62, width: 58, height: 112 },
    { x: 132, width: 38, height: 74 },
    { x: 178, width: 64, height: 128 },
    { x: 254, width: 52, height: 96 },
    { x: 318, width: 44, height: 118 },
    { x: 374, width: 72, height: 88 },
    { x: 456, width: 44, height: 108 }
  ];

  buildings.forEach((building, buildingIndex) => {
    const y = canvas.height - building.height;
    context.fillStyle =
      buildingIndex % 2 === 0
        ? "rgba(18, 27, 32, 0.62)"
        : "rgba(24, 35, 40, 0.58)";
    context.fillRect(building.x, y, building.width, building.height);

    for (let row = 0; row < Math.floor(building.height / 11); row += 1) {
      for (let column = 0; column < Math.floor(building.width / 10); column += 1) {
        const lit = (row * 5 + column * 3 + buildingIndex) % 4 !== 0;
        if (!lit) continue;

        const windowX = building.x + 6 + column * 10;
        const windowY = y + 8 + row * 11;
        const warm = (row + buildingIndex) % 3 !== 0;
        context.fillStyle = warm
          ? "rgba(255, 232, 184, 0.86)"
          : "rgba(188, 228, 248, 0.78)";
        context.fillRect(windowX, windowY, 4, 2);
      }
    }
  });

  const hazeGradient = context.createLinearGradient(0, 0, 0, canvas.height);
  hazeGradient.addColorStop(0, "rgba(210, 226, 224, 0)");
  hazeGradient.addColorStop(0.62, "rgba(185, 206, 208, 0.16)");
  hazeGradient.addColorStop(1, "rgba(185, 206, 208, 0)");
  context.fillStyle = hazeGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}

function canUseBrowserCanvas() {
  return (
    typeof document !== "undefined" &&
    typeof window !== "undefined" &&
    !/jsdom/i.test(window.navigator.userAgent)
  );
}
