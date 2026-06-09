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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    await onAskQuestion(trimmed);
    setQuestion("");
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
              <p>{chat?.answer ?? "..."}</p>
              <time>08:42</time>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="chat-form">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t.askPlaceholder}
          />
          <button type="submit">
            <span>{t.send}</span>
            <span aria-hidden="true" className="send-icon" />
          </button>
        </form>
      </div>

      <div className="panel report-panel">
        <div className="panel-heading">
          <div className="heading-copy">
            <h2>{t.reports}</h2>
            <span>Reports</span>
          </div>
        </div>
        <button type="button" className="report-button" onClick={onGenerateReport}>
          <span aria-hidden="true" className="report-icon" />
          {t.generateReport}
          <small>Generate Report</small>
        </button>
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
        <button type="button" className="download-row">
          <span aria-hidden="true" className="download-icon" />
          {t.download}
          <span aria-hidden="true" className="chevron" />
        </button>
      </div>
    </section>
  );
}
