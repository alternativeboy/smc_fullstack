---
name: sign-off
description: >
  Human verification ritual for a 🔍 row — re-run the evidence item by item, collect the
  human's pass/fail on each, and only after full confirmation move 🔍 → ✅ in PROGRESS.md and
  update CONTEXT.md in the same change (CLAUDE.md §7). Use when the human invokes "/sign-off"
  or asks to review/sign off a ready-for-review item.
argument-hint: <row id, e.g. FR-027, S4, or "Phase 6">
allowed-tools: Read, Edit, Grep, Glob, Bash
---

Sign off **$ARGUMENTS**. This skill is the *pen*, not the *decision* — the human's explicit
per-item confirmation IS the sign-off. Never write ✅ without it.

1. **Locate the row** in `PROGRESS.md` (§1 Phase table, §2 Scenarios, or §3 Requirements).
   It must be 🔍 with named evidence. Not 🔍, or evidence missing → stop and say exactly
   what's missing (no evidence = not reviewable, rule 2).
2. **Build the checklist** from the row's evidence + its DoD, split into
   (a) machine-verifiable — builds, tests, curl, psql checks — and
   (b) human-only — browser walkthroughs, visual checks.
3. **Re-run (a) now** (reuse `/verify` scoping where it fits) and report the *actual* output,
   not the recorded claim. For (b), give the human the exact steps/prompts and wait for
   their result.
4. **Ask pass/fail per item.** Any fail → leave the row 🔍, record what failed in its Notes
   and in a Session Log entry, and stop.
5. **All items confirmed → apply the sign-off as one change:**
   - `PROGRESS.md` — row 🔍 → ✅ with "human-verified <date>"; update the count line if present.
   - `CONTEXT.md` — add the capability to the verified list + bump "Last updated"
     (§7: same change, never separately; only ✅ material goes here).
   - Session Log — entry with Who = human.
6. Remind the human these files must travel in one commit (offer `/ship`).
