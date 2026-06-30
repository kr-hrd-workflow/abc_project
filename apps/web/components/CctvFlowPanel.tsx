import type { CctvFlow } from "../lib/types";
import type { Locale } from "../lib/i18n";

type CctvFlowPanelProps = {
  flow: CctvFlow | null;
  locale: Locale;
};

export function CctvFlowPanel({ flow, locale }: CctvFlowPanelProps) {
  const title = locale === "ko" ? "측정 CCTV 교통량" : "Measured CCTV flow";

  if (!flow) {
    return (
      <section className="cctv-flow-panel" aria-label={title}>
        <header>
          <strong>{title}</strong>
        </header>
        <p className="cctv-flow-empty">
          {locale === "ko" ? "측정 소스 없음" : "No measurement source"}
        </p>
      </section>
    );
  }

  const approaches = Object.entries(flow.per_approach);

  return (
    <section className="cctv-flow-panel" aria-label={title}>
      <header>
        <strong>{title}</strong>
        <small>{locale === "ko" ? "출처: 측정 CCTV" : "Source: measured CCTV"}</small>
      </header>
      <ul className="cctv-flow-rows">
        {approaches.map(([name, approach]) => (
          <li key={name} className="cctv-flow-row">
            <span className="cctv-flow-approach">{name.replace(/_/g, " ")}</span>
            <span className="cctv-flow-value">
              {Math.round(approach.veh_per_hour)} {locale === "ko" ? "대/시" : "veh/h"}
            </span>
          </li>
        ))}
      </ul>
      {flow.pedestrian ? (
        <p className="cctv-flow-pedestrian">
          {locale === "ko" ? "보행자" : "Pedestrians"}:{" "}
          {Math.round(flow.pedestrian.per_hour)} {locale === "ko" ? "명/시" : "ped/h"}
        </p>
      ) : null}
    </section>
  );
}
