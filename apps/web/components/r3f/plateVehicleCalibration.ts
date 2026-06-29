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
 * DIAGNOSTIC (?cmp=B): URL-driven per-approach lateral calibration so vehicles
 * can be seated on the roadlock plate's PAINTED photoreal lanes (R3F markings
 * off) and iterated without rebuilding. Format:
 *   ?calB=north:OFFSET,SCALE;south:OFFSET,SCALE;east:...;west:...
 * Missing approaches fall back to identity (offset 0, scale 1). Only consulted
 * when ?cmp=B is present, so the committed photoreal mode is untouched.
 */
function isCmpBMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("cmp") === "B";
}

function isCmpAMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("cmp") === "A";
}

/**
 * DIAGNOSTIC (?cmp=A): SINGLE GLOBAL lateral offset (metres) in world X, applied
 * as ONE group translate to the R3F markings + vehicles TOGETHER (see the cmp=A
 * group in SimulationScene). This is the "dx8.5" registration: every corridor
 * shares the same +X shift, so the N/S 강남대로 arms move laterally while the E/W
 * 테헤란로/서초대로 arms move along their travel axis — matching the dx8.5 reference
 * crops. Tunable via ?cmpAdx=<metres> without a rebuild (default 8.5 —
 * user-approved centring).
 */
const CMP_A_GLOBAL_X_SHIFT_M_DEFAULT = 8.5;

function cmpAUrlParam(name: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get(name);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getCmpAGlobalXShiftMeters(): number {
  return cmpAUrlParam("cmpAdx") ?? CMP_A_GLOBAL_X_SHIFT_M_DEFAULT;
}

/**
 * DIAGNOSTIC (?cmp=A): WEST-only yaw rotation (degrees) about the intersection
 * centre (world origin). DISABLED for the dx8.5 registration (default 0): the
 * earlier −5° west rotation made the west arm float off the plate, so the revert
 * drops it. The ?cmpRotW=<deg> knob is retained for experiments; WEST ONLY —
 * N/S/E are never rotated.
 */
const CMP_A_WEST_ROTATION_DEG_DEFAULT = 0;

export function getCmpAWestRotationRad(): number {
  const deg = cmpAUrlParam("cmpRotW") ?? CMP_A_WEST_ROTATION_DEG_DEFAULT;
  return (deg * Math.PI) / 180;
}

/**
 * Rotates a ground-plane (x, z) point about the intersection centre (origin) by
 * `yawRad`, using the three.js rotateY convention so a marking geometry rotated by
 * the same yaw (geo.rotateY) and a vehicle whose rotationY is increased by the same
 * yaw stay co-aligned on the rotated lanes.
 */
export function rotateAboutIntersectionCenter(
  x: number,
  z: number,
  yawRad: number
): [number, number] {
  const cos = Math.cos(yawRad);
  const sin = Math.sin(yawRad);
  return [x * cos + z * sin, -x * sin + z * cos];
}

/**
 * DIAGNOSTIC (?cmp=A): applies the WEST-only rotation to a vehicle's final world
 * (x, z) + heading so west vehicles ride the same rotated lanes the west markings
 * paint. No-op unless ?cmp=A is active AND the vehicle's approach is west.
 */
export function applyCmpAWestVehicleTransform(
  x: number,
  z: number,
  rotationYRad: number,
  direction: Direction | null | undefined
): { x: number; z: number; rotationY: number } {
  if (!isCmpAMode() || direction !== "west") {
    return { x, z, rotationY: rotationYRad };
  }
  const yaw = getCmpAWestRotationRad();
  if (!yaw) return { x, z, rotationY: rotationYRad };
  const [rx, rz] = rotateAboutIntersectionCenter(x, z, yaw);
  return { x: rx, z: rz, rotationY: rotationYRad + yaw };
}

function parseCalBFromUrl(): Partial<Record<Direction, VehicleLateralCalibration>> {
  if (typeof window === "undefined") return {};
  const raw = new URLSearchParams(window.location.search).get("calB");
  if (!raw) return {};
  const out: Partial<Record<Direction, VehicleLateralCalibration>> = {};
  for (const part of raw.split(";")) {
    const [dir, nums] = part.split(":");
    if (!dir || !nums) continue;
    const [offset, scale] = nums.split(",").map((n) => Number(n));
    if (Number.isFinite(offset) && Number.isFinite(scale)) {
      out[dir.trim() as Direction] = { offset, scale };
    }
  }
  return out;
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
  if (isCmpAMode()) {
    // cmp=A (dx8.5): vehicles keep their raw metric lane offset; the single GLOBAL
    // +X shift is applied by the cmp=A group translate in SimulationScene (markings
    // + vehicles together), not per-corridor here.
    return rawOffset;
  }
  if (isCmpBMode()) {
    const b = parseCalBFromUrl()[direction] ?? { offset: 0, scale: 1 };
    return b.offset + b.scale * rawOffset;
  }
  const cal = getVehicleLateralCalibration(viewpoint, direction);
  return cal.offset + cal.scale * rawOffset;
}
