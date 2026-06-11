"use client";

import { useState } from "react";

import type { ChatResponse, Report } from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy } from "../lib/i18n";

type ChatReportPanelProps = {
  chat: ChatResponse | null;
  report: Report;
  locale: Locale;
  onAskQuestion: (question: string) => Promise<void>;
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
      await onAskQuestion(trimmed);
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
            <span>AI Agent</span>
          </div>
          <span className="online">Online</span>
        </div>
        <div className="chat-thread">
          <div className="chat-prompt-label">
            <strong>{t.askPrompt}</strong>
            <span>Ask about current traffic situation</span>
          </div>
          <div className="message-bubble user-message">
            <p>
              {locale === "ko"
                ? "현재 교차로 상황과 권고 조치의 효과는 어떤가요?"
                : "What is the current intersection status and recommendation effect?"}
            </p>
            <time>08:42</time>
          </div>
          <div className="message-row">
            <span className="agent-avatar" aria-hidden="true" />
            <div className="message-bubble assistant-message">
              {chat?.sections ? (
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
              ) : (
                <p className={chat ? "" : "chat-empty"}>
                  {chat?.answer ?? t.chatEmpty}
                </p>
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
            <span>Reports</span>
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
          <small>Generate Report</small>
        </button>
        {reportError ? (
          <p className="action-error" role="alert">
            {t.reportError}
          </p>
        ) : null}
        <div className="report-card">
          <span>{t.latestReport}</span>
          <strong>{report.summary}</strong>
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
