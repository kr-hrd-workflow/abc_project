import {
  CROSSWALK_STRIPES,
  INTERSECTION_BOX_METERS,
  ROAD_WIDTH_METERS,
  TURN_ARROW_MARKINGS
} from "./roadGeometry";
import { ROAD_MATERIALS } from "./roadMaterials";

const PLANE_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

export function ProceduralIntersection() {
  return (
    <group name="stage3-procedural-intersection-box">
      <mesh
        name="intersection-box-32m"
        position={[0, 0.002, 0]}
        rotation={PLANE_ROTATION}
        receiveShadow
      >
        <planeGeometry args={[INTERSECTION_BOX_METERS, INTERSECTION_BOX_METERS]} />
        <meshStandardMaterial {...ROAD_MATERIALS.intersectionAsphalt} />
      </mesh>

      <mesh
        name="north-south-stop-line"
        position={[0, 0.024, -INTERSECTION_BOX_METERS / 2]}
        rotation={PLANE_ROTATION}
        receiveShadow
      >
        <planeGeometry args={[ROAD_WIDTH_METERS, 0.42]} />
        <meshStandardMaterial {...ROAD_MATERIALS.wornMarking} />
      </mesh>
      <mesh
        name="south-north-stop-line"
        position={[0, 0.024, INTERSECTION_BOX_METERS / 2]}
        rotation={PLANE_ROTATION}
        receiveShadow
      >
        <planeGeometry args={[ROAD_WIDTH_METERS, 0.42]} />
        <meshStandardMaterial {...ROAD_MATERIALS.wornMarking} />
      </mesh>
      <mesh
        name="east-west-stop-line"
        position={[INTERSECTION_BOX_METERS / 2, 0.024, 0]}
        rotation={PLANE_ROTATION}
        receiveShadow
      >
        <planeGeometry args={[0.42, ROAD_WIDTH_METERS]} />
        <meshStandardMaterial {...ROAD_MATERIALS.wornMarking} />
      </mesh>
      <mesh
        name="west-east-stop-line"
        position={[-INTERSECTION_BOX_METERS / 2, 0.024, 0]}
        rotation={PLANE_ROTATION}
        receiveShadow
      >
        <planeGeometry args={[0.42, ROAD_WIDTH_METERS]} />
        <meshStandardMaterial {...ROAD_MATERIALS.wornMarking} />
      </mesh>

      {CROSSWALK_STRIPES.map((stripe) => (
        <mesh
          key={stripe.id}
          name={stripe.id}
          position={stripe.position}
          rotation={PLANE_ROTATION}
          receiveShadow
        >
          <planeGeometry args={stripe.size} />
          <meshStandardMaterial {...ROAD_MATERIALS.wornMarking} />
        </mesh>
      ))}

      {TURN_ARROW_MARKINGS.flatMap((arrow) => arrow.parts).map((arrowPart) => (
        <mesh
          key={arrowPart.id}
          name={arrowPart.id}
          position={arrowPart.position}
          rotation={[-Math.PI / 2, arrowPart.rotationY ?? 0, 0]}
          receiveShadow
        >
          <planeGeometry args={arrowPart.size} />
          <meshStandardMaterial {...ROAD_MATERIALS.wornMarking} />
        </mesh>
      ))}
    </group>
  );
}
