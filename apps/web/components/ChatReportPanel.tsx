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
          <h2>{t.aiAgent}</h2>
          <span className="online">Online</span>
        </div>
        <form onSubmit={handleSubmit} className="chat-form">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t.askPlaceholder}
          />
          <button type="submit">{t.send}</button>
        </form>
        <div className="answer-box">
          <span>{t.latestAnswer}</span>
          <p>{chat?.answer ?? "..."}</p>
        </div>
      </div>

      <div className="panel report-panel">
        <div className="panel-heading">
          <h2>{t.reports}</h2>
        </div>
        <button type="button" className="report-button" onClick={onGenerateReport}>
          {t.generateReport}
        </button>
        <div className="report-card">
          <span>{t.latestReport}</span>
          <strong>{report.summary}</strong>
          <small>{new Date(report.generated_at).toLocaleTimeString()}</small>
        </div>
      </div>
    </section>
  );
}
