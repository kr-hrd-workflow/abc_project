"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { LandingNetworkScene } from "../components/LandingNetworkScene";
import { LanguageToggle } from "../components/LanguageToggle";
import type { Locale } from "../lib/i18n";

const landingCopy = {
  en: {
    brand: "SMART INTERSECTION OPS",
    dashboard: "Dashboard",
    scenarios: "Scenarios",
    boundaryNav: "Boundary",
    reports: "Reports",
    safetyChip: "Simulation-only. Never controls real signals.",
    title: "See the intersection before the signal changes",
    hero:
      "One sharp product view for live awareness, phase-plan comparison, and operator-ready simulation briefings.",
    openDashboard: "Open dashboard",
    seeWorkflow: "See the workflow",
    signals: ["Live intersection awareness", "Plans, side by side", "Decision confidence"],
    promises: [
      ["Operator in control", "You decide what goes live."],
      ["Test safely", "Simulate first. Implement when ready."],
      ["See the impact", "Systemwide context. Local clarity."],
      ["Built for teams", "Share briefings. Align decisions."]
    ],
    eventsTitle: "Live events",
    events: [
      ["14:32", "Emergency vehicle approaching"],
      ["14:31", "High pedestrian demand"],
      ["14:31", "Minor incident cleared"],
      ["14:30", "Transit on-time"]
    ],
    scrollTitle: "Scroll-driven product tour",
    scrollCopy:
      "As you move down the page, the product surface changes state: first awareness, then phase comparison, then the operator handoff.",
    scrollScenes: [
      [
        "Live awareness",
        "Intersection events, queue pressure, and emergency approach stay visible in one operating view."
      ],
      [
        "Compare phase plans",
        "Current and recommended timings sit side by side so operators can see exactly what changes."
      ],
      [
        "Lock the briefing",
        "The final state turns simulation evidence into a readable handoff without claiming field control."
      ]
    ],
    mapEvents: ["Emergency approach", "Pedestrian demand", "Simulation only"],
    phase: "Phase 2",
    phaseLabel: "Phase",
    phaseValue: "2",
    mapStatus: "Recommendation and simulation only",
    mapLabel: "Interactive product preview",
    mapSidebar: ["Layers", "Traffic", "Signals", "Events"],
    preview: {
      location: "Main St & 3rd Ave",
      live: "Live",
      mapTitle: "Live intersection",
      planTitle: "Phase plan comparison",
      currentPlan: "Current plan",
      recommendedPlan: "Recommended plan",
      recommendationTitle: "Recommendation",
      recommendationAction: "Switch to Plan B",
      confidence: "87%",
      confidenceLabel: "Decision confidence",
      cycleLabel: "Cycle length",
      currentCycle: "128s",
      recommendedCycle: "120s",
      simulationOnly: "Simulation only",
      simulationCopy: "This system does not control real-world traffic signals."
    },
    workflowTitle: "The intersection breathes before it decides",
    workflowCopy:
      "Motion is not decoration here. Every pulse maps to a condition the operator needs before comparing a recommended signal plan.",
    workflow: [
      ["Sense", "Queue, approach, pedestrian, and event pressure stay visible."],
      ["Simulate", "Fixed and recommended plans are compared before action."],
      ["Brief", "Chat and report surfaces turn the scenario into a handoff."]
    ],
    boundaryTitle: "Operator boundary",
    boundaryCopy:
      "Smart Intersection Ops recommends and simulates traffic plans. It does not control real signals, connect to live controllers, or override operator judgment.",
    aliveTitle: "What comes alive",
    alive: [
      ["Route pressure", "Approach lanes brighten as queues, incidents, and waits rise."],
      ["Signal phase", "Phase rings show the recommendation state without hiding the fixed plan."],
      ["Event arrival", "Emergency and pedestrian signals remain distinct from normal flow."],
      ["Decision handoff", "Operator-facing copy keeps the recommendation boundary explicit."]
    ],
    previewTitle: "Dashboard preview",
    previewCopy:
      "The dashboard stays practical: scenario switching, digital twin, event timeline, recommendation evidence, metrics, chat, and reports remain in one operator flow."
  },
  ko: {
    brand: "스마트 교차로 운영 시스템",
    dashboard: "대시보드",
    scenarios: "시나리오",
    boundaryNav: "운영 경계",
    reports: "리포트",
    safetyChip: "시뮬레이션 전용. 실제 신호는 제어하지 않습니다.",
    title: "신호가 바뀌기 전에 교차로를 먼저 확인하세요",
    hero: "실시간 인식, 단계 계획 비교, 운영자 브리핑을 하나의 선명한 제품 화면에서 확인합니다.",
    openDashboard: "대시보드 열기",
    seeWorkflow: "흐름 보기",
    signals: ["실시간 교차로 인식", "계획 나란히 비교", "판단 신뢰도"],
    promises: [
      ["운영자 통제 유지", "실행 여부는 운영자가 결정합니다."],
      ["안전하게 시험", "먼저 시뮬레이션하고 준비되면 적용합니다."],
      ["영향 확인", "전체 맥락과 현장 단서를 함께 봅니다."],
      ["팀 의사결정", "브리핑을 공유하고 판단을 맞춥니다."]
    ],
    eventsTitle: "실시간 이벤트",
    events: [
      ["14:32", "긴급차량 접근 중"],
      ["14:31", "보행자 수요 높음"],
      ["14:31", "경미한 사고 해소"],
      ["14:30", "대중교통 정시 운행"]
    ],
    scrollTitle: "스크롤 기반 제품 투어",
    scrollCopy:
      "페이지를 내릴수록 제품 화면의 상태가 바뀝니다. 먼저 현장 인식, 다음에는 단계 비교, 마지막에는 운영자 인수인계로 이어집니다.",
    scrollScenes: [
      ["실시간 인식", "이벤트, 대기열 압력, 긴급 접근을 하나의 운영 화면에서 유지합니다."],
      ["단계 계획 비교", "현재 타이밍과 권고 타이밍을 나란히 보여줘 무엇이 바뀌는지 확인합니다."],
      ["브리핑 고정", "시뮬레이션 근거를 실제 제어 주장 없이 읽기 쉬운 인수인계로 바꿉니다."]
    ],
    mapEvents: ["긴급차량 접근", "보행자 수요", "시뮬레이션 전용"],
    phase: "2단계",
    phaseLabel: "단계",
    phaseValue: "2",
    mapStatus: "권고와 시뮬레이션만 제공",
    mapLabel: "인터랙티브 제품 미리보기",
    mapSidebar: ["레이어", "교통", "신호", "이벤트"],
    preview: {
      location: "메인 St & 3번 Ave",
      live: "실시간",
      mapTitle: "실시간 교차로",
      planTitle: "단계 계획 비교",
      currentPlan: "현재 계획",
      recommendedPlan: "권고 계획",
      recommendationTitle: "권고안",
      recommendationAction: "B안으로 전환",
      confidence: "87%",
      confidenceLabel: "판단 신뢰도",
      cycleLabel: "주기 길이",
      currentCycle: "128초",
      recommendedCycle: "120초",
      simulationOnly: "시뮬레이션 전용",
      simulationCopy: "이 시스템은 실제 교통 신호를 제어하지 않습니다."
    },
    workflowTitle: "교차로가 판단 전에 먼저 살아 움직입니다",
    workflowCopy:
      "움직임은 장식이 아닙니다. 모든 흐름은 권고 신호안을 비교하기 전에 운영자가 확인해야 하는 조건을 나타냅니다.",
    workflow: [
      ["감지", "대기열, 접근 차량, 보행자, 이벤트 압력을 계속 보여줍니다."],
      ["시뮬레이션", "고정 계획과 권고 계획을 실행 전에 비교합니다."],
      ["브리핑", "채팅과 리포트가 상황을 인수인계 가능한 문장으로 바꿉니다."]
    ],
    boundaryTitle: "운영자 판단 경계",
    boundaryCopy:
      "스마트 교차로 운영 시스템은 교통 신호 계획을 권고하고 시뮬레이션합니다. 실제 신호를 제어하거나 현장 제어기에 연결하거나 운영자의 판단을 대체하지 않습니다.",
    aliveTitle: "무엇이 살아 움직이나",
    alive: [
      ["경로 압력", "대기열, 사고, 대기 시간이 증가하면 접근 차로가 밝아집니다."],
      ["신호 단계", "단계 링은 고정 계획을 숨기지 않고 권고 상태를 보여줍니다."],
      ["이벤트 도착", "긴급차량과 보행자 신호를 일반 흐름과 분리해서 보여줍니다."],
      ["판단 인수인계", "운영자용 문구가 권고 경계를 명확히 유지합니다."]
    ],
    previewTitle: "대시보드 미리보기",
    previewCopy:
      "대시보드는 시나리오 전환, 디지털 트윈, 이벤트 타임라인, 권고 근거, 지표, 채팅, 리포트를 하나의 운영 흐름 안에 유지합니다."
  }
} as const;

export default function Page() {
  const [locale, setLocale] = useState<Locale>("en");
  const [activeScrollScene, setActiveScrollScene] = useState(0);
  const sceneRefs = useRef<Array<HTMLElement | null>>([]);
  const t = landingCopy[locale];

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const updateActiveScene = () => {
      const viewportAnchor = window.innerHeight * 0.54;
      const nextScene = sceneRefs.current.reduce(
        (closest, scene, index) => {
          if (!scene) return closest;
          const rect = scene.getBoundingClientRect();
          const distance = Math.abs(rect.top + rect.height / 2 - viewportAnchor);
          return distance < closest.distance ? { distance, index } : closest;
        },
        { distance: Number.POSITIVE_INFINITY, index: 0 }
      );

      setActiveScrollScene((current) => (current === nextScene.index ? current : nextScene.index));
    };

    let frame = 0;
    const tick = () => {
      updateActiveScene();
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className="landing-shell" lang={locale}>
      <section className="landing-hero" aria-labelledby="landing-title">
        <header className="landing-topbar">
          <div className="landing-brand">
            <span className="landing-brand-mark" aria-hidden="true" />
            <span>{t.brand}</span>
          </div>
          <nav className="landing-topnav" aria-label="Primary landing navigation">
            <Link href="/dashboard">{t.dashboard}</Link>
            <a href="#decision-workflow">{t.scenarios}</a>
            <a href="#operator-boundary">{t.boundaryNav}</a>
            <a href="#dashboard-preview">{t.reports}</a>
          </nav>
          <LanguageToggle locale={locale} onChange={setLocale} />
        </header>
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="landing-safety-chip">{t.safetyChip}</p>
            <h1 id="landing-title">
              {locale === "en" ? (
                <>
                  See the intersection <span>before</span> the signal changes
                </>
              ) : (
                <>
                  신호가 바뀌기 전에 교차로를 <span>먼저</span> 확인하세요
                </>
              )}
            </h1>
            <p>{t.hero}</p>
            <div className="landing-actions">
              <Link href="/dashboard" className="primary-link">
                {t.openDashboard}
              </Link>
              <a href="#decision-workflow" className="secondary-link">
                {t.seeWorkflow}
              </a>
            </div>
            <div className="landing-signal-strip" aria-label="Live scenario signals">
              {t.signals.map((signal) => (
                <span key={signal}>{signal}</span>
              ))}
            </div>
            <div className="landing-promise-row" aria-label="Operator promises">
              {t.promises.map(([title, description], index) => (
                <span key={title}>
                  <i
                    className={`promise-icon ${["controls", "shield", "eye", "team"][index]}`}
                    aria-hidden="true"
                  />
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              ))}
            </div>
          </div>
          <LandingNetworkScene
            ariaLabel={t.mapLabel}
            events={t.mapEvents}
            phase={t.phase}
            phaseLabel={t.phaseLabel}
            phaseValue={t.phaseValue}
            preview={t.preview}
            sidebarLabels={t.mapSidebar}
            status={t.mapStatus}
          />
        </div>
      </section>

      <section className="landing-event-rail" aria-label="Live events">
        <strong>{t.eventsTitle}</strong>
        {t.events.map(([time, label]) => (
          <span key={`${time}-${label}`}>
            <b>{time}</b>
            {label}
          </span>
        ))}
      </section>

      <section
        className="landing-scroll-story"
        aria-labelledby="scroll-story-title"
        data-active-scene={activeScrollScene}
      >
        <div className="scroll-story-copy">
          <h2 id="scroll-story-title">{t.scrollTitle}</h2>
          <p>{t.scrollCopy}</p>
          <div className="scroll-story-state" aria-hidden="true">
            {t.scrollScenes.map(([title], index) => (
              <span key={title} className={index === activeScrollScene ? "active" : ""}>
                {title}
              </span>
            ))}
          </div>
        </div>
        <div className="scroll-stage" aria-hidden="true">
          <div className="scroll-stage-panel">
            <span className="stage-map-grid" />
            <span className="stage-route route-a" />
            <span className="stage-route route-b" />
            <span className="stage-node node-a" />
            <span className="stage-node node-b" />
            <span className="stage-plan-card current">{t.preview.currentPlan}</span>
            <span className="stage-plan-card recommended">{t.preview.recommendedPlan}</span>
            <span className="stage-brief-card">{t.preview.simulationOnly}</span>
          </div>
        </div>
        <div className="scroll-scenes">
          {t.scrollScenes.map(([title, description], index) => (
            <article
              key={title}
              className={`scroll-scene scroll-scene-${index + 1}`}
              aria-labelledby={`scroll-scene-${index + 1}`}
              data-scene-index={index}
              ref={(node) => {
                sceneRefs.current[index] = node;
              }}
            >
              <div className="scroll-scene-visual" aria-hidden="true">
                <span className="scroll-road horizontal" />
                <span className="scroll-road vertical" />
                <span className="scroll-road diagonal" />
                <span className="scroll-pulse primary" />
                <span className="scroll-pulse secondary" />
                <span className="scroll-pulse warning" />
              </div>
              <div>
                <h3 id={`scroll-scene-${index + 1}`}>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="decision-workflow"
        className="landing-section landing-proof"
        aria-labelledby="live-picture-title"
      >
        <div>
          <h2 id="live-picture-title">{t.workflowTitle}</h2>
          <p>{t.workflowCopy}</p>
        </div>
        <div className="landing-proof-grid" aria-label="Living workflow">
          {t.workflow.map(([title, description]) => (
            <span key={title}>
              <strong>{title}</strong>
              {description}
            </span>
          ))}
        </div>
      </section>

      <section
        id="operator-boundary"
        className="landing-section landing-boundary"
        aria-labelledby="boundary-title"
      >
        <h2 id="boundary-title">{t.boundaryTitle}</h2>
        <p>{t.boundaryCopy}</p>
      </section>

      <section
        className="landing-section landing-workflow"
        aria-labelledby="workflow-title"
      >
        <h2 id="workflow-title">{t.aliveTitle}</h2>
        <ol>
          {t.alive.map(([title, description]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{description}</span>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="dashboard-preview"
        className="landing-section landing-dashboard-preview"
        aria-labelledby="dashboard-preview-title"
      >
        <div>
          <h2 id="dashboard-preview-title">{t.previewTitle}</h2>
          <p>{t.previewCopy}</p>
        </div>
        <Link href="/dashboard" className="primary-link compact">
          {t.openDashboard}
        </Link>
      </section>
    </main>
  );
}
