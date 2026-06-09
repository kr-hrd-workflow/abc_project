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

  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <div className="heading-copy">
          <h2>{t.eventTimeline}</h2>
          <span>{t.eventTimelineSub}</span>
        </div>
        <div className="timeline-tools">
          <button type="button">{t.all}</button>
          <button type="button" aria-label={locale === "ko" ? "필터" : "Filter"}>
            <span aria-hidden="true" className="toolbar-icon filter" />
          </button>
          <button type="button" aria-label={locale === "ko" ? "일시정지" : "Pause"}>
            <span aria-hidden="true" className="toolbar-icon pause" />
          </button>
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
      <button type="button" className="more-button">
        {t.more}
        <span aria-hidden="true" className="chevron down" />
      </button>
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
