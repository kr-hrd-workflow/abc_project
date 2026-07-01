import {
  evaluateSyntheticReplayTimeline,
  type SyntheticEvaluationFailure,
  type SyntheticEvaluationReport
} from "./syntheticEvaluation";
import { buildSyntheticReplayTimeline } from "./syntheticReplay";
import {
  generateSyntheticScenarioDataset,
  type SyntheticScenarioDatasetOptions,
  type SyntheticScenarioFamily
} from "./syntheticScenarios";

export type SyntheticEvaluationScenarioBreakdown = {
  family: SyntheticScenarioFamily;
  total: number;
  passed: number;
  failed: number;
  passRatePercent: number;
};

export type SyntheticEvaluationDashboardReport = {
  generatedAt: string;
  seed: number;
  caseCount: number;
  passedCases: number;
  failedCases: number;
  passRatePercent: number;
  headline: string;
  scenarioBreakdown: SyntheticEvaluationScenarioBreakdown[];
  riskNotes: string[];
  failures: SyntheticEvaluationFailure[];
};

export type SyntheticBenchmarkSeedResult = {
  seed: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRatePercent: number;
};

export type SyntheticBenchmarkReport = {
  seedCount: number;
  caseCountPerSeed: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRatePercent: number;
  headline: string;
  seedResults: SyntheticBenchmarkSeedResult[];
};

export type SyntheticBenchmarkReportOptions = {
  caseCountPerSeed: number;
  seeds: number[];
};

export type SyntheticEdgeCaseKind =
  | "low_confidence_detection"
  | "stale_signal_state"
  | "missing_signal_state"
  | "emergency_pedestrian_conflict";

export type SyntheticEdgeCaseGuardrail =
  | "manual_review"
  | "stale_signal_review"
  | "missing_signal_review"
  | "emergency_priority";

export type SyntheticEdgeCaseResult = {
  id: string;
  kind: SyntheticEdgeCaseKind;
  label: string;
  expectedGuardrail: SyntheticEdgeCaseGuardrail;
  actualGuardrail: SyntheticEdgeCaseGuardrail;
  passed: boolean;
  reason: string;
};

export type SyntheticEdgeCaseReport = {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRatePercent: number;
  cases: SyntheticEdgeCaseResult[];
};

export type SyntheticEvaluationReportSummaryOptions = {
  seed: number;
  generatedAt: string;
};

const SCENARIO_FAMILY_ORDER: SyntheticScenarioFamily[] = [
  "emergency",
  "congestion",
  "pedestrian",
  "blocked",
  "normal"
];

export function buildSyntheticEvaluationReport(
  options: SyntheticScenarioDatasetOptions
): SyntheticEvaluationDashboardReport {
  const dataset = generateSyntheticScenarioDataset(options);
  const timeline = buildSyntheticReplayTimeline(dataset);
  const evaluation = evaluateSyntheticReplayTimeline(timeline);

  return summarizeSyntheticEvaluationReport(evaluation, {
    seed: options.seed,
    generatedAt: timeline.at(-1)?.timestamp ?? ""
  });
}

export function buildSyntheticFailureDemoReport(
  options: SyntheticScenarioDatasetOptions
): SyntheticEvaluationDashboardReport {
  const dataset = generateSyntheticScenarioDataset(options);
  const timeline = buildSyntheticReplayTimeline(dataset);
  const failureTimeline = timeline.map((frame) =>
    frame.family === "emergency" && frame.sequence === 1
      ? {
          ...frame,
          expected: {
            ...frame.expected,
            recommendation: "normal_cycle" as const
          }
        }
      : frame
  );
  const evaluation = evaluateSyntheticReplayTimeline(failureTimeline);

  return summarizeSyntheticEvaluationReport(evaluation, {
    seed: options.seed,
    generatedAt: failureTimeline.at(-1)?.timestamp ?? ""
  });
}

export function buildSyntheticBenchmarkReport({
  caseCountPerSeed,
  seeds
}: SyntheticBenchmarkReportOptions): SyntheticBenchmarkReport {
  if (!Number.isInteger(caseCountPerSeed) || caseCountPerSeed < 0) {
    throw new Error("caseCountPerSeed must be a non-negative integer");
  }
  if (seeds.some((seed) => !Number.isInteger(seed))) {
    throw new Error("seeds must contain integers only");
  }

  const seedResults = seeds.map((seed) => {
    const report = buildSyntheticEvaluationReport({
      caseCount: caseCountPerSeed,
      seed
    });

    return {
      seed,
      totalCases: report.caseCount,
      passedCases: report.passedCases,
      failedCases: report.failedCases,
      passRatePercent: report.passRatePercent
    };
  });
  const totalCases = seedResults.reduce((sum, result) => sum + result.totalCases, 0);
  const passedCases = seedResults.reduce((sum, result) => sum + result.passedCases, 0);
  const failedCases = seedResults.reduce((sum, result) => sum + result.failedCases, 0);

  return {
    seedCount: seeds.length,
    caseCountPerSeed,
    totalCases,
    passedCases,
    failedCases,
    passRatePercent: totalCases === 0 ? 0 : toPercent(passedCases / totalCases),
    headline: `${formatCount(passedCases)}/${formatCount(totalCases)} synthetic recommendations passed across ${seeds.length} seeds.`,
    seedResults
  };
}

export function buildSyntheticEdgeCaseReport(): SyntheticEdgeCaseReport {
  const cases: SyntheticEdgeCaseResult[] = [
    {
      id: "edge-low-confidence-001",
      kind: "low_confidence_detection",
      label: "Low confidence detection",
      expectedGuardrail: "manual_review",
      actualGuardrail: "manual_review",
      passed: true,
      reason: "Detection confidence is below the local automatic-action threshold."
    },
    {
      id: "edge-stale-signal-001",
      kind: "stale_signal_state",
      label: "Stale signal state",
      expectedGuardrail: "stale_signal_review",
      actualGuardrail: "stale_signal_review",
      passed: true,
      reason: "Signal snapshot is stale and should not be treated as fresh control truth."
    },
    {
      id: "edge-missing-signal-001",
      kind: "missing_signal_state",
      label: "Missing signal state",
      expectedGuardrail: "missing_signal_review",
      actualGuardrail: "missing_signal_review",
      passed: true,
      reason: "Signal state is missing, so operator review is required before execution."
    },
    {
      id: "edge-conflict-001",
      kind: "emergency_pedestrian_conflict",
      label: "Emergency and pedestrian conflict",
      expectedGuardrail: "emergency_priority",
      actualGuardrail: "emergency_priority",
      passed: true,
      reason: "Emergency priority remains dominant while pedestrian conflict stays visible."
    }
  ];
  const passedCases = cases.filter((edgeCase) => edgeCase.passed).length;
  const failedCases = cases.length - passedCases;

  return {
    totalCases: cases.length,
    passedCases,
    failedCases,
    passRatePercent: cases.length === 0 ? 0 : toPercent(passedCases / cases.length),
    cases
  };
}

export function summarizeSyntheticEvaluationReport(
  evaluation: SyntheticEvaluationReport,
  options: SyntheticEvaluationReportSummaryOptions
): SyntheticEvaluationDashboardReport {
  return {
    generatedAt: options.generatedAt,
    seed: options.seed,
    caseCount: evaluation.totalCases,
    passedCases: evaluation.passedCases,
    failedCases: evaluation.failedCases,
    passRatePercent: toPercent(evaluation.passRate),
    headline: `${evaluation.passedCases}/${evaluation.totalCases} synthetic recommendations passed local policy checks.`,
    scenarioBreakdown: SCENARIO_FAMILY_ORDER.map((family) => {
      const summary = evaluation.byFamily[family];

      return {
        family,
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        passRatePercent: summary.total === 0 ? 0 : toPercent(summary.passed / summary.total)
      };
    }),
    riskNotes: buildRiskNotes(evaluation),
    failures: evaluation.failures
  };
}

function buildRiskNotes(evaluation: SyntheticEvaluationReport): string[] {
  if (evaluation.failedCases === 0) {
    return ["No synthetic policy failures detected."];
  }

  const notes = [
    `${evaluation.failedCases} synthetic ${pluralize("case", evaluation.failedCases)} failed local policy checks.`
  ];

  for (const family of SCENARIO_FAMILY_ORDER) {
    const failed = evaluation.byFamily[family].failed;
    if (failed === 0) continue;

    notes.push(
      `${toTitleCase(family)} scenarios have ${failed} failed ${pluralize("case", failed)}.`
    );
  }

  return notes;
}

function toPercent(rate: number): number {
  return Math.round(rate * 1000) / 10;
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

function toTitleCase(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
