"use client";

import { memo, Suspense, useEffect, useRef } from "react";
import type { Group, Object3D } from "three";

import { ApproachCorridors } from "./ApproachCorridors";
import { ProceduralIntersection } from "./ProceduralIntersection";
import { Stage5SceneAssets } from "./Stage5SceneAssets";
import { Stage6SurfaceDecals } from "./Stage6SurfaceDecals";
import type { Stage6QualityPreset } from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

function StaticRoadLayerComponent({
  qualityPreset = getStage6QualityPreset("high"),
  isNight = false
}: {
  qualityPreset?: Stage6QualityPreset;
  isNight?: boolean;
}) {
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    disableNonWhitelistedStaticShadowCasters(groupRef.current);
  }, []);

  return (
    <group ref={groupRef} name="stage5-static-road-layer">
      <ApproachCorridors isNight={isNight} />
      <ProceduralIntersection qualityPreset={qualityPreset} />
      <Stage6SurfaceDecals qualityPreset={qualityPreset} />
      {/* Stage5SceneAssets renders the procedural building facades. At night the
          photoreal plate supplies the city, so these are suppressed to avoid a
          second toy-looking skyline in front of the plate. */}
      {!isNight && (
        <Suspense fallback={null}>
          <Stage5SceneAssets />
        </Suspense>
      )}
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
