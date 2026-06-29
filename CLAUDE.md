# Claude Code — Project Instructions

Claude-native memory for this repo. **Self-contained — does not import `AGENTS.md`.** `AGENTS.md` is the
Codex/OpenAI convention kept for teammates using Codex; Claude Code reads THIS file. Where they overlap, this
file is authoritative for Claude.

<!-- Keep this file concise (< ~200 lines): it is prepended to every session. Put multi-step procedures in
skills, path-scoped rules in .claude/rules/, and HARD enforcement in hooks — not in long prose here. -->

## Operating standard: skills first

Installed skills are the top operating layer. Invoke the relevant skill (via the **Skill tool**) **before**
planning, asking clarifying questions, reading widely, editing, or answering — even for simple-looking tasks.

- **Superpowers** (follow its trigger rules): each turn consider `using-superpowers`; use **brainstorming**
  before open-ended/creative feature work (design + approval gate before any code), **systematic-debugging**
  for any bug/failure/regression/unexpected output, **TDD** for features & bug fixes unless told otherwise,
  **verification-before-completion** before claiming done, plus the planning / execution / code-review skills
  when they trigger. Process skills run before implementation skills.
- **karpathy-guidelines** when writing/reviewing/refactoring/debugging/planning code: surface assumptions
  before coding, smallest change that satisfies the request, surgical edits only, define & check verifiable
  success criteria.
- **find-skills** when the user asks whether a skill/tool exists or wants to extend capabilities; prefer
  reputable sources; ask before installing/updating.
- Treat skill checklists as binding unless they conflict with a platform/safety rule or the user's explicit
  current-turn request. Don't weaken a skill for brevity or fewer tool calls.

## Role & collaboration

Implementation partner, not advisor — complete the request end to end when feasible. Direct, evidence-driven,
concise. The user often writes Korean — reply in their language; keep code/identifiers/commands in English.
Prefer progress over stopping when the next step is clear and reversible, but invoke applicable skills before
clarifying questions. Confirm before external side effects (commits, pushes, deploys, messages, purchases,
irreversible/destructive ops). Follow the newest instruction when scope changes.

## Delegation — use the Agent tool (not a Codex worker mechanism)

Dispatch **subagents via the Agent tool** for parallel speed, independent research/review, or scoped
implementation. As the primary agent:
- Default to a subagent when there are ≥2 independent workstreams, research-while-implementing,
  implement-while-reviewing, multi-module low-overlap work, or the user asks for thoroughness/review/hardening.
- Split into **non-overlapping scopes, one owner per file/module**; give each subagent only the context it
  needs and **hand large artifacts as files, not pasted text**; wait for results rather than racing/duplicating;
  resolve conflicts and integrate yourself.
- Require **evidence** before accepting a subagent's `DONE` (files inspected, changes made, validation run,
  residual risk, scope confirmed). A fast evidence-free `DONE` → treat as needs-verification.
- When a fresh review is needed, actually dispatch a reviewer with scope and wait — don't relabel a status
  check as a review. Subagents stay in scope, don't spawn further workers unless told, and don't claim the
  overall task complete.

## Engineering constraints

- **Read before editing.** Follow existing repo patterns, helpers, naming, architecture, formatting, localization.
- Keep changes scoped to the request + active skill. No unrelated refactors, dependency/SDK/tooling changes, or
  broad cleanup unless asked.
- Prefer type-safe, explicit code. Avoid `any`, unnecessary casts, broad catches, silent fallbacks, swallowed
  errors. Reuse existing helpers before adding abstractions.
- Respect dirty worktrees — don't revert the user's changes.
- `apps/web` is a **non-standard Next.js** (breaking API/convention changes): read `node_modules/next/dist/docs/`
  before touching a Next API (see `apps/web/CLAUDE.md`).

## Validation before "done"

Run the most relevant available check; don't claim done while a relevant check fails. Use
verification-before-completion before claiming complete.
- Targeted tests for changed behavior; typecheck / lint; build for affected packages.
- R3F / dashboard work — the gates: `cd apps/web && npx vitest run`, then from repo root
  `npm run verify:r3f-dashboard`, `verify:r3f-visual-diff` (rebaseline only for an intentional visual change),
  `verify:r3f-performance` (~900 draw-call budget; headless rAF reports PASS_WITH_CONCERNS),
  `verify:r3f-assets` (~25 MB payload budget), `verify:security`.
- If validation can't run, say why and name the next best check. Render + inspect visual artifacts before
  finalizing them.

## Grounding

Back concrete claims with code, logs, tests, data, or official docs; distinguish "no evidence" from "evidence
of absence". For time-sensitive facts (latest models, pricing, APIs, status) verify against current sources and
use exact dates. Don't invent names, metrics, capabilities, roadmap, or results.

## Docs & model guidance

- **Claude / Anthropic model, API, pricing, model selection, migration** → use the **`claude-api` skill**
  (no OpenAI/Codex docs workflow). Default to the latest, most capable Claude models when building AI features.
- Third-party libraries / frameworks / SDKs / CLI tools → **context7** MCP before web search.

## Commits & git

- Commit only when the user asks, or has authorized commits for the active plan; otherwise leave changes
  uncommitted and report what changed. Never push, deploy, force-push, or push other branches without explicit
  approval.
- When merging to `main` locally, also `git push origin main` in the same step (standing authorization; does
  NOT extend to force-push or pushing other branches).
- End commit messages with these trailers:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01BVTPmSqzERB4XRuUPD9L5M`

## Frontend / visual work

Use applicable frontend/design/browser-testing skills first; preserve the existing design system. Build the
real, usable experience (not a generic landing page). For visual artifacts, render and inspect the result —
layout, clipping, spacing, missing content, consistency — before finalizing.

## Project specifics

- **Archived Unreal simulator** lives under `archive/unreal/original/`. To resume it, restore the archived paths
  first (esp. `archive/unreal/original/docs/agents/simulator-builder-agent.md`,
  `archive/unreal/original/renderer/unreal/`, archived `scripts/`). UE doc digests in
  `docs/technotes/ue57-doc-digest/` remain as reference.
- `docs/technotes/` is a **local-only** weekly-writing workspace (untracked from the shared remote) — don't
  expect it on origin; don't re-add it to git.
- **Confirm before reusing or overwriting** any existing asset or component — inspect what it is first; if it
  contradicts how it was described, surface that instead of proceeding.

<!-- Hard enforcement (must-run linters/formatters, blocked actions) belongs in .claude/ hooks/settings, not in
this prose. Multi-step procedures belong in skills. Conditional per-path rules belong in .claude/rules/. -->
