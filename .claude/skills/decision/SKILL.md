---
name: decision
description: >
  Record an architectural or implementation decision in the PROGRESS.md Decision Log with
  its rationale, after checking it against the CLAUDE.md §2 locked decisions. Use when the
  user invokes "/decision", asks to log/record a decision, or a deviation from a spec needs
  documenting.
argument-hint: <the decision, e.g. "store refresh tokens in Redis instead of a PG table">
allowed-tools: Read, Edit, Grep, Glob
---

Record this decision: **$ARGUMENTS**

1. **Conflict check first** — compare against CLAUDE.md §2 (locked decisions) and §3 (hard
   rules). If it contradicts either → **STOP and ask**; a locked decision changes only with
   explicit human approval, and that approval must be quoted in the log entry.
2. **Impact scan** — which binding docs does it touch: `erd.md`, `openapi_spec.yaml`,
   `prompt_spec.md`, `tech_stack.md`, `architecture_overview.md`, `.env.example`, README?
   List them and offer to update them in the same change. If the decision supersedes a
   statement in a doc, mark that spot "superseded" with a pointer back to the log entry
   (precedent: S6 soft-delete vs the architecture doc).
3. **Append to PROGRESS.md §5 Decision Log**:
   `| YYYY-MM-DD | decision | rationale | ref |` — the rationale states *why this over the
   alternative considered*, the ref names the file(s)/doc section it lands in.
4. Remind: the log entry and any doc updates travel in one commit (§7), with the change
   noted in the commit message.
