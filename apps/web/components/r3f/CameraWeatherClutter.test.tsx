// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  CAMERA_RIG_PRESETS,
  getCameraRigConfig,
  parseCameraRigPresetOverride,
  selectCameraRigPreset
} from "./CameraRig";
import * as CanvasTextPlaneModule from "./CanvasTextPlane";
import { getStage6EnvironmentPreset } from "./EnvironmentLayer";
import * as ProceduralIntersectionModule from "./ProceduralIntersection";
import {
  getRoadDetailPropAtlasContracts,
  ROAD_DETAIL_PROP_SPECS,
  type RoadDetailPropKind
} from "./RoadDetailProps";
import {
  CROSSWALK_STRIPES,
  INTERSECTION_BOX_METERS,
  LANE_DIVIDER_MARKINGS,
  ROAD_WIDTH_METERS
} from "./roadGeometry";
import { getRainLayerConfig } from "./RainParticleLayer";
import { getStage6WeatherFeatureState } from "./R3FSimulationViewport";
import {
  SCENE_CLUTTER_SPECS,
  type SceneClutterKind
} from "./SceneClutterLayer";
import * as SignalHardwareModule from "./SignalHardware";
import { SimulationOverlays } from "./SimulationOverlays";
import { getWheelSprayConfig } from "./WheelSprayLayer";
import { buildFixtureSceneSnapshot } from "./buildSceneSnapshot";
import { getStage6QualityPreset } from "./stage6Quality";
import type { SimulationFrameTelemetry } from "../../lib/simulationSnapshot";

type SeoulRoadSurfaceTextMarkingContract = {
  labelText: string;
  size: [number, number];
  visibilityTier: "proof_foreground" | "background";
};

type SeoulSignalHardwareCueContract = {
  horizontalOverheadHeads: boolean;
  pedestrianSignalBoxes: boolean;
  blackBackplates: boolean;
  hangulSafetyPlaques: string[];
  maxDrawCallMeshesPerDirection?: number;
  canvasFaceMeters?: [number, number];
  foregroundProofSignal?: {
    direction: string;
    faceMeters: [number, number];
    position: [number, number, number];
    hangulLabelPlacement: "signal_face_texture";
    signalStateSource: "SceneSnapshot.signals";
    visibilityTier: "proof_foreground";
  };
};
type CanvasTextLayoutContract = {
  fontSize: number;
  lines: string[];
  lineWidths: number[];
  maxTextWidth: number;
};

describe("Camera/weather/clutter finishing slice", () => {
  test("selects responsive camera presets and disables shake for proof mode", () => {
    expect(
      selectCameraRigPreset({
        aspect: 914 / 680,
        weather: "clear",
        timeOfDay: "day",
        visualRegressionMode: false
      })
    ).toBe("operatorWide");
    expect(
      selectCameraRigPreset({
        aspect: 914 / 680,
        weather: "rain",
        timeOfDay: "day",
        visualRegressionMode: false
      })
    ).toBe("operatorWide");
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

  test("defines operator, photoreal proof, and deterministic proof camera behavior", () => {
    const presets = CAMERA_RIG_PRESETS as Record<
      string,
      { position: number[]; target: number[]; fov: number; near: number; far: number }
    >;

    expect(Object.keys(presets)).toEqual(
      expect.arrayContaining([
        "operatorWide",
        "photorealProof",
        "proofDeterministic"
      ])
    );

    const operatorWide = getCameraRigConfig({
      aspect: 16 / 9,
      preset: "operatorWide",
      weather: "clear",
      timeOfDay: "day"
    });
    const photorealProof = getCameraRigConfig({
      aspect: 16 / 9,
      preset: "photorealProof" as never,
      weather: "rain",
      timeOfDay: "day"
    });
    const deterministicProof = getCameraRigConfig({
      aspect: 16 / 9,
      preset: "proofDeterministic",
      weather: "rain",
      timeOfDay: "night",
      visualRegressionMode: true
    });

    expect(operatorWide.name).toBe("operatorWide");
    expect(operatorWide.position[0]).toBeGreaterThanOrEqual(16);
    expect(operatorWide.position[1]).toBeGreaterThanOrEqual(36);
    expect(operatorWide.position[2]).toBeGreaterThanOrEqual(52);
    expect(operatorWide.target[0]).toBeCloseTo(0);
    expect(operatorWide.target[2]).toBeGreaterThanOrEqual(-12);
    expect(operatorWide.fov).toBeGreaterThanOrEqual(50);

    expect(photorealProof.name).toBe("photorealProof");
    expect(photorealProof.position[1]).toBeLessThan(operatorWide.position[1]);
    expect(photorealProof.position[2]).toBeLessThan(operatorWide.position[2]);
    expect(photorealProof.target[1]).toBeGreaterThanOrEqual(0.8);
    expect(photorealProof.fov).toBeLessThan(operatorWide.fov);

    expect(deterministicProof.name).toBe("proofDeterministic");
    expect(deterministicProof.position).toEqual(presets.proofDeterministic.position);
    expect(deterministicProof.target).toEqual(presets.proofDeterministic.target);
    expect(deterministicProof.fov).toBe(presets.proofDeterministic.fov);
    expect(deterministicProof.shake.enabled).toBe(false);
    expect(deterministicProof.shake.offset).toEqual([0, 0, 0]);
  });

  test("allows runtime selection of photoreal proof camera preset", () => {
    expect(parseCameraRigPresetOverride("photorealProof")).toBe(
      "photorealProof"
    );
    expect(parseCameraRigPresetOverride("proofDeterministic")).toBe(
      "proofDeterministic"
    );
    expect(parseCameraRigPresetOverride("unknown")).toBeUndefined();
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

  test("keeps photoreal proof camera close enough to foreground wet-road detail", () => {
    const proofCamera = getCameraRigConfig({
      aspect: 914 / 680,
      preset: "photorealProof" as never,
      weather: "rain",
      timeOfDay: "day",
      visualRegressionMode: false
    });

    expect(proofCamera.name).toBe("photorealProof");
    expect(proofCamera.position[1]).toBeLessThanOrEqual(18);
    expect(proofCamera.position[2]).toBeLessThanOrEqual(42);
    expect(proofCamera.target[0]).toBeLessThanOrEqual(-12);
    expect(proofCamera.target[2]).toBeGreaterThanOrEqual(10);
    expect(proofCamera.fov).toBeLessThanOrEqual(40);
  });

  test("keeps Seoul crosswalk bars as zebra stripes aligned to each approach", () => {
    const maxStripeWidth = Math.max(
      ...CROSSWALK_STRIPES.map((stripe) => Math.min(...stripe.size))
    );
    const maxStripeLength = Math.max(
      ...CROSSWALK_STRIPES.map((stripe) => Math.max(...stripe.size))
    );
    const halfIntersection = INTERSECTION_BOX_METERS / 2;
    const northStripes = CROSSWALK_STRIPES.filter(
      (stripe) => stripe.direction === "north"
    ).sort((left, right) => left.position[0] - right.position[0]);
    const eastStripes = CROSSWALK_STRIPES.filter(
      (stripe) => stripe.direction === "east"
    ).sort((left, right) => left.position[2] - right.position[2]);
    const northGap = Math.min(
      ...northStripes.slice(1).map(
        (stripe, index) =>
          stripe.position[0] -
          northStripes[index].position[0] -
          Math.min(stripe.size[0], stripe.size[1])
      )
    );
    const eastGap = Math.min(
      ...eastStripes.slice(1).map(
        (stripe, index) =>
          stripe.position[2] -
          eastStripes[index].position[2] -
          Math.min(stripe.size[0], stripe.size[1])
      )
    );
    const northLateralSpan =
      northStripes[northStripes.length - 1].position[0] -
      northStripes[0].position[0] +
      maxStripeWidth;
    const eastLateralSpan =
      eastStripes[eastStripes.length - 1].position[2] -
      eastStripes[0].position[2] +
      maxStripeWidth;
    const northCenterDistance =
      northStripes.reduce((sum, stripe) => sum + Math.abs(stripe.position[2]), 0) /
      northStripes.length;
    const eastCenterDistance =
      eastStripes.reduce((sum, stripe) => sum + Math.abs(stripe.position[0]), 0) /
      eastStripes.length;

    expect(CROSSWALK_STRIPES).toHaveLength(44);
    expect(maxStripeWidth).toBeGreaterThanOrEqual(0.58);
    expect(maxStripeWidth).toBeLessThanOrEqual(0.72);
    expect(maxStripeLength).toBeGreaterThanOrEqual(4.4);
    expect(maxStripeLength).toBeLessThanOrEqual(5.6);
    expect(northLateralSpan).toBeGreaterThanOrEqual(ROAD_WIDTH_METERS - 1.2);
    expect(northLateralSpan).toBeLessThanOrEqual(ROAD_WIDTH_METERS);
    expect(eastLateralSpan).toBeGreaterThanOrEqual(ROAD_WIDTH_METERS - 1.2);
    expect(eastLateralSpan).toBeLessThanOrEqual(ROAD_WIDTH_METERS);
    expect(northCenterDistance).toBeGreaterThanOrEqual(halfIntersection + 2);
    expect(northCenterDistance).toBeLessThanOrEqual(halfIntersection + 4);
    expect(eastCenterDistance).toBeGreaterThanOrEqual(halfIntersection + 2);
    expect(eastCenterDistance).toBeLessThanOrEqual(halfIntersection + 4);
    expect(northStripes.every((stripe) => stripe.size[1] > stripe.size[0])).toBe(
      true
    );
    expect(eastStripes.every((stripe) => stripe.size[0] > stripe.size[1])).toBe(
      true
    );
    expect(northGap).toBeGreaterThanOrEqual(0.5);
    expect(eastGap).toBeGreaterThanOrEqual(0.5);
  });

  test("defines manifest-backed road details and procedural Seoul background clutter", () => {
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
      new Set([
        "bollard",
        "traffic_cone",
        "guardrail",
        "road_sign",
        "bus_stop_shelter",
        "storm_drain",
        "tactile_paving"
      ])
    );
    expect(clutterKinds).toEqual(
      new Set([
        "building_silhouette",
        "billboard",
        "pedestrian_silhouette",
        "distant_city_block",
        "public_place_sign"
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

  test("uses public Seoul and Gangnam labels without commercial brand claims", () => {
    const clutterSpecs = SCENE_CLUTTER_SPECS as Array<
      SceneClutterKind extends never
        ? never
        : {
            id: string;
            kind: SceneClutterKind;
            publicPlaceText?: string;
            realBrandClaim: false;
            sumoTruth?: boolean;
            truthSource?: string;
          }
    >;
    const roadDetailSpecs = ROAD_DETAIL_PROP_SPECS as Array<
      RoadDetailPropKind extends never
        ? never
        : {
            kind: RoadDetailPropKind;
            labelText?: string;
            realBrandClaim?: false;
            transitCue?: string;
            position?: [number, number, number];
            scale?: [number, number, number];
            mountStyle?: string;
            visibilityTier?: "proof_foreground" | "background";
          }
    >;
    const placeLabels = [
      ...clutterSpecs.flatMap((spec) =>
        spec.publicPlaceText ? [spec.publicPlaceText] : []
      ),
      ...roadDetailSpecs.flatMap((spec) =>
        spec.labelText ? spec.labelText.split(/\s*\/\s*|\s+->\s+|\s+/) : []
      )
    ];

    expect([...new Set(placeLabels)]).toEqual(
      expect.arrayContaining([
        "서울",
        "강남",
        "테헤란로",
        "강남대로",
        "Seoul",
        "Gangnam"
      ])
    );
    expect(placeLabels.join(" ")).not.toMatch(/[媛濡뚰뿤쒖궓]/);
    expect(
      roadDetailSpecs.some(
        (spec) =>
          spec.kind === "road_sign" &&
          spec.visibilityTier === "proof_foreground" &&
          spec.mountStyle === "roadside_pole" &&
          (spec.position?.[1] ?? 0) >= 5 &&
          (spec.scale?.[0] ?? 0) <= 4.2 &&
          spec.labelText?.includes("강남") &&
          spec.labelText?.includes("테헤란로")
      )
    ).toBe(true);
    expect(
      roadDetailSpecs.some(
        (spec) =>
          spec.kind === "bus_stop_shelter" &&
          spec.transitCue === "bus_stop" &&
          spec.labelText?.includes("강남")
      )
    ).toBe(true);
    expect(clutterSpecs.every((spec) => spec.realBrandClaim === false)).toBe(true);
    expect(
      clutterSpecs
        .filter((spec) => spec.kind === "pedestrian_silhouette")
        .every(
          (spec) =>
            spec.id.includes("ambient") &&
            spec.sumoTruth === false &&
            spec.truthSource === "ambient_background_proxy"
        )
    ).toBe(true);
  });

  test("keeps lane dividers segmented and worn instead of long perfect strips", () => {
    const longestDividerSegment = Math.max(
      ...LANE_DIVIDER_MARKINGS.map((marking) => Math.max(...marking.size))
    );

    expect(LANE_DIVIDER_MARKINGS.length).toBeGreaterThanOrEqual(56);
    expect(longestDividerSegment).toBeLessThanOrEqual(12);
  });

  test("adds WebGL-readable Korean road-surface markings for Seoul arterial proof", () => {
    const proceduralModule = ProceduralIntersectionModule as typeof ProceduralIntersectionModule & {
      SEOUL_ROAD_SURFACE_TEXT_MARKINGS?: SeoulRoadSurfaceTextMarkingContract[];
    };
    const markings = proceduralModule.SEOUL_ROAD_SURFACE_TEXT_MARKINGS ?? [];
    const labels = markings.map((marking) => marking.labelText);

    expect(labels).toEqual(
      expect.arrayContaining(["버스전용", "강남대로", "테헤란로"])
    );
    expect(
      markings.filter((marking) => marking.visibilityTier === "proof_foreground")
        .length
    ).toBeGreaterThanOrEqual(2);
    expect(
      Math.max(...markings.map((marking) => Math.max(...marking.size)))
    ).toBeGreaterThanOrEqual(7);
    expect(labels.join(" ")).not.toMatch(/[媛濡뚰뿤쒖궓]/);
  });

  test("uses Seoul-style signal hardware cues rather than generic vertical boxes", () => {
    const signalModule = SignalHardwareModule as typeof SignalHardwareModule & {
      SEOUL_SIGNAL_HARDWARE_CUES?: SeoulSignalHardwareCueContract;
    };

    expect(signalModule.SEOUL_SIGNAL_HARDWARE_CUES).toMatchObject({
      horizontalOverheadHeads: true,
      pedestrianSignalBoxes: true,
      blackBackplates: true
    });
    expect(signalModule.SEOUL_SIGNAL_HARDWARE_CUES?.hangulSafetyPlaques).toEqual(
      expect.arrayContaining(["보행신호", "정지선"])
    );
    expect(
      signalModule.SEOUL_SIGNAL_HARDWARE_CUES?.maxDrawCallMeshesPerDirection
    ).toBeLessThanOrEqual(4);
    expect(signalModule.SEOUL_SIGNAL_HARDWARE_CUES?.canvasFaceMeters?.[0]).toBeGreaterThanOrEqual(3.2);
    expect(signalModule.SEOUL_SIGNAL_HARDWARE_CUES?.canvasFaceMeters?.[1]).toBeGreaterThanOrEqual(1.6);
    expect(
      signalModule.SEOUL_SIGNAL_HARDWARE_CUES?.foregroundProofSignal
    ).toMatchObject({
      signalStateSource: "SceneSnapshot.signals",
      visibilityTier: "proof_foreground"
    });
    expect(
      signalModule.SEOUL_SIGNAL_HARDWARE_CUES?.foregroundProofSignal?.faceMeters[0]
    ).toBeGreaterThanOrEqual(3.2);
    expect(
      signalModule.SEOUL_SIGNAL_HARDWARE_CUES?.foregroundProofSignal?.faceMeters[1]
    ).toBeGreaterThanOrEqual(1.5);
    expect(
      signalModule.SEOUL_SIGNAL_HARDWARE_CUES?.foregroundProofSignal?.position[1]
    ).toBeGreaterThanOrEqual(5);
    expect(
      signalModule.SEOUL_SIGNAL_HARDWARE_CUES?.foregroundProofSignal
        ?.hangulLabelPlacement
    ).toBe("signal_face_texture");
  });

  test("fits long Korean canvas labels before drawing them into WebGL textures", () => {
    const canvasTextModule = CanvasTextPlaneModule as typeof CanvasTextPlaneModule & {
      getCanvasTextLayout?: (
        text: string,
        options: {
          maxFontSize: number;
          minFontSize: number;
          textureWidth: number;
          textureHeight: number;
          horizontalPadding: number;
          measureTextWidth: (line: string, fontSize: number) => number;
        }
      ) => CanvasTextLayoutContract;
    };

    expect(canvasTextModule.getCanvasTextLayout).toBeTypeOf("function");

    const layout = canvasTextModule.getCanvasTextLayout?.("테헤란로 버스정류장", {
      maxFontSize: 210,
      minFontSize: 72,
      textureWidth: 1024,
      textureHeight: 512,
      horizontalPadding: 96,
      measureTextWidth: (line, fontSize) => line.length * fontSize * 0.92
    });

    expect(
      (layout?.lines.length ?? 0) > 1 || (layout?.fontSize ?? 210) < 210
    ).toBe(true);
    expect(layout?.lines.length).toBeGreaterThanOrEqual(1);
    expect(layout?.lineWidths.every((width) => width <= layout.maxTextWidth)).toBe(
      true
    );
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
