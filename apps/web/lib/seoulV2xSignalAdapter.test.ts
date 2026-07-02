import { describe, expect, test } from "vitest";

import {
  buildSeoulV2xSignalEvidence,
  buildSeoulV2xSignalSnapshot,
  selectLatestSeoulV2xSignalMessage
} from "./seoulV2xSignalAdapter";

const SEOUL_V2X_SAMPLE = {
  dataId: "SPAT-CIB1000012200-1636027004-1626716",
  trsmUtcTime: 1636341369725,
  trsmYear: 2021,
  trsmMt: 11,
  trsmDy: 8,
  trsmTm: 121610,
  trsmMs: 725,
  itstId: 1850,
  eqmnId: "CIB1000012200",
  ntStsgRmdrCs: 0,
  etStsgRmdrCs: 185,
  stStsgRmdrCs: 62,
  wtStsgRmdrCs: null,
  etPdsgRmdrCs: 94
};

const SEOUL_V2X_LIVE_API_RESPONSE = [
  {
    dataId: "SPAT-CIB1130047200-1782952627-45848",
    trsmUtcTime: 1782961445714,
    trsmYear: "2026",
    trsmMt: "07",
    trsmDy: 2,
    trsmTm: "120405",
    trsmMs: "714",
    itstId: "23665",
    eqmnId: "CIB1130047200",
    ntStsgRmdrCs: null,
    etStsgRmdrCs: null,
    stStsgRmdrCs: null,
    wtStsgRmdrCs: null,
    seStsgRmdrCs: 55,
    nwStsgRmdrCs: 55
  },
  {
    dataId: "SPAT-CIB1130047200-1782952627-45853",
    trsmUtcTime: 1782961446684,
    trsmYear: "2026",
    trsmMt: "07",
    trsmDy: 2,
    trsmTm: "120406",
    trsmMs: "684",
    itstId: "23665",
    eqmnId: "CIB1130047200",
    ntStsgRmdrCs: null,
    etStsgRmdrCs: null,
    stStsgRmdrCs: null,
    wtStsgRmdrCs: null,
    seStsgRmdrCs: 45,
    nwStsgRmdrCs: 45
  }
];

const SEOUL_V2X_CARDINAL_LIVE_SAMPLE = {
  dataId: "SPAT-CIB1000020300-1782956865-28319",
  trsmUtcTime: 1782962312146,
  trsmYear: "2026",
  trsmMt: "07",
  trsmDy: 2,
  trsmTm: "121832",
  trsmMs: "146",
  itstId: "4765",
  eqmnId: "CIB1000020300",
  ntStsgRmdrCs: null,
  etStsgRmdrCs: 1120,
  stStsgRmdrCs: null,
  wtStsgRmdrCs: 1120
};

describe("Seoul V2X signal adapter", () => {
  test("summarizes signal timing evidence without requiring a detector sample", () => {
    const evidence = buildSeoulV2xSignalEvidence(SEOUL_V2X_SAMPLE);

    expect(evidence).toEqual({
      source: "seoul_v2x_signal_remaining_time",
      schemaVersion: "seoul-v2x-signal.v1",
      service: {
        name: "신호제어기 잔여시간 정보 서비스",
        endpoint:
          "http://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingInformation/1.0"
      },
      sourceMessage: {
        dataId: "SPAT-CIB1000012200-1636027004-1626716",
        intersectionId: "1850",
        controllerId: "CIB1000012200",
        capturedAt: "2021-11-08T03:16:09.725Z"
      },
      straightSignalCandidates: [
        { direction: "east", remainingSeconds: 19, sourceField: "etStsgRmdrCs" },
        { direction: "south", remainingSeconds: 7, sourceField: "stStsgRmdrCs" }
      ],
      replayReadiness: {
        status: "signal_snapshot_ready",
        adapterBoundary: "live-input.v1",
        missingInputs: [],
        selectedCurrentPhase: "east_priority"
      }
    });
  });

  test("builds a live-input.v1 signal snapshot from the strongest cardinal straight phase", () => {
    const signal = buildSeoulV2xSignalSnapshot(SEOUL_V2X_SAMPLE, {
      controllerMode: "adaptive",
      manualOverride: false,
      nextPhase: "normal_cycle"
    });

    expect(signal).toEqual({
      controllerId: "CIB1000012200",
      capturedAt: "2021-11-08T03:16:09.725Z",
      currentPhase: "east_priority",
      remainingSeconds: 19,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    });
  });

  test("keeps signal timing blocked when no cardinal straight phase is present", () => {
    const evidence = buildSeoulV2xSignalEvidence({
      ...SEOUL_V2X_SAMPLE,
      etStsgRmdrCs: null,
      stStsgRmdrCs: 0
    });

    expect(evidence.replayReadiness).toEqual({
      status: "needs_current_phase_candidate",
      adapterBoundary: "live-input.v1",
      missingInputs: ["cardinal_straight_signal_remaining_time"],
      selectedCurrentPhase: null
    });
  });

  test("selects the newest message from a T-DATA live API response array", () => {
    const selected = selectLatestSeoulV2xSignalMessage(
      SEOUL_V2X_LIVE_API_RESPONSE
    );

    expect(selected.dataId).toBe("SPAT-CIB1130047200-1782952627-45853");
  });

  test("summarizes a key-backed live response with numeric strings and unsupported diagonal phases", () => {
    const evidence = buildSeoulV2xSignalEvidence(
      selectLatestSeoulV2xSignalMessage(SEOUL_V2X_LIVE_API_RESPONSE)
    );

    expect(evidence.sourceMessage).toEqual({
      dataId: "SPAT-CIB1130047200-1782952627-45853",
      intersectionId: "23665",
      controllerId: "CIB1130047200",
      capturedAt: "2026-07-02T03:04:06.684Z"
    });
    expect(evidence.straightSignalCandidates).toEqual([]);
    expect(evidence.replayReadiness).toEqual({
      status: "needs_current_phase_candidate",
      adapterBoundary: "live-input.v1",
      missingInputs: ["cardinal_straight_signal_remaining_time"],
      selectedCurrentPhase: null
    });
  });

  test("builds a signal snapshot from a key-backed cardinal live sample", () => {
    const signal = buildSeoulV2xSignalSnapshot(SEOUL_V2X_CARDINAL_LIVE_SAMPLE, {
      controllerMode: "adaptive",
      manualOverride: false,
      nextPhase: "normal_cycle"
    });

    expect(signal).toEqual({
      controllerId: "CIB1000020300",
      capturedAt: "2026-07-02T03:18:32.146Z",
      currentPhase: "east_priority",
      remainingSeconds: 112,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    });
  });
});
