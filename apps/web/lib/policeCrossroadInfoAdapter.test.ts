import { describe, expect, test } from "vitest";

import {
  buildPoliceCrossroadInfoMetadataEvidence,
  normalizePoliceCrossroadInfoDetailResponse,
  normalizePoliceCrossroadInfoListResponse
} from "./policeCrossroadInfoAdapter";

const LIST_RESPONSE = [
  {
    pageNo: "1",
    resultCode: "0",
    totalCount: "1",
    numOfRows: "10",
    totPage: "1",
    resultMsg: "NORMAL_SERVICE"
  },
  {
    Y_COORD: "375640221",
    INT_NO: "2904",
    X_COORD: "1269769226",
    REGION_CD: "L01",
    INT_NM: "시청",
    UPD_DTIME: "2024-07-01 10:09:54"
  }
];

const DETAIL_RESPONSE = [
  {
    pageNo: "1",
    resultCode: "0",
    totalCount: "2",
    numOfRows: "10",
    totPage: "1",
    resultMsg: "NORMAL_SERVICE"
  },
  {
    INT_MAINPHASE: "1",
    REGION_CD: "L01",
    INT_NM: "시청",
    INT_NO: "2904",
    MAP_NO: "0",
    A_RING_1_PHASE_CONF_CD: "S194014",
    A_RING_2_PHASE_CONF_CD: "S014193",
    A_RING_3_PHASE_CONF_CD: "L250014",
    A_RING_4_PHASE_CONF_CD: null,
    B_RING_1_PHASE_CONF_CD: "S014193",
    B_RING_2_PHASE_CONF_CD: "S014193",
    B_RING_3_PHASE_CONF_CD: "S252097",
    B_RING_4_PHASE_CONF_CD: null
  },
  {
    INT_MAINPHASE: "1",
    REGION_CD: "L01",
    INT_NM: "시청",
    INT_NO: "2904",
    MAP_NO: "1",
    A_RING_1_PHASE_CONF_CD: "S194014",
    A_RING_2_PHASE_CONF_CD: "L249012",
    A_RING_3_PHASE_CONF_CD: null,
    B_RING_1_PHASE_CONF_CD: "S014193",
    B_RING_2_PHASE_CONF_CD: "S252096",
    B_RING_3_PHASE_CONF_CD: null
  }
];

describe("police crossroad info adapter", () => {
  test("normalizes list response as intersection metadata only", () => {
    const evidence = normalizePoliceCrossroadInfoListResponse(LIST_RESPONSE);

    expect(evidence).toEqual({
      result: {
        code: "0",
        message: "NORMAL_SERVICE",
        totalCount: 1
      },
      intersections: [
        {
          regionCode: "L01",
          intersectionNumber: "2904",
          intersectionName: "시청",
          xCoord: "1269769226",
          yCoord: "375640221",
          updatedAt: "2024-07-01 10:09:54"
        }
      ]
    });
  });

  test("normalizes detail response without interpreting phase code semantics", () => {
    const evidence = normalizePoliceCrossroadInfoDetailResponse(DETAIL_RESPONSE);

    expect(evidence).toEqual({
      result: {
        code: "0",
        message: "NORMAL_SERVICE",
        totalCount: 2
      },
      signalPlans: [
        {
          regionCode: "L01",
          intersectionNumber: "2904",
          intersectionName: "시청",
          mapNumber: "0",
          mainPhase: "1",
          aRingPhaseConfigCodes: [
            { phaseNumber: 1, code: "S194014" },
            { phaseNumber: 2, code: "S014193" },
            { phaseNumber: 3, code: "L250014" }
          ],
          bRingPhaseConfigCodes: [
            { phaseNumber: 1, code: "S014193" },
            { phaseNumber: 2, code: "S014193" },
            { phaseNumber: 3, code: "S252097" }
          ]
        },
        {
          regionCode: "L01",
          intersectionNumber: "2904",
          intersectionName: "시청",
          mapNumber: "1",
          mainPhase: "1",
          aRingPhaseConfigCodes: [
            { phaseNumber: 1, code: "S194014" },
            { phaseNumber: 2, code: "L249012" }
          ],
          bRingPhaseConfigCodes: [
            { phaseNumber: 1, code: "S014193" },
            { phaseNumber: 2, code: "S252096" }
          ]
        }
      ]
    });
  });

  test("builds project evidence while preserving live-input blockers", () => {
    const evidence = buildPoliceCrossroadInfoMetadataEvidence({
      listResponse: LIST_RESPONSE,
      detailResponse: DETAIL_RESPONSE
    });

    expect(evidence).toEqual({
      source: "police_crossroad_info_metadata",
      schemaVersion: "police-crossroad-info-metadata.v1",
      service: {
        name: "경찰청_교차로기반정보서비스",
        endpoint: "https://apis.data.go.kr/1320000/CrossRoadInfoService"
      },
      status: "metadata_available",
      adapterBoundary: "live-input.v1",
      evidenceScope: "intersection_and_signal_plan_metadata",
      normalizedCounts: {
        intersections: 1,
        signalPlans: 2
      },
      sampleIntersection: {
        regionCode: "L01",
        intersectionNumber: "2904",
        intersectionName: "시청"
      },
      requiredBeforeLiveDropIn: [
        "fresh camera detector output",
        "camera-to-approach direction calibration",
        "current signal timing snapshot"
      ],
      limitations: [
        "does not prove live CCTV detections",
        "does not prove emergency vehicle telemetry",
        "does not prove camera-to-approach direction calibration",
        "does not directly select a live-input.v1 currentPhase"
      ]
    });
  });
});
