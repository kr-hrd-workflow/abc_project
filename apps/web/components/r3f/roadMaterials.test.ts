import { Children } from "react";
import { describe, expect, test } from "vitest";

import { buildStage6SignalAccentLights } from "./LightingRig";
import {
  STAGE5_WET_ROAD_MATERIAL_CONTROLS,
  STAGE6_ROAD_MATERIALS,
  STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS,
  ROAD_MATERIALS,
  getStage6RoadMaterialCoverage
} from "./roadMaterials";
import {
  STAGE5_FACADE_PANELS,
  getStage6FacadePanelMaterialContract
} from "./Stage5SceneAssets";
import {
  STAGE6_WEATHER_ATLAS_PATH,
  getStage6WeatherAtlasCell
} from "./stage6WeatherAtlas";
import {
  WetRoadReflectors,
  buildWetRoadReflectionPlan
} from "./WetRoadReflectors";
import {
  shouldLoadStage6SurfaceDecalAtlas,
  getStage6SurfaceDecalsForQuality,
  STAGE6_SURFACE_DECAL_SPECS
} from "./Stage6SurfaceDecals";
import {
  getRainLayerConfig,
  shouldLoadRainParticleAtlas
} from "./RainParticleLayer";
import { getStage6QualityPreset } from "./stage6Quality";
import {
  getWheelSprayConfig,
  getWheelSprayMaterialContract,
  shouldLoadWheelSprayAtlas
} from "./WheelSprayLayer";
import { getSceneClutterAtlasContracts } from "./SceneClutterLayer";

describe("Stage 6 road material contract", () => {
  test("defines named road materials with explicit map coverage", () => {
    expect(Object.keys(STAGE6_ROAD_MATERIALS)).toEqual([
      "asphalt",
      "wetAsphalt",
      "lanePaint",
      "crosswalkPaint",
      "curbConcrete",
      "sidewalkConcrete",
      "puddleMask",
      "roadEdgeGrime"
    ]);

    expect(getStage6RoadMaterialCoverage("wetAsphalt")).toEqual({
      baseColor: "texture",
      normal: "missing",
      roughness: "texture",
      ao: "missing"
    });
    expect(getStage6RoadMaterialCoverage("puddleMask")).toEqual({
      baseColor: "scalar",
      normal: "missing",
      roughness: "scalar",
      ao: "missing"
    });
  });

  test("quality-gates wet road reflection zones", () => {
    expect(
      buildWetRoadReflectionPlan(getStage6QualityPreset("low")).reflectionMode
    ).toBe("fake-sheen");

    const highPlan = buildWetRoadReflectionPlan(getStage6QualityPreset("high"));
    const ultraPlan = buildWetRoadReflectionPlan(getStage6QualityPreset("ultra"));

    expect(highPlan.reflectionMode).toBe("planar");
    expect(new Set(highPlan.zones.map((zone) => zone.kind))).toEqual(new Set([
      "intersection-center",
      "stop-bar",
      "crosswalk-adjacent"
    ]));
    expect(highPlan.zones.filter((zone) => zone.enabled)).toHaveLength(1);
    expect(
      highPlan.zones.find((zone) => zone.id === "intersection-center-puddle-reflector")
        ?.enabled
    ).toBe(true);
    expect(ultraPlan.zones.filter((zone) => zone.enabled)).toHaveLength(5);
  });

  test("uses the Stage 6 ImageGen atlas as named runtime material cells", () => {
    expect(STAGE6_WEATHER_ATLAS_PATH).toBe(
      "/simulation/r3f/assets/sprites/stage6-weather-material-source-atlas.png"
    );
    expect(getStage6WeatherAtlasCell("wetAsphaltGloss")).toMatchObject({
      column: 0,
      row: 0
    });
    expect(getStage6WeatherAtlasCell("rainStreaks")).toMatchObject({
      column: 0,
      row: 2
    });
    expect(getStage6WeatherAtlasCell("splashPuffs")).toMatchObject({
      column: 1,
      row: 2
    });
  });

  test("quality-gates visible atlas decals above low fallback", () => {
    expect(
      getStage6SurfaceDecalsForQuality(getStage6QualityPreset("low"))
    ).toHaveLength(0);
    expect(shouldLoadStage6SurfaceDecalAtlas(getStage6QualityPreset("low"))).toBe(
      false
    );
    expect(shouldLoadRainParticleAtlas(getRainLayerConfig("low"))).toBe(false);
    expect(
      getStage6SurfaceDecalsForQuality(getStage6QualityPreset("high")).length
    ).toBeGreaterThan(0);
    expect(shouldLoadStage6SurfaceDecalAtlas(getStage6QualityPreset("high"))).toBe(
      true
    );
    expect(shouldLoadRainParticleAtlas(getRainLayerConfig("high"))).toBe(true);
    expect(
      STAGE6_SURFACE_DECAL_SPECS.some(
        (spec) => spec.atlasCell === "rainReflectiveRoad"
      )
    ).toBe(true);
    expect(
      STAGE6_SURFACE_DECAL_SPECS.find(
        (spec) => spec.id === "intersection-reflective-asphalt-atlas-decal"
      )?.opacity
    ).toBeLessThanOrEqual(0.3);
    expect(
      STAGE6_SURFACE_DECAL_SPECS.some((spec) => spec.atlasCell === "puddleMask")
    ).toBe(true);
  });

  test("uses the Stage 6 atlas wheel-spray cell for vehicle spray", () => {
    expect(shouldLoadWheelSprayAtlas(getWheelSprayConfig("low"))).toBe(false);
    expect(shouldLoadWheelSprayAtlas(getWheelSprayConfig("high"))).toBe(true);
    expect(getWheelSprayMaterialContract(getWheelSprayConfig("high"))).toEqual({
      atlasCell: "wheelSpray",
      sourceAsset: "sprites/stage6_weather_material_source_atlas"
    });
  });

  test("keeps foreground facade panels emissive-only and camera-subtle", () => {
    expect(STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.baseColor).not.toBe(
      "#223039"
    );
    expect(
      STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.emissiveIntensity
    ).toBeLessThanOrEqual(0.28);
    expect(
      STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.facadePanelOpacity
    ).toBeLessThanOrEqual(0.48);
    expect(getStage6FacadePanelMaterialContract()).toMatchObject({
      sourceAsset: "textures/facade_window_emissive",
      textureRole: "facadeWindowEmissive",
      baseColorMap: "none",
      emissiveOnly: true
    });
    expect(getStage6FacadePanelMaterialContract().minOpacity).toBeGreaterThanOrEqual(
      0.36
    );
    expect(getSceneClutterAtlasContracts().billboard).toEqual({
      atlasCell: "billboardPanels",
      sourceAsset: "sprites/stage6_weather_material_source_atlas"
    });
    expect(ROAD_MATERIALS.buildingBlock).toMatchObject({
      color: "#1f2b31",
      emissiveIntensity: 0.08
    });
    expect(ROAD_MATERIALS.crosswalkMarking).toMatchObject({
      color: "#d2c6aa",
      opacity: 0.54
    });
  });

  test("uses taller segmented facade panels for Gangnam office-tower scale", () => {
    const panelHeights = STAGE5_FACADE_PANELS.map((panel) => panel.size[1]);
    const roundedPanelHeights = new Set(
      panelHeights.map((height) => Math.round(height * 10) / 10)
    );

    expect(Math.max(...panelHeights)).toBeGreaterThanOrEqual(18);
    expect(roundedPanelHeights.size).toBeGreaterThanOrEqual(5);
    expect(STAGE5_FACADE_PANELS.length).toBeGreaterThanOrEqual(48);
  });

  test("keeps wet road paint readable under rainy CCTV proof", () => {
    expect(STAGE5_WET_ROAD_MATERIAL_CONTROLS.markingWearOpacity).toBeGreaterThanOrEqual(
      0.56
    );
    expect(ROAD_MATERIALS.wornMarking).toMatchObject({
      color: "#e0dac5",
      opacity: STAGE5_WET_ROAD_MATERIAL_CONTROLS.markingWearOpacity
    });
    expect(ROAD_MATERIALS.crosswalkMarking.emissiveIntensity).toBeGreaterThanOrEqual(
      0.08
    );
  });

  test("keeps wet reflector runtime on fake sheen until quality is explicit", () => {
    const fallbackReflectors = WetRoadReflectors({});
    const highReflectors = WetRoadReflectors({
      qualityPreset: getStage6QualityPreset("high")
    });

    expect(fallbackReflectors.props.userData.reflectionMode).toBe("fake-sheen");
    expect(Children.toArray(fallbackReflectors.props.children)).toHaveLength(0);
    expect(highReflectors.props.userData.reflectionMode).toBe("planar");
    expect(Children.toArray(highReflectors.props.children).length).toBeGreaterThan(0);
  });

  test("derives signal accent lights from current signal state", () => {
    const lights = buildStage6SignalAccentLights([
      { direction: "north", state: "green" },
      { direction: "south", state: "red" }
    ]);

    expect(lights.map((light) => [light.id, light.color])).toEqual([
      ["north-signal-green-accent", "#78d48d"],
      ["south-signal-red-accent", "#dc4e40"]
    ]);
  });
});
