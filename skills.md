# Project Skill Index

Use this file as the quick project lookup for newly installed design, taste, image, and output skills.

Project behavior still starts from `AGENTS.md`: use applicable skills/plugins first, keep changes scoped, validate before claiming completion, and use Superpowers plus `karpathy-guidelines` when their trigger rules apply.

## How To Invoke

Ask Codex for the skill by name in your task prompt:

```text
Use `impeccable` and `design-taste-frontend` to redesign the dashboard.
```

```text
Use `brandkit` and `high-end-visual-design` to create a premium brand direction.
```

```text
Use `image-to-code` to generate section references first, then implement the page.
```

## Core Design Skills

- [x] `emil-design-eng` - Use for UI polish, component craft, animation judgment, and design-engineering review.
- [x] `impeccable` - Use for production-grade frontend design, redesign, UX audit, polish, theming, motion, accessibility, and responsive UI work.

## Recommended Frontend Workflow

Use this default stack for UI work:

```text
impeccable + one taste direction + emil-design-eng polish
```

- `impeccable` is the broad frontend design command system. Use it for real UI work: product screens, dashboards, redesigns, UX states, accessibility, responsiveness, implementation quality, and live polish.
- Taste skills are visual-direction variants. Pick one or two that match the desired style, such as `minimalist-ui`, `industrial-brutalist-ui`, `design-taste-frontend`, `gpt-taste`, `brandkit`, or `image-to-code`.
- `emil-design-eng` is the fine-detail polish layer. Use it near the end for interaction feel, animation judgment, component polish, active states, popovers, and whether the interface feels right.

Avoid invoking the whole Taste Skill collection at once. Too many taste skills can conflict and make the output overdesigned.

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
- Google Stitch system prompt: `stitch-design-taste` + `full-output-enforcement`

## Notes

- The listed taste/design skills are installed as user skills, so call them by their exact names in prompts.
- This file is an index for humans and agents; it does not replace skill installation or the project rules in `AGENTS.md`.
- For normal repository work, keep using Superpowers for workflow discipline and `karpathy-guidelines` for coding judgment when they apply.
