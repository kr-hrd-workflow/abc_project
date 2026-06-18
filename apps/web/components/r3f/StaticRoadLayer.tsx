"use client";

import { memo, Suspense, useEffect, useRef } from "react";
import type { Group, Object3D } from "three";

import { ApproachCorridors } from "./ApproachCorridors";
import { ProceduralIntersection } from "./ProceduralIntersection";
import { Stage5SceneAssets } from "./Stage5SceneAssets";

function StaticRoadLayerComponent() {
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    disableNonWhitelistedStaticShadowCasters(groupRef.current);
  }, []);

  return (
    <group ref={groupRef} name="stage5-static-road-layer">
      <ApproachCorridors />
      <ProceduralIntersection />
      <Suspense fallback={null}>
        <Stage5SceneAssets />
      </Suspense>
    </group>
  );
}

export const StaticRoadLayer = memo(StaticRoadLayerComponent);
StaticRoadLayer.displayName = "StaticRoadLayer";

function disableNonWhitelistedStaticShadowCasters(group: Group | null) {
  if (!isThreeGroup(group)) return;

  group.traverse((object) => {
    const shadowObject = object as Object3D & {
      castShadow?: boolean;
      userData: Object3D["userData"] & { realShadowWhitelist?: boolean };
    };

    if (
      shadowObject.castShadow === true &&
      shadowObject.userData.realShadowWhitelist !== true
    ) {
      shadowObject.castShadow = false;
    }
  });
}

function isThreeGroup(group: Group | null): group is Group {
  return Boolean(group && typeof group.traverse === "function");
}
