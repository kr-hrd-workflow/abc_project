"use client";

import { Canvas } from "@react-three/fiber";

export function SimulationCanvas() {
  return (
    <Canvas
      className="r3f-simulation-canvas"
      camera={{ position: [0, 1.8, 4.8], fov: 52 }}
      frameloop="demand"
    >
      <color attach="background" args={["#101418"]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#1e3036" roughness={0.82} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.52, 0.18, 1.2]} />
        <meshStandardMaterial color="#5f7782" roughness={0.55} metalness={0.08} />
      </mesh>
    </Canvas>
  );
}
