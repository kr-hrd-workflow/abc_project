"use client";

import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import type {
  AnalysisFixture,
  AnalysisJob,
  CctvFlow,
  ChatResponse,
  FixtureIngestResult,
  IntersectionStatus,
  OpenAIExplanationEvaluationResult,
  Recommendation,
  Report,
  RuntimeReadiness,
  ScenarioId,
  ScenarioOption,
  CityId,
  CityProfile,
  SimulationComparison,
  TrafficEvent,
  UploadAnalysisResult
} from "../lib/types";
import type { SimulationFrameSnapshot } from "../lib/simulationSnapshot";
import type { SimulationFrameBufferEntry } from "../lib/simulationSnapshot";
import { buildOpenAIExplanationEvaluationReport } from "../lib/openAIExplanationEvaluationReport";
import {
  buildSyntheticBenchmarkReport,
  buildSyntheticEdgeCaseReport,
  buildSyntheticEvaluationReport,
  buildSyntheticFailureDemoReport
} from "../lib/syntheticEvaluationReport";
import type { Locale } from "../lib/i18n";
import { copy } from "../lib/i18n";
import { AnalysisIntakePanel } from "./AnalysisIntakePanel";
import { ChatReportPanel } from "./ChatReportPanel";
import { DigitalTwin } from "./DigitalTwin";
import { EventTimeline } from "./EventTimeline";
import { CctvFlowPanel } from "./CctvFlowPanel";
import { LanguageToggle } from "./LanguageToggle";
import { MetricsPanel } from "./MetricsPanel";
import { RecommendationPanel } from "./RecommendationPanel";

export type DashboardShellProps = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  recommendation: Recommendation;
  simulation: SimulationComparison;
  simulationFrame: SimulationFrameSnapshot | null;
  simulationFrameEntries?: SimulationFrameBufferEntry[];
  report: Report;
  chat: ChatResponse | null;
  fixtures: AnalysisFixture[];
  runtimeReadiness: RuntimeReadiness;
  latestFixtureIngest: FixtureIngestResult | null;
  latestAnalysisJob: AnalysisJob | null;
  cctvFlow?: CctvFlow | null;
  selectedScenarioId: ScenarioId;
  scenarioOptions: ScenarioOption[];
  scenarioLoading: boolean;
  selectedCityId: CityId;
  cityProfiles: CityProfile[];
  onCityChange: (cityId: CityId) => void;
  onAskQuestion: (question: string) => Promise<void>;
  onGenerateReport: () => Promise<void>;
  onRecheckOpenAIExplanationEvaluation: () => Promise<OpenAIExplanationEvaluationResult>;
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
  simulationFrame,
  simulationFrameEntries,
  report,
  chat,
  fixtures,
  runtimeReadiness,
  latestFixtureIngest,
  latestAnalysisJob,
  cctvFlow = null,
  selectedScenarioId,
  scenarioOptions,
  scenarioLoading,
  selectedCityId,
  cityProfiles,
  onAskQuestion,
  onGenerateReport,
  onRecheckOpenAIExplanationEvaluation,
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
  const syntheticEvaluationReport = useMemo(
    () => buildSyntheticEvaluationReport({ caseCount: 100, seed: 404 }),
    []
  );
  const syntheticFailureDemoReport = useMemo(
    () => buildSyntheticFailureDemoReport({ caseCount: 8, seed: 606 }),
    []
  );
  const syntheticBenchmarkReport = useMemo(
    () =>
      buildSyntheticBenchmarkReport({
        caseCountPerSeed: 1000,
        seeds: [101, 202, 303, 404, 505]
      }),
    []
  );
  const syntheticEdgeCaseReport = useMemo(() => buildSyntheticEdgeCaseReport(), []);
  const openAIExplanationEvaluationReport = useMemo(
    () => buildOpenAIExplanationEvaluationReport(),
    []
  );
  const t = copy[locale];
  const selectedScenario = scenarioOptions.find(
    (option) => option.id === selectedScenarioId
  );
  const selectedCity =
    cityProfiles.find((city) => city.id === selectedCityId) ?? cityProfiles[0];
  const cityIntersectionName =
    locale === "ko" ? selectedCity.intersectionNameKo : selectedCity.intersectionNameEn;
  const cityDistrict = locale === "ko" ? selectedCity.districtKo : selectedCity.districtEn;
  const cityMobilityProfile =
    locale === "ko" ? selectedCity.mobilityProfileKo : selectedCity.mobilityProfileEn;
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
      data-layout="spatial-command-hybrid"
      data-concept="b-plus-a"
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
          <section className="city-profile-card" aria-label={locale === "ko" ? "교차로 프로필" : "Intersection profile"}>
            <span>{locale === "ko" ? "선택된 교차로" : "Selected intersection"}</span>
            <strong>{cityIntersectionName}</strong>
            <small>
              {selectedCity.intersectionId} · {cityDistrict} · {selectedCity.timezone}
            </small>
            <em>{cityMobilityProfile}</em>
          </section>
          <div className="incident-token" aria-label={locale === "ko" ? "현재 상황 코드" : "Current incident"}>
            <span>INC-2025-0516-0007</span>
            <strong>{locale === "ko" ? "진행 중" : "Active"}</strong>
          </div>
          <div className="live-clock" aria-label={locale === "ko" ? "실시간 시각" : "Live clock"}>
            <span>{locale === "ko" ? "실시간" : "Live"}</span>
            <strong>{new Date(status.captured_at).toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-GB")}</strong>
          </div>
          <div className="status-strip" aria-label={locale === "ko" ? "대시보드 상태" : "Dashboard status"}>
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
          <nav className="top-actions" aria-label={locale === "ko" ? "대시보드 작업" : "Dashboard actions"}>
            <a href="#events" className="icon-action alert-action motion-pressable command-pressable">
              <span aria-hidden="true" className="toolbar-icon bell" />
              <span>{t.alerts}</span>
            </a>
            <a href="#reports" className="icon-action motion-pressable command-pressable">
              <span aria-hidden="true" className="toolbar-icon document" />
              <span>{t.reports}</span>
            </a>
            <a href="#scenario-control" className="icon-action motion-pressable command-pressable">
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
                className={`motion-pressable command-pressable${operationMode === "ai" ? " active" : ""}`}
                onClick={() => setOperationMode("ai")}
              >
                <strong>{t.aiAutomatic}</strong>
                <small>{locale === "ko" ? "자동 준비" : "Autonomy guard"}</small>
              </button>
              <button
                type="button"
                aria-label={t.adminManual}
                aria-pressed={operationMode === "manual"}
                className={`motion-pressable command-pressable${operationMode === "manual" ? " active" : ""}`}
                onClick={() => setOperationMode("manual")}
              >
                <strong>{t.adminManual}</strong>
                <small>{locale === "ko" ? "직접 검토" : "Human approval"}</small>
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
            <strong>{locale === "ko" ? "시뮬레이션 전용 / 실제 신호 제어 없음" : "Simulation only / No real signal control"}</strong>
            <span>{t.safetyCopy}</span>
          </div>
          <div className="operator-card" aria-label={t.operator}>
            <span aria-hidden="true" className="operator-avatar" />
            <div>
              <strong>{t.operator}</strong>
              <small>{locale === "ko" ? "교통운영센터" : "Operator A"}</small>
            </div>
            <span aria-hidden="true" className="chevron" />
          </div>
        </div>
      </header>

      <div className="dashboard-grid cockpit-grid">
        <aside className="cockpit-left motion-enter" data-mobile-priority="incidents" aria-label={locale === "ko" ? "운영 상세 레일" : "Operational detail rail"}>
          <div className="rail-kicker">{locale === "ko" ? "현장 증거" : "Live evidence rail"}</div>
          <EventTimeline events={events} locale={locale} />
        </aside>
        <section
          className="cockpit-center motion-enter"
          aria-label={locale === "ko" ? "공간 관제 화면" : "Spatial command surface"}
          data-mobile-priority="map"
        >
          <div className="spatial-command-kicker">{locale === "ko" ? "공간 관제" : "Spatial command"}</div>
          <DigitalTwin
            status={status}
            events={events}
            recommendation={recommendation}
            simulation={simulation}
            simulationFrame={simulationFrame}
            simulationFrameEntries={simulationFrameEntries}
            selectedScenarioId={selectedScenarioId}
            runtimeReadiness={runtimeReadiness}
            locale={locale}
            onRunSimulation={onRunSimulation}
          />
        </section>
        <aside
          className="cockpit-right motion-enter"
          aria-label={locale === "ko" ? "의사결정 레일" : "Command decision rail"}
          data-mobile-priority="response"
        >
          <div className="rail-kicker">{locale === "ko" ? "운영자 조치" : "Operator action stack"}</div>
          <div className="response-plan-heading">
            <span>{locale === "ko" ? "대응 계획" : "Response Plan"}</span>
            <small>{locale === "ko" ? "대응 절차" : "Response stack"}</small>
          </div>
          <div className="response-focus-card">
            <span>{locale === "ko" ? "의사결정 초점" : "Decision focus"}</span>
            <strong>{locale === "ko" ? "권고안 검토" : "Recommendation review"}</strong>
            <small>{locale === "ko" ? "실행 전 승인 필요" : "Approval required before execution"}</small>
          </div>
          <DecisionTraceCard
            status={status}
            events={events}
            recommendation={recommendation}
            simulation={simulation}
            locale={locale}
          />
          <RecommendationPanel
            recommendation={recommendation}
            locale={locale}
            onRefreshRecommendation={onRefreshRecommendation}
          />
          <MetricsPanel status={status} simulation={simulation} locale={locale} />
          <CctvFlowPanel flow={cctvFlow} locale={locale} />
          <ChatReportPanel
            chat={chat}
            report={report}
            syntheticEvaluationReport={syntheticEvaluationReport}
            syntheticFailureDemoReport={syntheticFailureDemoReport}
            syntheticBenchmarkReport={syntheticBenchmarkReport}
            syntheticEdgeCaseReport={syntheticEdgeCaseReport}
            openAIExplanationEvaluationReport={openAIExplanationEvaluationReport}
            locale={locale}
            onAskQuestion={onAskQuestion}
            onGenerateReport={onGenerateReport}
            onRecheckOpenAIExplanationEvaluation={onRecheckOpenAIExplanationEvaluation}
          />
        </aside>
      </div>

      <section
        id="scenario-control"
        className="scenario-control scenario-rail motion-enter"
        aria-label={locale === "ko" ? "시나리오 레일" : "Scenario Rail"}
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
                className={`motion-pressable command-pressable${selected ? " active" : ""}`}
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

      <LiveInputSourcesPanel runtimeReadiness={runtimeReadiness} locale={locale} />

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

function LiveInputSourcesPanel({
  runtimeReadiness,
  locale
}: {
  runtimeReadiness: RuntimeReadiness;
  locale: Locale;
}) {
  const sources = [
    {
      label: locale === "ko" ? "CCTV 분석" : "CCTV analysis",
      status: runtimeReadiness.vision.ready,
      mode: runtimeReadiness.vision.mode,
      detail:
        runtimeReadiness.vision.mode === "fixture"
          ? locale === "ko"
            ? "fixture 기반 프레임 분석"
            : "Fixture frame analysis"
          : locale === "ko"
            ? "실시간 영상 분석 준비"
            : "Live video analysis ready"
    },
    {
      label: locale === "ko" ? "신호/시뮬레이션" : "Signal/simulation",
      status: runtimeReadiness.simulation.ready,
      mode:
        runtimeReadiness.simulation.mode === "fixture"
          ? "SUMO fixture"
          : runtimeReadiness.simulation.mode,
      detail:
        locale === "ko"
          ? "신호 상태와 정책 평가 입력"
          : "Signal state and policy evaluation input"
    },
    {
      label: locale === "ko" ? "LLM 추천" : "LLM recommendation",
      status: runtimeReadiness.openai.ready,
      mode: runtimeReadiness.openai.mode,
      detail:
        runtimeReadiness.openai.ready
          ? locale === "ko"
            ? "추천 설명 생성 가능"
            : "Recommendation explanation ready"
          : locale === "ko"
            ? `${runtimeReadiness.openai.missing[0] ?? "API key"} 필요`
            : `${runtimeReadiness.openai.missing[0] ?? "API key"} required`
    },
    {
      label: locale === "ko" ? "기록 저장" : "Evidence store",
      status: runtimeReadiness.pgvector.ready,
      mode: runtimeReadiness.pgvector.mode,
      detail:
        locale === "ko"
          ? "이벤트/근거 검색 저장소"
          : "Event and evidence retrieval store"
    }
  ];

  return (
    <section className="live-input-sources-panel motion-enter" aria-label="Live input sources">
      <div className="live-input-sources-heading">
        <div>
          <span>Live Input Sources</span>
          <h2>{locale === "ko" ? "실시간 연동 전 준비 상태" : "Pre-live integration readiness"}</h2>
        </div>
        <strong>{locale === "ko" ? "Local readiness" : "Local readiness"}</strong>
      </div>
      <div className="live-input-source-grid">
        {sources.map((source) => (
          <div key={source.label} className={source.status ? "ready" : "blocked"}>
            <span>{source.label}</span>
            <strong>{source.mode}</strong>
            <small>{source.detail}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function DecisionTraceCard({
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
  const delayDelta =
    simulation.recommended.total_delay_seconds - simulation.baseline.total_delay_seconds;
  const rows = [
    {
      label: locale === "ko" ? "영상 감지" : "Vision detection",
      value: latestEvent ? formatTraceEventType(latestEvent.event_type, locale) : "No event",
      detail: latestEvent
        ? `${latestEvent.severity.toUpperCase()} · ${latestEvent.object_count}`
        : locale === "ko"
          ? "감지 이벤트 대기"
          : "Waiting for event"
    },
    {
      label: locale === "ko" ? "신호 상태" : "Signal state",
      value: status.signal_phase,
      detail:
        locale === "ko"
          ? `cycle ${status.cycle_second}초`
          : `cycle ${status.cycle_second}s`
    },
    {
      label: locale === "ko" ? "정책 비교" : "Policy comparison",
      value:
        locale === "ko"
          ? `${simulation.baseline.average_wait_seconds}초 → ${simulation.recommended.average_wait_seconds}초`
          : `${simulation.baseline.average_wait_seconds}s → ${simulation.recommended.average_wait_seconds}s`,
      detail:
        locale === "ko"
          ? `총 지연 ${formatTraceSignedNumber(delayDelta)}초`
          : `Total delay ${formatTraceSignedNumber(delayDelta)}s`
    },
    {
      label: locale === "ko" ? "LLM 설명" : "LLM explanation",
      value: formatTraceRecommendationAction(recommendation.action, locale),
      detail: locale === "ko" ? "운영자 승인 필요" : "Operator approval required"
    }
  ];

  return (
    <section className="decision-trace-card" aria-label="Decision trace">
      <div className="decision-trace-heading">
        <span>Decision Trace</span>
        <strong>{locale === "ko" ? "권고안 생성 근거" : "Recommendation rationale"}</strong>
      </div>
      <ol>
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <small>{row.detail}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatTraceSignedNumber(value: number) {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (value > 0) return `+${rounded}`;
  return rounded;
}

function formatTraceEventType(eventType: string, locale: Locale) {
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

function formatTraceRecommendationAction(action: string, locale: Locale) {
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
