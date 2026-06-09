# Reference-Led Product Console Landing Design

## Goal

Redesign the landing page so Smart Intersection Ops feels alive, dynamic, animated, and close to the accepted dark product-console mockup while staying honest about its simulation-only decision-support boundary.

## Approved Direction

Reference-led product console: a dark first viewport with a large right-side product preview, teal emphasis in the headline, real intersection imagery inside the console, phase-plan comparison, recommendation confidence, light-trail motion, and a clear path into the dashboard.

## Surface

- Route: `/`
- Primary action: `Open dashboard`
- Secondary action: `See the workflow`
- Dashboard route remains `/dashboard`

## Content

- Hero headline: `See the intersection before the signal changes`
- Hero copy: `One sharp product view for live awareness, phase-plan comparison, and operator-ready simulation briefings.`
- Korean and English landing copy must both be available from the page language toggle.
- Safety boundary: recommendation and simulation only, no real signal control.
- Downstream sections: scroll-changing intersection state story, live sense/simulate/brief workflow, operator boundary, dashboard preview.

## Visual System

- Dark ink background with teal, amber, and controlled red signal accents.
- Code-native text and controls, no static screenshot UI.
- Animated road routes, vehicle light trails, pulsing live dots, scroll-state scenes, event chips, and a code-native product console.
- Product preview uses `apps/web/public/landing/intersection-map.png` as the intersection imagery anchor.
- No decorative hero eyebrow, generic card grid, gradient text, or fake product claims.

## Motion

Animations should map to real meaning: flow, signal phase, emergency route, readiness, live event arrival, recommendation confidence, and scroll-position state changes. The Phase indicator must keep its rotating ring separate from readable label/value text. Reduced-motion users get static visible content with animation effectively disabled.

## Validation

- Landing page unit test covers English copy, Korean copy, CTAs, animated map label, and safety boundary.
- Browser verification checks desktop and mobile rendering, no horizontal overflow, no console warnings, loaded map asset, sticky scroll stage, and scene transitions from awareness to phase comparison to briefing.
- `npm run test:web`, `npm run build:web`, and `git diff --check` should pass.
