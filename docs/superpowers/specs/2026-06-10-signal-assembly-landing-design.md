# Signal Assembly Landing Design

Date: 2026-06-10

## Outcome

Upgrade the Smart Intersection Ops landing page so it feels closer to the dynamic OpenAI showcase references:

- Watchmaker Landing Page: scroll-driven visual assembly, parallax chapters, generated/product assets becoming one complete object.
- Forged in Silence: full-viewport cinematic scene, fixed visual focus, section-based story progression, high-contrast motion timing.

The approved direction is **Signal Assembly**: the landing page turns the intersection from raw city footage into an operator-ready decision brief as the user scrolls.

## Audience And Tone

Audience: civic traffic teams, city operators, and project reviewers who need to understand the product quickly without confusing it for a live signal controller.

Tone: cinematic, serious, high-trust, operational. It should feel alive and premium, but still make the simulation-only safety boundary obvious.

Design read: Smart Intersection landing page for civic/traffic-ops buyers, with an Awwwards-grade cinematic product-story language, leaning toward scroll-pinned scenes, generated/real aerial imagery, and a minimal dark editorial control system.

## Success Criteria

- The first viewport immediately signals a premium cinematic product, not a generic SaaS page.
- Scroll drives a visible assembly sequence: pressure, candidate routes, timing/evidence, operator handoff.
- The page uses fewer, larger story moments instead of bento/card-heavy sections.
- The existing `/dashboard` route remains the final operational handoff.
- English/Korean language switching remains supported.
- The boundary copy remains explicit: simulation-only, never real signal control.
- The implementation remains scoped to the landing surface unless a new asset is needed.
- Verification includes focused web tests, build, diff check, and rendered desktop/mobile review.

## Page Structure

### 1. Hero: Night Intersection As Instrument

Use the existing generated aerial intersection image as the full-bleed first viewport. Keep the navigation minimal. The headline stays left-weighted and large. Teal and amber route trails should already feel active behind the copy.

Required visible elements:

- Brand: Smart Intersection Ops
- Primary CTA: Open dashboard
- Secondary CTA: Watch the motion
- Language toggle
- Current headline and simulation positioning, refined only if needed for rhythm
- Simulation-only boundary visible in the first viewport or immediately adjacent to it

### 2. Pinned Assembly Reel

Replace the current card-like scroll panel feel with a stronger pinned cinematic assembly sequence. The visual field should remain the central object while layers arrive in order:

1. Pressure sensed: queue and incident pressure glow around the junction.
2. Timing compared: teal current path and amber candidate path appear together.
3. Evidence assembled: phase timing, event context, and impact deltas become readable.
4. Operator handoff: the scene resolves into a reviewable brief and dashboard transition.

This is the core Watchmaker-inspired moment: parts assemble into meaning as the user scrolls.

Watchmaker build-note fidelity constraints:

- The visual field should behave like one persistent viewing area, not a small side panel.
- Each introduced layer remains visible as later layers arrive, so the intersection accumulates into one complete decision object.
- Stage copy alternates left and right around the persistent object.
- Previous copy fades away instead of stacking in the same viewport.
- The final viewing area keeps the assembled object in place while the handoff copy remains readable.

### 3. Decision Chapters

Use fewer, larger chapters instead of small repeated cards. The chapters should read as an operations film:

- Sense
- Compare
- Brief
- Open dashboard

Each chapter gets one dominant visual state and one compact explanation. Avoid generic feature grids, decorative pills, or fake metrics that do not clarify the scenario.

### 4. Operator Handoff Finale

End with the assembled output becoming a clear dashboard handoff:

- Explicit simulation-only boundary
- CTA to `/dashboard`
- One proof line about reviewable evidence
- Footer/nav links kept minimal and not visually louder than the final CTA

## Interaction Model

Use the existing Next/React and GSAP setup. Do not add Three.js/R3F/Lenis for this pass unless implementation proves the desired effect cannot be achieved with the current stack.

Motion requirements:

- Respect `prefers-reduced-motion`.
- Use scroll scrub for assembly layers.
- Pin the main assembly region long enough for each state to read.
- Use opacity, scale, clip/mask, and route-line transforms to create the assembly feel.
- Avoid constant background noise that makes copy hard to read.

Controls:

- Language toggle remains interactive.
- Dashboard CTAs route to `/dashboard`.
- Any accordion/tab-like behavior should serve the story; remove it if the pinned assembly replaces its purpose.

## Visual System

Palette: keep the dark civic cinematic base with teal and amber as the operating colors. Avoid generic AI purple, heavy glassmorphism, and decorative gradient blobs.

Typography: keep Satoshi/Geist-style sans display. Use large editorial headings, compact body copy, and deliberate control text. Do not introduce a serif unless explicitly approved later.

Container model: favor full-bleed scenes, pinned visual stages, rails, and thin operational overlays. Avoid nested cards and generic bento grids.

Imagery: use `apps/web/public/landing/intersection-hero-cinematic.png` as the primary texture. `intersection-map.png` can support smaller assembly/evidence moments. If a new asset is required, it should be a transparent or clean-overlay asset that helps the assembly sequence, not a stock-like illustration.

## Implementation Boundaries

Primary files expected:

- `apps/web/app/page.tsx`
- `apps/web/app/page.test.tsx`
- `apps/web/app/globals.css`
- `apps/web/public/landing/*` only if a new asset is required

Do not touch backend, OpenAI, runtime-readiness, database, or dashboard behavior for this landing pass.

Do not refactor unrelated dashboard CSS. If shared launch variables are adjusted, verify the dashboard still renders acceptably because the current CSS shares launch tokens.

## Data Flow

The landing remains local UI only:

- Copy comes from the existing `landingCopy` object.
- Locale state remains local to the landing page.
- No API calls are required.
- `/dashboard` remains a link-based transition.

## Failure And Fallback Behavior

- With reduced motion enabled, all content must remain visible and ordered without pinning-dependent comprehension.
- If image assets fail to load, the page should still show readable copy, CTAs, and dark background treatments.
- Mobile layout must not depend on hover and must not horizontally overflow.

## Testing And Verification

Required checks before completion:

- `npm --workspace apps/web run test`
- `npm run build:web`
- `git diff --check`
- Rendered desktop and mobile review through the available browser or Playwright fallback.

Visual checks:

- First viewport feels cinematic and product-specific.
- Scroll sequence visibly assembles the system.
- Copy remains readable over imagery.
- The simulation-only boundary is visible.
- CTAs and language toggle work.
- No mobile horizontal overflow or clipped hero text.

## Out Of Scope

- Three.js/R3F procedural 3D scene.
- Checkout, ecommerce, account flows, or new dashboard product flows.
- Backend/API changes.
- Live signal-control behavior.
- New dependency installation unless separately approved.
