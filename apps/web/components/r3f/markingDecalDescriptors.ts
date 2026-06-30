import {
  CENTER_LINE_MARKINGS,
  LANE_DIVIDER_MARKINGS,
  BUS_LANE_BORDER_MARKINGS,
  EDGE_LINE_MARKINGS,
  STOP_LINE_MARKINGS,
  CROSSWALK_STRIPES,
  MARKING_HEIGHT,
} from "./roadGeometry";

export type MarkingTextureKey =
  | "lane_dashed"
  | "lane_solid"
  | "center_yellow"
  | "bus_border"
  | "stop_bar"
  | "crosswalk";

export type MarkingDecalDescriptor = {
  id: string;
  position: [number, number, number];
  size: [number, number];
  rotationY: number;
  textureKey: MarkingTextureKey;
};

type SpecLike = {
  id: string;
  position: [number, number, number];
  size: [number, number];
  rotationY?: number;
};

// Per-group y stagger above MARKING_HEIGHT so overlapping marking types never z-fight.
const GROUPS: { specs: SpecLike[]; key: MarkingTextureKey; lift: number }[] = [
  { specs: CENTER_LINE_MARKINGS, key: "center_yellow", lift: 0.004 },
  { specs: LANE_DIVIDER_MARKINGS, key: "lane_dashed", lift: 0.001 },
  { specs: EDGE_LINE_MARKINGS, key: "lane_solid", lift: 0.002 },
  { specs: BUS_LANE_BORDER_MARKINGS, key: "bus_border", lift: 0.003 },
  { specs: STOP_LINE_MARKINGS, key: "stop_bar", lift: 0.005 },
  { specs: CROSSWALK_STRIPES, key: "crosswalk", lift: 0.006 },
];

export function buildMarkingDecalDescriptors(): MarkingDecalDescriptor[] {
  const out: MarkingDecalDescriptor[] = [];
  for (const { specs, key, lift } of GROUPS) {
    for (const spec of specs) {
      out.push({
        id: `decal-${spec.id}`,
        position: [spec.position[0], MARKING_HEIGHT + lift, spec.position[2]],
        size: spec.size,
        rotationY: spec.rotationY ?? 0,
        textureKey: key,
      });
    }
  }
  return out;
}
