import { describe, expect, test } from "vitest";

import {
  buildSeoulV2xSignalEvidence,
  buildSeoulV2xSignalSnapshot
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
});
