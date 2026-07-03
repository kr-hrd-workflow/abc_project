import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { BufferGeometry, PlaneGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildMarkingDecalDescriptors,
  type MarkingDecalDescriptor,
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

// Merge every decal sharing a texture into ONE geometry so the whole marking set
// is 6 draw calls (one per texture key) instead of ~790 individual meshes — the
// per-descriptor mesh count blew the 900 peak draw-call budget. Each plane bakes
// the SAME transform the per-descriptor mesh used: rotation [-PI/2, rotationY, 0]
// (XYZ Euler) then translate. In geometry space that is rotateY THEN rotateX
// (matches T·R_eulerXYZ; ponytail: X-then-Y silently mis-rotates angled
// crosswalks). Per-plane UVs (0..1) and the per-group y-lift (baked into
// position) survive the merge, so pixels + z-order are unchanged.
export function mergeDecalGeometriesByKey(
  descriptors: MarkingDecalDescriptor[] = buildMarkingDecalDescriptors()
): { key: MarkingTextureKey; geometry: BufferGeometry }[] {
  const byKey = new Map<MarkingTextureKey, BufferGeometry[]>();
  for (const d of descriptors) {
    const geo = new PlaneGeometry(d.size[0], d.size[1]);
    geo.rotateY(d.rotationY);
    geo.rotateX(-Math.PI / 2);
    geo.translate(d.position[0], d.position[1], d.position[2]);
    const list = byKey.get(d.textureKey);
    if (list) list.push(geo);
    else byKey.set(d.textureKey, [geo]);
  }
  return Array.from(byKey, ([key, geos]) => ({
    key,
    geometry: geos.length === 1 ? geos[0] : mergeGeometries(geos, false) ?? geos[0],
  }));
}

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

  const groups = useMemo(() => mergeDecalGeometriesByKey(), []);

  return (
    <group name="marking-decal-layer">
      {groups.map(({ key, geometry }) => (
        <mesh key={key} name={`marking-decal-${key}`} geometry={geometry} renderOrder={7}>
          <meshBasicMaterial
            map={(texByKey.get(key) as never) ?? null}
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
