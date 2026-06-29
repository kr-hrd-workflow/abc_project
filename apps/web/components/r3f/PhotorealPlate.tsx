"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  BackSide,
  BoxGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  type Texture
} from "three";

import { BUILDING_FOOTPRINTS } from "./buildingFootprints";
import type { Stage6TimeOfDay } from "./stage6Quality";

// Production photoreal view (?photoreal=1). Renders the fixed photoreal
// empty-road 강남역 plate as a full-canvas screen-space backdrop (COVER-fit) with
// the live R3F vehicles / pedestrians / signals composited on top, and the 3D
// road + buildings suppressed. Two pieces make the composite read as one scene:
//   1. The plate is sampled in screen space (gl_FragCoord) on a BackSide dome so
//      it always fills the frame and never parallaxes. The roadlock plates are
//      generated from the operator-wide camera, so they register 1:1 with no
//      offset/scale calibration (offset 0,0 — scale 1.0).
//   2. Depth-only occluders at OUR metric BUILDING_FOOTPRINTS prime the depth
//      buffer, so vehicles that travel behind a building footprint (e.g. the east
//      approach behind the corner block) are naturally hidden — accepted as
//      realistic occlusion rather than cars floating over buildings.
const PHOTOREAL_PLATES = {
  day: {
    path: "/simulation/r3f/assets/plates/gangnam_photoreal_roadlock_day.webp",
    aspect: 1451 / 1084
  },
  night: {
    path: "/simulation/r3f/assets/plates/gangnam_photoreal_roadlock_night.webp",
    aspect: 1451 / 1084
  },
  // DIAGNOSTIC (?cmp=A): bare-asphalt day plate with NO painted lanes, so the
  // R3F markings overlay reads as the single (non-doubled) lane set.
  plainDay: {
    path: "/simulation/r3f/assets/plates/gangnam_photoreal_plain_day.webp",
    aspect: 1450 / 1085
  }
} as const;

// PlateVariant "plain" is a diagnostic-only override (?cmp=A). Default
// "roadlock" preserves the committed photoreal behaviour exactly.
export type PhotorealPlateVariant = "roadlock" | "plain";

export function resolvePhotorealPlate(
  timeOfDay: Stage6TimeOfDay,
  variant: PhotorealPlateVariant = "roadlock"
) {
  if (variant === "plain") return PHOTOREAL_PLATES.plainDay;
  return timeOfDay === "night" ? PHOTOREAL_PLATES.night : PHOTOREAL_PLATES.day;
}

if (
  typeof window !== "undefined" &&
  !/jsdom/i.test(window.navigator?.userAgent ?? "")
) {
  useTexture.preload(PHOTOREAL_PLATES.day.path);
  useTexture.preload(PHOTOREAL_PLATES.night.path);
  useTexture.preload(PHOTOREAL_PLATES.plainDay.path);
}

const PHOTOREAL_VERTEX_SHADER = /* glsl */ `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PHOTOREAL_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uPlate;
  uniform vec2 uResolution;
  uniform float uPlateAspect;
  vec3 srgbToLinear(vec3 c) {
    return mix(
      c / 12.92,
      pow((c + 0.055) / 1.055, vec3(2.4)),
      step(0.04045, c)
    );
  }
  void main() {
    // COVER-fit the plate across the frame: keep vertical 1:1 and compress the
    // horizontal sample by the canvas/plate aspect ratio so the carriageway lands
    // where the metric camera expects it.
    vec2 uv_raw = gl_FragCoord.xy / uResolution;
    float canvasAR = uResolution.x / uResolution.y;
    float uv_x = 0.5 + (uv_raw.x - 0.5) * (canvasAR / uPlateAspect);
    vec3 plate = texture2D(uPlate, vec2(uv_x, uv_raw.y)).rgb;
    gl_FragColor = vec4(srgbToLinear(plate), 1.0);
  }
`;

export function PhotorealPlate({
  timeOfDay,
  variant = "roadlock"
}: {
  timeOfDay: Stage6TimeOfDay;
  variant?: PhotorealPlateVariant;
}) {
  if (
    typeof window === "undefined" ||
    /jsdom/i.test(window.navigator.userAgent)
  ) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <PhotorealPlateMesh timeOfDay={timeOfDay} variant={variant} />
    </Suspense>
  );
}

PhotorealPlate.displayName = "PhotorealPlate";

function PhotorealPlateMesh({
  timeOfDay,
  variant
}: {
  timeOfDay: Stage6TimeOfDay;
  variant: PhotorealPlateVariant;
}) {
  const plate = resolvePhotorealPlate(timeOfDay, variant);
  const texture = useTexture(plate.path) as Texture;
  const gl = useThree((state) => state.gl);

  const uniforms = useMemo(
    () => ({
      uPlate: { value: null as Texture | null },
      uResolution: { value: new Vector2(1, 1) },
      uPlateAspect: { value: plate.aspect }
    }),
    [plate.aspect]
  );

  const domeMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: PHOTOREAL_VERTEX_SHADER,
        fragmentShader: PHOTOREAL_FRAGMENT_SHADER,
        uniforms,
        side: BackSide,
        depthWrite: false
      }),
    [uniforms]
  );

  const domeGeometry = useMemo(() => new SphereGeometry(300, 48, 24), []);

  // Depth-only occluders at OUR metric building footprints, always on so the
  // composite hides vehicles behind buildings via the depth buffer.
  const occluderGeometries = useMemo(
    () =>
      BUILDING_FOOTPRINTS.map((b) => {
        const [w, h, d] = b.size;
        const geometry = new BoxGeometry(w, h, d);
        geometry.translate(b.position[0], b.position[1], b.position[2]);
        return { id: b.id, geometry };
      }),
    []
  );

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    uniforms.uPlate.value = texture;
    return () => {
      domeMaterial.dispose();
    };
  }, [uniforms, domeMaterial, texture]);

  // Keep the screen-space resolution in sync with the drawing buffer so the
  // plate samples 1:1 with the rendered frame (mirrors BackgroundPlateLayer).
  useFrame(() => {
    const size = gl.getDrawingBufferSize(new Vector2());
    const res = uniforms.uResolution.value as Vector2;
    if (res.x !== size.x || res.y !== size.y) {
      res.set(size.x, size.y);
    }
  });

  return (
    <group name="photoreal-plate">
      <mesh
        name="photoreal-plate-dome"
        geometry={domeGeometry}
        material={domeMaterial}
        renderOrder={-10}
        frustumCulled={false}
      />
      {/* Depth-only occluders: write depth, draw no colour, so 3D vehicles are
          hidden behind buildings. Rendered before the vehicles (renderOrder -1)
          so the depth buffer is primed. */}
      {occluderGeometries.map(({ id, geometry }) => (
        <mesh key={`photoreal-occluder-${id}`} geometry={geometry} renderOrder={-1}>
          <meshBasicMaterial colorWrite={false} depthWrite />
        </mesh>
      ))}
    </group>
  );
}
