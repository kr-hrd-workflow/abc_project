"use client";

import { useState } from "react";

import type {
  ChatResponse,
  IntersectionStatus,
  Recommendation,
  Report,
  ScenarioId,
  ScenarioOption,
  SimulationComparison,
  TrafficEvent
} from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy } from "../lib/i18n";
import { ChatReportPanel } from "./ChatReportPanel";
import { DigitalTwin } from "./DigitalTwin";
import { EventTimeline } from "./EventTimeline";
import { LanguageToggle } from "./LanguageToggle";
import { MetricsPanel } from "./MetricsPanel";
import { RecommendationPanel } from "./RecommendationPanel";

export type DashboardShellProps = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  recommendation: Recommendation;
  simulation: SimulationComparison;
  report: Report;
  chat: ChatResponse | null;
  selectedScenarioId: ScenarioId;
  scenarioOptions: ScenarioOption[];
  scenarioLoading: boolean;
  onAskQuestion: (question: string) => Promise<void>;
  onGenerateReport: () => Promise<void>;
  onRefreshRecommendation: () => Promise<void>;
  onRunSimulation: () => Promise<void>;
  onScenarioChange: (scenarioId: ScenarioId) => void;
};

export function DashboardShell({
  status,
  events,
  recommendation,
  simulation,
  report,
  chat,
  selectedScenarioId,
  scenarioOptions,
  scenarioLoading,
  onAskQuestion,
  onGenerateReport,
  onRefreshRecommendation,
  onRunSimulation,
  onScenarioChange
}: DashboardShellProps) {
  const [locale, setLocale] = useState<Locale>("ko");
  const t = copy[locale];
  const selectedScenario = scenarioOptions.find(
    (option) => option.id === selectedScenarioId
  );
  const selectedScenarioLabel =
    locale === "ko" ? selectedScenario?.labelKo : selectedScenario?.labelEn;
  const selectedScenarioDescription =
    locale === "ko"
      ? selectedScenario?.descriptionKo
      : selectedScenario?.descriptionEn;
  const scenarioLoadingText =
    locale === "ko" ? "시나리오 새로고침 중" : "Refreshing scenario";

  return (
    <main className="dashboard-shell launch-dashboard" data-theme="launch-cinematic">
      <header className="dashboard-header">
        <div className="dashboard-identity-row">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="brand-copy">
              <h1>{t.appName}</h1>
              <span>{t.appSubtitle}</span>
            </div>
          </div>
          <div className="top-meta">
            <strong>{t.intersection}</strong>
            <span>{t.intersectionSub}</span>
          </div>
          <div className="status-strip" aria-label="Dashboard status">
            <div className="status-chip success">
              <span>
                <strong>{t.analysisReady}</strong>
                <small>{t.analysisReadySub}</small>
              </span>
            </div>
            <div className="status-chip freshness">
              <span>
                <strong>{t.fresh}</strong>
                <small>{t.freshSub}</small>
              </span>
            </div>
          </div>
          <LanguageToggle locale={locale} onChange={setLocale} />
        </div>

        <div className="dashboard-scenario-row">
          <section id="scenario-control" className="scenario-control" aria-label={t.scenario}>
            <div className="scenario-control-copy">
              <strong>{selectedScenarioLabel ? selectedScenarioLabel : t.scenario}</strong>
              <span>
                {scenarioLoading
                  ? scenarioLoadingText
                  : selectedScenarioDescription
                    ? selectedScenarioDescription
                    : t.scenario}
              </span>
            </div>
            <div
              className="segment-control"
              aria-label={locale === "ko" ? "시나리오 선택" : "Scenario selection"}
            >
              {scenarioOptions.map((option) => {
                const selected = option.id === selectedScenarioId;
                const label = locale === "ko" ? option.labelKo : option.labelEn;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={selected ? "active" : ""}
                    aria-pressed={selected}
                    disabled={scenarioLoading || selected}
                    onClick={() => onScenarioChange(option.id)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <nav className="top-actions" aria-label="Dashboard actions">
            <a href="#events" className="icon-action alert-action">
              <span aria-hidden="true" className="toolbar-icon bell" />
              <span>{t.alerts}</span>
            </a>
            <a href="#reports" className="icon-action">
              <span aria-hidden="true" className="toolbar-icon document" />
              <span>{t.reports}</span>
            </a>
            <a href="#scenario-control" className="icon-action">
              <span aria-hidden="true" className="toolbar-icon gear" />
              <span>{t.scenarios}</span>
            </a>
          </nav>

          <div className="operator-card" aria-label={t.operator}>
            <span aria-hidden="true" className="operator-avatar" />
            <div>
              <strong>{t.operator}</strong>
              <small>Operator A</small>
            </div>
            <span aria-hidden="true" className="chevron" />
          </div>
        </div>
      </header>

      <section
        className="dashboard-flow-strip"
        aria-label={t.operatorFlow}
      >
        <span>
          <i aria-hidden="true" />
          <strong>{t.sense}</strong>
          <small>{t.senseCopy}</small>
        </span>
        <span>
          <i aria-hidden="true" />
          <strong>{t.simulate}</strong>
          <small>{t.simulateCopy}</small>
        </span>
        <span>
          <i aria-hidden="true" />
          <strong>{t.brief}</strong>
          <small>{t.briefCopy}</small>
        </span>
        <em>{t.noRealControl}</em>
      </section>

      <div className="dashboard-grid">
        <EventTimeline events={events} locale={locale} />
        <DigitalTwin
          status={status}
          events={events}
          simulation={simulation}
          locale={locale}
          onRunSimulation={onRunSimulation}
        />
        <RecommendationPanel
          recommendation={recommendation}
          locale={locale}
          onRefreshRecommendation={onRefreshRecommendation}
        />
        <MetricsPanel status={status} simulation={simulation} locale={locale} />
        <ChatReportPanel
          chat={chat}
          report={report}
          locale={locale}
          onAskQuestion={onAskQuestion}
          onGenerateReport={onGenerateReport}
        />
      </div>
    </main>
  );
}
