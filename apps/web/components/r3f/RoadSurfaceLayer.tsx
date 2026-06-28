"use client";

import {
  APPROACH_CORRIDORS,
  CROSSWALK_STRIPES,
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS,
  LANE_DIVIDER_MARKINGS,
  MEDIAN_BUS_LANE_COLOR,
  MEDIAN_BUS_LANE_MARKINGS,
  TURN_ARROW_MARKINGS
} from "./roadGeometry";

// RoadSurfaceLayer — polished production road rendered from the geometry model.
//
// Covers the junction box + all four approach corridors in dark asphalt
// (meshStandardMaterial, roughness 0.92) plus the full marking set:
//   • Red median bus lane  (MEDIAN_BUS_LANE_MARKINGS)
//   • White lane dividers  (LANE_DIVIDER_MARKINGS)
//   • Zebra crosswalks     (CROSSWALK_STRIPES)
//   • Turn arrows          (TURN_ARROW_MARKINGS)
//
// Heights are staggered to prevent z-fighting:
//   road surface  → y ≈ 0.002
//   bus lane      → y + 0.012
//   lane dividers → y + 0.014
//   crosswalks    → y + 0.016
//   turn arrows   → y + 0.020
//
// The 800 m ground base and STAGE6E_CITY_EDGE_BLOCKS are intentionally absent —
// the background plate provides surroundings.
//
// No hooks: geometry data is module-level constants, colour strings are
// primitives. Matches the StructuralGuideLayer no-hook convention so the
// component can be called as a plain function in tests.
//
// Props:
//   isNight — switches asphalt and marking colours to the night palette.

export type RoadSurfaceLayerProps = {
  isNight: boolean;
};

export function RoadSurfaceLayer({ isNight }: RoadSurfaceLayerProps) {
  // Asphalt colour: dark charcoal day / near-black night
  const asphaltColor = isNight ? "#23232c" : "#3c3c43";

  // Marking colours per time-of-day
  const laneColor = isNight ? "#cdc6b8" : "#ececec";
  const crosswalkColor = isNight ? "#d8d2c4" : "#f2f2f2";
  const arrowColor = isNight ? "#cbc4b6" : "#e6e6e6";

  return (
    <group name="road-surface-layer">
      {/* Junction box — centre of the intersection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[INTERSECTION_BOX_X_METERS, INTERSECTION_BOX_Z_METERS]} />
        <meshStandardMaterial color={asphaltColor} roughness={0.92} metalness={0} />
      </mesh>

      {/* Approach corridor road surfaces */}
      {APPROACH_CORRIDORS.map((corridor) => (
        <mesh
          key={`road-corridor-${corridor.direction}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[corridor.position[0], 0.002, corridor.position[2]]}
        >
          <planeGeometry args={corridor.size} />
          <meshStandardMaterial color={asphaltColor} roughness={0.92} metalness={0} />
        </mesh>
      ))}

      {/* Red central median bus lane (강남대로 N/S only) */}
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
          <meshBasicMaterial color={MEDIAN_BUS_LANE_COLOR} />
        </mesh>
      ))}

      {/* White lane dividers */}
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
          <meshBasicMaterial color={laneColor} />
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
          <meshBasicMaterial color={crosswalkColor} />
        </mesh>
      ))}

      {/* Turn arrow markings (shafts + heads) */}
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
