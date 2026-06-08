export type Locale = "ko" | "en";

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "EN"
};

export const copy = {
  ko: {
    appName: "스마트 교차로 운영 시스템",
    appSubtitle: "Smart Intersection Ops",
    intersection: "INT-0001 시청 교차로",
    intersectionSub: "City Hall Crossing",
    scenario: "시나리오 08:42",
    analysisReady: "분석 완료",
    fresh: "Fresh 12s",
    eventTimeline: "이벤트 타임라인",
    aiRecommendation: "AI 추천",
    simulationOnly: "시뮬레이션 전용",
    alerts: "알림",
    noRealControl: "실제 신호 제어 없음",
    currentSituation: "현재 상황",
    recommendedAction: "권고 조치",
    recommendEast: "동쪽 우선 신호 권고",
    evidence: "근거",
    performance: "성과 비교",
    aiAgent: "AI 에이전트",
    reports: "리포트",
    settings: "설정",
    generateReport: "리포트 생성",
    askPlaceholder: "현재 교통 상황 질문",
    send: "전송",
    latestAnswer: "최근 답변",
    latestReport: "최근 리포트",
    runSimulation: "시뮬레이션 실행",
    refreshRecommendation: "추천 새로고침",
    simulationRunning: "시뮬레이션 실행 중",
    simulationReady: "시뮬레이션 갱신 완료",
    simulationFailed: "시뮬레이션 갱신 실패",
    simulationViewport: "교체형 시뮬레이션 뷰",
    safetyCopy: "권고와 시뮬레이션만 제공합니다. 실제 교통 신호 제어는 수행하지 않습니다."
  },
  en: {
    appName: "Smart Intersection Ops",
    appSubtitle: "Decision Support System",
    intersection: "INT-0001 City Hall Crossing",
    intersectionSub: "City Hall Crossing",
    scenario: "Scenario 08:42",
    analysisReady: "Analysis complete",
    fresh: "Fresh 12s",
    eventTimeline: "Event Timeline",
    aiRecommendation: "AI Recommendation",
    simulationOnly: "Simulation only",
    alerts: "Alert",
    noRealControl: "No real signal control",
    currentSituation: "Current Situation",
    recommendedAction: "Recommended Action",
    recommendEast: "Recommend East Priority Signal",
    evidence: "Evidence",
    performance: "Performance Comparison",
    aiAgent: "AI Agent",
    reports: "Reports",
    settings: "Settings",
    generateReport: "Generate Report",
    askPlaceholder: "Ask about current traffic situation",
    send: "Send",
    latestAnswer: "Latest Answer",
    latestReport: "Latest Report",
    runSimulation: "Run simulation",
    refreshRecommendation: "Refresh recommendation",
    simulationRunning: "Running simulation",
    simulationReady: "Simulation refresh ready",
    simulationFailed: "Simulation refresh failed",
    simulationViewport: "Replaceable simulation viewport",
    safetyCopy: "Recommendation and simulation only. No real traffic signal control is performed."
  }
} as const;

export function formatDirection(direction: string | null, locale: Locale): string {
  if (!direction) return locale === "ko" ? "전체" : "All";

  const labels: Record<string, Record<Locale, string>> = {
    north: { ko: "북", en: "North" },
    south: { ko: "남", en: "South" },
    east: { ko: "동", en: "East" },
    west: { ko: "서", en: "West" }
  };

  return labels[direction]?.[locale] ?? direction;
}

export function formatEventType(eventType: string, locale: Locale): string {
  const labels: Record<string, Record<Locale, string>> = {
    emergency_vehicle_approach: { ko: "긴급차량 접근", en: "Emergency vehicle" },
    queue_threshold_exceeded: { ko: "대기열 증가", en: "Queue increase" },
    pedestrian_waiting: { ko: "보행자 대기", en: "Pedestrian waiting" },
    intersection_blocked: { ko: "교차로 차단", en: "Intersection blocked" },
    normal_flow: { ko: "정상 흐름", en: "Normal flow" }
  };

  return labels[eventType]?.[locale] ?? eventType;
}

export function formatSeverity(severity: string, locale: Locale): string {
  const labels: Record<string, Record<Locale, string>> = {
    critical: { ko: "긴급", en: "Emergency" },
    warning: { ko: "경고", en: "Warning" },
    info: { ko: "정보", en: "Info" }
  };

  return labels[severity]?.[locale] ?? severity;
}
