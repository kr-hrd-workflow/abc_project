import type { IntersectionStatus, SimulationComparison } from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy } from "../lib/i18n";

type MetricsPanelProps = {
  status: IntersectionStatus;
  simulation: SimulationComparison;
  locale: Locale;
};

export function MetricsPanel({ status, simulation, locale }: MetricsPanelProps) {
  const t = copy[locale];
  const delayDelta = -Math.abs(simulation.improvement.total_delay_percent);

  return (
    <section className="panel metrics-panel">
      <div className="panel-heading">
        <h2>{t.performance}</h2>
        <div className="segment-control">
          <button type="button" className="active">5 min</button>
          <button type="button">15 min</button>
          <button type="button">30 min</button>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric label={locale === "ko" ? "대기열(최대)" : "Queue Length"} value={`${Math.max(...Object.values(status.queues))}`} delta={`${delayDelta}%`} />
        <Metric label={locale === "ko" ? "평균 대기" : "Average Wait"} value={`${simulation.recommended.average_wait_seconds}s`} delta="-18%" />
        <Metric label={locale === "ko" ? "지연" : "Delay"} value={`${simulation.recommended.total_delay_seconds}s`} delta={`${delayDelta}%`} />
        <Metric label={locale === "ko" ? "처리량" : "Throughput"} value={`${simulation.recommended.throughput}`} delta="+13%" />
      </div>
    </section>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{delta}</em>
    </div>
  );
}
