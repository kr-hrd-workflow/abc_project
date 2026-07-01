export function buildLiveInputSubmissionSchemaExport({
  generatedAt = new Date().toISOString()
}: {
  generatedAt?: string;
} = {}) {
  return {
    source: "live_input_submission_schema",
    schemaVersion: "live-input-submission-schema.v1",
    generatedAt,
    adapterBoundary: "live-input.v1",
    dropInEndpoint: "/api/real-sample-drop-in",
    decisionBoundary: "operator_decision_support_not_signal_control",
    jsonSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "live-input.v1 replay-ready submission envelope",
      type: "object",
      additionalProperties: false,
      required: [
        "schemaVersion",
        "intersectionId",
        "receivedAt",
        "cameraFrames",
        "signalSnapshot"
      ],
      properties: {
        schemaVersion: { const: "live-input.v1" },
        intersectionId: { type: "string", minLength: 1 },
        receivedAt: { type: "string", format: "date-time" },
        cameraFrames: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["cameraId", "frameId", "capturedAt", "detections"],
            properties: {
              cameraId: { type: "string", minLength: 1 },
              frameId: { type: "string", minLength: 1 },
              capturedAt: { type: "string", format: "date-time" },
              detections: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "objectId",
                    "classLabel",
                    "confidence",
                    "direction",
                    "laneId",
                    "count"
                  ],
                  properties: {
                    objectId: { type: "string", minLength: 1 },
                    classLabel: {
                      type: "string",
                      enum: [
                        "vehicle",
                        "emergency_vehicle",
                        "pedestrian",
                        "stalled_vehicle"
                      ]
                    },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    direction: {
                      type: "string",
                      enum: ["north", "south", "east", "west"]
                    },
                    laneId: { type: "string", minLength: 1 },
                    count: { type: "integer", minimum: 0 },
                    distanceMeters: { type: "number" },
                    waitingSeconds: { type: "number" }
                  }
                }
              }
            }
          }
        },
        signalSnapshot: {
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
            currentPhase: {
              type: "string",
              enum: [
                "north_priority",
                "south_priority",
                "east_priority",
                "west_priority",
                "normal_cycle"
              ]
            },
            remainingSeconds: { type: "integer", minimum: 0 },
            nextPhase: {
              type: "string",
              enum: [
                "north_priority",
                "south_priority",
                "east_priority",
                "west_priority",
                "normal_cycle"
              ]
            },
            controllerMode: {
              type: "string",
              enum: ["adaptive", "fixed", "manual"]
            },
            manualOverride: { type: "boolean" }
          }
        }
      }
    },
    guardrailNotes: [
      "schema allows confidence values from 0 to 1; policy guardrail routes values below 0.5 to manual review",
      "schema accepts date-time strings; policy guardrail routes stale signal snapshots to manual review",
      "schema requires a signal snapshot because /api/real-sample-drop-in validates replay-ready submissions",
      "schema shape validation does not imply autonomous signal control"
    ]
  } as const;
}
