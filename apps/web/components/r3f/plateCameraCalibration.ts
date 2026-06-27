import { STAGE5_CAMERA, type Vector3Tuple } from "./roadGeometry";

export type PlateCameraAngle = {
  id: string;
  position: Vector3Tuple;
  target: Vector3Tuple;
  fovDegrees: number;
  // Calibration offset in plate-UV space, applied AFTER the COVER AR fit.
  // Corrects AI-plate framing drift vs. the procedural guide camera. Units are
  // fractions of the plate image (same as texture UV). Both components positive
  // = sample further right / further up in the plate (shifts the displayed
  // plate content left / down on the canvas). Zero means no correction needed.
  calibrationOffset: [number, number];
  // Plate image aspect ratio (width / height). All current plates are 1536×1024.
  // Used by the COVER shader to fill the canvas without AR distortion.
  plateAspect: number;
};

// Few fixed angles only (spec: fixed/few angles). The guide render, imagegen
// framing, and runtime plate all use these exact values so the plate aligns
// with the procedural fallback and the SUMO-aligned dynamic layer.
export const PLATE_CAMERA_ANGLES: PlateCameraAngle[] = [
  {
    id: "operator-wide",
    position: STAGE5_CAMERA.position,
    target: STAGE5_CAMERA.target,
    fovDegrees: STAGE5_CAMERA.fov,
    plateAspect: 1536 / 1024, // = 1.5
    // SP4 calibration (2026-06-27): intersection-centre drift measured as
    // −52 px X, +40 px Y (image coords) after COVER fit.
    // offset_x = 52 / (canvas_H × plateAspect) = 52 / (680 × 1.5) ≈ 0.051
    // offset_y = 40 / canvas_H = 40 / 680 ≈ 0.059
    calibrationOffset: [0.051, 0.059]
  },
  // Low, oblique CCTV-style pole view of the same intersection. Its plate was
  // generated from a structural guide rendered at these camera params, so the
  // runtime camera matches the plate. The low angle makes traffic signals
  // readable (the project's signal-control purpose).
  {
    id: "operator-cctv",
    position: [38, 20, 44],
    target: [-4, 1, -14],
    fovDegrees: 50,
    plateAspect: 1536 / 1024, // = 1.5
    // CCTV camera exactly matches the plate calibration → expect near-zero drift.
    // Set to [0, 0] until empirical COVER-corrected measurement is available.
    calibrationOffset: [0, 0]
  }
];

export function getPlateCameraAngle(id: string): PlateCameraAngle {
  const angle = PLATE_CAMERA_ANGLES.find((candidate) => candidate.id === id);
  if (!angle) {
    throw new Error(`Unknown plate camera angle: ${id}`);
  }
  return angle;
}
