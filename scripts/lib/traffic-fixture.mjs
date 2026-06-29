// Shared fabricated 강남역 SceneSnapshot traffic for the R3F verifier and the
// photoreal-plate render script, so both composite the EXACT same SUMO-truth
// fixture. Pure + deterministic (no Math.random) — the visual-diff baseline and
// the plate crops depend on reproducible traffic.

// Deterministic pseudo-random in [0, 1).
export function fixtureNoise(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Fabricate believable 강남역 arterial traffic.
//
// PLACEMENT CONTRACT (must stay intact — TrafficDensityLayer snaps the lateral
// offset from lane_id via getInboundLaneOffset and DROPS any vehicle whose
// heading is >35° off its lane direction):
//   - lane_id  = `${approach}_in_${laneIndex}` (laneIndex 0 = curb/right lane,
//     highest index = median; 강남대로 N/S index 4 = the bus-ONLY median lane).
//   - heading  = north 180 / south 0 / east 270 / west 90 (canonical per leg).
//   - along    = y_meters for N/S, x_meters for E/W; |along| stays inside the
//     approach corridor so no vehicle floats past the road end.
//   - lateral  = side * (laneCount - laneIndex - 0.5) * 3.6 (mirrors
//     getInboundLaneOffset; only the renderer fallback, but kept coherent).
//
// REALISM MODEL — spaced traffic, not a uniform block:
//   - SIGNAL-AWARE flow. The fixture runs an east-priority phase (east green,
//     N/S/W red). RED legs build a TIGHT standing queue at the stop line that
//     LOOSENS into moving gaps further back (dense near stop, sparse mid-block);
//     the GREEN east leg FLOWS with wide following gaps and is mostly occluded
//     in the wide camera. Following gaps therefore vary ~1.4 m (queue) → ~15 m.
//   - Every general lane is populated, but NOT equally: middle THROUGH lanes are
//     the deepest, the curb right-turn and inner left-turn lanes much lighter,
//     plus per-lane jitter so adjacent lanes differ and the corridor is never
//     packed to its edge.
//   - 강남대로 N/S heaviest, 테헤란로 E next (and flowing), 서초대로 W lightest.
//   - Buses ONLY ride the median bus-only lane (강남대로 N/S, index 4).
//   - One emergency vehicle approaches from the east.
//   - densityScale scales per-lane queue depth per scenario (rush vs. light)
//     while the in-corridor guard keeps every vehicle on the road.
export function buildVehicles({ densityScale = 1 } = {}) {
  const LANE_W = 3.6;
  const BOX_HALF = 18; // intersection box half-width ≈ stop-line distance

  const APPROACHES = [
    { name: "north", side: -1, axis: "ns", dir: -1, heading: 180, laneCount: 5,
      busLane: 4, maxAlong: 108, baseSpeed: 2.4, weight: 1.0, flowing: false,
      laneRole: { 0: "right", 1: "through", 2: "through", 3: "left" } },
    { name: "south", side: 1, axis: "ns", dir: 1, heading: 0, laneCount: 5,
      busLane: 4, maxAlong: 104, baseSpeed: 2.8, weight: 1.0, flowing: false,
      laneRole: { 0: "right", 1: "through", 2: "through", 3: "left" } },
    { name: "east", side: -1, axis: "ew", dir: 1, heading: 270, laneCount: 5,
      busLane: -1, maxAlong: 80, baseSpeed: 3.1, weight: 0.9, flowing: true,
      laneRole: { 0: "right", 1: "through", 2: "through", 3: "through", 4: "left" } },
    { name: "west", side: 1, axis: "ew", dir: -1, heading: 90, laneCount: 4,
      busLane: -1, maxAlong: 108, baseSpeed: 2.6, weight: 0.74, flowing: false,
      laneRole: { 0: "right", 1: "through", 2: "through", 3: "left" } }
  ];

  // Base queue depth (vehicles per lane before approach weight + jitter).
  const ROLE_DEPTH = { through: 9, right: 5, left: 4 };
  const QUEUE_NEAR = 5.5; // red leg: front of queue sits at the stop line
  const FLOW_NEAR = 9; // green leg: first moving vehicle is further in
  const QUEUE_GAP = 6.0; // tight standing-queue center spacing (~1.45 m gap, > renderer min 5.75)
  const FLOW_GAP_STOPPED = 15; // spacing once a red queue thins into arriving traffic
  const FLOW_GAP_GREEN = 20; // moving following gap on the green leg
  const QUEUE_LEN = 4; // first N vehicles are bumper-tight; the rest loosen
  const RAMP = 4; // vehicles over which spacing ramps queue -> flow
  const BUS_NEAR = 10;
  const BUS_GAP = 22; // buses are long + sparse
  const BUS_DEPTH = 3;

  // Center spacing in front of vehicle i within a lane (i >= 1).
  const gapBefore = (i, flowing) => {
    if (flowing) {
      const t = Math.min(1, (i - 1) / RAMP);
      return 10 + (FLOW_GAP_GREEN - 10) * t;
    }
    if (i <= QUEUE_LEN) return QUEUE_GAP;
    const t = Math.min(1, (i - QUEUE_LEN) / RAMP);
    return QUEUE_GAP + (FLOW_GAP_STOPPED - QUEUE_GAP) * t;
  };

  const vehicles = [];
  let emergencyPlaced = false;

  for (let ai = 0; ai < APPROACHES.length; ai += 1) {
    const a = APPROACHES[ai];
    // |along| = BOX_HALF + s, signed outward along the approach arm (N/W toward
    // -axis, S/E toward +axis). s is distance past the stop line, so the queue
    // sits on the approach, never collapsed through the intersection center.
    const along = (s) => a.dir * (BOX_HALF + s);
    const setPos = (vehicle, lateral, alongVal) => {
      if (a.axis === "ns") {
        vehicle.x_meters = lateral;
        vehicle.y_meters = alongVal;
      } else {
        vehicle.x_meters = alongVal;
        vehicle.y_meters = lateral;
      }
    };

    for (let laneIndex = 0; laneIndex < a.laneCount; laneIndex += 1) {
      const lateral = a.side * (a.laneCount - laneIndex - 0.5) * LANE_W;

      if (laneIndex === a.busLane) {
        const busRows = Math.max(1, Math.round(BUS_DEPTH * densityScale));
        let s = BUS_NEAR;
        for (let row = 0; row < busRows; row += 1) {
          if (BOX_HALF + s > a.maxAlong) break;
          const vehicle = {
            id: `fixture-${a.name}-bus-${row}`,
            vehicle_type: "bus",
            lane_id: `${a.name}_in_${laneIndex}`,
            heading_degrees: a.heading,
            speed_mps: row === 0 ? 0 : Number((a.baseSpeed * 0.5).toFixed(2)),
            waiting_seconds: row === 0 ? 14 : 2,
            emergency: false
          };
          setPos(vehicle, lateral, along(s));
          vehicles.push(vehicle);
          s += BUS_GAP;
        }
        continue;
      }

      const role = a.laneRole[laneIndex] ?? "through";
      // Per-lane jitter (0.74..1.16) so adjacent lanes differ and some stay light.
      const jitter = 0.74 + fixtureNoise(ai * 131 + laneIndex * 17) * 0.42;
      const depth = Math.max(
        1,
        Math.round(ROLE_DEPTH[role] * a.weight * jitter * densityScale)
      );

      let s = a.flowing ? FLOW_NEAR : QUEUE_NEAR;
      for (let row = 0; row < depth; row += 1) {
        if (row > 0) s += gapBefore(row, a.flowing);
        if (BOX_HALF + s > a.maxAlong) break;
        const seed = ai * 97 + laneIndex * 13 + row;

        let vehicleType;
        if (!emergencyPlaced && a.name === "east" && role === "through" && row === 0) {
          vehicleType = "emergency";
          emergencyPlaced = true;
        } else {
          const roll = fixtureNoise(seed);
          vehicleType = roll < 0.62 ? "car" : roll < 0.84 ? "taxi" : "truck";
        }

        // Front-of-queue vehicles on a red leg are stopped + waiting; vehicles
        // arriving behind, and the whole green leg, are moving.
        const stoppedAtFront = !a.flowing && row < QUEUE_LEN;
        const speed = a.flowing
          ? a.baseSpeed * (1.3 + fixtureNoise(seed + 1) * 0.5)
          : stoppedAtFront
            ? 0
            : a.baseSpeed * (0.45 + fixtureNoise(seed + 1) * 0.5);
        const waiting = a.flowing
          ? Math.round(fixtureNoise(seed + 2) * 3)
          : stoppedAtFront
            ? 12 + Math.round(fixtureNoise(seed + 2) * 22)
            : 2 + Math.round(fixtureNoise(seed + 2) * 6);

        const vehicle = {
          id: `fixture-${a.name}-l${laneIndex}-r${row}`,
          vehicle_type: vehicleType,
          lane_id: `${a.name}_in_${laneIndex}`,
          heading_degrees: a.heading,
          speed_mps: Number(speed.toFixed(2)),
          waiting_seconds: waiting,
          emergency: vehicleType === "emergency"
        };
        setPos(vehicle, lateral, along(s));
        vehicles.push(vehicle);
      }
    }
  }

  return vehicles;
}
