# Live Input Adapter Contract

## Purpose

This contract defines how future real CCTV object-detection output and real
signal-controller snapshots should enter the local replay/evaluation pipeline.

The current project still remains simulation-only and decision-support only.
This contract does not add real CCTV ingestion, real signal control, or
autonomous traffic-light operation. It defines the data shape that those future
adapters must produce.

## Boundary

Adapters may provide:

- Object detections derived from CCTV frames.
- Signal-controller state snapshots.
- Capture timestamps and source identifiers.

Adapters must not:

- Send commands to real traffic lights through this contract.
- Claim that a recommendation has been executed.
- Hide low-confidence or missing data.
- Pass raw API keys, video credentials, or private stream URLs through the
  dashboard payload.

## Envelope

Every live input payload must use this top-level shape:

```json
{
  "schemaVersion": "live-input.v1",
  "intersectionId": "INT-SEO-0001",
  "receivedAt": "2026-06-30T13:00:00.000Z",
  "cameraFrames": [],
  "signalSnapshot": null
}
```

Fields:

- `schemaVersion`: must be `live-input.v1`.
- `intersectionId`: local intersection identifier used by the dashboard and
  evaluator.
- `receivedAt`: ISO timestamp when the local adapter received or assembled the
  payload.
- `cameraFrames`: one or more CCTV-derived detection frames.
- `signalSnapshot`: latest signal state, or `null` when unavailable.

## Camera Frame

```json
{
  "cameraId": "east_cam_01",
  "frameId": "frame-0001",
  "capturedAt": "2026-06-30T13:00:00.000Z",
  "detections": []
}
```

Fields:

- `cameraId`: stable camera/source identifier.
- `frameId`: source frame identifier for traceability.
- `capturedAt`: ISO timestamp from the frame source.
- `detections`: object detections from the frame.

## Detection

```json
{
  "objectId": "ev-1",
  "classLabel": "emergency_vehicle",
  "confidence": 0.97,
  "direction": "east",
  "laneId": "east_approach_1",
  "count": 1,
  "distanceMeters": 82
}
```

Required fields:

- `objectId`: detector-local object id or generated stable id.
- `classLabel`: one of `vehicle`, `emergency_vehicle`, `pedestrian`,
  `stalled_vehicle`.
- `confidence`: number from `0` to `1`.
- `direction`: one of `north`, `south`, `east`, `west`.
- `laneId`: lane or approach identifier mapped into the local intersection
  convention.
- `count`: non-negative integer. Use `1` for individual object detections.

Optional fields:

- `distanceMeters`: estimated distance to the stop line or conflict area.
- `waitingSeconds`: estimated stationary/waiting duration.

## Signal Snapshot

```json
{
  "controllerId": "seo-signal-01",
  "capturedAt": "2026-06-30T13:00:00.000Z",
  "currentPhase": "east_priority",
  "remainingSeconds": 18,
  "nextPhase": "normal_cycle",
  "controllerMode": "adaptive",
  "manualOverride": false
}
```

Fields:

- `controllerId`: signal-controller source identifier.
- `capturedAt`: ISO timestamp from the signal source.
- `currentPhase`: one of `north_priority`, `south_priority`, `east_priority`,
  `west_priority`, `normal_cycle`.
- `remainingSeconds`: non-negative integer.
- `nextPhase`: same phase options as `currentPhase`.
- `controllerMode`: one of `adaptive`, `fixed`, `manual`.
- `manualOverride`: whether a human/operator override is active.

## Replay Mapping

The web contract implementation lives in:

- `apps/web/lib/liveInputContract.ts`
- `apps/web/lib/liveInputFixtureAdapter.ts`

It maps live input into the replay-compatible shape currently used by synthetic
evaluation:

```ts
{
  cameraId: string;
  detections: SyntheticDetection[];
  signal: SyntheticSignalSnapshot;
}
```

Mapping rules:

- `classLabel` becomes synthetic `type`.
- `laneId` becomes synthetic `lane`.
- `intersectionId` becomes signal `intersectionId`.
- signal `currentPhase`, `remainingSeconds`, `nextPhase`, `controllerMode`,
  and `manualOverride` pass through after validation.

If `signalSnapshot` is `null`, the contract can still normalize the envelope,
but it cannot produce replay-compatible input. The caller must keep the
operator-review boundary visible.

## Local Fixture Adapter

The first source-specific adapter is intentionally local-only:

```ts
buildFixtureLiveInputEnvelope(scenarioCase)
buildFixtureReplayInput(scenarioCase)
```

It converts a `SyntheticScenarioCase` into a `live-input.v1` envelope, validates
that envelope with `normalizeLiveInputEnvelope()`, and can then return the
replay-compatible shape with `toSyntheticReplayInput()`.

This gives the project an end-to-end adapter path before real sources are
available:

```text
SyntheticScenarioCase
  -> local fixture live-input adapter
  -> live-input.v1 envelope
  -> contract normalizer
  -> replay-compatible input
```

Presentation wording:

> The first adapter is local-only. It proves the live input contract can carry
> CCTV-like detections and signal snapshots into the same replay/evaluation path
> used by the synthetic benchmark.

## Source-Specific Fixture Adapter

The next adapter fixture uses a more realistic two-source input shape before it
is converted into `live-input.v1`:

```text
RoadVision detector frame
Signal controller frame
  -> source-specific adapter
  -> live-input.v1 envelope
  -> contract normalizer
  -> replay-compatible input
```

Implementation:

- `apps/web/lib/sourceLiveInputAdapter.ts`
- `GET /api/source-live-input-fixture`

Fixture source formats:

- detector: `road-vision.fixture.v1`
- signal: `signal-controller.fixture.v1`

The adapter maps detector classes into contract classes:

- `ambulance` and `fire_truck` -> `emergency_vehicle`
- `pedestrian` -> `pedestrian`
- `stopped_vehicle` -> `stalled_vehicle`
- `car` and `bus` -> `vehicle`

It maps source signal phases into local phases:

- `N_GREEN` -> `north_priority`
- `S_GREEN` -> `south_priority`
- `E_GREEN` -> `east_priority`
- `W_GREEN` -> `west_priority`
- `NORMAL` -> `normal_cycle`

This is still a local fixture. It does not connect a real vendor feed, expose
stream credentials, or control live signals.

## Local Fixture Export API

The local fixture adapter can also be inspected outside the dashboard card:

```text
GET /api/live-input-fixture
```

The endpoint returns:

- `source`: `local_fixture_adapter`
- `schemaVersion`: `live-input.v1`
- `scenario`: local fixture id, family, and expected recommendation
- `envelope`: the normalized `live-input.v1` payload
- `replaySummary`: replay readiness, camera id, detection count, detection
  classes, and current signal phase

This endpoint is local demo evidence only. It does not ingest a real CCTV
stream, expose private credentials, return raw video frames, or control signals.

The source-specific fixture can be inspected separately:

```text
GET /api/source-live-input-fixture
```

The endpoint returns:

- `source`: `source_specific_adapter_fixture`
- `sourceFormats`: detector and signal fixture format ids
- `envelope`: normalized `live-input.v1`
- `replaySummary`: replay readiness, camera id, detection count, detection
  classes, and current signal phase

## Validation Rules

The local normalizer rejects:

- unsupported `schemaVersion`
- missing or blank ids
- invalid timestamps
- unsupported directions, classes, phases, or controller modes
- detection confidence outside `0..1`
- negative or non-integer counts
- missing signal state when replay-compatible conversion is requested

## Example

```json
{
  "schemaVersion": "live-input.v1",
  "intersectionId": "INT-SEO-0001",
  "receivedAt": "2026-06-30T13:00:00.000Z",
  "cameraFrames": [
    {
      "cameraId": "east_cam_01",
      "frameId": "frame-0001",
      "capturedAt": "2026-06-30T13:00:00.000Z",
      "detections": [
        {
          "objectId": "ev-1",
          "classLabel": "emergency_vehicle",
          "confidence": 0.97,
          "direction": "east",
          "laneId": "east_approach_1",
          "count": 1,
          "distanceMeters": 82
        }
      ]
    }
  ],
  "signalSnapshot": {
    "controllerId": "seo-signal-01",
    "capturedAt": "2026-06-30T13:00:00.000Z",
    "currentPhase": "east_priority",
    "remainingSeconds": 18,
    "nextPhase": "normal_cycle",
    "controllerMode": "adaptive",
    "manualOverride": false
  }
}
```

## Presentation Framing

Say:

> We have defined the contract for future live input adapters. Real CCTV/object
> detector output and signal snapshots can be normalized into the same replay
> and evaluation shape we already use for synthetic testing.

Do not say:

> Real CCTV and real signal feeds are already connected.

## Next Implementation Step

When real sources are available, implement one adapter that produces this
envelope and run it through `normalizeLiveInputEnvelope()` before it reaches the
dashboard or evaluator. Until then, use `/api/live-input-fixture` to inspect the
contract payload produced by the local fixture adapter.
