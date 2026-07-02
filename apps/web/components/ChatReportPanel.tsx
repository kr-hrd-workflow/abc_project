"use client";

import { useMemo, useState } from "react";

import type {
  ChatResponse,
  OpenAIExplanationEvaluationResult,
  Report
} from "../lib/types";
import {
  buildFixtureLiveInputEnvelope,
  buildFixtureReplayInput
} from "../lib/liveInputFixtureAdapter";
import type { OpenAIExplanationEvaluationReport } from "../lib/openAIExplanationEvaluationReport";
import { generateSyntheticScenarioDataset } from "../lib/syntheticScenarios";
import {
  buildDemoEvidenceExport
} from "../lib/demoEvidenceExport";
import type { DemoEvidenceExport } from "../lib/demoEvidenceExport";
import { buildSyntheticBenchmarkReport } from "../lib/syntheticEvaluationReport";
import type {
  SyntheticBenchmarkReport,
  SyntheticEdgeCaseReport,
  SyntheticEvaluationDashboardReport
} from "../lib/syntheticEvaluationReport";
import {
  buildSyntheticLiveInputGuardrailReport,
  buildSyntheticLiveInputEvaluationReport,
  LIVE_INPUT_JSON_EXPORT_SUITES
} from "../lib/syntheticLiveInputDataset";
import type {
  SyntheticLiveInputEvaluationReport,
  SyntheticLiveInputGuardrailReport,
  SyntheticLiveInputExportSuiteId
} from "../lib/syntheticLiveInputDataset";
import {
  buildSourceSpecificLiveInputExport
} from "../lib/sourceLiveInputAdapter";
import type { SourceSpecificLiveInputExport } from "../lib/sourceLiveInputAdapter";
import type { Locale } from "../lib/i18n";
import { copy } from "../lib/i18n";

type ChatReportPanelProps = {
  chat: ChatResponse | null;
  report: Report;
  syntheticEvaluationReport: SyntheticEvaluationDashboardReport;
  syntheticFailureDemoReport: SyntheticEvaluationDashboardReport;
  syntheticBenchmarkReport: SyntheticBenchmarkReport;
  syntheticEdgeCaseReport: SyntheticEdgeCaseReport;
  openAIExplanationEvaluationReport: OpenAIExplanationEvaluationReport;
  locale: Locale;
  onAskQuestion: (question: string) => Promise<void>;
  onGenerateReport: () => Promise<void>;
  onRecheckOpenAIExplanationEvaluation: () => Promise<OpenAIExplanationEvaluationResult>;
};

type SyntheticBenchmarkSuiteId = "5k" | "10k" | "50k";

const SYNTHETIC_BENCHMARK_SEEDS = [101, 202, 303, 404, 505];
const SYNTHETIC_BENCHMARK_SUITES: {
  id: SyntheticBenchmarkSuiteId;
  label: string;
  caseCountPerSeed: number;
}[] = [
  { id: "5k", label: "5K", caseCountPerSeed: 1000 },
  { id: "10k", label: "10K", caseCountPerSeed: 2000 },
  { id: "50k", label: "50K", caseCountPerSeed: 10000 }
];

export function ChatReportPanel({
  chat,
  report,
  syntheticEvaluationReport,
  syntheticFailureDemoReport,
  syntheticBenchmarkReport,
  syntheticEdgeCaseReport,
  openAIExplanationEvaluationReport,
  locale,
  onAskQuestion,
  onGenerateReport,
  onRecheckOpenAIExplanationEvaluation
}: ChatReportPanelProps) {
  const t = copy[locale];
  const [question, setQuestion] = useState("");
  const [lastSubmittedQuestion, setLastSubmittedQuestion] = useState<string | null>(null);
  const [chatState, setChatState] = useState<"idle" | "submitting">("idle");
  const [chatError, setChatError] = useState(false);
  const [reportState, setReportState] = useState<"idle" | "generating">("idle");
  const [reportError, setReportError] = useState(false);
  const [evaluationMode, setEvaluationMode] = useState<"pass" | "failure">("pass");
  const [openAIExplanationReport, setOpenAIExplanationReport] = useState(
    openAIExplanationEvaluationReport
  );
  const [openAIRecheckState, setOpenAIRecheckState] =
    useState<"idle" | "checking">("idle");
  const [openAIRecheckError, setOpenAIRecheckError] = useState(false);
  const localizedReport = useMemo(
    () => buildLocalizedReport(report, locale),
    [report, locale]
  );
  const activeSyntheticReport =
    evaluationMode === "pass" ? syntheticEvaluationReport : syntheticFailureDemoReport;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    setChatState("submitting");
    setChatError(false);
    try {
      await onAskQuestion(trimmed);
      setLastSubmittedQuestion(trimmed);
      setQuestion("");
    } catch {
      setChatError(true);
    } finally {
      setChatState("idle");
    }
  }

  async function handleGenerateReport() {
    setReportState("generating");
    setReportError(false);
    try {
      await onGenerateReport();
    } catch {
      setReportError(true);
    } finally {
      setReportState("idle");
    }
  }

  async function handleOpenAIRecheck() {
    setOpenAIRecheckState("checking");
    setOpenAIRecheckError(false);
    try {
      const result = await onRecheckOpenAIExplanationEvaluation();
      setOpenAIExplanationReport(toOpenAIExplanationDashboardReport(result));
    } catch {
      setOpenAIRecheckError(true);
    } finally {
      setOpenAIRecheckState("idle");
    }
  }

  function handleDownloadReport() {
    const reportJson = JSON.stringify(localizedReport, null, 2);
    const blob = new Blob([reportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smart-intersection-report-${locale}-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="chat-report-grid">
      <div className="panel chat-panel">
        <div className="panel-heading">
          <div className="heading-copy">
            <h2>{t.aiAgent}</h2>
            <span>{locale === "ko" ? "교통 상황 질의응답" : "AI Agent"}</span>
          </div>
          <span className="online">{locale === "ko" ? "온라인" : "Online"}</span>
        </div>
        <div className="chat-thread">
          <div className="chat-prompt-label">
            <strong>{t.askPrompt}</strong>
            <span>{locale === "ko" ? "현재 교차로 상태를 자유롭게 질문" : "Ask about current traffic situation"}</span>
          </div>
          <div className="message-bubble user-message">
            <span className="message-label">
              {lastSubmittedQuestion
                ? locale === "ko"
                  ? "내 질문"
                  : "My question"
                : locale === "ko"
                  ? "예시 질문"
                  : "Starter prompt"}
            </span>
            <p>
              {lastSubmittedQuestion ??
                (locale === "ko"
                ? "현재 교차로 상황과 권고 조치의 효과는 어떤가요?"
                : "What is the current intersection status and recommendation effect?")}
            </p>
            <time>08:42</time>
          </div>
          <div className="message-row">
            <span className="agent-avatar" aria-hidden="true" />
            <div className="message-bubble assistant-message">
              {chat ? (
                <>
                  <div className="agent-answer">
                    <strong>{t.latestAnswer}</strong>
                    <p>{chat.answer}</p>
                  </div>
                  {chat.sections && locale === "en" ? (
                    <div className="agent-sections">
                      <section>
                        <h3>{t.agentCurrentSituation}</h3>
                        <p>{chat.sections.current_situation}</p>
                      </section>
                      <section>
                        <h3>{t.agentRecommendedAction}</h3>
                        <p>{chat.sections.recommended_action}</p>
                      </section>
                      <section>
                        <h3>{t.agentRecommendationRationale}</h3>
                        <ul>
                          {chat.sections.recommendation_rationale.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </section>
                      <section>
                        <h3>{t.agentAuthorityLimit}</h3>
                        <p>{chat.sections.authority_limit}</p>
                      </section>
                      <section>
                        <h3>{t.agentSimulationResult}</h3>
                        <p>{chat.sections.simulation_result}</p>
                      </section>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="chat-empty">{t.chatEmpty}</p>
              )}
              <time>08:42</time>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="chat-form">
          <label className="sr-only" htmlFor="dashboard-chat-question">
            {t.askPrompt}
          </label>
          <input
            id="dashboard-chat-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t.askPlaceholder}
            disabled={chatState === "submitting"}
            aria-describedby={chatError ? "dashboard-chat-error" : undefined}
          />
          <button
            type="submit"
            className="motion-pressable command-pressable"
            disabled={!question.trim() || chatState === "submitting"}
          >
            <span>{chatState === "submitting" ? t.sending : t.send}</span>
            <span aria-hidden="true" className="send-icon" />
          </button>
          {chatError ? (
            <p id="dashboard-chat-error" className="action-error" role="alert">
              {t.chatError}
            </p>
          ) : null}
        </form>
      </div>

      <div id="reports" className="panel report-panel">
        <div className="panel-heading">
          <div className="heading-copy">
            <h2>{t.reports}</h2>
            <span>{t.reports}</span>
          </div>
        </div>
        <button
          type="button"
          className="report-button motion-pressable command-pressable"
          onClick={handleGenerateReport}
          disabled={reportState === "generating"}
        >
          <span aria-hidden="true" className="report-icon" />
          <span>{reportState === "generating" ? t.reportGenerating : t.generateReport}</span>
          <small>{reportState === "generating" ? t.reportGenerating : t.generateReport}</small>
        </button>
        {reportError ? (
          <p className="action-error" role="alert">
            {t.reportError}
          </p>
        ) : null}
        <div className="report-card">
          <span>{t.latestReport}</span>
          <strong>{localizedReport.summary}</strong>
          <dl>
            <div>
              <dt>{t.generatedTime}</dt>
              <dd>{new Date(report.generated_at).toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US")}</dd>
            </div>
          </dl>
        </div>
        <SyntheticEvaluationEvidence
          report={activeSyntheticReport}
          benchmark={syntheticBenchmarkReport}
          edgeCaseReport={syntheticEdgeCaseReport}
          openAIExplanationReport={openAIExplanationReport}
          mode={evaluationMode}
          locale={locale}
          onModeChange={setEvaluationMode}
          openAIRecheckState={openAIRecheckState}
          openAIRecheckError={openAIRecheckError}
          onOpenAIRecheck={handleOpenAIRecheck}
        />
        <button
          type="button"
          className="download-row motion-pressable command-pressable"
          onClick={handleDownloadReport}
        >
          <span aria-hidden="true" className="download-icon" />
          <span>{t.download}</span>
          <span aria-hidden="true" className="chevron" />
        </button>
      </div>
    </section>
  );
}

function buildLocalizedReport(report: Report, locale: Locale): Report & { language: Locale } {
  return {
    ...report,
    language: locale,
    summary: localizeReportSummary(report.summary, locale)
  };
}

function localizeReportSummary(summary: string, locale: Locale): string {
  if (locale === "en") return summary;

  if (summary === "Scenario 08:42 report") {
    return "시나리오 08:42 리포트";
  }

  if (
    summary ===
    "Runtime report route unavailable; showing simulation-only dashboard fallback."
  ) {
    return "리포트 API를 사용할 수 없어 시뮬레이션 전용 대시보드 fallback을 표시합니다.";
  }

  const trafficSummary = summary.match(
    /^10-minute traffic summary for ([^:]+): ([a-z]+) has the longest queue with (\d+) vehicles\. Congestion level is ([^.]+)\. (Emergency vehicle approach detected\.|No emergency vehicle approach detected\.) (Pedestrian waiting request is active\.|No pedestrian waiting request is active\.)$/
  );

  if (!trafficSummary) return summary;

  const [, intersectionId, direction, queueCount, congestion, emergency, pedestrian] =
    trafficSummary;

  return [
    `${intersectionId} 10분 교통 요약: ${formatDirectionKo(direction)} 방향 대기열이 ${queueCount}대로 가장 깁니다.`,
    `혼잡도는 ${formatCongestionKo(congestion)}입니다.`,
    emergency === "Emergency vehicle approach detected."
      ? "긴급차량 접근이 감지되었습니다."
      : "긴급차량 접근은 감지되지 않았습니다.",
    pedestrian === "Pedestrian waiting request is active."
      ? "보행자 대기 요청이 활성화되어 있습니다."
      : "보행자 대기 요청은 없습니다."
  ].join(" ");
}

function formatDirectionKo(direction: string): string {
  const labels: Record<string, string> = {
    north: "북쪽",
    south: "남쪽",
    east: "동쪽",
    west: "서쪽"
  };

  return labels[direction] ?? direction;
}

function formatCongestionKo(congestion: string): string {
  const labels: Record<string, string> = {
    low: "낮음",
    medium: "보통",
    high: "높음"
  };

  return labels[congestion] ?? congestion;
}

function SyntheticEvaluationEvidence({
  report,
  benchmark,
  edgeCaseReport,
  openAIExplanationReport,
  mode,
  locale,
  onModeChange,
  openAIRecheckState,
  openAIRecheckError,
  onOpenAIRecheck
}: {
  report: SyntheticEvaluationDashboardReport;
  benchmark: SyntheticBenchmarkReport;
  edgeCaseReport: SyntheticEdgeCaseReport;
  openAIExplanationReport: OpenAIExplanationEvaluationReport;
  mode: "pass" | "failure";
  locale: Locale;
  onModeChange: (mode: "pass" | "failure") => void;
  openAIRecheckState: "idle" | "checking";
  openAIRecheckError: boolean;
  onOpenAIRecheck: () => Promise<void>;
}) {
  const firstFailure = report.failures[0] ?? null;
  const [benchmarkSuiteId, setBenchmarkSuiteId] =
    useState<SyntheticBenchmarkSuiteId>("5k");
  const [liveInputJsonSuiteId, setLiveInputJsonSuiteId] =
    useState<SyntheticLiveInputExportSuiteId>("100");
  const benchmarkSuite =
    SYNTHETIC_BENCHMARK_SUITES.find((suite) => suite.id === benchmarkSuiteId) ??
    SYNTHETIC_BENCHMARK_SUITES[0];
  const liveInputJsonSuite =
    LIVE_INPUT_JSON_EXPORT_SUITES.find((suite) => suite.id === liveInputJsonSuiteId) ??
    LIVE_INPUT_JSON_EXPORT_SUITES[0];
  const activeBenchmark = useMemo(
    () =>
      benchmarkSuite.id === "5k"
        ? benchmark
        : buildSyntheticBenchmarkReport({
            caseCountPerSeed: benchmarkSuite.caseCountPerSeed,
            seeds: SYNTHETIC_BENCHMARK_SEEDS
          }),
    [benchmark, benchmarkSuite]
  );
  const liveInputJsonReport = useMemo(
    () =>
      buildSyntheticLiveInputEvaluationReport({
        caseCount: liveInputJsonSuite.caseCount,
        seed: liveInputJsonSuite.seed
      }),
    [liveInputJsonSuite]
  );
  const liveInputJsonGuardrailReport = useMemo(
    () => buildSyntheticLiveInputGuardrailReport(),
    []
  );
  const sourceSpecificAdapterProof = useMemo(
    () => buildSourceSpecificLiveInputExport(),
    []
  );
  const demoEvidence = useMemo(() => buildDemoEvidenceExport(), []);
  const liveInputContractProof = useMemo(() => {
    const scenarioCase = generateSyntheticScenarioDataset({
      caseCount: 4,
      seed: 404
    }).find((candidate) => candidate.family === "emergency");

    if (!scenarioCase) return null;

    const envelope = buildFixtureLiveInputEnvelope(scenarioCase);
    const replayInput = buildFixtureReplayInput(scenarioCase);
    const highlightedDetection =
      replayInput.detections.find(
        (detection) => detection.type === "emergency_vehicle"
      ) ?? replayInput.detections[0];

    return {
      schemaVersion: envelope.schemaVersion,
      cameraFrameCount: envelope.cameraFrames.length,
      detectionType: highlightedDetection?.type ?? "none",
      normalizedStatus: "contract normalized",
      replayStatus: "replay input ready"
    };
  }, []);

  return (
    <section className="synthetic-evaluation-card" aria-label="Synthetic evaluation evidence">
      <div className="synthetic-evaluation-heading">
        <div>
          <span>Synthetic Evaluation</span>
          <strong>{locale === "ko" ? "대량 정책 검증" : "Policy test evidence"}</strong>
        </div>
        <em>{report.passRatePercent}% pass</em>
      </div>
      <div className="synthetic-evaluation-mode" role="group" aria-label="Synthetic evaluation mode">
        <button
          type="button"
          aria-label="Pass suite"
          aria-pressed={mode === "pass"}
          className={mode === "pass" ? "active" : ""}
          onClick={() => onModeChange("pass")}
        >
          Pass suite
        </button>
        <button
          type="button"
          aria-label="Failure drilldown"
          aria-pressed={mode === "failure"}
          className={mode === "failure" ? "active" : ""}
          onClick={() => onModeChange("failure")}
        >
          Failure drilldown
        </button>
      </div>
      <dl className="synthetic-evaluation-stats">
        <div>
          <dt>{locale === "ko" ? "케이스" : "Cases"}</dt>
          <dd>{report.caseCount} cases</dd>
        </div>
        <div>
          <dt>{locale === "ko" ? "통과" : "Passed"}</dt>
          <dd>{report.passedCases} passed</dd>
        </div>
        <div>
          <dt>{locale === "ko" ? "실패" : "Failed"}</dt>
          <dd>{report.failedCases} failed</dd>
        </div>
      </dl>
      <div className="synthetic-evaluation-breakdown" aria-label="Scenario evaluation breakdown">
        {report.scenarioBreakdown.map((scenario) => (
          <div key={scenario.family}>
            <span>{scenario.family}</span>
            <strong>
              {scenario.passed}/{scenario.total}
            </strong>
          </div>
        ))}
      </div>
      <p>{report.riskNotes[0]}</p>
      <div className="synthetic-policy-evidence" aria-label="Policy evidence summary">
        <span>Policy Evidence</span>
        <ul>
          {report.policyEvidence.map((item) => (
            <li key={item.policy}>
              <strong>{item.policy}</strong>
              <small>
                {item.evidence} · {item.passed}/{item.total}
              </small>
            </li>
          ))}
        </ul>
      </div>
      <DemoEvidenceSummaryCard evidence={demoEvidence} />
      <div className="synthetic-benchmark-card">
        <span>Benchmark Report</span>
        <div className="synthetic-benchmark-suite" role="group" aria-label="Benchmark suite size">
          {SYNTHETIC_BENCHMARK_SUITES.map((suite) => (
            <button
              key={suite.id}
              type="button"
              aria-label={`${suite.label} benchmark suite`}
              aria-pressed={suite.id === benchmarkSuite.id}
              className={suite.id === benchmarkSuite.id ? "active" : ""}
              onClick={() => setBenchmarkSuiteId(suite.id)}
            >
              {suite.label}
            </button>
          ))}
        </div>
        <dl>
          <div>
            <dt>{locale === "ko" ? "시드" : "Seeds"}</dt>
            <dd>{activeBenchmark.seedCount} seeds</dd>
          </div>
          <div>
            <dt>{locale === "ko" ? "총 케이스" : "Cases"}</dt>
            <dd>{formatCount(activeBenchmark.totalCases)} cases</dd>
          </div>
          <div>
            <dt>{locale === "ko" ? "통과율" : "Pass rate"}</dt>
            <dd>{activeBenchmark.passRatePercent}% benchmark pass</dd>
          </div>
        </dl>
      </div>
      <div className="synthetic-edge-case-card">
        <span>Edge-case Suite</span>
        <dl>
          <div>
            <dt>{locale === "ko" ? "경계 케이스" : "Edge cases"}</dt>
            <dd>{edgeCaseReport.totalCases} edge cases</dd>
          </div>
          <div>
            <dt>{locale === "ko" ? "보호됨" : "Guarded"}</dt>
            <dd>{edgeCaseReport.passedCases} guarded</dd>
          </div>
          <div>
            <dt>{locale === "ko" ? "누락" : "Misses"}</dt>
            <dd>{edgeCaseReport.failedCases} misses</dd>
          </div>
        </dl>
        <ul>
          {edgeCaseReport.cases.map((edgeCase) => (
            <li key={edgeCase.id}>
              <strong>{edgeCase.label}</strong>
              <small>{edgeCase.expectedGuardrail}</small>
            </li>
          ))}
        </ul>
      </div>
      <LiveInputJsonBenchmarkCard
        locale={locale}
        report={liveInputJsonReport}
        suiteId={liveInputJsonSuite.id}
        onSuiteChange={setLiveInputJsonSuiteId}
      />
      <LiveInputJsonGuardrailCard
        locale={locale}
        report={liveInputJsonGuardrailReport}
      />
      <SourceSpecificAdapterCard
        locale={locale}
        proof={sourceSpecificAdapterProof}
      />
      {liveInputContractProof ? (
        <div className="live-input-contract-card">
          <span>Live Input Contract</span>
          <dl>
            <div>
              <dt>{locale === "ko" ? "스키마" : "Schema"}</dt>
              <dd>{liveInputContractProof.schemaVersion}</dd>
            </div>
            <div>
              <dt>{locale === "ko" ? "프레임" : "Frames"}</dt>
              <dd>{liveInputContractProof.cameraFrameCount} camera frame</dd>
            </div>
            <div>
              <dt>{locale === "ko" ? "객체" : "Detection"}</dt>
              <dd>{liveInputContractProof.detectionType}</dd>
            </div>
          </dl>
          <ul>
            <li>
              <strong>{liveInputContractProof.normalizedStatus}</strong>
              <small>live-input.v1</small>
            </li>
            <li>
              <strong>{liveInputContractProof.replayStatus}</strong>
              <small>synthetic replay</small>
            </li>
          </ul>
        </div>
      ) : null}
      <div className="openai-explanation-evaluation-card">
        <div className="openai-explanation-evaluation-heading">
          <span>OpenAI Explanation Evaluation</span>
          <button
            type="button"
            className="motion-pressable command-pressable"
            onClick={() => void onOpenAIRecheck()}
            disabled={openAIRecheckState === "checking"}
          >
            {openAIRecheckState === "checking" ? "Checking" : "Live recheck"}
          </button>
        </div>
        {openAIRecheckError ? (
          <p className="action-error" role="alert">
            Live recheck failed
          </p>
        ) : null}
        <dl>
          <div>
            <dt>{locale === "ko" ? "모델" : "Model"}</dt>
            <dd>{openAIExplanationReport.model}</dd>
          </div>
          <div>
            <dt>{locale === "ko" ? "기준" : "Criteria"}</dt>
            <dd>
              {openAIExplanationReport.passedCriteria}/{openAIExplanationReport.totalCriteria} criteria passed
            </dd>
          </div>
          <div>
            <dt>{locale === "ko" ? "응답" : "Response"}</dt>
            <dd>
              {openAIExplanationReport.responseTextPresent
                ? "response text present"
                : "response text missing"}
            </dd>
          </div>
        </dl>
        <ul>
          {openAIExplanationReport.criteria.map((criterion) => (
            <li key={criterion.name}>
              <strong>{criterion.label}</strong>
              <small>{criterion.passed ? "passed" : "failed"}</small>
            </li>
          ))}
        </ul>
      </div>
      {firstFailure ? (
        <div className="synthetic-failure-drilldown">
          <span>{locale === "ko" ? "실패 케이스" : "Failed case"}</span>
          <strong>{firstFailure.caseId}</strong>
          <small>{firstFailure.family}</small>
          <dl>
            <div>
              <dt>expected</dt>
              <dd>expected {firstFailure.expected}</dd>
            </div>
            <div>
              <dt>actual</dt>
              <dd>actual {firstFailure.actual}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}

function LiveInputJsonBenchmarkCard({
  locale,
  report,
  suiteId,
  onSuiteChange
}: {
  locale: Locale;
  report: SyntheticLiveInputEvaluationReport;
  suiteId: SyntheticLiveInputExportSuiteId;
  onSuiteChange: (suiteId: SyntheticLiveInputExportSuiteId) => void;
}) {
  return (
    <section
      className="live-input-json-benchmark-card"
      aria-label="Live-input JSON benchmark evidence"
    >
      <span>Live-input JSON Benchmark</span>
      <div
        className="live-input-json-suite"
        role="group"
        aria-label="Live-input JSON suite size"
      >
        {LIVE_INPUT_JSON_EXPORT_SUITES.map((suite) => (
          <button
            key={suite.id}
            type="button"
            aria-label={`${suite.label} live-input JSON suite`}
            aria-pressed={suite.id === suiteId}
            className={suite.id === suiteId ? "active" : ""}
            onClick={() => onSuiteChange(suite.id)}
          >
            {suite.label}
          </button>
        ))}
      </div>
      <dl>
        <div>
          <dt>{locale === "ko" ? "스키마" : "Schema"}</dt>
          <dd>{report.schemaVersion}</dd>
        </div>
        <div>
          <dt>{locale === "ko" ? "입력" : "Payloads"}</dt>
          <dd>{formatCount(report.totalCases)} JSON payloads</dd>
        </div>
        <div>
          <dt>{locale === "ko" ? "통과" : "Passed"}</dt>
          <dd>{formatCount(report.passedCases)} passed</dd>
        </div>
        <div>
          <dt>{locale === "ko" ? "실패" : "Failed"}</dt>
          <dd>{formatCount(report.failedCases)} failed</dd>
        </div>
      </dl>
    </section>
  );
}

function DemoEvidenceSummaryCard({
  evidence
}: {
  evidence: DemoEvidenceExport;
}) {
  const latestLiveInputSuite =
    evidence.liveInputJsonSuites[evidence.liveInputJsonSuites.length - 1];

  return (
    <section className="demo-evidence-card" aria-label="Demo evidence summary">
      <div className="demo-evidence-heading">
        <span>Demo Evidence</span>
        <div className="demo-evidence-links">
          <a href="/api/demo-evidence-export" download>
            Evidence JSON
          </a>
          <a href="/api/final-local-readiness">
            Final Readiness
          </a>
          <a href="/api/real-sample-intake-package">
            Intake Package
          </a>
          <a href="/api/live-input-submission-schema">
            Submission Schema
          </a>
          <a href="/api/real-sample-source-schema">
            Source Schemas
          </a>
          <a href="/api/llm-explanation-contract">
            LLM Contract
          </a>
          <a href={evidence.realSampleReadiness.dropInEndpoint}>
            Drop-in Checklist
          </a>
        </div>
      </div>
      <dl>
        <div>
          <dt>Health</dt>
          <dd>Health 16/16</dd>
        </div>
        <div>
          <dt>Benchmark</dt>
          <dd>
            {formatCount(evidence.syntheticBenchmark.passedCases)}/
            {formatCount(evidence.syntheticBenchmark.totalCases)} benchmark
          </dd>
        </div>
        <div>
          <dt>Live JSON</dt>
          <dd>
            {latestLiveInputSuite
              ? `${formatCount(latestLiveInputSuite.passedCases)}/${formatCount(
                  latestLiveInputSuite.totalCases
                )} live-input JSON`
              : "0/0 live-input JSON"}
          </dd>
        </div>
        <div>
          <dt>Guardrails</dt>
          <dd>
            {evidence.liveInputGuardrails.guardedCases} guarded /{" "}
            {evidence.liveInputGuardrails.missedCases} misses
          </dd>
        </div>
        <div>
          <dt>Scorecards</dt>
          <dd>
            {evidence.operatorWorkflow.scorecardBackedPolicies.length} scorecard
            policies
          </dd>
        </div>
        <div>
          <dt>Real sample</dt>
          <dd>
            {evidence.realSampleReadiness.status ===
            "signal_ready_waiting_for_fresh_camera_and_calibration"
              ? "signal ready, camera pending"
              : evidence.realSampleReadiness.status}
          </dd>
        </div>
        <div>
          <dt>Boundary</dt>
          <dd>{evidence.realSampleReadiness.adapterBoundary} boundary ready</dd>
        </div>
      </dl>
      <p>source adapter replay ready</p>
    </section>
  );
}

function LiveInputJsonGuardrailCard({
  locale,
  report
}: {
  locale: Locale;
  report: SyntheticLiveInputGuardrailReport;
}) {
  return (
    <section
      className="live-input-json-guardrail-card"
      aria-label="Live-input JSON guardrail evidence"
    >
      <span>Live-input JSON Guardrails</span>
      <dl>
        <div>
          <dt>{locale === "ko" ? "가드됨" : "Guarded"}</dt>
          <dd>{report.guardedCases} guarded</dd>
        </div>
        <div>
          <dt>{locale === "ko" ? "누락" : "Misses"}</dt>
          <dd>{report.missedCases} misses</dd>
        </div>
      </dl>
      <ul>
        {report.cases.map((guardrailCase) => (
          <li key={guardrailCase.id}>
            <strong>{guardrailCase.label}</strong>
            <small>{guardrailCase.actualGuardrail}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourceSpecificAdapterCard({
  locale,
  proof
}: {
  locale: Locale;
  proof: SourceSpecificLiveInputExport;
}) {
  return (
    <section
      className="source-specific-adapter-card"
      aria-label="Source-specific adapter evidence"
    >
      <span>Source Adapter Fixture</span>
      <dl>
        <div>
          <dt>{locale === "ko" ? "Detector" : "Detector"}</dt>
          <dd>{proof.sourceFormats.detector}</dd>
        </div>
        <div>
          <dt>{locale === "ko" ? "Signal" : "Signal"}</dt>
          <dd>{proof.sourceFormats.signal}</dd>
        </div>
        <div>
          <dt>{locale === "ko" ? "스키마" : "Schema"}</dt>
          <dd>{proof.envelope.schemaVersion}</dd>
        </div>
      </dl>
      <ul>
        <li>
          <strong>replay input ready</strong>
          <small>{proof.replaySummary.cameraId}</small>
        </li>
        {proof.replaySummary.detectionTypes.map((detectionType) => (
          <li key={detectionType}>
            <strong>{detectionType}</strong>
            <small>{proof.replaySummary.currentPhase}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

function toOpenAIExplanationDashboardReport(
  result: OpenAIExplanationEvaluationResult
): OpenAIExplanationEvaluationReport {
  return {
    model: result.model,
    passed: result.passed,
    passedCriteria: result.passed_criteria,
    totalCriteria: result.total_criteria,
    responseTextPresent: result.response_text_present,
    criteria: result.criteria.map((criterion) => ({
      name: criterion.name,
      label: criterion.label,
      passed: criterion.passed
    }))
  };
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
