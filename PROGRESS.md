# 📊 PROGRESS — Financial Data Chat Assistant

> Single source of truth for project status. Read by both the human and the agent.
> Last updated: 2026-07-08 · Updated by: assistant (Phase 6.1 session)

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
| **0 — Ground truth** | Repo, `docs/`, `.env.example`, verify `financial_data.sql` matches `erd.md` | ✅ | Root files created (.gitignore, README.md, docker-compose.yml placeholder, .env.example, data/); verification report `docs/phase0_ground_truth_report.md` | ✅ Both mismatches resolved (human-approved 2026-07-07): count 48→**49** across all docs; `ticker`/`sector` erd.md → VARCHAR(255) to match dump. ~~Open: missing-year system-prompt rule (BlackRock/Shopify)~~ → resolved 2026-07-08 (added to prompt_spec §1 in Phase 4b.1, verified live in 4b.3). |
| **1 — Infra** | Docker Compose (PG + Redis + init SQL + `llm_reader`), NestJS scaffold, Config, Health | ✅ | **All DoD met.** Build: `nest build` clean; unit 5/5; app-level fail-fast (empty-env boot lists all 11 required vars). **Runtime (human-run w/ Docker 2026-07-07):** `docker compose ps` → both containers `healthy`; `SELECT count(*) FROM financial_data` → **192**; as `llm_reader` SELECT ok **and** INSERT → `permission denied for table financial_data`; `npm run test:e2e` → `Health (e2e)` passed (postgres+redis `up`). | Ready for human ✅ + commit. Fixed supertest default import in `health.e2e-spec.ts`. |
| **2 — Auth** | Register/login/refresh(rotation)/logout, bcrypt, JWT guard, throttler, httpOnly cookie, Redis token store | ✅ | **2.1 done (human-verified 2026-07-07):** `nest build` + migration `tsc` clean; `migration:run` created `users`; `\d users` matches erd.md (uuid `gen_random_uuid()`, email/password_hash/display_name, timestamps, deleted_at nullable, PK, unique `idx_users_email`); `migration:revert`+re-run clean; `llm_reader` SELECT on `users` → `permission denied`. **2.2 done (human-verified 2026-07-07):** build clean; unit 10/10 (auth: register, dup→409, login, wrong-pass→401, unknown→401); `test:e2e` green — register→201 (no `passwordHash` in body), login→200, `/auth/me` 200 w/ Bearer & 401 without/bad token, invalid body→400. **2.3 done (human-verified 2026-07-07):** unit 15/15 (refresh-token: issue-stores-hash, rotate single-use, reuse-revokes-family, invalid→401, revoke); `test:e2e` green — register/login set HttpOnly refresh cookie (no token in body); `/auth/refresh` rotates + new access token; **replay old cookie→401 AND latest cookie→401 (family revoked)**; logout clears cookie (Max-Age=0) + token dead. **2.4 done (human-verified 2026-07-07):** @nestjs/throttler v6 on register/login from THROTTLE_TTL/LIMIT; curl 12× POST /auth/login → ten `401` then `429 429` (limit 10/60s); all three e2e suites still green with throttler active (e2e split per-file to isolate throttle counters). | Sub-steps: **2.1 ✅ · 2.2 ✅ · 2.3 ✅ · 2.4 ✅** — Phase 2 human-reviewed & signed off ✅ 2026-07-07. |
| **3 — Chat CRUD + isolation** | Entities + migrations, CRUD per OpenAPI, soft-delete, ownership → 404 | ✅ | **3.1 done (human-verified 2026-07-07):** `nest build` + migration `tsc` clean; `migration:run` created `conversations`/`messages`/`audit_logs`; `\d` on each matches erd.md (FKs: conversations→users CASCADE, messages→conversations CASCADE, audit_logs→users SET NULL; `numeric(10,6)` cost; soft-delete `deleted_at`; all indexes); `migration:revert`+re-run clean; `llm_reader` SELECT on all three → `permission denied`. **3.2 done (human-verified 2026-07-07):** build clean; unit 20/20 (chat: list scoping, getOne/getMessages/softDelete→404 on foreign id, owned delete); `test:e2e` green — CRUD (create 201 'New Chat' → paginated list → get empty messages → delete 200 {message} → gone + 404); **cross-user isolation: B gets 404 on A's conv for get/messages/delete, absent from B's list**; message ordering (seeded out-of-order → first/second/third, NFR-008). **3.3 done (human-verified 2026-07-07):** append-only AuditService (insert-only, unit-tested for no update/delete) + `@Audit` decorator + AuditInterceptor (logs on success only); delete route audited. unit 22/22; `test:e2e` S6 green — delete→200 → `delete_conversation` audit row (userId + metadata.messageCount=2) → conversation 404/hidden → **messages RETAINED** (soft-delete, no cascade); cross-user delete → 404 + NO audit row. | Sub-steps: **3.1 ✅ · 3.2 ✅ · 3.3 ✅** — Phase 3 human-reviewed & signed off ✅ 2026-07-07. |
| **4a — SQL guardrails** | `SqlValidatorService` + FinancialModule via `llm_reader` | ✅ | **4a.1 done (self-verified 2026-07-07, no DB):** `nest build` clean; `sql-validator.service.spec.ts` **41 tests green** (full suite 63/63). Blocks: all 14 keywords incl. mixed-case, stacked `;`, line/block comments, `pg_`/`pg_sleep`/`information_schema`, `users`/`conversations`/`messages`/`audit_logs` direct + via JOIN/UNION exfil, no-`financial_data` queries. Passes: CTE, aggregates, GROUP/ORDER BY, LIMIT, and blocked-words-in-string-literals (strengthening). **4a.2 done (human-verified 2026-07-07):** FinancialModule with a SECOND named `llm_reader` DataSource (statement_timeout 5s), FinancialData entity (read-only), FinancialService (Layer 2 validate → Layer 3 execute → 200-row cap + truncated). unit 66/66; `test:e2e` green — valid SELECT returns rows, cross-join capped at 200/truncated, **raw INSERT/UPDATE/DELETE via llm_reader → `permission denied` (Layer 3 independent of validator)**, `SELECT users` denied, `pg_sleep(10)` aborted by statement_timeout. | Sub-steps: **4a.1 ✅ · 4a.2 ✅** — Phase 4a human-reviewed & signed off ✅ 2026-07-07. |
| **4b — LLM streaming** | OpenAI stream + tool loop, SSE protocol, save message/cost/audit | ✅ | **4b.1 done (self-verified 2026-07-08, no DB/API — $0):** LlmModule building blocks — system prompt + execute_sql tool VERBATIM from prompt_spec (asserted, incl. new missing-year rule), StreamEvent interface, PromptBuilder, OutputValidator (Layer 4, log-only), cost helper (§5 pricing), `llm.service.ts` tool-loop generator. `nest build` clean; full suite **70/70**; mocked-OpenAI tests cover full S1 exchange (tool_call→execute→tool_result→answer→usage, cost asserted) + validator-rejection fed back without crash. **4b.2 done (human-verified 2026-07-08, mocked OpenAI — $0):** `POST /conversations/:id/messages` (JWT-guarded, ownership→404), MessagesService orchestrates stream→SSE→persist. e2e (38 passing): ordered SSE tool_call/tool_result/token/usage/done, user+assistant messages persisted (cost≈$0.0048, tool_calls, is_partial=false), audit `query` row written, cross-user→404. Unit: abort→partial (is_partial=true) save, OpenAI failure→`event:error` no crash. maxRetries=2 (GAP-005). **4b.3 done (human-run live, 2026-07-08):** S1/S2 verified end-to-end on gpt-4o-mini AND gpt-4o. All grounded correctly (numbers match DB): S1 single Apple 2023 = $96,995,000,000; S1 table = 15 tech companies 2024 exact; S2 Toyota → "I don't have data"; S2 2020 → "only 2022-2025"; S2 EBITDA → lists 4 metrics; **missing-year Shopify 2022 → "I don't have data for Shopify in 2022"** (rule works). Source disclosed (CR-013). Cost/audit persisted. Budget logged §4. | Sub-steps: **4b.1 ✅ · 4b.2 ✅ · 4b.3 ✅** — Phase 4b human-reviewed & signed off ✅ 2026-07-08. |
| **5 — Usage + interruption** | Redis usage + guard, partial-save on abort | ✅ | **5.1 done (human-verified 2026-07-08, $0):** UsageModule — `usage.service.ts` (atomic `INCRBYFLOAT` + EXPIRE-on-first, TTL reset, limit/interval from config), `UsageLimitGuard` (pre-flight → friendly 429 UsageLimitError + resetAt), `GET /usage/status`; charge on normal completion. unit 79/79 (TTL window integrity, atomic no-read-modify-write, getStatus math); `test:e2e` — **S4**: message charges usage → exhaust → 429 friendly body; concurrent 20× track() sums exactly (real Redis atomicity). **5.2 done (human-verified 2026-07-08, $0):** LlmService handles abort internally → returns partial with fair cost (chars/4 estimate; prompt dominates); MessagesService persists is_partial=true + charges Redis + audits. Fixes: `res.on('close')` (reliable disconnect vs req 'close') + defensive `write()` (dead-socket writes no longer abort persistence). unit 79/79; `test:e2e` **S3/S5** — raw http `req.destroy()` severs mid-stream → partial saved (content + cost>0), usage charged, audit is_partial row, history intact (user + 1 partial, ordered, no dup). | Sub-steps: **5.1 ✅ · 5.2 ✅** — Phase 5 human-reviewed & signed off ✅ 2026-07-08. |
| **6 — Frontend** | Auth pages, chat + `useStreamChat`, ToolCallWidget, Markdown/charts, sidebar, usage badge | 🚧 | **6.1 code-complete (2026-07-08):** Vite + React 18 + TS + Tailwind + hand-rolled shadcn-style ui + Zustand + React Router. Auth: `auth.store` (token IN MEMORY, no persist), `api.ts` (Bearer; credentials:'include' only on refresh/logout; 401→silent-refresh-once→retry→else /login), `auth.service`, Login/Register pages, `useAuthBootstrap` (mount refresh + /me), ProtectedRoute. `npm run build` clean (tsc + vite, 62 modules). **Browser DoD ✅ (human, 2026-07-08):** register → reload stays logged in via silent refresh; access token NOT in local/session storage; logout→/login; bad login errors. Fixed a cross-origin cookie drop with a **Vite dev proxy** (same-origin). **6.2 code-complete (2026-07-08, builds ✅ / browser ⏳):** `chat.store` + `useStreamChat` (fetch+ReadableStream SSE parse, AbortController Stop, 401 silent-refresh + 429 branch), ChatPage (create/select, most-recent-on-load restores history), ChatMessage/ChatInput/StreamingIndicator, `is_partial` "interrupted" note (S5). `npm run build` clean (68 modules). **6.3 code-complete (2026-07-08, builds ✅ / browser ⏳):** ToolCallWidget (SQL visible open-by-default while running + row count, collapsible, rows expandable), MarkdownRenderer (react-markdown + remark-gfm, GFM tables, HTML escaped), ResultChart (Recharts bar chart from a parsed markdown table — numeric column heuristic, survives reload; renders nothing if no table). `npm run build` clean. | Sub-steps: **6.1 ✅ · 6.2 ✅ · 6.3 ✅** · 6.4 sidebar+usage ⬜. Phase DoD: click through S1–S6 in a browser. |
| **7 — Polish** | README, full S1–S6 e2e, Helmet, audit review | ⬜ | — | README = 10% of grade |

**Overall:** `7 / 9` phases done (Phase 0/1/2/3 ✅; Phase 4a ✅; Phase 4b ✅; Phase 5 ✅)

---

## 2. Scenario Coverage (S1–S6 from the assignment)

| Scenario | Description | Covered by Phase | Status | Evidence |
|----------|-------------|------------------|--------|----------|
| S1 | Successful query → grounded, streamed answer | 4b | ✅ | Live gpt-4o: single value (Apple 2023 net income $96.99B, matches DB) + table (15 tech cos 2024, all exact) |
| S2 | Data not available → clearly stated, no fabrication | 4b | ✅ | Live gpt-4o: Toyota / 2020 / EBITDA / Shopify-2022 all declined correctly, no fabrication |
| S3 | Stop mid-generation → partial saved, cost charged | 5 | ✅ | interruption.e2e: severed socket → partial is_partial=true, cost>0, usage charged |
| S4 | Usage limit exceeded → friendly 429 | 5 | ✅ | usage.e2e: exhausted budget → POST message pre-flight → 429 UsageLimitError (error/message with $limit/resetAt) |
| S5 | Browser refresh mid-stream → history intact, no dup/loss | 5, 6 | 🔍 | Backend (interruption.e2e) + **UI browser-verified (6.2)**: Stop mid-stream → partial with "interrupted" note → reload → partial + history intact, no dup. |
| S6 | Delete conversation → confirmation, ownership, audit | 3, 6 | 🚧 | Backend ✅ (delete→200→audit row→404/hidden→messages retained; cross-user→404+no audit). Remaining: confirmation dialog (Phase 6). |

---

## 3. Requirement Checklist

> Mirror of the Status columns in `docs/*.md`. This table is the one that gets updated;
> sync back to the docs is optional.

### Functional (FR)

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| FR-001 | Chat application | 3, 6 | 🚧 |
| FR-002 | React + TypeScript frontend | 6 | 🔍 |
| FR-003 | NestJS backend | 1 | ✅ |
| FR-004 | Token-by-token streaming | 4b | ✅ |
| FR-005 | SQL tool call visible in UI | 4b, 6 | 🔍 |
| FR-006 | Markdown render (tables, charts) | 6 | 🔍 |
| FR-007 | Grounding — DB only, no hallucination | 4a, 4b | ✅ |
| FR-008 | Missing data stated clearly | 4b | ✅ |
| FR-009 | Spending limit per user (default $1) | 5 | ✅ |
| FR-010 | Limit reset on fixed interval | 5 | ✅ |
| FR-011 | Configurable limit & interval | 5 | ✅ |
| FR-012 | User registration | 2 | ✅ |
| FR-013 | User login | 2 | ✅ |
| FR-014 | User isolation | 3 | ✅ |
| FR-015 | Stop mid-generation | 5 | ✅ |
| FR-016 | Partial message saved | 5 | ✅ |
| FR-017 | Partial cost deducted | 5 | ✅ |
| FR-018 | Revisit past conversations | 3, 6 | 🚧 |
| FR-019 | Delete with confirmation | 3, 6 | 🚧 |
| FR-020 | Refresh → correct history | 5, 6 | 🔍 |
| FR-021 | Friendly limit-exceeded message | 5, 6 | 🚧 |
| FR-022 | PostgreSQL + financial_data.sql | 0, 1 | ✅ |

### Non-Functional (NFR)

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| NFR-001 | Low-latency streaming | 4b | ✅ |
| NFR-002 | Polished UI | 6 | ⬜ |
| NFR-003 | Well-separated modules | 1–5 | ⬜ |
| NFR-004 | Docker Compose | 1 | ✅ |
| NFR-005 | Redis for cache/usage | 1, 5 | ✅ |
| NFR-006 | Complete README | 7 | ⬜ |
| NFR-007 | No dup/missing messages on refresh | 5 | ✅ |
| NFR-008 | History in correct order | 3 | ✅ |
| NFR-009 | Extensible architecture | 1 | ✅ |
| NFR-010 | Graceful error handling | 1, 4b | ✅ |
| NFR-011 | Input validation / SQL injection | 2, 4a | ✅ |
| NFR-012 | bcrypt password hashing | 2 | ✅ |
| NFR-013 | API key via config | 1 | ✅ |
| NFR-014 | Rate limiting | 2 | ✅ |

### Compliance (CR) — key items

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| CR-001/003/012 | Financial data accuracy / grounding | 4a, 4b | ✅ |
| CR-002/018 | Append-only audit trail | 3, 4b | ✅ |
| CR-004 | Access control on financial queries | 2, 4a | ✅ |
| CR-005–008 | PDPA (consent, disclosure, erasure, breach) | 2, 3, 7 | ⬜ |
| CR-009–011 | GDPR (by design, erasure, portability) | 2, 3 | ⬜ |
| CR-013 | Disclose data source & coverage | 4b | ✅ |
| CR-014 | OpenAI key never exposed | 1 | ✅ |
| CR-015 | Spend tracking within $10 budget | 5 | ✅ |
| CR-016 | Hybrid token storage + rotation | 2 | ✅ |
| CR-017 | CORS allowlist + credentials | 1 | ✅ |

### Gaps (GAP)

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| GAP-001 | SQL injection prevention | 4a | ✅ |
| GAP-002 | Authentication | 2 | ✅ |
| GAP-003 | Password storage | 2 | ✅ |
| GAP-004 | Data accuracy verification | 4a | ✅ |
| GAP-005 | OpenAI failure handling | 4b | ✅ |
| GAP-006 | API key management | 1 | ✅ |
| GAP-007 | Auth rate limiting | 2 | ✅ |
| GAP-008 | Audit logging | 3 | ✅ |
| GAP-009 | HTTPS/TLS (+ Secure cookie note) | 7 | ⬜ |
| GAP-010 | Data retention / cleanup | 7 | ⬜ |
| GAP-011 | CORS config (credentials: true) | 1 | ✅ |
| GAP-012 | Health endpoint | 1 | ✅ |
| GAP-013 | DB connection pooling | 1 | ✅ |
| GAP-014 | Test strategy | 1–7 | ⬜ |

---

## 4. Budget Tracker (OpenAI, $10 cap — CR-015)

| Date | Session | Model | Est. spend | Cumulative |
|------|---------|-------|-----------|------------|
| 2026-07-08 | 4b.3 dev pass (6 scenarios) | gpt-4o-mini | ~$0.002 actual (app bills $0.0280 at gpt-4o rates) | ~$0.002 |
| 2026-07-08 | 4b.3 final pass (6 scenarios) | gpt-4o | $0.0282 | **~$0.030 / $10.00** |

> Rule: dev/test with `gpt-4o-mini`; switch to `gpt-4o` for final verification only.
> Note: `calculateCost` always applies gpt-4o pricing (prompt_spec §5 / CLAUDE.md §3 rule 8),
> so the app-recorded cost on mini overstates real OpenAI spend ~16×. "Est. spend" above is the
> real OpenAI-account spend for the $10 cap.

---

## 5. Decision Log

| Date | Decision | Rationale | Ref |
|------|----------|-----------|-----|
| 2026-07-06 | NestJS + TypeORM + PG + Redis + GPT-4o | See tech_stack.md | docs/tech_stack.md |
| 2026-07-07 | Streaming = `fetch()` + ReadableStream on POST (not EventSource) | POST + Bearer header required | docs/architecture_overview.md §4 |
| 2026-07-07 | Token storage = access in memory + refresh in httpOnly cookie, Redis rotation | XSS containment, Bearer scheme preserved | docs/architecture_overview.md §3 |
| 2026-07-07 | Refresh tokens stored in Redis (hashed), not a PG table | TTL alignment, no schema change | docs/erd.md |
| 2026-07-07 | Company count corrected 48 → **49** across all docs | Dump has 49 companies; prompt_spec's own enumerated list was already 49 (prose was wrong) — grounding accuracy (S2) | docs/phase0_ground_truth_report.md |
| 2026-07-07 | `financial_data.ticker`/`sector` = VARCHAR(255) (relaxed erd.md to match dump) | Chosen over migrating the provided dump; data fits either way | docs/phase0_ground_truth_report.md |
| 2026-07-07 | Single **root `.env`** as the source of truth (not backend/.env) | Compose interpolation + Nest ConfigModule read the same file; Nest `envFilePath: ['.env','../.env']`. Deviates from folder_structure.md's `backend/.env` note. | backend/src/config/config.module.ts |
| 2026-07-07 | Added a small global `RedisModule` (ioredis client) not in folder_structure.md | Health check needs a Redis client now; usage/auth reuse it later. Terminus has no built-in Redis indicator → custom `RedisHealthIndicator`. | backend/src/redis/ |
| 2026-07-07 | Env validation via **Joi** `validationSchema` in ConfigModule | Idiomatic fail-fast with @nestjs/config; BCRYPT_COST min 12 enforced at boot | backend/src/config/env.validation.ts |
| 2026-07-07 | Added `GET /auth/me` to openapi_spec.yaml (docs-lead §8) | Exercises JwtAuthGuard in Phase 2 (no protected resource until Phase 3) + frontend session hydration | docs/openapi_spec.yaml, backend/src/auth/auth.controller.ts |
| 2026-07-07 | Phase 2.2 register/login return access token in **body only** (no refresh cookie yet) | Temporary, scoped deviation from openapi; the httpOnly refresh cookie lands in Phase 2.3 and realigns the Set-Cookie contract | backend/src/auth/auth.controller.ts |
| 2026-07-07 | Phase 2.3 realigns register/login/refresh with the openapi Set-Cookie contract (resolves the 2.2 deviation). No openapi edit needed. | `/auth/refresh` + `/auth/logout` already in spec; register/login's documented Set-Cookie now actually fires | backend/src/auth/auth.controller.ts, backend/src/auth/services/refresh-token.service.ts |
| 2026-07-07 | Logout is cookie-driven, not JwtAuthGuard-protected | openapi security is OR (BearerAuth OR RefreshCookie); a user with an expired access token must still be able to clear their refresh cookie. Best-effort revoke + always clear cookie. | backend/src/auth/auth.controller.ts |
| 2026-07-07 | Throttle `register`+`login` only (not all auth routes); split e2e into two files | ThrottlerGuard counts per-IP across guarded routes; per-file apps get isolated counters so legit e2e flows stay under limit 10 without a test-only .env override. refresh/logout have their own reuse protection. | backend/src/auth/auth.module.ts, backend/test/auth*.e2e-spec.ts |
| 2026-07-07 | S6 = SOFT-delete (conversation hidden, messages RETAINED) — supersedes architecture-doc S6 "cascade-removed" | CLAUDE.md §2 locks conversation delete as soft-delete; hard-delete/cascade contradicts it. Messages kept for history/audit; conversation excluded from list/get (404). | backend/src/chat/chat.service.ts, docs/architecture_overview.md §S6 (superseded) |
| 2026-07-07 | Audit via reusable `@Audit` decorator + AuditInterceptor (logs on success only) | Declarative, reusable for later phases; success-only tap means a 404 (foreign id) writes NO audit row. AuditService is insert-only (append-only, CR-002/018). | backend/src/common/{decorators/audit.decorator,interceptors/audit.interceptor,services/audit.service}.ts |
| 2026-07-08 | Added missing-year rule to prompt_spec §1 Rule 2 (human-approved) | Company-listed + year-in-range + no row (BlackRock 2024–25, Shopify 2022–23) → "no data for [company] in [year]", not company-absent, no fabrication. Strengthens grounding (FR-008/CR-013). Prereq for 4b.1's verbatim system-prompt copy. | docs/prompt_spec.md §1 |
| 2026-07-08 | LlmService tool loop calls `FinancialService.execute()` (single Layer 2+3 choke point), not validate-then-execute separately | Avoids double validation; FinancialService already enforces Layer 2 (validator) + Layer 3 (llm_reader). A rejection surfaces as a thrown error fed back to the model as the tool result. | backend/src/llm/llm.service.ts |
| 2026-07-08 | UsageService reads TTL **sequentially after** INCRBYFLOAT (not the prompt_spec §5 `Promise.all`) | A parallel TTL read can hit before the key exists → returns -2, so the EXPIRE-on-first never fires and the key would never reset. Sequential read reports -1 on a new key. | backend/src/usage/usage.service.ts |
| 2026-07-08 | Disconnect detected via **`res.on('close')`**, not `req.on('close')` | `res` 'close' fires reliably/promptly on premature socket termination during a streaming response; `req` 'close' (POST body already read) is late/unreliable mid-response. Plus a defensive `write()` guard so dead-socket writes don't throw and abort the partial persistence. | backend/src/chat/messages.controller.ts, messages.service.ts |
| 2026-07-08 | Partial cost on abort estimated via **~4 chars/token** | OpenAI's usage chunk only arrives at a round's end, so it's unavailable on a mid-stream abort — any method is an estimate. Prompt tokens (which were sent) dominate the fair charge. | backend/src/llm/llm.service.ts (abortResult) |
| 2026-07-08 | Frontend uses a **Vite dev proxy** (`/api` → :3000) so all requests are same-origin | Cross-origin (5173→3000) drops the httpOnly Set-Cookie on login/register unless credentials:include everywhere; the proxy keeps the "credentials:include only on refresh/logout" rule intact, needs no CORS, and mirrors a prod reverse proxy. VITE_API_URL empty in dev. | frontend/vite.config.ts, frontend/src/services/api.ts |
| 2026-07-07 | SqlValidator scans keyword/table/`;`/comment on a **string-literal-blanked** copy of the SQL | Strengthening over prompt_spec §3's raw-regex: prevents false positives when a blocked word appears as DATA (e.g. `company = 'Drop Inc'`). Does NOT weaken security — Layer 3 (llm_reader) is still the real guarantee. **Proposed prompt_spec §3 update** for human review. | backend/src/llm/services/sql-validator.service.ts |

---

## 6. Session Log

> Append one entry per working session. Newest first. Failed sessions count — record blockers.

| Date | Who | Phase | What happened | Blockers / follow-ups |
|------|-----|-------|---------------|----------------------|
| 2026-07-08 | assistant | 6.3 | Tool widget + markdown/charts (grading-critical): ToolCallWidget (FR-005, SQL visible while running + row count + expandable rows), MarkdownRenderer (react-markdown + remark-gfm tables, raw HTML escaped), ResultChart (Recharts bar chart parsed from the markdown table — numeric-column heuristic, `$B/M` parsing, renders only from streamed data, survives reload). Installed react-markdown/remark-gfm/recharts/@tailwindcss/typography. `npm run build` clean (2602 modules; recharts bumps bundle — acceptable for dev). | 6.3 code ✅, **browser DoD pending human** (SQL widget + table + chart on the tech-2024 query). Next: 6.4. Optional: lazy-load recharts to trim bundle. |
| 2026-07-08 | assistant | 6.2 | Chat core + streaming: `chat.store`, `chat.service`, `useStreamChat` (POST fetch + ReadableStream SSE parsing, dispatch token/tool_call/tool_result/usage/done/error, AbortController Stop, 401→silent-refresh→retry, 429→limitError), ChatPage (new/select conversation, opens most-recent on load so reload restores history), ChatMessage (+ is_partial "interrupted" note, tool-call stub for 6.3), ChatInput (Send/Stop, Enter-to-send), StreamingIndicator. `npm run build` clean (68 modules). | 6.2 code ✅, **browser DoD pending human** (stream live, Stop→partial, reload→partial persists). Next after browser check: 6.3. |
| 2026-07-08 | assistant | 6.1 | Scaffolded `frontend/` (Vite + React 18 + TS + Tailwind + shadcn-style ui + Zustand + React Router) + full auth: in-memory token store, api client with silent-refresh-on-401, Login/Register, mount bootstrap refresh + /me, ProtectedRoute. Used hand-rolled shadcn-style components (no shadcn CLI — needs interactive init) and plain forms (no react-hook-form) to keep deps lean. `npm run build` clean. | 6.1 code ✅, **browser DoD pending human** (sandbox has no browser/Docker). Needs backend running + CORS_ORIGIN=http://localhost:5173 + COOKIE_SECURE=false. Next after browser check: 6.2. |
| 2026-07-08 | human | 5 | Reviewed & signed off Phase 5 → row + requirement rows to ✅ (FR-009/010/011/015/016/017, NFR-005/007, CR-015, S3, S4). Kept 🚧 (Phase-6 UI): FR-020, FR-021, S5. Overall **7/9**. | Only Phase 6 (Frontend) + Phase 7 (Polish) remain. Backend feature-complete. |
| 2026-07-08 | human + assistant | 5.2 | Interruption: LlmService handles abort internally (returns partial + fair chars/4 cost), MessagesService persists is_partial + charges + audits. Debugged the S5 e2e: partial wasn't saving because (a) `req.on('close')` fired late — human switched to `res.on('close')`; (b) dead-socket `res.write()` threw → aborted persistence — added defensive `write()` guard. Real socket-sever test (raw http `req.destroy()`) now green. unit 79/79, human ran `test:e2e` → S3/S5 pass. $0 spent. **Phase 5 complete → 🔍 overall.** On `feat/Phase5_*`. | 5.2 ✅ (S3/S5, FR-015/016/017, NFR-007 🔍; FR-020 🚧 UI Phase 6). Awaiting human review Phase 5 → ✅. Next: Phase 6 (Frontend). |
| 2026-07-08 | human + assistant | 5.1 | Usage tracking + limit guard: `usage/` module (UsageService atomic INCRBYFLOAT+TTL, UsageLimitGuard pre-flight 429, GET /usage/status), charge on completion wired into MessagesService. Guard order JwtAuthGuard→UsageLimitGuard on the message endpoint. Fixed a flaky S4 e2e (process.env override of USAGE_LIMIT leaked across e2e files — rewrote S4 to exhaust via `track()`, no env mutation; this also fixed a messages.e2e 403). Verified: build clean, unit 79/79, human ran `test:e2e` → S4 429 + concurrency atomic. $0 spent. On `feat/Phase5_*`. | 5.1 ✅ (FR-009/010/011/021, NFR-005, CR-015 🔍; S4 🔍). Next: 5.2 (partial charge on abort + real socket-kill S3/S5). Commit 5.1. |
| 2026-07-08 | human | 4b | Reviewed & signed off Phase 4b → row + requirement rows to ✅ (FR-004/007/008, NFR-001/010, CR-001/003/012, CR-013, GAP-005, S1, S2). Kept FR-005 🚧 (tool-call UI = Phase 6). Committed 4b on `feat/Phase4b_LLM_Streaming`, opened PR; set OPENAI_MODEL back to gpt-4o-mini. Overall 6/9. Synced README.md + CATCHUP.md. | Next: Phase 5 (usage limits + interruption / S5 real abort). |
| 2026-07-08 | human + assistant | 4b.3 | Live S1/S2 grounding via `scripts/live-grounding.ts` (drives the real SSE endpoint). Human ran both gpt-4o-mini and gpt-4o. **All 6 scenarios grounded correctly on both models** — figures match the DB exactly; missing-year rule confirmed (Shopify 2022 → "no data", not fabricated); source disclosed. Real spend ~$0.030 total (well under $10). No prompt/tool changes made. **Phase 4b complete → 🔍 overall.** On `feat/Phase4b_*`. | 4b.3 ✅ (S1/S2, FR-004/007/008, CR-001/003/012/013, NFR-001 🔍; FR-005 🚧 UI Phase 6). Awaiting human review Phase 4b → ✅. Next: Phase 5 (usage limits + interruption). |
| 2026-07-08 | human + assistant | 4b.2 | SSE endpoint + persistence + abort: `chat/messages.controller.ts` (POST /conversations/:id/messages, JWT-guarded, @Res SSE, @HttpCode 200, req 'close'→abort), `messages.service.ts` (buildHistory→save user→stream events→persist assistant+audit; abort→partial; failure→event:error). Added AbortSignal to LlmService.streamChat; OpenAI maxRetries=2. Wired MessagesController/Service into ChatModule (imports LlmModule). Verified: build clean, unit 73/73, human ran `test:e2e` → 38 passing incl. new Messages SSE suite (persistence, audit, 404). $0 spent (OpenAI mocked). On `feat/Phase4b_*`. | 4b.2 ✅ (NFR-010, GAP-005 🔍). Next: 4b.3 (live gpt-4o S1/S2 — the only budget step). Commit 4b.2. Budget spent so far: $0. |
| 2026-07-08 | human + assistant | 4b.1 | Prereq: added missing-year rule to prompt_spec §1 (human chose option 1). Built LlmModule core: verbatim system-prompt + execute_sql tool constants, StreamEvent interface, PromptBuilder, OutputValidator (log-only), cost helper, `llm.service.ts` tool-loop async generator (stream→tool_call→FinancialService.execute→tool_result→resume; rejection fed back). Installed openai@4.104. **Self-verified (no DB/API, $0): build clean + suite 70/70** (mocked-OpenAI S1 exchange + rejection case + verbatim-constant asserts). Not yet wired into AppModule (that's 4b.2). On `feat/Phase4b_*`. | 4b.1 ✅. Next: 4b.2 (SSE endpoint + persistence + abort, mocked LLM). Commit 4b.1. Budget spent: $0. |
| 2026-07-07 | human | 3 + 4a | Reviewed and signed off Phase 3 and Phase 4a → both rows ✅. Requirement rows to ✅: FR-014, NFR-008, GAP-008, CR-002/018 (Phase 3); GAP-001, GAP-004, NFR-011, CR-004 (Phase 4a). Kept 🚧 (frontend pending, Phase 6): FR-018, FR-019, S6. Overall 5/9. | Next: prompt_spec §3 (literal-blanking) + §1 (missing-year) doc updates, then Phase 4b (LLM streaming). |
| 2026-07-07 | human + assistant | 4a.2 | Layer-3 execution: `financial/entities/financial-data.entity.ts` (read-only), second named `llm_reader` TypeORM DataSource (statement_timeout 5s, synchronize false), `financial.service.ts` (validate→execute→200-row cap+truncated), FinancialModule provides/exports SqlValidatorService (no circular dep) wired into AppModule. Verified: build clean, unit 66/66, human ran `test:e2e` → llm_reader SELECT ok, cross-join capped 200, **raw INSERT/UPDATE/DELETE → permission denied (Layer 3 independent)**, users denied, pg_sleep aborted by timeout. **Phase 4a complete → 🔍 overall.** On `feat/Phase4a_SQL_Guardrails`. | 4a.2 ✅ (GAP-001/004, NFR-011, CR-004 🔍). Awaiting human review of Phase 4a → ✅. Next: prompt_spec §3 update (literal-blanking) + missing-year rule, then Phase 4b (LLM streaming). |
| 2026-07-07 | assistant | 4a.1 | SQL validator (Layer 2): `llm/services/sql-validator.service.ts` implementing the 6 prompt_spec rules, with string-literal-safe scanning (strengthening). 41 unit tests cover every attack case (keywords mixed-case, stacked stmts, comment bypass, pg_/system tables, app tables via JOIN/UNION exfil, no-financial_data) + legit passes (CTE/aggregates/ORDER/LIMIT) + blocked-words-as-string-data. **Fully self-verified (no DB): build clean + full suite 63/63.** On `feat/Phase4a_SQL_Guardrails`. | 4a.1 ✅ (agent self-verified). Decision-Log: proposed prompt_spec §3 update for the literal-blanking strengthening — human to review. Next: 4a.2 (llm_reader execution + Layer-3 integration). Commit 4a.1. |
| 2026-07-07 | human + assistant | 3.3 | Audit + S6: append-only `common/services/audit.service.ts` (insert-only), `@Audit` decorator + `audit.interceptor.ts` (success-only), global `common.module.ts`; DELETE audited with metadata {conversationId, messageCount}. Reconciled S6 to soft-delete (messages retained, not cascade-removed). Fixed a TypeORM jsonb insert typing (localized cast). Verified: build clean, unit 22/22, human ran `test:e2e` → S6 green (audit row, 404/hidden, messages retained; cross-user 404 + no audit). **Phase 3 complete → 🔍 overall.** On `feat/Phase3_Chat_CRUD_Isolation`. | 3.3 ✅ (S6, FR-019, GAP-008, CR-002/018 🔍). Awaiting human review of Phase 3 → ✅. Next: Phase 4a (SQL guardrails). |
| 2026-07-07 | human + assistant | 3.2 | Conversation CRUD + isolation: ChatModule (service scopes every query by user_id via `findOwned` → 404; soft-delete via softRemove; list paginated updated_at DESC; messages ordered created_at ASC), ChatController (JWT-guarded, ParseUUIDPipe, delete 200 {message} per spec), wired into AppModule. Verified: build clean, unit 20/20, human ran `test:e2e` → CRUD + **cross-user 404 isolation (FR-014)** + message ordering (NFR-008) green. On `feat/Phase3_Chat_CRUD_Isolation`. | 3.2 ✅ (FR-014, FR-018, NFR-008 → 🔍; FR-001, FR-019 partial 🚧). Next: 3.3 (audit + S6 — soft-delete reconciliation). Commit 3.2. |
| 2026-07-07 | human + assistant | 3.1 | Chat data layer: `chat/entities/conversation.entity.ts` (soft-delete, user FK), `chat/entities/message.entity.ts` (created_at only, no updated_at, numeric cost), `common/entities/audit-log.entity.ts` (append-only, nullable user), migration `1783468800000-CreateChatTables.ts` (3 tables + indexes + FKs). Assistant verified build + migration typecheck; human ran the stack: `migration:run` → all three tables match erd.md, `migration:revert`+re-run clean, `llm_reader` denied on all three. On `feat/Phase3_Chat_CRUD_Isolation`. | 3.1 ✅. Next: 3.2 (conversation CRUD + isolation→404). Commit 3.1. Note for 3.3: reconcile soft-delete vs the architecture-doc S6 "cascade-removed" (soft-delete wins). |
| 2026-07-07 | human | 2 | Reviewed all four Phase 2 sub-steps and signed off → Phase 2 row and its requirement rows (FR-012/013, NFR-012/014, CR-016, GAP-002/003/007) moved 🔍 → ✅. Overall 3/9. | Next: Phase 3 (Chat CRUD + isolation). NFR-011 stays 🚧 (SQL-injection half in 4a). Then synced Phase-1 requirement mirror rows 🔍→✅ (NFR-005 kept 🚧 — its Phase-5 cache/usage half is pending). |
| 2026-07-07 | human + assistant | 2.4 | Rate limiting: @nestjs/throttler v6 in AuthModule (ttl=THROTTLE_TTL×1000ms, limit=THROTTLE_LIMIT), `@UseGuards(ThrottlerGuard)` on register+login. Split e2e into auth.e2e (register/login/me) + auth-refresh.e2e (rotation/logout) so per-file throttle counters stay under limit. Verified: build clean, unit 15/15; human ran curl 12× login → ten 401 then 429 429, and `test:e2e` all 3 suites green with throttler active. **Phase 2 complete → 🔍 overall.** On `feat/Phase2_Auth`. | 2.4 ✅ (NFR-014, GAP-007 🔍). Awaiting human to review all of Phase 2 and move 🔍→✅. Commit 2.4. Next: Phase 3 (Chat CRUD + isolation). |
| 2026-07-07 | human + assistant | 2.3 | Refresh rotation + cookie + logout + reuse detection: `auth/services/refresh-token.service.ts` (jti + sha256 hash in Redis `refresh:{userId}:{jti}`, single-use rotation, reuse→SCAN+DEL family, best-effort revoke). AuthService now issues refresh on register/login + `refresh()`/`logout()`. Controller sets/clears httpOnly refresh cookie (Secure/SameSite/Path from `app.cookie`, Max-Age=TTL); added `POST /auth/refresh` + `POST /auth/logout`; refresh token only in cookie, never in body. Verified: build clean, unit 15/15, human ran `test:e2e` → full rotation/reuse/logout flow green. On `feat/Phase2_Auth`. | 2.3 ✅ (CR-016 🔍). Realigned Set-Cookie contract (2.2 deviation resolved). Next: 2.4 (throttler → 429). Commit 2.3 when ready. |
| 2026-07-07 | human + assistant | 2.2 | Register/login + access-token auth: RegisterDto/LoginDto (class-validator), AuthService (bcrypt cost from `getOrThrow('BCRYPT_COST')`, dup→409, bad creds→401, same 401 for unknown-email/wrong-pass), JwtStrategy + JwtAuthGuard + `@CurrentUser()`, AuthController (register/login/`GET /auth/me`), AuthModule wired. Added `/auth/me` to openapi first (§8). Fixed a `number\|undefined` config type via getOrThrow. Verified: build clean, unit 10/10, human ran `test:e2e` → Auth+Health green. On `feat/Phase2_Auth`. | 2.2 ✅. Refresh token/cookie deferred to 2.3 (temporary no-cookie deviation logged). Next: 2.3 (refresh rotation + reuse detection). Commit 2.2 when ready. |
| 2026-07-07 | human + assistant | 2.1 | Users data layer: `common/entities/base.entity.ts`, `auth/entities/user.entity.ts` (password_hash select:false, soft-delete), migration `1783382400000-CreateUsers.ts` (native `gen_random_uuid()`). Assistant verified build + migration typecheck; human ran the stack: `migration:run` → `users` matches erd.md, `migration:revert`+re-run clean, `llm_reader` SELECT users → permission denied. On branch `feat/Phase2_Auth`. | 2.1 ✅. Next: 2.2 (register/login access-token auth). Commit 2.1 when ready. |
| 2026-07-07 | human + assistant | 1 | **Runtime verification passed** (human ran Docker; assistant's sandbox couldn't). `docker compose up -d` pulled pg15/redis7, ran init scripts → both containers `healthy`; `financial_data` = **192** rows; `llm_reader` SELECT ok, INSERT → `permission denied` (Guardrail Layer 3 confirmed); `npm run test:e2e` green. Fixed a supertest namespace→default import in `health.e2e-spec.ts`. Phase 1 🚧→🔍. | Ready for human to move Phase 1 → ✅ and commit the boundary. Then Phase 2 (Auth). |
| 2026-07-07 | assistant | 1 | Built infra: docker-compose.yml (postgres:15 + redis:7, healthchecks) + init scripts `docker/postgres/02-indexes.sql` (3 erd indexes) & `03-llm-reader.sh` (SELECT-only role + ALTER DEFAULT PRIVILEGES safeguard). Scaffolded NestJS backend/ (ConfigModule+Joi validation, TypeOrmModule forRootAsync `synchronize:false`, global RedisModule, HealthModule w/ custom Redis indicator, main.ts global `/api` prefix + ValidationPipe + cookie-parser + CORS allowlist credentials:true). Added TypeORM CLI data-source + migration scripts. Verified: `npm install`, `nest build` clean, `npm test` 5/5, empty-env boot → fail-fast, compose YAML + `sh -n` valid. | **⛔ Docker not installed in this env** — runtime DoD unverified. Human must run: `cp .env.example .env` (set real OPENAI_API_KEY/secrets) → `docker compose up -d` → `docker exec smc_postgres psql -U postgres -d financial_db -c "SELECT count(*) FROM financial_data;"` (expect 192) → `cd backend && npm run start:dev` → `curl localhost:3000/api/health` (expect 200 ok) → `PGPASSWORD=<llm pass> psql -h localhost -U llm_reader -d financial_db -c "INSERT INTO financial_data VALUES('x','x','x',2022,0,0,0,0);"` (expect: permission denied) → `npm run test:e2e`. Then move 🚧→🔍/✅ and commit. **Not committed** (unverified phase). Did NOT start Phase 2. |
| 2026-07-07 | assistant | 0 | Human approved both Phase-0 findings. Applied fixes: count 48→**49** in prompt_spec (§1/§2/S2), erd.md §4 (+row-math), CLAUDE.md, README.md, compliance_requirements.md, functional_requirements.md, openapi_spec.yaml; erd.md `ticker`/`sector` → VARCHAR(255) to match dump. Updated report + Decision Log. Verified no stray "48"/`VARCHAR(10)/(50)` remain. | Open (separate, not yet approved): add missing-year rule to system prompt (BlackRock 2024–25, Shopify 2022–23). Awaiting human to move Phase 0 🔍 → ✅ and commit. Did NOT start Phase 1. |
| 2026-07-07 | assistant | 0 | Created root structure (.gitignore, README.md, docker-compose.yml placeholder, `.env.example`, `data/`). Human supplied `data/financial_data.sql`. Verified dump vs erd.md + prompt_spec → report at `docs/phase0_ground_truth_report.md`. Found 2 mismatches (docs NOT edited, per brief). | (resolved in the entry above) |
| 2026-07-07 | human + assistant | pre-0 | Docs finalized in English; token & streaming decisions locked; CLAUDE.md + PROGRESS.md created | Start Phase 0 next |
