"use client";

import { useEffect, useRef } from "react";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type Group,
  type InstancedMesh,
  type Material,
  type Mesh,
  type Texture
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Tiling paint detail + derived normal give the body surface micro-variation so
// it reads as real paint instead of flat CG. Loaded lazily and only in a real
// browser (jsdom tests / SSR have no WebGL and skip the textures).
const PAINT_TILE_REPEAT = 3;
let cachedPaintTextures: { map: Texture; normalMap: Texture } | null = null;
let paintTexturesResolved = false;
function getVehiclePaintTextures(): { map: Texture; normalMap: Texture } | null {
  if (paintTexturesResolved) {
    return cachedPaintTextures;
  }
  paintTexturesResolved = true;
  if (
    typeof window === "undefined" ||
    /jsdom/i.test(window.navigator?.userAgent ?? "")
  ) {
    return null;
  }
  const loader = new TextureLoader();
  const map = loader.load(
    "/simulation/r3f/assets/textures/vehicle_paint_detail.png"
  );
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(PAINT_TILE_REPEAT, PAINT_TILE_REPEAT);
  map.colorSpace = SRGBColorSpace;
  const normalMap = loader.load(
    "/simulation/r3f/assets/textures/vehicle_paint_normal.png"
  );
  normalMap.wrapS = normalMap.wrapT = RepeatWrapping;
  normalMap.repeat.set(PAINT_TILE_REPEAT, PAINT_TILE_REPEAT);
  cachedPaintTextures = { map, normalMap };
  return cachedPaintTextures;
}

// Ground clearance so wheels sit just above the road plate instead of z-fighting
// it. Matches the offset the previous merged-silhouette density path used.
export const VEHICLE_GLB_GROUND_Y = 0.04;

// Emitter materials get boosted past the authored KHR_materials_emissive_strength
// so head/tail/lightbar lenses read as lights at night. toneMapped:false keeps
// them from being crushed by the ACESFilmic tone curve.
const VEHICLE_GLB_MIN_EMISSIVE_INTENSITY = 2.4;

export type VehicleGlbMaterialRole = "body" | "emitter" | "glass" | "default";

export type VehicleGlbGeometryGroup = {
  key: string;
  role: VehicleGlbMaterialRole;
  geometry: BufferGeometry;
  material: Material;
  // Body groups carry a white base material; the per-instance Korean livery
  // color is applied via setColorAt and multiplies the white base faithfully.
  tintable: boolean;
};

export type VehicleGlbInstance = {
  x: number;
  z: number;
  rotationY: number;
  scale?: number;
  color?: string;
  // Footprint (width, length) in meters for the grounding contact-shadow disc.
  footprint?: [number, number];
};

type MaterialLike = {
  name?: string;
  emissive?: { r: number; g: number; b: number };
};

export function categorizeVehicleGlbMaterial(
  material: MaterialLike
): VehicleGlbMaterialRole {
  const name = (material.name ?? "").toLowerCase();

  if (name.includes("body_paint")) return "body";
  if (
    name.includes("emitter") ||
    name.includes("lightbar") ||
    name.includes("roof_sign") ||
    name.includes("route_display")
  ) {
    return "emitter";
  }
  if (name.includes("glass") || name.includes("window")) return "glass";

  // Fallback for unconventionally named emissive lenses: any material that is
  // actually emitting light is treated as an emitter.
  if (
    material.emissive &&
    material.emissive.r + material.emissive.g + material.emissive.b > 0
  ) {
    return "emitter";
  }

  return "default";
}

// Splits one vehicle GLB scene into one merged geometry per authored material,
// preserving authored per-part PBR materials (glass / tire / hub / emitters) and
// real normals. The body paint material is replaced with a white, tintable base
// so a runtime livery color can multiply it via instance colors. This is the
// faithful replacement for the old position-only silhouette merge that flattened
// every part into one synthetic material.
export function buildVehicleGlbGeometryGroups(
  assetKey: string,
  scene: Group
): VehicleGlbGeometryGroup[] {
  const geometriesByMaterial = new Map<Material, BufferGeometry[]>();

  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!isRenderableMesh(object)) return;

    const material = Array.isArray(object.material)
      ? object.material[0]
      : object.material;
    if (!material) return;

    const geometry = normalizeGeometryForMerge(object.geometry);
    geometry.applyMatrix4(object.matrixWorld);

    if (!geometry.attributes.position) return;

    const existing = geometriesByMaterial.get(material);
    if (existing) {
      existing.push(geometry);
    } else {
      geometriesByMaterial.set(material, [geometry]);
    }
  });

  const groups: VehicleGlbGeometryGroup[] = [];
  let groupIndex = 0;

  for (const [material, geometries] of geometriesByMaterial) {
    const geometry =
      geometries.length === 1 ? geometries[0] : mergeGeometries(geometries);
    if (!geometry) continue;

    const role = categorizeVehicleGlbMaterial(material as MaterialLike);

    groups.push({
      key: `${assetKey}:${role}:${groupIndex}`,
      role,
      geometry,
      material: buildManagedMaterial(role, material),
      tintable: role === "body"
    });
    groupIndex += 1;
  }

  return groups;
}

function buildManagedMaterial(
  role: VehicleGlbMaterialRole,
  source: Material
): Material {
  if (role === "body") {
    // White base so instanceColor (the livery tint) multiplies faithfully.
    // Tuned to sit in the muted photoreal plate instead of reading as a clean
    // bright CG toy: rougher paint + low env reflection so vehicles don't pop /
    // over-contrast against the dark plate. A tiling paint-detail map + derived
    // normal add micro surface variation so the paint reads as real, not flat.
    const paint = getVehiclePaintTextures();
    return new MeshStandardMaterial({
      color: "#ffffff",
      metalness: 0.0,
      roughness: 0.78,
      envMapIntensity: 0.42,
      ...(paint
        ? {
            map: paint.map,
            normalMap: paint.normalMap,
            normalScale: new Vector2(0.6, 0.6)
          }
        : {})
    });
  }

  const cloned = source.clone();

  if (role === "emitter") {
    cloned.toneMapped = false;
    if (cloned instanceof MeshStandardMaterial) {
      if (cloned.emissive.r + cloned.emissive.g + cloned.emissive.b === 0) {
        cloned.emissive.copy(cloned.color);
      }
      cloned.emissiveIntensity = Math.max(
        cloned.emissiveIntensity,
        VEHICLE_GLB_MIN_EMISSIVE_INTENSITY
      );
      cloned.envMapIntensity = 0.4;
    }
    return cloned;
  }

  if (cloned instanceof MeshStandardMaterial) {
    // Keep glass reflective, but mute trim/other surfaces so they sit in the
    // muted plate rather than reading as shiny CG plastic.
    cloned.envMapIntensity = role === "glass" ? 0.9 : 0.42;
    if (role === "glass") {
      cloned.transparent = true;
    } else {
      cloned.roughness = Math.max(cloned.roughness ?? 0.5, 0.7);
    }
  }

  return cloned;
}

function normalizeGeometryForMerge(geometry: BufferGeometry): BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.getAttribute("position");
  if (!position) return new BufferGeometry();

  const normalized = new BufferGeometry();
  // Copy into fresh buffers so applyMatrix4 never mutates the cached GLB scene.
  normalized.setAttribute(
    "position",
    new Float32BufferAttribute(Array.from(position.array as ArrayLike<number>), 3)
  );

  const normal = source.getAttribute("normal");
  if (normal) {
    normalized.setAttribute(
      "normal",
      new Float32BufferAttribute(Array.from(normal.array as ArrayLike<number>), 3)
    );
  } else {
    normalized.computeVertexNormals();
  }

  normalized.clearGroups();
  return normalized;
}

function isRenderableMesh(object: Object3D): object is Mesh {
  return Boolean(
    (object as Mesh).isMesh &&
      (object as Mesh).geometry &&
      (object as Mesh).material
  );
}

export function InstancedVehicleGlbMesh({
  group,
  instances,
  name,
  castShadow = false,
  receiveShadow = false
}: {
  group: VehicleGlbGeometryGroup;
  instances: VehicleGlbInstance[];
  name?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());
  const tempColorRef = useRef(new Color());

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const tempObject = tempObjectRef.current;
    const tempColor = tempColorRef.current;

    instances.forEach((instance, index) => {
      tempObject.position.set(instance.x, VEHICLE_GLB_GROUND_Y, instance.z);
      tempObject.rotation.set(0, instance.rotationY, 0);
      const scale = instance.scale ?? 1;
      tempObject.scale.set(scale, scale, scale);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);

      if (group.tintable && instance.color) {
        mesh.setColorAt(index, tempColor.set(instance.color));
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (group.tintable && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [instances, group]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      name={name}
      args={[group.geometry, group.material, instances.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      userData={{
        glbVehicleGroupKey: group.key,
        glbVehicleGroupRole: group.role,
        glbVehicleTintable: group.tintable,
        instancedVehicleCount: instances.length
      }}
    />
  );
}

// Soft elliptical contact-shadow discs so GLB vehicles read as grounded on the
// wet plate rather than floating. One InstancedMesh for the whole stream.
export function VehicleGlbContactShadows({
  instances,
  name,
  opacity = 0.5
}: {
  instances: VehicleGlbInstance[];
  name?: string;
  opacity?: number;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const tempObject = tempObjectRef.current;

    instances.forEach((instance, index) => {
      const [width, length] = instance.footprint ?? [2.4, 4.6];
      const scale = instance.scale ?? 1;
      tempObject.position.set(instance.x, 0.018, instance.z);
      tempObject.rotation.set(-Math.PI / 2, instance.rotationY, 0);
      tempObject.scale.set(width * scale * 1.18, length * scale * 1.04, 1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      name={name}
      args={[undefined, undefined, instances.length]}
      castShadow={false}
      receiveShadow={false}
      renderOrder={2}
    >
      <circleGeometry args={[0.5, 24]} />
      <meshBasicMaterial
        color="#020617"
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
