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
        <div className="brand-mark" aria-hidden="true">◆</div>
        <div className="brand-copy">
          <strong>{t.appName}</strong>
          <span>{t.appSubtitle}</span>
        </div>
        <div className="top-meta">
          <strong>{t.intersection}</strong>
          <span>{t.intersectionSub}</span>
        </div>
        <div className="top-meta">
          <strong>{t.scenario}</strong>
          <span>Scenario 08:42</span>
        </div>
        <div className="status-chip success">{t.analysisReady}</div>
        <div className="status-chip">{t.fresh}</div>
        <LanguageToggle locale={locale} onChange={setLocale} />
        <nav className="top-actions" aria-label="Dashboard actions">
          <button type="button">{t.alerts}</button>
          <button type="button">{t.reports}</button>
          <button type="button">{t.settings}</button>
        </nav>
      </header>

      <div className="dashboard-grid">
        <EventTimeline events={events} locale={locale} />
        <DigitalTwin
          status={status}
          events={events}
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
