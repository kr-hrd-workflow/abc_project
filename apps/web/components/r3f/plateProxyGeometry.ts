// plateProxyGeometry.ts
import {
  BUILDING_EDGE_BLOCKS,
  INTERSECTION_BOX_METERS,
  STAGE6E_CITY_EDGE_BLOCKS,
  type BoxPrimitiveSpec
} from "./roadGeometry";

export type PlateProxy = {
  occluders: BoxPrimitiveSpec[];
  groundPlane: { size: number; y: number };
};

// One coarse proxy reused four ways: structural guide source, depth occluders,
// projection surface, and vehicle occlusion. Reuses the building blocks already
// defined for the scene so the plate aligns with the procedural fallback.
export function buildPlateProxy(): PlateProxy {
  const occluders: BoxPrimitiveSpec[] = [
    ...BUILDING_EDGE_BLOCKS,
    ...STAGE6E_CITY_EDGE_BLOCKS
  ];
  return {
    occluders,
    groundPlane: { size: INTERSECTION_BOX_METERS * 6, y: 0 }
  };
}
