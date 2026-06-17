import {
  INTERSECTION_BOX_METERS,
  LANE_WIDTH_METERS,
  ROAD_WIDTH_METERS
} from "./roadGeometry";
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

export type VehicleEmissiveAccentSpec = {
  id: string;
  kind: "headlight" | "taillight";
  position: Vector3Tuple;
  color: string;
  intensity: number;
  distance: number;
  rotationY: number;
};

export const STAGE5_LIGHT_COLORS = {
  ambientSky: "#6d8190",
  ambientGround: "#0b0e11",
  coolMoon: "#9fb5c8",
  streetlightWarm: "#ffd08a",
  headlight: "#fff3dc",
  taillight: "#d84838",
  signalRed: "#dc4e40",
  signalAmber: "#efb45f",
  signalGreen: "#78d48d"
} as const;

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

export const SIGNAL_ACCENT_LIGHTS: SignalAccentLightSpec[] = [
  {
    id: "north-signal-red-accent",
    position: [-SIGNAL_SIDE_OFFSET, SIGNAL_HEIGHT, -STOP_LINE_OFFSET],
    color: STAGE5_LIGHT_COLORS.signalRed,
    intensity: 3.6,
    distance: 14
  },
  {
    id: "south-signal-green-accent",
    position: [SIGNAL_SIDE_OFFSET, SIGNAL_HEIGHT, STOP_LINE_OFFSET],
    color: STAGE5_LIGHT_COLORS.signalGreen,
    intensity: 3.8,
    distance: 15
  },
  {
    id: "east-signal-amber-accent",
    position: [STOP_LINE_OFFSET, SIGNAL_HEIGHT, -SIGNAL_SIDE_OFFSET],
    color: STAGE5_LIGHT_COLORS.signalAmber,
    intensity: 3.2,
    distance: 13
  },
  {
    id: "west-signal-red-accent",
    position: [-STOP_LINE_OFFSET, SIGNAL_HEIGHT, SIGNAL_SIDE_OFFSET],
    color: STAGE5_LIGHT_COLORS.signalRed,
    intensity: 3.4,
    distance: 13
  }
];

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

export function LightingRig() {
  return (
    <group name="stage5-lighting-rig">
      <hemisphereLight
        name="cool-ambient-sky-fill"
        color={STAGE5_LIGHT_COLORS.ambientSky}
        groundColor={STAGE5_LIGHT_COLORS.ambientGround}
        intensity={0.58}
      />
      <ambientLight
        name="low-wet-road-fill"
        color={STAGE5_LIGHT_COLORS.ambientSky}
        intensity={0.1}
      />
      <directionalLight
        name="soft-overcast-key-light"
        position={[64, 92, 48]}
        color={STAGE5_LIGHT_COLORS.coolMoon}
        intensity={0.82}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={12}
        shadow-camera-far={210}
      />

      {STREETLIGHT_POOLS.map((light) => (
        <pointLight
          key={light.id}
          name={light.id}
          position={light.position}
          color={light.color}
          intensity={light.intensity}
          distance={light.distance}
          decay={2}
        />
      ))}

      {SIGNAL_ACCENT_LIGHTS.map((light) => (
        <pointLight
          key={light.id}
          name={light.id}
          position={light.position}
          color={light.color}
          intensity={light.intensity}
          distance={light.distance}
          decay={2}
        />
      ))}

      {VEHICLE_EMISSIVE_ACCENTS.map((light) => (
        <pointLight
          key={light.id}
          name={light.id}
          position={light.position}
          color={light.color}
          intensity={light.intensity}
          distance={light.distance}
          decay={2}
        />
      ))}

    </group>
  );
}
