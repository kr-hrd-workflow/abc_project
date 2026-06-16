export const ROAD_MATERIALS = {
  asphalt: {
    color: "#171b1e",
    roughness: 0.88,
    metalness: 0.06
  },
  intersectionAsphalt: {
    color: "#141719",
    roughness: 0.84,
    metalness: 0.08
  },
  wornMarking: {
    color: "#e6dec6",
    roughness: 0.74,
    metalness: 0.02
  },
  queueZone: {
    color: "#5fd4ff",
    roughness: 0.7,
    metalness: 0.02,
    transparent: true,
    opacity: 0.16
  },
  curb: {
    color: "#b7b0a4",
    roughness: 0.82,
    metalness: 0.01
  },
  sidewalk: {
    color: "#8f918b",
    roughness: 0.9,
    metalness: 0.02
  },
  buildingEdge: {
    color: "#20272b",
    roughness: 0.72,
    metalness: 0.08
  }
} as const;
