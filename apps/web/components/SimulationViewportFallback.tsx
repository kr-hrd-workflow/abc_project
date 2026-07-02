"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";

import type {
  Direction,
  IntersectionStatus,
  RuntimeReadiness,
  SimulationComparison,
  TrafficEvent
} from "../lib/types";
import type {
  SimulationFrameBufferEntry,
  SimulationFrameSnapshot
} from "../lib/simulationSnapshot";
import type { Locale } from "../lib/i18n";
import { copy, formatDirection, formatEventType } from "../lib/i18n";
import type { ScenePresentationState } from "./r3f/stage6Quality";

export type SimulationViewportProps = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  simulation: SimulationComparison;
  simulationFrame?: SimulationFrameSnapshot | null;
  simulationFrameEntries?: SimulationFrameBufferEntry[];
  selectedScenarioId?: string;
  runtimeReadiness: RuntimeReadiness;
  locale: Locale;
  scenePresentation?: ScenePresentationState;
};

type SimulationViewportFallbackProps = SimulationViewportProps & {
  simulationStreamUrl?: string;
  renderMode?: string;
};

export function SimulationViewportFallback({
  status,
  events,
  simulation,
  runtimeReadiness,
  locale,
  simulationStreamUrl,
  renderMode = "Digital twin fallback"
}: SimulationViewportFallbackProps) {
  const t = copy[locale];
  const emergencyEvent = events.find(
    (event) => event.event_type === "emergency_vehicle_approach"
  );
  const delayPercent = simulation.improvement.total_delay_percent;
  const activeDirection = signalPhaseDirection(status.signal_phase);
  const emergencyDirection = emergencyEvent?.direction ?? null;
  const pressureRows = buildPressureRows(status.queues, locale);
  const viewportEvents = events.filter(isViewportEvent);
  const telemetryLabel =
    locale === "ko" ? "SUMO 집계 텔레메트리" : "SUMO aggregate telemetry";
  const playbackVehicles = useMemo(
    () => buildPlaybackVehicles(status, events),
    [events, status]
  );
  const openaiReady = runtimeReadiness.openai.ready;

  return (
    <div className="simulation-viewport">
      {simulationStreamUrl ? (
          <iframe
            className="simulation-stream-frame hosted-simulation-stream-frame"
            src={simulationStreamUrl}
            title={locale === "ko" ? "시뮬레이션 스트림" : "Simulation stream"}
            allow="fullscreen; autoplay; xr-spatial-tracking"
          />
      ) : null}
      <div className="cctv-atmosphere" aria-hidden="true">
        <span className="lens-flare flare-main" />
        <span className="lens-flare flare-side" />
        <span className="rain-sheen" />
        <span className="camera-vignette" />
      </div>
      <div className="simulation-depth-field" aria-hidden="true">
        <span className="depth-building depth-left" />
        <span className="depth-building depth-right" />
        <span className="streetlight streetlight-a" />
        <span className="streetlight streetlight-b" />
      </div>
      <SimulationPlaybackCanvas
        activeDirection={activeDirection}
        vehicles={playbackVehicles}
        locale={locale}
      />
      <div className="playback-badge">
        <strong>{locale === "ko" ? "실사형 가상 CCTV" : "Photoreal virtual CCTV"}</strong>
        <span>{renderMode}</span>
      </div>
      <section
        className="simulation-cctv-surface"
        aria-label={locale === "ko" ? "시뮬레이션 스트림 뷰어" : "Simulation stream viewer"}
      >
        <div>
          <span>{locale === "ko" ? "Stream-ready Render Slot" : "Stream-ready Render Slot"}</span>
          <strong>{locale === "ko" ? "실사형 가상 CCTV / 디지털 트윈" : "Photoreal virtual CCTV / digital twin"}</strong>
          <small>
            {locale === "ko"
              ? "NEXT_PUBLIC_SIMULATION_STREAM_URL로 Hosted simulation stream 플레이어 연결 / legacy stream alias도 임시 호환"
              : "Connects to the Hosted simulation stream player from NEXT_PUBLIC_SIMULATION_STREAM_URL; legacy stream alias remains temporarily supported"}
          </small>
        </div>
        <div className="cctv-frame-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>
      <section className={`launch-readiness-card ${openaiReady ? "ready" : "pending"}`} aria-label="OpenAI launch readiness">
        <span>{locale === "ko" ? "Launch gate" : "Launch gate"}</span>
        <strong>{openaiReady ? "OpenAI live ready" : "OPENAI_API_KEY 대기"}</strong>
        <small>
          {openaiReady
            ? (locale === "ko" ? "키 감지됨. live AI 답변 모드 사용 가능" : "Key detected. Live AI answer mode is available")
            : (locale === "ko" ? "키만 입력하면 live AI 답변으로 전환" : "Enter only OPENAI_API_KEY to enable live AI answers")}
        </small>
      </section>
      <div className="renderer-status" aria-label="Simulation renderer status">
        <strong>SUMO/TraCI Renderer</strong>
        <span>{simulation.source}</span>
        <span>Delay {formatPercent(delayPercent)}</span>
      </div>
      <div className="city-block block-nw" />
      <div className="city-block block-ne" />
      <div className="city-block block-sw" />
      <div className="city-block block-se" />
      <div className="tree-field trees-nw" />
      <div className="tree-field trees-ne" />
      <div className="tree-field trees-sw" />
      <div className="tree-field trees-se" />
      <div className="road vertical-road" />
      <div className="road horizontal-road" />
      <div className="lane-markers vertical-lanes" />
      <div className="lane-markers horizontal-lanes" />
      <div className="turn-pocket north-pocket" />
      <div className="turn-pocket east-pocket" />
      {activeDirection ? (
        <div className={`priority-corridor ${activeDirection}-priority`} />
      ) : null}
      <div className="crosswalk crosswalk-north" />
      <div className="crosswalk crosswalk-south" />
      <div className="crosswalk crosswalk-east" />
      <div className="crosswalk crosswalk-west" />

      <section className="sumo-telemetry" aria-label={telemetryLabel}>
        <strong>
          {locale === "ko" ? "SUMO 집계 텔레메트리" : "Aggregate SUMO telemetry"}
        </strong>
        <div className="telemetry-grid">
          <span>{locale === "ko" ? `주기 ${status.cycle_second}s` : `Cycle ${status.cycle_second}s`}</span>
          <span>
            {locale === "ko" ? "대기" : "Wait"}{" "}
            {formatSeconds(simulation.baseline.average_wait_seconds)} {"->"}{" "}
            {formatSeconds(simulation.recommended.average_wait_seconds)}
          </span>
          <span>
            {locale === "ko" ? "처리량" : "Throughput"}{" "}
            {formatSignedPercent(simulation.improvement.throughput_percent)}
          </span>
          <span>
            {locale === "ko" ? "긴급 통과" : "Clearance"}{" "}
            {formatSeconds(simulation.baseline.emergency_vehicle_clearance_seconds)} {"->"}{" "}
            {formatSeconds(simulation.recommended.emergency_vehicle_clearance_seconds)}
          </span>
        </div>
        <em>{locale === "ko" ? "집계 지표 기반" : "Based on aggregate metrics"}</em>
      </section>

      <section
        className="lane-pressure-panel"
        aria-label={locale === "ko" ? "파생 대기열 압력" : "Derived lane pressure"}
      >
        <strong>{locale === "ko" ? "파생 대기열 압력" : "Derived lane pressure"}</strong>
        <div className="pressure-bars">
          {pressureRows.map((row) => (
            <span
              key={row.direction}
              className={`pressure-row ${row.level}`}
              style={{ "--pressure": row.pressure } as CSSProperties}
            >
              <small>{row.label}</small>
              <b>{row.valueLabel}</b>
            </span>
          ))}
        </div>
      </section>

      {viewportEvents.map((event) => (
        <EventMarker key={event.id} event={event} locale={locale} />
      ))}

      <DirectionBadge direction="north" label={formatDirection("north", locale)} value={status.queues.north} />
      <DirectionBadge direction="south" label={formatDirection("south", locale)} value={status.queues.south} />
      <DirectionBadge direction="east" label={formatDirection("east", locale)} value={status.queues.east} />
      <DirectionBadge direction="west" label={formatDirection("west", locale)} value={status.queues.west} />

      <VehicleLane side="north" count={status.queues.north} />
      <VehicleLane side="south" count={status.queues.south} />
      <VehicleLane side="east" count={status.queues.east} />
      <VehicleLane side="west" count={status.queues.west} />

      <SignalStack className={`signal-north ${activeDirection === "north" ? "active" : ""}`} />
      <SignalStack className={`signal-south ${activeDirection === "south" ? "active" : ""}`} />
      <SignalStack className={`signal-east ${activeDirection === "east" ? "active" : ""}`} />
      <SignalStack className={`signal-west ${activeDirection === "west" ? "active" : ""}`} />
      {status.pedestrian_request ? <div className="pedestrian-marker" aria-label={t.pedestrian} /> : null}
      {emergencyEvent ? (
        <div className="emergency-marker">
          <span aria-hidden="true" className="emergency-triangle" />
          <strong>
            {locale === "ko"
              ? `긴급차량 ${formatDirection(emergencyDirection, locale)} 접근`
              : "Emergency Vehicle"}
          </strong>
          <small>
            {locale === "ko"
              ? "Emergency Vehicle"
              : `Emergency from ${formatDirection(emergencyDirection, locale)}`}
          </small>
        </div>
      ) : null}
      {emergencyEvent ? (
        <div className="emergency-vehicle" aria-label={t.emergency}>
          <span />
        </div>
      ) : null}
      <div className="live-badge">
        <strong>LIVE</strong>
        <time>{formatTime(status.captured_at)}</time>
      </div>
      <div className="zoom-stack" aria-hidden="true">
        <span>+</span>
        <span>-</span>
      </div>
    </div>
  );
}

type PlaybackVehicle = {
  id: string;
  direction: Direction;
  lane: number;
  offset: number;
  color: string;
  emergency: boolean;
  queued: boolean;
};

function SimulationPlaybackCanvas({
  activeDirection,
  vehicles,
  locale
}: {
  activeDirection: Direction | null;
  vehicles: PlaybackVehicle[];
  locale: Locale;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const label =
    locale === "ko" ? "SUMO 스타일 교통 재생" : "SUMO-style traffic playback";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (/jsdom/i.test(window.navigator.userAgent)) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let running = true;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const drawFrame = (time: number) => {
      resizeCanvas(canvas, context);
      drawPlaybackScene(context, canvas, vehicles, activeDirection, reduceMotion ? 0 : time);

      if (running && !reduceMotion) {
        animationFrame = window.requestAnimationFrame(drawFrame);
      }
    };

    drawFrame(0);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => drawFrame(0))
        : null;
    resizeObserver?.observe(canvas);

    return () => {
      running = false;
      resizeObserver?.disconnect();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [activeDirection, vehicles]);

  return (
    <canvas
      ref={canvasRef}
      className="sumo-playback-canvas"
      aria-label={label}
      role="img"
    />
  );
}

function DirectionBadge({
  direction,
  label,
  value
}: {
  direction: "north" | "south" | "east" | "west";
  label: string;
  value: number;
}) {
  const directionName = direction.toUpperCase();

  return (
    <div className={`direction-badge ${direction}`}>
      <strong>{label}</strong>
      <small>{directionName}</small>
      <span>{value}</span>
    </div>
  );
}

function VehicleLane({ side, count }: { side: string; count: number }) {
  return (
    <div className={`vehicle-lane lane-${side}`}>
      {Array.from({ length: Math.min(count, 8) }).map((_, index) => (
        <span key={index} className={index % 3 === 0 ? "queued" : ""} />
      ))}
    </div>
  );
}

function buildPlaybackVehicles(
  status: IntersectionStatus,
  events: TrafficEvent[]
): PlaybackVehicle[] {
  const directions: Direction[] = ["north", "south", "east", "west"];
  const palette = ["#dfe8eb", "#f4c15d", "#6fb0c9", "#bcc7ce", "#f0f4f6"];
  const vehicles: PlaybackVehicle[] = [];

  directions.forEach((direction) => {
    const count = Math.min(status.queues[direction], 12);
    Array.from({ length: count }).forEach((_, index) => {
      vehicles.push({
        id: `${direction}-${index}`,
        direction,
        lane: index % 3,
        offset: (index / Math.max(count, 1)) * 0.72 + (index % 2) * 0.05,
        color: palette[index % palette.length],
        emergency: false,
        queued: index > count - 5
      });
    });
  });

  const emergencyEvent = events.find(
    (event) => event.event_type === "emergency_vehicle_approach"
  );
  if (emergencyEvent?.direction) {
    vehicles.push({
      id: "emergency-vehicle",
      direction: emergencyEvent.direction,
      lane: 1,
      offset: 0.08,
      color: "#ff5252",
      emergency: true,
      queued: false
    });
  }

  return vehicles;
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
) {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);

  if (
    canvas.width !== Math.round(width * pixelRatio) ||
    canvas.height !== Math.round(height * pixelRatio)
  ) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function drawPlaybackScene(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  vehicles: PlaybackVehicle[],
  activeDirection: Direction | null,
  time: number
) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  context.clearRect(0, 0, width, height);

  drawSignalCorridor(context, width, height, activeDirection, time);

  vehicles.forEach((vehicle) => {
    const position = vehiclePosition(vehicle, time);
    drawVehicle(context, width, height, position.x, position.y, position.angle, vehicle);
  });
}

function drawSignalCorridor(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  direction: Direction | null,
  time: number
) {
  if (!direction) return;

  const pulse = 0.55 + Math.sin(time / 420) * 0.18;
  context.save();
  context.strokeStyle = `rgba(93, 244, 194, ${pulse})`;
  context.lineWidth = 2;
  context.shadowColor = "rgba(93, 244, 194, 0.48)";
  context.shadowBlur = 16;
  context.setLineDash([12, 10]);

  context.beginPath();
  if (direction === "east" || direction === "west") {
    const y = height * 0.51;
    context.moveTo(width * 0.16, y);
    context.lineTo(width * 0.84, y);
  } else {
    const x = width * 0.5;
    context.moveTo(x, height * 0.14);
    context.lineTo(x, height * 0.86);
  }
  context.stroke();
  context.restore();
}

function drawVehicle(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  xUnit: number,
  yUnit: number,
  angle: number,
  vehicle: PlaybackVehicle
) {
  const x = xUnit * width;
  const y = yUnit * height;
  const carWidth = vehicle.emergency ? 32 : 22;
  const carHeight = vehicle.emergency ? 14 : 11;

  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.shadowColor = "rgba(0, 0, 0, 0.5)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 3;

  context.fillStyle = vehicle.color;
  roundRect(context, -carWidth / 2, -carHeight / 2, carWidth, carHeight, 3);
  context.fill();

  context.shadowBlur = 0;
  context.fillStyle = vehicle.emergency ? "#ffffff" : "rgba(255, 255, 255, 0.66)";
  roundRect(context, -carWidth / 4, -carHeight / 2 + 2, carWidth / 2, carHeight - 4, 2);
  context.fill();

  context.fillStyle = vehicle.emergency ? "#5fe8ff" : "rgba(255, 242, 164, 0.88)";
  context.fillRect(carWidth / 2 - 1, -carHeight / 2 + 2, 7, 3);
  context.fillRect(carWidth / 2 - 1, carHeight / 2 - 5, 7, 3);

  context.fillStyle = vehicle.emergency ? "#ff2f2f" : "rgba(255, 72, 72, 0.74)";
  context.fillRect(-carWidth / 2 - 4, -carHeight / 2 + 2, 4, 3);
  context.fillRect(-carWidth / 2 - 4, carHeight / 2 - 5, 4, 3);

  if (vehicle.emergency) {
    context.fillStyle = "#ffffff";
    context.fillRect(-4, -carHeight / 2 - 2, 8, 3);
    context.fillStyle = "rgba(255, 54, 54, 0.42)";
    context.fillRect(-72, -1, 68, 2);
  }

  context.restore();
}

function vehiclePosition(vehicle: PlaybackVehicle, time: number) {
  const speed = vehicle.emergency ? 0.00016 : vehicle.queued ? 0.000025 : 0.00007;
  const progress = (vehicle.offset + time * speed) % 1;
  const laneOffset = (vehicle.lane - 1) * 0.025;

  if (vehicle.direction === "north") {
    return { x: 0.49 + laneOffset, y: -0.08 + progress * 1.16, angle: Math.PI / 2 };
  }
  if (vehicle.direction === "south") {
    return { x: 0.53 - laneOffset, y: 1.08 - progress * 1.16, angle: -Math.PI / 2 };
  }
  if (vehicle.direction === "east") {
    return { x: 1.08 - progress * 1.16, y: 0.53 + laneOffset, angle: Math.PI };
  }
  return { x: -0.08 + progress * 1.16, y: 0.47 - laneOffset, angle: 0 };
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function SignalStack({ className }: { className: string }) {
  return (
    <div className={`signal ${className}`}>
      <span className="red-light" />
      <span className="amber-light" />
      <span className="green-light" />
    </div>
  );
}

function EventMarker({ event, locale }: { event: TrafficEvent; locale: Locale }) {
  const label = formatEventType(event.event_type, locale);
  const direction = event.direction ?? "center";

  return (
    <div
      className={`sumo-event-marker event-${event.event_type} ${event.severity} ${direction}`}
      aria-label={`${label} SUMO 이벤트`}
    >
      <strong>{label}</strong>
      <small>{formatEventLocation(event, locale)}</small>
    </div>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatPercent(value: number) {
  const normalizedValue = value > 0 ? -value : value;
  return `${normalizedValue}%`;
}

function formatSignedPercent(value: number | undefined) {
  if (typeof value !== "number") return "0%";
  return value > 0 ? `+${value}%` : `${value}%`;
}

function formatSeconds(value: number) {
  return `${Math.round(value)}s`;
}

function formatEventLocation(event: TrafficEvent, locale: Locale) {
  const count = event.object_count;

  if (!event.direction) {
    return locale === "ko" ? `전체 접근부 ${count}대` : `All approaches, ${count} vehicles`;
  }

  if (locale === "ko") {
    return `${formatDirection(event.direction, locale)}쪽 접근부 ${count}대`;
  }

  return `${formatDirection(event.direction, locale)} approach, ${count} vehicles`;
}

function isViewportEvent(event: TrafficEvent) {
  return [
    "pedestrian_waiting",
    "intersection_blocked",
    "queue_threshold_exceeded"
  ].includes(event.event_type);
}

function buildPressureRows(queues: IntersectionStatus["queues"], locale: Locale) {
  const directions: Direction[] = ["north", "south", "east", "west"];
  const maxQueue = Math.max(...directions.map((direction) => queues[direction]), 1);

  return directions.map((direction) => {
    const value = queues[direction];
    return {
      direction,
      label: direction.toUpperCase(),
      valueLabel: locale === "ko" ? `${formatDirection(direction, locale)} ${value}대` : `${formatDirection(direction, locale)} ${value}`,
      pressure: `${Math.max(18, Math.round((value / maxQueue) * 100))}%`,
      level: pressureLevel(value)
    };
  });
}

function pressureLevel(value: number) {
  if (value >= 14) return "critical";
  if (value >= 8) return "elevated";
  return "normal";
}

function signalPhaseDirection(value: string) {
  if (value.includes("north")) return "north";
  if (value.includes("south")) return "south";
  if (value.includes("east")) return "east";
  if (value.includes("west")) return "west";
  return null;
}
