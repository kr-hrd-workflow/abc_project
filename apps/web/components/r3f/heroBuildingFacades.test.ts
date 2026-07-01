import { describe, expect, test } from "vitest";
import {
  boxFaceGroupRealSize,
  computeHeroBuildingHeight,
  coverFitUv,
  heroFaceTexturePath,
  HERO_BUILDINGS,
  HERO_FACE_KEYS
} from "./heroBuildingFacades";

describe("computeHeroBuildingHeight", () => {
  test("derives height from the front image's pixel aspect ratio", () => {
    // 40m-wide face, 1024x1536 portrait photo (aspect 2:3) -> height = 40 * 1536/1024 = 60
    expect(computeHeroBuildingHeight(40, [1024, 1536])).toBeCloseTo(60);
  });

  test("a square image yields a square-aspect building face", () => {
    expect(computeHeroBuildingHeight(20, [1000, 1000])).toBeCloseTo(20);
  });
});

describe("heroFaceTexturePath", () => {
  test("builds the expected public asset path", () => {
    expect(heroFaceTexturePath("nw", "front")).toBe(
      "/simulation/r3f/assets/textures/hero/nw_front.webp"
    );
  });

  test("builds the expected public asset path for the top face", () => {
    expect(heroFaceTexturePath("nw", "top")).toBe(
      "/simulation/r3f/assets/textures/hero/nw_top.webp"
    );
  });
});

describe("coverFitUv", () => {
  test("matching aspect ratios need no crop", () => {
    // face 38x60 (aspect 0.633) vs an image with the same aspect
    const fit = coverFitUv(38, 60, [1000, 1580]);
    expect(fit.repeat[0]).toBeCloseTo(1, 2);
    expect(fit.repeat[1]).toBeCloseTo(1, 2);
    expect(fit.offset[0]).toBeCloseTo(0, 2);
    expect(fit.offset[1]).toBeCloseTo(0, 2);
  });

  test("an image narrower than the face crops top/bottom, not left/right", () => {
    // face aspect 0.633 (38/60); image aspect 697/1463 = 0.476 (taller/narrower)
    const fit = coverFitUv(38, 60, [697, 1463]);
    expect(fit.repeat[0]).toBeCloseTo(1, 2); // full width shown
    expect(fit.repeat[1]).toBeLessThan(1); // vertically cropped, not stretched
    expect(fit.offset[1]).toBeCloseTo((1 - fit.repeat[1]) / 2, 5);
  });

  test("an image wider than the face crops left/right, not top/bottom", () => {
    const fit = coverFitUv(20, 60, [1200, 1000]); // very wide image on a tall slot
    expect(fit.repeat[1]).toBeCloseTo(1, 2); // full height shown
    expect(fit.repeat[0]).toBeLessThan(1); // horizontally cropped, not stretched
    expect(fit.offset[0]).toBeCloseTo((1 - fit.repeat[0]) / 2, 5);
  });
});

describe("boxFaceGroupRealSize", () => {
  // A face's real-world 2D span depends on which BoxGeometry plane it lies in,
  // NOT on whether it's semantically called "front" or "left" — a building
  // whose front wall faces along X (groups 0/1, e.g. an avenue-frontage block
  // sideways to the intersection) spans (depth, height), not (width, height).
  test("z-facing groups (4,5) span (width, height)", () => {
    expect(boxFaceGroupRealSize(4, 10, 20, 30)).toEqual([10, 20]);
    expect(boxFaceGroupRealSize(5, 10, 20, 30)).toEqual([10, 20]);
  });

  test("x-facing groups (0,1) span (depth, height)", () => {
    expect(boxFaceGroupRealSize(0, 10, 20, 30)).toEqual([30, 20]);
    expect(boxFaceGroupRealSize(1, 10, 20, 30)).toEqual([30, 20]);
  });

  test("top group (2) spans (width, depth)", () => {
    expect(boxFaceGroupRealSize(2, 10, 20, 30)).toEqual([10, 30]);
  });
});

describe("HERO_BUILDINGS face mapping", () => {
  test("every hero building maps all five face keys (incl. top) to a distinct box group", () => {
    for (const hero of HERO_BUILDINGS) {
      const groups = Object.values(hero.faceToGroup);
      expect(new Set(groups).size).toBe(5);
    }
  });

  test("every hero building maps top to BoxGeometry group 2 (+y)", () => {
    for (const hero of HERO_BUILDINGS) {
      expect(hero.faceToGroup.top).toBe(2);
    }
  });

  test("HERO_FACE_KEYS includes top alongside the four side faces", () => {
    expect(new Set(HERO_FACE_KEYS)).toEqual(
      new Set(["front", "left", "right", "back", "top"])
    );
  });

  test("all four intersection corners plus all 14 avenue-frontage pool buildings plus all 13 glass towers are hero buildings", () => {
    const ids = HERO_BUILDINGS.map((h) => h.id);
    expect(new Set(ids)).toEqual(
      new Set([
        "nw-corner-megabox",
        "ne-corner-commercial",
        "se-corner-retail",
        "sw-corner-retail",
        "gangnam-n-west-commercial",
        "gangnam-n-east-commercial",
        "gangnam-s-west-commercial",
        "gangnam-s-east-commercial",
        "gangnam-n-west-fill",
        "gangnam-n-east-fill",
        "gangnam-s-west-fill",
        "gangnam-s-east-fill",
        "teheran-frontage-n1",
        "teheran-frontage-s1",
        "samsung-town-main",
        "samsung-town-c2",
        "samsung-town-c3",
        "gt-tower",
        "meritz-tower",
        "teheran-e1-near",
        "teheran-e2",
        "teheran-e3",
        "teheran-e4-far",
        "teheran-frontage-s2",
        "teheran-frontage-n2",
        "teheran-frontage-n3",
        "teheran-frontage-s3",
        "seocheo-w-mid",
        "seocheo-n1",
        "seocheo-s1",
        "seocheo-s2"
      ])
    );
  });

  test("west-side gangnam frontage buildings front the avenue via +x (group 0)", () => {
    for (const id of [
      "gangnam-n-west-commercial",
      "gangnam-s-west-commercial",
      "gangnam-n-west-fill",
      "gangnam-s-west-fill"
    ]) {
      const hero = HERO_BUILDINGS.find((h) => h.id === id);
      expect(hero?.faceToGroup.front).toBe(0);
      expect(hero?.faceToGroup.back).toBe(1);
    }
  });

  test("east-side gangnam frontage buildings front the avenue via -x (group 1)", () => {
    for (const id of [
      "gangnam-n-east-commercial",
      "gangnam-s-east-commercial",
      "gangnam-n-east-fill",
      "gangnam-s-east-fill"
    ]) {
      const hero = HERO_BUILDINGS.find((h) => h.id === id);
      expect(hero?.faceToGroup.front).toBe(1);
      expect(hero?.faceToGroup.back).toBe(0);
    }
  });

  test("teheran/seocheo frontage buildings front their avenue along z, opposite on north vs south side", () => {
    const northSide = ["teheran-frontage-n1", "seocheo-w-mid", "seocheo-n1"];
    const southSide = ["teheran-frontage-s1", "seocheo-s1", "seocheo-s2"];
    for (const id of northSide) {
      const hero = HERO_BUILDINGS.find((h) => h.id === id);
      expect(hero?.faceToGroup.front).toBe(4);
      expect(hero?.faceToGroup.back).toBe(5);
    }
    for (const id of southSide) {
      const hero = HERO_BUILDINGS.find((h) => h.id === id);
      expect(hero?.faceToGroup.front).toBe(5);
      expect(hero?.faceToGroup.back).toBe(4);
    }
  });

  test("se/sw corners face the intersection on the opposite z side from nw/ne", () => {
    const se = HERO_BUILDINGS.find((h) => h.id === "se-corner-retail");
    const sw = HERO_BUILDINGS.find((h) => h.id === "sw-corner-retail");
    // nw/ne sit north (-z) of the intersection and front toward +z (group 4);
    // se/sw sit south (+z) so must front toward -z (group 5) instead.
    expect(se?.faceToGroup.front).toBe(5);
    expect(se?.faceToGroup.back).toBe(4);
    expect(sw?.faceToGroup.front).toBe(5);
    expect(sw?.faceToGroup.back).toBe(4);
  });
});
