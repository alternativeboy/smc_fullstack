---
name: verify
description: >
  Run build + unit + e2e for the backend and produce PROGRESS-ready evidence (does not
  change status). Use when the user invokes "/verify" or asks to verify/run the test suite
  for this project.
argument-hint: (optional) test path or scenario, e.g. usage or S4
allowed-tools: Bash, Read, Grep, Glob
---

Run the verification suite and report concisely. Optional focus: **$ARGUMENTS**

1. `cd backend && npm run build` — report clean or the errors.
2. `npm test` (or scope to `$ARGUMENTS` if given, e.g. `npm test -- usage`) — report `N/N passing`.
3. Check `docker compose ps`. If both containers are up → `npm run test:e2e` (scope to
   `$ARGUMENTS` if given) and report suites. If not up, say so and skip e2e (don't start Docker
   unless I ask).
4. If a frontend change is in play, `cd frontend && npm run build` — report clean/errors.

Then produce a **PROGRESS evidence line** I can paste into a 🔍 row — name the exact commands run
and the pass counts. **Do NOT change any status in PROGRESS.md yourself** (agent ceiling is 🔍, and
only the human moves 🔍 → ✅). Surface any failure with the error text, don't paper over it.
