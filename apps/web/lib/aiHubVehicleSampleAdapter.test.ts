import { describe, expect, test } from "vitest";

import {
  buildAiHubVehicleEvidence,
  buildAiHubVehicleLiveInputEnvelope,
  buildAiHubVehicleLiveInputEnvelopeFromCalibration
} from "./aiHubVehicleSampleAdapter";

const AI_HUB_VEHICLE_LABEL = {
  "Raw Data Info": {
    raw_data_id: "C-221008_14_CR06_01",
    location_id: "cr06",
    location_name: "호계사거리",
    cctv_number: "01",
    resolution: "3840, 2160",
    date: "2022-10-08",
    cctv_gps: [37.3705, 126.9578]
  },
  "Source Data Info": {
    source_data_id: "C-221008_14_CR06_01_A0341",
    extract_time: "14:47:47",
    file_extension: "jpg"
  },
  "Learning Data Info": {
    path: "/차종외관인식/교차로/[cr06]호계사거리/01번",
    json_data_id: "C-221008_14_CR06_01_A0341",
    annotations: [
      {
        class_id: "car-03",
        type: "bbox",
        coord: [1890.59, 1201.74, 247.39, 290.47],
        brand_id: "kia"
      },
      {
        class_id: "car-01",
        type: "bbox",
        coord: [2279.43, 1393.84, 292.8, 263.68],
        brand_id: "kia",
        model_id: "ev6_ev6(2021)"
      },
      {
        class_id: "unknown",
        type: "polygon",
        coord: [0, 0, 1, 1]
      }
    ]
  }
};

describe("AI-Hub vehicle sample adapter", () => {
  test("summarizes authorized vehicle bbox labels without inventing replay inputs", () => {
    const evidence = buildAiHubVehicleEvidence(AI_HUB_VEHICLE_LABEL);

    expect(evidence).toEqual({
      source: "aihub_vehicle_sample",
      schemaVersion: "aihub-vehicle-sample.v1",
      dataset: {
        id: "71573",
        name: "CCTV 기반 차량정보 및 교통정보 계측 데이터",
        sampleKind: "AI-Hub sample(light)"
      },
      sourceFrame: {
        frameId: "C-221008_14_CR06_01_A0341",
        rawDataId: "C-221008_14_CR06_01",
        locationId: "cr06",
        locationName: "호계사거리",
        cameraId: "aihub-cr06-01",
        capturedAt: "2022-10-08T14:47:47.000+09:00",
        imageExtension: "jpg",
        resolution: {
          width: 3840,
          height: 2160
        },
        gps: {
          latitude: 37.3705,
          longitude: 126.9578
        }
      },
      detectorSummary: {
        vehicleBoxCount: 2,
        classCounts: {
          "car-01": 1,
          "car-03": 1
        },
        confidence: "label_ground_truth",
        canPopulateDetections: true
      },
      replayReadiness: {
        status: "needs_direction_and_signal_calibration",
        adapterBoundary: "live-input.v1",
        missingInputs: [
          "approach_direction_by_camera",
          "signal_phase_remaining_time"
        ],
        reason:
          "AI-Hub vehicle appearance labels provide authorized frame and bbox evidence but do not include approach direction or signal phase."
      }
    });
  });

  test("builds live-input.v1 only when direction and signal calibration are provided", () => {
    const envelope = buildAiHubVehicleLiveInputEnvelope(AI_HUB_VEHICLE_LABEL, {
      approachDirection: "east",
      receivedAt: "2026-07-02T01:55:00.000Z",
      signalSnapshot: {
        controllerId: "td-seoul-v2x-cr06",
        capturedAt: "2026-07-02T01:54:52.000Z",
        currentPhase: "east_priority",
        remainingSeconds: 18,
        nextPhase: "normal_cycle",
        controllerMode: "adaptive",
        manualOverride: false
      }
    });

    expect(envelope).toEqual({
      schemaVersion: "live-input.v1",
      intersectionId: "AIHUB-cr06",
      receivedAt: "2026-07-02T01:55:00.000Z",
      cameraFrames: [
        {
          cameraId: "aihub-cr06-01",
          frameId: "C-221008_14_CR06_01_A0341",
          capturedAt: "2022-10-08T14:47:47.000+09:00",
          detections: [
            {
              objectId: "C-221008_14_CR06_01_A0341-vehicle-001",
              classLabel: "vehicle",
              confidence: 1,
              direction: "east",
              laneId: "east_aihub_cr06_01",
              count: 2
            }
          ]
        }
      ],
      signalSnapshot: {
        controllerId: "td-seoul-v2x-cr06",
        capturedAt: "2026-07-02T01:54:52.000Z",
        currentPhase: "east_priority",
        remainingSeconds: 18,
        nextPhase: "normal_cycle",
        controllerMode: "adaptive",
        manualOverride: false
      }
    });
  });

  test("builds live-input.v1 from a matching camera approach calibration", () => {
    const envelope = buildAiHubVehicleLiveInputEnvelopeFromCalibration(
      AI_HUB_VEHICLE_LABEL,
      {
        calibration: {
          source: "operator_camera_survey",
          schemaVersion: "aihub-camera-approach-calibration.v1",
          mappings: [
            {
              locationId: "cr06",
              cameraId: "aihub-cr06-01",
              approachDirection: "south",
              evidence: "operator verified ho-gye intersection camera 01"
            }
          ]
        },
        receivedAt: "2026-07-02T01:55:00.000Z",
        signalSnapshot: {
          controllerId: "td-seoul-v2x-cr06",
          capturedAt: "2026-07-02T01:54:52.000Z",
          currentPhase: "south_priority",
          remainingSeconds: 18,
          nextPhase: "normal_cycle",
          controllerMode: "adaptive",
          manualOverride: false
        }
      }
    );

    expect(envelope.cameraFrames[0].detections[0]).toMatchObject({
      direction: "south",
      laneId: "south_aihub_cr06_01"
    });
  });

  test("rejects live-input.v1 conversion when camera approach calibration is missing", () => {
    expect(() =>
      buildAiHubVehicleLiveInputEnvelopeFromCalibration(AI_HUB_VEHICLE_LABEL, {
        calibration: {
          source: "operator_camera_survey",
          schemaVersion: "aihub-camera-approach-calibration.v1",
          mappings: [
            {
              locationId: "other",
              cameraId: "aihub-other-01",
              approachDirection: "west",
              evidence: "different camera"
            }
          ]
        },
        receivedAt: "2026-07-02T01:55:00.000Z",
        signalSnapshot: {
          controllerId: "td-seoul-v2x-cr06",
          capturedAt: "2026-07-02T01:54:52.000Z",
          currentPhase: "west_priority",
          remainingSeconds: 18,
          nextPhase: "normal_cycle",
          controllerMode: "adaptive",
          manualOverride: false
        }
      })
    ).toThrow(
      "camera-to-approach calibration is required for aihub-cr06-01 at cr06"
    );
  });
});
