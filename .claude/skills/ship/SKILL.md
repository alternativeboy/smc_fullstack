---
name: ship
description: >
  Pre-commit/PR gate — check docs sync, PROGRESS/Session Log completeness, and secrets,
  then compose the commit and open the PR per project conventions. Use when the user
  invokes "/ship" or asks to commit / open a PR for the current work.
argument-hint: (optional) commit subject override
allowed-tools: Bash, Read, Grep, Glob, Edit
---

Gate first, then ship the current work.

1. **Branch** — never commit to main. Expect `feat/FR0XX_<slug>`, `feat/PhaseN_<slug>`, or
   `fix/<slug>`; create from main if the work is sitting on main.
2. **Gate checklist** (report failures; fix only with approval):
   - PROGRESS.md reflects this work **and** a Session Log entry exists for this session —
     if not, run `/wrap-session` first (§7: update PROGRESS before every status-changing commit).
   - No assistant-set status above 🔍.
   - Docs sync: new env var → `.env.example` + README table; API change → `openapi_spec.yaml`;
     schema change → `erd.md`; prompt change → `prompt_spec.md`.
   - Secrets sweep: `.env` untracked; no `sk-` keys or hardcoded credentials in the diff (§3 rule 1).
   - Evidence current: build + tests green **this session** (`/verify`) — re-run if stale.
3. **Compose one commit** — code + docs + PROGRESS together (§7/§8). Conventional subject
   (`feat:` / `fix:` / `docs:`, or $ARGUMENTS if given), body noting any doc changes, footer:
   `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
   Show the message + file list and **wait for confirmation** before committing.
4. **Push + open the PR** with `gh pr create` — title = commit subject; body = scope, DoD /
   evidence summary, doc changes; end with:
   `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
   Return the PR URL.
