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
    <section
      className="analysis-intake-panel motion-enter"
      aria-label={locale === "ko" ? "분석 인입" : "Analysis Intake"}
    >
      <div className="analysis-intake-heading">
        <div>
          <span>{locale === "ko" ? "분석 인입" : "Analysis Intake"}</span>
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
            <span>{formatFixtureMediaType(fixture.media_type, locale)}</span>
            <strong>{fixture.filename}</strong>
            <small>{formatFixtureDescription(fixture.description, locale)}</small>
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
          <strong>{fixtureIngest ? copy.fixtureIngested : copy.waiting}</strong>
          <small>
            {fixtureIngest
              ? `${fixtureIngest.filename} / ${fixtureIngest.event_ids.length}${copy.eventsUnit}`
              : copy.fixtureEmpty}
          </small>
        </div>
        <div>
          <span>{copy.jobStatus}</span>
          <strong>{analysisJob ? analysisJob.job_id : copy.noJob}</strong>
          <small>{analysisJob ? analysisJob.status : copy.jobEmpty}</small>
          <button
            type="button"
            className="motion-pressable command-pressable job-refresh-button"
            aria-label={copy.jobRefreshLabel}
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
    fixtureIngested: string;
    eventsUnit: string;
    jobStatus: string;
    waiting: string;
    fixtureEmpty: string;
    noJob: string;
    jobEmpty: string;
    refresh: string;
    refreshing: string;
    jobRefreshLabel: string;
    fixtureError: string;
    uploadError: string;
    jobError: string;
  }
> = {
  ko: {
    title: "분석 인입",
    description: "운영자가 샘플·업로드 분석을 시작하고 작업 상태를 확인합니다.",
    boundary: "시뮬레이션 전용 분석",
    fixtureLabel: "샘플 분석",
    ingest: "인입 실행",
    ingesting: "인입 중",
    uploadLabel: "파일 업로드 분석",
    uploadHint: "이미지 또는 짧은 교차로 영상을 선택하세요.",
    uploading: "업로드 분석 중",
    fixtureStatus: "샘플 상태",
    fixtureIngested: "샘플 인입 완료",
    eventsUnit: "개 이벤트",
    jobStatus: "작업 상태",
    waiting: "대기 중",
    fixtureEmpty: "아직 인입된 샘플이 없습니다.",
    noJob: "작업 없음",
    jobEmpty: "업로드 분석 작업이 없습니다.",
    refresh: "새로고침",
    refreshing: "확인 중",
    jobRefreshLabel: "작업 상태 새로고침",
    fixtureError: "샘플 인입 실패",
    uploadError: "업로드 분석 실패",
    jobError: "작업 상태 확인 실패"
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
    fixtureIngested: "Fixture ingested",
    eventsUnit: " events",
    jobStatus: "Job status",
    waiting: "Waiting",
    fixtureEmpty: "No sample has been ingested yet.",
    noJob: "No job",
    jobEmpty: "No upload analysis job yet.",
    refresh: "Refresh",
    refreshing: "Checking",
    jobRefreshLabel: "Job status refresh",
    fixtureError: "Sample ingest failed",
    uploadError: "Upload analysis failed",
    jobError: "Job status refresh failed"
  }
};

function formatFixtureMediaType(mediaType: string, locale: Locale) {
  if (locale !== "ko") return mediaType.toUpperCase();
  const labels: Record<string, string> = {
    image: "이미지",
    video: "영상",
    virtual_cctv: "가상 CCTV"
  };
  return labels[mediaType] ?? mediaType.toUpperCase();
}

function formatFixtureDescription(description: string, locale: Locale) {
  if (locale !== "ko") return description;
  const labels: Record<string, string> = {
    "Sample frame with an emergency vehicle approaching from the east.":
      "동쪽 접근부로 긴급차량이 접근하는 샘플 프레임입니다.",
    "Sample clip representing a blocked four-way intersection.":
      "사방 교차로 차단 상황을 나타내는 샘플 영상입니다.",
    "Hosted simulation stream virtual CCTV presentation feed for the east emergency approach scenario.":
      "동쪽 긴급차량 접근 시나리오용 호스팅 시뮬레이션 가상 CCTV 발표 피드입니다.",
    "Unity-style virtual CCTV presentation feed for the east emergency approach scenario.":
      "동쪽 긴급차량 접근 시나리오용 Unity 스타일 가상 CCTV 발표 피드입니다."
  };
  return labels[description] ?? description;
}
