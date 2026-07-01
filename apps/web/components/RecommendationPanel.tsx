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
  const policyScorecard = getPolicyScorecard(recommendation.evidence);
  const operatorWorkflow = policyScorecard
    ? deriveOperatorWorkflow(policyScorecard)
    : null;

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
            className={`motion-icon-button motion-pressable command-pressable refresh-button${
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
        {getPrimitiveEvidenceEntries(recommendation.evidence).map(([key, value]) => (
          <div key={key}>
            <span>{formatEvidenceKey(key, locale)}</span>
            <strong>{formatEvidenceValue(key, value, locale)}</strong>
          </div>
        ))}
      </div>

      {policyScorecard ? (
        <div className="evidence-table policy-scorecard">
          <h3>{locale === "ko" ? "정책 스코어카드" : "Policy scorecard"}</h3>
          <div>
            <span>{locale === "ko" ? "선택 정책" : "Selected policy"}</span>
            <strong>{policyScorecard.selected_policy}</strong>
          </div>
          <div>
            <span>{locale === "ko" ? "신뢰도" : "Confidence"}</span>
            <strong>{policyScorecard.confidence}</strong>
          </div>
          {operatorWorkflow ? (
            <div>
              <span>{locale === "ko" ? "운영자 검토 상태" : "Operator review status"}</span>
              <strong>{formatOperatorWorkflowStatus(operatorWorkflow.status, locale)}</strong>
            </div>
          ) : null}
          {policyScorecard.required_inputs.length > 0 ? (
            <div>
              <span>{locale === "ko" ? "필요 입력" : "Required inputs"}</span>
              <strong>{policyScorecard.required_inputs.join(", ")}</strong>
            </div>
          ) : null}
          {formatMetricEntries(policyScorecard.objective_metrics).map((metric) => (
            <div key={metric}>
              <span>{locale === "ko" ? "목표 지표" : "Objective metric"}</span>
              <strong>{metric}</strong>
            </div>
          ))}
        </div>
      ) : null}

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

function formatEvidenceValue(
  key: string,
  value: string | number | boolean | null,
  locale: Locale
) {
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

type PolicyScorecard = {
  selected_policy: string;
  confidence: string;
  required_inputs: string[];
  blocked_reasons: string[];
  objective_metrics: Record<string, string | number | boolean>;
};

function getPolicyScorecard(
  evidence: Recommendation["evidence"]
): PolicyScorecard | null {
  const scorecard = evidence.policy_scorecard;
  if (!scorecard || typeof scorecard !== "object" || Array.isArray(scorecard)) {
    return null;
  }

  const selectedPolicy = scorecard.selected_policy;
  const confidence = scorecard.confidence;
  const requiredInputs = scorecard.required_inputs;
  const blockedReasons = scorecard.blocked_reasons;
  const objectiveMetrics = scorecard.objective_metrics;

  if (typeof selectedPolicy !== "string" || typeof confidence !== "string") {
    return null;
  }

  return {
    selected_policy: selectedPolicy,
    confidence,
    required_inputs: Array.isArray(requiredInputs)
      ? requiredInputs.filter((input): input is string => typeof input === "string")
      : [],
    blocked_reasons: Array.isArray(blockedReasons)
      ? blockedReasons.filter((reason): reason is string => typeof reason === "string")
      : [],
    objective_metrics:
      objectiveMetrics && typeof objectiveMetrics === "object" && !Array.isArray(objectiveMetrics)
        ? Object.fromEntries(
            Object.entries(objectiveMetrics).filter(
              (entry): entry is [string, string | number | boolean] =>
                isPrimitiveEvidenceValue(entry[1]) && entry[1] !== null
            )
          )
        : {}
  };
}

function isPrimitiveEvidenceValue(
  value: Recommendation["evidence"][string]
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function getPrimitiveEvidenceEntries(evidence: Recommendation["evidence"]) {
  const entries: [string, string | number | boolean | null][] = [];
  for (const [key, value] of Object.entries(evidence)) {
    if (isPrimitiveEvidenceValue(value)) {
      entries.push([key, value]);
    }
  }
  return entries;
}

function formatMetricEntries(metrics: PolicyScorecard["objective_metrics"]) {
  return Object.entries(metrics).map(([key, value]) => `${key} ${value}`);
}

type OperatorWorkflowStatus =
  | "approval_review_ready"
  | "manual_review_required";

function deriveOperatorWorkflow(scorecard: PolicyScorecard): {
  status: OperatorWorkflowStatus;
} {
  if (
    scorecard.confidence !== "high" ||
    scorecard.required_inputs.length > 0 ||
    scorecard.blocked_reasons.length > 0
  ) {
    return { status: "manual_review_required" };
  }

  return { status: "approval_review_ready" };
}

function formatOperatorWorkflowStatus(
  status: OperatorWorkflowStatus,
  locale: Locale
) {
  const labels: Record<OperatorWorkflowStatus, Record<Locale, string>> = {
    approval_review_ready: {
      ko: "승인 검토 준비",
      en: "Ready for approval review"
    },
    manual_review_required: {
      ko: "수동검토 필요",
      en: "Manual review required"
    }
  };

  return labels[status][locale];
}
