import { describe, expect, test } from "vitest";
import {
  computeHeroBuildingHeight,
  coverFitUv,
  heroFaceTexturePath,
  HERO_BUILDINGS
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

describe("HERO_BUILDINGS face mapping", () => {
  test("every hero building maps all four face keys to a distinct box group", () => {
    for (const hero of HERO_BUILDINGS) {
      const groups = Object.values(hero.faceToGroup);
      expect(new Set(groups).size).toBe(4);
    }
  });
});
