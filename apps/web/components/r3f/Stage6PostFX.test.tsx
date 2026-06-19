import { expect, test } from "vitest";

import { Stage6PostFX } from "./Stage6PostFX";

test("skips the PostFX composer for low quality", () => {
  expect(Stage6PostFX({ qualityPreset: "low" })).toBeNull();
});

test("creates an enabled bounded composer for high quality", () => {
  const element = Stage6PostFX({ qualityPreset: "high" });

  expect(element).not.toBeNull();
  expect(element?.props).toEqual(
    expect.objectContaining({
      enabled: true,
      depthBuffer: true,
      enableNormalPass: true,
      multisampling: 0
    })
  );
});
