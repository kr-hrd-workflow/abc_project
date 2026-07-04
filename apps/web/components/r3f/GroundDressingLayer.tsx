"use client";

import { memo, Suspense } from "react";
import { CURB_SEGMENTS, SIDEWALK_SLABS } from "./roadGeometry";
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
