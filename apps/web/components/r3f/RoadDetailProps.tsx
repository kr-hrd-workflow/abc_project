"use client";

import { memo, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  Euler,
  LinearFilter,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Texture
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { R3FAssetId } from "./assetManifest";
import {
  CANVAS_TEXT_CELL_HEIGHT,
  CANVAS_TEXT_CELL_WIDTH,
  drawCanvasTextCell,
  type CanvasTextCellOptions
} from "./CanvasTextPlane";
import type { Vector3Tuple } from "./roadGeometry";
import {
  createStage6WeatherAtlasCellTexture,
  STAGE6_WEATHER_ATLAS_ASSET_ID,
  type Stage6WeatherAtlasCellName,
  useStage6WeatherAtlasTexture
} from "./stage6WeatherAtlas";

export type RoadDetailPropKind =
  | "bollard"
  | "traffic_cone"
  | "guardrail"
  | "road_sign"
  | "bus_stop_shelter"
  | "storm_drain"
  | "tactile_paving";

export type RoadDetailPropSource =
  | "manifest_backed"
  | "procedural_background_proxy";

export type RoadDetailPropSpec = {
  id: string;
  kind: RoadDetailPropKind;
  source: RoadDetailPropSource;
  sourceAssetId?: R3FAssetId;
  position: Vector3Tuple;
  rotationY: number;
  scale: Vector3Tuple;
  labelText?: string;
  realBrandClaim?: false;
  mountStyle?: "roadside_pole";
  transitCue?: "bus_stop";
  surfaceDetail?: "drain" | "tactile_paving";
  visibilityTier?: "proof_foreground" | "background";
};

type RoadDetailAtlasKind = "guardrail" | "roadSign";

type RoadDetailPropAtlasTextures = Record<RoadDetailAtlasKind, Texture | null>;

const ROAD_DETAIL_PROP_ATLAS_CELLS = {
  guardrail: "guardrailPanels",
  roadSign: "roadSigns"
} as const satisfies Record<RoadDetailAtlasKind, Stage6WeatherAtlasCellName>;

export function getRoadDetailPropAtlasContracts() {
  return {
    guardrail: {
      atlasCell: ROAD_DETAIL_PROP_ATLAS_CELLS.guardrail,
      sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
    },
    roadSign: {
      atlasCell: ROAD_DETAIL_PROP_ATLAS_CELLS.roadSign,
      sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
    }
  };
}

export const ROAD_DETAIL_PROP_SPECS: RoadDetailPropSpec[] = [
  {
    id: "southwest-curb-bollard-reference",
    kind: "bollard",
    source: "manifest_backed",
    sourceAssetId: "props/curb_details",
    position: [-14.8, 0.48, 22.5],
    rotationY: 0,
    scale: [0.18, 0.92, 0.18]
  },
  {
    id: "northeast-curb-bollard-reference",
    kind: "bollard",
    source: "manifest_backed",
    sourceAssetId: "props/curb_details",
    position: [14.8, 0.48, -23.5],
    rotationY: 0,
    scale: [0.18, 0.92, 0.18]
  },
  {
    id: "west-approach-traffic-cone-0",
    kind: "traffic_cone",
    source: "procedural_background_proxy",
    position: [-58, 0.32, -10.2],
    rotationY: Math.PI / 8,
    scale: [0.55, 0.68, 0.55]
  },
  {
    id: "west-approach-traffic-cone-1",
    kind: "traffic_cone",
    source: "procedural_background_proxy",
    position: [-64, 0.32, -9.7],
    rotationY: -Math.PI / 10,
    scale: [0.5, 0.64, 0.5]
  },
  {
    id: "north-side-guardrail",
    kind: "guardrail",
    source: "procedural_background_proxy",
    position: [-16.8, 0.72, -92],
    rotationY: 0,
    scale: [0.18, 0.54, 28]
  },
  {
    id: "east-side-guardrail",
    kind: "guardrail",
    source: "procedural_background_proxy",
    position: [92, 0.72, 16.8],
    rotationY: Math.PI / 2,
    scale: [0.18, 0.54, 26]
  },
  {
    id: "north-speed-road-sign",
    kind: "road_sign",
    source: "procedural_background_proxy",
    position: [16.6, 2.1, -52],
    rotationY: -Math.PI / 10,
    scale: [1.1, 1.6, 0.08],
    labelText: "테헤란로 / Gangnam",
    realBrandClaim: false,
    visibilityTier: "background"
  },
  {
    id: "south-lane-road-sign",
    kind: "road_sign",
    source: "procedural_background_proxy",
    position: [-16.2, 2.1, 56],
    rotationY: Math.PI + Math.PI / 8,
    scale: [1.2, 1.5, 0.08],
    labelText: "강남대로 / Seoul",
    realBrandClaim: false,
    visibilityTier: "background"
  },
  {
    id: "south-foreground-gangnam-teheran-road-sign",
    kind: "road_sign",
    source: "procedural_background_proxy",
    position: [-18.8, 5.35, 16.6],
    rotationY: Math.PI / 3,
    scale: [3.95, 1.42, 0.1],
    labelText: "강남대로\n테헤란로",
    mountStyle: "roadside_pole",
    realBrandClaim: false,
    visibilityTier: "proof_foreground"
  },
  {
    id: "gangnam-southbound-bus-stop-shelter",
    kind: "bus_stop_shelter",
    source: "procedural_background_proxy",
    position: [-22.4, 1.24, 42],
    rotationY: Math.PI / 2,
    scale: [3.6, 2.3, 1.25],
    labelText: "강남 버스정류장",
    realBrandClaim: false,
    transitCue: "bus_stop",
    visibilityTier: "proof_foreground"
  },
  {
    id: "teheran-northbound-bus-stop-shelter",
    kind: "bus_stop_shelter",
    source: "procedural_background_proxy",
    position: [22.4, 1.24, -46],
    rotationY: -Math.PI / 2,
    scale: [3.4, 2.2, 1.2],
    labelText: "테헤란로 버스정류장",
    realBrandClaim: false,
    transitCue: "bus_stop",
    visibilityTier: "background"
  },
  {
    id: "southwest-tactile-paving-strip",
    kind: "tactile_paving",
    source: "procedural_background_proxy",
    position: [-20.8, 0.13, 24],
    rotationY: 0,
    scale: [0.72, 0.04, 8.8],
    realBrandClaim: false,
    surfaceDetail: "tactile_paving"
  },
  {
    id: "northeast-tactile-paving-strip",
    kind: "tactile_paving",
    source: "procedural_background_proxy",
    position: [20.8, 0.13, -24],
    rotationY: 0,
    scale: [0.72, 0.04, 8.8],
    realBrandClaim: false,
    surfaceDetail: "tactile_paving"
  },
  {
    id: "north-curb-storm-drain",
    kind: "storm_drain",
    source: "procedural_background_proxy",
    position: [-10.6, 0.08, -18.8],
    rotationY: 0,
    scale: [1.7, 0.05, 0.5],
    realBrandClaim: false,
    surfaceDetail: "drain"
  },
  {
    id: "east-curb-storm-drain",
    kind: "storm_drain",
    source: "procedural_background_proxy",
    position: [18.8, 0.08, 10.6],
    rotationY: Math.PI / 2,
    scale: [1.7, 0.05, 0.5],
    realBrandClaim: false,
    surfaceDetail: "drain"
  }
];

// --- Instancing plan ------------------------------------------------------
// The scene renders every repeated same-geometry+same-material primitive through
// a single InstancedMesh instead of one <mesh> per prop. The plan partitions the
// specs by kind (each kind maps to a fixed geometry+material family); the render
// pass then splits a compound kind (road_sign, bus_stop_shelter, storm_drain,
// tactile_paving) into one InstancedMesh per sub-material. Genuinely per-instance
// content (the CanvasTextPlane labels) stays as individual meshes.

export type RoadDetailInstanceGroup = {
  key: string;
  kind: RoadDetailPropKind;
  specs: RoadDetailPropSpec[];
};

export function buildRoadDetailInstancingPlan(
  specs: readonly RoadDetailPropSpec[] = ROAD_DETAIL_PROP_SPECS
): RoadDetailInstanceGroup[] {
  const byKind = new Map<RoadDetailPropKind, RoadDetailPropSpec[]>();
  for (const spec of specs) {
    const bucket = byKind.get(spec.kind);
    if (bucket) bucket.push(spec);
    else byKind.set(spec.kind, [spec]);
  }
  return [...byKind].map(([kind, kindSpecs]) => ({
    key: `${kind}-instances`,
    kind,
    specs: kindSpecs
  }));
}

// --- World-matrix helpers -------------------------------------------------
// Reproduce the exact world transform Three would compute for each original
// mesh so the instanced output is pixel-equivalent. Simple props were a single
// <mesh position rotationY scale>; compound props were sub-meshes inside a
// <group position rotationY> with their own local position+scale.
const _pos = new Vector3();
const _quat = new Quaternion();
const _euler = new Euler();
const _scale = new Vector3();

function meshMatrix(
  position: Vector3Tuple,
  rotationY: number,
  scale: Vector3Tuple
): Matrix4 {
  return new Matrix4().compose(
    _pos.set(position[0], position[1], position[2]),
    _quat.setFromEuler(_euler.set(0, rotationY, 0)),
    _scale.set(scale[0], scale[1], scale[2])
  );
}

// world = parent(group position+rotationY) · local(child position+scale)
function childMeshMatrix(
  groupPosition: Vector3Tuple,
  groupRotationY: number,
  localPosition: Vector3Tuple,
  localScale: Vector3Tuple
): Matrix4 {
  return meshMatrix(groupPosition, groupRotationY, [1, 1, 1]).multiply(
    meshMatrix(localPosition, 0, localScale)
  );
}

function signPoleHeight(spec: RoadDetailPropSpec): number {
  return Math.max(1.8, spec.position[1] - spec.scale[1] * 0.18);
}

// --- Instanced primitive --------------------------------------------------
// Shared by RoadDetailProps and SignalHardware. `colors` (one hex per matrix)
// rides instanceColor on a white base material, so groups that differ ONLY by
// color merge into a single draw call with exact per-instance colors.
const _instanceColor = new Color();

export function InstancedProceduralMesh({
  name,
  matrices,
  colors,
  userData,
  receiveShadow = false,
  children
}: {
  name: string;
  matrices: Matrix4[];
  colors?: readonly string[];
  userData?: Record<string, unknown>;
  receiveShadow?: boolean;
  children: ReactNode; // geometry + material JSX
}) {
  const meshRef = useRef<InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    // jsdom/mocked Canvas renders host tags as inert DOM nodes with no
    // InstancedMesh API — no-op there (matches instancedBatches' guard).
    if (!mesh || typeof mesh.setMatrixAt !== "function") return;
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    if (colors && typeof mesh.setColorAt === "function") {
      colors.forEach((color, index) =>
        mesh.setColorAt(index, _instanceColor.set(color))
      );
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingSphere();
  }, [matrices, colors]);

  if (matrices.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      name={name}
      args={[undefined, undefined, matrices.length]}
      receiveShadow={receiveShadow}
      userData={userData}
    >
      {children}
    </instancedMesh>
  );
}

function RoadDetailPropsComponent() {
  const atlasTexture = useStage6WeatherAtlasTexture();
  const atlasTextures = useMemo<RoadDetailPropAtlasTextures>(
    () => ({
      guardrail: atlasTexture
        ? createStage6WeatherAtlasCellTexture(
            atlasTexture,
            ROAD_DETAIL_PROP_ATLAS_CELLS.guardrail,
            SRGBColorSpace
          )
        : null,
      roadSign: atlasTexture
        ? createStage6WeatherAtlasCellTexture(
            atlasTexture,
            ROAD_DETAIL_PROP_ATLAS_CELLS.roadSign,
            SRGBColorSpace
          )
        : null
    }),
    [atlasTexture]
  );

  useEffect(
    () => () => {
      atlasTextures.guardrail?.dispose();
      atlasTextures.roadSign?.dispose();
    },
    [atlasTextures]
  );

  const specsByKind = useMemo(() => {
    const map = {} as Record<RoadDetailPropKind, RoadDetailPropSpec[]>;
    for (const group of buildRoadDetailInstancingPlan(ROAD_DETAIL_PROP_SPECS)) {
      map[group.kind] = group.specs;
    }
    return map;
  }, []);

  // 2026-07-04 draw-call reduction: sub-material groups that share a geometry
  // family and a material KIND (opaque meshStandardMaterial, no map) are merged
  // into single InstancedMesh batches; the per-group color moves to
  // instanceColor (exact — white base x instance color). Only roughness/
  // metalness are averaged within a batch, imperceptible on these small dark
  // props. 14 instanced groups -> 7.
  const matrices = useMemo(() => {
    const bollards = specsByKind.bollard ?? [];
    const cones = specsByKind.traffic_cone ?? [];
    const guardrails = specsByKind.guardrail ?? [];
    const stormDrains = specsByKind.storm_drain ?? [];
    const tactile = specsByKind.tactile_paving ?? [];
    const signs = specsByKind.road_sign ?? [];
    const shelters = specsByKind.bus_stop_shelter ?? [];

    const entry = (matrix: Matrix4, color: string) => ({ matrix, color });

    // Cylinders: bollards + sign poles (sign poles were 10-segment, now share
    // the 14-segment unit cylinder — invisible at 0.08 m radius).
    const cylinders = [
      ...bollards.map((s) =>
        entry(meshMatrix(s.position, s.rotationY, s.scale), "#b8bfc0")
      ),
      ...signs.map((s) =>
        entry(
          childMeshMatrix(
            s.position,
            s.rotationY,
            [0, -signPoleHeight(s) / 2, 0],
            [0.08, signPoleHeight(s), 0.08]
          ),
          "#59666b"
        )
      )
    ];

    // Tactile paving base + band.
    const tactileBoxes = [
      ...tactile.map((s) =>
        entry(meshMatrix(s.position, s.rotationY, s.scale), "#b5a94e")
      ),
      ...tactile.map((s) =>
        entry(
          childMeshMatrix(s.position, s.rotationY, [0, 0.05, 0], [
            s.scale[0] * 0.72,
            0.035,
            s.scale[2] * 0.92
          ]),
          "#d0bf5b"
        )
      )
    ];

    // Dark metal/concrete boxes: storm drains (base+grate), sign backings,
    // shelter floors/roofs/posts.
    const darkBoxes = [
      ...stormDrains.map((s) =>
        entry(meshMatrix(s.position, s.rotationY, s.scale), "#20282b")
      ),
      ...stormDrains.map((s) =>
        entry(
          childMeshMatrix(s.position, s.rotationY, [0, 0.04, 0], [
            s.scale[0] * 0.78,
            0.018,
            s.scale[2] * 1.08
          ]),
          "#667177"
        )
      ),
      ...signs.map((s) =>
        entry(meshMatrix(s.position, s.rotationY, s.scale), "#435156")
      ),
      ...shelters.map((s) =>
        entry(
          childMeshMatrix(s.position, s.rotationY, [0, -0.96, 0], [
            s.scale[0],
            0.08,
            s.scale[2]
          ]),
          "#2d363a"
        )
      ),
      ...shelters.map((s) =>
        entry(
          childMeshMatrix(s.position, s.rotationY, [0, 1.28, 0], [
            s.scale[0] * 1.08,
            0.14,
            s.scale[2] * 1.08
          ]),
          "#263138"
        )
      ),
      ...shelters.flatMap((s) =>
        [-1, 1].map((side) =>
          entry(
            childMeshMatrix(
              s.position,
              s.rotationY,
              [side * s.scale[0] * 0.42, 0, 0.42],
              [0.08, s.scale[1], 0.08]
            ),
            "#5f6b70"
          )
        )
      )
    ];

    return {
      cone: cones.map((s) => meshMatrix(s.position, s.rotationY, s.scale)),
      guardrail: guardrails.map((s) =>
        meshMatrix(s.position, s.rotationY, s.scale)
      ),
      signFace: signs.map((s) =>
        childMeshMatrix(
          s.position,
          s.rotationY,
          [0, 0, s.scale[2] * 0.5 + 0.004],
          [s.scale[0], s.scale[1], 1]
        )
      ),
      shelterGlass: shelters.map((s) =>
        childMeshMatrix(s.position, s.rotationY, [0, 0.05, -0.48], [
          s.scale[0],
          s.scale[1],
          0.08
        ])
      ),
      cylinders: {
        matrices: cylinders.map((e) => e.matrix),
        colors: cylinders.map((e) => e.color)
      },
      tactile: {
        matrices: tactileBoxes.map((e) => e.matrix),
        colors: tactileBoxes.map((e) => e.color)
      },
      darkBoxes: {
        matrices: darkBoxes.map((e) => e.matrix),
        colors: darkBoxes.map((e) => e.color)
      }
    };
  }, [specsByKind]);

  const signSpecs = specsByKind.road_sign ?? [];
  const shelterSpecs = specsByKind.bus_stop_shelter ?? [];

  return (
    <group
      name="stage6-road-detail-props"
      userData={{
        manifestBackedAssetIds: ["props/curb_details"],
        atlasContracts: getRoadDetailPropAtlasContracts(),
        proceduralProxyReason: "background road props without new asset downloads"
      }}
    >
      <InstancedProceduralMesh
        name="road-detail-cylinders"
        matrices={matrices.cylinders.matrices}
        colors={matrices.cylinders.colors}
      >
        <cylinderGeometry args={[1, 1, 1, 14]} />
        {/* ponytail: bollards+sign poles share one averaged metal material
            (was r0.42/m0.28 and r0.5/m0.24); split again if it ever shows */}
        <meshStandardMaterial color="#ffffff" roughness={0.46} metalness={0.26} />
      </InstancedProceduralMesh>

      <InstancedProceduralMesh name="road-detail-traffic-cones" matrices={matrices.cone}>
        <coneGeometry args={[0.42, 1, 10]} />
        <meshStandardMaterial color="#d06437" roughness={0.58} metalness={0.02} />
      </InstancedProceduralMesh>

      <InstancedProceduralMesh
        name="road-detail-guardrails"
        matrices={matrices.guardrail}
        userData={{
          atlasCell: ROAD_DETAIL_PROP_ATLAS_CELLS.guardrail,
          sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={atlasTextures.guardrail ? "#d2d7d0" : "#879196"}
          map={atlasTextures.guardrail ?? undefined}
          roughness={0.48}
          metalness={0.38}
          envMapIntensity={0.72}
        />
      </InstancedProceduralMesh>

      <InstancedProceduralMesh
        name="road-detail-tactile-paving"
        matrices={matrices.tactile.matrices}
        colors={matrices.tactile.colors}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.69} metalness={0.025} />
      </InstancedProceduralMesh>

      <InstancedProceduralMesh
        name="road-detail-dark-boxes"
        matrices={matrices.darkBoxes.matrices}
        colors={matrices.darkBoxes.colors}
      >
        <boxGeometry args={[1, 1, 1]} />
        {/* ponytail: storm drains + sign backings + shelter floors/roofs/posts
            share one averaged dark material (r0.48-0.66/m0.08-0.5 originals);
            split again if the compromise ever shows */}
        <meshStandardMaterial color="#ffffff" roughness={0.55} metalness={0.29} />
      </InstancedProceduralMesh>

      <InstancedProceduralMesh
        name="road-detail-sign-faces"
        matrices={matrices.signFace}
        userData={{
          atlasCell: ROAD_DETAIL_PROP_ATLAS_CELLS.roadSign,
          sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
        }}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={atlasTextures.roadSign ? "#f2f0df" : "#6e8488"}
          emissive={atlasTextures.roadSign ? "#c7d6d0" : "#000000"}
          emissiveIntensity={atlasTextures.roadSign ? 0.18 : 0}
          map={atlasTextures.roadSign ?? undefined}
          metalness={0.05}
          roughness={0.5}
          toneMapped={false}
        />
      </InstancedProceduralMesh>

      <InstancedProceduralMesh name="road-detail-shelter-glass" matrices={matrices.shelterGlass}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#6b838c"
          roughness={0.34}
          metalness={0.18}
          transparent
          opacity={0.44}
        />
      </InstancedProceduralMesh>

      {/* All unique canvas labels baked into ONE atlas texture + one merged
          mesh (was 5 individual CanvasTextPlane meshes; 2026-07-04). */}
      <RoadDetailLabelAtlas signSpecs={signSpecs} shelterSpecs={shelterSpecs} />
    </group>
  );
}

// --- Label atlas ------------------------------------------------------------
// Bakes every labelText into one vertical canvas atlas (1024x512 per cell,
// same cell drawing as CanvasTextPlane) and renders all label planes as ONE
// mesh: per-label PlaneGeometries get their UVs remapped to their atlas row,
// are transformed to their exact former world placement, and merged.
type RoadDetailLabelCell = CanvasTextCellOptions & {
  size: [number, number];
  worldMatrix: Matrix4;
  meta: Record<string, unknown>;
};

function buildRoadDetailLabelCells(
  signSpecs: RoadDetailPropSpec[],
  shelterSpecs: RoadDetailPropSpec[]
): RoadDetailLabelCell[] {
  const cells: RoadDetailLabelCell[] = [];
  for (const spec of signSpecs) {
    if (!spec.labelText) continue;
    cells.push({
      text: spec.labelText,
      backgroundColor: "rgba(16,67,78,0.9)",
      borderColor: "rgba(237,248,239,0.46)",
      textColor: "#f6fbf5",
      fontWeight: 800,
      size: [spec.scale[0] * 0.96, spec.scale[1] * 0.72],
      worldMatrix: childMeshMatrix(
        spec.position,
        spec.rotationY,
        [0, 0, spec.scale[2] * 0.5 + 0.01],
        [1, 1, 1]
      ),
      meta: {
        labelText: spec.labelText,
        realBrandClaim: false,
        visibilityTier: spec.visibilityTier
      }
    });
  }
  for (const spec of shelterSpecs) {
    if (!spec.labelText) continue;
    cells.push({
      text: spec.labelText,
      backgroundColor: "rgba(17,50,61,0.86)",
      borderColor: "rgba(225,245,239,0.42)",
      textColor: "#effaf3",
      fontWeight: 800,
      size: [spec.scale[0] * 0.72, 0.48],
      worldMatrix: childMeshMatrix(
        spec.position,
        spec.rotationY,
        [0, 0.62, 0.5],
        [1, 1, 1]
      ),
      meta: {
        labelText: spec.labelText,
        realBrandClaim: false,
        transitCue: spec.transitCue,
        visibilityTier: spec.visibilityTier
      }
    });
  }
  return cells;
}

function RoadDetailLabelAtlas({
  signSpecs,
  shelterSpecs
}: {
  signSpecs: RoadDetailPropSpec[];
  shelterSpecs: RoadDetailPropSpec[];
}) {
  const cells = useMemo(
    () => buildRoadDetailLabelCells(signSpecs, shelterSpecs),
    [signSpecs, shelterSpecs]
  );

  const atlas = useMemo<{
    texture: Texture;
    geometry: BufferGeometry;
  } | null>(() => {
    if (
      typeof document === "undefined" ||
      isJsdomRuntime() ||
      cells.length === 0
    ) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_TEXT_CELL_WIDTH;
    canvas.height = CANVAS_TEXT_CELL_HEIGHT * cells.length;
    const context = canvas.getContext("2d");
    if (!context) return null;

    cells.forEach((cell, index) =>
      drawCanvasTextCell(context, index * CANVAS_TEXT_CELL_HEIGHT, cell)
    );

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.needsUpdate = true;

    const cellCount = cells.length;
    const planes = cells.map((cell, index) => {
      const plane = new PlaneGeometry(cell.size[0], cell.size[1]);
      const uv = plane.attributes.uv;
      // Row `index` (top-down canvas, flipY texture) spans
      // v in [1-(index+1)/n, 1-index/n].
      for (let k = 0; k < uv.count; k += 1) {
        uv.setY(k, (uv.getY(k) + (cellCount - 1 - index)) / cellCount);
      }
      plane.applyMatrix4(cell.worldMatrix);
      return plane;
    });
    const geometry = mergeGeometries(planes);
    planes.forEach((plane) => plane.dispose());
    if (!geometry) {
      texture.dispose();
      return null;
    }

    return { texture, geometry };
  }, [cells]);

  useEffect(
    () => () => {
      atlas?.texture.dispose();
      atlas?.geometry.dispose();
    },
    [atlas]
  );

  if (!atlas) return null;

  return (
    <mesh
      name="road-detail-label-atlas"
      geometry={atlas.geometry}
      renderOrder={8}
      userData={{
        runtimeLabelRenderer: "canvas_texture_atlas",
        labels: cells.map((cell) => cell.meta)
      }}
    >
      <meshBasicMaterial
        map={atlas.texture}
        side={DoubleSide}
        toneMapped={false}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" &&
    /jsdom/i.test(window.navigator.userAgent)
  );
}

export const RoadDetailProps = memo(RoadDetailPropsComponent);
RoadDetailProps.displayName = "RoadDetailProps";
