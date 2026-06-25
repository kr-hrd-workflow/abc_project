"use client";

import { useEffect } from "react";
import { useThree, type RootState } from "@react-three/fiber";

import {
  STAGE5_CAMERA,
  STAGE5_TALL_VIEWPORT_CAMERA,
  type Vector3Tuple
} from "./roadGeometry";

export type CameraRigPresetName =
  | "operatorWide"
  | "nightRainClose"
  | "nightAerialProof"
  | "mobileWide"
  | "photorealProof"
  | "proofDeterministic";

export type CameraRigWeather = "clear" | "cloudy" | "rain";
export type CameraRigTimeOfDay = "day" | "night";

export type CameraRigPresetConfig = {
  name: CameraRigPresetName;
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov: number;
  near: number;
  far: number;
};

export type CameraRigConfig = CameraRigPresetConfig & {
  shake: {
    enabled: boolean;
    offset: Vector3Tuple;
  };
};

export type CameraRigSelectionInput = {
  aspect: number;
  weather?: CameraRigWeather;
  timeOfDay?: CameraRigTimeOfDay;
  visualRegressionMode?: boolean;
};

type CameraRigConfigInput = CameraRigSelectionInput & {
  preset?: CameraRigPresetName;
};

export const CAMERA_RIG_PRESETS = {
  operatorWide: {
    name: "operatorWide",
    position: [18, 42, 58],
    target: [0, 0, -8],
    fov: 54,
    near: STAGE5_CAMERA.near,
    far: STAGE5_CAMERA.far
  },
  nightRainClose: {
    name: "nightRainClose",
    position: [4, 9.5, 24],
    target: [0, 0, -18],
    fov: 34,
    near: STAGE5_CAMERA.near,
    far: STAGE5_CAMERA.far
  },
  // High aerial oblique matching the plate projector camera (PLATE_CAMERA_ANGLES
  // "operator-wide" === STAGE5_CAMERA) so the projective-textured plate paints
  // onto the ground + building proxies aligned to screen, and the small SUMO
  // vehicles sit on the intersection below it (Option A, projector == viewer).
  nightAerialProof: {
    name: "nightAerialProof",
    position: STAGE5_CAMERA.position,
    target: STAGE5_CAMERA.target,
    fov: STAGE5_CAMERA.fov,
    near: STAGE5_CAMERA.near,
    far: STAGE5_CAMERA.far
  },
  mobileWide: {
    name: "mobileWide",
    position: [4, 18, 34],
    target: [0, 0, -8],
    fov: 42,
    near: STAGE5_TALL_VIEWPORT_CAMERA.near,
    far: STAGE5_TALL_VIEWPORT_CAMERA.far
  },
  photorealProof: {
    name: "photorealProof",
    position: [-2, 8.5, 26],
    target: [-18, 3.2, 14.4],
    fov: 30,
    near: STAGE5_CAMERA.near,
    far: STAGE5_CAMERA.far
  },
  proofDeterministic: {
    name: "proofDeterministic",
    position: STAGE5_CAMERA.position,
    target: STAGE5_CAMERA.target,
    fov: STAGE5_CAMERA.fov,
    near: STAGE5_CAMERA.near,
    far: STAGE5_CAMERA.far
  }
} as const satisfies Record<CameraRigPresetName, CameraRigPresetConfig>;
const CAMERA_RIG_PRESET_NAMES = Object.keys(
  CAMERA_RIG_PRESETS
) as CameraRigPresetName[];

const CAMERA_SHAKE_OFFSETS = {
  operatorWide: [0.12, 0.035, -0.09],
  nightRainClose: [0.055, -0.018, 0.038],
  nightAerialProof: [0.02, 0.006, -0.014],
  mobileWide: [0.075, 0.025, -0.06],
  photorealProof: [0.04, 0.012, -0.028],
  proofDeterministic: [0, 0, 0]
} as const satisfies Record<CameraRigPresetName, Vector3Tuple>;

export function selectCameraRigPreset({
  aspect,
  weather = "clear",
  timeOfDay = "day",
  visualRegressionMode = false
}: CameraRigSelectionInput): CameraRigPresetName {
  if (visualRegressionMode) return "proofDeterministic";
  if (Number.isFinite(aspect) && aspect > 0 && aspect < 1.08) return "mobileWide";
  if (timeOfDay === "night") return "nightAerialProof";

  return "operatorWide";
}

export function getCameraRigConfig(input: CameraRigConfigInput): CameraRigConfig {
  const presetName =
    input.preset ??
    selectCameraRigPreset({
      aspect: input.aspect,
      weather: input.weather,
      timeOfDay: input.timeOfDay,
      visualRegressionMode: input.visualRegressionMode
    });
  const preset = CAMERA_RIG_PRESETS[presetName];
  const shakeEnabled =
    presetName !== "proofDeterministic" &&
    input.visualRegressionMode !== true &&
    (input.weather === "rain" || input.timeOfDay === "night");

  return {
    ...preset,
    position: [...preset.position],
    target: [...preset.target],
    shake: {
      enabled: shakeEnabled,
      offset: shakeEnabled ? [...CAMERA_SHAKE_OFFSETS[presetName]] : [0, 0, 0]
    }
  };
}

export function CameraRig({
  preset = readRuntimeCameraPresetOverride(),
  weather = "clear",
  timeOfDay = "day",
  visualRegressionMode = readVisualRegressionMode()
}: {
  preset?: CameraRigPresetName;
  weather?: CameraRigWeather;
  timeOfDay?: CameraRigTimeOfDay;
  visualRegressionMode?: boolean;
}) {
  const { camera, invalidate, size } = useThree();

  useEffect(() => {
    const aspect = size.height > 0 ? size.width / size.height : 16 / 9;
    const cameraConfig = getCameraRigConfig({
      aspect,
      preset,
      weather,
      timeOfDay,
      visualRegressionMode
    });
    const position = getRuntimeCameraPosition(cameraConfig);

    applyCameraRigConfig(camera, { ...cameraConfig, position });
    invalidate();
  }, [
    camera,
    invalidate,
    preset,
    size.height,
    size.width,
    timeOfDay,
    visualRegressionMode,
    weather
  ]);

  return null;
}

CameraRig.displayName = "Stage3CameraRig";

export function parseCameraRigPresetOverride(
  value: string | null | undefined
): CameraRigPresetName | undefined {
  if (!value) return undefined;

  return CAMERA_RIG_PRESET_NAMES.includes(value as CameraRigPresetName)
    ? (value as CameraRigPresetName)
    : undefined;
}

function applyCameraRigConfig(
  camera: RootState["camera"],
  cameraConfig: CameraRigPresetConfig
) {
  camera.position.set(...cameraConfig.position);
  camera.near = cameraConfig.near;
  camera.far = cameraConfig.far;

  const perspectiveCamera = camera as RootState["camera"] & { fov?: number };
  if (typeof perspectiveCamera.fov === "number") {
    perspectiveCamera.fov = cameraConfig.fov;
  }

  camera.lookAt(...cameraConfig.target);
  camera.updateProjectionMatrix();
}

function getRuntimeCameraPosition(cameraConfig: CameraRigConfig): Vector3Tuple {
  if (!cameraConfig.shake.enabled || isJsdomRuntime()) {
    return cameraConfig.position;
  }

  return [
    cameraConfig.position[0] + cameraConfig.shake.offset[0],
    cameraConfig.position[1] + cameraConfig.shake.offset[1],
    cameraConfig.position[2] + cameraConfig.shake.offset[2]
  ];
}

function readVisualRegressionMode() {
  if (typeof process === "undefined") return false;

  const value =
    process.env.NEXT_PUBLIC_R3F_VISUAL_REGRESSION_MODE ??
    process.env.NEXT_PUBLIC_R3F_VISUAL_REGRESSION ??
    process.env.NEXT_PUBLIC_R3F_CAMERA_PRESET;

  return value === "true" || value === "1" || value === "proofDeterministic";
}

function readRuntimeCameraPresetOverride() {
  const envPreset = parseCameraRigPresetOverride(
    typeof process === "undefined"
      ? undefined
      : process.env.NEXT_PUBLIC_R3F_CAMERA_PRESET
  );

  if (envPreset) return envPreset;
  if (typeof window === "undefined") return undefined;

  const params = new URLSearchParams(window.location.search);

  return (
    parseCameraRigPresetOverride(params.get("r3fCameraPreset")) ??
    parseCameraRigPresetOverride(params.get("cameraPreset"))
  );
}

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" &&
    /jsdom/i.test(window.navigator.userAgent)
  );
}
