import type { Stage6TimeOfDay } from "./stage6Quality";

export type SeamlessGrade = {
  toneMappingExposure: number;
  neonColor: string;
  environmentIntensity: number;
  bloomIntensity: number;
  vehicleEmissiveIntensity: number;
};

// Tuned to the Gangnam night-neon plate. The dynamic layer reads these so cars
// share the plate's exposure, neon cast, and bloom (no per-layer ad hoc look).
export const GANGNAM_NIGHT_GRADE: SeamlessGrade = {
  toneMappingExposure: 0.85,
  neonColor: "#2e6cff",
  environmentIntensity: 0.34,
  // The plate is already a finished photo with baked glow; keep bloom modest so
  // the dense distant neon does not wash the upper frame into a milky haze.
  bloomIntensity: 0.4,
  vehicleEmissiveIntensity: 1.6
};

const DAY_GRADE: SeamlessGrade = {
  toneMappingExposure: 1.0,
  neonColor: "#ffffff",
  environmentIntensity: 0.74,
  bloomIntensity: 0.4,
  vehicleEmissiveIntensity: 0.2
};

export function getSeamlessGrade(timeOfDay: Stage6TimeOfDay): SeamlessGrade {
  return timeOfDay === "night" ? GANGNAM_NIGHT_GRADE : DAY_GRADE;
}
