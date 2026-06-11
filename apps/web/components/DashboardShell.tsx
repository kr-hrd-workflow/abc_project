"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import type {
  AnalysisFixture,
  AnalysisJob,
  ChatResponse,
  FixtureIngestResult,
  IntersectionStatus,
  Recommendation,
  Report,
  RuntimeReadiness,
  ScenarioId,
  ScenarioOption,
  SimulationComparison,
  TrafficEvent,
  UploadAnalysisResult
} from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy } from "../lib/i18n";
import { AnalysisIntakePanel } from "./AnalysisIntakePanel";
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
  fixtures: AnalysisFixture[];
  runtimeReadiness: RuntimeReadiness;
  latestFixtureIngest: FixtureIngestResult | null;
  latestAnalysisJob: AnalysisJob | null;
  selectedScenarioId: ScenarioId;
  scenarioOptions: ScenarioOption[];
  scenarioLoading: boolean;
  onAskQuestion: (question: string) => Promise<void>;
  onGenerateReport: () => Promise<void>;
  onIngestFixture: (fixtureId: string) => Promise<FixtureIngestResult>;
  onAnalyzeUpload: (file: File) => Promise<UploadAnalysisResult>;
  onRefreshAnalysisJob: (jobId: string) => Promise<AnalysisJob>;
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
  fixtures,
  runtimeReadiness,
  latestFixtureIngest,
  latestAnalysisJob,
  selectedScenarioId,
  scenarioOptions,
  scenarioLoading,
  onAskQuestion,
  onGenerateReport,
  onIngestFixture,
  onAnalyzeUpload,
  onRefreshAnalysisJob,
  onRefreshRecommendation,
  onRunSimulation,
  onScenarioChange
}: DashboardShellProps) {
  const shellRef = useRef<HTMLElement>(null);
  const [locale, setLocale] = useState<Locale>("ko");
  const [operationMode, setOperationMode] = useState<"ai" | "manual">("ai");
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
  const operationDetails =
    operationMode === "ai"
      ? [
          locale === "ko" ? "자동 준비 중" : "Preparing automatically",
          locale === "ko" ? "신뢰도 92%" : "Confidence 92%",
          locale === "ko"
            ? `다음 권고 ${recommendation.action}`
            : `Next recommendation ${recommendation.action}`
        ]
      : [
          locale === "ko" ? "승인 보류" : "Approval pending",
          locale === "ko" ? "관리자 검토 필요" : "Operator review required",
          locale === "ko" ? "감사 로그 준비" : "Audit log ready"
        ];

  useGSAP(
    () => {
      const root = shellRef.current;
      if (!root) return;
      const reduceMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return;
      }
      if (reduceMotion) return;

      gsap.fromTo(
        root.querySelectorAll(".motion-enter"),
        { y: 10, opacity: 0.001 },
        { y: 0, opacity: 1, duration: 0.28, stagger: 0.025, ease: "power3.out" }
      );
      gsap.to(root.querySelector(".simulation-viewport"), {
        backgroundPosition: "52% 48%",
        duration: 18,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true
      });
    }
  );

  return (
    <main
      ref={shellRef}
      className="dashboard-shell launch-dashboard"
      data-theme="launch-cinematic"
      data-layout="operations-cockpit"
    >
      <header className="dashboard-header dashboard-command-bar">
        <div className="dashboard-identity-row command-row motion-enter">
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
          <div className="top-meta district-selector">
            <strong>{t.intersection}</strong>
            <span>{t.intersectionSub}</span>
          </div>
          <div className="incident-token" aria-label="Current incident">
            <span>INC-2025-0516-0007</span>
            <strong>{locale === "ko" ? "Active" : "Active"}</strong>
          </div>
          <div className="live-clock" aria-label="Live clock">
            <span>Live</span>
            <strong>{new Date(status.captured_at).toLocaleTimeString("en-GB")}</strong>
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
          <nav className="top-actions" aria-label="Dashboard actions">
            <a href="#events" className="icon-action alert-action motion-pressable">
              <span aria-hidden="true" className="toolbar-icon bell" />
              <span>{t.alerts}</span>
            </a>
            <a href="#reports" className="icon-action motion-pressable">
              <span aria-hidden="true" className="toolbar-icon document" />
              <span>{t.reports}</span>
            </a>
            <a href="#scenario-control" className="icon-action motion-pressable">
              <span aria-hidden="true" className="toolbar-icon gear" />
              <span>{t.scenarios}</span>
            </a>
          </nav>
          <LanguageToggle locale={locale} onChange={setLocale} />
        </div>

        <div className="dashboard-scenario-row operation-row motion-enter">
          <section className="operation-mode-panel" aria-label={t.operationMode}>
            <div className="operation-copy">
              <strong>{t.operationMode}</strong>
              <span>
                {operationMode === "ai" ? t.aiModeCopy : t.manualModeCopy}
              </span>
            </div>
            <div
              className="operation-toggle motion-toggle"
              role="group"
              aria-label={t.operationMode}
              data-mode={operationMode}
            >
              <button
                type="button"
                aria-label={t.aiAutomatic}
                aria-pressed={operationMode === "ai"}
                className={`motion-pressable${operationMode === "ai" ? " active" : ""}`}
                onClick={() => setOperationMode("ai")}
              >
                <strong>{t.aiAutomatic}</strong>
                <small>{locale === "ko" ? "AI Automatic" : "Autonomy guard"}</small>
              </button>
              <button
                type="button"
                aria-label={t.adminManual}
                aria-pressed={operationMode === "manual"}
                className={`motion-pressable${operationMode === "manual" ? " active" : ""}`}
                onClick={() => setOperationMode("manual")}
              >
                <strong>{t.adminManual}</strong>
                <small>{locale === "ko" ? "Admin Manual" : "Human approval"}</small>
              </button>
            </div>
            <div
              className="operation-state-cards"
              aria-label={locale === "ko" ? "운영 모드 상태" : "Operation mode state"}
              data-mode={operationMode}
            >
              <div key={operationMode} className="operation-state-card-grid">
                {operationDetails.map((detail, index) => (
                  <span
                    key={detail}
                    className={`operation-state-card${index === 0 ? " primary" : ""}`}
                  >
                    {detail}
                  </span>
                ))}
              </div>
            </div>
          </section>
          <div className="safety-command-banner" role="status">
            <strong>Simulation only / No real signal control</strong>
            <span>{t.safetyCopy}</span>
          </div>
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

      <div className="dashboard-grid cockpit-grid">
        <aside className="cockpit-left motion-enter" data-mobile-priority="incidents">
          <EventTimeline events={events} locale={locale} />
        </aside>
        <section
          className="cockpit-center motion-enter"
          aria-label="Simulation Viewport"
          data-mobile-priority="map"
        >
          <DigitalTwin
            status={status}
            events={events}
            simulation={simulation}
            runtimeReadiness={runtimeReadiness}
            locale={locale}
            onRunSimulation={onRunSimulation}
          />
        </section>
        <aside
          className="cockpit-right motion-enter"
          aria-label="Response Plan"
          data-mobile-priority="response"
        >
          <div className="response-plan-heading">
            <span>Response Plan</span>
            <small>Response stack</small>
          </div>
          <div className="response-focus-card">
            <span>Decision focus</span>
            <strong>{locale === "ko" ? "권고안 검토" : "Recommendation review"}</strong>
            <small>{locale === "ko" ? "실행 전 승인 필요" : "Approval required before execution"}</small>
          </div>
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
        </aside>
      </div>

      <section
        id="scenario-control"
        className="scenario-control scenario-rail motion-enter"
        aria-label="Scenario Rail"
      >
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
          {scenarioOptions.map((option, index) => {
            const selected = option.id === selectedScenarioId;
            const label = locale === "ko" ? option.labelKo : option.labelEn;
            const description =
              locale === "ko" ? option.descriptionKo : option.descriptionEn;

            return (
              <button
                key={option.id}
                type="button"
                className={`motion-pressable${selected ? " active" : ""}`}
                aria-pressed={selected}
                disabled={scenarioLoading || selected}
                onClick={() => onScenarioChange(option.id)}
              >
                <small>{String(index + 1).padStart(2, "0")}</small>
                <strong>{label}</strong>
                <span>{description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <AnalysisIntakePanel
        fixtures={fixtures}
        latestFixtureIngest={latestFixtureIngest}
        latestAnalysisJob={latestAnalysisJob}
        locale={locale}
        onIngestFixture={onIngestFixture}
        onAnalyzeUpload={onAnalyzeUpload}
        onRefreshAnalysisJob={onRefreshAnalysisJob}
      />
    </main>
  );
}
