# PDF Gap Implementation Plan

> Source: `doc/8기_워크플로우팀_수행계획서_정귀인_260601.pdf` extracted on 2026-06-11.

## Goal

Finish the remaining MVP gaps without enabling live OpenAI calls:

- Keep OpenAI behind guarded adapter/mock boundaries.
- Add a Unity / virtual CCTV simulator presentation surface while SUMO remains the traffic-validation engine.
- Tighten SUMO API/UI metric contract.
- Improve dashboard and landing copy without claiming real signal control.
- Add tests and run real verification.

## Implementation slices

- [x] Verify Codex and Windows `.agents` skills/plugins were imported or preserved.
- [x] Read repo docs, AGENTS, README, package manifests, and PDF requirements.
- [x] Backend simulation contract: include `throughput_percent` so API and dashboard agree.
- [x] Backend virtual CCTV fixture: expose Unity/virtual CCTV provenance through `/api/fixtures` and fixture ingest results.
- [x] Dashboard virtual CCTV surface: show Unity simulator/fallback/SUMO telemetry as a clear presentation layer.
- [x] Landing copy: mention Unity/virtual CCTV as presentation support while avoiding overclaiming.
- [x] Tests: backend adapter/fixture tests and frontend dashboard/landing tests.
- [x] Verification: API tests, web tests, web build.

## Safety boundaries

- No live OpenAI call in this slice.
- No real traffic signal control wording.
- Unity is a presentation/fallback simulator surface; SUMO/TraCI remains the quantitative simulation engine.
