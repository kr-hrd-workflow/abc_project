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
});
