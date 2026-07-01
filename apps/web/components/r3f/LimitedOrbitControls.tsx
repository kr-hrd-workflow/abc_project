import { OrbitControls } from "@react-three/drei";

export const ORBIT_LIMITS = {
  target: [0, 0, -6] as [number, number, number],
  minDistance: 60,
  maxDistance: 260,
  minPolarAngle: 0.55, // ~31.5deg from top — never below horizon
  maxPolarAngle: 1.15, // ~66deg — keeps an elevated 3/4 view
  minAzimuthAngle: -0.9,
  maxAzimuthAngle: 0.9, // ~±51deg arc around the intersection
} as const;

export function LimitedOrbitControls() {
  return (
    <OrbitControls
      makeDefault
      target={ORBIT_LIMITS.target}
      enablePan={false}
      minDistance={ORBIT_LIMITS.minDistance}
      maxDistance={ORBIT_LIMITS.maxDistance}
      minPolarAngle={ORBIT_LIMITS.minPolarAngle}
      maxPolarAngle={ORBIT_LIMITS.maxPolarAngle}
      minAzimuthAngle={ORBIT_LIMITS.minAzimuthAngle}
      maxAzimuthAngle={ORBIT_LIMITS.maxAzimuthAngle}
    />
  );
}

LimitedOrbitControls.displayName = "LimitedOrbitControls";
