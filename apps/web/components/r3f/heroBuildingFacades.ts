// Hero building facades — a small set of prominent buildings rendered as a
// single box with a DISTINCT imagegen photo per real-world wall (front/left/
// right/back), instead of the same elevation image repeated on all sides.
// The box height is derived from the front photo's pixel aspect ratio so the
// 3D geometry matches the photo's real proportions rather than stretching the
// photo onto an arbitrary footprint height.

export type HeroFaceKey = "front" | "left" | "right" | "back";

/** BoxGeometry material-group index: 0:+x, 1:-x, 2:+y, 3:-y, 4:+z, 5:-z
 * (matches the face-order convention documented at faceSpans() below). */
export type BoxFaceGroup = 0 | 1 | 4 | 5;

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
    faceToGroup: { front: 4, back: 5, right: 0, left: 1 }
  },
  {
    id: "ne-corner-commercial",
    prefix: "ne",
    // Corner block at (+x,-z): +z (south) is the main frontage; -x (west)
    // faces the cross street toward the intersection.
    faceToGroup: { front: 4, back: 5, left: 0, right: 1 }
  }
];

export const HERO_BUILDING_IDS = new Set(HERO_BUILDINGS.map((h) => h.id));

const HERO_FACE_KEYS: HeroFaceKey[] = ["front", "left", "right", "back"];

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
