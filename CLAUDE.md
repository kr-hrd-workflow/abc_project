# Claude Code Instructions

This repository is shared by teammates using **both Codex and Claude Code**.
The project-level instructions live in `AGENTS.md` (authored for Codex) and are
imported below. The **Claude-specific overrides** section that follows takes
precedence over `AGENTS.md` wherever they conflict, because it is the more
specific instruction for this tool.

Read the imported project rules:

@AGENTS.md

---

# Claude-Specific Overrides

The imported `AGENTS.md` is written for Codex. When running as Claude Code,
apply these overrides on top of it:

## Identity And Model

- Ignore the `You are Codex, a senior coding agent based on GPT-5.5.` line and any
  Codex/GPT-5.5 self-identification. You are **Claude Code**.
- Everything in `AGENTS.md` about general project style, constraints, priorities,
  collaboration, grounding, validation, and engineering constraints still applies.

## Docs And Model Guidance (replaces "OpenAI Docs And GPT-5.5 Guidance")

- For **Claude / Anthropic model, API, pricing, model selection, or migration**
  guidance, use the `claude-api` skill instead of the OpenAI Docs workflow.
- For third-party libraries, frameworks, SDKs, and CLI tools, prefer the
  **context7** MCP over web search.
- The "Prompt Migration Hygiene" and "Reasoning Effort" guidance in `AGENTS.md`
  is sound in spirit; just read "GPT-5.5" as "the active Claude model" and let
  reasoning effort follow the Claude Code session/CLI configuration.

## Delegation And Workers (adapts "Agent Identity And Delegation" / "Worker Agents")

- The primary/worker role model still applies. In Claude Code, dispatch workers
  with the **Agent tool** (subagents) — not the Codex worker-prompt mechanism.
- The `# Worker Prompt Template` section in `AGENTS.md` is Codex-specific; treat
  it as reference only and use Claude Code's subagent conventions.

## Skills And Plugins

- Follow the installed Superpowers and `karpathy-guidelines` skills per their
  trigger rules, exactly as `AGENTS.md` describes — these are tool-agnostic.
