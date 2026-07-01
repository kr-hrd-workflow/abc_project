import {
  INTERSECTION_BOX_METERS,
  LANE_WIDTH_METERS,
  ROAD_WIDTH_METERS
} from "./roadGeometry";
import type { Direction } from "../../lib/types";
import { STAGE5_SHADOWS_ENABLED } from "./shadowPolicy";
import type { Vector3Tuple } from "./roadGeometry";

export type StreetlightPoolSpec = {
  id: string;
  position: Vector3Tuple;
  color: string;
  intensity: number;
  distance: number;
};

export type SignalAccentLightSpec = {
  id: string;
  position: Vector3Tuple;
  color: string;
  intensity: number;
  distance: number;
};

export type Stage6SignalAccentState = "red" | "yellow" | "green";

export type Stage6SignalAccentSignal = {
  direction: Direction;
  state: Stage6SignalAccentState;
};

export type VehicleEmissiveAccentSpec = {
  id: string;
  kind: "headlight" | "taillight";
  position: Vector3Tuple;
  color: string;
  intensity: number;
  distance: number;
  rotationY: number;
};

export type Stage6LightingPresetName = "day" | "cloudy" | "rain" | "night";

export type Stage6LightingPreset = {
  name: Stage6LightingPresetName;
  environmentIntensity: number;
  pmremBlur: number;
  hemisphereSkyColor: string;
  hemisphereGroundColor: string;
  hemisphereIntensity: number;
  ambientIntensity: number;
  keyLightIntensity: number;
  streetlightIntensityScale: number;
  signalAccentIntensityScale: number;
  signalLensEmissiveScale: number;
  headlightResponseTarget: number;
  fogHazePairing: {
    background: string;
    fog: string;
    fogNear: number;
    fogFar: number;
    haze: string;
    hazeOpacityScale: number;
  };
};

export const STAGE5_LIGHT_COLORS = {
  ambientSky: "#6d8190",
  ambientGround: "#0b0e11",
  coolMoon: "#9fb5c8",
  streetlightWarm: "#ffb24a",
  headlight: "#ffc65a",
  taillight: "#d84838",
  signalRed: "#dc4e40",
  signalAmber: "#efb45f",
  signalGreen: "#78d48d"
} as const;

export const STAGE6_LIGHTING_PRESETS = {
  day: {
    name: "day",
    environmentIntensity: 0.74,
    pmremBlur: 0.018,
    hemisphereSkyColor: "#94abb7",
    hemisphereGroundColor: "#2b3133",
    hemisphereIntensity: 0.72,
    ambientIntensity: 0.18,
    keyLightIntensity: 1.08,
    // Daytime: streetlights OFF. They are night-atmosphere fixtures; at 0.16 they
    // cast warm orange pools that, amplified by the day Bloom, made the carriageway
    // read as a glowing floating strip. Real midday streetlights are dark.
    streetlightIntensityScale: 0,
    signalAccentIntensityScale: 0.52,
    signalLensEmissiveScale: 0.78,
    headlightResponseTarget: 0.34,
    fogHazePairing: {
      background: "#25343a",
      fog: "#516269",
      fogNear: 72,
      fogFar: 320,
      haze: "#cfd8d4",
      hazeOpacityScale: 0.58
    }
  },
  cloudy: {
    name: "cloudy",
    environmentIntensity: 0.82,
    pmremBlur: 0.034,
    hemisphereSkyColor: "#7d939f",
    hemisphereGroundColor: "#151b1f",
    hemisphereIntensity: 0.64,
    ambientIntensity: 0.14,
    keyLightIntensity: 0.72,
    streetlightIntensityScale: 0.44,
    signalAccentIntensityScale: 0.78,
    signalLensEmissiveScale: 0.96,
    headlightResponseTarget: 0.62,
    fogHazePairing: {
      background: "#202d33",
      fog: "#405158",
      fogNear: 56,
      fogFar: 270,
      haze: "#c5d1cf",
      hazeOpacityScale: 0.82
    }
  },
  rain: {
    name: "rain",
    environmentIntensity: 0.62,
    pmremBlur: 0.045,
    hemisphereSkyColor: STAGE5_LIGHT_COLORS.ambientSky,
    hemisphereGroundColor: STAGE5_LIGHT_COLORS.ambientGround,
    hemisphereIntensity: 0.34,
    ambientIntensity: 0.05,
    keyLightIntensity: 0.34,
    streetlightIntensityScale: 1,
    signalAccentIntensityScale: 1,
    signalLensEmissiveScale: 1.18,
    headlightResponseTarget: 1.08,
    fogHazePairing: {
      background: "#1b2930",
      fog: "#26383f",
      fogNear: 30,
      fogFar: 180,
      haze: "#657a7f",
      hazeOpacityScale: 0.48
    }
  },
  night: {
    name: "night",
    environmentIntensity: 0.34,
    pmremBlur: 0.058,
    hemisphereSkyColor: "#33495d",
    hemisphereGroundColor: "#030506",
    hemisphereIntensity: 0.24,
    ambientIntensity: 0.032,
    keyLightIntensity: 0.22,
    streetlightIntensityScale: 1.46,
    signalAccentIntensityScale: 1.24,
    signalLensEmissiveScale: 1.45,
    headlightResponseTarget: 1.36,
    fogHazePairing: {
      background: "#17242b",
      fog: "#23343c",
      fogNear: 28,
      fogFar: 170,
      haze: "#5d7378",
      hazeOpacityScale: 0.5
    }
  }
} as const satisfies Record<Stage6LightingPresetName, Stage6LightingPreset>;

export const STAGE5_ACTIVE_LIGHTING_PRESET: Stage6LightingPresetName = "rain";

const STOP_LINE_OFFSET = INTERSECTION_BOX_METERS / 2 + 1.8;
const STREETLIGHT_HEIGHT = 7.6;
const STREETLIGHT_SIDE_OFFSET = ROAD_WIDTH_METERS / 2 + 4.1;
const SIGNAL_HEIGHT = 4.3;
const SIGNAL_SIDE_OFFSET = ROAD_WIDTH_METERS / 2 + 1.3;
const HEADLIGHT_HEIGHT = 0.76;
const LANE_CENTER = LANE_WIDTH_METERS;

export const STREETLIGHT_POOLS: StreetlightPoolSpec[] = [
  {
    id: "north-west-streetlight-pool",
    position: [-STREETLIGHT_SIDE_OFFSET, STREETLIGHT_HEIGHT, -82],
    color: STAGE5_LIGHT_COLORS.streetlightWarm,
    intensity: 18.2,
    distance: 56
  },
  {
    id: "north-east-streetlight-pool",
    position: [STREETLIGHT_SIDE_OFFSET, STREETLIGHT_HEIGHT, -46],
    color: STAGE5_LIGHT_COLORS.streetlightWarm,
    intensity: 16.9,
    distance: 50
  },
  {
    id: "south-west-streetlight-pool",
    position: [-STREETLIGHT_SIDE_OFFSET, STREETLIGHT_HEIGHT, 42],
    color: STAGE5_LIGHT_COLORS.streetlightWarm,
    intensity: 17.2,
    distance: 50
  },
  {
    id: "south-east-streetlight-pool",
    position: [STREETLIGHT_SIDE_OFFSET, STREETLIGHT_HEIGHT, 84],
    color: STAGE5_LIGHT_COLORS.streetlightWarm,
    intensity: 17.8,
    distance: 54
  },
  {
    id: "east-north-streetlight-pool",
    position: [74, STREETLIGHT_HEIGHT, -STREETLIGHT_SIDE_OFFSET],
    color: STAGE5_LIGHT_COLORS.streetlightWarm,
    intensity: 16.4,
    distance: 50
  },
  {
    id: "west-south-streetlight-pool",
    position: [-76, STREETLIGHT_HEIGHT, STREETLIGHT_SIDE_OFFSET],
    color: STAGE5_LIGHT_COLORS.streetlightWarm,
    intensity: 16.5,
    distance: 50
  }
];

const SIGNAL_ACCENT_LIGHT_PLACEMENTS = {
  north: {
    position: [-SIGNAL_SIDE_OFFSET, SIGNAL_HEIGHT, -STOP_LINE_OFFSET],
    intensity: 3.6,
    distance: 14
  },
  south: {
    position: [SIGNAL_SIDE_OFFSET, SIGNAL_HEIGHT, STOP_LINE_OFFSET],
    intensity: 3.8,
    distance: 15
  },
  east: {
    position: [STOP_LINE_OFFSET, SIGNAL_HEIGHT, -SIGNAL_SIDE_OFFSET],
    intensity: 3.2,
    distance: 13
  },
  west: {
    position: [-STOP_LINE_OFFSET, SIGNAL_HEIGHT, SIGNAL_SIDE_OFFSET],
    intensity: 3.4,
    distance: 13
  }
} as const satisfies Record<
  Direction,
  {
    position: Vector3Tuple;
    intensity: number;
    distance: number;
  }
>;

const SIGNAL_ACCENT_COLORS = {
  red: STAGE5_LIGHT_COLORS.signalRed,
  yellow: STAGE5_LIGHT_COLORS.signalAmber,
  green: STAGE5_LIGHT_COLORS.signalGreen
} as const satisfies Record<Stage6SignalAccentState, string>;

export const SIGNAL_ACCENT_LIGHTS: SignalAccentLightSpec[] = [];

export const VEHICLE_EMISSIVE_ACCENTS: VehicleEmissiveAccentSpec[] = [
  {
    id: "north-queue-headlight-accent",
    kind: "headlight",
    position: [-LANE_CENTER, HEADLIGHT_HEIGHT, -38],
    color: STAGE5_LIGHT_COLORS.headlight,
    intensity: 5.2,
    distance: 24,
    rotationY: 0
  },
  {
    id: "south-queue-taillight-accent",
    kind: "taillight",
    position: [LANE_CENTER, HEADLIGHT_HEIGHT, 34],
    color: STAGE5_LIGHT_COLORS.taillight,
    intensity: 2.25,
    distance: 10,
    rotationY: Math.PI
  },
  {
    id: "east-queue-headlight-accent",
    kind: "headlight",
    position: [42, HEADLIGHT_HEIGHT, LANE_CENTER],
    color: STAGE5_LIGHT_COLORS.headlight,
    intensity: 4.9,
    distance: 22,
    rotationY: Math.PI / 2
  },
  {
    id: "west-queue-taillight-accent",
    kind: "taillight",
    position: [-34, HEADLIGHT_HEIGHT, -LANE_CENTER],
    color: STAGE5_LIGHT_COLORS.taillight,
    intensity: 2.1,
    distance: 10,
    rotationY: -Math.PI / 2
  }
];

export function getStage6LightingPreset(preset: Stage6LightingPresetName) {
  return STAGE6_LIGHTING_PRESETS[preset];
}

export function getStage6SignalLensEmissiveScale(
  preset: Stage6LightingPresetName = STAGE5_ACTIVE_LIGHTING_PRESET
) {
  return getStage6LightingPreset(preset).signalLensEmissiveScale;
}

export function buildStage6SignalAccentLights(
  signals: readonly Stage6SignalAccentSignal[] = []
): SignalAccentLightSpec[] {
  const seenDirections = new Set<Direction>();
  const lights: SignalAccentLightSpec[] = [];

  for (const signal of signals) {
    if (seenDirections.has(signal.direction)) {
      continue;
    }

    seenDirections.add(signal.direction);
    const placement = SIGNAL_ACCENT_LIGHT_PLACEMENTS[signal.direction];

    lights.push({
      id: `${signal.direction}-signal-${signal.state}-accent`,
      position: [...placement.position],
      color: SIGNAL_ACCENT_COLORS[signal.state],
      intensity: placement.intensity,
      distance: placement.distance
    });
  }

  return lights;
}

export function LightingRig({
  preset = STAGE5_ACTIVE_LIGHTING_PRESET,
  signals = []
}: {
  preset?: Stage6LightingPresetName;
  signals?: readonly Stage6SignalAccentSignal[];
}) {
  const presetConfig = getStage6LightingPreset(preset);
  const signalAccentLights = buildStage6SignalAccentLights(signals);

  return (
    <group
      name="stage5-lighting-rig"
      userData={{
        lightingPreset: preset,
        streetlightIntensityScale: presetConfig.streetlightIntensityScale,
        signalLensEmissiveScale: presetConfig.signalLensEmissiveScale,
        headlightResponseTarget: presetConfig.headlightResponseTarget
      }}
    >
      <hemisphereLight
        name="cool-ambient-sky-fill"
        color={presetConfig.hemisphereSkyColor}
        groundColor={presetConfig.hemisphereGroundColor}
        intensity={presetConfig.hemisphereIntensity}
      />
      <ambientLight
        name="low-wet-road-fill"
        color={presetConfig.hemisphereSkyColor}
        intensity={presetConfig.ambientIntensity}
      />
      <directionalLight
        name="soft-overcast-key-light"
        position={[48, 84, 42]}
        color={STAGE5_LIGHT_COLORS.coolMoon}
        intensity={presetConfig.keyLightIntensity}
        castShadow={STAGE5_SHADOWS_ENABLED}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-72}
        shadow-camera-right={72}
        shadow-camera-top={86}
        shadow-camera-bottom={-72}
        shadow-camera-near={18}
        shadow-camera-far={150}
        shadow-bias={-0.00022}
        shadow-normalBias={0.018}
      />

      {STREETLIGHT_POOLS.map((light) => (
        <pointLight
          key={light.id}
          name={light.id}
          position={light.position}
          color={light.color}
          intensity={light.intensity * presetConfig.streetlightIntensityScale}
          distance={light.distance}
          decay={2}
        />
      ))}

      {signalAccentLights.map((light) => (
        <pointLight
          key={light.id}
          name={light.id}
          position={light.position}
          color={light.color}
          intensity={light.intensity * presetConfig.signalAccentIntensityScale}
          distance={light.distance}
          decay={2}
        />
      ))}

      {/* Fake static vehicle-headlight/taillight accent pools — night-atmosphere
          fixtures, OFF in the clear-day preset where they painted warm orange streaks
          down the empty carriageway. The real DynamicVehicleLayer supplies day car light. */}
      {presetConfig.name !== "day" &&
        VEHICLE_EMISSIVE_ACCENTS.map((light) => (
          <pointLight
            key={light.id}
            name={light.id}
            position={light.position}
            color={light.color}
            intensity={
              light.intensity *
              (light.kind === "headlight"
                ? presetConfig.headlightResponseTarget
                : Math.max(0.52, presetConfig.headlightResponseTarget * 0.72))
            }
            distance={light.distance}
            decay={2}
          />
        ))}

    </group>
  );
}
