// @vitest-environment jsdom

// ScenePostFX wraps EffectComposer which requires a real WebGL Canvas context.
// In jsdom the guard returns null regardless of quality preset — that is by design
// (the test environment lacks WebGL). The gate behaviour (low=null, others=composer)
// is verified at the render level via the verify harness (headless Chromium + WebGL).
// Here we verify the export shape, displayName, and low-quality null path.

import { describe, expect, it } from "vitest";

import {
  ScenePostFX,
  canUsePostProcessingComposer
} from "./ScenePostFX";
import { getStage6QualityPreset } from "./stage6Quality";

describe("ScenePostFX", () => {
  it("has ScenePostFX displayName", () => {
    expect(ScenePostFX.displayName).toBe("ScenePostFX");
  });

  it("returns null for low quality (postFx off) — off before jsdom guard", () => {
    // Low quality exits before the jsdom guard, so it returns null for the
    // right reason (preset.enabled = false).
    const element = ScenePostFX({
      timeOfDay: "day",
      qualityPreset: getStage6QualityPreset("low")
    });

    expect(element).toBeNull();
  });

  it("returns null in jsdom for high quality day (jsdom guard — no WebGL Canvas)", () => {
    // jsdom has no real WebGL Canvas. ScenePostFX guards EffectComposer from
    // being mounted without a Canvas context and returns null instead.
    const element = ScenePostFX({
      timeOfDay: "day",
      qualityPreset: getStage6QualityPreset("high")
    });

    expect(element).toBeNull();
  });

  it("returns null in jsdom for night high quality (jsdom guard)", () => {
    const element = ScenePostFX({
      timeOfDay: "night",
      qualityPreset: getStage6QualityPreset("high")
    });

    expect(element).toBeNull();
  });

  it("returns null in jsdom for medium quality (jsdom guard)", () => {
    const element = ScenePostFX({
      timeOfDay: "day",
      qualityPreset: getStage6QualityPreset("medium")
    });

    expect(element).toBeNull();
  });

  it("returns null when timeOfDay is omitted (jsdom guard)", () => {
    const element = ScenePostFX({
      qualityPreset: getStage6QualityPreset("high")
    });

    expect(element).toBeNull();
  });

  it("skips the PostFX composer when WebGL context attributes are unavailable", () => {
    const renderer = {
      getContext: () => ({
        isContextLost: () => false,
        getContextAttributes: () => null
      })
    };

    expect(canUsePostProcessingComposer(renderer)).toBe(false);
  });
});
