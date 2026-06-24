"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  SimulationFrameBufferEntry,
  SimulationFrameSnapshot,
  SimulationFrameTelemetry,
  SimulationPedestrianSnapshot,
  SimulationVehicleSnapshot
} from "../../lib/simulationSnapshot";
import {
  SIMULATION_FRAME_AUTHORITATIVE_HZ,
  SIMULATION_FRAME_INTERPOLATION_DELAY_MS,
  SIMULATION_FRAME_MAX_EXTRAPOLATION_MS,
  SIMULATION_FRAME_STALE_AFTER_MS
} from "../../lib/simulationSnapshot";

export type InterpolatedSimulationFrameResult = {
  frame: SimulationFrameSnapshot | null;
  telemetry: SimulationFrameTelemetry;
};

type InterpolationOptions = {
  scenarioId?: string | null;
  nowMs?: number;
  interpolationDelayMs?: number;
  maxExtrapolationMs?: number;
  staleAfterMs?: number;
  authoritativeHz?: number;
};

const emptyTelemetry: SimulationFrameTelemetry = {
  frameAgeMs: null,
  networkLatencyMs: null,
  simToRenderDelayMs: null,
  authoritativeHz: SIMULATION_FRAME_AUTHORITATIVE_HZ,
  authoritativeTickDriftMs: null,
  stale: false,
  staleReason: null
};

export function useInterpolatedSimulationFrame(
  frameEntries: SimulationFrameBufferEntry[] | undefined,
  options: InterpolationOptions = {}
): InterpolatedSimulationFrameResult {
  const [nowMs, setNowMs] = useState(() => options.nowMs ?? readNowMs());
  const interpolationDelayMs =
    options.interpolationDelayMs ?? SIMULATION_FRAME_INTERPOLATION_DELAY_MS;
  const maxExtrapolationMs =
    options.maxExtrapolationMs ?? SIMULATION_FRAME_MAX_EXTRAPOLATION_MS;
  const staleAfterMs = options.staleAfterMs ?? SIMULATION_FRAME_STALE_AFTER_MS;
  const authoritativeHz =
    options.authoritativeHz ?? SIMULATION_FRAME_AUTHORITATIVE_HZ;
  const scenarioId = options.scenarioId ?? null;

  useEffect(() => {
    if (typeof options.nowMs === "number") {
      setNowMs(options.nowMs);
      return;
    }
    if (!frameEntries || frameEntries.length === 0 || isJsdomRuntime()) return;

    let animationFrame = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      setNowMs(readNowMs());
      animationFrame = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      running = false;
      if (animationFrame > 0) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [frameEntries, options.nowMs]);

  return useMemo(
    () =>
      interpolateSimulationFrame(frameEntries ?? [], {
        nowMs,
        scenarioId,
        interpolationDelayMs,
        maxExtrapolationMs,
        staleAfterMs,
        authoritativeHz
      }),
    [
      authoritativeHz,
      frameEntries,
      interpolationDelayMs,
      maxExtrapolationMs,
      nowMs,
      scenarioId,
      staleAfterMs
    ]
  );
}

export function interpolateSimulationFrame(
  frameEntries: SimulationFrameBufferEntry[],
  options: InterpolationOptions = {}
): InterpolatedSimulationFrameResult {
  const targetScenarioId =
    options.scenarioId ??
    frameEntries[frameEntries.length - 1]?.frame.scenario_id ??
    null;
  const entries = frameEntries
    .filter(
      (entry) => !targetScenarioId || entry.frame.scenario_id === targetScenarioId
    )
    .filter((entry) => Number.isFinite(entry.frame.sim_time_seconds))
    .slice()
    .sort((left, right) => left.frame.sim_time_seconds - right.frame.sim_time_seconds)
    .slice(-2);
  const latest = entries[entries.length - 1];
  const authoritativeHz =
    options.authoritativeHz ?? SIMULATION_FRAME_AUTHORITATIVE_HZ;

  if (!latest) {
    return {
      frame: null,
      telemetry: { ...emptyTelemetry, authoritativeHz }
    };
  }

  const nowMs = options.nowMs ?? readNowMs();
  const interpolationDelayMs =
    options.interpolationDelayMs ?? SIMULATION_FRAME_INTERPOLATION_DELAY_MS;
  const maxExtrapolationSeconds =
    (options.maxExtrapolationMs ?? SIMULATION_FRAME_MAX_EXTRAPOLATION_MS) / 1000;
  const staleAfterMs = options.staleAfterMs ?? SIMULATION_FRAME_STALE_AFTER_MS;
  const frameAgeMs = Math.max(0, Math.round(nowMs - latest.receivedAtMs));
  const targetSimTimeSeconds =
    latest.frame.sim_time_seconds +
    (nowMs - interpolationDelayMs - latest.receivedAtMs) / 1000;
  const previous = entries.length > 1 ? entries[0] : null;
  const sourceIsDegraded = latest.frame.source === "sumo_last_good";

  let frame: SimulationFrameSnapshot;
  let staleReason: string | null = sourceIsDegraded ? "degraded_source" : null;

  if (
    previous &&
    targetSimTimeSeconds >= previous.frame.sim_time_seconds &&
    targetSimTimeSeconds <= latest.frame.sim_time_seconds
  ) {
    frame = interpolateBetweenFrames(previous.frame, latest.frame, targetSimTimeSeconds);
  } else if (previous && targetSimTimeSeconds < previous.frame.sim_time_seconds) {
    frame = cloneFrame(previous.frame);
  } else {
    const extrapolationSeconds = Math.max(
      0,
      targetSimTimeSeconds - latest.frame.sim_time_seconds
    );

    if (extrapolationSeconds <= maxExtrapolationSeconds) {
      frame = extrapolateFrame(latest.frame, extrapolationSeconds);
    } else {
      frame = cloneFrame(latest.frame);
      staleReason = staleReason ?? "missing_next_frame";
    }
  }

  if (frameAgeMs > staleAfterMs) {
    staleReason = staleReason ?? "frame_age";
  }

  const simToRenderDelayMs = Math.round(
    Math.max(0, latest.frame.sim_time_seconds - frame.sim_time_seconds) * 1000
  );
  const authoritativeTickDriftMs =
    previous && authoritativeHz > 0
      ? Math.round(
          Math.abs(
            latest.receivedAtMs -
              previous.receivedAtMs -
              1000 / authoritativeHz
          )
        )
      : 0;

  return {
    frame,
    telemetry: {
      frameAgeMs,
      networkLatencyMs: Math.round(latest.networkLatencyMs),
      simToRenderDelayMs,
      authoritativeHz,
      authoritativeTickDriftMs,
      stale: staleReason !== null,
      staleReason
    }
  };
}

function interpolateBetweenFrames(
  previous: SimulationFrameSnapshot,
  next: SimulationFrameSnapshot,
  targetSimTimeSeconds: number
): SimulationFrameSnapshot {
  const spanSeconds = next.sim_time_seconds - previous.sim_time_seconds;
  const ratio =
    spanSeconds > 0
      ? clamp01((targetSimTimeSeconds - previous.sim_time_seconds) / spanSeconds)
      : 1;
  const nextVehicleById = new Map(
    next.vehicles.map((vehicle) => [vehicle.id, vehicle])
  );
  const nextPedestrianById = new Map(
    getFramePedestrians(next).map((pedestrian) => [pedestrian.id, pedestrian])
  );

  if (ratio >= 1) {
    return {
      ...cloneFrame(next),
      sim_time_seconds: targetSimTimeSeconds
    };
  }

  if (ratio <= 0) {
    return {
      ...cloneFrame(previous),
      sim_time_seconds: targetSimTimeSeconds
    };
  }

  return {
    ...cloneFrame(previous),
    source: next.source,
    scenario_id: next.scenario_id,
    sim_time_seconds: targetSimTimeSeconds,
    vehicles: previous.vehicles.map((vehicle) => {
      const nextVehicle = nextVehicleById.get(vehicle.id);

      return nextVehicle
        ? interpolateVehicle(vehicle, nextVehicle, ratio)
        : { ...vehicle };
    }),
    pedestrians: getFramePedestrians(previous).map((pedestrian) => {
      const nextPedestrian = nextPedestrianById.get(pedestrian.id);

      return nextPedestrian
        ? interpolatePedestrian(pedestrian, nextPedestrian, ratio)
        : { ...pedestrian };
    })
  };
}

function extrapolateFrame(
  frame: SimulationFrameSnapshot,
  extrapolationSeconds: number
): SimulationFrameSnapshot {
  return {
    ...cloneFrame(frame),
    sim_time_seconds: frame.sim_time_seconds + extrapolationSeconds,
    vehicles: frame.vehicles.map((vehicle) =>
      extrapolateVehicle(vehicle, extrapolationSeconds)
    ),
    pedestrians: getFramePedestrians(frame).map((pedestrian) =>
      extrapolatePedestrian(pedestrian, extrapolationSeconds)
    )
  };
}

function interpolateVehicle(
  previous: SimulationVehicleSnapshot,
  next: SimulationVehicleSnapshot,
  ratio: number
): SimulationVehicleSnapshot {
  return {
    ...previous,
    lane_id: ratio >= 1 ? next.lane_id : previous.lane_id,
    vehicle_type: ratio >= 1 ? next.vehicle_type : previous.vehicle_type,
    emergency: ratio >= 1 ? next.emergency : previous.emergency,
    x_meters: lerp(previous.x_meters, next.x_meters, ratio),
    y_meters: lerp(previous.y_meters, next.y_meters, ratio),
    heading_degrees: interpolateHeadingDegrees(
      previous.heading_degrees,
      next.heading_degrees,
      ratio
    ),
    speed_mps: lerp(previous.speed_mps, next.speed_mps, ratio),
    waiting_seconds: lerp(previous.waiting_seconds, next.waiting_seconds, ratio)
  };
}

function extrapolateVehicle(
  vehicle: SimulationVehicleSnapshot,
  extrapolationSeconds: number
): SimulationVehicleSnapshot {
  const radians = (vehicle.heading_degrees * Math.PI) / 180;

  return {
    ...vehicle,
    x_meters:
      vehicle.x_meters + Math.cos(radians) * vehicle.speed_mps * extrapolationSeconds,
    y_meters:
      vehicle.y_meters + Math.sin(radians) * vehicle.speed_mps * extrapolationSeconds
  };
}

function interpolatePedestrian(
  previous: SimulationPedestrianSnapshot,
  next: SimulationPedestrianSnapshot,
  ratio: number
): SimulationPedestrianSnapshot {
  return {
    ...previous,
    lane_id: ratio >= 1 ? next.lane_id : previous.lane_id,
    edge_id: ratio >= 1 ? next.edge_id : previous.edge_id,
    source: ratio >= 1 ? next.source : previous.source,
    x_meters: lerp(previous.x_meters, next.x_meters, ratio),
    y_meters: lerp(previous.y_meters, next.y_meters, ratio),
    heading_degrees: interpolateHeadingDegrees(
      previous.heading_degrees,
      next.heading_degrees,
      ratio
    ),
    speed_mps: lerp(previous.speed_mps, next.speed_mps, ratio),
    waiting_seconds: lerp(previous.waiting_seconds, next.waiting_seconds, ratio)
  };
}

function extrapolatePedestrian(
  pedestrian: SimulationPedestrianSnapshot,
  extrapolationSeconds: number
): SimulationPedestrianSnapshot {
  const radians = (pedestrian.heading_degrees * Math.PI) / 180;

  return {
    ...pedestrian,
    x_meters:
      pedestrian.x_meters +
      Math.cos(radians) * pedestrian.speed_mps * extrapolationSeconds,
    y_meters:
      pedestrian.y_meters +
      Math.sin(radians) * pedestrian.speed_mps * extrapolationSeconds
  };
}

function cloneFrame(frame: SimulationFrameSnapshot): SimulationFrameSnapshot {
  return {
    ...frame,
    bounds_meters: { ...frame.bounds_meters },
    vehicles: frame.vehicles.map((vehicle) => ({ ...vehicle })),
    pedestrians: getFramePedestrians(frame).map((pedestrian) => ({
      ...pedestrian
    })),
    density_segments: frame.density_segments.map((segment) => ({ ...segment })),
    signals: frame.signals.map((signal) => ({ ...signal })),
    queues: { ...frame.queues },
    events: frame.events.map((event) => ({ ...event }))
  };
}

function getFramePedestrians(
  frame: SimulationFrameSnapshot
): SimulationPedestrianSnapshot[] {
  return Array.isArray(frame.pedestrians) ? frame.pedestrians : [];
}

function lerp(start: number, end: number, ratio: number) {
  return start + (end - start) * ratio;
}

export function interpolateHeadingDegrees(
  startDegrees: number,
  endDegrees: number,
  ratio: number,
  options: { maxDeltaDegrees?: number } = {}
) {
  const maxDeltaDegrees = options.maxDeltaDegrees ?? 180;
  const delta = clamp(
    shortestAngleDelta(startDegrees, endDegrees),
    -maxDeltaDegrees,
    maxDeltaDegrees
  );

  return normalizeDegrees(startDegrees + delta * clamp01(ratio));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function shortestAngleDelta(start: number, end: number) {
  return ((end - start + 540) % 360) - 180;
}

function normalizeDegrees(value: number) {
  const normalized = ((value % 360) + 360) % 360;

  return Math.abs(normalized - 360) < 0.000001 ? 0 : normalized;
}

function readNowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" &&
    /jsdom/i.test(window.navigator.userAgent)
  );
}
