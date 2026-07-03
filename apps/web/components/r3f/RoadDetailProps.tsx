"use client";

import { memo, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Euler,
  Matrix4,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  type InstancedMesh,
  type Texture
} from "three";

import type { R3FAssetId } from "./assetManifest";
import { CanvasTextPlane } from "./CanvasTextPlane";
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
function InstancedProceduralMesh({
  name,
  matrices,
  userData,
  children
}: {
  name: string;
  matrices: Matrix4[];
  userData?: Record<string, unknown>;
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
    mesh.computeBoundingSphere();
  }, [matrices]);

  if (matrices.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      name={name}
      args={[undefined, undefined, matrices.length]}
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

  const matrices = useMemo(() => {
    const bollards = specsByKind.bollard ?? [];
    const cones = specsByKind.traffic_cone ?? [];
    const guardrails = specsByKind.guardrail ?? [];
    const stormDrains = specsByKind.storm_drain ?? [];
    const tactile = specsByKind.tactile_paving ?? [];
    const signs = specsByKind.road_sign ?? [];
    const shelters = specsByKind.bus_stop_shelter ?? [];

    return {
      bollard: bollards.map((s) => meshMatrix(s.position, s.rotationY, s.scale)),
      cone: cones.map((s) => meshMatrix(s.position, s.rotationY, s.scale)),
      guardrail: guardrails.map((s) =>
        meshMatrix(s.position, s.rotationY, s.scale)
      ),
      stormBase: stormDrains.map((s) =>
        meshMatrix(s.position, s.rotationY, s.scale)
      ),
      stormGrate: stormDrains.map((s) =>
        childMeshMatrix(s.position, s.rotationY, [0, 0.04, 0], [
          s.scale[0] * 0.78,
          0.018,
          s.scale[2] * 1.08
        ])
      ),
      tactileBase: tactile.map((s) =>
        meshMatrix(s.position, s.rotationY, s.scale)
      ),
      tactileBand: tactile.map((s) =>
        childMeshMatrix(s.position, s.rotationY, [0, 0.05, 0], [
          s.scale[0] * 0.72,
          0.035,
          s.scale[2] * 0.92
        ])
      ),
      signPole: signs.map((s) =>
        childMeshMatrix(
          s.position,
          s.rotationY,
          [0, -signPoleHeight(s) / 2, 0],
          [0.08, signPoleHeight(s), 0.08]
        )
      ),
      signBacking: signs.map((s) =>
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
      shelterFloor: shelters.map((s) =>
        childMeshMatrix(s.position, s.rotationY, [0, -0.96, 0], [
          s.scale[0],
          0.08,
          s.scale[2]
        ])
      ),
      shelterGlass: shelters.map((s) =>
        childMeshMatrix(s.position, s.rotationY, [0, 0.05, -0.48], [
          s.scale[0],
          s.scale[1],
          0.08
        ])
      ),
      shelterRoof: shelters.map((s) =>
        childMeshMatrix(s.position, s.rotationY, [0, 1.28, 0], [
          s.scale[0] * 1.08,
          0.14,
          s.scale[2] * 1.08
        ])
      ),
      shelterPosts: shelters.flatMap((s) =>
        [-1, 1].map((side) =>
          childMeshMatrix(
            s.position,
            s.rotationY,
            [side * s.scale[0] * 0.42, 0, 0.42],
            [0.08, s.scale[1], 0.08]
          )
        )
      )
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
      <InstancedProceduralMesh name="road-detail-bollards" matrices={matrices.bollard}>
        <cylinderGeometry args={[1, 1, 1, 14]} />
        <meshStandardMaterial color="#b8bfc0" roughness={0.42} metalness={0.28} />
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

      <InstancedProceduralMesh name="road-detail-storm-drains" matrices={matrices.stormBase}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#20282b" roughness={0.58} metalness={0.46} />
      </InstancedProceduralMesh>
      <InstancedProceduralMesh
        name="road-detail-storm-drain-grates"
        matrices={matrices.stormGrate}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#667177" roughness={0.48} metalness={0.5} />
      </InstancedProceduralMesh>

      <InstancedProceduralMesh name="road-detail-tactile-paving" matrices={matrices.tactileBase}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#b5a94e" roughness={0.7} metalness={0.03} />
      </InstancedProceduralMesh>
      <InstancedProceduralMesh
        name="road-detail-tactile-bands"
        matrices={matrices.tactileBand}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d0bf5b" roughness={0.68} metalness={0.02} />
      </InstancedProceduralMesh>

      <InstancedProceduralMesh name="road-detail-sign-poles" matrices={matrices.signPole}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshStandardMaterial color="#59666b" roughness={0.5} metalness={0.24} />
      </InstancedProceduralMesh>
      <InstancedProceduralMesh name="road-detail-sign-backings" matrices={matrices.signBacking}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#435156" roughness={0.62} metalness={0.08} />
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

      <InstancedProceduralMesh name="road-detail-shelter-floors" matrices={matrices.shelterFloor}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2d363a" roughness={0.66} metalness={0.12} />
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
      <InstancedProceduralMesh name="road-detail-shelter-roofs" matrices={matrices.shelterRoof}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#263138" roughness={0.48} metalness={0.28} />
      </InstancedProceduralMesh>
      <InstancedProceduralMesh name="road-detail-shelter-posts" matrices={matrices.shelterPosts}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5f6b70" roughness={0.5} metalness={0.32} />
      </InstancedProceduralMesh>

      {/* Per-instance canvas labels stay individual — each has a unique texture. */}
      {signSpecs.map((spec) =>
        spec.labelText ? (
          <group
            key={`${spec.id}-label`}
            position={spec.position}
            rotation={[0, spec.rotationY, 0]}
          >
            <CanvasTextPlane
              backgroundColor="rgba(16,67,78,0.9)"
              borderColor="rgba(237,248,239,0.46)"
              position={[0, 0, spec.scale[2] * 0.5 + 0.01]}
              renderOrder={8}
              size={[spec.scale[0] * 0.96, spec.scale[1] * 0.72]}
              text={spec.labelText}
              textColor="#f6fbf5"
              userData={{
                labelText: spec.labelText,
                realBrandClaim: false,
                visibilityTier: spec.visibilityTier
              }}
            />
          </group>
        ) : null
      )}
      {shelterSpecs.map((spec) =>
        spec.labelText ? (
          <group
            key={`${spec.id}-label`}
            position={spec.position}
            rotation={[0, spec.rotationY, 0]}
          >
            <CanvasTextPlane
              backgroundColor="rgba(17,50,61,0.86)"
              borderColor="rgba(225,245,239,0.42)"
              position={[0, 0.62, 0.5]}
              renderOrder={7}
              size={[spec.scale[0] * 0.72, 0.48]}
              text={spec.labelText}
              textColor="#effaf3"
              userData={{
                labelText: spec.labelText,
                realBrandClaim: false,
                transitCue: spec.transitCue,
                visibilityTier: spec.visibilityTier
              }}
            />
          </group>
        ) : null
      )}
    </group>
  );
}

export const RoadDetailProps = memo(RoadDetailPropsComponent);
RoadDetailProps.displayName = "RoadDetailProps";
