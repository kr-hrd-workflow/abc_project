"use client";

import {
  APPROACH_CORRIDORS,
  CROSSWALK_STRIPES,
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS,
  LANE_DIVIDER_MARKINGS,
  MEDIAN_BUS_LANE_COLOR,
  MEDIAN_BUS_LANE_MARKINGS,
  STAGE6E_CITY_EDGE_BLOCKS,
  TURN_ARROW_MARKINGS
} from "./roadGeometry";

// StructuralGuideLayer — flat, diagnostic render gated on ?guide=1.
// Renders road layout + lane markings + median bus lane + crosswalks + building
// massing for use as conditioning input for image generation.
// No plate, no PostFX, no vehicles. All materials are meshBasicMaterial so the
// output reads correctly under any lighting.
export function StructuralGuideLayer() {
  return (
    <group name="structural-guide">
      {/* Dark neutral ground base (800 m square, slightly below road surface) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[800, 800]} />
        <meshBasicMaterial color="#22222a" />
      </mesh>

      {/* Junction box — centre of the intersection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[INTERSECTION_BOX_X_METERS, INTERSECTION_BOX_Z_METERS]} />
        <meshBasicMaterial color="#cccccc" />
      </mesh>

      {/* Approach corridor road surfaces */}
      {APPROACH_CORRIDORS.map((corridor) => (
        <mesh
          key={`guide-corridor-${corridor.direction}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[corridor.position[0], 0.001, corridor.position[2]]}
        >
          <planeGeometry args={corridor.size} />
          <meshBasicMaterial color="#c8c8c8" />
        </mesh>
      ))}

      {/* Red central median bus lane (강남대로 N/S only) — must read clearly */}
      {MEDIAN_BUS_LANE_MARKINGS.map((marking) => (
        <mesh
          key={`guide-bus-${marking.id}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[marking.position[0], marking.position[1] + 0.012, marking.position[2]]}
        >
          <planeGeometry args={marking.size} />
          <meshBasicMaterial color={MEDIAN_BUS_LANE_COLOR} />
        </mesh>
      ))}

      {/* White lane dividers */}
      {LANE_DIVIDER_MARKINGS.map((marking) => (
        <mesh
          key={`guide-lane-${marking.id}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[marking.position[0], marking.position[1] + 0.012, marking.position[2]]}
        >
          <planeGeometry args={marking.size} />
          <meshBasicMaterial color="#e8e8e8" />
        </mesh>
      ))}

      {/* Crosswalk stripes — all four approaches (N/S restored in SP3) */}
      {CROSSWALK_STRIPES.map((stripe) => (
        <mesh
          key={`guide-crosswalk-${stripe.id}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[stripe.position[0], stripe.position[1] + 0.016, stripe.position[2]]}
        >
          <planeGeometry args={stripe.size} />
          <meshBasicMaterial color="#f0f0f0" />
        </mesh>
      ))}

      {/* Turn arrow markings (shafts + heads) */}
      {TURN_ARROW_MARKINGS.flatMap((arrow) =>
        arrow.parts.map((part) => (
          <group
            key={`guide-arrow-${part.id}`}
            position={[part.position[0], part.position[1] + 0.02, part.position[2]]}
            rotation={[0, part.rotationY ?? 0, 0]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={part.size} />
              <meshBasicMaterial color="#e0e0e0" />
            </mesh>
          </group>
        ))
      )}

      {/* Building massing — gray extruded blocks from STAGE6E_CITY_EDGE_BLOCKS */}
      {STAGE6E_CITY_EDGE_BLOCKS.map((block) => (
        <mesh key={`guide-bldg-${block.id}`} position={block.position}>
          <boxGeometry args={block.size} />
          <meshBasicMaterial color="#4a4a58" />
        </mesh>
      ))}
    </group>
  );
}

StructuralGuideLayer.displayName = "StructuralGuideLayer";
