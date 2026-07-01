import type { SyntheticReplayFrame } from "./syntheticReplay";
import type { SyntheticExpectedOutcome, SyntheticScenarioFamily } from "./syntheticScenarios";

export type SyntheticEvaluationRecommendation = SyntheticExpectedOutcome["recommendation"];

export type SyntheticEvaluationFailure = {
  caseId: string;
  family: SyntheticScenarioFamily;
  expected: SyntheticEvaluationRecommendation;
  actual: SyntheticEvaluationRecommendation;
  reason: string;
};

export type SyntheticEvaluationFamilySummary = {
  total: number;
  passed: number;
  failed: number;
};

export type SyntheticEvaluationReport = {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
  byFamily: Record<SyntheticScenarioFamily, SyntheticEvaluationFamilySummary>;
  failures: SyntheticEvaluationFailure[];
};

const EMPTY_FAMILY_SUMMARY: Record<SyntheticScenarioFamily, SyntheticEvaluationFamilySummary> = {
  emergency: { total: 0, passed: 0, failed: 0 },
  pedestrian: { total: 0, passed: 0, failed: 0 },
  blocked: { total: 0, passed: 0, failed: 0 },
  normal: { total: 0, passed: 0, failed: 0 }
};

export function evaluateSyntheticReplayTimeline(
  timeline: SyntheticReplayFrame[]
): SyntheticEvaluationReport {
  const byFamily = cloneFamilySummary();
  const failures: SyntheticEvaluationFailure[] = [];

  for (const frame of timeline) {
    const actual = recommendFromSyntheticFrame(frame);
    const expected = frame.expected.recommendation;
    const familySummary = byFamily[frame.family];
    familySummary.total += 1;

    if (actual === expected) {
      familySummary.passed += 1;
      continue;
    }

    familySummary.failed += 1;
    failures.push({
      caseId: frame.caseId,
      family: frame.family,
      expected,
      actual,
      reason: `Local policy returned ${actual}, expected ${expected}.`
    });
  }

  const totalCases = timeline.length;
  const failedCases = failures.length;
  const passedCases = totalCases - failedCases;

  return {
    totalCases,
    passedCases,
    failedCases,
    passRate: totalCases === 0 ? 0 : passedCases / totalCases,
    byFamily,
    failures
  };
}

export function recommendFromSyntheticFrame(
  frame: SyntheticReplayFrame
): SyntheticEvaluationRecommendation {
  if (frame.summary.blockedDetected) return "blocked_response";
  if (frame.summary.emergencyDetected) return "emergency_priority";
  if (frame.summary.pedestrianWaiting) return "pedestrian_priority";
  return "normal_cycle";
}

function cloneFamilySummary() {
  return {
    emergency: { ...EMPTY_FAMILY_SUMMARY.emergency },
    pedestrian: { ...EMPTY_FAMILY_SUMMARY.pedestrian },
    blocked: { ...EMPTY_FAMILY_SUMMARY.blocked },
    normal: { ...EMPTY_FAMILY_SUMMARY.normal }
  };
}
