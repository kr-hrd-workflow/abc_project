"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { LanguageToggle } from "../components/LanguageToggle";
import type { Locale } from "../lib/i18n";

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
} else {
  gsap.registerPlugin(useGSAP);
}

const MOTION_SCENES = 4;
const REMOTION_FPS = 30;
const REMOTION_DURATION_FRAMES = 240;

const landingCopy = {
  en: {
    brand: "Smart Intersection Ops",
    nav: [
      ["Product", "#signal-intelligence"],
      ["Motion", "#decision-workflow"],
      ["Operations", "#operator-flow"],
      ["Proof", "#proof"],
    ],
    openDashboard: "Open dashboard",
    watchMotion: "Watch the motion",
    headline: "Intersections that think before they change",
    hero:
      "Simulation workspace for traffic teams to sense pressure, compare timing, and brief operators before a field change.",
    heroCaption: "Simulation-only. Never controls real signals.",
    proofRail: "Simulation-only. Never controls real signals.",
    bentoTitle: "A living system, not a static dashboard",
    bentoCopy:
      "Every scroll movement mirrors a real operational state: light trails become pressure, route arcs become timing choices, and the final panel becomes the handoff.",
    bento: [
      ["Sense", "Read queue pressure, pedestrian demand, and incident load from the same view."],
      ["Compare", "Keep current timing and recommended timing visible together."],
      ["Brief", "Turn the scenario into a compact operator handoff."],
      ["Simulation-only boundary", "Recommendations stay advisory until a human operator reviews them."],
    ],
    reelTitle: "Scroll the intersection from pressure to handoff",
    reelCopy:
      "The page behaves like a controlled operations film. Panels scale in, darken out, and pin long enough for each decision state to be understood.",
    reel: [
      ["Pressure sensed", "Traffic trails brighten as queues and events gather around the junction."],
      ["Timing compared", "Teal current flow and amber candidate routes stay side by side."],
      ["Evidence assembled", "Phase timing, event context, and impact deltas collapse into a brief."],
      ["Dashboard opened", "The operator lands in the working simulation surface with the boundary intact."],
    ],
    accordionTitle: "The operator flow stays visible",
    accordionCopy:
      "The accordion expands the same way an operator drills into a scenario: one focused surface, adjacent context still in view.",
    accordion: [
      ["Live sensing", "Queue, demand, and event pressure are visible before any recommendation."],
      ["Scenario compare", "Current and candidate timing plans stay in the same frame."],
      ["Recommendation evidence", "Every suggested plan carries the reason it exists."],
      ["Operator handoff", "The final artifact is a reviewable brief, not a controller command."],
    ],
    marqueeTitle: "Built for teams who need the street and the screen to agree",
    quote:
      "The value is not another map. It is seeing the moment a signal plan becomes reviewable evidence.",
    cities: ["SEOUL", "SEATTLE", "AUSTIN", "TORONTO", "DENVER", "RALEIGH"],
    ctaTitle: "Open the working simulation",
    ctaCopy:
      "Move from the cinematic landing page into the launch-ready dashboard and inspect the same teal/amber operating system.",
    finalSecondary: "Review the system",
    footer: ["Simulation boundary", "Scenario library", "Operator report", "City review"],
  },
  ko: {
    brand: "스마트 교차로 운영",
    nav: [
      ["제품", "#signal-intelligence"],
      ["움직임", "#decision-workflow"],
      ["운영", "#operator-flow"],
      ["근거", "#proof"],
    ],
    openDashboard: "대시보드 열기",
    watchMotion: "움직임 보기",
    headline: "바꾸기 전에 생각하는 교차로",
    hero:
      "교통 운영팀이 현장 변경 전에 압력을 감지하고, 신호 타이밍을 비교하고, 운영자 브리프를 만드는 시뮬레이션 작업 공간입니다.",
    heroCaption: "시뮬레이션 전용. 실제 신호를 제어하지 않습니다.",
    proofRail: "시뮬레이션 전용. 실제 신호를 제어하지 않습니다.",
    bentoTitle: "정적인 대시보드가 아니라 살아있는 시스템",
    bentoCopy:
      "스크롤 움직임은 실제 운영 상태와 연결됩니다. 빛의 궤적은 압력이 되고, 경로 호는 신호 선택지가 되고, 마지막 패널은 인수인계가 됩니다.",
    bento: [
      ["Sense", "대기열, 보행 수요, 사고 압력을 같은 화면에서 읽습니다."],
      ["Compare", "현재 타이밍과 권고 타이밍을 함께 보여줍니다."],
      ["Brief", "시나리오를 운영자 인수인계 문서로 압축합니다."],
      ["Simulation-only boundary", "권고안은 운영자가 검토하기 전까지 조언으로 남습니다."],
    ],
    reelTitle: "압력에서 인수인계까지 스크롤하세요",
    reelCopy:
      "페이지는 제어된 운영 필름처럼 움직입니다. 패널은 커지며 들어오고, 지나가며 어두워지고, 각 판단 상태를 이해할 만큼 오래 고정됩니다.",
    reel: [
      ["압력 감지", "대기열과 이벤트가 교차로 주변에 모이면 교통 궤적이 밝아집니다."],
      ["타이밍 비교", "청록색 현재 흐름과 호박색 후보 경로를 나란히 비교합니다."],
      ["근거 정리", "신호 단계, 이벤트 맥락, 영향 차이가 브리프로 접힙니다."],
      ["대시보드 열기", "운영자는 경계를 유지한 채 실제 시뮬레이션 화면으로 이동합니다."],
    ],
    accordionTitle: "운영 흐름은 계속 보여야 합니다",
    accordionCopy:
      "아코디언은 운영자가 시나리오를 파고드는 방식처럼 확장됩니다. 하나의 표면에 집중하면서 주변 맥락은 남겨둡니다.",
    accordion: [
      ["Live sensing", "권고 전에 대기열, 수요, 이벤트 압력을 먼저 보여줍니다."],
      ["Scenario compare", "현재 계획과 후보 신호안을 같은 프레임에 둡니다."],
      ["Recommendation evidence", "모든 권고안에는 그 이유가 함께 붙습니다."],
      ["Operator handoff", "최종 결과는 제어 명령이 아니라 검토 가능한 브리프입니다."],
    ],
    marqueeTitle: "도로와 화면이 같은 말을 해야 하는 팀을 위해",
    quote:
      "가치는 또 하나의 지도가 아닙니다. 신호안이 검토 가능한 근거가 되는 순간을 보는 것입니다.",
    cities: ["서울", "시애틀", "오스틴", "토론토", "덴버", "롤리"],
    ctaTitle: "작동 중인 시뮬레이션을 여세요",
    ctaCopy:
      "시네마틱 랜딩에서 출시 가능한 대시보드로 이동해 같은 청록/호박 운영 시스템을 확인하세요.",
    finalSecondary: "시스템 검토",
    footer: ["시뮬레이션 경계", "시나리오 라이브러리", "운영자 리포트", "도시 검토"],
  },
} as const;

export default function Page() {
  const [locale, setLocale] = useState<Locale>("en");
  const [activeAccordion, setActiveAccordion] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const t = landingCopy[locale];

  useGSAP(
    () => {
      if (
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        typeof window.requestAnimationFrame !== "function"
      ) {
        return;
      }

      const panels = gsap.utils.toArray<HTMLElement>(".scroll-panel");

      panels.forEach((panel, index) => {
        gsap.fromTo(
          panel,
          {
            autoAlpha: index === 0 ? 1 : 0.34,
            scale: 0.84,
            y: 72,
          },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: panel,
              start: "top 82%",
              end: "bottom 42%",
              scrub: true,
            },
          }
        );

        gsap.to(panel, {
          autoAlpha: 0.22,
          scale: 0.92,
          ease: "none",
          scrollTrigger: {
            trigger: panel,
            start: "bottom 40%",
            end: "bottom 8%",
            scrub: true,
          },
        });
      });

      ScrollTrigger.create({
        trigger: ".landing-scroll-reel",
        start: "top 9%",
        end: "bottom bottom",
        pin: ".scroll-pin-copy",
        pinSpacing: false,
      });

      gsap.utils.toArray<HTMLElement>(".motion-scale").forEach((element) => {
        gsap.fromTo(
          element,
          { autoAlpha: 0.5, scale: 0.9, y: 54 },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: element,
              start: "top 86%",
              end: "top 46%",
              scrub: true,
            },
          }
        );
      });
    },
    { scope: rootRef }
  );

  return (
    <main ref={rootRef} className="launch-landing" lang={locale}>
      <section className="launch-hero" data-section="hero" aria-labelledby="landing-title">
        <div
          className="intersection-backdrop"
          data-existing-intersection-image="true"
          aria-hidden="true"
        />
        <header className="launch-nav">
          <Link href="/" className="launch-brand" aria-label={t.brand}>
            <span aria-hidden="true" />
            <strong>{t.brand}</strong>
          </Link>
          <nav aria-label="Primary landing navigation">
            {t.nav.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="launch-nav-actions">
            <Link href="/dashboard" className="launch-text-link">
              {t.openDashboard}
            </Link>
            <LanguageToggle locale={locale} onChange={setLocale} />
          </div>
        </header>

        <div className="launch-hero-content">
          <h1 id="landing-title">{t.headline}</h1>
          <p>{t.hero}</p>
          <div className="launch-hero-actions">
            <Link href="/dashboard" className="launch-primary">
              {t.openDashboard}
            </Link>
            <a href="#decision-workflow" className="launch-secondary">
              {t.watchMotion}
            </a>
          </div>
        </div>
      </section>

      <section
        id="signal-intelligence"
        className="launch-section signal-bento-section"
        data-section="signal-bento"
        aria-labelledby="signal-bento-title"
      >
        <div className="section-copy wide">
          <h2 id="signal-bento-title">
            {t.bentoTitle.split(",")[0]}
            <span className="inline-traffic-image" aria-hidden="true" />
            {t.bentoTitle.includes(",") ? `,${t.bentoTitle.split(",").slice(1).join(",")}` : ""}
          </h2>
          <p>{t.bentoCopy}</p>
        </div>

        <div
          className="signal-bento-grid motion-scale"
          data-grid-flow="dense"
          data-testid="landing-gapless-bento"
        >
          {t.bento.map(([title, copy], index) => (
            <article key={title} className={`bento-cell bento-cell-${index + 1}`} data-bento-cell>
              <span aria-hidden="true" />
              <strong>{title}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="decision-workflow"
        className="launch-section landing-scroll-reel"
        data-section="scroll-reel"
        aria-labelledby="scroll-reel-title"
      >
        <div className="scroll-pin-copy">
          <h2 id="scroll-reel-title">{t.reelTitle}</h2>
          <p>{t.reelCopy}</p>
          <Link href="/dashboard" className="launch-text-link strong">
            {t.openDashboard}
          </Link>
        </div>

        <div
          className="scroll-panel-stack"
          data-gsap-scrolltrigger="true"
          data-motion-scenes={MOTION_SCENES}
          data-remotion-sequence="LandingScrollReel"
          data-remotion-fps={REMOTION_FPS}
          data-duration-frames={REMOTION_DURATION_FRAMES}
          data-testid="landing-gsap-scroll-reel"
        >
          {t.reel.map(([title, copy], index) => (
            <article
              key={title}
              className={`scroll-panel scroll-panel-${index + 1}`}
              data-scroll-panel={index}
            >
              <div className="scroll-panel-image" aria-hidden="true">
                <span className="route-line teal" />
                <span className="route-line amber" />
                <span className="route-node" />
              </div>
              <div>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="operator-flow"
        className="launch-section operator-accordion-section"
        data-section="operator-accordion"
        aria-labelledby="operator-flow-title"
      >
        <div className="section-copy">
          <h2 id="operator-flow-title">{t.accordionTitle}</h2>
          <p>{t.accordionCopy}</p>
        </div>

        <div className="operator-accordion motion-scale">
          {t.accordion.map(([title, copy], index) => (
            <button
              key={title}
              type="button"
              className={index === activeAccordion ? "active" : ""}
              aria-pressed={index === activeAccordion}
              aria-expanded={index === activeAccordion}
              onClick={() => setActiveAccordion(index)}
              onMouseEnter={() => setActiveAccordion(index)}
            >
              <span className="accordion-media" aria-hidden="true" />
              <span className="accordion-copy">
                <strong>{title}</strong>
                <small>{copy}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section
        id="proof"
        className="launch-section proof-section"
        data-section="proof-marquee"
        aria-labelledby="proof-title"
      >
        <div className="proof-visual motion-scale" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="proof-copy">
          <p className="side-rail">{t.proofRail}</p>
          <h2 id="proof-title">{t.marqueeTitle}</h2>
          <blockquote>{t.quote}</blockquote>
          <div className="city-marquee" aria-label="City team motion marquee">
            <div>
              {[...t.cities, ...t.cities].map((city, index) => (
                <span key={`${city}-${index}`}>{city}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="landing-action"
        className="launch-final"
        data-section="final-cta"
        aria-labelledby="landing-action-title"
      >
        <div className="final-backdrop" aria-hidden="true" />
        <div className="final-copy">
          <h2 id="landing-action-title">{t.ctaTitle}</h2>
          <p>{t.ctaCopy}</p>
          <div className="launch-hero-actions">
            <Link href="/dashboard" className="launch-primary">
              {t.openDashboard}
            </Link>
            <a href="#signal-intelligence" className="launch-secondary">
              {t.finalSecondary}
            </a>
          </div>
        </div>
        <footer className="launch-footer">
          <strong>{t.brand}</strong>
          <nav aria-label="Landing footer">
            {t.footer.map((item) => (
              <a key={item} href="#decision-workflow">
                {item}
              </a>
            ))}
          </nav>
        </footer>
      </section>
    </main>
  );
}
