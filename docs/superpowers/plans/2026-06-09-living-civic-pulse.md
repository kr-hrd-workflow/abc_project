# Living Civic Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/` landing page into an animated, reference-led product console landing experience.

**Architecture:** Keep the landing route server-rendered in `apps/web/app/page.tsx`, with the animated intersection visual isolated in `apps/web/components/LandingNetworkScene.tsx`. Use existing global CSS tokens and landing selectors in `apps/web/app/globals.css`.

**Tech Stack:** Next.js, React, TypeScript, CSS animations, Vitest, Testing Library.

---

### Task 1: Update Landing Contract

**Files:**
- Modify: `apps/web/app/page.test.tsx`

- [x] Write a failing test for the approved landing copy, CTAs, animated network label, workflow section, and simulation-only boundary.
- [x] Run `npm --workspace apps/web run test -- apps/web/app/page.test.tsx` and confirm the test fails before implementation.

### Task 2: Implement Living Landing Page

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/LandingNetworkScene.tsx`
- Modify: `apps/web/app/globals.css`

- [x] Replace the static landing copy with the approved hero, CTAs, workflow, operator boundary, and dashboard preview.
- [x] Add Korean and English landing copy behind the existing language toggle pattern.
- [x] Replace the previous network visual with a large product-console preview, real intersection map imagery, animated route layers, phase rings, live event chips, and readable map labels.
- [x] Add a scroll-changing intersection state story with distinct queue, phase, and briefing animation scenes.
- [x] Separate the Phase indicator ring from readable label/value text so the central `Phase 2` display does not break or overlap event chips.
- [x] Restyle landing selectors with dark civic colors, responsive rhythm, accessible focus states, mobile first-viewport console visibility, and reduced-motion support.
- [x] Polish service-launch animation details: live dot, map sweep, event pulse, confidence pulse, sticky scroll stage, and scene-specific card emphasis.

### Task 3: Verify

**Files:**
- Check: `apps/web/app/page.test.tsx`
- Check: browser route `/`

- [x] Run `npm run test:web`.
- [x] Run `npm run build:web` from a clean `.next` cache after the stale cache failure.
- [x] Run `git diff --check`.
- [x] Open `http://127.0.0.1:3000/` in the in-app browser.
- [x] Inspect desktop and mobile viewports for clipping, overlap, blank animation layers, loaded image assets, horizontal overflow, sticky scroll behavior, scene transitions, console logs, and CTA visibility.
