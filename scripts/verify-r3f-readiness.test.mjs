import { spawnSync } from "node:child_process";
import { describe, test } from "node:test";
import assert from "node:assert/strict";

const node = process.execPath;

function runScript(script) {
  return spawnSync(node, [script], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
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
});
