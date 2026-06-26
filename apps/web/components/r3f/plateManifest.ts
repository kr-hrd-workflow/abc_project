import { getR3FAssetEntry, type R3FAssetEntry } from "./assetManifest";

// Each fixed plate camera angle maps to exactly one generated background plate
// (spec: fixed/few angles). The runtime plate layer resolves the texture entry
// for the active angle through this map so the manifest stays the single source
// of truth for the plate path, provenance, and budget.
export const PLATE_ASSET_ID_BY_ANGLE: Record<string, string> = {
  "operator-wide": "plates/gangnam_night_operator_wide",
  "operator-cctv": "plates/gangnam_night_operator_cctv"
};

// Daytime variant per angle: img2img-derived from the night plate, identical
// layout. The night map above stays the default so callers without a time
// argument resolve the night plate (back-compatible).
export const DAY_PLATE_ASSET_ID_BY_ANGLE: Record<string, string> = {
  "operator-wide": "plates/gangnam_day_operator_wide",
  "operator-cctv": "plates/gangnam_day_operator_cctv"
};

export function getPlateEntry(
  angleId: string,
  timeOfDay: "day" | "night" = "night"
): R3FAssetEntry {
  const map =
    timeOfDay === "day" ? DAY_PLATE_ASSET_ID_BY_ANGLE : PLATE_ASSET_ID_BY_ANGLE;
  const assetId = map[angleId];

  if (!assetId) {
    throw new Error(`No plate mapped for camera angle: ${angleId}`);
  }

  return getR3FAssetEntry(assetId);
}
