import {
  buildSyntheticBenchmarkReport,
  type SyntheticBenchmarkReport
} from "./syntheticEvaluationReport";

const DEFAULT_BENCHMARK_SEEDS = [101, 202, 303, 404, 505] as const;
const DEFAULT_CASE_COUNT_PER_SEED = 1000;

export type SyntheticBenchmarkExport = {
  source: "synthetic_benchmark";
  format: "json";
  suite: {
    label: string;
    caseCountPerSeed: number;
    seeds: number[];
  };
  report: SyntheticBenchmarkReport;
  presentationSummary: string;
};

export function buildSyntheticBenchmarkExport(): SyntheticBenchmarkExport {
  const seeds = [...DEFAULT_BENCHMARK_SEEDS];
  const report = buildSyntheticBenchmarkReport({
    caseCountPerSeed: DEFAULT_CASE_COUNT_PER_SEED,
    seeds
  });

  return {
    source: "synthetic_benchmark",
    format: "json",
    suite: {
      label: "5K local policy benchmark",
      caseCountPerSeed: DEFAULT_CASE_COUNT_PER_SEED,
      seeds
    },
    report,
    presentationSummary: report.headline
  };
}
