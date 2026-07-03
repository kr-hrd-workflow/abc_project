import { useEffect, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { Object3D, type InstancedMesh, type Texture } from "three";

import type {
  BoxPrimitiveSpec,
  PlaneBatchSpec,
  PlanePrimitiveSpec
} from "./roadGeometry";

export type RoadMaterialProps = ThreeElements["meshStandardMaterial"];

// Task 5/6 pass materials carrying runtime-loaded textures onto these
// batches — widen the prop type so `map` is explicit rather than relying on
// the base RoadMaterialProps shape.
type BatchMaterial = RoadMaterialProps & { map?: Texture };

const PLANE_ROTATION_X = -Math.PI / 2;

export function InstancedPlaneBatch({
  name,
  specs,
  material,
  renderOrder = 0,
  receiveShadow = false
}: {
  name: string;
  specs: readonly (PlaneBatchSpec | PlanePrimitiveSpec)[];
  material: BatchMaterial;
  renderOrder?: number;
  receiveShadow?: boolean;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());

  useEffect(() => {
    const mesh = meshRef.current;
    if (!isThreeInstancedMesh(mesh)) return;

    const tempObject = tempObjectRef.current;

    specs.forEach((spec, index) => {
      tempObject.position.set(...spec.position);
      tempObject.rotation.set(PLANE_ROTATION_X, spec.rotationY ?? 0, 0);
      tempObject.scale.set(spec.size[0], spec.size[1], 1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [specs]);

  if (specs.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      name={name}
      args={[undefined, undefined, specs.length]}
      frustumCulled={false}
      renderOrder={renderOrder}
      receiveShadow={receiveShadow}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial {...material} map={material.map} />
    </instancedMesh>
  );
}

export function InstancedBoxBatch({
  name,
  specs,
  material,
  castShadow = false,
  receiveShadow = false
}: {
  name: string;
  specs: readonly BoxPrimitiveSpec[];
  material: BatchMaterial;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());

  useEffect(() => {
    const mesh = meshRef.current;
    if (!isThreeInstancedMesh(mesh)) return;

    const tempObject = tempObjectRef.current;

    specs.forEach((spec, index) => {
      tempObject.position.set(...spec.position);
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(...spec.size);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [specs]);

  if (specs.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      name={name}
      args={[undefined, undefined, specs.length]}
      castShadow={castShadow}
      frustumCulled={false}
      receiveShadow={receiveShadow}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial {...material} map={material.map} />
    </instancedMesh>
  );
}

function isThreeInstancedMesh(mesh: InstancedMesh | null): mesh is InstancedMesh {
  return Boolean(mesh && typeof mesh.setMatrixAt === "function");
}
