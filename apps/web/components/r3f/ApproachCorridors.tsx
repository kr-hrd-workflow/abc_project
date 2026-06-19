import { useEffect, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { Object3D, type InstancedMesh } from "three";

import {
  APPROACH_CORRIDORS,
  type BoxPrimitiveSpec,
  CURB_SEGMENTS,
  LANE_WIDTH_METERS,
  LANE_DIVIDER_MARKINGS,
  type PlanePrimitiveSpec,
  QUEUE_ZONES,
  ROAD_WIDTH_METERS,
  SIDEWALK_SLABS,
  STAGE6E_CITY_EDGE_BLOCKS
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

const PLANE_ROTATION_X = -Math.PI / 2;
const CITY_GROUND_HEIGHT = -0.012;
const ROAD_OVERLAY_HEIGHT = 0.028;
const EDGE_GRIME_HEIGHT = 0.032;

const CITY_GROUND_APRON: PlaneBatchSpec[] = [
  {
    id: "stage5-wet-city-ground-apron",
    position: [0, CITY_GROUND_HEIGHT, -18],
    size: [260, 310]
  }
];

const CORRIDOR_ROAD_PLANES: PlaneBatchSpec[] = APPROACH_CORRIDORS.map(
  (corridor) => ({
    id: `${corridor.direction}-long-approach-${corridor.lengthMeters}m`,
    position: corridor.position,
    size: corridor.size
  })
);

const CORRIDOR_WEAR_PATCHES: PlaneBatchSpec[] =
  APPROACH_CORRIDORS.flatMap((corridor) => {
    const longPatch = corridor.lengthMeters * 0.36;
    const shortPatch = corridor.lengthMeters * 0.17;

    if (corridor.orientation === "north_south") {
      return [
        {
          id: `${corridor.direction}-left-wheel-track-wet-wear`,
          position: [
            -LANE_WIDTH_METERS * 0.6,
            ROAD_OVERLAY_HEIGHT,
            corridor.position[2] - corridor.lengthMeters * 0.08
          ],
          size: [2.15, longPatch]
        },
        {
          id: `${corridor.direction}-right-wheel-track-wet-wear`,
          position: [
            LANE_WIDTH_METERS * 0.52,
            ROAD_OVERLAY_HEIGHT,
            corridor.position[2] + corridor.lengthMeters * 0.12
          ],
          size: [1.85, longPatch * 0.74]
        },
        {
          id: `${corridor.direction}-patched-asphalt-panel`,
          position: [
            -LANE_WIDTH_METERS * 1.32,
            ROAD_OVERLAY_HEIGHT + 0.002,
            corridor.position[2] + corridor.lengthMeters * 0.28
          ],
          size: [LANE_WIDTH_METERS * 0.92, shortPatch]
        }
      ];
    }

    return [
      {
        id: `${corridor.direction}-left-wheel-track-wet-wear`,
        position: [
          corridor.position[0] - corridor.lengthMeters * 0.1,
          ROAD_OVERLAY_HEIGHT,
          -LANE_WIDTH_METERS * 0.58
        ],
        size: [longPatch, 2.05]
      },
      {
        id: `${corridor.direction}-right-wheel-track-wet-wear`,
        position: [
          corridor.position[0] + corridor.lengthMeters * 0.12,
          ROAD_OVERLAY_HEIGHT,
          LANE_WIDTH_METERS * 0.56
        ],
        size: [longPatch * 0.72, 1.85]
      },
      {
        id: `${corridor.direction}-patched-asphalt-panel`,
        position: [
          corridor.position[0] - corridor.lengthMeters * 0.3,
          ROAD_OVERLAY_HEIGHT + 0.002,
          LANE_WIDTH_METERS * 1.28
        ],
        size: [shortPatch, LANE_WIDTH_METERS * 0.9]
      }
    ];
  });

const EDGE_GRIME_BANDS: PlaneBatchSpec[] = APPROACH_CORRIDORS.flatMap(
  (corridor) => {
    if (corridor.orientation === "north_south") {
      return [-1, 1].map((side) => ({
        id: `${corridor.direction}-curbside-standing-water-${side}`,
        position: [
          side * (ROAD_WIDTH_METERS / 2 - 0.42),
          EDGE_GRIME_HEIGHT,
          corridor.position[2]
        ] as Vector3Tuple,
        size: [0.92, corridor.lengthMeters * 0.98] as [number, number]
      }));
    }

    return [-1, 1].map((side) => ({
      id: `${corridor.direction}-curbside-standing-water-${side}`,
      position: [
        corridor.position[0],
        EDGE_GRIME_HEIGHT,
        side * (ROAD_WIDTH_METERS / 2 - 0.42)
      ] as Vector3Tuple,
      size: [corridor.lengthMeters * 0.98, 0.92] as [number, number]
    }));
  }
);

const CITY_EDGE_BLOCKS: BoxPrimitiveSpec[] = STAGE6E_CITY_EDGE_BLOCKS;

const BUILDING_BASE_WET_SHADOWS: PlaneBatchSpec[] = CITY_EDGE_BLOCKS.map(
  (building) => {
    const [width, , depth] = building.size;
    const [x, , z] = building.position;
    const isNorthSouthBlock = depth > width;

    if (isNorthSouthBlock) {
      const side = Math.sign(x) || 1;
      return {
        id: `${building.id}-wet-base-shadow`,
        position: [
          x - side * (width / 2 + 0.28),
          EDGE_GRIME_HEIGHT + 0.002,
          z
        ],
        size: [1.15, depth * 0.94]
      };
    }

    const side = Math.sign(z) || 1;
    return {
      id: `${building.id}-wet-base-shadow`,
      position: [
        x,
        EDGE_GRIME_HEIGHT + 0.002,
        z - side * (depth / 2 + 0.28)
      ],
      size: [width * 0.94, 1.15]
    };
  }
);

export function ApproachCorridors() {
  const roadMaterials = useStage5RoadMaterials();

  return (
    <group name="stage3-approach-corridors">
      <InstancedPlaneBatch
        name="stage5-wet-city-ground-apron"
        specs={CITY_GROUND_APRON}
        material={roadMaterials.cityGround}
        renderOrder={-2}
        receiveShadow
      />
      <InstancedPlaneBatch
        name="stage5-approach-road-surfaces"
        specs={CORRIDOR_ROAD_PLANES}
        material={roadMaterials.asphalt}
        receiveShadow
      />
      <InstancedPlaneBatch
        name="stage5-corridor-wheel-wear-and-patches"
        specs={CORRIDOR_WEAR_PATCHES}
        material={roadMaterials.asphaltPatch}
        renderOrder={1}
      />
      <InstancedPlaneBatch
        name="stage5-corridor-curbside-standing-water"
        specs={EDGE_GRIME_BANDS}
        material={roadMaterials.edgeGrime}
        renderOrder={2}
      />
      <InstancedPlaneBatch
        name="stage5-lane-divider-worn-markings"
        specs={LANE_DIVIDER_MARKINGS}
        material={roadMaterials.wornMarking}
        renderOrder={3}
      />
      <InstancedPlaneBatch
        name="stage5-muted-queue-wetness"
        specs={QUEUE_ZONES}
        material={roadMaterials.queueZone}
        renderOrder={1}
      />
      <InstancedBoxBatch
        name="stage5-corridor-curbs"
        specs={CURB_SEGMENTS}
        material={roadMaterials.curb}
        castShadow
        receiveShadow
      />
      <InstancedBoxBatch
        name="stage5-corridor-sidewalk-slabs"
        specs={SIDEWALK_SLABS}
        material={roadMaterials.sidewalk}
        receiveShadow
      />
      <InstancedBoxBatch
        name="stage5-city-edge-building-blocks"
        specs={CITY_EDGE_BLOCKS}
        material={roadMaterials.buildingBlock}
        castShadow
        receiveShadow
      />
      <InstancedPlaneBatch
        name="stage5-building-base-wet-shadows"
        specs={BUILDING_BASE_WET_SHADOWS}
        material={roadMaterials.edgeGrime}
        renderOrder={1}
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

function InstancedBoxBatch({
  name,
  specs,
  material,
  castShadow = false,
  receiveShadow = false
}: {
  name: string;
  specs: readonly BoxPrimitiveSpec[];
  material: RoadMaterialProps;
  castShadow?: boolean;
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
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(...spec.size);
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
      castShadow={castShadow}
      frustumCulled={false}
      receiveShadow={receiveShadow}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial {...material} />
    </instancedMesh>
  );
}

function isThreeInstancedMesh(mesh: InstancedMesh | null): mesh is InstancedMesh {
  return Boolean(mesh && typeof mesh.setMatrixAt === "function");
}
