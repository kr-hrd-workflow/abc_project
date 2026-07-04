"use client";

import { memo, Suspense, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { SRGBColorSpace, type Texture } from "three";
import {
  CURB_SEGMENTS,
  INTERSECTION_BOX_METERS,
  SIDEWALK_SLABS_EW,
  SIDEWALK_SLABS_NS,
  STAGE6E_CITY_EDGE_BLOCKS,
  type Vector3Tuple
} from "./roadGeometry";
import { InstancedBoxBatch, InstancedPlaneBatch } from "./instancedBatches";
import { useStage5RoadMaterials, type Stage5RoadMaterialSet } from "./roadMaterials";

// Single big plane under everything: kills the sky-dome ground void in one
// draw call. Sits below road asphalt; sidewalk/curb batches add near-road
// definition on top. Photoreal maps arrive in Task 5 (imagegen atlas); until
// then the stage5 material set's sidewalk/cityGround textures apply.
export const GROUND_DRESSING_BATCHES = [
  {
    name: "ground-dressing-base-plane",
    kind: "plane" as const,
    materialKey: "cityGround" as const,
    specs: [
      {
        id: "ground-base",
        position: [0, -0.06, 0] as [number, number, number],
        size: [720, 720] as [number, number]
      }
    ]
  },
  // Sidewalk slabs are split by orientation so the Task 5 paver atlas can tile
  // square in world space on both (shared instanced UVs transpose u/v between
  // NS and EW slabs; sidewalkCross carries the transposed repeats).
  {
    name: "ground-dressing-sidewalk-slabs",
    kind: "box" as const,
    materialKey: "sidewalk" as const,
    specs: SIDEWALK_SLABS_NS
  },
  {
    name: "ground-dressing-sidewalk-slabs-ew",
    kind: "box" as const,
    materialKey: "sidewalkCross" as const,
    specs: SIDEWALK_SLABS_EW
  },
  {
    name: "ground-dressing-curbs",
    kind: "box" as const,
    materialKey: "curb" as const,
    specs: CURB_SEGMENTS
  }
];

// Photoreal imagegen ground plates that fill the four empty pedestrian corners
// outside the carriageway box (HALF_BOX = 18m). Each plate's road-facing edge
// starts exactly at the curb outer face (HALF_BOX + CURB_WIDTH 0.45) so the
// baked per-corner L (yellow tactile strip + curb ramp) lands at its crosswalk
// corner; the two opposite edges run under the building frontage. Albedo-only
// textures — scene lighting does the shading — so no baked shadow conflicts
// with sun direction. Plates render only in the full scene, never in roadonly.
// y=0.1 sits 10mm above the sidewalk box-slab tops (0.09) so the plate reads
// where it crosses the corridor slab bands, above the city-ground apron
// (-0.012), and entirely off-road — so it never touches the on-road marking
// decal lift range (MARKING_HEIGHT 0.018 .. +0.026).
const CORNER_PLATE_HALF_BOX = INTERSECTION_BOX_METERS / 2;
const CORNER_PLATE_SIZE = 26;
const CORNER_PLATE_CENTER = CORNER_PLATE_HALF_BOX + 0.45 + CORNER_PLATE_SIZE / 2;
const CORNER_PLATE_Y = 0.1;
const GROUND_TEXTURE_DIR = "/simulation/r3f/assets/textures/ground";

export const CORNER_PLAZA_PLATES: {
  id: string;
  position: Vector3Tuple;
  size: [number, number];
  textureUrl: string;
}[] = [
  { id: "ne", sx: 1, sz: -1 },
  { id: "nw", sx: -1, sz: -1 },
  { id: "se", sx: 1, sz: 1 },
  { id: "sw", sx: -1, sz: 1 }
].map(({ id, sx, sz }) => ({
  id: `corner-plaza-${id}`,
  position: [sx * CORNER_PLATE_CENTER, CORNER_PLATE_Y, sz * CORNER_PLATE_CENTER],
  size: [CORNER_PLATE_SIZE, CORNER_PLATE_SIZE],
  textureUrl: `${GROUND_TEXTURE_DIR}/corner_plaza_${id}.webp`
}));

// Textured periphery edge blocks: the >=70 m subset of the stage6e city-edge
// segments. The <70 m segments flank the near corridors where the hero
// buildings already stand, so filtering them out prevents double-rendered
// buildings; the far subset gives the mid-distance streets a built edge that
// continues past the frame. One instanced draw call, one shared strip texture.
export const PERIPHERY_EDGE_BLOCKS = STAGE6E_CITY_EDGE_BLOCKS.filter(
  (b) => Math.max(Math.abs(b.position[0]), Math.abs(b.position[2])) >= 70
);

const EDGE_FACADE_TEXTURE_URL = `${GROUND_TEXTURE_DIR}/edge_facade_strip.webp`;

function PeripheryEdgeBlocks() {
  const map = useTexture(EDGE_FACADE_TEXTURE_URL) as Texture;
  const edgeFacadeTexture = useMemo(() => {
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [map]);

  return (
    <InstancedBoxBatch
      name="ground-dressing-edge-blocks"
      specs={PERIPHERY_EDGE_BLOCKS}
      material={{
        color: "#8d949e",
        roughness: 0.85,
        metalness: 0.04,
        map: edgeFacadeTexture
      }}
      receiveShadow
    />
  );
}

function CornerPlazaPlates() {
  const maps = useTexture(CORNER_PLAZA_PLATES.map((p) => p.textureUrl));
  const textures = useMemo(() => {
    const list = Array.isArray(maps) ? maps : [maps];
    for (const map of list as Texture[]) {
      map.colorSpace = SRGBColorSpace;
    }
    return list as Texture[];
  }, [maps]);

  return (
    <group name="ground-dressing-corner-plazas">
      {CORNER_PLAZA_PLATES.map((plate, index) => (
        <mesh
          key={plate.id}
          name={plate.id}
          position={plate.position}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={-2}
          receiveShadow
        >
          <planeGeometry args={plate.size} />
          <meshStandardMaterial map={textures[index]} roughness={0.92} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

function GroundDressingContent() {
  const roadMaterials: Stage5RoadMaterialSet = useStage5RoadMaterials();
  // Only one plane batch remains (base plane); still filtered/flattened so
  // adding a sibling plane batch back stays a one-line change. Box batches
  // keep distinct materials.
  //
  // 2026-07-04: the former "city apron" plane (CITY_GROUND_APRON, a legacy
  // wet-era darkening ring sitting only 12mm below the road surface at
  // y=-0.012) was removed here: it z-fought with the road surface at far
  // grazing angles (12mm is under depth-buffer precision at distance) and
  // duplicated ground coverage the 720x720 base plane (y=-0.06) already
  // provides. Codex A/B confirmed the base plane + sidewalks cover the
  // ground equivalently with the apron gone (see prefix-b-report.md).
  const planeSpecs = GROUND_DRESSING_BATCHES.filter(
    (batch) => batch.kind === "plane"
  ).flatMap((batch) => batch.specs);
  return (
    <group name="ground-dressing-layer">
      <InstancedPlaneBatch
        name="ground-dressing-city-ground"
        specs={planeSpecs}
        material={roadMaterials.cityGround}
        renderOrder={-3}
        receiveShadow
      />
      {GROUND_DRESSING_BATCHES.filter((batch) => batch.kind === "box").map(
        (batch) => (
          <InstancedBoxBatch
            key={batch.name}
            name={batch.name}
            specs={batch.specs}
            material={roadMaterials[batch.materialKey]}
            receiveShadow
          />
        )
      )}
      <PeripheryEdgeBlocks />
      <CornerPlazaPlates />
    </group>
  );
}

function GroundDressingLayerComponent({ isNight = false }: { isNight?: boolean }) {
  void isNight; // night grade handled by scene lighting; prop reserved for parity with siblings
  return (
    <Suspense fallback={null}>
      <GroundDressingContent />
    </Suspense>
  );
}

export const GroundDressingLayer = memo(GroundDressingLayerComponent);
GroundDressingLayer.displayName = "GroundDressingLayer";
