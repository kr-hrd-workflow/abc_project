// plateProxyGeometry.ts
import { Matrix4, PerspectiveCamera, Vector3 } from "three";

import {
  BUILDING_EDGE_BLOCKS,
  INTERSECTION_BOX_EXTENT_METERS,
  STAGE6E_CITY_EDGE_BLOCKS,
  type BoxPrimitiveSpec,
  type Vector3Tuple
} from "./roadGeometry";
import type { PlateCameraAngle } from "./plateCameraCalibration";

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
  // Square backdrop plane sized to the larger axis of the asymmetric junction
  // box (강남대로 E–W carriageway vs 테헤란로/서초대로 N–S), kept generous (×6)
  // so the procedural fallback reads coherently behind the night plate.
  const maxBoxExtent = Math.max(
    INTERSECTION_BOX_EXTENT_METERS.ew,
    INTERSECTION_BOX_EXTENT_METERS.ns
  );
  return {
    occluders,
    groundPlane: { size: maxBoxExtent * 6, y: 0 }
  };
}

export type ProjectPlateUVsInput = {
  angle: PlateCameraAngle;
  aspect: number;
  points: Vector3Tuple[];
  near?: number;
  far?: number;
};

// Pure projection helper: maps world-space proxy points into the calibrated
// plate camera's [0,1] UV square. Used to drape the night plate over the proxy
// boxes (camera-projected UVs) so the result reads as 3D rather than a flat
// plane. Kept GPU-free so it is unit-testable. Points behind the camera or on
// the frustum edge clamp into [0,1] rather than producing NaN.
export function projectPlateUVs(input: ProjectPlateUVsInput): [number, number][] {
  const { angle, aspect, points, near = 0.1, far = 1000 } = input;

  const camera = new PerspectiveCamera(angle.fovDegrees, aspect, near, far);
  camera.position.set(angle.position[0], angle.position[1], angle.position[2]);
  camera.updateProjectionMatrix();

  const target = new Vector3(angle.target[0], angle.target[1], angle.target[2]);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);

  const viewProjection = new Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );

  const work = new Vector3();

  return points.map((point) => {
    work.set(point[0], point[1], point[2]).applyMatrix4(viewProjection);
    // applyMatrix4 on a Vector3 performs the perspective divide internally.
    const u = clampUnit(work.x * 0.5 + 0.5);
    const v = clampUnit(work.y * 0.5 + 0.5);
    return [u, v];
  });
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, value));
}
