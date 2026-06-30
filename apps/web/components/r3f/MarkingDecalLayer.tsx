import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  buildMarkingDecalDescriptors,
  type MarkingTextureKey,
} from "./markingDecalDescriptors";

// Phase 0 placeholder paint textures (worn white line / yellow / crosswalk / stop bar).
// Swap to imagegen-extracted photoreal paint in the Phase 0 authoring follow-on.
const PLACEHOLDER_URLS: Record<MarkingTextureKey, string> = {
  lane_dashed: "/simulation/r3f/assets/markings/lane_dashed.webp",
  lane_solid: "/simulation/r3f/assets/markings/lane_solid.webp",
  center_yellow: "/simulation/r3f/assets/markings/center_yellow.webp",
  bus_border: "/simulation/r3f/assets/markings/bus_border.webp",
  stop_bar: "/simulation/r3f/assets/markings/stop_bar.webp",
  crosswalk: "/simulation/r3f/assets/markings/crosswalk.webp",
};

type Props = { textureUrls?: Partial<Record<MarkingTextureKey, string>> };

export function MarkingDecalLayer({ textureUrls }: Props) {
  const urls = { ...PLACEHOLDER_URLS, ...(textureUrls ?? {}) };
  const keys = Object.keys(urls) as MarkingTextureKey[];
  const texList = useTexture(keys.map((k) => urls[k]));
  const texByKey = useMemo(() => {
    const m = new Map<MarkingTextureKey, unknown>();
    keys.forEach((k, i) => m.set(k, Array.isArray(texList) ? texList[i] : texList));
    return m;
  }, [texList]);

  const descriptors = useMemo(() => buildMarkingDecalDescriptors(), []);

  return (
    <group name="marking-decal-layer">
      {descriptors.map((d) => (
        <mesh
          key={d.id}
          name={d.id}
          position={d.position}
          rotation={[-Math.PI / 2, d.rotationY, 0]}
          renderOrder={7}
        >
          <planeGeometry args={d.size} />
          <meshBasicMaterial
            map={(texByKey.get(d.textureKey) as never) ?? null}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

MarkingDecalLayer.displayName = "MarkingDecalLayer";
