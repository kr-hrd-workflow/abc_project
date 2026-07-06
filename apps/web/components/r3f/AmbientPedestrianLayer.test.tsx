// @vitest-environment jsdom
import { vi } from "vitest";

function makeMockTexture(): object {
  return {
    colorSpace: "",
    wrapS: 0,
    wrapT: 0,
    needsUpdate: false,
    repeat: { set: () => {} },
    offset: { set: () => {} },
    dispose: () => {},
    clone: () => makeMockTexture()
  };
}

vi.mock("@react-three/drei", () => ({
  useTexture: Object.assign(() => makeMockTexture(), { preload: () => {} })
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useEffect: () => undefined,
    useMemo: (fn: () => unknown) => fn()
  };
});

import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode
} from "react";
import { describe, expect, test } from "vitest";

import {
  AMBIENT_PEDESTRIAN_ATLAS_URL,
  AMBIENT_PEDESTRIAN_SPECS,
  AMBIENT_PEDESTRIAN_TRUTH_SOURCE,
  AMBIENT_PEDESTRIAN_VARIANTS,
  AmbientPedestrianLayer,
  buildAmbientPedestrianRenderPlan
} from "./AmbientPedestrianLayer";
import { CROSSWALK_STRIPES } from "./roadGeometry";

type TestElementProps = {
  alphaTest?: number;
  atlasUrl?: string;
  children?: ReactNode;
  depthWrite?: boolean;
  geometry?: unknown;
  map?: unknown;
  name?: string;
  opacity?: number;
  renderOrder?: number;
  renderMode?: string;
  transparent?: boolean;
  userData?: Record<string, unknown>;
};

function collectElements(node: ReactNode): ReactElement<TestElementProps>[] {
  const result: ReactElement<TestElementProps>[] = [];
  const queue: ReactNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift();
    Children.forEach(current, (child) => {
      if (isValidElement<TestElementProps>(child)) {
        result.push(child);
        queue.push(child.props.children);
      }
    });
  }

  return result;
}

describe("AmbientPedestrianLayer", () => {
  test("defines deterministic non-SUMO pedestrian context outside the central road box", () => {
    expect(AMBIENT_PEDESTRIAN_TRUTH_SOURCE).toBe("ambient_background_proxy");
    expect(AMBIENT_PEDESTRIAN_ATLAS_URL).toBe(
      "/simulation/r3f/assets/sprites/pedestrian-commuter-atlas.png"
    );
    expect(AMBIENT_PEDESTRIAN_SPECS.length).toBeGreaterThanOrEqual(8);

    for (const spec of AMBIENT_PEDESTRIAN_SPECS) {
      const inCentralRoad =
        Math.abs(spec.position[0]) < 18 && Math.abs(spec.position[2]) < 18;
      expect(inCentralRoad, `${spec.id} is inside the central road box`).toBe(
        false
      );
      expect(spec.atlasIndex).toBeGreaterThanOrEqual(0);
      expect(spec.atlasIndex).toBeLessThan(8);
    }
  });

  test("keeps explicit foreground anchors for the CCTV camera", () => {
    const cctvForegroundSpecs = AMBIENT_PEDESTRIAN_SPECS.filter((spec) =>
      spec.id.startsWith("cctv-foreground-")
    );
    const cctvPlan = buildAmbientPedestrianRenderPlan("cctv");

    expect(cctvForegroundSpecs.length).toBeGreaterThanOrEqual(4);
    for (const spec of cctvForegroundSpecs) {
      expect(Math.abs(spec.position[0])).toBeGreaterThanOrEqual(20);
      expect(spec.position[2]).toBeGreaterThanOrEqual(8);
      expect(spec.position[2]).toBeLessThanOrEqual(22);

      const rendered = cctvPlan.ambientPedestrians.find(
        (pedestrian) => pedestrian.id === spec.id
      );
      expect(rendered?.spriteScale[1]).toBeGreaterThanOrEqual(4);
      expect(rendered?.userData.truthSource).toBe("ambient_background_proxy");
      expect(rendered?.userData.sumoTruth).toBe(false);
    }
  });

  test("keeps CCTV foreground pedestrians inside the east/west crosswalk rectangles", () => {
    const cctvForegroundSpecs = AMBIENT_PEDESTRIAN_SPECS.filter((spec) =>
      spec.id.startsWith("cctv-foreground-")
    );
    const eastStripes = CROSSWALK_STRIPES.filter(
      (stripe) => stripe.direction === "east"
    );
    const westStripes = CROSSWALK_STRIPES.filter(
      (stripe) => stripe.direction === "west"
    );
    const crosswalkBounds = (stripes: typeof eastStripes) => {
      const xCenter = stripes[0].position[0];
      const xHalfDepth = stripes[0].size[0] / 2;
      const zCenters = stripes.map((stripe) => stripe.position[2]);
      const zHalfStripe = stripes[0].size[1] / 2;

      return {
        minX: xCenter - xHalfDepth,
        maxX: xCenter + xHalfDepth,
        minZ: Math.min(...zCenters) - zHalfStripe,
        maxZ: Math.max(...zCenters) + zHalfStripe
      };
    };
    const eastBounds = crosswalkBounds(eastStripes);
    const westBounds = crosswalkBounds(westStripes);

    for (const spec of cctvForegroundSpecs) {
      const bounds = spec.position[0] >= 0 ? eastBounds : westBounds;
      expect(spec.position[0]).toBeGreaterThanOrEqual(bounds.minX);
      expect(spec.position[0]).toBeLessThanOrEqual(bounds.maxX);
      expect(spec.position[2]).toBeGreaterThanOrEqual(bounds.minZ);
      expect(spec.position[2]).toBeLessThanOrEqual(bounds.maxZ);
    }
  });

  test("builds an imagegen-atlas render plan with explicit non-SUMO truth labels", () => {
    const plan = buildAmbientPedestrianRenderPlan();

    expect(plan.ambientPedestrians).toHaveLength(
      AMBIENT_PEDESTRIAN_SPECS.length
    );
    expect(plan.sourceLabel).toBe(AMBIENT_PEDESTRIAN_TRUTH_SOURCE);
    expect(plan.atlasUrl).toBe(AMBIENT_PEDESTRIAN_ATLAS_URL);
    expect(plan.ambientPedestrians[0].userData).toEqual(
      expect.objectContaining({
        pedestrianLayer: "ambient",
        sumoTruth: false,
        truthSource: "ambient_background_proxy",
        photorealRole: "imagegen_operator_distance_background_person",
        renderMode: "imagegen_alpha_sprite_impostor",
        atlasUrl: AMBIENT_PEDESTRIAN_ATLAS_URL
      })
    );
    expect(plan.ambientPedestrians[0].proofMetadata).toEqual(
      expect.objectContaining({
        sumoTruth: false,
        truthSource: "ambient_background_proxy",
        renderMode: "imagegen_alpha_sprite_impostor"
      })
    );
  });

  test("uses a more legible CCTV render profile without changing ambient truth", () => {
    const widePlan = buildAmbientPedestrianRenderPlan("wide");
    const cctvPlan = buildAmbientPedestrianRenderPlan("cctv");
    const wideNearPedestrian = widePlan.ambientPedestrians.find(
      (pedestrian) => pedestrian.variant.detailLevel === "near"
    );
    const cctvNearPedestrian = cctvPlan.ambientPedestrians.find(
      (pedestrian) => pedestrian.id === wideNearPedestrian?.id
    );

    expect(cctvPlan.ambientPedestrians).toHaveLength(
      widePlan.ambientPedestrians.length
    );
    expect(cctvPlan.sourceLabel).toBe(widePlan.sourceLabel);
    expect(cctvPlan.atlasUrl).toBe(widePlan.atlasUrl);
    expect(widePlan.renderProfile).toBe("operator_wide");
    expect(cctvPlan.renderProfile).toBe("cctv_legible");
    expect(cctvPlan.impostorPitch).toBeGreaterThan(widePlan.impostorPitch);
    expect(cctvNearPedestrian?.spriteScale[0]).toBeGreaterThan(
      wideNearPedestrian?.spriteScale[0] ?? 0
    );
    expect(cctvNearPedestrian?.spriteScale[1]).toBeGreaterThan(
      wideNearPedestrian?.spriteScale[1] ?? 0
    );
  });

  test("renders CCTV pedestrians as depth-writing upright 3D billboards above road decals", () => {
    const element = AmbientPedestrianLayer({
      viewpoint: "cctv"
    }) as ReactElement<TestElementProps>;
    const layerMeshes = Children.toArray(element.props.children).filter(
      (child): child is ReactElement<TestElementProps> =>
        isValidElement<TestElementProps>(child)
    );
    const impostorMesh = layerMeshes.find(
      (child) => child.props.name === "ambient-pedestrian-imagegen-impostors"
    );
    const all = collectElements(element);
    const atlasMaterial = all.find(
      (child) => child.type === "meshBasicMaterial" && child.props.map
    );

    expect(impostorMesh?.props.renderOrder).toBeGreaterThan(7);
    expect(impostorMesh?.props.userData).toEqual(
      expect.objectContaining({
        renderMode: "imagegen_alpha_upright_3d_billboard",
        renderProfile: "cctv_legible"
      })
    );
    expect(atlasMaterial?.props.depthWrite).toBe(true);
    expect(atlasMaterial?.props.alphaTest).toBeGreaterThanOrEqual(0.25);
  });

  test("defines deterministic operator-distance sprite variants", () => {
    const variantIds = new Set(AMBIENT_PEDESTRIAN_VARIANTS.map((v) => v.id));

    expect(AMBIENT_PEDESTRIAN_VARIANTS.length).toBeGreaterThanOrEqual(3);
    for (const spec of AMBIENT_PEDESTRIAN_SPECS) {
      expect(variantIds.has(spec.variantId)).toBe(true);
    }
    for (const variant of AMBIENT_PEDESTRIAN_VARIANTS) {
      expect(variant.spriteWidthMeters).toBeGreaterThan(0.5);
      expect(variant.spriteHeightMeters).toBeGreaterThan(1.5);
      expect(variant.spriteHeightMeters).toBeLessThan(2.5);
      expect(variant.contactShadowScale).toHaveLength(3);
    }
  });

  test("renders grounded imagegen sprite impostors with ambient userData", () => {
    const element = AmbientPedestrianLayer() as ReactElement<TestElementProps>;
    const layerMeshes = Children.toArray(element.props.children).filter(
      (child): child is ReactElement<TestElementProps> =>
        isValidElement<TestElementProps>(child)
    );

    expect(element.props.name).toBe("stage6-ambient-pedestrian-layer");
    expect(element.props.userData).toEqual(
      expect.objectContaining({
        pedestrianLayer: "ambient",
        sumoTruth: false,
        truthSource: "ambient_background_proxy",
        ambientPedestrianCount: AMBIENT_PEDESTRIAN_SPECS.length,
        photorealRole: "imagegen_operator_distance_background_person",
        renderMode: "imagegen_alpha_sprite_impostor",
        atlasUrl: AMBIENT_PEDESTRIAN_ATLAS_URL
      })
    );
    expect(layerMeshes).toHaveLength(2);

    const firstSpec = AMBIENT_PEDESTRIAN_SPECS[0];
    expect(layerMeshes[1].props.userData).toEqual(
      expect.objectContaining({
        pedestrianLayer: "ambient",
        sumoTruth: false,
        truthSource: "ambient_background_proxy",
        renderMode: "imagegen_alpha_sprite_impostor",
        ambientPedestrianCount: AMBIENT_PEDESTRIAN_SPECS.length,
        atlasUrl: AMBIENT_PEDESTRIAN_ATLAS_URL
      })
    );

    expect(layerMeshes.map((child) => child.props.name)).toEqual(
      expect.arrayContaining([
        "ambient-pedestrian-contact-shadows",
        "ambient-pedestrian-imagegen-impostors"
      ])
    );
    expect(layerMeshes.map((child) => child.props.name)).not.toContain(
      `ambient-pedestrian-${firstSpec.id}-torso`
    );
    expect(layerMeshes[0].props.geometry).toBeTruthy();
    expect(layerMeshes[1].props.geometry).toBeTruthy();

    const all = collectElements(element);
    const atlasMaterials = all.filter(
      (child) => child.type === "meshBasicMaterial" && child.props.map
    );
    expect(atlasMaterials).toHaveLength(1);
    expect(atlasMaterials[0].props.transparent).toBe(true);
    expect(atlasMaterials[0].props.alphaTest).toBe(0.18);
  });
});
