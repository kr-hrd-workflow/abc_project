import { useEffect, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { Object3D, type InstancedMesh } from "three";

import {
  CROSSWALK_STRIPES,
  INTERSECTION_BOX_METERS,
  type PlanePrimitiveSpec,
  ROAD_WIDTH_METERS,
  TURN_ARROW_MARKINGS
} from "./roadGeometry";
import type { Vector3Tuple } from "./roadGeometry";
import { useStage5RoadMaterials } from "./roadMaterials";

type RoadMaterialProps = ThreeElements["meshStandardMaterial"];
type PlaneBatchSpec = {
  id: string;
  position: Vector3Tuple;
  size: [number, number];
  rotationY?: number;
};

const PLANE_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
const PLANE_ROTATION_X = -Math.PI / 2;
const HALF_INTERSECTION = INTERSECTION_BOX_METERS / 2;
const STOP_MARKING_HEIGHT = 0.024;
const SCUFF_HEIGHT = 0.034;

const STOP_LINE_MARKINGS: PlaneBatchSpec[] = [
  {
    id: "north-south-stop-line",
    position: [0, STOP_MARKING_HEIGHT, -HALF_INTERSECTION],
    size: [ROAD_WIDTH_METERS, 0.6]
  },
  {
    id: "south-north-stop-line",
    position: [0, STOP_MARKING_HEIGHT, HALF_INTERSECTION],
    size: [ROAD_WIDTH_METERS, 0.6]
  },
  {
    id: "east-west-stop-line",
    position: [HALF_INTERSECTION, STOP_MARKING_HEIGHT, 0],
    size: [0.6, ROAD_WIDTH_METERS]
  },
  {
    id: "west-east-stop-line",
    position: [-HALF_INTERSECTION, STOP_MARKING_HEIGHT, 0],
    size: [0.6, ROAD_WIDTH_METERS]
  }
];

const INTERSECTION_TIRE_SCARS: PlaneBatchSpec[] = [
  {
    id: "north-south-through-tire-polish-left",
    position: [-2.2, SCUFF_HEIGHT, 0],
    size: [1.25, INTERSECTION_BOX_METERS * 0.9]
  },
  {
    id: "north-south-through-tire-polish-right",
    position: [2.1, SCUFF_HEIGHT, 0],
    size: [1.05, INTERSECTION_BOX_METERS * 0.78]
  },
  {
    id: "east-west-through-tire-polish-left",
    position: [0, SCUFF_HEIGHT + 0.001, -2.05],
    size: [INTERSECTION_BOX_METERS * 0.86, 1.15]
  },
  {
    id: "east-west-through-tire-polish-right",
    position: [0, SCUFF_HEIGHT + 0.001, 2.35],
    size: [INTERSECTION_BOX_METERS * 0.7, 1.0]
  },
  {
    id: "north-left-turn-polished-arc-proxy",
    position: [-6.2, SCUFF_HEIGHT + 0.002, -5.7],
    size: [8.8, 1.05],
    rotationY: -Math.PI / 5
  },
  {
    id: "south-left-turn-polished-arc-proxy",
    position: [5.8, SCUFF_HEIGHT + 0.002, 5.5],
    size: [8.4, 1.0],
    rotationY: -Math.PI / 5
  }
];

const CROSSWALK_GRIME_BANDS: PlaneBatchSpec[] = [
  {
    id: "north-crosswalk-wheel-worn-band",
    position: [0, SCUFF_HEIGHT + 0.004, -(HALF_INTERSECTION + 3.2)],
    size: [ROAD_WIDTH_METERS + 3.4, 1.35]
  },
  {
    id: "south-crosswalk-wheel-worn-band",
    position: [0, SCUFF_HEIGHT + 0.004, HALF_INTERSECTION + 3.2],
    size: [ROAD_WIDTH_METERS + 3.4, 1.35]
  },
  {
    id: "east-crosswalk-wheel-worn-band",
    position: [HALF_INTERSECTION + 3.2, SCUFF_HEIGHT + 0.004, 0],
    size: [1.35, ROAD_WIDTH_METERS + 3.4]
  },
  {
    id: "west-crosswalk-wheel-worn-band",
    position: [-(HALF_INTERSECTION + 3.2), SCUFF_HEIGHT + 0.004, 0],
    size: [1.35, ROAD_WIDTH_METERS + 3.4]
  }
];

const TURN_ARROW_PARTS: PlanePrimitiveSpec[] = TURN_ARROW_MARKINGS.flatMap(
  (arrow) => arrow.parts
);

export function ProceduralIntersection() {
  const roadMaterials = useStage5RoadMaterials();

  return (
    <group name="stage3-procedural-intersection-box">
      <mesh
        name="intersection-box-32m"
        position={[0, 0.002, 0]}
        rotation={PLANE_ROTATION}
        receiveShadow
      >
        <planeGeometry args={[INTERSECTION_BOX_METERS, INTERSECTION_BOX_METERS]} />
        <meshStandardMaterial {...roadMaterials.intersectionAsphalt} />
      </mesh>

      <InstancedPlaneBatch
        name="stage5-intersection-tire-scars"
        specs={INTERSECTION_TIRE_SCARS}
        material={roadMaterials.asphaltPatch}
        renderOrder={1}
      />
      <InstancedPlaneBatch
        name="stage5-stop-line-worn-markings"
        specs={STOP_LINE_MARKINGS}
        material={roadMaterials.wornMarking}
        renderOrder={3}
        receiveShadow
      />
      <InstancedPlaneBatch
        name="stage5-crosswalk-worn-stripes"
        specs={CROSSWALK_STRIPES}
        material={roadMaterials.crosswalkMarking}
        renderOrder={3}
        receiveShadow
      />
      <InstancedPlaneBatch
        name="stage5-turn-arrow-worn-markings"
        specs={TURN_ARROW_PARTS}
        material={roadMaterials.wornMarking}
        renderOrder={3}
        receiveShadow
      />
      <InstancedPlaneBatch
        name="stage5-crosswalk-road-grime-bands"
        specs={CROSSWALK_GRIME_BANDS}
        material={roadMaterials.markingScuff}
        renderOrder={4}
      />
    </group>
  );
}

function InstancedPlaneBatch({
  name,
  specs,
  material,
  renderOrder = 0,
  receiveShadow = false
}: {
  name: string;
  specs: readonly (PlaneBatchSpec | PlanePrimitiveSpec)[];
  material: RoadMaterialProps;
  renderOrder?: number;
  receiveShadow?: boolean;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());

  useEffect(() => {
    const mesh = meshRef.current;
    if (!isThreeInstancedMesh(mesh)) return;

    const tempObject = tempObjectRef.current;

    specs.forEach((spec, index) => {
      tempObject.position.set(...spec.position);
      tempObject.rotation.set(PLANE_ROTATION_X, spec.rotationY ?? 0, 0);
      tempObject.scale.set(spec.size[0], spec.size[1], 1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [specs]);

  if (specs.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      name={name}
      args={[undefined, undefined, specs.length]}
      frustumCulled={false}
      renderOrder={renderOrder}
      receiveShadow={receiveShadow}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial {...material} />
    </instancedMesh>
  );
}

function isThreeInstancedMesh(mesh: InstancedMesh | null): mesh is InstancedMesh {
  return Boolean(mesh && typeof mesh.setMatrixAt === "function");
}
