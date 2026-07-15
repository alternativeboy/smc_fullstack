---
name: start-work
description: >
  Kick off a registered PROGRESS.md row — load its scope/DoD and the relevant docs, create
  the branch, mark 🚧, restate the plan, then wait for "go". Use when the user invokes
  "/start-work" or asks to start/resume a specific phase, FR, or sub-step.
argument-hint: <row id, e.g. FR-029, "Phase 8", or 6.2>
allowed-tools: Read, Grep, Glob, Bash, Edit
---

Start work on **$ARGUMENTS**.

1. **Find the row** in PROGRESS.md.
   - Not registered → this is a new feature: stop and point to `/add-feature` (§8, docs first).
   - Registered but ⛔ → surface the blocker instead of starting.
2. **Preconditions** (§5): the current phase must be green before the next starts; flag any
   🚧 row that would be abandoned mid-flight.
3. **Load the context**: the row's scope + DoD + Notes; its FR/NFR text in `docs/`; the
   binding specs it touches (`erd.md` / `openapi_spec.yaml` / `prompt_spec.md`); and
   `CONTEXT.md` for what's already verified — don't rebuild ✅ capabilities.
4. **Branch** per convention (`feat/FR0XX_<slug>` / `feat/PhaseN_<slug>`), never on main.
5. **Mark the row 🚧 and restate the plan**: files to touch, tests to write alongside, the
   DoD verbatim, and a budget note if OpenAI is involved (dev = gpt-4o-mini, final = gpt-4o).
   Then **STOP and wait for "go"** before writing implementation code.
