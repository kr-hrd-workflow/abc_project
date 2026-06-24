"use client";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import type { Vector3Tuple } from "./roadGeometry";

type DynamicPedestrian = {
  id: string;
  position: Vector3Tuple;
  rotationY: number;
  waitingSeconds: number;
  laneId: string | null;
  edgeId: string | null;
};

export type DynamicPedestrianRenderPlan = {
  sumoPedestrians: DynamicPedestrian[];
  ambientPedestrianCount: 0;
  sourceLabel: SceneSnapshot["precisePedestrianSource"];
};

const PEDESTRIAN_HEIGHT_METERS = 1.72;
const PEDESTRIAN_BODY_RADIUS_METERS = 0.22;

export function buildDynamicPedestrianRenderPlan(
  sceneSnapshot: SceneSnapshot
): DynamicPedestrianRenderPlan {
  return {
    sumoPedestrians: sceneSnapshot.pedestrians.map((pedestrian) => ({
      id: pedestrian.id,
      position: [
        pedestrian.x_meters,
        PEDESTRIAN_HEIGHT_METERS / 2,
        pedestrian.y_meters
      ],
      rotationY: degreesToRadians(pedestrian.heading_degrees),
      waitingSeconds: pedestrian.waiting_seconds,
      laneId: pedestrian.lane_id ?? null,
      edgeId: pedestrian.edge_id ?? null
    })),
    ambientPedestrianCount: 0,
    sourceLabel: sceneSnapshot.precisePedestrianSource
  };
}

export function DynamicPedestrianLayer({
  sceneSnapshot
}: {
  sceneSnapshot: SceneSnapshot;
}) {
  const plan = buildDynamicPedestrianRenderPlan(sceneSnapshot);

  return (
    <group
      name="stage6-sumo-pedestrian-layer"
      userData={{
        pedestrianLayer: "sumo",
        pedestrianTruthSource: "SimulationFrameSnapshot.pedestrians",
        precisePedestrianSource: plan.sourceLabel,
        ambientPedestriansIncluded: false,
        sumoPedestrianCount: plan.sumoPedestrians.length,
        ambientPedestrianCount: plan.ambientPedestrianCount
      }}
    >
      {plan.sumoPedestrians.map((pedestrian) => (
        <group
          key={pedestrian.id}
          name={`sumo-pedestrian-${pedestrian.id}`}
          position={pedestrian.position}
          rotation={[0, pedestrian.rotationY, 0]}
          userData={{
            pedestrianLayer: "sumo",
            pedestrianSource: "simulation_frame_snapshot",
            simulationPedestrianId: pedestrian.id,
            laneId: pedestrian.laneId,
            edgeId: pedestrian.edgeId,
            waitingSeconds: pedestrian.waitingSeconds
          }}
        >
          <mesh
            name={`sumo-pedestrian-${pedestrian.id}-body`}
            scale={[
              PEDESTRIAN_BODY_RADIUS_METERS,
              PEDESTRIAN_HEIGHT_METERS * 0.46,
              PEDESTRIAN_BODY_RADIUS_METERS
            ]}
          >
            <capsuleGeometry args={[1, 1, 5, 10]} />
            <meshStandardMaterial
              color={pedestrian.waitingSeconds > 0 ? "#caa45a" : "#4f6f78"}
              roughness={0.72}
              metalness={0.02}
            />
          </mesh>
          <mesh
            name={`sumo-pedestrian-${pedestrian.id}-head`}
            position={[0, PEDESTRIAN_HEIGHT_METERS * 0.48, 0]}
            scale={[0.16, 0.16, 0.16]}
          >
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#d2b9a0" roughness={0.78} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

DynamicPedestrianLayer.displayName = "DynamicPedestrianLayer";

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
