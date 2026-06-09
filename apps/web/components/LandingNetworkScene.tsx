const nodes = ["north", "east", "south", "west", "center", "emergency", "pedestrian"] as const;
const routes = ["route-east", "route-west", "route-north", "route-emergency"] as const;
type LandingNetworkSceneProps = {
  ariaLabel: string;
  events: readonly string[];
  phase: string;
  phaseLabel: string;
  phaseValue: string;
  preview: {
    location: string;
    live: string;
    mapTitle: string;
    planTitle: string;
    currentPlan: string;
    recommendedPlan: string;
    recommendationTitle: string;
    recommendationAction: string;
    confidence: string;
    confidenceLabel: string;
    cycleLabel: string;
    currentCycle: string;
    recommendedCycle: string;
    simulationOnly: string;
    simulationCopy: string;
  };
  sidebarLabels: readonly string[];
  status: string;
};

export function LandingNetworkScene({
  ariaLabel,
  events,
  phase,
  phaseLabel,
  phaseValue,
  preview,
  status
}: LandingNetworkSceneProps) {
  const phaseRows = [
    ["Phase 1", "NB Thru", "30s"],
    ["Phase 2", "EB Thru", "22s"],
    ["Phase 3", "SB Thru", "32s"],
    ["Phase 4", "WB Thru", "22s"],
    ["Phase 5", "Ped / All", "12s"]
  ] as const;

  return (
    <div className="landing-network product-preview" aria-label={ariaLabel}>
      <header className="preview-chrome">
        <div>
          <span className="preview-menu" aria-hidden="true" />
          <strong>{preview.location}</strong>
          <span>{preview.live}</span>
        </div>
        <div>
          <span>14:32:18</span>
          <span>22°C</span>
        </div>
      </header>

      <div className="preview-body">
        <section className="preview-map" aria-label={preview.mapTitle}>
          <header>
            <strong>{preview.mapTitle}</strong>
            <span>{status}</span>
          </header>
          <div className="map-surface" aria-hidden="true">
            <div className="network-grid" />
            <div className="network-core">
              <span />
              <span />
              <span />
            </div>
            <div className="network-phase">
              <span className="network-phase-ring" />
              <span className="network-phase-copy">
                <span>{phaseLabel}</span>
                <strong>{phaseValue}</strong>
              </span>
            </div>
            {routes.map((route) => (
              <span key={route} className={`network-route ${route}`} />
            ))}
            <span className="network-flow flow-east" />
            <span className="network-flow flow-west" />
            <span className="network-flow flow-emergency" />
            {nodes.map((node) => (
              <span key={node} className={`network-node node-${node}`} />
            ))}
          </div>
          <div className="preview-metrics">
            <span>
              <strong>186</strong>
              vehicles
            </span>
            <span>
              <strong>28s</strong>
              delay
            </span>
            <span>
              <strong>76m</strong>
              queue
            </span>
          </div>
          <div className="preview-events" aria-label="Active scenario events">
            {events.map((event, index) => (
              <span key={event} className={`event-${index + 1}`}>
                {event}
              </span>
            ))}
          </div>
        </section>

        <aside className="preview-side">
          <section className="preview-plan" aria-label={preview.planTitle}>
            <h2>{preview.planTitle}</h2>
            <div className="plan-columns">
              {[preview.currentPlan, preview.recommendedPlan].map((plan, columnIndex) => (
                <div key={plan} className={columnIndex === 1 ? "recommended" : ""}>
                  <strong>{plan}</strong>
                  {phaseRows.map(([rowPhase, direction, seconds]) => (
                    <span key={`${plan}-${rowPhase}`}>
                      <i aria-hidden="true" />
                      <b>{rowPhase}</b>
                      <small>{direction}</small>
                      <em>{seconds}</em>
                    </span>
                  ))}
                  <span className="cycle-row">
                    <small>{preview.cycleLabel}</small>
                    <em>{columnIndex === 1 ? preview.recommendedCycle : preview.currentCycle}</em>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="preview-recommendation">
            <h2>{preview.recommendationTitle}</h2>
            <div>
              <strong>{preview.recommendationAction}</strong>
              <span>{preview.confidenceLabel}</span>
            </div>
            <b>{preview.confidence}</b>
          </section>
        </aside>
      </div>

      <footer className="preview-footer">
        <strong>{preview.simulationOnly}</strong>
        <span>{preview.simulationCopy}</span>
      </footer>
    </div>
  );
}
