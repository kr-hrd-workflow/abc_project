// @vitest-environment jsdom
import { Children, isValidElement, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("@react-three/drei", () => {
  const makeTex = () => ({ wrapS: 0, wrapT: 0, repeat: { set() {} }, needsUpdate: false, clone: () => makeTex() });
  return { useTexture: Object.assign((_: unknown) => ({ a: makeTex(), b: makeTex() }), { preload: () => {} }) };
});
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useMemo: (fn: () => unknown) => fn() };
});

import { MarkingDecalLayer } from "./MarkingDecalLayer";
import { buildMarkingDecalDescriptors } from "./markingDecalDescriptors";

function collect(node: unknown, acc: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) { node.forEach((n) => collect(n, acc)); return acc; }
  if (!isValidElement(node)) return acc;
  acc.push(node);
  Children.forEach((node.props as { children?: unknown }).children, (c) => collect(c, acc));
  return acc;
}

describe("MarkingDecalLayer", () => {
  const el = MarkingDecalLayer({}) as ReactElement;
  const all = collect(el);
  const meshes = all.filter((e) => e.type === "mesh");
  const mats = all.filter((e) => e.type === "meshBasicMaterial");

  test("renders one decal mesh per descriptor", () => {
    expect(meshes).toHaveLength(buildMarkingDecalDescriptors().length);
  });

  test("decals lie flat (rotation x = -PI/2) and never write depth", () => {
    const m = meshes[0].props as { rotation: number[] };
    expect(m.rotation[0]).toBeCloseTo(-Math.PI / 2, 6);
    for (const mat of mats) {
      expect((mat.props as { depthWrite: boolean }).depthWrite).toBe(false);
      expect((mat.props as { transparent: boolean }).transparent).toBe(true);
    }
  });

  test("mesh position matches its descriptor (alignment preserved)", () => {
    const desc = buildMarkingDecalDescriptors();
    const named = meshes.find((e) => (e.props as { name?: string }).name === desc[0].id);
    expect((named!.props as { position: number[] }).position).toEqual(desc[0].position);
  });
});
