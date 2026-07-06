import { describe, expect, test } from "vitest";

import {
  STAGE6_POSTFX_PRESETS,
  buildStage6PostFXState,
  getStage6PostFXChain,
  getStage6PostFXPreset
} from "./stage6PostFXPresets";

describe("Stage 6 PostFX presets", () => {
  test("disables heavy postprocessing for low quality", () => {
    expect(STAGE6_POSTFX_PRESETS.low.enabled).toBe(false);
    expect(STAGE6_POSTFX_PRESETS.low.smaa).toBe(false);
    expect(STAGE6_POSTFX_PRESETS.low.ssao).toBe("off");
    expect(getStage6PostFXChain("low")).toEqual([]);
    expect(buildStage6PostFXState("low")).toEqual({
      qualityPreset: "low",
      enabled: false,
      chain: [],
      chainLabel: "off"
    });
  });

  test("keeps the default medium preset renderer-safe without PostFX", () => {
    expect(STAGE6_POSTFX_PRESETS.medium.enabled).toBe(false);
    expect(STAGE6_POSTFX_PRESETS.medium.smaa).toBe(false);
    expect(STAGE6_POSTFX_PRESETS.medium.ssao).toBe("off");
    expect(getStage6PostFXChain("medium")).toEqual([]);
    expect(buildStage6PostFXState("medium")).toEqual({
      qualityPreset: "medium",
      enabled: false,
      chain: [],
      chainLabel: "off"
    });
  });

  test("enables the bounded high quality CCTV postprocessing chain", () => {
    expect(getStage6PostFXPreset("high")).toEqual(
      expect.objectContaining({
        enabled: true,
        smaa: true,
        ssao: "standard",
        bloom: "headlight"
      })
    );
    expect(getStage6PostFXChain("high")).toEqual([
      "SMAA",
      "SSAO",
      "Bloom",
      "ToneMapping",
      "Noise",
      "Vignette"
    ]);
    expect(buildStage6PostFXState("high")).toEqual({
      qualityPreset: "high",
      enabled: true,
      chain: ["SMAA", "SSAO", "Bloom", "ToneMapping", "Noise", "Vignette"],
      chainLabel: "SMAA,SSAO,Bloom,ToneMapping,Noise,Vignette"
    });
  });
});
