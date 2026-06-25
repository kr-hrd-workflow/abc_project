"use client";

import { memo, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { BufferAttribute, PlaneGeometry } from "three";

import type { Stage6TimeOfDay } from "./stage6Quality";
import { buildPlateProxy, projectPlateUVs } from "./plateProxyGeometry";
import { getPlateCameraAngle } from "./plateCameraCalibration";
import { getPlateEntry } from "./plateManifest";
import { getSeamlessGrade } from "./seamlessGrade";
import type { Vector3Tuple } from "./roadGeometry";

// Visual-only truth marker. The background plate NEVER produces vehicle,
// pedestrian, or signal truth — that comes solely from SimulationFrameSnapshot.
export const BACKGROUND_PLATE_TRUTH_SOURCE = "background_plate_visual_only";

// Ground subdivision for camera-projected UVs: enough to keep the projected
// plate from shearing across the proxy footprint without inflating draw cost.
const GROUND_SEGMENTS = 24;
// Plate aspect of the operator-wide framing; the projection is forgiving since
// UVs clamp into [0,1], and the real plate is regenerated to match the angle.
const PLATE_PROJECTION_ASPECT = 16 / 9;

type BackgroundPlateLayerProps = {
  angleId: string;
  timeOfDay: Stage6TimeOfDay;
  enabled?: boolean;
};

function BackgroundPlateLayerComponent({
  angleId,
  timeOfDay,
  enabled = true
}: BackgroundPlateLayerProps) {
  // Gate BEFORE any hook so the disabled / day / fallback paths never call
  // useTexture (which would suspend on a real GPU loader). The inner component
  // owns all hooks so the Rules of Hooks hold for the rendered path.
  if (!enabled || timeOfDay !== "night") {
    return null;
  }

  return <NightBackgroundPlate angleId={angleId} timeOfDay={timeOfDay} />;
}

function NightBackgroundPlate({
  angleId,
  timeOfDay
}: {
  angleId: string;
  timeOfDay: Stage6TimeOfDay;
}) {
  const proxy = useMemo(() => buildPlateProxy(), []);
  const angle = useMemo(() => getPlateCameraAngle(angleId), [angleId]);
  const grade = useMemo(() => getSeamlessGrade(timeOfDay), [timeOfDay]);
  const plate = useMemo(() => getPlateEntry(angleId), [angleId]);

  // Suspends until the plate decodes; the mount site wraps this in
  // <Suspense fallback={null}> (Task 7) so a missing/failed plate degrades to
  // the procedural background already present in the scene.
  const texture = useTexture(plate.path);

  // Camera-projected plane geometry: draping the plate via the calibrated plate
  // camera makes it read as a 3D scene rather than a flat decal.
  const groundGeometry = useMemo(() => {
    const { size, y } = proxy.groundPlane;
    const geometry = new PlaneGeometry(size, size, GROUND_SEGMENTS, GROUND_SEGMENTS);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, y, 0);

    const position = geometry.getAttribute("position");
    const worldPoints: Vector3Tuple[] = [];
    for (let index = 0; index < position.count; index += 1) {
      worldPoints.push([
        position.getX(index),
        position.getY(index),
        position.getZ(index)
      ]);
    }

    const projected = projectPlateUVs({
      angle,
      aspect: PLATE_PROJECTION_ASPECT,
      points: worldPoints
    });

    const uv = new Float32Array(projected.length * 2);
    for (let index = 0; index < projected.length; index += 1) {
      uv[index * 2] = projected[index][0];
      uv[index * 2 + 1] = projected[index][1];
    }
    geometry.setAttribute("uv", new BufferAttribute(uv, 2));

    return geometry;
  }, [proxy.groundPlane, angle]);

  return (
    <group
      name="gangnam-night-background-plate"
      userData={{ truthSource: BACKGROUND_PLATE_TRUTH_SOURCE, angleId, grade }}
    >
      {/* Depth-only occluders: cars behind buildings are correctly hidden.
          colorWrite off means they write depth but contribute no pixels, so the
          plate shows through while still occluding the SUMO-driven vehicles. */}
      {proxy.occluders.map((box) => (
        <mesh key={`occluder-${box.id}`} position={box.position} renderOrder={-2}>
          <boxGeometry args={box.size} />
          <meshBasicMaterial colorWrite={false} depthWrite />
        </mesh>
      ))}

      {/* Projection surface: the plate camera-projected onto the proxy ground so
          the neon backdrop sits behind the live traffic. */}
      <mesh geometry={groundGeometry} renderOrder={-3}>
        <meshBasicMaterial map={texture} toneMapped />
      </mesh>
    </group>
  );
}

export const BackgroundPlateLayer = memo(BackgroundPlateLayerComponent);
BackgroundPlateLayer.displayName = "BackgroundPlateLayer";
