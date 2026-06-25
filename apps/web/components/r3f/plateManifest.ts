import { getR3FAssetEntry, type R3FAssetEntry } from "./assetManifest";

// Each fixed plate camera angle maps to exactly one generated background plate
// (spec: fixed/few angles). The runtime plate layer resolves the texture entry
// for the active angle through this map so the manifest stays the single source
// of truth for the plate path, provenance, and budget.
export const PLATE_ASSET_ID_BY_ANGLE: Record<string, string> = {
  "operator-wide": "plates/gangnam_night_operator_wide"
};

export function getPlateEntry(angleId: string): R3FAssetEntry {
  const assetId = PLATE_ASSET_ID_BY_ANGLE[angleId];

  if (!assetId) {
    throw new Error(`No plate mapped for camera angle: ${angleId}`);
  }

  return getR3FAssetEntry(assetId);
}
