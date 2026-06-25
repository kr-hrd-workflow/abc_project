import { STAGE5_CAMERA, type Vector3Tuple } from "./roadGeometry";

export type PlateCameraAngle = {
  id: string;
  position: Vector3Tuple;
  target: Vector3Tuple;
  fovDegrees: number;
};

// Few fixed angles only (spec: fixed/few angles). The guide render, imagegen
// framing, and runtime plate all use these exact values so the plate aligns
// with the procedural fallback and the SUMO-aligned dynamic layer.
export const PLATE_CAMERA_ANGLES: PlateCameraAngle[] = [
  {
    id: "operator-wide",
    position: STAGE5_CAMERA.position,
    target: STAGE5_CAMERA.target,
    fovDegrees: STAGE5_CAMERA.fov
  }
];

export function getPlateCameraAngle(id: string): PlateCameraAngle {
  const angle = PLATE_CAMERA_ANGLES.find((candidate) => candidate.id === id);
  if (!angle) {
    throw new Error(`Unknown plate camera angle: ${id}`);
  }
  return angle;
}
