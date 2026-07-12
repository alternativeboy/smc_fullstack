---
name: add-feature
description: >
  Docs-first new feature per CLAUDE.md §8 — draft the FR, impact-check against locked
  decisions, register in PROGRESS, then pause before coding. Use when the user invokes
  "/add-feature" or asks to add/build a new feature in this project.
argument-hint: <feature description>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

Add the feature described in the command arguments, following **CLAUDE.md §8** (docs lead,
code follows). Before any code:

1. **Register the FR** — find the highest `FR-0XX` in `docs/functional_requirements.md`,
   append the feature as the next id (1–2 lines + priority).
2. **Impact-check** — conflicts with a §2 locked decision → **STOP and ask**. Changes to
   `erd.md` / `openapi_spec.yaml` → update those docs first and flag it. New env var →
   `.env.example` + README table. Apply the §3 security rules.
3. **Register in PROGRESS.md** — FR row + an explicit DoD (exactly how it will be verified).
4. **Branch** `feat/FR0XX_<slug>` (never on main), give a short plan (files to touch, tests,
   DoD restated), then **STOP and wait for my "go"** before writing implementation code.

After "go": implement as one scoped task, tests alongside, mark 🔍 with evidence, commit
code + docs + PROGRESS together. Only the human moves 🔍 → ✅.

> §8 exception: trivial copy/styling changes may skip steps 1–3 — just note them in the
> Session Log. If the request is clearly trivial, say so and offer the fast path.
