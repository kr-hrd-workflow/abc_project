# AI-Hub 71573 Sample Intake

## Status

An authorized AI-Hub light sample was downloaded for dataset 71573,
`CCTV 기반 차량정보 및 교통정보 계측 데이터`.

The full downloaded archive is intentionally kept outside git:

```text
/Users/jeong-gwiin/Downloads/Sample.zip
```

The local ignored extract is:

```text
output/real-samples/aihub-71573/provenance.json
output/real-samples/aihub-71573/labels/C-221008_14_CR06_01_A0341.json
output/real-samples/aihub-71573/images/C-221008_14_CR06_01_A0341.jpg
```

## What The Sample Proves

- The project now has an authorized real CCTV image sample.
- The matching label JSON contains vehicle bbox annotations from an AI-Hub
  sample, not a synthetic fixture.
- The sample can ground detector evidence such as camera id, frame id,
  location, capture timestamp, image resolution, GPS, and vehicle bbox count.

## What The Sample Does Not Prove

- It does not include approach direction per detected vehicle.
- It does not include signal phase or signal remaining time.
- It does not prove live CCTV stream access.
- It does not prove a real signal-controller integration.

## Adapter Boundary

`apps/web/lib/aiHubVehicleSampleAdapter.ts` converts AI-Hub vehicle appearance
labels into:

- an evidence summary, always safe to build from the label
- a `live-input.v1` envelope only when external calibration supplies:
  - `approachDirection`
  - `signalSnapshot`

This avoids inventing direction or signal timing from image labels that do not
contain those facts.

## Next Data Need

The next required sample is signal timing, preferably from Seoul/T-DATA V2X
signal remaining-time data or another authorized controller sample that can
populate `live-input.v1.signalSnapshot`.

## Related Public Data Sample

The public data portal file
`경상남도_긴급차량 우선신호시스템 위치_20251231.csv` was also downloaded and
copied to ignored local output:

```text
output/real-samples/public-data/gyeongnam-emergency-priority-locations-20251231.csv
```

This CSV contains emergency-priority signal-system installation locations. It is
useful as real infrastructure provenance for the emergency-priority problem, but
it is not emergency vehicle telemetry and it does not provide signal phase or
remaining-time samples.
