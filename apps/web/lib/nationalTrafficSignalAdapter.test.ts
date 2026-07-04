import { describe, expect, test } from "vitest";

import {
  buildNationalTrafficSignalEvidence,
  buildNationalTrafficSignalSnapshot
} from "./nationalTrafficSignalAdapter";

const NATIONAL_SIGNAL_RESPONSE = {
  response: {
    header: {
      resultCode: "K0",
      resultMsg: "NORMAL_SERVICE"
    },
    body: {
      items: {
        item: [
          {
            stdgCd: "1100000000",
            lclgvNm: "서울특별시",
            crsrdId: "1040",
            totDt: "20260703114701",
            etStsgRmndCs: 500
          },
          {
            stdgCd: "1100000000",
            lclgvNm: "서울특별시",
            crsrdId: "2904",
            crsrdNm: "시청",
            totDt: "20260703114701",
            ntStsgSttsNm: "진행",
            ntStsgRmndCs: 1250,
            etStsgSttsNm: "대기",
            etStsgRmndCs: null,
            stStsgSttsNm: "진행",
            stStsgRmndCs: "830",
            wtStsgSttsNm: "대기",
            wtStsgRmndCs: 0
          }
        ]
      }
    }
  }
};

describe("National traffic signal adapter", () => {
  test("summarizes a selected tl_drct_info row as live-input signal evidence", () => {
    const evidence = buildNationalTrafficSignalEvidence(
      NATIONAL_SIGNAL_RESPONSE,
      { crsrdId: "2904" }
    );

    expect(evidence).toEqual({
      source: "national_traffic_signal_real_time",
      schemaVersion: "national-traffic-signal.v1",
      service: {
        name: "행정안전부 한국지역정보개발원_(전국 통합데이터) 교통안전 신호등 실시간 정보",
        endpoint: "https://apis.data.go.kr/B551982/rti/tl_drct_info"
      },
      sourceMessage: {
        stdgCd: "1100000000",
        lclgvNm: "서울특별시",
        intersectionId: "2904",
        intersectionName: "시청",
        controllerId: "national-traffic-signal:1100000000:2904",
        capturedAt: "2026-07-03T02:47:01.000Z"
      },
      straightSignalCandidates: [
        {
          direction: "north",
          remainingSeconds: 13,
          sourceField: "ntStsgRmndCs",
          statusField: "ntStsgSttsNm",
          statusName: "진행"
        },
        {
          direction: "south",
          remainingSeconds: 9,
          sourceField: "stStsgRmndCs",
          statusField: "stStsgSttsNm",
          statusName: "진행"
        }
      ],
      replayReadiness: {
        status: "signal_snapshot_ready",
        adapterBoundary: "live-input.v1",
        missingInputs: [],
        selectedCurrentPhase: "north_priority"
      }
    });
  });

  test("builds a LiveSignalSnapshot from the strongest straight signal row", () => {
    const signal = buildNationalTrafficSignalSnapshot(
      NATIONAL_SIGNAL_RESPONSE,
      { crsrdId: "2904" },
      {
        controllerMode: "adaptive",
        manualOverride: false,
        nextPhase: "normal_cycle"
      }
    );

    expect(signal).toEqual({
      controllerId: "national-traffic-signal:1100000000:2904",
      capturedAt: "2026-07-03T02:47:01.000Z",
      currentPhase: "north_priority",
      remainingSeconds: 13,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    });
  });

  test("keeps signal timing blocked when the requested intersection has no cardinal straight time", () => {
    const evidence = buildNationalTrafficSignalEvidence(
      {
        response: {
          body: {
            items: {
              item: [
                {
                  stdgCd: "1100000000",
                  lclgvNm: "서울특별시",
                  crsrdId: "2904",
                  crsrdNm: "시청",
                  totDt: "20260703114701",
                  ntStsgRmndCs: 0,
                  etStsgRmndCs: null
                }
              ]
            }
          }
        }
      },
      { crsrdId: "2904" }
    );

    expect(evidence.replayReadiness).toEqual({
      status: "needs_current_phase_candidate",
      adapterBoundary: "live-input.v1",
      missingInputs: ["cardinal_straight_signal_remaining_time"],
      selectedCurrentPhase: null
    });
  });
});
