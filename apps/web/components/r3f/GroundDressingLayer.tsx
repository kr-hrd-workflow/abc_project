"use client";

import { memo, Suspense } from "react";
import { CITY_GROUND_APRON, CURB_SEGMENTS, SIDEWALK_SLABS } from "./roadGeometry";
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
  {
    name: "ground-dressing-city-apron",
    kind: "plane" as const,
    materialKey: "cityGround" as const,
    specs: CITY_GROUND_APRON
  },
  {
    name: "ground-dressing-sidewalk-slabs",
    kind: "box" as const,
    materialKey: "sidewalk" as const,
    specs: SIDEWALK_SLABS
  },
  {
    name: "ground-dressing-curbs",
    kind: "box" as const,
    materialKey: "curb" as const,
    specs: CURB_SEGMENTS
  }
];

function GroundDressingContent() {
  const roadMaterials: Stage5RoadMaterialSet = useStage5RoadMaterials();
  // Both plane batches (base plane + city apron) share the cityGround material
  // and identical render props, so they draw as ONE InstancedMesh
  // (2026-07-04 draw-call reduction). Box batches keep distinct materials.
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
