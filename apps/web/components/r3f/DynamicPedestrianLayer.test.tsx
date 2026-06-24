import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode
} from "react";
import { describe, expect, test } from "vitest";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { buildFixtureSceneSnapshot } from "./buildSceneSnapshot";
import {
  DynamicPedestrianLayer,
  buildDynamicPedestrianRenderPlan
} from "./DynamicPedestrianLayer";

type TestElementProps = {
  children?: ReactNode;
  name?: string;
  userData?: unknown;
};

describe("DynamicPedestrianLayer", () => {
  test("renders only SUMO pedestrians from sceneSnapshot pedestrians with explicit truth labels", () => {
    const sceneSnapshot: SceneSnapshot = {
      ...buildFixtureSceneSnapshot({
        queues: { north: 0, south: 0, east: 0, west: 0 },
        events: []
      }),
      source: "sumo_traci",
      pedestrians: [
        {
          id: "person-1",
          x_meters: 2,
          y_meters: -6,
          heading_degrees: 180,
          speed_mps: 0.8,
          lane_id: "north_crosswalk",
          edge_id: null,
          waiting_seconds: 2,
          source: "sumo_person"
        }
      ],
      precisePedestrianSource: "simulation_frame_snapshot"
    };

    const plan = buildDynamicPedestrianRenderPlan(sceneSnapshot);
    const element = DynamicPedestrianLayer({
      sceneSnapshot
    }) as ReactElement<TestElementProps>;
    const pedestrianGroups = Children.toArray(element.props.children).filter(
      (child): child is ReactElement<TestElementProps> =>
        isValidElement<TestElementProps>(child)
    );

    expect(plan.sumoPedestrians).toHaveLength(1);
    expect(plan.ambientPedestrianCount).toBe(0);
    expect(element.props.name).toBe("stage6-sumo-pedestrian-layer");
    expect(element.props.userData).toEqual(
      expect.objectContaining({
        pedestrianLayer: "sumo",
        pedestrianTruthSource: "SimulationFrameSnapshot.pedestrians",
        ambientPedestriansIncluded: false,
        sumoPedestrianCount: 1
      })
    );
    expect(pedestrianGroups[0].props.name).toBe("sumo-pedestrian-person-1");
    expect(pedestrianGroups[0].props.userData).toEqual(
      expect.objectContaining({
        pedestrianLayer: "sumo",
        pedestrianSource: "simulation_frame_snapshot",
        simulationPedestrianId: "person-1"
      })
    );
  });
});
