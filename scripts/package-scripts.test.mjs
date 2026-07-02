import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

describe("root package scripts", () => {
  test("runs the policy contract drift check in the main verify flow", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    const verifyScript = packageJson.scripts.verify;

    assert.match(verifyScript, /npm run test:policy-contract/);
    assert.match(verifyScript, /npm run policy-contract:check/);
    assert.ok(
      verifyScript.indexOf("npm run test:policy-contract") <
        verifyScript.indexOf("npm run policy-contract:check"),
      "policy contract drift tests should run before the live drift check"
    );
    assert.ok(
      verifyScript.indexOf("npm run policy-contract:check") <
        verifyScript.indexOf("npm run test:web"),
      "policy contract drift should be checked before web tests and build"
    );
  });

  test("exposes camera detector live-input builder scripts", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));

    assert.equal(
      packageJson.scripts["real-sample:build-camera-envelope"],
      "node scripts/build-camera-detector-live-input.mjs"
    );
    assert.equal(
      packageJson.scripts["test:real-sample-build"],
      "node --test scripts/build-camera-detector-live-input.test.mjs"
    );
    assert.equal(
      packageJson.scripts["real-sample:build-signal-snapshot"],
      "node scripts/build-seoul-v2x-signal-snapshot.mjs"
    );
    assert.equal(
      packageJson.scripts["test:real-sample-signal-build"],
      "node --test scripts/build-seoul-v2x-signal-snapshot.test.mjs"
    );
    assert.equal(
      packageJson.scripts["real-sample:prepare-live-input"],
      "node scripts/prepare-real-sample-live-input.mjs"
    );
    assert.equal(
      packageJson.scripts["test:real-sample-prepare"],
      "node --test scripts/prepare-real-sample-live-input.test.mjs"
    );
    assert.equal(
      packageJson.scripts["real-sample:build-yolo-detector-output"],
      "node scripts/build-yolo-detector-output.mjs"
    );
    assert.equal(
      packageJson.scripts["test:real-sample-yolo-detector"],
      "node --test scripts/build-yolo-detector-output.test.mjs"
    );
  });
});
