---
name: scenario-check
description: >
  Generate the S1–S6 validation runbook — exact prompts, expected grounded results, and
  pass/fail checklists — and optionally run the automated slices. Never spends OpenAI
  budget without explicit confirmation. Use when the user invokes "/scenario-check" or asks
  to validate the scenarios / do the browser walkthrough.
argument-hint: (optional) scenario subset, e.g. S2 or "S3 S5"
allowed-tools: Read, Grep, Glob, Bash
---

Produce the validation runbook for **$ARGUMENTS** (default: all S1–S6).

1. **Source the steps** from the README's S1–S6 how-to and PROGRESS §2 evidence — exact
   prompts and expected results, e.g.: S1 Apple 2023 net income → **$96,995,000,000**
   (must match the DB, not be approximately right); S2 refusals for Toyota / year 2020 /
   EBITDA / a missing-year like Shopify 2022 ("no data for that year", not "unknown
   company"); the S4 limit tweak to exhaust the budget quickly; a real Stop and a real
   browser refresh for S3/S5; delete + confirmation + audit-row check for S6.
2. **Per scenario, output**: setup → steps → expected result → the evidence line to record
   (PROGRESS-ready, naming what was run and seen).
3. **Automated slices** — offer to run the matching e2e suites (usage / interruption /
   messages) via `/verify <scope>`: free, OpenAI is mocked.
4. **Live slices** (real API): the walkthrough itself is human + browser. For CLI grounding
   checks point at `backend/scripts/live-grounding.ts` — **ask before anything that calls
   OpenAI**, state the model (final validation = gpt-4o; dev = gpt-4o-mini), and afterwards
   append the spend to PROGRESS §4 Budget Tracker (CR-015).
5. **Change no statuses** — results go to the human, who signs off via `/sign-off`.
