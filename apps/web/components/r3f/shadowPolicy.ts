import type { SceneSnapshot } from "./buildSceneSnapshot";

export const STAGE5_SHADOWS_ENABLED = true;
export const STAGE5_NEAR_VEHICLE_SHADOW_LIMIT = 8;
export const STAGE5_SIGNAL_SHADOW_CASTERS_PER_SIGNAL = 2;
export const STAGE5_SIGNAL_SHADOW_CASTER_LIMIT =
  STAGE5_SIGNAL_SHADOW_CASTERS_PER_SIGNAL * 4;
export const STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT = 2;
export const STAGE5_SHADOW_CASTER_LIMIT =
  STAGE5_NEAR_VEHICLE_SHADOW_LIMIT +
  STAGE5_SIGNAL_SHADOW_CASTER_LIMIT +
  STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT;

export function getStage5ShadowCasterCount(sceneSnapshot: SceneSnapshot) {
  if (!STAGE5_SHADOWS_ENABLED) return 0;

  const nearVehicleCasters = Math.min(
    sceneSnapshot.vehicles.length,
    STAGE5_NEAR_VEHICLE_SHADOW_LIMIT
  );
  const signalCasters = Math.min(
    getUniqueSignalDirectionCount(sceneSnapshot.signals) *
      STAGE5_SIGNAL_SHADOW_CASTERS_PER_SIGNAL,
    STAGE5_SIGNAL_SHADOW_CASTER_LIMIT
  );

  return Math.min(
    nearVehicleCasters + signalCasters + STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT,
    STAGE5_SHADOW_CASTER_LIMIT
  );
}

function getUniqueSignalDirectionCount(signals: SceneSnapshot["signals"]) {
  return new Set(signals.map((signal) => signal.direction)).size;
}
