// @vitest-environment jsdom

// Mock @react-three/drei so useTexture returns a clonable fake texture without
// requiring a WebGL context. vi.mock calls are hoisted before imports.
import { vi } from "vitest";

function makeMockTex(): object {
  return {
    wrapS: 0,
    wrapT: 0,
    needsUpdate: false,
    repeat: { set: () => {} },
    clone: () => makeMockTex()
  };
}

vi.mock("@react-three/drei", () => ({
  useTexture: Object.assign(() => makeMockTex(), { preload: () => {} })
}));

// Stub useMemo so the component can be called as a plain function in tests
// (avoiding the "invalid hook call outside component" error).
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useMemo: (fn: () => unknown, _deps?: unknown[]) => fn()
  };
});

import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode
} from "react";
import { describe, expect, test } from "vitest";

import {
  APPROACH_CORRIDORS,
  CROSSWALK_STRIPES,
  LANE_ARROW_DECALS
} from "./roadGeometry";
import { RoadSurfaceLayer } from "./RoadSurfaceLayer";

type TestProps = {
  children?: ReactNode;
  name?: string;
  color?: string;
  roughness?: number;
  metalness?: number;
  map?: unknown;
  transparent?: boolean;
  opacity?: number;
  rotation?: unknown;
  position?: unknown;
  args?: unknown;
};

// Flatten all React elements recursively (BFS over props.children).
function collectAllElements(node: ReactNode): ReactElement<TestProps>[] {
  const result: ReactElement<TestProps>[] = [];
  const queue: ReactNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift();
    Children.forEach(current, (child) => {
      if (isValidElement<TestProps>(child)) {
        result.push(child);
        queue.push(child.props.children);
      }
    });
  }

  return result;
}

function getTypeName(el: ReactElement<TestProps>): string {
  const t = el.type as unknown;
  if (typeof t === "string") return t;
  if (typeof t === "function" || typeof t === "object") {
    const c = t as { displayName?: string; name?: string };
    return c.displayName ?? c.name ?? "unknown";
  }
  return "unknown";
}

describe("RoadSurfaceLayer", () => {
  test("renders a group named road-surface-layer", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    expect(el.props.name).toBe("road-surface-layer");
  });

  test("includes one junction-box surface + all approach corridor surfaces", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    // Count meshStandardMaterial elements — each road surface has one
    const stdMats = all.filter((e) => getTypeName(e) === "meshStandardMaterial");
    // 1 junction box + 4 corridors = 5 surfaces → 5 meshStandardMaterial nodes
    expect(stdMats).toHaveLength(1 + APPROACH_CORRIDORS.length);
  });

  test("road surfaces have a texture map applied", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    const stdMats = all.filter((e) => getTypeName(e) === "meshStandardMaterial");
    for (const mat of stdMats) {
      // map prop should be a texture object (non-null)
      expect(mat.props.map).toBeTruthy();
    }
  });

  test("renders the merged bus-lane marking with the muted terracotta day colour", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    // Markings are merged into ONE geometry per type (perf), so there is a
    // single bus-lane material rather than one per stripe.
    const busMatEls = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#8f4034");

    expect(busMatEls).toHaveLength(1);
  });

  test("renders one merged lane-divider mesh with muted transparent day colour", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    // Lane dividers (transparent) vs arrows (opaque) share the same day colour;
    // both are now single merged meshes.
    const laneDividerMats = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#d7d5cc" && e.props.transparent === true);
    expect(laneDividerMats).toHaveLength(1);
  });

  test("renders one merged crosswalk mesh; the 44-stripe dataset is intact", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    const crosswalkMats = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#e3e1d8");

    expect(crosswalkMats).toHaveLength(1);
    expect(CROSSWALK_STRIPES).toHaveLength(44);
  });

  test("renders one merged turn-arrow mesh from the per-lane decals", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    // Arrows share the divider colour but are opaque (no transparent prop).
    const arrowMats = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#d7d5cc" && !e.props.transparent);

    expect(arrowMats).toHaveLength(1);
    // Per-lane decals: 3 (left / straight / right) per approach × 4 approaches.
    expect(LANE_ARROW_DECALS).toHaveLength(12);
    const kinds = new Set(LANE_ARROW_DECALS.map((d) => d.kind));
    expect(kinds).toEqual(new Set(["left", "straight", "right"]));
  });

  test("switches to night palette at night", () => {
    const nightEl = RoadSurfaceLayer({ isNight: true }) as ReactElement<TestProps>;
    const all = collectAllElements(nightEl);

    // Night lane dividers use #a9a394 (transparent), single merged mesh.
    const nightDividers = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#a9a394" && e.props.transparent === true);
    expect(nightDividers).toHaveLength(1);

    // Night crosswalks use #b4af9f (single merged mesh).
    const nightCrosswalks = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#b4af9f");
    expect(nightCrosswalks).toHaveLength(1);

    // Night arrows use #a9a394 (opaque), single merged mesh.
    const nightArrows = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#a9a394" && !e.props.transparent);
    expect(nightArrows).toHaveLength(1);

    // Night bus lane uses #5e2c25 (single merged mesh).
    const nightBus = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#5e2c25");
    expect(nightBus).toHaveLength(1);

    // Road surface uses night asphalt tint in meshStandardMaterial
    const nightAsphalt = all
      .filter((e) => getTypeName(e) === "meshStandardMaterial")
      .filter((e) => e.props.color === "#5a5a64");
    expect(nightAsphalt.length).toBeGreaterThan(0);
  });

  test("does not render city edge blocks or the 800m ground base", () => {
    const dayEl = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const nightEl = RoadSurfaceLayer({ isNight: true }) as ReactElement<TestProps>;

    for (const el of [dayEl, nightEl]) {
      const all = collectAllElements(el);
      // No boxGeometry (city edge blocks are box primitives)
      const boxGeos = all.filter((e) => getTypeName(e) === "boxGeometry");
      expect(boxGeos).toHaveLength(0);
      // No 800×800 plane (the ground base plane)
      const hugePlanes = all
        .filter((e) => getTypeName(e) === "planeGeometry")
        .filter((e) => {
          const args = e.props.args as [number, number] | undefined;
          return Array.isArray(args) && args[0] >= 800;
        });
      expect(hugePlanes).toHaveLength(0);
    }
  });

  test("road surface has high roughness and zero metalness for asphalt look", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    const stdMats = all.filter((e) => getTypeName(e) === "meshStandardMaterial");
    for (const mat of stdMats) {
      expect(mat.props.roughness).toBe(0.95);
      expect(mat.props.metalness).toBe(0);
    }
  });
});
