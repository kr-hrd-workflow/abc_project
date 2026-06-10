# Project Skill Index

Use this file as the quick project lookup for installed project skills: design,
frontend, backend, testing, handoff, computer vision, image, and output skills.

Project behavior still starts from `AGENTS.md`: use applicable skills/plugins first, keep changes scoped, validate before claiming completion, and use Superpowers plus `karpathy-guidelines` when their trigger rules apply.

## How To Invoke

Ask Codex for the skill by name in your task prompt:

```text
Use `impeccable` as lead and `design-taste-frontend` as support to redesign the dashboard.
```

```text
Use `ui-ux-pro-max` as lead and `minimalist-ui` as support to review the dashboard design system.
```

```text
Use `brandkit` as lead and `high-end-visual-design` as support to create a premium brand direction.
```

```text
Use `next-best-practices` and `fastapi` to review the dashboard/API boundary.
```

```text
Use `webapp-testing` to run a local browser smoke test for the dashboard.
```

## Core Design Skills

- [x] `impeccable` - Use to shape, critique, redesign, polish, and harden the interface.
- [x] `ui-ux-pro-max` - Use for structured UI/UX and design-system recommendations: accessibility, layout, typography, color, interaction patterns, responsive behavior, and component quality.

## Core Implementation Skills

- [x] `next-best-practices` - Use when writing or reviewing Next.js code: App Router file conventions, RSC boundaries, async APIs, route handlers, metadata, error handling, image/font optimization, and bundling.
- [x] `fastapi` - Use when writing or reviewing FastAPI APIs, Pydantic models, route behavior, validation, and backend conventions.
- [x] `handoff` - Use when preparing a compact continuation note for another agent or future session. Keep sensitive values out of handoff docs.

## Runtime And QA Skills

- [x] `webapp-testing` - Use for local web application testing with Playwright, server lifecycle management, screenshots, browser logs, and rendered-DOM verification.
- [x] `computer-vision-opencv` - Use for OpenCV, image/video processing, YOLO-style object detection, bounding box normalization, and vision pipeline performance work.

## Recommended Frontend Workflow

Use the smallest useful design-skill set. Do not stack overlapping design skills by default.

Default routing:

- Use `impeccable` as the lead skill for frontend design, implementation, critique, audit, polish, layout, accessibility, responsive behavior, and UI hardening.
- Use `ui-ux-pro-max` only when structured design-system reasoning is useful: product/category fit, color, typography, charts, mobile interaction, accessibility, or UX checklist grounding.
- Use Taste Skill variants only for explicit visual direction or specialized workflows.

Normal cap:

- Use 1 design skill for most tasks.
- Use 2 when one is lead and one is support.
- Use 3 only for rare greenfield visual work.

Concrete routing:

- App, dashboard, or product UI: `impeccable` lead; add `ui-ux-pro-max` only for design-system, chart, mobile, or accessibility grounding.
- Landing page or portfolio: `design-taste-frontend` lead; add `ui-ux-pro-max` for structured color, typography, layout, or category reasoning; use `impeccable` for final polish.
- Existing redesign: `impeccable` or `redesign-existing-projects`; use both only when the redesign scope is substantial.
- Charts, mobile interaction, accessibility, or UX checklist work: add `ui-ux-pro-max`.
- Experimental visual splash pages: `gpt-taste`, used carefully.

## Taste Skill Collection

- [x] `brandkit` - Use for premium brand-kit images, logo systems, identity boards, and visual-world presentations.
- [x] `design-taste-frontend` - Use for anti-generic landing pages, portfolios, marketing pages, and redesigns. This is the current default taste skill.
- [x] `design-taste-frontend-v1` - Use only when exact backward compatibility with the original taste-skill behavior is needed.
- [x] `gpt-taste` - Use for high-variance Awwwards-style UX/UI with strong editorial layout and GSAP-heavy motion.
- [x] `image-to-code` - Use for visual website work where generated design images should guide the implementation.
- [x] `imagegen-frontend-web` - Use to generate one horizontal design reference image per website section.
- [x] `imagegen-frontend-mobile` - Use to generate premium mobile app screen concepts and flow images.
- [x] `minimalist-ui` - Use for clean editorial minimalism, warm monochrome palettes, flat layouts, and restrained interface design.
- [x] `industrial-brutalist-ui` - Use for raw mechanical interfaces, Swiss industrial grids, tactical telemetry, dense dashboards, and blueprint-like visuals.
- [x] `redesign-existing-projects` - Use to audit and upgrade an existing website or app without rewriting its functionality.
- [x] `high-end-visual-design` - Use for agency-grade visual quality, premium spacing, motion, typography, and anti-generic frontend polish.
- [x] `full-output-enforcement` - Use when the output must be complete, unabridged, and free of placeholders or skipped sections.
- [x] `stitch-design-taste` - Use to create agent-friendly `DESIGN.md` rules for Google Stitch screen generation.

## Suggested Combinations

- Brand direction: `brandkit` + `high-end-visual-design`
- Existing app redesign: `redesign-existing-projects` + `impeccable`
- Landing page build: `design-taste-frontend` + `imagegen-frontend-web`
- Image-first website implementation: `image-to-code` + `design-taste-frontend`
- Mobile concepting: `imagegen-frontend-mobile` + `gpt-taste`
- Minimal product UI: `minimalist-ui` + `impeccable`
- Brutalist dashboard or editorial UI: `industrial-brutalist-ui` + `design-taste-frontend`
- Design-system review: `ui-ux-pro-max` + `impeccable`
- UI audit with aesthetic direction: `impeccable` + `design-taste-frontend`
- Google Stitch system prompt: `stitch-design-taste` + `full-output-enforcement`
- Next.js dashboard implementation: `next-best-practices` + `impeccable`
- Full API/UI boundary review: `next-best-practices` + `fastapi`
- Local dashboard smoke test: `webapp-testing` + `next-best-practices`
- Vision adapter work: `computer-vision-opencv` + `fastapi`
- Session handoff: `handoff` + `karpathy-guidelines`

## Notes

- The listed taste/design skills are installed as user skills, so call them by their exact names in prompts.
- The listed implementation, testing, handoff, and vision skills are installed as user skills, so call them by their exact names in prompts.
- This file is an index for humans and agents; it does not replace skill installation or the project rules in `AGENTS.md`.
- For normal repository work, keep using Superpowers for workflow discipline and `karpathy-guidelines` for coding judgment when they apply.
