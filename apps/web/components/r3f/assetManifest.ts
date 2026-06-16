import manifestJson from "../../public/simulation/r3f/assets/manifest.json";

export type R3FAssetKind = "vehicle" | "prop" | "texture" | "decal";
export type R3FAssetLod = "hero" | "near" | "medium" | "far" | "material" | "decal";
export type R3FAssetPath = `/simulation/r3f/assets/${string}`;
export type R3FAssetId = keyof typeof manifestJson & string;

export type R3FAssetEntry = {
  readonly id: R3FAssetId;
  readonly path: R3FAssetPath;
  readonly kind: R3FAssetKind;
  readonly source: string;
  readonly license: string;
  readonly units: "meters";
  readonly pbr: boolean;
  readonly lod: R3FAssetLod;
  readonly maxTextureSize: number;
  readonly maxTriangles: number;
  readonly maxFileSizeBytes: number;
  readonly lodGroup?: string;
  readonly lowerDetailId?: R3FAssetId;
  readonly densityEligible?: boolean;
  readonly allowNonPowerOfTwo?: boolean;
  readonly nonPowerOfTwoReason?: string;
};

export type R3FAssetManifest = {
  readonly [AssetId in R3FAssetId]: R3FAssetEntry & { readonly id: AssetId };
};

export const R3F_ASSET_MANIFEST = manifestJson as R3FAssetManifest;

export function listR3FAssetEntries(): R3FAssetEntry[] {
  return Object.values(R3F_ASSET_MANIFEST);
}

export function getR3FAssetEntry<AssetId extends R3FAssetId>(
  assetId: AssetId
): R3FAssetManifest[AssetId];
export function getR3FAssetEntry(assetId: string): R3FAssetEntry;
export function getR3FAssetEntry(assetId: string): R3FAssetEntry {
  const entry = R3F_ASSET_MANIFEST[assetId as R3FAssetId];

  if (!entry) {
    throw new Error(`Unknown R3F asset manifest id: ${assetId}`);
  }

  return entry;
}

export function listR3FAssetsByKind(kind: R3FAssetKind): R3FAssetEntry[] {
  return listR3FAssetEntries().filter((asset) => asset.kind === kind);
}
