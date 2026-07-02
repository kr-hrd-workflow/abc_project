import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { runDemoHealthCheck } from "./demo-health-check.mjs";

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    }
  };
}

function htmlResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return JSON.parse(body);
    },
    async text() {
      return body;
    }
  };
}

function buildLiveInputEnvelope() {
  return {
    schemaVersion: "live-input.v1",
    intersectionId: "INT-REAL-SAMPLE-0001",
    receivedAt: "2026-07-01T09:10:01.000Z",
    cameraFrames: [
      {
        cameraId: "authorized-cctv-east-01",
        frameId: "authorized-frame-0001",
        capturedAt: "2026-07-01T09:10:00.000Z",
        detections: [
          {
            objectId: "det-emergency-001",
            classLabel: "emergency_vehicle",
            confidence: 0.96,
            direction: "east",
            laneId: "east_approach_1",
            count: 1,
            distanceMeters: 70
          }
        ]
      }
    ],
    signalSnapshot: {
      controllerId: "signal-controller-real-01",
      capturedAt: "2026-07-01T09:10:00.000Z",
      currentPhase: "east_priority",
      remainingSeconds: 18,
      nextPhase: "normal_cycle",
      controllerMode: "adaptive",
      manualOverride: false
    }
  };
}

describe("demo health check", () => {
  test("passes when dashboard, API, exports, and OpenAI readiness are available", async () => {
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
      calls.push(url);
      if (url === "http://web.local/dashboard") {
        return htmlResponse(200, "<html>dashboard</html>");
      }
      if (url === "http://web.local/api/live-input-fixture") {
        return jsonResponse(200, {
          source: "local_fixture_adapter",
          schemaVersion: "live-input.v1",
          replaySummary: { status: "replay_input_ready" }
        });
      }
      if (url === "http://web.local/api/source-live-input-fixture") {
        return jsonResponse(200, {
          source: "source_specific_adapter_fixture",
          sourceFormats: {
            detector: "road-vision.fixture.v1",
            signal: "signal-controller.fixture.v1"
          },
          envelope: { schemaVersion: "live-input.v1" },
          replaySummary: {
            status: "replay_input_ready",
            detectionTypes: ["emergency_vehicle"]
          }
        });
      }
      if (url === "http://web.local/api/demo-evidence-export") {
        return jsonResponse(200, {
          source: "demo_evidence_export",
          schemaVersion: "demo-evidence.v1",
          syntheticBenchmark: {
            totalCases: 5000,
            passedCases: 5000,
            failedCases: 0
          },
          liveInputJsonSuites: [
            { id: "10k", totalCases: 10000, passedCases: 10000, failedCases: 0 }
          ],
          liveInputGuardrails: { guardedCases: 5, missedCases: 0 },
          sourceAdapter: { replayStatus: "replay_input_ready" },
          realSampleReadiness: {
            status: "signal_ready_waiting_for_fresh_camera_and_calibration",
            adapterBoundary: "live-input.v1",
            dropInEndpoint: "/api/real-sample-drop-in"
          }
        });
      }
      if (url === "http://web.local/api/policy-scorecard-contract") {
        return jsonResponse(200, {
          source: "policy_scorecard_contract",
          schemaVersion: "policy-scorecard-contract.v1",
          operatorWorkflowSource: "policy_scorecard",
          adapterBoundary: "live-input.v1",
          decisionBoundary: "operator_decision_support_not_signal_control",
          scorecardBackedPolicies: [
            "safety_gate",
            "emergency_clearance",
            "safety_hold",
            "queue_relief",
            "pedestrian_efficiency",
            "maintain_cycle"
          ],
          decisionOrder: [
            "safety_gate",
            "safety_hold",
            "emergency_clearance",
            "queue_relief",
            "pedestrian_efficiency",
            "maintain_cycle"
          ],
          scoringConstants: {
            queueThreshold: 25,
            safetyGateAllRedSeconds: 10,
            unknownEmergencyDirectionAllRedSeconds: 6,
            conflictingQueueAxesAllRedSeconds: 6
          },
          policyCount: 6,
          requiredEvidence: ["selected_policy", "operator_note"],
          supportedStatuses: [
            "approval_review_ready",
            "manual_review_required"
          ]
        });
      }
      if (url === "http://web.local/api/final-local-readiness") {
        return jsonResponse(200, {
          source: "final_local_readiness_reconciliation",
          schemaVersion: "final-local-readiness.v1",
          localRehearsalStatus: "ready_for_local_rehearsal",
          realSampleStatus: "signal_ready_waiting_for_fresh_camera_and_calibration",
          decisionBoundary: "operator_decision_support_not_signal_control",
          adapterBoundary: "live-input.v1",
          healthCheck: { expectedSummary: "15/15 checks passed" },
          evidenceEndpoints: [
            "/api/demo-evidence-export",
            "/api/policy-scorecard-contract",
            "/api/llm-explanation-contract",
            "/api/live-input-submission-schema",
            "/api/real-sample-drop-in"
          ],
          localEvidence: {
            syntheticBenchmark: "5000/5000",
            liveInputJson: "10000/10000",
            guardrails: "6 guarded / 0 misses",
            scorecardPolicies: 6,
            sourceAdapterReplayStatus: "replay_input_ready"
          },
          blockers: [
            "fresh_camera_frame_required_for_live_drop_in",
            "camera_approach_calibration_required"
          ]
        });
      }
      if (url === "http://web.local/api/llm-explanation-contract") {
        return jsonResponse(200, {
          source: "llm_explanation_contract",
          schemaVersion: "llm-explanation-contract.v1",
          role: "explanation_review_only",
          decisionSource: "local_policy_scorecard",
          decisionBoundary: "operator_decision_support_not_signal_control",
          noOpenAICallRequired: true,
          evidenceEndpoints: ["/api/policy-scorecard-contract"],
          prohibitedResponsibilities: ["choose a signal plan independently"],
          evaluationCriteria: [
            "simulation_only_boundary",
            "no_real_signal_control",
            "policy_evidence_grounding"
          ]
        });
      }
      if (url === "http://web.local/api/real-sample-intake-package") {
        return jsonResponse(200, {
          source: "real_sample_intake_package",
          schemaVersion: "real-sample-intake-package.v1",
          status: "signal_ready_waiting_for_fresh_camera_and_calibration",
          adapterBoundary: "live-input.v1",
          dropInEndpoint: "/api/real-sample-drop-in",
          schemaEndpoint: "/api/live-input-submission-schema",
          finalReadinessEndpoint: "/api/final-local-readiness",
          noPersistence: true,
          sampleSlotIds: [
            "authorized_cctv_frame_or_video",
            "signal_phase_remaining_time",
            "detector_output"
          ],
          envelopeRequirements: {
            requiredTopLevelFields: ["schemaVersion", "cameraFrames", "signalSnapshot"],
            requiredSignalFields: ["remainingSeconds"]
          },
          validationGuardrails: [
            "manual review when any detection confidence is below 0.5"
          ],
          prohibitedInputs: ["raw stream credentials"]
        });
      }
      if (url === "http://web.local/api/live-input-submission-schema") {
        return jsonResponse(200, {
          source: "live_input_submission_schema",
          schemaVersion: "live-input-submission-schema.v1",
          adapterBoundary: "live-input.v1",
          dropInEndpoint: "/api/real-sample-drop-in",
          decisionBoundary: "operator_decision_support_not_signal_control",
          jsonSchema: {
            required: [
              "schemaVersion",
              "intersectionId",
              "receivedAt",
              "cameraFrames",
              "signalSnapshot"
            ],
            properties: {
              schemaVersion: { const: "live-input.v1" },
              signalSnapshot: { type: "object" }
            }
          },
          guardrailNotes: [
            "schema requires a signal snapshot because /api/real-sample-drop-in validates replay-ready submissions"
          ]
        });
      }
      if (url === "http://web.local/api/real-sample-drop-in") {
        if (options.method === "POST") {
          return jsonResponse(200, {
            source: "real_sample_drop_in_validation",
            accepted: true,
            replayStatus: "replay_input_ready",
            recommendation: "emergency_priority",
            operatorWorkflowStatus: "approval_review_ready",
            operatorWorkflow: {
              source: "policy_scorecard",
              contractEndpoint: "/api/policy-scorecard-contract",
              status: "approval_review_ready",
              selectedPolicy: "emergency_clearance",
              confidence: "high",
              requiredInputs: [],
              blockedReasons: []
            }
          });
        }
        return jsonResponse(200, {
          source: "real_sample_drop_in_readiness",
          schemaVersion: "real-sample-drop-in.v1",
          status: "signal_ready_waiting_for_fresh_camera_and_calibration",
          adapterBoundary: "live-input.v1",
          sampleSlots: [
            { id: "authorized_cctv_frame_or_video" },
            { id: "signal_phase_remaining_time" },
            { id: "detector_output" }
          ],
          validationFlow: ["run local recommendation policy"]
        });
      }
      if (url === "http://web.local/api/synthetic-benchmark-export") {
        return jsonResponse(200, {
          source: "synthetic_benchmark",
          report: { totalCases: 5000, passedCases: 5000, failedCases: 0 }
        });
      }
      if (url === "http://web.local/api/synthetic-live-input-export?size=1k") {
        return jsonResponse(200, {
          source: "synthetic_live_input_json",
          schemaVersion: "live-input.v1",
          dataset: Array.from({ length: 1000 }, (_, index) => ({ id: `case-${index}` })),
          evaluation: { totalCases: 1000, passedCases: 1000, failedCases: 0 }
        });
      }
      if (url === "http://api.local/health") {
        return jsonResponse(200, { status: "ok" });
      }
      if (url === "http://api.local/api/runtime/readiness?section=openai") {
        return jsonResponse(200, {
          openai: { ready: true, mode: "gpt-5.5", missing: [] }
        });
      }
      throw new Error(`unexpected URL ${url}`);
    };

    const result = await runDemoHealthCheck({
      fetchImpl,
      webBaseUrl: "http://web.local",
      apiBaseUrl: "http://api.local"
    });

    assert.equal(result.passed, true);
    assert.equal(result.checks.length, 15);
    assert.deepEqual(
      result.checks.map((check) => check.name),
      [
        "web dashboard",
        "live input fixture export",
        "source-specific live input fixture export",
        "demo evidence export",
        "policy scorecard contract export",
        "final local readiness export",
        "llm explanation contract",
        "real sample intake package",
        "live input submission schema",
        "real sample drop-in readiness",
        "real sample drop-in validation",
        "synthetic benchmark export",
        "synthetic live-input JSON export",
        "api health",
        "openai readiness"
      ]
    );
    assert.equal(calls.length, 15);
    const validationCallIndex = calls.indexOf("http://web.local/api/real-sample-drop-in");
    assert.ok(validationCallIndex >= 0);
  });

  test("collects failures without exposing secret values", async () => {
    const fetchImpl = async (url, options = {}) => {
      if (url.endsWith("/dashboard")) {
        return htmlResponse(503, "unavailable");
      }
      if (url.endsWith("/api/live-input-fixture")) {
        return jsonResponse(200, {
          source: "local_fixture_adapter",
          schemaVersion: "live-input.v1",
          replaySummary: { status: "replay_input_ready" }
        });
      }
      if (url.endsWith("/api/source-live-input-fixture")) {
        return jsonResponse(200, {
          source: "source_specific_adapter_fixture",
          sourceFormats: {
            detector: "road-vision.fixture.v1",
            signal: "signal-controller.fixture.v1"
          },
          envelope: { schemaVersion: "live-input.v1" },
          replaySummary: {
            status: "replay_input_ready",
            detectionTypes: ["emergency_vehicle"]
          }
        });
      }
      if (url.endsWith("/api/demo-evidence-export")) {
        return jsonResponse(200, {
          source: "demo_evidence_export",
          schemaVersion: "demo-evidence.v1",
          syntheticBenchmark: {
            totalCases: 5000,
            passedCases: 5000,
            failedCases: 0
          },
          liveInputJsonSuites: [
            { id: "10k", totalCases: 10000, passedCases: 10000, failedCases: 0 }
          ],
          liveInputGuardrails: { guardedCases: 5, missedCases: 0 },
          sourceAdapter: { replayStatus: "replay_input_ready" },
          realSampleReadiness: {
            status: "signal_ready_waiting_for_fresh_camera_and_calibration",
            adapterBoundary: "live-input.v1",
            dropInEndpoint: "/api/real-sample-drop-in"
          }
        });
      }
      if (url.endsWith("/api/policy-scorecard-contract")) {
        return jsonResponse(200, {
          source: "policy_scorecard_contract",
          schemaVersion: "policy-scorecard-contract.v1",
          operatorWorkflowSource: "policy_scorecard",
          adapterBoundary: "live-input.v1",
          decisionBoundary: "operator_decision_support_not_signal_control",
          scorecardBackedPolicies: [
            "safety_gate",
            "emergency_clearance",
            "safety_hold",
            "queue_relief",
            "pedestrian_efficiency",
            "maintain_cycle"
          ],
          decisionOrder: [
            "safety_gate",
            "safety_hold",
            "emergency_clearance",
            "queue_relief",
            "pedestrian_efficiency",
            "maintain_cycle"
          ],
          scoringConstants: {
            queueThreshold: 25,
            safetyGateAllRedSeconds: 10,
            unknownEmergencyDirectionAllRedSeconds: 6,
            conflictingQueueAxesAllRedSeconds: 6
          },
          policyCount: 6,
          requiredEvidence: ["selected_policy", "operator_note"],
          supportedStatuses: [
            "approval_review_ready",
            "manual_review_required"
          ]
        });
      }
      if (url.endsWith("/api/final-local-readiness")) {
        return jsonResponse(200, {
          source: "final_local_readiness_reconciliation",
          schemaVersion: "final-local-readiness.v1",
          localRehearsalStatus: "ready_for_local_rehearsal",
          realSampleStatus: "signal_ready_waiting_for_fresh_camera_and_calibration",
          decisionBoundary: "operator_decision_support_not_signal_control",
          adapterBoundary: "live-input.v1",
          healthCheck: { expectedSummary: "15/15 checks passed" },
          evidenceEndpoints: [
            "/api/demo-evidence-export",
            "/api/policy-scorecard-contract",
            "/api/llm-explanation-contract",
            "/api/live-input-submission-schema",
            "/api/real-sample-drop-in"
          ],
          localEvidence: {
            syntheticBenchmark: "5000/5000",
            liveInputJson: "10000/10000",
            guardrails: "6 guarded / 0 misses",
            scorecardPolicies: 6,
            sourceAdapterReplayStatus: "replay_input_ready"
          },
          blockers: [
            "fresh_camera_frame_required_for_live_drop_in",
            "camera_approach_calibration_required"
          ]
        });
      }
      if (url.endsWith("/api/llm-explanation-contract")) {
        return jsonResponse(200, {
          source: "llm_explanation_contract",
          schemaVersion: "llm-explanation-contract.v1",
          role: "explanation_review_only",
          decisionSource: "local_policy_scorecard",
          decisionBoundary: "operator_decision_support_not_signal_control",
          noOpenAICallRequired: true,
          evidenceEndpoints: ["/api/policy-scorecard-contract"],
          prohibitedResponsibilities: ["choose a signal plan independently"],
          evaluationCriteria: [
            "simulation_only_boundary",
            "no_real_signal_control",
            "policy_evidence_grounding"
          ]
        });
      }
      if (url.endsWith("/api/real-sample-intake-package")) {
        return jsonResponse(200, {
          source: "real_sample_intake_package",
          schemaVersion: "real-sample-intake-package.v1",
          status: "signal_ready_waiting_for_fresh_camera_and_calibration",
          adapterBoundary: "live-input.v1",
          dropInEndpoint: "/api/real-sample-drop-in",
          schemaEndpoint: "/api/live-input-submission-schema",
          finalReadinessEndpoint: "/api/final-local-readiness",
          noPersistence: true,
          sampleSlotIds: [
            "authorized_cctv_frame_or_video",
            "signal_phase_remaining_time",
            "detector_output"
          ],
          envelopeRequirements: {
            requiredTopLevelFields: ["schemaVersion", "cameraFrames", "signalSnapshot"],
            requiredSignalFields: ["remainingSeconds"]
          },
          validationGuardrails: [
            "manual review when any detection confidence is below 0.5"
          ],
          prohibitedInputs: ["raw stream credentials"]
        });
      }
      if (url.endsWith("/api/live-input-submission-schema")) {
        return jsonResponse(200, {
          source: "live_input_submission_schema",
          schemaVersion: "live-input-submission-schema.v1",
          adapterBoundary: "live-input.v1",
          dropInEndpoint: "/api/real-sample-drop-in",
          decisionBoundary: "operator_decision_support_not_signal_control",
          jsonSchema: {
            required: [
              "schemaVersion",
              "intersectionId",
              "receivedAt",
              "cameraFrames",
              "signalSnapshot"
            ],
            properties: {
              schemaVersion: { const: "live-input.v1" },
              signalSnapshot: { type: "object" }
            }
          },
          guardrailNotes: [
            "schema requires a signal snapshot because /api/real-sample-drop-in validates replay-ready submissions"
          ]
        });
      }
      if (url.endsWith("/api/real-sample-drop-in")) {
        if (options.method === "POST") {
          return jsonResponse(200, {
            source: "real_sample_drop_in_validation",
            accepted: true,
            replayStatus: "replay_input_ready",
            recommendation: "emergency_priority",
            operatorWorkflowStatus: "approval_review_ready",
            operatorWorkflow: {
              source: "policy_scorecard",
              contractEndpoint: "/api/policy-scorecard-contract",
              status: "approval_review_ready",
              selectedPolicy: "emergency_clearance",
              confidence: "high",
              requiredInputs: [],
              blockedReasons: []
            }
          });
        }
        return jsonResponse(200, {
          source: "real_sample_drop_in_readiness",
          schemaVersion: "real-sample-drop-in.v1",
          status: "signal_ready_waiting_for_fresh_camera_and_calibration",
          adapterBoundary: "live-input.v1",
          sampleSlots: [
            { id: "authorized_cctv_frame_or_video" },
            { id: "signal_phase_remaining_time" },
            { id: "detector_output" }
          ],
          validationFlow: ["run local recommendation policy"]
        });
      }
      if (url.endsWith("/api/synthetic-benchmark-export")) {
        return jsonResponse(200, {
          source: "synthetic_benchmark",
          report: { totalCases: 5000, passedCases: 4999, failedCases: 1 }
        });
      }
      if (url.endsWith("/api/synthetic-live-input-export")) {
        return jsonResponse(200, {
          source: "synthetic_live_input_json",
          schemaVersion: "live-input.v1",
          dataset: [],
          evaluation: { totalCases: 1000, passedCases: 999, failedCases: 1 }
        });
      }
      if (url.endsWith("/health")) {
        return jsonResponse(200, { status: "ok" });
      }
      return jsonResponse(200, {
        openai: {
          ready: false,
          mode: "unavailable",
          missing: ["OPENAI_API_KEY", "OPENAI_MONTHLY_BUDGET_USD"]
        }
      });
    };

    const result = await runDemoHealthCheck({
      fetchImpl,
      webBaseUrl: "http://web.local",
      apiBaseUrl: "http://api.local"
    });

    assert.equal(result.passed, false);
    assert.equal(result.checks.filter((check) => !check.passed).length, 4);
    assert.match(
      result.checks.find((check) => check.name === "openai readiness")?.detail ?? "",
      /restart the API/i
    );
    assert.match(result.summary, /11\/15 checks passed/);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(["sk", "proj"].join("-")));
  });
});
