"use client";

import { useState } from "react";

import type {
  ChatResponse,
  IntersectionStatus,
  Recommendation,
  Report,
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
  onAskQuestion: (question: string) => Promise<void>;
  onGenerateReport: () => Promise<void>;
  onRefreshRecommendation: () => Promise<void>;
  onRunSimulation: () => Promise<void>;
};

export function DashboardShell({
  status,
  events,
  recommendation,
  simulation,
  report,
  chat,
  onAskQuestion,
  onGenerateReport,
  onRefreshRecommendation,
  onRunSimulation
}: DashboardShellProps) {
  const [locale, setLocale] = useState<Locale>("ko");
  const t = copy[locale];

  return (
    <main className="dashboard-shell">
      <header className="top-bar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="brand-copy">
            <strong>{t.appName}</strong>
            <span>{t.appSubtitle}</span>
          </div>
        </div>
        <div className="top-meta">
          <strong>{t.intersection}</strong>
          <span>{t.intersectionSub}</span>
        </div>
        <div className="top-meta">
          <strong>{t.scenario}</strong>
          <span>Scenario 08:42</span>
        </div>
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
        <LanguageToggle locale={locale} onChange={setLocale} />
        <nav className="top-actions" aria-label="Dashboard actions">
          <button type="button" className="icon-action alert-action">
            <span aria-hidden="true" className="toolbar-icon bell" />
            <span>{t.alerts}</span>
          </button>
          <button type="button" className="icon-action">
            <span aria-hidden="true" className="toolbar-icon document" />
            <span>{t.reports}</span>
          </button>
          <button type="button" className="icon-action">
            <span aria-hidden="true" className="toolbar-icon gear" />
            <span>{t.settings}</span>
          </button>
        </nav>
        <div className="operator-card" aria-label={t.operator}>
          <span aria-hidden="true" className="operator-avatar" />
          <div>
            <strong>{t.operator}</strong>
            <small>Operator A</small>
          </div>
          <span aria-hidden="true" className="chevron" />
        </div>
      </header>

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
