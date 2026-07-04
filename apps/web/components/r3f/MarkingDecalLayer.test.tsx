// @vitest-environment jsdom
import { Children, isValidElement, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { Mesh, PlaneGeometry } from "three";

vi.mock("@react-three/drei", () => {
  const makeTex = () => ({ wrapS: 0, wrapT: 0, repeat: { set() {} }, needsUpdate: false, clone: () => makeTex() });
  return { useTexture: Object.assign((_: unknown) => ({ a: makeTex(), b: makeTex() }), { preload: () => {} }) };
});
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useMemo: (fn: () => unknown) => fn() };
});

import { MarkingDecalLayer, mergeDecalGeometriesByKey, PLACEHOLDER_URLS } from "./MarkingDecalLayer";
import { buildMarkingDecalDescriptors } from "./markingDecalDescriptors";

// Structural invariant: one merged mesh per texture key. Derived from the URL
// map so adding a texture key can't silently drift the mesh/key/material counts.
const KEY_COUNT = Object.keys(PLACEHOLDER_URLS).length;

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

  // The whole point of the merge: one merged mesh per texture key (draw calls ==
  // key count), NOT one mesh per descriptor. A regression to per-descriptor
  // meshes (790 draw calls, blows the 900 peak budget) fails here.
  test("renders one merged mesh per texture key, each with a merged geometry", () => {
    expect(meshes).toHaveLength(KEY_COUNT);
    for (const m of meshes) {
      expect((m.props as { geometry?: unknown }).geometry).toBeInstanceOf(Object);
    }
  });

  test("decals never write depth and stay transparent / untonemapped", () => {
    expect(mats).toHaveLength(KEY_COUNT);
    for (const mat of mats) {
      const p = mat.props as { depthWrite: boolean; transparent: boolean; toneMapped: boolean };
      expect(p.depthWrite).toBe(false);
      expect(p.transparent).toBe(true);
      expect(p.toneMapped).toBe(false);
    }
  });
});

describe("mergeDecalGeometriesByKey", () => {
  test("yields exactly one non-empty group per texture key, no plane dropped", () => {
    const descriptors = buildMarkingDecalDescriptors();
    const groups = mergeDecalGeometriesByKey(descriptors);
    expect(groups).toHaveLength(KEY_COUNT);
    for (const g of groups) expect(g.geometry.attributes.position.count).toBeGreaterThan(0);
    expect(new Set(groups.map((g) => g.key)).size).toBe(KEY_COUNT);
    // PlaneGeometry = 4 verts; total merged verts must equal every descriptor's plane.
    const total = groups.reduce((n, g) => n + g.geometry.attributes.position.count, 0);
    expect(total).toBe(descriptors.length * 4);
  });

  test("bakes the exact per-mesh transform (rotation order matters for angled crosswalks)", () => {
    // A descriptor with non-zero rotationY (a diagonal-approach crosswalk stripe
    // uses ±PI/4): the merged plane's vertices must match a mesh rotated
    // [-PI/2, rotationY, 0] then translated — pins Y-then-X order.
    const desc = {
      id: "t", position: [10, 0.5, -4] as [number, number, number],
      size: [3, 5] as [number, number], rotationY: Math.PI / 4, textureKey: "crosswalk" as const,
    };
    const [{ geometry }] = mergeDecalGeometriesByKey([desc]);

    const mesh = new Mesh(new PlaneGeometry(3, 5));
    mesh.rotation.set(-Math.PI / 2, Math.PI / 4, 0);
    mesh.position.set(10, 0.5, -4);
    mesh.updateMatrix();
    const expected = new PlaneGeometry(3, 5);
    expected.applyMatrix4(mesh.matrix);

    const got = geometry.attributes.position.array;
    const exp = expected.attributes.position.array;
    expect(got.length).toBe(exp.length);
    for (let i = 0; i < exp.length; i += 1) expect(got[i]).toBeCloseTo(exp[i], 5);
  });
});

describe("road-surface decals (manhole / wear)", () => {
  const descriptors = buildMarkingDecalDescriptors();

  test("scatters manhole covers and worn asphalt patches on the approach lanes", () => {
    const manholes = descriptors.filter((d) => d.textureKey === "manhole");
    const wear = descriptors.filter((d) => d.textureKey === "wear_patch");
    expect(manholes.length).toBeGreaterThanOrEqual(8);
    expect(wear.length).toBeGreaterThanOrEqual(6);
  });
});
