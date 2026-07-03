const SERVICE_ENDPOINT =
  "https://apis.data.go.kr/1320000/CrossRoadInfoService";

type PoliceCrossroadResult = {
  code: string;
  message: string;
  totalCount: number;
};

export type PoliceCrossroadInfoListEvidence = {
  result: PoliceCrossroadResult;
  intersections: {
    regionCode: string;
    intersectionNumber: string;
    intersectionName: string;
    xCoord: string;
    yCoord: string;
    updatedAt: string;
  }[];
};

export type PoliceCrossroadInfoDetailEvidence = {
  result: PoliceCrossroadResult;
  signalPlans: {
    regionCode: string;
    intersectionNumber: string;
    intersectionName: string;
    mapNumber: string;
    mainPhase: string;
    aRingPhaseConfigCodes: PoliceCrossroadPhaseCode[];
    bRingPhaseConfigCodes: PoliceCrossroadPhaseCode[];
  }[];
};

export type PoliceCrossroadPhaseCode = {
  phaseNumber: number;
  code: string;
};

export type PoliceCrossroadInfoMetadataEvidence = {
  source: "police_crossroad_info_metadata";
  schemaVersion: "police-crossroad-info-metadata.v1";
  service: {
    name: "경찰청_교차로기반정보서비스";
    endpoint: typeof SERVICE_ENDPOINT;
  };
  status: "metadata_available";
  adapterBoundary: "live-input.v1";
  evidenceScope: "intersection_and_signal_plan_metadata";
  normalizedCounts: {
    intersections: number;
    signalPlans: number;
  };
  sampleIntersection: {
    regionCode: string;
    intersectionNumber: string;
    intersectionName: string;
  } | null;
  requiredBeforeLiveDropIn: [
    "fresh camera detector output",
    "camera-to-approach direction calibration",
    "current signal timing snapshot"
  ];
  limitations: [
    "does not prove live CCTV detections",
    "does not prove emergency vehicle telemetry",
    "does not prove camera-to-approach direction calibration",
    "does not directly select a live-input.v1 currentPhase"
  ];
};

const DEFAULT_LIST_RESPONSE = [
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

const DEFAULT_DETAIL_RESPONSE = [
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
    B_RING_1_PHASE_CONF_CD: "S014193",
    B_RING_2_PHASE_CONF_CD: "S014193",
    B_RING_3_PHASE_CONF_CD: "S252097"
  },
  {
    INT_MAINPHASE: "1",
    REGION_CD: "L01",
    INT_NM: "시청",
    INT_NO: "2904",
    MAP_NO: "1",
    A_RING_1_PHASE_CONF_CD: "S194014",
    A_RING_2_PHASE_CONF_CD: "L249012",
    B_RING_1_PHASE_CONF_CD: "S014193",
    B_RING_2_PHASE_CONF_CD: "S252096"
  }
];

export function buildDefaultPoliceCrossroadInfoMetadataEvidence() {
  return buildPoliceCrossroadInfoMetadataEvidence({
    listResponse: DEFAULT_LIST_RESPONSE,
    detailResponse: DEFAULT_DETAIL_RESPONSE
  });
}

export function buildPoliceCrossroadInfoMetadataEvidence({
  listResponse,
  detailResponse
}: {
  listResponse: unknown;
  detailResponse: unknown;
}): PoliceCrossroadInfoMetadataEvidence {
  const listEvidence = normalizePoliceCrossroadInfoListResponse(listResponse);
  const detailEvidence =
    normalizePoliceCrossroadInfoDetailResponse(detailResponse);
  const sampleIntersection = listEvidence.intersections[0] ?? null;

  return {
    source: "police_crossroad_info_metadata",
    schemaVersion: "police-crossroad-info-metadata.v1",
    service: {
      name: "경찰청_교차로기반정보서비스",
      endpoint: SERVICE_ENDPOINT
    },
    status: "metadata_available",
    adapterBoundary: "live-input.v1",
    evidenceScope: "intersection_and_signal_plan_metadata",
    normalizedCounts: {
      intersections: listEvidence.intersections.length,
      signalPlans: detailEvidence.signalPlans.length
    },
    sampleIntersection: sampleIntersection
      ? {
          regionCode: sampleIntersection.regionCode,
          intersectionNumber: sampleIntersection.intersectionNumber,
          intersectionName: sampleIntersection.intersectionName
        }
      : null,
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
  };
}

export function normalizePoliceCrossroadInfoListResponse(
  input: unknown
): PoliceCrossroadInfoListEvidence {
  const { header, rows } = splitPoliceCrossroadResponse(input);

  return {
    result: normalizeHeader(header),
    intersections: rows.map((row) => ({
      regionCode: requireNonEmptyString(row.REGION_CD, "REGION_CD"),
      intersectionNumber: requireNonEmptyString(row.INT_NO, "INT_NO"),
      intersectionName: requireNonEmptyString(row.INT_NM, "INT_NM"),
      xCoord: requireNonEmptyString(row.X_COORD, "X_COORD"),
      yCoord: requireNonEmptyString(row.Y_COORD, "Y_COORD"),
      updatedAt: requireNonEmptyString(row.UPD_DTIME, "UPD_DTIME")
    }))
  };
}

export function normalizePoliceCrossroadInfoDetailResponse(
  input: unknown
): PoliceCrossroadInfoDetailEvidence {
  const { header, rows } = splitPoliceCrossroadResponse(input);

  return {
    result: normalizeHeader(header),
    signalPlans: rows.map((row) => ({
      regionCode: requireNonEmptyString(row.REGION_CD, "REGION_CD"),
      intersectionNumber: requireNonEmptyString(row.INT_NO, "INT_NO"),
      intersectionName: requireNonEmptyString(row.INT_NM, "INT_NM"),
      mapNumber: requireNonEmptyString(row.MAP_NO, "MAP_NO"),
      mainPhase: requireNonEmptyString(row.INT_MAINPHASE, "INT_MAINPHASE"),
      aRingPhaseConfigCodes: collectRingPhaseConfigCodes(row, "A"),
      bRingPhaseConfigCodes: collectRingPhaseConfigCodes(row, "B")
    }))
  };
}

function splitPoliceCrossroadResponse(input: unknown) {
  const records = requireArray(input, "Police CrossRoadInfo API response").map(
    (entry) => requireRecord(entry, "Police CrossRoadInfo API row")
  );

  if (records.length === 0) {
    throw new Error("Police CrossRoadInfo API response must not be empty");
  }

  return {
    header: records[0],
    rows: records.slice(1)
  };
}

function normalizeHeader(header: Record<string, unknown>) {
  return {
    code: requireNonEmptyString(header.resultCode, "resultCode"),
    message: requireNonEmptyString(header.resultMsg, "resultMsg"),
    totalCount: requireFiniteNumber(header.totalCount, "totalCount")
  };
}

function collectRingPhaseConfigCodes(
  row: Record<string, unknown>,
  ring: "A" | "B"
) {
  const prefix = `${ring}_RING_`;

  return Array.from({ length: 8 }, (_, index) => {
    const phaseNumber = index + 1;
    const value = row[`${prefix}${phaseNumber}_PHASE_CONF_CD`];
    if (value === null || value === undefined || String(value).trim() === "") {
      return null;
    }
    return {
      phaseNumber,
      code: String(value).trim()
    };
  }).filter((entry): entry is PoliceCrossroadPhaseCode => Boolean(entry));
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireFiniteNumber(value: unknown, label: string): number {
  const numberValue =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${label} must be a finite number`);
  }
  return numberValue;
}
