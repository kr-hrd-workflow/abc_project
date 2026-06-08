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

  return (
    <section className="panel recommendation-panel">
      <div className="panel-heading">
        <div>
          <h2>{t.aiRecommendation}</h2>
          <p>{t.simulationOnly}</p>
        </div>
        <button type="button" onClick={onRefreshRecommendation}>
          {t.refreshRecommendation}
        </button>
      </div>

      <div className="situation-block">
        <span>{t.currentSituation}</span>
        <p>
          {locale === "ko"
            ? "긴급차량이 동쪽에서 접근 중입니다."
            : "Emergency vehicle approaching from East."}
        </p>
      </div>

      <div className="recommendation-card">
        <span>{t.recommendedAction}</span>
        <strong>{t.recommendEast}</strong>
        <small>{recommendation.action}</small>
      </div>

      <div className="evidence-table">
        <h3>{t.evidence}</h3>
        {Object.entries(recommendation.evidence).map(([key, value]) => (
          <div key={key}>
            <span>{key}</span>
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
