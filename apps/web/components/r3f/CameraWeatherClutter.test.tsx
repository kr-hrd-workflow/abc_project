// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  getCameraRigConfig,
  selectCameraRigPreset
} from "./CameraRig";
import { getStage6EnvironmentPreset } from "./EnvironmentLayer";
import {
  getRoadDetailPropAtlasContracts,
  ROAD_DETAIL_PROP_SPECS,
  type RoadDetailPropKind
} from "./RoadDetailProps";
import { CROSSWALK_STRIPES, ROAD_WIDTH_METERS } from "./roadGeometry";
import { getRainLayerConfig } from "./RainParticleLayer";
import { getStage6WeatherFeatureState } from "./R3FSimulationViewport";
import {
  SCENE_CLUTTER_SPECS,
  type SceneClutterKind
} from "./SceneClutterLayer";
import { SimulationOverlays } from "./SimulationOverlays";
import { getWheelSprayConfig } from "./WheelSprayLayer";
import { buildFixtureSceneSnapshot } from "./buildSceneSnapshot";
import { getStage6QualityPreset } from "./stage6Quality";
import type { SimulationFrameTelemetry } from "../../lib/simulationSnapshot";

describe("Camera/weather/clutter finishing slice", () => {
  test("selects responsive camera presets and disables shake for proof mode", () => {
    expect(
      selectCameraRigPreset({
        aspect: 914 / 680,
        weather: "rain",
        timeOfDay: "day",
        visualRegressionMode: false
      })
    ).toBe("nightRainClose");
    expect(
      selectCameraRigPreset({
        aspect: 390 / 844,
        weather: "rain",
        timeOfDay: "day",
        visualRegressionMode: false
      })
    ).toBe("mobileWide");
    expect(
      selectCameraRigPreset({
        aspect: 914 / 680,
        weather: "rain",
        timeOfDay: "night",
        visualRegressionMode: false
      })
    ).toBe("nightRainClose");
    expect(
      selectCameraRigPreset({
        aspect: 914 / 680,
        weather: "rain",
        timeOfDay: "night",
        visualRegressionMode: true
      })
    ).toBe("proofDeterministic");

    expect(
      getCameraRigConfig({
        aspect: 914 / 680,
        weather: "rain",
        timeOfDay: "night",
        visualRegressionMode: true
      }).shake.enabled
    ).toBe(false);
    expect(
      getCameraRigConfig({
        aspect: 914 / 680,
        weather: "rain",
        timeOfDay: "night",
        visualRegressionMode: false
      }).shake.enabled
    ).toBe(true);

    const mobileRainCamera = getCameraRigConfig({
      aspect: 390 / 844,
      weather: "rain",
      timeOfDay: "day",
      visualRegressionMode: false
    });

    expect(mobileRainCamera.name).toBe("mobileWide");
    expect(mobileRainCamera.position[1]).toBeLessThanOrEqual(20);
    expect(mobileRainCamera.position[2]).toBeLessThanOrEqual(40);
    expect(mobileRainCamera.target[2]).toBeGreaterThanOrEqual(-10);
    expect(mobileRainCamera.fov).toBeLessThanOrEqual(46);
  });

  test("quality-gates rain streak, splash, and wheel-spray counts", () => {
    expect(getRainLayerConfig("low")).toMatchObject({
      streakCount: 0,
      splashCount: 0
    });
    expect(getRainLayerConfig("medium")).toMatchObject({
      streakCount: 48,
      splashCount: 0
    });
    expect(getWheelSprayConfig("medium").maxSprayPlumes).toBe(0);
    expect(getWheelSprayConfig("high").maxSprayPlumes).toBeGreaterThan(0);
    expect(getRainLayerConfig("ultra").streakCount).toBeGreaterThan(
      getRainLayerConfig("high").streakCount
    );
    expect(getRainLayerConfig("ultra").splashCount).toBeGreaterThan(0);
    expect(getRainLayerConfig("high").streakOpacity).toBeGreaterThanOrEqual(
      0.32
    );
    expect(getRainLayerConfig("high").splashOpacity).toBeGreaterThanOrEqual(
      0.14
    );
    expect(getRainLayerConfig("high").streakLengthMeters).toBeGreaterThanOrEqual(
      4
    );
    expect(getRainLayerConfig("high").streakWidthMeters).toBeGreaterThanOrEqual(
      0.09
    );
    expect(getWheelSprayConfig("ultra").maxSprayPlumes).toBeGreaterThan(
      getWheelSprayConfig("high").maxSprayPlumes
    );
  });

  test("gates rain particles by selected weather as well as quality", () => {
    expect(
      getStage6WeatherFeatureState(getStage6QualityPreset("high"), "clear")
    ).toMatchObject({
      weatherParticlesEnabled: false,
      streakCount: 0,
      splashCount: 0
    });
    expect(
      getStage6WeatherFeatureState(getStage6QualityPreset("high"), "rain")
    ).toMatchObject({
      weatherParticlesEnabled: true,
      streakCount: getRainLayerConfig("high").streakCount,
      splashCount: getRainLayerConfig("high").splashCount
    });
    expect(
      getStage6WeatherFeatureState(getStage6QualityPreset("low"), "rain")
    ).toMatchObject({
      weatherParticlesEnabled: false,
      streakCount: 0,
      splashCount: 0
    });
  });

  test("keeps rainy daytime readable instead of forcing the night preset", () => {
    expect(
      getStage6EnvironmentPreset({ weather: "rain", timeOfDay: "day" })
    ).toBe("rain");
    expect(
      getStage6EnvironmentPreset({ weather: "rain", timeOfDay: "night" })
    ).toBe("night");
  });

  test("keeps rainy desktop proof camera close enough to foreground wet-road detail", () => {
    const rainyCamera = getCameraRigConfig({
      aspect: 914 / 680,
      weather: "rain",
      timeOfDay: "day",
      visualRegressionMode: false
    });

    expect(rainyCamera.name).toBe("nightRainClose");
    expect(rainyCamera.position[1]).toBeLessThanOrEqual(10);
    expect(rainyCamera.position[2]).toBeLessThanOrEqual(25);
    expect(rainyCamera.target[2]).toBeLessThanOrEqual(-16);
    expect(rainyCamera.fov).toBeLessThanOrEqual(35);
  });

  test("keeps crosswalk bars narrow enough for traffic-camera scale", () => {
    const maxStripeWidth = Math.max(
      ...CROSSWALK_STRIPES.map((stripe) => Math.min(...stripe.size))
    );
    const maxStripeLength = Math.max(
      ...CROSSWALK_STRIPES.map((stripe) => Math.max(...stripe.size))
    );

    expect(maxStripeWidth).toBeLessThanOrEqual(0.92);
    expect(maxStripeLength).toBeLessThanOrEqual(ROAD_WIDTH_METERS + 1);
  });

  test("defines manifest-backed road details and procedural background clutter", () => {
    const roadKinds = new Set<RoadDetailPropKind>(
      ROAD_DETAIL_PROP_SPECS.map((spec) => spec.kind)
    );
    const clutterKinds = new Set<SceneClutterKind>(
      SCENE_CLUTTER_SPECS.map((spec) => spec.kind)
    );

    expect(
      ROAD_DETAIL_PROP_SPECS.some(
        (spec) =>
          spec.kind === "bollard" &&
          spec.source === "manifest_backed" &&
          spec.sourceAssetId === "props/curb_details"
      )
    ).toBe(true);
    expect(roadKinds).toEqual(
      new Set(["bollard", "traffic_cone", "guardrail", "road_sign"])
    );
    expect(clutterKinds).toEqual(
      new Set([
        "building_silhouette",
        "billboard",
        "pedestrian_silhouette",
        "distant_city_block"
      ])
    );
    expect(
      SCENE_CLUTTER_SPECS.every((spec) => spec.realBrandClaim === false)
    ).toBe(true);
    expect(getRoadDetailPropAtlasContracts()).toEqual({
      guardrail: {
        atlasCell: "guardrailPanels",
        sourceAsset: "sprites/stage6_weather_material_source_atlas"
      },
      roadSign: {
        atlasCell: "roadSigns",
        sourceAsset: "sprites/stage6_weather_material_source_atlas"
      }
    });
  });

  test("adds virtual CCTV labels without inventing a feed timestamp", () => {
    render(
      <SimulationOverlays
        simulationSource="sumo_traci"
        sceneSnapshot={buildFixtureSceneSnapshot({
          queues: { north: 1, south: 2, east: 3, west: 4 },
          events: []
        })}
        signalState="north:green"
        frameTelemetry={buildTelemetry({ stale: true, staleReason: "frame_age" })}
      />
    );

    expect(screen.getByTestId("r3f-cctv-camera-id-badge").textContent).toContain(
      "SIM-CCTV-INT-0001"
    );
    expect(screen.getByTestId("r3f-cctv-source-badge").textContent).toContain(
      "virtual simulation CCTV"
    );
    const renderDelayBadge = screen.getByTestId("r3f-cctv-render-delay-badge");

    expect(screen.queryByTestId("r3f-cctv-timestamp-badge")).toBeNull();
    expect(renderDelayBadge.textContent).toContain("Render delay");
    expect(renderDelayBadge.textContent).toContain("160 ms");
    expect(renderDelayBadge.textContent).not.toMatch(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
    );
    expect(screen.getByTestId("r3f-cctv-safety-badge").textContent).toContain(
      "not a live feed"
    );
    expect(screen.getByTestId("r3f-cctv-effect-badge").textContent).toContain(
      "rain lens"
    );
  });
});

function buildTelemetry(
  overrides: Partial<SimulationFrameTelemetry> = {}
): SimulationFrameTelemetry {
  return {
    frameAgeMs: 120,
    networkLatencyMs: 22,
    simToRenderDelayMs: 160,
    authoritativeHz: 10,
    authoritativeTickDriftMs: 12,
    stale: false,
    staleReason: null,
    ...overrides
  };
}
