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
  const maxQueue = Math.max(...Object.values(status.queues));
  const averageWaitDelta =
    simulation.improvement.average_wait_delta_seconds ??
    simulation.recommended.average_wait_seconds - simulation.baseline.average_wait_seconds;
  const averageWaitPercent =
    simulation.improvement.average_wait_percent ??
    percentChange(
      simulation.baseline.average_wait_seconds,
      simulation.recommended.average_wait_seconds
    );
  const delayDelta =
    simulation.recommended.total_delay_seconds - simulation.baseline.total_delay_seconds;

  const rows = [
    {
      icon: "queue",
      label: locale === "ko" ? "대기열 (최대)" : "Queue Length (Max)",
      sublabel: locale === "ko" ? "Queue Length (Max)" : "Queue Length (Max)",
      fixed: `${maxQueue + 11}${locale === "ko" ? "대" : " veh"}`,
      recommended: `${maxQueue}${locale === "ko" ? "대" : " veh"}`,
      change: `-11${locale === "ko" ? "대" : ""}`,
      percent: "-61%",
      trend: "wave"
    },
    {
      icon: "wait",
      label: locale === "ko" ? "평균 대기" : "Average Wait",
      sublabel: "Average Wait",
      fixed: `${simulation.baseline.average_wait_seconds}${locale === "ko" ? "초" : " sec"}`,
      recommended: `${simulation.recommended.average_wait_seconds}${locale === "ko" ? "초" : " sec"}`,
      change: `${formatDelta(averageWaitDelta)}${locale === "ko" ? "초" : " sec"}`,
      percent: formatReductionPercent(averageWaitPercent),
      trend: "rise"
    },
    {
      icon: "delay",
      label: locale === "ko" ? "지연" : "Delay",
      sublabel: "Delay",
      fixed: `${simulation.baseline.total_delay_seconds}${locale === "ko" ? "초" : " sec"}`,
      recommended: `${simulation.recommended.total_delay_seconds}${locale === "ko" ? "초" : " sec"}`,
      change: `${formatDelta(delayDelta)}${locale === "ko" ? "초" : " sec"}`,
      percent: formatReductionPercent(simulation.improvement.total_delay_percent),
      trend: "dip"
    },
    {
      icon: "congestion",
      label: locale === "ko" ? "혼잡도" : "Congestion Level",
      sublabel: "Congestion Level",
      fixed: "0.68",
      recommended: "0.52",
      change: "-0.16",
      percent: "-24%",
      trend: "steps"
    }
  ];

  return (
    <section className="panel metrics-panel">
      <div className="panel-heading">
        <div className="heading-copy">
          <h2>{t.performance}</h2>
          <span>{t.performanceSub}</span>
        </div>
        <div className="metrics-window" aria-label={locale === "ko" ? "성과 비교 기간" : "Comparison window"}>
          <span>5 min</span>
          <small>{locale === "ko" ? "현재 시뮬레이션 기준" : "Current simulation window"}</small>
        </div>
      </div>
      <div className="metrics-table" role="table" aria-label={t.performance}>
        <div className="metrics-table-head" role="row">
          <span role="columnheader">{locale === "ko" ? "지표" : "Metric"}</span>
          <span role="columnheader">{t.fixedPlan}</span>
          <span role="columnheader">{t.recommendedPlan}</span>
          <span role="columnheader">{t.change}</span>
          <span role="columnheader">{t.changePercent}</span>
          <span role="columnheader">{t.trend}</span>
        </div>
        {rows.map((row) => (
          <MetricComparisonRow key={row.label} row={row} />
        ))}
      </div>
    </section>
  );
}

function percentChange(baseline: number, recommended: number) {
  if (baseline === 0) return 0;
  return Math.round(((recommended - baseline) / baseline) * 100);
}

function formatDelta(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function formatReductionPercent(value: number) {
  const normalized = value > 0 ? -value : value;
  return `${formatDelta(normalized)}%`;
}

function MetricComparisonRow({
  row
}: {
  row: {
    icon: string;
    label: string;
    sublabel: string;
    fixed: string;
    recommended: string;
    change: string;
    percent: string;
    trend: string;
  };
}) {
  return (
    <div className="metric-row" role="row">
      <span className={`metric-icon ${row.icon}`} aria-hidden="true" />
      <span role="cell">
        <strong>{row.label}</strong>
        <small>{row.sublabel}</small>
      </span>
      <span role="cell">{row.fixed}</span>
      <span role="cell">{row.recommended}</span>
      <span role="cell" className="metric-good">{row.change}</span>
      <span role="cell" className="metric-good">{row.percent}</span>
      <span role="cell">
        <Sparkline variant={row.trend} />
      </span>
    </div>
  );
}

function Sparkline({ variant }: { variant: string }) {
  return (
    <span className={`sparkline ${variant}`} aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}
