const nodes = ["north", "east", "south", "west", "center", "emergency"] as const;
const routes = ["route-east", "route-west", "route-emergency"] as const;

export function LandingNetworkScene() {
  return (
    <div className="landing-network" aria-label="Animated civic network map">
      <div className="network-grid" aria-hidden="true" />
      {routes.map((route) => (
        <span key={route} className={`network-route ${route}`} aria-hidden="true" />
      ))}
      {nodes.map((node) => (
        <span key={node} className={`network-node node-${node}`} aria-hidden="true" />
      ))}
      <div className="network-status">
        <strong>INT-0001</strong>
        <span>Recommendation and simulation only</span>
      </div>
    </div>
  );
}
