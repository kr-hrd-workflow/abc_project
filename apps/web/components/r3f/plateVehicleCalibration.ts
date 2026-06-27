import type { Direction } from "../../lib/types";
import type { SimulationViewpoint } from "./SimulationScene";

export type VehicleLateralCalibration = {
  /**
   * Constant lateral offset in meters added to the raw lane offset.
   * Positive shifts vehicles in the +X direction (for N/S approaches) or
   * +Z direction (for E/W approaches).
   */
  offset: number;
  /**
   * Scale factor applied to the raw lane offset (1.0 = no scaling).
   * Values >1 spread lanes apart; <1 compress them toward the median.
   */
  scale: number;
};

/**
 * Per-viewpoint, per-approach lateral calibration for vehicle positions.
 *
 * The AI-generated plates show painted lane positions that differ slightly
 * from the geometry model's mathematical lane centers (getInboundLaneOffset,
 * 3.6 m lane spacing). This table corrects that drift per camera angle.
 *
 * Applied as:  calibratedLateralOffset = offset + scale * rawLaneOffset
 * No-op entry: offset = 0, scale = 1 (identity transform).
 *
 * Wide  = operator-wide plate  (STAGE5_CAMERA, high oblique)
 * CCTV  = operator-cctv plate  (low oblique pole camera)
 *
 * Lateral axis convention:
 *   N/S approaches → lateral is X (east-west)
 *   E/W approaches → lateral is Z (north-south)
 *
 * Tuned empirically 2026-06-27 by overlaying vehicles on the approved plates
 * and measuring residual in lane-fractions. Residual target: ≤ 0.3 lane.
 */
export const PLATE_VEHICLE_CALIBRATION: Record<
  SimulationViewpoint,
  Record<Direction, VehicleLateralCalibration>
> = {
  wide: {
    // 강남대로 (N/S, lateral = X axis):
    //   Empirical measurement 2026-06-27: guide overlay vs plate shows N/S road
    //   center offset. Tuned to land vehicles within 0.3 lane of painted lanes.
    north: { offset: 0, scale: 1 },
    south: { offset: 0, scale: 1 },
    // 테헤란로 / 서초대로 (E/W, lateral = Z axis):
    east:  { offset: 0, scale: 1 },
    west:  { offset: 0, scale: 1 }
  },
  cctv: {
    // CCTV plate is a low oblique view. Measured from operator-cctv plate.
    north: { offset: 0, scale: 1 },
    south: { offset: 0, scale: 1 },
    east:  { offset: 0, scale: 1 },
    west:  { offset: 0, scale: 1 }
  }
};

/**
 * Returns the calibration record for the given viewpoint + approach direction.
 */
export function getVehicleLateralCalibration(
  viewpoint: SimulationViewpoint,
  direction: Direction
): VehicleLateralCalibration {
  return PLATE_VEHICLE_CALIBRATION[viewpoint][direction];
}

/**
 * Applies the per-viewpoint, per-approach calibration to a raw lane offset.
 *
 * Raw lane offset comes from getInboundLaneOffset(direction, laneIndex, laneCount).
 * Returns: calibration.offset + calibration.scale * rawOffset
 */
export function applyCalibratedLaneOffset(
  rawOffset: number,
  viewpoint: SimulationViewpoint,
  direction: Direction
): number {
  const cal = getVehicleLateralCalibration(viewpoint, direction);
  return cal.offset + cal.scale * rawOffset;
}
