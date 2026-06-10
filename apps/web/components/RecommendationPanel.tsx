"use client";

import { useState } from "react";

import type { Recommendation } from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy, formatDirection } from "../lib/i18n";

type RecommendationPanelProps = {
  recommendation: Recommendation;
  locale: Locale;
  onRefreshRecommendation: () => Promise<void>;
};

export function RecommendationPanel({
  recommendation,
  locale,
  onRefreshRecommendation
}: RecommendationPanelProps) {
  const t = copy[locale];
  const [refreshState, setRefreshState] = useState<"idle" | "running">("idle");
  const [refreshError, setRefreshError] = useState(false);
  const actionLabel = formatRecommendationAction(recommendation, locale);
  const situationText = formatSituation(recommendation.evidence, locale);

  async function handleRefreshRecommendation() {
    setRefreshState("running");
    setRefreshError(false);
    const startedAt = Date.now();
    try {
      await onRefreshRecommendation();
    } catch {
      setRefreshError(true);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 300) {
        await new Promise((resolve) => setTimeout(resolve, 300 - elapsed));
      }
      setRefreshState("idle");
    }
  }

  return (
    <section className="panel recommendation-panel">
      <div className="panel-heading">
        <div className="heading-copy">
          <h2>{t.aiRecommendation}</h2>
          <span>{t.aiRecommendationSub}</span>
        </div>
        <div className="simulation-mode">
          <span>{t.simulationOnly}</span>
          <button
            type="button"
            className={`motion-icon-button motion-pressable refresh-button${
              refreshState === "running" ? " running" : ""
            }`}
            aria-label={t.refreshRecommendation}
            onClick={handleRefreshRecommendation}
            disabled={refreshState === "running"}
          >
            <span aria-hidden="true" className="refresh-glyph" />
          </button>
          {refreshState === "running" ? (
            <small role="status">
              {locale === "ko" ? "추천 새로고침 중" : "Refreshing recommendation"}
            </small>
          ) : null}
          {refreshError ? (
            <small className="action-error" role="status">
              {locale === "ko" ? "추천 새로고침 실패" : "Recommendation refresh failed"}
            </small>
          ) : null}
        </div>
      </div>

      <div className="situation-block">
        <span>
          {t.currentSituation}
          <small>Current Situation</small>
        </span>
        <p>{situationText}</p>
      </div>

      <div className="recommendation-card">
        <div>
          <span>{t.recommendedAction}</span>
          <strong>{actionLabel}</strong>
          <small>{recommendation.action}</small>
        </div>
        <div className="signal-preview" aria-hidden="true">
          <i className="red-light" />
          <i className="amber-light" />
          <i className="green-arrow" />
        </div>
      </div>

      <div className="evidence-table">
        <h3>{t.evidence}</h3>
        {Object.entries(recommendation.evidence).map(([key, value]) => (
          <div key={key}>
            <span>{formatEvidenceKey(key, locale)}</span>
            <strong>{formatEvidenceValue(key, value, locale)}</strong>
          </div>
        ))}
      </div>

      <div className="safety-banner">
        <strong>{t.noRealControl}</strong>
        <span>{t.safetyCopy}</span>
      </div>
    </section>
  );
}

function formatEvidenceKey(key: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    reason: { ko: "추천 근거", en: "Reason" },
    direction: { ko: "접근 방향", en: "Approach" },
    estimated_arrival_seconds: { ko: "예상 도착", en: "Estimated arrival" },
    queue: { ko: "대기열", en: "Queue" }
  };

  return labels[key]?.[locale] ?? key;
}

function formatEvidenceValue(key: string, value: string | number, locale: Locale) {
  if (key === "direction") return formatDirection(String(value), locale);
  if (key === "reason") return formatReason(String(value), locale);
  if (key === "estimated_arrival_seconds") {
    return locale === "ko" ? `${value}초` : `${value} sec`;
  }
  return String(value);
}

function formatRecommendationAction(
  recommendation: Recommendation,
  locale: Locale
): string {
  const direction = getEvidenceDirection(recommendation);
  const directionLabel = formatDirection(direction, locale);

  const labels: Record<string, Record<Locale, string>> = {
    emergency_priority: {
      ko: `${directionLabel} 우선 신호 권고`,
      en: `${directionLabel} priority signal recommended`
    },
    all_red_safety: {
      ko: "전방향 정지 안전 단계 권고",
      en: "All-red safety interval recommended"
    },
    green_extension: {
      ko: `${directionLabel} 녹색 연장 권고`,
      en: `${directionLabel} green extension recommended`
    },
    pedestrian_phase: {
      ko: "보행자 횡단 단계 권고",
      en: "Pedestrian crossing phase recommended"
    },
    maintain_cycle: {
      ko: "기본 신호 주기 유지",
      en: "Maintain normal signal cycle"
    }
  };

  return labels[recommendation.action]?.[locale] ?? recommendation.action;
}

function formatSituation(evidence: Recommendation["evidence"], locale: Locale) {
  const reason = typeof evidence.reason === "string" ? evidence.reason : "";
  const direction = getEvidenceDirection({ evidence } as Recommendation);
  const directionLabel = formatDirection(direction, locale);

  if (reason === "emergency_vehicle_approach") {
    return locale === "ko"
      ? `${directionLabel} 방향 긴급차량 우선 요청이 감지되었습니다.`
      : `Emergency priority request detected on the ${directionLabel} approach.`;
  }

  if (reason === "intersection_blocked") {
    return locale === "ko"
      ? "교차로 차단 상황이 감지되어 안전 정지 시뮬레이션이 필요합니다."
      : "Intersection blockage detected. Run an all-red safety simulation.";
  }

  if (reason === "queue_threshold_exceeded") {
    return locale === "ko"
      ? `${directionLabel} 방향 대기열이 기준치를 초과했습니다.`
      : `${directionLabel} queue is above the threshold.`;
  }

  if (reason === "pedestrian_waiting") {
    return locale === "ko"
      ? "보행자 대기 요청이 감지되었습니다."
      : "Pedestrian crossing demand is waiting.";
  }

  return locale === "ko"
    ? "교통 흐름이 정상 범위 안에 있습니다."
    : "Traffic flow is within the normal operating range.";
}

function formatReason(reason: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    emergency_vehicle_approach: { ko: "긴급차량 접근", en: "Emergency vehicle approach" },
    intersection_blocked: { ko: "교차로 차단", en: "Intersection blocked" },
    queue_threshold_exceeded: { ko: "대기열 기준 초과", en: "Queue threshold exceeded" },
    pedestrian_waiting: { ko: "보행자 대기", en: "Pedestrian waiting" },
    normal_flow: { ko: "정상 흐름", en: "Normal flow" }
  };

  return labels[reason]?.[locale] ?? reason;
}

function getEvidenceDirection(recommendation: Pick<Recommendation, "evidence">) {
  const direction = recommendation.evidence.direction;
  return typeof direction === "string" ? direction : null;
}
