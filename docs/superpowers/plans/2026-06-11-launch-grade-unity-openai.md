# Launch Grade Unity/OpenAI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the smart-intersection MVP feel launch-ready: a realistic Unity-style virtual CCTV presentation surface, clear runtime readiness, and a path where entering OpenAI env vars activates live OpenAI behavior without code changes.

**Architecture:** Keep the current FastAPI/Next.js boundaries. Add a commit-ready web-based Unity-style renderer contract rather than claiming a real Unity binary exists. Keep OpenAI live calls behind env/readiness gates and document the exact env-only launch path.

**Tech Stack:** Next.js 15, React 19, TypeScript, Canvas/CSS, FastAPI, Pydantic Settings, OpenAI Responses/Embeddings gateway, Vitest, Pytest.

---

## Tasks

- [ ] Add a launch runtime status type and API client for `/api/runtime/readiness` so the dashboard can show whether OpenAI is env-ready.
- [ ] Upgrade the simulation viewport into a realistic virtual CCTV scene with cinematic lighting, perspective overlay, weather/lens effects, vehicle shadows, Unity/WebGL mounting boundary, and safety labeling.
- [ ] Add tests for the new UI copy and OpenAI readiness surface.
- [ ] Add launch docs and scripts so a user can copy `.env.example`, enter `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD`, run setup, and start API/Web services.
- [ ] Run API tests, web tests, build, and browser smoke verification.

## Safety boundaries

- Do not create or store an OpenAI API key in this task.
- Do not print secrets.
- Do not claim actual Unity runtime or real CCTV unless a real Unity export exists.
- Keep every control recommendation marked as simulation-only and requiring human/operator approval.
