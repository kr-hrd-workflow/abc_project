import {
  APPROACH_CORRIDORS,
  type BoxPrimitiveSpec,
  CITY_GROUND_APRON,
  CURB_SEGMENTS,
  LANE_WIDTH_METERS,
  LANE_DIVIDER_MARKINGS,
  type PlaneBatchSpec,
  QUEUE_ZONES,
  ROAD_WIDTH_METERS,
  SIDEWALK_SLABS_EW,
  SIDEWALK_SLABS_NS,
  STAGE6E_CITY_EDGE_BLOCKS
} from "./roadGeometry";
import type { Vector3Tuple } from "./roadGeometry";
import { useStage5RoadMaterials } from "./roadMaterials";
import { InstancedBoxBatch, InstancedPlaneBatch } from "./instancedBatches";

const ROAD_OVERLAY_HEIGHT = 0.028;
const EDGE_GRIME_HEIGHT = 0.032;

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

export function ApproachCorridors({ isNight = false }: { isNight?: boolean }) {
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
      {/* Split by orientation so the Task 5 paver atlas tiles square on both
          slab directions (shared instanced UVs transpose u/v between NS/EW). */}
      <InstancedBoxBatch
        name="stage5-corridor-sidewalk-slabs"
        specs={SIDEWALK_SLABS_NS}
        material={roadMaterials.sidewalk}
        receiveShadow
      />
      <InstancedBoxBatch
        name="stage5-corridor-sidewalk-slabs-ew"
        specs={SIDEWALK_SLABS_EW}
        material={roadMaterials.sidewalkCross}
        receiveShadow
      />
      {/* The procedural city-edge building blocks are suppressed at night so
          the photoreal plate backdrop is the city (Option A). The road, curbs,
          sidewalks, and markings stay so vehicles keep a real surface. */}
      {!isNight && (
        <>
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
        </>
      )}
    </group>
  );
}

