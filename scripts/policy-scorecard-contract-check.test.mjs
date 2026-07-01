import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { checkPolicyScorecardContract } from "./policy-scorecard-contract-check.mjs";

const backendContract = {
  scorecardBackedPolicies: [
    "safety_gate",
    "emergency_clearance",
    "safety_hold",
    "queue_relief",
    "pedestrian_efficiency",
    "maintain_cycle"
  ],
  decisionOrder: [
    "safety_gate",
    "safety_hold",
    "emergency_clearance",
    "queue_relief",
    "pedestrian_efficiency",
    "maintain_cycle"
  ],
  scoringConstants: {
    queue_threshold: 25,
    safety_gate_all_red_seconds: 10,
    unknown_emergency_direction_all_red_seconds: 6,
    conflicting_queue_axes_all_red_seconds: 6,
    queue_relief_base_score: 60,
    pedestrian_efficiency_score: 45,
    pedestrian_no_vehicle_bonus: 10,
    maintain_cycle_score: 10
  }
};

const webContractSource = `
export const POLICY_SCORECARD_BACKED_POLICIES = [
  "safety_gate",
  "emergency_clearance",
  "safety_hold",
  "queue_relief",
  "pedestrian_efficiency",
  "maintain_cycle"
] as const;

export const POLICY_DECISION_ORDER = [
  "safety_gate",
  "safety_hold",
  "emergency_clearance",
  "queue_relief",
  "pedestrian_efficiency",
  "maintain_cycle"
] as const;

export const POLICY_SCORING_CONSTANTS = {
  queueThreshold: 25,
  safetyGateAllRedSeconds: 10,
  unknownEmergencyDirectionAllRedSeconds: 6,
  conflictingQueueAxesAllRedSeconds: 6,
  queueReliefBaseScore: 60,
  pedestrianEfficiencyScore: 45,
  pedestrianNoVehicleBonus: 10,
  maintainCycleScore: 10
} as const;
`;

function buildChecker(overrides = {}) {
  const backend = overrides.backend ?? backendContract;
  const webSource = overrides.webSource ?? webContractSource;
  const pythonExitCode = overrides.pythonExitCode ?? 0;

  return checkPolicyScorecardContract({
    readFile: async () => webSource,
    runBackendContractDump: () => ({
      status: pythonExitCode,
      stdout: JSON.stringify(backend),
      stderr: ""
    })
  });
}

describe("policy scorecard contract drift check", () => {
  test("passes when backend and web policy contracts are aligned", async () => {
    const result = await buildChecker();

    assert.equal(result.exitCode, 0);
    assert.match(result.output, /policy scorecard contract aligned/);
  });

  test("fails when web policy order drifts from backend policy order", async () => {
    const result = await buildChecker({
      webSource: webContractSource.replace(
        '"safety_hold",\n  "emergency_clearance"',
        '"emergency_clearance",\n  "safety_hold"'
      )
    });

    assert.equal(result.exitCode, 1);
    assert.match(result.output, /decisionOrder mismatch/);
  });

  test("fails when web scoring constants drift from backend constants", async () => {
    const result = await buildChecker({
      webSource: webContractSource.replace("queueThreshold: 25", "queueThreshold: 30")
    });

    assert.equal(result.exitCode, 1);
    assert.match(result.output, /scoringConstants mismatch/);
    assert.match(result.output, /queue_threshold/);
  });
});
