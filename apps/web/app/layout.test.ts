import { describe, expect, test } from "vitest";

import { metadata } from "./layout";

describe("Root metadata", () => {
  test("matches the landing page product signal", () => {
    expect(metadata.title).toBe("Smart Intersection Ops");
    expect(metadata.description).toBe(
      "Decision-support landing and dashboard for smart intersection traffic operations"
    );
  });
});
