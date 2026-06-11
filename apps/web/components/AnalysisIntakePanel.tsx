"use client";

import { useRef, useState } from "react";

import type { Locale } from "../lib/i18n";
import type {
  AnalysisFixture,
  AnalysisJob,
  FixtureIngestResult,
  UploadAnalysisResult
} from "../lib/types";

type AnalysisIntakePanelProps = {
  fixtures: AnalysisFixture[];
  latestFixtureIngest: FixtureIngestResult | null;
  latestAnalysisJob: AnalysisJob | null;
  locale: Locale;
  onIngestFixture: (fixtureId: string) => Promise<FixtureIngestResult>;
  onAnalyzeUpload: (file: File) => Promise<UploadAnalysisResult>;
  onRefreshAnalysisJob: (jobId: string) => Promise<AnalysisJob>;
};

export function AnalysisIntakePanel({
  fixtures,
  latestFixtureIngest,
  latestAnalysisJob,
  locale,
  onIngestFixture,
  onAnalyzeUpload,
  onRefreshAnalysisJob
}: AnalysisIntakePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [runningFixtureId, setRunningFixtureId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshingJob, setRefreshingJob] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = panelCopy[locale];
  const fixtureIngest = latestFixtureIngest;
  const analysisJob = latestAnalysisJob;

  async function handleFixtureIngest(fixtureId: string) {
    setRunningFixtureId(fixtureId);
    setError(null);
    try {
      await onIngestFixture(fixtureId);
    } catch {
      setError(copy.fixtureError);
    } finally {
      setRunningFixtureId(null);
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await onAnalyzeUpload(file);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError(copy.uploadError);
    } finally {
      setUploading(false);
    }
  }

  async function handleRefreshJob() {
    if (!analysisJob) return;
    setRefreshingJob(true);
    setError(null);
    try {
      await onRefreshAnalysisJob(analysisJob.job_id);
    } catch {
      setError(copy.jobError);
    } finally {
      setRefreshingJob(false);
    }
  }

  return (
    <section className="analysis-intake-panel motion-enter" aria-label="Analysis Intake">
      <div className="analysis-intake-heading">
        <div>
          <span>Analysis Intake</span>
          <h2>{copy.title}</h2>
        </div>
        <strong>{copy.boundary}</strong>
      </div>
      <p>{copy.description}</p>

      <div className="analysis-fixture-grid" aria-label={copy.fixtureLabel}>
        {fixtures.map((fixture) => (
          <button
            key={fixture.fixture_id}
            type="button"
            className="fixture-ingest-button motion-pressable command-pressable"
            onClick={() => void handleFixtureIngest(fixture.fixture_id)}
            disabled={runningFixtureId !== null || uploading}
          >
            <span>{fixture.media_type.toUpperCase()}</span>
            <strong>{fixture.filename}</strong>
            <small>{fixture.description}</small>
            <em>
              {runningFixtureId === fixture.fixture_id ? copy.ingesting : copy.ingest}
            </em>
          </button>
        ))}
      </div>

      <div className="analysis-upload-row">
        <label htmlFor="analysis-upload-input">
          <span>{copy.uploadLabel}</span>
          <input
            ref={inputRef}
            id="analysis-upload-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            onChange={(event) => void handleUpload(event.currentTarget.files?.[0])}
            disabled={uploading || runningFixtureId !== null}
          />
        </label>
        <small>{uploading ? copy.uploading : copy.uploadHint}</small>
      </div>

      <div className="analysis-status-grid">
        <div>
          <span>{copy.fixtureStatus}</span>
          <strong>{fixtureIngest ? "Fixture ingested" : copy.waiting}</strong>
          <small>
            {fixtureIngest
              ? `${fixtureIngest.filename} / ${fixtureIngest.event_ids.length} events`
              : copy.fixtureEmpty}
          </small>
        </div>
        <div>
          <span>Job status</span>
          <strong>{analysisJob ? analysisJob.job_id : copy.noJob}</strong>
          <small>{analysisJob ? analysisJob.status : copy.jobEmpty}</small>
          <button
            type="button"
            className="motion-pressable command-pressable job-refresh-button"
            aria-label="Job status refresh"
            onClick={() => void handleRefreshJob()}
            disabled={!analysisJob || refreshingJob}
          >
            <span>{refreshingJob ? copy.refreshing : copy.refresh}</span>
          </button>
        </div>
      </div>

      {error ? (
        <p className="analysis-intake-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

const panelCopy: Record<
  Locale,
  {
    title: string;
    description: string;
    boundary: string;
    fixtureLabel: string;
    ingest: string;
    ingesting: string;
    uploadLabel: string;
    uploadHint: string;
    uploading: string;
    fixtureStatus: string;
    waiting: string;
    fixtureEmpty: string;
    noJob: string;
    jobEmpty: string;
    refresh: string;
    refreshing: string;
    fixtureError: string;
    uploadError: string;
    jobError: string;
  }
> = {
  ko: {
    title: "분석 인입",
    description: "운영자가 샘플·업로드 분석을 시작하고 job 상태를 확인합니다.",
    boundary: "Simulation-only analysis",
    fixtureLabel: "샘플 분석",
    ingest: "인입 실행",
    ingesting: "인입 중",
    uploadLabel: "파일 업로드 분석",
    uploadHint: "이미지 또는 짧은 교차로 영상을 선택하세요.",
    uploading: "업로드 분석 중",
    fixtureStatus: "Fixture status",
    waiting: "대기 중",
    fixtureEmpty: "아직 인입된 샘플이 없습니다.",
    noJob: "No job",
    jobEmpty: "업로드 분석 job이 없습니다.",
    refresh: "새로고침",
    refreshing: "확인 중",
    fixtureError: "샘플 인입 실패",
    uploadError: "업로드 분석 실패",
    jobError: "Job 상태 확인 실패"
  },
  en: {
    title: "Analysis Intake",
    description: "Start sample or upload analysis and verify the latest job state.",
    boundary: "Simulation-only analysis",
    fixtureLabel: "Sample analysis",
    ingest: "Ingest",
    ingesting: "Ingesting",
    uploadLabel: "Upload analysis file",
    uploadHint: "Choose an image or short intersection video.",
    uploading: "Analyzing upload",
    fixtureStatus: "Fixture status",
    waiting: "Waiting",
    fixtureEmpty: "No sample has been ingested yet.",
    noJob: "No job",
    jobEmpty: "No upload analysis job yet.",
    refresh: "Refresh",
    refreshing: "Checking",
    fixtureError: "Sample ingest failed",
    uploadError: "Upload analysis failed",
    jobError: "Job status refresh failed"
  }
};
