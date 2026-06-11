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
      "Simulation workspace for traffic teams to sense pressure, compare timing, and preview a Unity-style virtual CCTV surface before a field change.",
    heroCaption: "Simulation-only. Never controls real signals.",
    proofRail: "Simulation-only. Never controls real signals.",
    overviewTitle: "Raw city pressure becomes a reviewable signal plan",
    overviewCopy:
      "The page behaves like a controlled operations film. Scroll does not reveal another card grid; it assembles the street, the candidate routes, and the evidence into one operator handoff.",
    overview: [
      ["01", "Street pressure", "Queues, pedestrian demand, and incidents enter as visible pressure."],
      ["02", "Candidate motion", "Teal current flow and amber alternatives stay in one frame."],
      ["03", "Human review", "The recommendation resolves as a brief, never a controller command."],
    ],
    assemblyTitle: "Scroll the intersection into an operator brief",
    assemblyCopy:
      "Each chapter adds one operational layer until the aerial junction becomes a decision surface: sensed pressure, timing comparison, evidence, then handoff.",
    assembly: [
      ["Pressure sensed", "Traffic trails brighten as queues and events gather around the junction."],
      ["Timing compared", "Teal current flow and amber candidate routes stay side by side."],
      ["Evidence assembled", "Phase timing, event context, and impact deltas collapse into a brief."],
      ["Dashboard opened", "The operator lands in the Unity virtual CCTV + SUMO validation surface with the boundary intact."],
    ],
    chaptersTitle: "The decision stays legible from street to screen",
    chaptersCopy:
      "Four large chapters replace feature-card clutter. The story stays simple: sense the condition, compare the route, brief the operator, then open the working dashboard.",
    chapters: [
      ["Sense", "Read queue pressure, pedestrian demand, and incident load before any recommendation appears."],
      ["Compare", "Keep current timing and candidate timing visible together so tradeoffs are reviewable."],
      ["Brief", "Collapse phase timing, incident context, and expected impact into a concise handoff."],
      ["Open dashboard", "Move into the simulation workspace with the advisory boundary still visible."],
    ],
    marqueeTitle: "Built for teams who need the street and the screen to agree",
    quote:
      "The value is not another map. It is seeing the moment a signal plan becomes reviewable evidence.",
    cities: ["SEOUL", "SEATTLE", "AUSTIN", "TORONTO", "DENVER", "RALEIGH"],
    ctaTitle: "Open the working simulation",
    ctaCopy:
      "Move from the cinematic landing page into the launch-ready dashboard and inspect the Unity presentation fallback plus SUMO validation metrics.",
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
      "교통 운영팀이 현장 변경 전에 압력을 감지하고, 신호 타이밍을 비교하고, Unity 스타일 가상 CCTV 화면을 미리 보는 시뮬레이션 작업 공간입니다.",
    heroCaption: "시뮬레이션 전용. 실제 신호를 제어하지 않습니다.",
    proofRail: "시뮬레이션 전용. 실제 신호를 제어하지 않습니다.",
    overviewTitle: "도시의 압력이 검토 가능한 신호안으로 조립됩니다",
    overviewCopy:
      "이 페이지는 또 다른 카드 그리드를 보여주지 않습니다. 스크롤할수록 도로, 후보 경로, 근거가 하나의 운영자 인수인계로 조립됩니다.",
    overview: [
      ["01", "도로 압력", "대기열, 보행 수요, 사고가 눈에 보이는 압력으로 들어옵니다."],
      ["02", "후보 흐름", "청록색 현재 흐름과 호박색 대안을 한 프레임에 둡니다."],
      ["03", "사람의 검토", "권고안은 제어 명령이 아니라 브리프로 마무리됩니다."],
    ],
    assemblyTitle: "교차로를 운영자 브리프로 조립하세요",
    assemblyCopy:
      "각 챕터는 하나의 운영 레이어를 더합니다. 감지된 압력, 타이밍 비교, 근거, 인수인계가 하나의 판단 화면으로 이어집니다.",
    assembly: [
      ["압력 감지", "대기열과 이벤트가 교차로 주변에 모이면 교통 궤적이 밝아집니다."],
      ["타이밍 비교", "청록색 현재 흐름과 호박색 후보 경로를 나란히 비교합니다."],
      ["근거 정리", "신호 단계, 이벤트 맥락, 영향 차이가 브리프로 접힙니다."],
      ["대시보드 열기", "운영자는 경계를 유지한 채 Unity 가상 CCTV + SUMO 검증 화면으로 이동합니다."],
    ],
    chaptersTitle: "판단 흐름은 도로에서 화면까지 읽혀야 합니다",
    chaptersCopy:
      "작은 기능 카드 대신 네 개의 큰 챕터로 정리합니다. 감지하고, 비교하고, 브리프를 만들고, 작업 대시보드로 이동합니다.",
    chapters: [
      ["Sense", "권고 전에 대기열, 보행 수요, 사고 압력을 먼저 읽습니다."],
      ["Compare", "현재 타이밍과 후보 타이밍을 함께 보여줘 검토 가능하게 만듭니다."],
      ["Brief", "신호 단계, 사고 맥락, 예상 영향을 짧은 인수인계로 압축합니다."],
      ["Open dashboard", "시뮬레이션 작업 공간으로 이동해 자문 경계를 유지합니다."],
    ],
    marqueeTitle: "도로와 화면이 같은 말을 해야 하는 팀을 위해",
    quote:
      "가치는 또 하나의 지도가 아닙니다. 신호안이 검토 가능한 근거가 되는 순간을 보는 것입니다.",
    cities: ["서울", "시애틀", "오스틴", "토론토", "덴버", "롤리"],
    ctaTitle: "작동 중인 시뮬레이션을 여세요",
    ctaCopy:
      "시네마틱 랜딩에서 출시 가능한 대시보드로 이동해 Unity 발표용 폴백과 SUMO 검증 지표를 함께 확인하세요.",
    finalSecondary: "시스템 검토",
    footer: ["시뮬레이션 경계", "시나리오 라이브러리", "운영자 리포트", "도시 검토"],
  },
} as const;

export default function Page() {
  const [locale, setLocale] = useState<Locale>("en");
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

      const stages = gsap.utils.toArray<HTMLElement>(".assembly-stage");
      const layers = gsap.utils.toArray<HTMLElement>(".assembly-piece");

      stages.forEach((stage, index) => {
        gsap.fromTo(
          stage,
          {
            autoAlpha: index === 0 ? 1 : 0,
            scale: 0.96,
            y: 64,
          },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: stage,
              start: "top 70%",
              end: "center center",
              scrub: true,
            },
          }
        );

        gsap.to(stage, {
          autoAlpha: 0,
          scale: 1.02,
          ease: "none",
          scrollTrigger: {
            trigger: stage,
            start: "center center",
            end: "bottom 24%",
            scrub: true,
          },
        });

        const layer = layers[index];
        if (layer) {
          gsap.fromTo(
            layer,
            {
              autoAlpha: index === 0 ? 0.7 : 0,
              scale: 0.94,
            },
            {
              autoAlpha: 1,
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: stage,
                start: "top 72%",
                end: "center center",
                scrub: true,
              },
            }
          );
        }
      });

      if (window.matchMedia("(min-width: 981px)").matches) {
        ScrollTrigger.create({
          trigger: ".signal-assembly-section",
          start: "top top",
          end: "bottom bottom",
          pin: ".assembly-pin",
          pinSpacing: false,
        });
      }

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
          <p className="hero-boundary">{t.heroCaption}</p>
          <div className="launch-hero-actions">
            <Link href="/dashboard" className="launch-primary">
              {t.openDashboard}
            </Link>
            <a href="#decision-workflow" className="launch-secondary">
              {t.watchMotion}
            </a>
          </div>
        </div>
        <div className="hero-depth-stage" data-landing-depth-scene="hero-3d" aria-hidden="true">
          <div className="hero-depth-rig">
            <span className="depth-plane depth-plane-map" data-depth-plane="map" />
            <span className="depth-plane depth-plane-grid" data-depth-plane="grid" />
            <span className="depth-plane depth-plane-current" data-depth-plane="current-flow" />
            <span className="depth-plane depth-plane-candidate" data-depth-plane="candidate-flow" />
            <span className="depth-plane depth-plane-brief" data-depth-plane="operator-brief" />
          </div>
        </div>
        <div className="hero-signal-system" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section
        id="signal-intelligence"
        className="launch-section signal-overview-section"
        data-section="signal-overview"
        aria-labelledby="signal-overview-title"
      >
        <div className="section-copy wide motion-scale">
          <h2 id="signal-overview-title">
            {t.overviewTitle.split(" ").slice(0, -2).join(" ")}
            <span className="inline-traffic-image" data-section-asset="signal-overview-3d" aria-hidden="true" />
            {t.overviewTitle.split(" ").slice(-2).join(" ")}
          </h2>
          <p>{t.overviewCopy}</p>
        </div>

        <div className="signal-overview-rail motion-scale">
          {t.overview.map(([number, title, copy]) => (
            <article key={title}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="decision-workflow"
        className="launch-section signal-assembly-section"
        data-section="signal-assembly"
        aria-labelledby="signal-assembly-title"
      >
        <div className="assembly-pin">
          <div className="assembly-copy">
            <h2 id="signal-assembly-title" className="sr-only">
              {t.assemblyTitle}
            </h2>
          </div>
          <div
            className="assembly-object-field"
            data-assembly-object="persistent-centered"
            aria-hidden="true"
          >
            <span className="assembly-depth-ring ring-near" data-assembly-depth-ring="near" />
            <span className="assembly-depth-ring ring-mid" data-assembly-depth-ring="mid" />
            <span className="assembly-depth-ring ring-far" data-assembly-depth-ring="far" />
            <div className="assembly-aerial" data-section-asset="signal-assembly-layers" />
            <span
              className="assembly-layer assembly-piece layer-pressure"
              data-assembly-layer="pressure"
              data-assembly-piece="pressure"
              data-piece-persists="true"
            />
            <span
              className="assembly-layer assembly-piece layer-current"
              data-assembly-layer="current-route"
              data-assembly-piece="current-route"
              data-piece-persists="true"
            />
            <span
              className="assembly-layer assembly-piece layer-candidate"
              data-assembly-layer="candidate-route"
              data-assembly-piece="candidate-route"
              data-piece-persists="true"
            />
            <div
              className="assembly-layer assembly-piece layer-evidence assembly-brief"
              data-assembly-layer="evidence"
              data-assembly-piece="evidence"
              data-piece-persists="true"
            >
              <span>Operator brief</span>
              <strong>Reviewable evidence package</strong>
              <small>{t.heroCaption}</small>
            </div>
          </div>
        </div>

        <div
          className="assembly-stage-stack"
          data-gsap-scrolltrigger="true"
          data-reference-build-note="watchmaker-persistent-parts"
          data-motion-scenes={MOTION_SCENES}
          data-remotion-sequence="SignalAssemblyReel"
          data-remotion-fps={REMOTION_FPS}
          data-duration-frames={REMOTION_DURATION_FRAMES}
          data-testid="landing-signal-assembly"
        >
          {t.assembly.map(([title, copy], index) => (
            <article
              key={title}
              className={`assembly-stage assembly-stage-${index + 1}`}
              data-assembly-stage={index}
              data-stage-side={index % 2 === 0 ? "left" : "right"}
            >
              <div className="assembly-stage-copy">
                <span>{`0${index + 1}`}</span>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="operator-flow"
        className="launch-section decision-chapters-section"
        data-section="decision-chapters"
        aria-labelledby="operator-flow-title"
      >
        <div className="section-copy motion-scale">
          <h2 id="operator-flow-title">{t.chaptersTitle}</h2>
          <p>{t.chaptersCopy}</p>
        </div>

        <div className="decision-chapter-list motion-scale">
          {t.chapters.map(([title, copy], index) => (
            <article key={title} className={`decision-chapter decision-chapter-${index + 1}`}>
              <span>{`0${index + 1}`}</span>
              <strong>{title}</strong>
              <p>{copy}</p>
              {index === t.chapters.length - 1 ? (
                <Link href="/dashboard" className="launch-text-link strong">
                  {t.openDashboard}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section
        id="proof"
        className="launch-section proof-section"
        data-section="proof-marquee"
        aria-labelledby="proof-title"
      >
        <div className="proof-visual motion-scale" data-section-asset="operator-proof-room" aria-hidden="true">
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
        <div className="final-backdrop" data-section-asset="final-cta-city" aria-hidden="true" />
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
