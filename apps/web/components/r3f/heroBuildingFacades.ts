// Hero building facades — a small set of prominent buildings rendered as a
// single box with a DISTINCT imagegen photo per real-world wall (front/left/
// right/back), instead of the same elevation image repeated on all sides.
// The box height is derived from the front photo's pixel aspect ratio so the
// 3D geometry matches the photo's real proportions rather than stretching the
// photo onto an arbitrary footprint height.

export type HeroFaceKey = "front" | "left" | "right" | "back" | "top";

/** BoxGeometry material-group index: 0:+x, 1:-x, 2:+y, 3:-y, 4:+z, 5:-z
 * (matches the face-order convention documented at faceSpans() below). */
export type BoxFaceGroup = 0 | 1 | 2 | 4 | 5;

export type HeroBuildingSpec = {
  id: string;
  /** Filename prefix for this building's generated face textures. */
  prefix: string;
  /** Which BoxGeometry face group each hero view lands on — building-specific,
   * derived from which real-world wall each photo was generated to depict. */
  faceToGroup: Record<HeroFaceKey, BoxFaceGroup>;
};

export const HERO_BUILDINGS: HeroBuildingSpec[] = [
  {
    id: "nw-corner-megabox",
    prefix: "nw",
    // Corner block at (-x,-z): +z (south, toward the intersection) is the main
    // frontage; +x (east) faces the cross street; -x/-z are the quiet sides.
    // top is always BoxGeometry group 2 (+y) regardless of building orientation.
    faceToGroup: { front: 4, back: 5, right: 0, left: 1, top: 2 }
  },
  {
    id: "ne-corner-commercial",
    prefix: "ne",
    // Corner block at (+x,-z): +z (south) is the main frontage; -x (west)
    // faces the cross street toward the intersection.
    faceToGroup: { front: 4, back: 5, left: 0, right: 1, top: 2 }
  },
  {
    id: "se-corner-retail",
    prefix: "se",
    // Corner block at (+x,+z): -z (north, toward the intersection) is the main
    // frontage; -x (west) faces the cross street toward the intersection.
    faceToGroup: { front: 5, back: 4, left: 0, right: 1, top: 2 }
  },
  {
    id: "sw-corner-retail",
    prefix: "sw",
    // Corner block at (-x,+z): -z (north) is the main frontage; +x (east)
    // faces the cross street toward the intersection.
    faceToGroup: { front: 5, back: 4, left: 1, right: 0, top: 2 }
  },
  // ── 강남대로 avenue-frontage pool buildings — front faces the avenue along X,
  // since the avenue itself runs north-south along Z. West-side blocks (x<0)
  // front toward +x (group 0); east-side blocks (x>0) front toward -x (group
  // 1). left/right (the short N/S end-caps) are the z-facing groups.
  {
    id: "gangnam-n-west-commercial",
    prefix: "gangnam-n-west-commercial",
    faceToGroup: { front: 0, back: 1, left: 5, right: 4, top: 2 }
  },
  {
    id: "gangnam-n-east-commercial",
    prefix: "gangnam-n-east-commercial",
    faceToGroup: { front: 1, back: 0, left: 5, right: 4, top: 2 }
  },
  {
    id: "gangnam-s-west-commercial",
    prefix: "gangnam-s-west-commercial",
    faceToGroup: { front: 0, back: 1, left: 5, right: 4, top: 2 }
  },
  {
    id: "gangnam-s-east-commercial",
    prefix: "gangnam-s-east-commercial",
    faceToGroup: { front: 1, back: 0, left: 5, right: 4, top: 2 }
  },
  {
    id: "gangnam-n-west-fill",
    prefix: "gangnam-n-west-fill",
    faceToGroup: { front: 0, back: 1, left: 5, right: 4, top: 2 }
  },
  {
    id: "gangnam-n-east-fill",
    prefix: "gangnam-n-east-fill",
    faceToGroup: { front: 1, back: 0, left: 5, right: 4, top: 2 }
  },
  {
    id: "gangnam-s-west-fill",
    prefix: "gangnam-s-west-fill",
    faceToGroup: { front: 0, back: 1, left: 5, right: 4, top: 2 }
  },
  {
    id: "gangnam-s-east-fill",
    prefix: "gangnam-s-east-fill",
    faceToGroup: { front: 1, back: 0, left: 5, right: 4, top: 2 }
  },
  // ── 테헤란로/서초대로 avenue-frontage pool buildings — those avenues run
  // east-west along X, so front faces the avenue along Z instead. North-side
  // blocks (z<0) front toward +z (group 4); south-side blocks (z>0) front
  // toward -z (group 5). left/right are the x-facing groups.
  {
    id: "teheran-frontage-n1",
    prefix: "teheran-frontage-n1",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "teheran-frontage-s1",
    prefix: "teheran-frontage-s1",
    faceToGroup: { front: 5, back: 4, left: 1, right: 0, top: 2 }
  },
  {
    id: "seocheo-w-mid",
    prefix: "seocheo-w-mid",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "seocheo-n1",
    prefix: "seocheo-n1",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "seocheo-s1",
    prefix: "seocheo-s1",
    faceToGroup: { front: 5, back: 4, left: 1, right: 0, top: 2 }
  },
  {
    id: "seocheo-s2",
    prefix: "seocheo-s2",
    faceToGroup: { front: 5, back: 4, left: 1, right: 0, top: 2 }
  },
  // ── Glass towers — background/receding corporate skyline, previously shared
  // tiled glass + flat dark crown. All default to the same simple front:+z
  // orientation (unlike the avenue-frontage buildings, these aren't tied to a
  // specific street wall, so precise compass orientation isn't load-bearing).
  {
    id: "samsung-town-main",
    prefix: "samsung-town-main",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "samsung-town-c2",
    prefix: "samsung-town-c2",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "samsung-town-c3",
    prefix: "samsung-town-c3",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "gt-tower",
    prefix: "gt-tower",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "meritz-tower",
    prefix: "meritz-tower",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "teheran-e1-near",
    prefix: "teheran-e1-near",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "teheran-e2",
    prefix: "teheran-e2",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "teheran-e3",
    prefix: "teheran-e3",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "teheran-e4-far",
    prefix: "teheran-e4-far",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "teheran-frontage-s2",
    prefix: "teheran-frontage-s2",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "teheran-frontage-n2",
    prefix: "teheran-frontage-n2",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "teheran-frontage-n3",
    prefix: "teheran-frontage-n3",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  },
  {
    id: "teheran-frontage-s3",
    prefix: "teheran-frontage-s3",
    faceToGroup: { front: 4, back: 5, left: 1, right: 0, top: 2 }
  }
];

export const HERO_BUILDING_IDS = new Set(HERO_BUILDINGS.map((h) => h.id));

const HERO_FACE_KEYS: HeroFaceKey[] = ["front", "left", "right", "back", "top"];

export function heroFaceTexturePath(prefix: string, face: HeroFaceKey): string {
  return `/simulation/r3f/assets/textures/hero/${prefix}_${face}.webp`;
}

/** Every hero face texture path, in a stable order matching HERO_BUILDINGS ×
 * HERO_FACE_KEYS — callers index back into this with the same nested loop. */
export function allHeroFaceTexturePaths(): string[] {
  return HERO_BUILDINGS.flatMap((h) =>
    HERO_FACE_KEYS.map((f) => heroFaceTexturePath(h.prefix, f))
  );
}

export { HERO_FACE_KEYS };

/**
 * Derives the hero building's render height from its FRONT texture's pixel
 * aspect ratio: the 3D box grows/shrinks to match the photo's real
 * proportions instead of stretching the photo onto an arbitrary footprint
 * height.
 */
export function computeHeroBuildingHeight(
  frontFaceWidthMeters: number,
  frontImagePixelSize: readonly [number, number]
): number {
  const [imgW, imgH] = frontImagePixelSize;
  return frontFaceWidthMeters * (imgH / imgW);
}

/**
 * A BoxGeometry face's real-world 2D span depends on which plane it lies in,
 * not on its semantic name — a building whose "front" wall faces along X
 * (groups 0/1, e.g. an avenue-frontage block sideways to the intersection)
 * spans (depth, height), while one facing Z (groups 4/5, the intersection
 * corners) spans (width, height). Always call this with the face's actual
 * BoxGeometry group rather than assuming front/back == width.
 */
export function boxFaceGroupRealSize(
  group: BoxFaceGroup,
  widthMeters: number,
  heightMeters: number,
  depthMeters: number
): [number, number] {
  if (group === 0 || group === 1) return [depthMeters, heightMeters];
  if (group === 2) return [widthMeters, depthMeters];
  return [widthMeters, heightMeters];
}

/**
 * "Cover"-style UV fit for a non-front hero face: crops the image to the
 * face's real-world aspect ratio instead of stretching it — only the front
 * face's aspect drives the box height (computeHeroBuildingHeight), so a side/
 * back photo with a different aspect would otherwise squash or stretch
 * visibly when mapped onto the shared box height with default 0–1 UVs.
 */
export function coverFitUv(
  faceWidthMeters: number,
  faceHeightMeters: number,
  imagePixelSize: readonly [number, number]
): { repeat: [number, number]; offset: [number, number] } {
  const faceAspect = faceWidthMeters / faceHeightMeters;
  const [imgW, imgH] = imagePixelSize;
  const imageAspect = imgW / imgH;

  if (imageAspect > faceAspect) {
    // Image is relatively wider than the face slot: crop the sides.
    const repeatU = faceAspect / imageAspect;
    return { repeat: [repeatU, 1], offset: [(1 - repeatU) / 2, 0] };
  }
  if (imageAspect < faceAspect) {
    // Image is relatively taller than the face slot: crop top/bottom.
    const repeatV = imageAspect / faceAspect;
    return { repeat: [1, repeatV], offset: [0, (1 - repeatV) / 2] };
  }
  return { repeat: [1, 1], offset: [0, 0] };
}
