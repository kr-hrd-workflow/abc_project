// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { applyCalibratedLaneOffset, getBusLaneLateral } from "./plateVehicleCalibration";

function setSearch(s: string) {
  window.history.replaceState(null, "", `/dashboard${s}`);
}
afterEach(() => setSearch(""));

describe("photobash mode: identity metric calibration (no v5-plate offsets)", () => {
  test("applyCalibratedLaneOffset returns the raw metric offset (no +1.3m N/S)", () => {
    setSearch("?photobash=1");
    expect(applyCalibratedLaneOffset(5.4, "wide", "north")).toBe(5.4);
    expect(applyCalibratedLaneOffset(5.4, "wide", "south")).toBe(5.4);
  });

  test("median bus lane is NOT pinned in photobash (uses metric lane offset)", () => {
    setSearch("?photobash=1");
    expect(getBusLaneLateral("wide", "north")).toBeNull();
    expect(getBusLaneLateral("wide", "south")).toBeNull();
  });

  test("without photobash the v5-plate calibration still applies", () => {
    setSearch("");
    expect(applyCalibratedLaneOffset(5.4, "wide", "north")).toBeCloseTo(6.7, 6); // 1.3 + 5.4
    expect(getBusLaneLateral("wide", "north")).toBe(-0.7);
  });
});
