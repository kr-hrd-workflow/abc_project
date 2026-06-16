import {
  APPROACH_CORRIDORS,
  BUILDING_EDGE_BLOCKS,
  CURB_SEGMENTS,
  LANE_DIVIDER_MARKINGS,
  QUEUE_ZONES,
  SIDEWALK_SLABS
} from "./roadGeometry";
import { ROAD_MATERIALS } from "./roadMaterials";

const PLANE_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

export function ApproachCorridors() {
  return (
    <group name="stage3-approach-corridors">
      {APPROACH_CORRIDORS.map((corridor) => (
        <mesh
          key={corridor.direction}
          name={`${corridor.direction}-long-approach-${corridor.lengthMeters}m`}
          position={corridor.position}
          rotation={PLANE_ROTATION}
          receiveShadow
        >
          <planeGeometry args={corridor.size} />
          <meshStandardMaterial {...ROAD_MATERIALS.asphalt} />
        </mesh>
      ))}

      {LANE_DIVIDER_MARKINGS.map((marking) => (
        <mesh
          key={marking.id}
          name={marking.id}
          position={marking.position}
          rotation={PLANE_ROTATION}
          receiveShadow
        >
          <planeGeometry args={marking.size} />
          <meshStandardMaterial {...ROAD_MATERIALS.wornMarking} />
        </mesh>
      ))}

      {QUEUE_ZONES.map((zone) => (
        <mesh
          key={zone.id}
          name={zone.id}
          position={zone.position}
          rotation={PLANE_ROTATION}
        >
          <planeGeometry args={zone.size} />
          <meshStandardMaterial {...ROAD_MATERIALS.queueZone} />
        </mesh>
      ))}

      {CURB_SEGMENTS.map((curb) => (
        <mesh
          key={curb.id}
          name={curb.id}
          position={curb.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={curb.size} />
          <meshStandardMaterial {...ROAD_MATERIALS.curb} />
        </mesh>
      ))}

      {SIDEWALK_SLABS.map((sidewalk) => (
        <mesh
          key={sidewalk.id}
          name={sidewalk.id}
          position={sidewalk.position}
          receiveShadow
        >
          <boxGeometry args={sidewalk.size} />
          <meshStandardMaterial {...ROAD_MATERIALS.sidewalk} />
        </mesh>
      ))}

      {BUILDING_EDGE_BLOCKS.map((building) => (
        <mesh
          key={building.id}
          name={building.id}
          position={building.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={building.size} />
          <meshStandardMaterial {...ROAD_MATERIALS.buildingEdge} />
        </mesh>
      ))}
    </group>
  );
}
