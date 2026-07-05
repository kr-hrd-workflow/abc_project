"use client";

import { useState } from "react";

import type { ChatResponse, Report } from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy } from "../lib/i18n";

type ChatReportPanelProps = {
  chat: ChatResponse | null;
  report: Report;
  locale: Locale;
  onAskQuestion: (question: string, locale: Locale) => Promise<void>;
  onGenerateReport: () => Promise<void>;
};

export function ChatReportPanel({
  chat,
  report,
  locale,
  onAskQuestion,
  onGenerateReport
}: ChatReportPanelProps) {
  const t = copy[locale];
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [chatState, setChatState] = useState<"idle" | "submitting">("idle");
  const [chatError, setChatError] = useState(false);
  const [reportState, setReportState] = useState<"idle" | "generating">("idle");
  const [reportError, setReportError] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    setChatState("submitting");
    setChatError(false);
    try {
      await onAskQuestion(trimmed, locale);
      setLastQuestion(trimmed);
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

  function handleDownloadReport() {
    const reportJson = JSON.stringify(report, null, 2);
    const blob = new Blob([reportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smart-intersection-report-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="chat-report-grid">
      <div className="panel chat-panel">
        <div className="panel-heading">
          <div className="heading-copy">
            <h2>{t.aiAgent}</h2>
            <span>{locale === "ko" ? "AI 지원" : "AI Agent"}</span>
          </div>
          <span className="online">{locale === "ko" ? "온라인" : "Online"}</span>
        </div>
        <div className="chat-thread">
          <div className="chat-prompt-label">
            <strong>{t.askPrompt}</strong>
            <span>
              {locale === "ko"
                ? "현재 교통 상황을 질문하세요"
                : "Ask about current traffic situation"}
            </span>
          </div>
          {lastQuestion ? (
            <div className="message-bubble user-message">
              <p>{lastQuestion}</p>
              <time>{formatChatTime()}</time>
            </div>
          ) : null}
          <div className="message-row">
            <span className="agent-avatar" aria-hidden="true" />
            <div className="message-bubble assistant-message">
              <p className={chat ? "" : "chat-empty"}>
                {chat?.answer ?? t.chatEmpty}
              </p>
              <time>{formatChatTime()}</time>
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
            <span>{locale === "ko" ? "운영 리포트" : "Reports"}</span>
          </div>
        </div>
        <button
          type="button"
          className="report-button motion-pressable command-pressable"
          onClick={handleGenerateReport}
          disabled={reportState === "generating"}
        >
          <span aria-hidden="true" className="report-icon" />
          <span>
            {reportState === "generating" ? t.reportGenerating : t.generateReport}
          </span>
          <small>{locale === "ko" ? "운영 리포트 생성" : "Generate Report"}</small>
        </button>
        {reportError ? (
          <p className="action-error" role="alert">
            {t.reportError}
          </p>
        ) : null}
        <div className="report-card">
          <span>{t.latestReport}</span>
          <strong>{formatReportSummary(report.summary, locale)}</strong>
          <dl>
            <div>
              <dt>{t.generatedTime}</dt>
              <dd>{new Date(report.generated_at).toLocaleTimeString()}</dd>
            </div>
          </dl>
        </div>
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

function formatChatTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatReportSummary(summary: string, locale: Locale) {
  if (locale !== "ko") return summary;
  const labels: Record<string, string> = {
    "10-minute traffic summary for INT-0001: south has the longest queue with 5 vehicles. Congestion level is low. No emergency vehicle approach detected. No pedestrian waiting request is active.":
      "INT-0001 10분 교통 요약: 남측 접근부 대기열이 5대로 가장 깁니다. 혼잡도는 낮고, 긴급차량 접근이나 보행자 대기 요청은 감지되지 않았습니다."
  };
  return labels[summary] ?? summary;
}
