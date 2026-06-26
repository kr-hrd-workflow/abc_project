"use client";

import { memo, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  BackSide,
  BoxGeometry,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  type Texture
} from "three";

import type { Stage6TimeOfDay } from "./stage6Quality";
import { buildPlateProxy } from "./plateProxyGeometry";
import { getPlateEntry } from "./plateManifest";
import { getSeamlessGrade } from "./seamlessGrade";

// Preload BOTH plate variants (day + night) so the screen-space plate is ready
// on first paint of either time-of-day. The day plate was newly added, and an
// on-demand load could miss the render harness's capture window (black frame);
// preloading keeps both warm. Browser-only (jsdom/SSR have no loader).
if (
  typeof window !== "undefined" &&
  !/jsdom/i.test(window.navigator?.userAgent ?? "")
) {
  useTexture.preload(getPlateEntry("operator-wide", "night").path);
  useTexture.preload(getPlateEntry("operator-wide", "day").path);
}

// Visual-only truth marker. The background plate NEVER produces vehicle,
// pedestrian, or signal truth — that comes solely from SimulationFrameSnapshot.
export const BACKGROUND_PLATE_TRUTH_SOURCE = "background_plate_visual_only";

// Screen-space plate sampling. Because the runtime camera IS the plate camera
// (Option A), every fragment samples the plate at its own screen position. The
// 3D geometry (ground + building proxies) therefore reads as the photoreal city
// while carrying real depth (vehicle occlusion + a surface for shadows). This
// avoids the per-vertex projected-UV divergence that broke near the horizon.
const PLATE_VERTEX_SHADER = /* glsl */ `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PLATE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uPlate;
  uniform vec2 uResolution;
  // Exact sRGB -> linear (matches three's color management) so the projected
  // ground/buildings tone-match scene.background, which decodes the same plate
  // identically. A pow(2.2) approximation made the upper (background) and lower
  // (geometry) halves read as different tones.
  vec3 srgbToLinear(vec3 c) {
    return mix(
      c / 12.92,
      pow((c + 0.055) / 1.055, vec3(2.4)),
      step(0.04045, c)
    );
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec3 plate = texture2D(uPlate, uv).rgb;
    // Output linear; the EffectComposer ToneMapping pass tonemaps plate and the
    // lit SUMO vehicles together so both share one exposure.
    gl_FragColor = vec4(srgbToLinear(plate), 1.0);
  }
`;

type BackgroundPlateLayerProps = {
  angleId: string;
  timeOfDay: Stage6TimeOfDay;
  enabled?: boolean;
};

// The projected plate uses R3F hooks (useTexture/useThree) that require a live
// WebGL Canvas, so it is a no-op outside a real browser (jsdom tests render the
// scene tree without a Canvas). Real renders (verify:r3f-dashboard) show it.
function canRenderProjectedPlate() {
  return (
    typeof window !== "undefined" &&
    !/jsdom/i.test(window.navigator.userAgent)
  );
}

function BackgroundPlateLayerComponent({
  angleId,
  timeOfDay,
  enabled = true
}: BackgroundPlateLayerProps) {
  if (!enabled || !canRenderProjectedPlate()) {
    return null;
  }

  return <ProjectedBackgroundPlate angleId={angleId} timeOfDay={timeOfDay} />;
}

function ProjectedBackgroundPlate({
  angleId,
  timeOfDay
}: {
  angleId: string;
  timeOfDay: Stage6TimeOfDay;
}) {
  const grade = useMemo(() => getSeamlessGrade(timeOfDay), [timeOfDay]);
  const plate = useMemo(
    () => getPlateEntry(angleId, timeOfDay === "night" ? "night" : "day"),
    [angleId, timeOfDay]
  );
  const proxy = useMemo(() => buildPlateProxy(), []);

  const texture = useTexture(plate.path) as Texture;
  const gl = useThree((state) => state.gl);

  // One shared set of uniforms drives every plate surface (skydome + ground) so
  // the ENTIRE frame is the same screen-space-sampled material with identical
  // color handling — no scene.background, which rendered the upper frame through
  // a different path and read as a whitish band versus the shader ground below.
  const uniforms = useMemo(
    () => ({
      uPlate: { value: null as Texture | null },
      uResolution: { value: new Vector2(1, 1) }
    }),
    []
  );

  const groundMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: PLATE_VERTEX_SHADER,
        fragmentShader: PLATE_FRAGMENT_SHADER,
        uniforms
      }),
    [uniforms]
  );

  // Backdrop dome: a large BackSide sphere that fills the whole frame with the
  // plate (sky + anything the ground/buildings do not cover). depthWrite off +
  // lowest renderOrder so it is purely the backdrop.
  const domeMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: PLATE_VERTEX_SHADER,
        fragmentShader: PLATE_FRAGMENT_SHADER,
        uniforms,
        side: BackSide,
        depthWrite: false
      }),
    [uniforms]
  );

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    uniforms.uPlate.value = texture;
    return () => {
      groundMaterial.dispose();
      domeMaterial.dispose();
    };
  }, [uniforms, groundMaterial, domeMaterial, texture]);

  // Keep the screen-space resolution in sync with the actual drawing buffer so
  // the plate samples 1:1 with the rendered frame.
  useFrame(() => {
    const size = gl.getDrawingBufferSize(new Vector2());
    const res = uniforms.uResolution.value as Vector2;
    if (res.x !== size.x || res.y !== size.y) {
      res.set(size.x, size.y);
    }
  });

  const domeGeometry = useMemo(() => new SphereGeometry(300, 48, 24), []);

  const groundGeometry = useMemo(() => {
    const { size, y } = proxy.groundPlane;
    const geometry = new PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, y, 0);
    return geometry;
  }, [proxy.groundPlane]);

  const buildingGeometries = useMemo(() => {
    return proxy.occluders.map((box) => {
      const [w, h, d] = box.size;
      const geometry = new BoxGeometry(w, h, d);
      geometry.translate(box.position[0], box.position[1], box.position[2]);
      return { id: box.id, geometry };
    });
  }, [proxy.occluders]);

  return (
    <group
      name="gangnam-night-background-plate"
      userData={{ truthSource: BACKGROUND_PLATE_TRUTH_SOURCE, angleId, grade }}
    >
      {/* Full-frame backdrop: same shader as the ground, so the upper frame and
          the ground read identically (this replaced scene.background). */}
      <mesh
        geometry={domeGeometry}
        material={domeMaterial}
        renderOrder={-10}
        frustumCulled={false}
      />
      {/* Ground: screen-space plate, so the intersection floor IS the plate's
          wet road and vehicles sit in it. */}
      <mesh geometry={groundGeometry} material={groundMaterial} renderOrder={-3} />
      {/* Buildings: depth-only occluders (colorWrite off). They let vehicles be
          hidden behind the city in 3D WITHOUT drawing color — drawing the plate
          on mismatched proxy boxes produced whitish, doubled "broken" buildings.
          The building visuals come from the backdrop dome (correct per pixel). */}
      {buildingGeometries.map(({ id, geometry }) => (
        <mesh key={`plate-building-${id}`} geometry={geometry} renderOrder={-2}>
          <meshBasicMaterial colorWrite={false} depthWrite />
        </mesh>
      ))}
    </group>
  );
}

export const BackgroundPlateLayer = memo(BackgroundPlateLayerComponent);
BackgroundPlateLayer.displayName = "BackgroundPlateLayer";
