"use client";

import { useState } from "react";

import type {
  TrafficEvent,
  IntersectionStatus,
  Recommendation,
  RuntimeReadiness,
  SimulationComparison
} from "../lib/types";
import type {
  SimulationFrameBufferEntry,
  SimulationFrameSnapshot
} from "../lib/simulationSnapshot";
import type { Locale } from "../lib/i18n";
import { copy } from "../lib/i18n";
import { SimulationViewport } from "./SimulationViewport";

type DigitalTwinProps = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  recommendation: Recommendation;
  simulation: SimulationComparison;
  simulationFrame: SimulationFrameSnapshot | null;
  simulationFrameEntries?: SimulationFrameBufferEntry[];
  selectedScenarioId: string;
  runtimeReadiness: RuntimeReadiness;
  locale: Locale;
  onRunSimulation: () => Promise<void>;
};

export function DigitalTwin({
  status,
  events,
  recommendation,
  simulation,
  simulationFrame,
  simulationFrameEntries,
  selectedScenarioId,
  runtimeReadiness,
  locale,
  onRunSimulation
}: DigitalTwinProps) {
  const t = copy[locale];
  const [simulationState, setSimulationState] =
    useState<"idle" | "running" | "ready" | "failed">("idle");

  async function handleRunSimulation() {
    setSimulationState("running");
    try {
      await onRunSimulation();
      setSimulationState("ready");
    } catch {
      setSimulationState("failed");
    }
  }

  return (
    <section className="panel simulation-panel" aria-label="Digital Twin Simulation">
      <div className="panel-heading simulation-heading">
        <div>
          <h2>Digital Twin Simulation</h2>
          <p>
            {t.simulationViewport}
            <span>{t.simulationViewportSub}</span>
          </p>
        </div>
        <div className="viewport-controls">
          <span className="viewport-mode">
            {locale === "ko" ? "시뮬레이션 스트림 준비" : "Simulation stream ready"}
          </span>
          <span className="viewport-mode">
            {locale === "ko" ? "SUMO 검증" : "SUMO validation"}
          </span>
          <span className="viewport-mode">{status.signal_phase}</span>
          <button
            type="button"
            className="motion-pressable command-pressable simulation-run-button"
            onClick={handleRunSimulation}
            disabled={simulationState === "running"}
          >
            <span>{simulationState === "running" ? t.simulationRunning : t.runSimulation}</span>
          </button>
        </div>
      </div>
      {simulationState !== "idle" ? (
        <div className={`simulation-feedback ${simulationState}`} role="status">
          {simulationState === "running" ? t.simulationRunning : null}
          {simulationState === "ready" ? t.simulationReady : null}
          {simulationState === "failed" ? t.simulationFailed : null}
        </div>
      ) : null}

      <SimulationViewport
        status={status}
        events={events}
        simulation={simulation}
        simulationFrame={simulationFrame}
        simulationFrameEntries={simulationFrameEntries}
        selectedScenarioId={selectedScenarioId}
        runtimeReadiness={runtimeReadiness}
        locale={locale}
      />

      <RecommendationPipelineRail
        status={status}
        events={events}
        recommendation={recommendation}
        simulation={simulation}
        locale={locale}
      />

      <div className="simulation-legend">
        <span>{t.signalState}</span>
        <span><i className="dot green" /> GREEN</span>
        <span><i className="dot amber" /> YELLOW</span>
        <span><i className="dot red" /> RED</span>
        <span><i className="dot vehicle" /> {t.vehicle}</span>
        <span><i className="dot cyan" /> {t.pedestrian}</span>
        <span><i className="dot emergency" /> {t.emergency}</span>
      </div>
    </section>
  );
}

function RecommendationPipelineRail({
  status,
  events,
  recommendation,
  simulation,
  locale
}: {
  status: IntersectionStatus;
  events: TrafficEvent[];
  recommendation: Recommendation;
  simulation: SimulationComparison;
  locale: Locale;
}) {
  const latestEvent = events[0] ?? null;
  const maxQueue = Math.max(...Object.values(status.queues));
  const averageWaitChange =
    simulation.recommended.average_wait_seconds - simulation.baseline.average_wait_seconds;
  const frameTime = new Date(status.captured_at).toLocaleTimeString(
    locale === "ko" ? "ko-KR" : "en-US",
    { hour: "2-digit", minute: "2-digit", second: "2-digit" }
  );
  const eventSeverity = latestEvent
    ? `${latestEvent.severity.toUpperCase()} · ${latestEvent.object_count}`
    : locale === "ko"
      ? "이벤트 대기"
      : "Waiting";
  const waitLabel =
    locale === "ko"
      ? `${simulation.baseline.average_wait_seconds}초 → ${simulation.recommended.average_wait_seconds}초`
      : `${simulation.baseline.average_wait_seconds}s → ${simulation.recommended.average_wait_seconds}s`;
  const waitDetail =
    locale === "ko"
      ? `평균 대기 ${formatSignedNumber(averageWaitChange)}초`
      : `Average wait ${formatSignedNumber(averageWaitChange)}s`;
  const steps = [
    {
      number: "01",
      label: locale === "ko" ? "CCTV 프레임" : "CCTV frame",
      value: frameTime,
      detail: locale === "ko" ? "실시간 영상/이벤트 인입" : "Live video/event intake"
    },
    {
      number: "02",
      label: locale === "ko" ? "객체 감지" : "Object detection",
      value: latestEvent ? formatEventType(latestEvent.event_type, locale) : "No event",
      detail: latestEvent ? `${latestEvent.event_type} · ${eventSeverity}` : eventSeverity
    },
    {
      number: "03",
      label: locale === "ko" ? "신호 데이터 결합" : "Signal fusion",
      value: status.signal_phase,
      detail: locale === "ko" ? `최대 대기열 ${maxQueue}대` : `Max queue ${maxQueue} vehicles`
    },
    {
      number: "04",
      label: locale === "ko" ? "정책 평가" : "Policy evaluation",
      value: waitLabel,
      detail: waitDetail
    },
    {
      number: "05",
      label: locale === "ko" ? "LLM 추천안" : "LLM recommendation",
      value: formatRecommendationAction(recommendation.action, locale),
      detail:
        locale === "ko"
          ? `${recommendation.action} · 실제 제어 아님`
          : `${recommendation.action} · No real control`
    }
  ];

  return (
    <section className="recommendation-pipeline-rail" aria-label="Recommendation generation pipeline">
      <div className="recommendation-pipeline-heading">
        <div>
          <span>{locale === "ko" ? "추천 생성 흐름" : "Recommendation flow"}</span>
          <strong>
            {locale === "ko"
              ? "CCTV/신호 데이터가 운영자 검토용 권고안으로 바뀌는 과정"
              : "How live CCTV and signal data become an operator-reviewed recommendation"}
          </strong>
        </div>
        <em>{locale === "ko" ? "실제 제어 아님" : "No real control"}</em>
      </div>
      <ol>
        {steps.map((step) => (
          <li key={step.number}>
            <span>{step.number}</span>
            <div>
              <strong>{step.label}</strong>
              <b>{step.value}</b>
              <small>{step.detail}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatEventType(eventType: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    emergency_vehicle_approach: {
      ko: "긴급차량 접근",
      en: "Emergency approach"
    },
    queue_threshold_exceeded: {
      ko: "대기열 증가",
      en: "Queue increase"
    },
    pedestrian_waiting: {
      ko: "보행자 대기",
      en: "Pedestrian wait"
    },
    intersection_blocked: {
      ko: "교차로 차단",
      en: "Blocked intersection"
    }
  };

  return labels[eventType]?.[locale] ?? eventType;
}

function formatRecommendationAction(action: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    emergency_priority: {
      ko: "긴급차량 우선 권고",
      en: "Emergency priority"
    },
    pedestrian_priority: {
      ko: "보행자 우선 권고",
      en: "Pedestrian priority"
    },
    normal_cycle: {
      ko: "정상 신호 유지",
      en: "Keep normal cycle"
    },
    blocked_response: {
      ko: "차단 대응 권고",
      en: "Blocked response"
    }
  };

  return labels[action]?.[locale] ?? action;
}
