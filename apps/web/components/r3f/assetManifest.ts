import manifestJson from "../../public/simulation/r3f/assets/manifest.json";

export type R3FAssetKind = "vehicle" | "prop" | "texture" | "decal" | "sprite";
export type R3FAssetLod =
  | "hero"
  | "near"
  | "medium"
  | "far"
  | "material"
  | "decal"
  | "atlas";
export type R3FAssetPath = `/simulation/r3f/assets/${string}`;
export type R3FAssetId = keyof typeof manifestJson & string;
export type R3FVehicleLodTier = "hero" | "near" | "medium" | "far";
export type R3FAssetRealismStatus =
  | "stage4_1_ready"
  | "stage6_finishing_source_ready";
export type R3FAssetAuthorship = "project-authored" | "generated" | "third-party";
export type R3FAssetPbrChannel =
  | "alpha"
  | "ambientOcclusion"
  | "baseColor"
  | "baseColorFactor"
  | "emissive"
  | "metallic"
  | "metallicFactor"
  | "normal"
  | "roughness"
  | "roughnessFactor"
  | "sourceColor";

export type R3FAssetCompression = {
  readonly status:
    | "meshopt-or-draco-compressed"
    | "ktx2-compressed"
    | "png-alpha-runtime"
    | "png-source-atlas"
    | "webp-runtime"
    | "uncompressed-under-budget";
  readonly geometry: string;
  readonly texture: string;
  readonly evidence: string;
};

export type R3FAssetDetails = {
  readonly provenance?: string;
  readonly [detailKey: string]: unknown;
};

export type R3FAssetEntry = {
  readonly id: R3FAssetId;
  readonly path: R3FAssetPath;
  readonly kind: R3FAssetKind;
  readonly source: string;
  readonly license: string;
  readonly authorship: R3FAssetAuthorship;
  readonly units: "meters";
  readonly pbr: boolean;
  readonly lod: R3FAssetLod;
  readonly maxTextureSize: number;
  readonly maxTriangles: number;
  readonly maxFileSizeBytes: number;
  readonly pbrChannels: readonly R3FAssetPbrChannel[];
  readonly compression: R3FAssetCompression;
  readonly provenanceEvidencePath: string;
  readonly runtimeUsage?: string | readonly string[];
  readonly realismStatus?: R3FAssetRealismStatus;
  readonly visualRejectIfToyLike?: boolean;
  readonly realisticSilhouette?: boolean;
  readonly details?: R3FAssetDetails;
  readonly lodGroup?: string;
  readonly lowerDetailId?: R3FAssetId;
  readonly missingLodTierReasons?: Readonly<
    Partial<Record<R3FVehicleLodTier, string>>
  >;
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

export function getR3FAssetEntry(assetId: string): R3FAssetEntry {
  const entry = R3F_ASSET_MANIFEST[assetId as R3FAssetId];

  if (!entry) {
    throw new Error(`Unknown R3F asset manifest id: ${assetId}`);
  }

  return entry;
}
