import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = resolve(__dirname, "../../..");
const unrealRoot = resolve(repoRoot, "renderer/unreal/SmartIntersection");

describe("Unreal simulation renderer runtime", () => {
  test("declares a simulation runtime C++ module", () => {
    const projectPath = resolve(unrealRoot, "SmartIntersection.uproject");
    const project = JSON.parse(readFileSync(projectPath, "utf8"));

    expect(project.Category).toBe("Simulation");
    expect(project.Modules).toContainEqual({
      Name: "SmartIntersectionRuntime",
      Type: "Runtime",
      LoadingPhase: "Default",
    });
  });

  test("exposes a C++ TrafficSimulationController actor for runtime simulator state", () => {
    const header = resolve(
      unrealRoot,
      "Source/SmartIntersectionRuntime/Public/TrafficSimulationController.h"
    );
    const implementation = resolve(
      unrealRoot,
      "Source/SmartIntersectionRuntime/Private/TrafficSimulationController.cpp"
    );
    const buildRules = resolve(
      unrealRoot,
      "Source/SmartIntersectionRuntime/SmartIntersectionRuntime.Build.cs"
    );

    expect(existsSync(header)).toBe(true);
    expect(existsSync(implementation)).toBe(true);
    expect(existsSync(buildRules)).toBe(true);

    const headerText = readFileSync(header, "utf8");
    expect(headerText).toContain("ATrafficSimulationController");
    expect(headerText).toContain("ETrafficSimulationPhase");
    expect(headerText).toContain("FTrafficSignalTiming");
    expect(headerText).toContain("ApplySimulationSnapshotJson");
    expect(headerText).toContain("bPixelStreamConnected");
    expect(headerText).not.toMatch(/GameMode|Pawn|Player|Score|Health/);
  });
});
