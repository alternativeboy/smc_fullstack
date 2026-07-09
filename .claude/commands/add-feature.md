---
description: Docs-first new feature per CLAUDE.md §8 — draft FR, impact-check, register in PROGRESS, then pause before coding
argument-hint: <feature description>
---

You are adding a new feature to the Financial Data Chat Assistant, following
**CLAUDE.md §8 (Docs lead, code follows)**. The request:

> **$ARGUMENTS**

Execute steps 0–4 below **now**. Steps 1–3 happen **before any code**. After step 4, **STOP**
and wait for my explicit "go" before writing implementation code.

## Step 0 — Read context
- `CLAUDE.md` §2 (locked decisions) and §8 (workflow).
- The end of `docs/functional_requirements.md` → find the highest existing `FR-0XX`.
- `PROGRESS.md` → current phases + status conventions (agent ceiling is 🔍).

## Step 1 — Record the requirement
- Assign the next id (`max FR + 1`).
- Append an `FR-0XX` row to `docs/functional_requirements.md` (1–2 lines + priority).

## Step 2 — Impact check (CRITICAL — this is where you stop if needed)
- **Conflicts with a locked decision (§2)?** (e.g. swapping NestJS/TypeORM/Postgres/Redis,
  EventSource instead of fetch-stream, token in localStorage, running LLM SQL as anything but
  `llm_reader`.) If yes → **STOP and ask me.** Never silently break a locked choice.
- **Changes the data model (`docs/erd.md`) or API contract (`docs/openapi_spec.yaml`)?**
  If yes → update those docs FIRST and clearly flag the change in your summary.
- **New secret/env var?** → it must be added to `.env.example` (and the README env table).
- **Security review:** parameterized queries only; user-scoped by JWT (foreign id → 404);
  audit if it mutates state; no secrets in code/logs.

## Step 3 — Register in PROGRESS.md
- Add a checklist row for `FR-0XX`, assign a phase (or a new one), and write an explicit
  **DoD** — exactly how it will be verified (unit/e2e test, curl, or manual browser check).

## Step 4 — Plan, then PAUSE
- Create/switch to a feature branch `feat/FR0XX_<slug>` (if on `main`, branch first).
- Give me a short plan: backend module(s) + frontend component(s) to touch, the test(s) you'll
  write, and the DoD restated.
- **STOP.** Do not write implementation code until I reply "go".

## After "go" (for reference — don't do this yet)
Implement as one scoped task → write tests alongside → mark the row **🔍** in `PROGRESS.md`
with evidence (passing test / command / manual check) → commit **code + docs + PROGRESS
together**. Only I move 🔍 → ✅.

> Exception (CLAUDE.md §8): trivial changes (copy/styling) may skip steps 1–3 — just note them
> in the Session Log. If this request is clearly trivial, say so and offer the fast path.
