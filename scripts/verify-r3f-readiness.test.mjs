import { spawnSync } from "node:child_process";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

import { isRecord } from "./lib/util.mjs";

const node = process.execPath;

function runScript(script) {
  return spawnSync(node, [script], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
}

function loadVerifierFunction(functionName) {
  const source = readFileSync("scripts/verify-r3f-dashboard.mjs", "utf8");
  const start = source.indexOf(`function ${functionName}`);
  assert.notEqual(start, -1, `${functionName} is missing`);

  let depth = 0;
  let end = -1;
  for (let index = source.indexOf("{", start); index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      end = index + 1;
      break;
    }
  }
  assert.notEqual(end, -1, `${functionName} body is incomplete`);

  const context = {
    minVisibleVehicles: 80,
    result: null
  };
  vm.createContext(context);
  vm.runInContext(
    `${source.slice(start, end)}\nresult = ${functionName};`,
    context
  );
  return context.result;
}

function extractFunctionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}`);
  assert.notEqual(start, -1, `${functionName} is missing`);

  let depth = 0;
  let end = -1;
  for (let index = source.indexOf("{", start); index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      end = index + 1;
      break;
    }
  }
  assert.notEqual(end, -1, `${functionName} body is incomplete`);
  return source.slice(start, end);
}

function loadVerifierFunctions(file, functionNames, extraContext = {}) {
  const source = readFileSync(file, "utf8");
  const context = { ...extraContext };
  vm.createContext(context);
  const bodies = functionNames.map((name) => extractFunctionSource(source, name)).join("\n");
  const assignments = functionNames.map((name) => `${name} = ${name};`).join("\n");
  vm.runInContext(`${bodies}\n${assignments}`, context);
  return context;
}

describe("R3F readiness verifier gates", () => {
  test("visual diff uses a stable baseline by default", () => {
    const result = runScript("scripts/verify-r3f-visual-diff.mjs");
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 0, output);
    assert.match(output, /self_baseline":false/);
    assert.doesNotMatch(output, /self_baseline":true/);
  });

  test("performance gate reports headless unmeasurable timing as concerns", () => {
    const result = runScript("scripts/verify-r3f-performance.mjs");
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 0, output);
    assert.match(output, /PASS_WITH_CONCERNS/);
    assert.match(output, /unmeasurable_headless_static_demand_loop/);
  });

  test("photorealism check accepts CI rendering variance when all supporting realism signals pass", () => {
    const buildPhotorealismCheck = loadVerifierFunction("buildPhotorealismCheck");
    const result = buildPhotorealismCheck(
      {
        dark_ratio: 0.19,
        bright_ratio: 0.0011,
        luminance_stddev: 22.5,
        marking_ratio: 0.03,
        warm_light_ratio: 0.001,
        cool_light_ratio: 0.001,
        color_bucket_count: 180,
        non_background_ratio: 0.8
      },
      {
        visibleVehicleCount: 160,
        streetFurnitureShadowCount: 18,
        vehicleSilhouettePartCount: 24,
        glbVehicleCount: 3
      }
    );

    assert.equal(result.pbr_wet_asphalt, true);
    assert.equal(result.passed, true);
  });

  test("readPerformance floors drawCalls at the instrumented peak, not a demand-frame sample", () => {
    const context = loadVerifierFunctions(
      "scripts/verify-r3f-performance.mjs",
      ["numberOrNull", "readPerformance"],
      { isRecord }
    );
    // SimulationCanvas runs frameloop="demand": a proof publish can sample a
    // near-empty frame (performance.drawCalls=1) while the instrumented peak
    // for the same run is 574. readPerformance must never report less than
    // the instrumented peak.
    const details = {
      performance: { drawCalls: 1 },
      renderer: { peakDrawCalls: 574, drawCalls: 1 }
    };

    const result = context.readPerformance(details);

    assert.equal(result.drawCalls, 574);
  });
});
