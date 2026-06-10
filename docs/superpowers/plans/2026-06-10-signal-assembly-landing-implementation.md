# Signal Assembly Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Smart Intersection Ops landing page into the approved Signal Assembly cinematic scroll experience.

**Architecture:** Keep the existing Next.js client page and GSAP stack. Replace the current bento/accordion-heavy landing structure with a smaller set of full-bleed story sections: hero, signal overview, pinned assembly reel, decision chapters, proof, and final handoff. Keep all state local to the landing page and preserve `/dashboard` links and English/Korean copy switching.

**Tech Stack:** Next.js 15, React 19, TypeScript, GSAP ScrollTrigger, Vitest, Testing Library, existing landing image assets under `apps/web/public/landing/`.

---

## File Structure

- Modify `apps/web/app/page.test.tsx`: encode the Signal Assembly structure, scroll contract, boundary copy, and language switching.
- Modify `apps/web/app/page.tsx`: update landing copy and markup from bento/accordion sections to Signal Assembly sections.
- Modify `apps/web/app/globals.css`: replace/extend the current launch landing CSS so the new structure renders as full-bleed cinematic scenes with a pinned assembly reel.
- Do not modify backend, OpenAI, runtime, database, dashboard behavior, or dependencies.
- Do not commit unless the user explicitly approves a commit.

## Task 1: Update Landing Tests For Signal Assembly

**Files:**
- Modify: `apps/web/app/page.test.tsx`

- [x] **Step 1: Replace structure assertions**

Update the first test to expect these `data-section` values:

```ts
expect(container.querySelector('[data-section="hero"]')).toBeTruthy();
expect(container.querySelector('[data-section="signal-overview"]')).toBeTruthy();
expect(container.querySelector('[data-section="signal-assembly"]')).toBeTruthy();
expect(container.querySelector('[data-section="decision-chapters"]')).toBeTruthy();
expect(container.querySelector('[data-section="proof-marquee"]')).toBeTruthy();
expect(container.querySelector('[data-section="final-cta"]')).toBeTruthy();
expect(container.querySelector('[data-existing-intersection-image="true"]')).toBeTruthy();
expect(screen.getByText(/Simulation-only. Never controls real signals./i)).toBeTruthy();
```

- [x] **Step 2: Replace GSAP contract assertions**

Use this contract for the assembly reel:

```ts
const assembly = screen.getByTestId("landing-signal-assembly");
expect(assembly.getAttribute("data-gsap-scrolltrigger")).toBe("true");
expect(assembly.getAttribute("data-remotion-sequence")).toBe("SignalAssemblyReel");
expect(assembly.getAttribute("data-remotion-fps")).toBe("30");
expect(assembly.getAttribute("data-motion-scenes")).toBe("4");
expect(container.querySelectorAll("[data-assembly-stage]")).toHaveLength(4);
expect(container.querySelectorAll("[data-assembly-layer]")).toHaveLength(4);
```

- [x] **Step 3: Replace bento/accordion assertions**

Assert the larger chapters and absence of old patterns:

```ts
expect(screen.getByText("Sense")).toBeTruthy();
expect(screen.getByText("Compare")).toBeTruthy();
expect(screen.getByText("Brief")).toBeTruthy();
expect(screen.getByText("Open dashboard")).toBeTruthy();
expect(container.querySelector("[data-testid='landing-gapless-bento']")).toBeFalsy();
expect(container.querySelector(".operator-accordion")).toBeFalsy();
```

- [x] **Step 4: Run focused test to verify failure**

Run:

```bash
npm --workspace apps/web run test -- app/page.test.tsx
```

Expected: FAIL because the current page still exposes the old `signal-bento`, `scroll-reel`, and `operator-accordion` structure.

## Task 2: Implement Signal Assembly Markup

**Files:**
- Modify: `apps/web/app/page.tsx`

- [x] **Step 1: Update constants and copy keys**

Use four assembly stages and keep `REMOTION_FPS` / `REMOTION_DURATION_FRAMES`. Rename the Remotion sequence data value to `SignalAssemblyReel`. Update copy keys from `bento` / `accordion` to `overview`, `assembly`, and `chapters`, preserving English and Korean.

- [x] **Step 2: Update GSAP selectors**

Animate these selectors:

```ts
const stages = gsap.utils.toArray<HTMLElement>(".assembly-stage");
const layers = gsap.utils.toArray<HTMLElement>(".assembly-layer");

ScrollTrigger.create({
  trigger: ".signal-assembly-section",
  start: "top top",
  end: "bottom bottom",
  pin: ".assembly-pin",
  pinSpacing: false,
});
```

Each `.assembly-stage` should fade/scale into view while the corresponding `.assembly-layer` becomes visible.

- [x] **Step 3: Replace sections**

Render these sections:

- `data-section="hero"` with hero boundary text.
- `data-section="signal-overview"` for the large setup.
- `data-section="signal-assembly"` with `data-testid="landing-signal-assembly"`, four `[data-assembly-stage]` articles, and four `[data-assembly-layer]` visual layers.
- `data-section="decision-chapters"` with four large chapter articles.
- Existing proof marquee, simplified if needed.
- Existing final CTA with `/dashboard` links.

- [x] **Step 4: Preserve interactions**

Keep language toggle and dashboard CTAs. Remove the obsolete accordion state and hover/click behavior if the accordion is no longer rendered.

## Task 3: Implement Cinematic CSS

**Files:**
- Modify: `apps/web/app/globals.css`

- [x] **Step 1: Add/replace Signal Assembly styles**

Style the new sections with:

- Full-bleed dark background using `intersection-hero-cinematic.png`.
- Teal and amber route layers.
- Pinned assembly visual field.
- Thin operational overlays for evidence/brief content.
- Large editorial headings.
- Mobile-safe grid collapse.

- [x] **Step 2: Retire visible old landing patterns**

Old selectors can remain if used elsewhere, but the new page must not render bento grid or operator accordion markup. Do not delete dashboard CSS.

- [x] **Step 3: Add reduced-motion fallback**

Ensure assembly layers and stages are visible enough without GSAP:

```css
@media (prefers-reduced-motion: reduce) {
  .assembly-layer,
  .assembly-stage,
  .motion-scale {
    opacity: 1;
    transform: none;
    animation: none;
  }
}
```

## Task 4: Verify And Polish

**Files:**
- Modify as needed: `apps/web/app/page.tsx`, `apps/web/app/page.test.tsx`, `apps/web/app/globals.css`

- [x] **Step 1: Run focused web tests**

Run:

```bash
npm --workspace apps/web run test -- app/page.test.tsx
```

Expected: PASS.

- [x] **Step 2: Run full web checks**

Run:

```bash
npm --workspace apps/web run test
npm run build:web
git diff --check
```

Expected: all pass. If unrelated dirty files create failures, report the exact failure and whether it is outside landing scope.

- [x] **Step 3: Render desktop and mobile**

Start the web app with:

```bash
npm --workspace apps/web run dev -- -H 127.0.0.1 -p 3001
```

Use the Browser plugin first if available. If unavailable, use the local Playwright wrapper fallback. Verify:

- First viewport is cinematic and product-specific.
- Scroll assembly visually progresses through four stages.
- Boundary copy is visible.
- CTAs and language toggle work.
- Mobile has no horizontal overflow or clipped hero text.

## Completion Evidence

- Focused landing tests passed: `npm --workspace apps/web run test -- app/page.test.tsx`.
- Full web tests passed: `npm --workspace apps/web run test` with 5 files and 42 tests.
- Production build passed: `npm run build:web`.
- Diff whitespace check passed: `git diff --check`.
- Browser QA passed on `http://127.0.0.1:3001/`: desktop hero, desktop assembly, mobile hero, mobile assembly, Korean language toggle, and hero `/dashboard` CTA.
