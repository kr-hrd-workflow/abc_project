import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  buildMarkingDecalDescriptors,
  type MarkingTextureKey,
} from "./markingDecalDescriptors";

// Photoreal worn road-paint textures (codex imagegen, alpha where the paint is
// worn through so the asphalt shows). Three colours cover the six marking kinds.
const WHITE = "/simulation/r3f/assets/markings/white_paint.webp";
const PLACEHOLDER_URLS: Record<MarkingTextureKey, string> = {
  lane_dashed: WHITE,
  lane_solid: WHITE,
  center_yellow: "/simulation/r3f/assets/markings/yellow_paint.webp",
  bus_border: "/simulation/r3f/assets/markings/blue_paint.webp",
  stop_bar: WHITE,
  crosswalk: WHITE,
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
