// @vitest-environment jsdom

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
  LANE_DIVIDER_MARKINGS,
  MEDIAN_BUS_LANE_COLOR,
  MEDIAN_BUS_LANE_MARKINGS,
  TURN_ARROW_MARKINGS
} from "./roadGeometry";
import { RoadSurfaceLayer } from "./RoadSurfaceLayer";

type TestProps = {
  children?: ReactNode;
  name?: string;
  color?: string;
  roughness?: number;
  metalness?: number;
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

  test("renders all bus lane markings with the canonical red color", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    const busMatEls = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === MEDIAN_BUS_LANE_COLOR);

    expect(busMatEls).toHaveLength(MEDIAN_BUS_LANE_MARKINGS.length);
    expect(busMatEls.length).toBeGreaterThan(0);
  });

  test("renders all lane divider markings", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    // lane dividers use meshBasicMaterial with day color #ececec
    const dividerMats = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#ececec");

    expect(dividerMats).toHaveLength(LANE_DIVIDER_MARKINGS.length);
    expect(dividerMats.length).toBeGreaterThan(0);
  });

  test("renders all 44 crosswalk stripes", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    const crosswalkMats = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#f2f2f2");

    expect(crosswalkMats).toHaveLength(CROSSWALK_STRIPES.length);
    expect(CROSSWALK_STRIPES).toHaveLength(44);
  });

  test("renders all turn arrow parts as groups with inner mesh + material", () => {
    const el = RoadSurfaceLayer({ isNight: false }) as ReactElement<TestProps>;
    const all = collectAllElements(el);

    const arrowMats = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#e6e6e6");

    const expectedArrowParts = TURN_ARROW_MARKINGS.flatMap((a) => a.parts).length;
    expect(arrowMats).toHaveLength(expectedArrowParts);
    // Sanity: 4 arrows × 3 parts (shaft + head_left + head_right)
    expect(expectedArrowParts).toBe(12);
  });

  test("switches to night palette at night", () => {
    const nightEl = RoadSurfaceLayer({ isNight: true }) as ReactElement<TestProps>;
    const all = collectAllElements(nightEl);

    // Night lane dividers use #cdc6b8 instead of #ececec
    const nightDividers = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#cdc6b8");
    expect(nightDividers.length).toBeGreaterThan(0);

    // Night crosswalks use #d8d2c4 instead of #f2f2f2
    const nightCrosswalks = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#d8d2c4");
    expect(nightCrosswalks).toHaveLength(44);

    // Night arrows use #cbc4b6 instead of #e6e6e6
    const nightArrows = all
      .filter((e) => getTypeName(e) === "meshBasicMaterial")
      .filter((e) => e.props.color === "#cbc4b6");
    expect(nightArrows).toHaveLength(12);

    // Road surface uses night asphalt color in meshStandardMaterial
    const nightAsphalt = all
      .filter((e) => getTypeName(e) === "meshStandardMaterial")
      .filter((e) => e.props.color === "#23232c");
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
      expect(mat.props.roughness).toBe(0.92);
      expect(mat.props.metalness).toBe(0);
    }
  });
});
