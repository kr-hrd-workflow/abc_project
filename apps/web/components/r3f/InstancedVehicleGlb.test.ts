import { describe, expect, test } from "vitest";
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial
} from "three";

import {
  buildVehicleGlbGeometryGroups,
  categorizeVehicleGlbMaterial
} from "./InstancedVehicleGlb";

describe("categorizeVehicleGlbMaterial", () => {
  test("classifies authored material names by role", () => {
    expect(
      categorizeVehicleGlbMaterial({ name: "taxi_near_pbr_body_paint_material" })
    ).toBe("body");
    expect(
      categorizeVehicleGlbMaterial({
        name: "passenger_car_near_warm_headlight_emitter_material"
      })
    ).toBe("emitter");
    expect(
      categorizeVehicleGlbMaterial({
        name: "emergency_ambulance_medium_blue_lightbar_emitter_material"
      })
    ).toBe("emitter");
    expect(
      categorizeVehicleGlbMaterial({ name: "taxi_near_illuminated_roof_sign_material" })
    ).toBe("emitter");
    expect(
      categorizeVehicleGlbMaterial({
        name: "bus_near_blue_tinted_window_glass_material"
      })
    ).toBe("glass");
    expect(
      categorizeVehicleGlbMaterial({ name: "truck_near_dark_tire_rubber_material" })
    ).toBe("default");
  });

  test("treats unnamed emissive materials as emitters", () => {
    expect(
      categorizeVehicleGlbMaterial({ name: "", emissive: { r: 0.5, g: 0, b: 0 } })
    ).toBe("emitter");
    expect(
      categorizeVehicleGlbMaterial({ name: "", emissive: { r: 0, g: 0, b: 0 } })
    ).toBe("default");
  });
});

describe("buildVehicleGlbGeometryGroups", () => {
  test("gives the body paint a white tintable base and keeps emitters tone-mapped off", () => {
    const bodyMaterial = new MeshStandardMaterial({
      color: "#102030",
      metalness: 0.08,
      roughness: 0.48
    });
    bodyMaterial.name = "passenger_car_near_pbr_body_paint_material";

    const emitterMaterial = new MeshStandardMaterial({ color: "#ff2b1f" });
    emitterMaterial.name = "passenger_car_near_red_taillight_emitter_material";
    emitterMaterial.emissive.set("#ff2b1f");
    emitterMaterial.emissiveIntensity = 1.05;

    const scene = new Group();
    scene.add(new Mesh(new BoxGeometry(1, 1, 1), bodyMaterial));
    scene.add(new Mesh(new BoxGeometry(0.2, 0.2, 0.2), emitterMaterial));

    const groups = buildVehicleGlbGeometryGroups("vehicles/passenger_car_near", scene);
    const body = groups.find((group) => group.role === "body");
    const emitter = groups.find((group) => group.role === "emitter");

    expect(groups).toHaveLength(2);

    const bodyMat = body?.material as MeshStandardMaterial;
    expect(body?.tintable).toBe(true);
    // White base so the per-instance livery color multiplies faithfully.
    expect(bodyMat.color.getHexString()).toBe("ffffff");
    // Body paint is tuned matte + low env reflection so vehicles sit in the
    // muted photoreal plate instead of reading as bright CG.
    expect(bodyMat.metalness).toBeCloseTo(0);
    expect(bodyMat.roughness).toBeCloseTo(0.78);
    expect(bodyMat.envMapIntensity).toBeCloseTo(0.42);

    const emitterMat = emitter?.material as MeshStandardMaterial;
    expect(emitter?.tintable).toBe(false);
    expect(emitterMat.toneMapped).toBe(false);
    expect(emitterMat.emissiveIntensity).toBeGreaterThanOrEqual(2.4);
  });
});
