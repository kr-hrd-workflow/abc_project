"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { RepeatWrapping, type Texture } from "three";

import {
  APPROACH_CORRIDORS,
  CROSSWALK_STRIPES,
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS,
  LANE_DIVIDER_MARKINGS,
  MEDIAN_BUS_LANE_MARKINGS,
  TURN_ARROW_MARKINGS
} from "./roadGeometry";

// RoadSurfaceLayer — photoreal production road rendered from the geometry model.
//
// Covers the junction box + all four approach corridors in dark textured asphalt
// (meshStandardMaterial with asphalt.webp, roughness 0.95) plus the full marking
// set with worn-paint muted colours:
//   • Muted brick/terracotta median bus lane  (MEDIAN_BUS_LANE_MARKINGS)
//   • Off-white lane dividers  (LANE_DIVIDER_MARKINGS)
//   • Zebra crosswalks         (CROSSWALK_STRIPES)
//   • Turn arrows              (TURN_ARROW_MARKINGS)
//
// Heights are staggered to prevent z-fighting:
//   road surface  → y ≈ 0.002
//   bus lane      → y + 0.012
//   lane dividers → y + 0.014
//   crosswalks    → y + 0.016
//   turn arrows   → y + 0.020
//
// Texture tiling: asphalt.webp is tiled at 1 repeat per ~9 m so the grain
// appears world-consistent. Each distinct plane clones the base texture so
// tiling is never stretched along either axis.
//
// This component uses React hooks (useTexture, useMemo). Mount via <Suspense>
// in SimulationScene so a missing texture degrades gracefully.
//
// Props:
//   isNight — switches asphalt tint and marking colours to the night palette.

const ASPHALT_PATH = "/simulation/r3f/assets/textures/asphalt.webp";
const TILE_SCALE_M = 9; // metres per texture repeat

// Muted bus lane colours — local override so the road reads photoreal without
// touching the exported MEDIAN_BUS_LANE_COLOR (used by other code / tests).
const BUS_DAY = "#8f4034";
const BUS_NIGHT = "#5e2c25";

// Preload the asphalt texture in browser environments so it is warm on first
// paint and does not cause a black-frame flicker in the capture harness.
if (
  typeof window !== "undefined" &&
  !/jsdom/i.test(window.navigator?.userAgent ?? "")
) {
  useTexture.preload(ASPHALT_PATH);
}

function tileTexture(base: Texture, w: number, h: number): Texture {
  const tex = base.clone();
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(w / TILE_SCALE_M, h / TILE_SCALE_M);
  tex.needsUpdate = true;
  return tex;
}

export type RoadSurfaceLayerProps = {
  isNight: boolean;
};

export function RoadSurfaceLayer({ isNight }: RoadSurfaceLayerProps) {
  const asphaltBase = useTexture(ASPHALT_PATH) as Texture;

  // Clone one texture per plane so each gets its own UV repeat.
  const junctionTex = useMemo(
    () => tileTexture(asphaltBase, INTERSECTION_BOX_X_METERS, INTERSECTION_BOX_Z_METERS),
    [asphaltBase]
  );
  const corridorTextures = useMemo(
    () => APPROACH_CORRIDORS.map((c) => tileTexture(asphaltBase, c.size[0], c.size[1])),
    [asphaltBase]
  );

  // Asphalt tint: white in day (texture reads true colour ~#3a3a3e),
  // slightly blue-dark tint at night so the grain stays visible.
  const asphaltColor = isNight ? "#5a5a64" : "#ffffff";
  const busLaneColor = isNight ? BUS_NIGHT : BUS_DAY;

  // Worn-paint marking colours — off-white, not stark.
  const laneColor = isNight ? "#a9a394" : "#d7d5cc";
  const crosswalkColor = isNight ? "#b4af9f" : "#e3e1d8";
  const arrowColor = isNight ? "#a9a394" : "#d7d5cc";

  return (
    <group name="road-surface-layer">
      {/* Junction box — centre of the intersection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[INTERSECTION_BOX_X_METERS, INTERSECTION_BOX_Z_METERS]} />
        <meshStandardMaterial
          map={junctionTex}
          color={asphaltColor}
          roughness={0.95}
          metalness={0}
        />
      </mesh>

      {/* Approach corridor road surfaces */}
      {APPROACH_CORRIDORS.map((corridor, idx) => (
        <mesh
          key={`road-corridor-${corridor.direction}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[corridor.position[0], 0.002, corridor.position[2]]}
        >
          <planeGeometry args={corridor.size} />
          <meshStandardMaterial
            map={corridorTextures[idx]}
            color={asphaltColor}
            roughness={0.95}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Muted brick/terracotta median bus lane (강남대로 N/S only) */}
      {MEDIAN_BUS_LANE_MARKINGS.map((marking) => (
        <mesh
          key={`road-bus-${marking.id}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            marking.position[0],
            marking.position[1] + 0.012,
            marking.position[2]
          ]}
        >
          <planeGeometry args={marking.size} />
          <meshBasicMaterial color={busLaneColor} />
        </mesh>
      ))}

      {/* Off-white lane dividers — slight transparency reveals asphalt grain */}
      {LANE_DIVIDER_MARKINGS.map((marking) => (
        <mesh
          key={`road-lane-${marking.id}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            marking.position[0],
            marking.position[1] + 0.014,
            marking.position[2]
          ]}
        >
          <planeGeometry args={marking.size} />
          <meshBasicMaterial color={laneColor} transparent opacity={0.9} />
        </mesh>
      ))}

      {/* Zebra crosswalk stripes — all four approaches */}
      {CROSSWALK_STRIPES.map((stripe) => (
        <mesh
          key={`road-crosswalk-${stripe.id}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            stripe.position[0],
            stripe.position[1] + 0.016,
            stripe.position[2]
          ]}
        >
          <planeGeometry args={stripe.size} />
          <meshBasicMaterial color={crosswalkColor} transparent opacity={0.9} />
        </mesh>
      ))}

      {/* Turn arrow markings (shafts + heads) — in a general through lane */}
      {TURN_ARROW_MARKINGS.flatMap((arrow) =>
        arrow.parts.map((part) => (
          <group
            key={`road-arrow-${part.id}`}
            position={[part.position[0], part.position[1] + 0.02, part.position[2]]}
            rotation={[0, part.rotationY ?? 0, 0]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={part.size} />
              <meshBasicMaterial color={arrowColor} />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

RoadSurfaceLayer.displayName = "RoadSurfaceLayer";
