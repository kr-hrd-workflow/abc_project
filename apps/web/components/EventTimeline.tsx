import type { TrafficEvent } from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy, formatEventType, formatSeverity } from "../lib/i18n";

type EventTimelineProps = {
  events: TrafficEvent[];
  locale: Locale;
};

export function EventTimeline({ events, locale }: EventTimelineProps) {
  const t = copy[locale];
  const recentEvents = [...events]
    .sort(
      (left, right) =>
        new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime()
    )
    .slice(0, 5);
  const criticalCount = events.filter((event) => event.severity === "critical").length;
  const warningCount = events.filter((event) => event.severity === "warning").length;
  const latestEvent = recentEvents[0];

  return (
    <section id="events" className="panel timeline-panel">
      <div className="panel-heading">
        <div className="heading-copy">
          <h2>{t.eventTimeline}</h2>
          <span>{t.eventTimelineSub}</span>
        </div>
        <div className="timeline-tools" aria-label={locale === "ko" ? "이벤트 표시 범위" : "Event range"}>
          <span>{t.all}</span>
          <small>
            {t.showingLatest} {recentEvents.length}/{events.length}
          </small>
        </div>
      </div>
      <div className="timeline-list">
        {recentEvents.map((event) => (
          <article key={event.id} className={`event-row ${event.severity}`}>
            <time>{formatTime(event.occurred_at)}</time>
            <div>
              <div className="event-title-row">
                <span className={`severity ${event.severity}`}>
                  {formatSeverity(event.severity, locale)}
                </span>
                <span className="severity-en">{event.severity.toUpperCase()}</span>
              </div>
              <strong>{formatEventType(event.event_type, locale)}</strong>
              <p>{event.ai_summary}</p>
            </div>
            <span
              className={`event-icon ${event.event_type}`}
              aria-label={formatEventType(event.event_type, locale)}
            />
          </article>
        ))}
      </div>
      <div className="brief-spine-dense" aria-label={locale === "ko" ? "현장 증거 요약" : "Field evidence summary"}>
        <div className="priority-queue-card">
          <span>{locale === "ko" ? "우선순위 큐" : "Priority queue"}</span>
          <strong>
            {locale === "ko"
              ? `${criticalCount} 긴급 / ${warningCount} 경고`
              : `${criticalCount} critical / ${warningCount} warning`}
          </strong>
          <small>
            {latestEvent
              ? latestEvent.recommendation
              : locale === "ko"
                ? "대기 중인 이벤트 없음"
                : "No queued event"}
          </small>
        </div>
        <div className="evidence-trail-card">
          <span>{locale === "ko" ? "증거 흐름" : "Evidence trail"}</span>
          <div>
            <small>CCTV Frame</small>
            <strong>{latestEvent ? formatTime(latestEvent.occurred_at) : "--:--:--"}</strong>
          </div>
          <div>
            <small>SUMO Delta</small>
            <strong>{locale === "ko" ? "대기열 비교 준비" : "Queue comparison ready"}</strong>
          </div>
          <div>
            <small>{locale === "ko" ? "운영자 노트" : "Operator note"}</small>
            <strong>{locale === "ko" ? "인수인계 가능" : "Ready for handoff"}</strong>
          </div>
        </div>
      </div>
      <p className="list-footnote">
        {events.length > recentEvents.length
          ? `${events.length - recentEvents.length} ${locale === "ko" ? "개 이벤트가 더 있습니다." : "more events available."}`
          : locale === "ko"
            ? "모든 이벤트가 표시되었습니다."
            : "All events are visible."}
      </p>
    </section>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
