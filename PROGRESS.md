# 📊 PROGRESS — Financial Data Chat Assistant

> Single source of truth for project status. Read by both the human and the agent.
> Last updated: 2026-07-07 · Updated by: — (no work sessions yet)

---

## How to use this file (rules)

**Status values:**

| Symbol | Meaning | Who may set it |
|--------|---------|----------------|
| ⬜ | Not started | anyone |
| 🚧 | In progress | agent or human |
| 🔍 | Ready for review — implementation done, evidence attached | **agent's ceiling** |
| ✅ | Done — verified by the human | **human only** |
| ⛔ | Blocked (state the blocker in Notes) | anyone |

**Hard rules:**
1. The agent may mark items up to 🔍 only. Moving 🔍 → ✅ requires the human to verify.
2. No 🔍 without **evidence** — name the passing test(s), the command run, or the manual check performed. "Code written" is not evidence.
3. Update this file **before every commit** that changes status (also required by `CLAUDE.md` §7).
4. Append to the Session Log at the end of every working session — even failed ones. Blockers are information.
5. Never delete rows or history; strike through (~~text~~) if something is descoped, with a reason.

---

## 1. Phase Progress

| Phase | Scope | Status | Evidence (required for 🔍/✅) | Notes |
|-------|-------|--------|-------------------------------|-------|
| **0 — Ground truth** | Repo, `docs/`, `.env.example`, verify `financial_data.sql` matches `erd.md` | ⬜ | — | Schema check gates the system prompt |
| **1 — Infra** | Docker Compose (PG + Redis + init SQL + `llm_reader`), NestJS scaffold, Config, Health | ⬜ | — | DoD: `/api/health` green; `llm_reader` INSERT rejected |
| **2 — Auth** | Register/login/refresh(rotation)/logout, bcrypt, JWT guard, throttler, httpOnly cookie, Redis token store | ⬜ | — | DoD: auth e2e incl. rotation + reuse detection |
| **3 — Chat CRUD + isolation** | Entities + migrations, CRUD per OpenAPI, soft-delete, ownership → 404 | ⬜ | — | DoD: S6 e2e + cross-user isolation test |
| **4a — SQL guardrails** | `SqlValidatorService` + FinancialModule via `llm_reader` | ⬜ | — | DoD: attack-case unit tests pass (multi-stmt, comments, `pg_`, UNION) |
| **4b — LLM streaming** | OpenAI stream + tool loop, SSE protocol, save message/cost/audit | ⬜ | — | DoD: S1 + S2 against real API |
| **5 — Usage + interruption** | Redis usage + guard, partial-save on abort | ⬜ | — | DoD: S3, S4, S5 (kill connection mid-stream for real) |
| **6 — Frontend** | Auth pages, chat + `useStreamChat`, ToolCallWidget, Markdown/charts, sidebar, usage badge | ⬜ | — | DoD: human clicks through every scenario in a browser |
| **7 — Polish** | README, full S1–S6 e2e, Helmet, audit review | ⬜ | — | README = 10% of grade |

**Overall:** `0 / 9` phases done

---

## 2. Scenario Coverage (S1–S6 from the assignment)

| Scenario | Description | Covered by Phase | Status | Evidence |
|----------|-------------|------------------|--------|----------|
| S1 | Successful query → grounded, streamed answer | 4b | ⬜ | — |
| S2 | Data not available → clearly stated, no fabrication | 4b | ⬜ | — |
| S3 | Stop mid-generation → partial saved, cost charged | 5 | ⬜ | — |
| S4 | Usage limit exceeded → friendly 429 | 5 | ⬜ | — |
| S5 | Browser refresh mid-stream → history intact, no dup/loss | 5, 6 | ⬜ | — |
| S6 | Delete conversation → confirmation, ownership, audit | 3, 6 | ⬜ | — |

---

## 3. Requirement Checklist

> Mirror of the Status columns in `docs/*.md`. This table is the one that gets updated;
> sync back to the docs is optional.

### Functional (FR)

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| FR-001 | Chat application | 3, 6 | ⬜ |
| FR-002 | React + TypeScript frontend | 6 | ⬜ |
| FR-003 | NestJS backend | 1 | ⬜ |
| FR-004 | Token-by-token streaming | 4b | ⬜ |
| FR-005 | SQL tool call visible in UI | 4b, 6 | ⬜ |
| FR-006 | Markdown render (tables, charts) | 6 | ⬜ |
| FR-007 | Grounding — DB only, no hallucination | 4a, 4b | ⬜ |
| FR-008 | Missing data stated clearly | 4b | ⬜ |
| FR-009 | Spending limit per user (default $1) | 5 | ⬜ |
| FR-010 | Limit reset on fixed interval | 5 | ⬜ |
| FR-011 | Configurable limit & interval | 5 | ⬜ |
| FR-012 | User registration | 2 | ⬜ |
| FR-013 | User login | 2 | ⬜ |
| FR-014 | User isolation | 3 | ⬜ |
| FR-015 | Stop mid-generation | 5 | ⬜ |
| FR-016 | Partial message saved | 5 | ⬜ |
| FR-017 | Partial cost deducted | 5 | ⬜ |
| FR-018 | Revisit past conversations | 3, 6 | ⬜ |
| FR-019 | Delete with confirmation | 3, 6 | ⬜ |
| FR-020 | Refresh → correct history | 5, 6 | ⬜ |
| FR-021 | Friendly limit-exceeded message | 5, 6 | ⬜ |
| FR-022 | PostgreSQL + financial_data.sql | 0, 1 | ⬜ |

### Non-Functional (NFR)

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| NFR-001 | Low-latency streaming | 4b | ⬜ |
| NFR-002 | Polished UI | 6 | ⬜ |
| NFR-003 | Well-separated modules | 1–5 | ⬜ |
| NFR-004 | Docker Compose | 1 | ⬜ |
| NFR-005 | Redis for cache/usage | 1, 5 | ⬜ |
| NFR-006 | Complete README | 7 | ⬜ |
| NFR-007 | No dup/missing messages on refresh | 5 | ⬜ |
| NFR-008 | History in correct order | 3 | ⬜ |
| NFR-009 | Extensible architecture | 1 | ⬜ |
| NFR-010 | Graceful error handling | 1, 4b | ⬜ |
| NFR-011 | Input validation / SQL injection | 2, 4a | ⬜ |
| NFR-012 | bcrypt password hashing | 2 | ⬜ |
| NFR-013 | API key via config | 1 | ⬜ |
| NFR-014 | Rate limiting | 2 | ⬜ |

### Compliance (CR) — key items

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| CR-001/003/012 | Financial data accuracy / grounding | 4a, 4b | ⬜ |
| CR-002/018 | Append-only audit trail | 3, 4b | ⬜ |
| CR-004 | Access control on financial queries | 2, 4a | ⬜ |
| CR-005–008 | PDPA (consent, disclosure, erasure, breach) | 2, 3, 7 | ⬜ |
| CR-009–011 | GDPR (by design, erasure, portability) | 2, 3 | ⬜ |
| CR-013 | Disclose data source & coverage | 4b | ⬜ |
| CR-014 | OpenAI key never exposed | 1 | ⬜ |
| CR-015 | Spend tracking within $10 budget | 5 | ⬜ |
| CR-016 | Hybrid token storage + rotation | 2 | ⬜ |
| CR-017 | CORS allowlist + credentials | 1 | ⬜ |

### Gaps (GAP)

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| GAP-001 | SQL injection prevention | 4a | ⬜ |
| GAP-002 | Authentication | 2 | ⬜ |
| GAP-003 | Password storage | 2 | ⬜ |
| GAP-004 | Data accuracy verification | 4a | ⬜ |
| GAP-005 | OpenAI failure handling | 4b | ⬜ |
| GAP-006 | API key management | 1 | ⬜ |
| GAP-007 | Auth rate limiting | 2 | ⬜ |
| GAP-008 | Audit logging | 3 | ⬜ |
| GAP-009 | HTTPS/TLS (+ Secure cookie note) | 7 | ⬜ |
| GAP-010 | Data retention / cleanup | 7 | ⬜ |
| GAP-011 | CORS config (credentials: true) | 1 | ⬜ |
| GAP-012 | Health endpoint | 1 | ⬜ |
| GAP-013 | DB connection pooling | 1 | ⬜ |
| GAP-014 | Test strategy | 1–7 | ⬜ |

---

## 4. Budget Tracker (OpenAI, $10 cap — CR-015)

| Date | Session | Model | Est. spend | Cumulative |
|------|---------|-------|-----------|------------|
| — | — | — | $0.00 | **$0.00 / $10.00** |

> Rule: dev/test with `gpt-4o-mini`; switch to `gpt-4o` for final verification only.

---

## 5. Decision Log

| Date | Decision | Rationale | Ref |
|------|----------|-----------|-----|
| 2026-07-06 | NestJS + TypeORM + PG + Redis + GPT-4o | See tech_stack.md | docs/tech_stack.md |
| 2026-07-07 | Streaming = `fetch()` + ReadableStream on POST (not EventSource) | POST + Bearer header required | docs/architecture_overview.md §4 |
| 2026-07-07 | Token storage = access in memory + refresh in httpOnly cookie, Redis rotation | XSS containment, Bearer scheme preserved | docs/architecture_overview.md §3 |
| 2026-07-07 | Refresh tokens stored in Redis (hashed), not a PG table | TTL alignment, no schema change | docs/erd.md |

---

## 6. Session Log

> Append one entry per working session. Newest first. Failed sessions count — record blockers.

| Date | Who | Phase | What happened | Blockers / follow-ups |
|------|-----|-------|---------------|----------------------|
| 2026-07-07 | human + assistant | pre-0 | Docs finalized in English; token & streaming decisions locked; CLAUDE.md + PROGRESS.md created | Start Phase 0 next |
