import type { TrafficEvent } from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy, formatDirection, formatEventType, formatSeverity } from "../lib/i18n";

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
        <h2>{t.eventTimeline}</h2>
        <button type="button">{locale === "ko" ? "전체" : "All"}</button>
      </div>
      <div className="timeline-list">
        {recentEvents.map((event) => (
          <article key={event.id} className={`event-row ${event.severity}`}>
            <time>{formatTime(event.occurred_at)}</time>
            <div>
              <span className={`severity ${event.severity}`}>
                {formatSeverity(event.severity, locale)}
              </span>
              <strong>{formatEventType(event.event_type, locale)}</strong>
              <p>{event.ai_summary}</p>
            </div>
            <span className="direction">{formatDirection(event.direction, locale)}</span>
          </article>
        ))}
      </div>
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
