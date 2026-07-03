const DETECTION_CLASS_LABELS = [
  "vehicle",
  "emergency_vehicle",
  "pedestrian",
  "stalled_vehicle"
] as const;
const DIRECTIONS = ["north", "south", "east", "west"] as const;
const SIGNAL_PHASES = [
  "north_priority",
  "south_priority",
  "east_priority",
  "west_priority",
  "normal_cycle"
] as const;
const CONTROLLER_MODES = ["adaptive", "fixed", "manual"] as const;

export function buildRealSampleSourceSchemaExport({
  generatedAt = new Date().toISOString()
}: {
  generatedAt?: string;
} = {}) {
  return {
    source: "real_sample_source_schema",
    schemaVersion: "real-sample-source-schema.v1",
    generatedAt,
    adapterBoundary: "live-input.v1",
    buildCommands: {
      signalSnapshot:
        "npm run real-sample:build-signal-snapshot -- <seoul-v2x-response.json> <signal-snapshot.json> <nextPhase> <controllerMode> <manualOverride>",
      nationalSignalSnapshot:
        "npm run real-sample:build-national-signal-snapshot -- <national-tl-drct-info-response.json> <signal-snapshot.json> <crsrdId> <nextPhase> <controllerMode> <manualOverride>",
      cameraEnvelope:
        "npm run real-sample:build-camera-envelope -- <detector-output.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>",
      prepareLiveInput:
        "npm run real-sample:prepare-live-input -- <detector-output.json> <camera-calibration.json> <seoul-v2x-response.json> <signal-snapshot.json> <live-input-envelope.json> <nextPhase> <controllerMode> <manualOverride>"
    },
    sourceSchemas: {
      "authorized-camera-detector-output.v1": {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "authorized-camera-detector-output.v1",
        type: "object",
        additionalProperties: false,
        required: [
          "source",
          "schemaVersion",
          "intersectionId",
          "cameraId",
          "frameId",
          "capturedAt",
          "detections"
        ],
        properties: {
          source: { const: "authorized_camera_detector_output" },
          schemaVersion: { const: "authorized-camera-detector-output.v1" },
          intersectionId: { type: "string", minLength: 1 },
          cameraId: { type: "string", minLength: 1 },
          frameId: { type: "string", minLength: 1 },
          capturedAt: { type: "string", format: "date-time" },
          detections: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["objectId", "classLabel", "confidence", "count"],
              properties: {
                objectId: { type: "string", minLength: 1 },
                classLabel: { type: "string", enum: DETECTION_CLASS_LABELS },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                count: { type: "integer", minimum: 0 },
                distanceMeters: { type: "number" },
                waitingSeconds: { type: "number" }
              }
            }
          }
        }
      },
      "camera-approach-calibration.v1": {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "camera-approach-calibration.v1",
        type: "object",
        additionalProperties: false,
        required: ["source", "schemaVersion", "mappings"],
        properties: {
          source: { const: "operator_camera_survey" },
          schemaVersion: { const: "camera-approach-calibration.v1" },
          mappings: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "intersectionId",
                "cameraId",
                "approachDirection",
                "evidence"
              ],
              properties: {
                intersectionId: { type: "string", minLength: 1 },
                cameraId: { type: "string", minLength: 1 },
                approachDirection: { type: "string", enum: DIRECTIONS },
                evidence: { type: "string", minLength: 1 }
              }
            }
          }
        }
      },
      "seoul-v2x-signal-response.v1": {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "Seoul V2X signal API response",
        oneOf: [
          {
            type: "array",
            minItems: 1,
            items: buildSeoulV2xMessageSchema()
          },
          buildSeoulV2xMessageSchema()
        ]
      },
      "national-traffic-signal-response.v1": {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "National traffic-signal tl_drct_info response",
        type: "object",
        additionalProperties: true,
        required: ["response"],
        properties: {
          response: {
            type: "object",
            additionalProperties: true,
            required: ["body"],
            properties: {
              body: {
                type: "object",
                additionalProperties: true,
                required: ["items"],
                properties: {
                  items: {
                    type: "object",
                    additionalProperties: true,
                    required: ["item"],
                    properties: {
                      item: {
                        type: "array",
                        minItems: 1,
                        items: buildNationalTrafficSignalRowSchema()
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "signal-snapshot-input.v1": {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "LiveSignalSnapshot",
        type: "object",
        additionalProperties: false,
        required: [
          "controllerId",
          "capturedAt",
          "currentPhase",
          "remainingSeconds",
          "nextPhase",
          "controllerMode",
          "manualOverride"
        ],
        properties: {
          controllerId: { type: "string", minLength: 1 },
          capturedAt: { type: "string", format: "date-time" },
          currentPhase: { type: "string", enum: SIGNAL_PHASES },
          remainingSeconds: { type: "integer", minimum: 0 },
          nextPhase: { type: "string", enum: SIGNAL_PHASES },
          controllerMode: { type: "string", enum: CONTROLLER_MODES },
          manualOverride: { type: "boolean" }
        }
      },
      "police-crossroad-info-list-response.v1": {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "Police CrossRoadInfo getCrossRoadInfoList response",
        type: "array",
        minItems: 2,
        items: {
          anyOf: [
            buildPoliceCrossroadHeaderSchema(),
            {
              type: "object",
              additionalProperties: true,
              required: [
                "REGION_CD",
                "INT_NO",
                "INT_NM",
                "X_COORD",
                "Y_COORD",
                "UPD_DTIME"
              ],
              properties: {
                REGION_CD: { type: "string", minLength: 1 },
                INT_NO: { type: "string", minLength: 1 },
                INT_NM: { type: "string", minLength: 1 },
                X_COORD: { type: "string", minLength: 1 },
                Y_COORD: { type: "string", minLength: 1 },
                UPD_DTIME: { type: "string", minLength: 1 }
              }
            }
          ]
        }
      },
      "police-crossroad-info-detail-response.v1": {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "Police CrossRoadInfo getCrossRoadInfoDetail response",
        type: "array",
        minItems: 2,
        items: {
          anyOf: [
            buildPoliceCrossroadHeaderSchema(),
            {
              type: "object",
              additionalProperties: true,
              required: [
                "REGION_CD",
                "INT_NO",
                "INT_NM",
                "MAP_NO",
                "INT_MAINPHASE"
              ],
              properties: {
                REGION_CD: { type: "string", minLength: 1 },
                INT_NO: { type: "string", minLength: 1 },
                INT_NM: { type: "string", minLength: 1 },
                MAP_NO: { type: "string", minLength: 1 },
                INT_MAINPHASE: { type: "string", minLength: 1 }
              }
            }
          ]
        }
      }
    },
    guardrailNotes: [
      "source schemas describe file shape only; freshness, provenance, and policy guardrails still run through real-sample:check",
      "camera approach direction must come from camera-approach-calibration.v1, not from detector guesses",
      "T-DATA remaining-time rows do not prove nextPhase, controllerMode, or manualOverride",
      "National traffic signal rows can build signal snapshots only after a key-backed tl_drct_info row proves same-intersection coverage",
      "Police CrossRoadInfo responses provide intersection and signal-plan metadata only; they do not prove live detections, emergency telemetry, camera calibration, or currentPhase"
    ]
  } as const;
}

function buildSeoulV2xMessageSchema() {
  return {
    type: "object",
    additionalProperties: true,
    required: ["dataId", "trsmUtcTime", "itstId", "eqmnId"],
    properties: {
      dataId: { type: "string", minLength: 1 },
      trsmUtcTime: {
        anyOf: [{ type: "number" }, { type: "string", minLength: 1 }]
      },
      itstId: {
        anyOf: [{ type: "number" }, { type: "string", minLength: 1 }]
      },
      eqmnId: { type: "string", minLength: 1 },
      ntStsgRmdrCs: {
        anyOf: [{ type: "number" }, { type: "string" }, { type: "null" }]
      },
      etStsgRmdrCs: {
        anyOf: [{ type: "number" }, { type: "string" }, { type: "null" }]
      },
      stStsgRmdrCs: {
        anyOf: [{ type: "number" }, { type: "string" }, { type: "null" }]
      },
      wtStsgRmdrCs: {
        anyOf: [{ type: "number" }, { type: "string" }, { type: "null" }]
      }
    }
  } as const;
}

function buildNationalTrafficSignalRowSchema() {
  return {
    type: "object",
    additionalProperties: true,
    required: ["stdgCd", "lclgvNm", "crsrdId", "totDt"],
    properties: {
      stdgCd: { type: "string", minLength: 1 },
      lclgvNm: { type: "string", minLength: 1 },
      crsrdId: { type: "string", minLength: 1 },
      crsrdNm: {
        anyOf: [{ type: "string" }, { type: "null" }]
      },
      totDt: { type: "string", minLength: 14 },
      ntStsgRmndCs: {
        anyOf: [{ type: "number" }, { type: "string" }, { type: "null" }]
      },
      etStsgRmndCs: {
        anyOf: [{ type: "number" }, { type: "string" }, { type: "null" }]
      },
      stStsgRmndCs: {
        anyOf: [{ type: "number" }, { type: "string" }, { type: "null" }]
      },
      wtStsgRmndCs: {
        anyOf: [{ type: "number" }, { type: "string" }, { type: "null" }]
      }
    }
  } as const;
}

function buildPoliceCrossroadHeaderSchema() {
  return {
    type: "object",
    additionalProperties: true,
    required: ["resultCode", "resultMsg", "totalCount"],
    properties: {
      resultCode: { type: "string", minLength: 1 },
      resultMsg: { type: "string", minLength: 1 },
      totalCount: {
        anyOf: [{ type: "number" }, { type: "string", minLength: 1 }]
      }
    }
  } as const;
}
