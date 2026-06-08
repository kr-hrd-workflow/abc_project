---
name: karpathy-guidelines
description: Use when writing, reviewing, refactoring, debugging, or planning code changes to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
license: MIT
---

# Karpathy Guidelines

Use these guidelines to reduce common LLM coding mistakes during project work.

## 1. Think Before Coding

Do not assume or hide uncertainty.

- State assumptions explicitly.
- Surface material ambiguity before coding.
- If multiple interpretations exist, name them instead of silently choosing.
- If the simple path is enough, prefer it.

## 2. Simplicity First

Build the smallest thing that satisfies the request.

- Do not add speculative features.
- Do not create abstractions for one use.
- Do not add configurability unless the project needs it now.
- If an implementation is much larger than the problem, simplify it.

## 3. Surgical Changes

Touch only what the task requires.

- Do not refactor unrelated code.
- Match existing repo style.
- Do not reformat neighboring code unless directly required.
- Remove only unused code introduced by your own changes.

## 4. Goal-Driven Execution

Define what proves the change works.

- For features, identify the behavior and test or check that proves it.
- For bugs, reproduce or characterize the failure before fixing it.
- For refactors, verify behavior before and after.
- Do not claim completion without fresh verification evidence.
