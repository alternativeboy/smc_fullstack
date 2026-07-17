---
name: wrap-session
description: >
  End-of-session ritual — append the mandatory Session Log entry, audit board statuses
  against what actually happened, and list uncommitted work. Use when the user invokes
  "/wrap-session" or says they're ending/closing the working session.
argument-hint: (optional) one-line summary of the session
allowed-tools: Read, Edit, Grep, Glob, Bash
---

Close out this working session. CLAUDE.md §7: a Session Log entry is required **every**
session, including failed ones — blockers are information.

1. **Reconstruct what happened**: current branch, `git status` + `git diff --stat`,
   PROGRESS.md statuses touched this session, tests run and their counts. Use $ARGUMENTS
   as the human's own summary when given.
2. **Audit before writing anything:**
   - No status above 🔍 was set by the assistant (ceiling rule 1).
   - Every 🔍 touched today names its evidence (rule 2).
   - If implementation details changed: are `docs/` and `.env.example` still in sync?
     Flag drift — don't silently fix it.
3. **Append the Session Log row** (§6, newest first):
   `| YYYY-MM-DD | who | phase | what happened | blockers / follow-ups |` — name concrete
   artifacts (files, test counts, commands run); record failures and half-done work honestly.
4. **Report back**: uncommitted files, open blockers, and the single next step for the next
   session.

Do **not** commit anything — that's `/ship`'s job.
