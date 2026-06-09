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

  async function handleRefreshRecommendation() {
    setRefreshState("running");
    const startedAt = Date.now();
    try {
      await onRefreshRecommendation();
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
            aria-label={t.refreshRecommendation}
            onClick={handleRefreshRecommendation}
            disabled={refreshState === "running"}
          >
            {refreshState === "running" ? "..." : "i"}
          </button>
          {refreshState === "running" ? (
            <small role="status">
              {locale === "ko" ? "추천 새로고침 중" : "Refreshing recommendation"}
            </small>
          ) : null}
        </div>
      </div>

      <div className="situation-block">
        <span>
          {t.currentSituation}
          <small>Current Situation</small>
        </span>
        <p>
          {locale === "ko"
            ? "긴급차량이 동쪽에서 접근 중입니다."
            : "Emergency vehicle approaching from East."}
        </p>
      </div>

      <div className="recommendation-card">
        <div>
          <span>{t.recommendedAction}</span>
          <strong>{t.recommendEast}</strong>
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
            <strong>{key === "direction" ? formatDirection(String(value), locale) : String(value)}</strong>
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
    reason: { ko: "긴급차량 도착 시간", en: "ETA" },
    direction: { ko: "접근 방향", en: "Approach" },
    estimated_arrival_seconds: { ko: "예상 도착", en: "Estimated arrival" }
  };

  return labels[key]?.[locale] ?? key;
}
