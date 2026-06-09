import Link from "next/link";

import { LandingNetworkScene } from "../components/LandingNetworkScene";

export default function Page() {
  return (
    <main className="landing-shell">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Civic traffic decision support</p>
          <h1 id="landing-title">Smart Intersection Ops</h1>
          <p>
            See traffic conditions, compare signal recommendations, and brief
            operators from one live civic view.
          </p>
          <div className="landing-actions">
            <Link href="/dashboard" className="primary-link">
              Open dashboard
            </Link>
            <a href="#decision-workflow" className="secondary-link">
              View decision workflow
            </a>
          </div>
        </div>
        <LandingNetworkScene />
      </section>
      <section className="landing-section landing-proof" aria-labelledby="live-picture-title">
        <div>
          <h2 id="live-picture-title">Live intersection picture</h2>
          <p>
            Queue lengths, pedestrian demand, emergency approach, and recent events
            stay visible before any recommendation is considered.
          </p>
        </div>
        <div className="landing-proof-grid" aria-label="Dashboard preview metrics">
          <span>
            <strong>16</strong> west queue
          </span>
          <span>
            <strong>12s</strong> emergency ETA
          </span>
          <span>
            <strong>-18%</strong> simulated wait
          </span>
        </div>
      </section>

      <section className="landing-section landing-boundary" aria-labelledby="boundary-title">
        <h2 id="boundary-title">Recommendation boundary</h2>
        <p>
          Smart Intersection Ops recommends and simulates traffic plans. It does not
          control real signals, connect to live controllers, or override operator
          judgment.
        </p>
      </section>

      <section
        id="decision-workflow"
        className="landing-section landing-workflow"
        aria-labelledby="workflow-title"
      >
        <h2 id="workflow-title">Scenario workflow</h2>
        <ol>
          <li>
            <strong>Events</strong>
            <span>Traffic evidence is normalized by direction, severity, and source.</span>
          </li>
          <li>
            <strong>Recommendation</strong>
            <span>The system proposes a simulation-only signal plan.</span>
          </li>
          <li>
            <strong>Simulation</strong>
            <span>Fixed and recommended plans are compared before operator review.</span>
          </li>
          <li>
            <strong>Brief</strong>
            <span>Chat and report surfaces turn the scenario into a readable handoff.</span>
          </li>
        </ol>
      </section>

      <section
        className="landing-section landing-dashboard-preview"
        aria-labelledby="dashboard-preview-title"
      >
        <div>
          <h2 id="dashboard-preview-title">Dashboard preview</h2>
          <p>
            The dashboard stays practical: scenario switching, digital twin, event
            timeline, recommendation evidence, metrics, chat, and reports remain in
            one operator flow.
          </p>
        </div>
        <Link href="/dashboard" className="primary-link compact">
          Open dashboard
        </Link>
      </section>
    </main>
  );
}
