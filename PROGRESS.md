# 📊 PROGRESS — Financial Data Chat Assistant

> Single source of truth for project status. Read by both the human and the agent.
> Last updated: 2026-07-07 · Updated by: assistant (Phase 3.3 session)

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
| **0 — Ground truth** | Repo, `docs/`, `.env.example`, verify `financial_data.sql` matches `erd.md` | ✅ | Root files created (.gitignore, README.md, docker-compose.yml placeholder, .env.example, data/); verification report `docs/phase0_ground_truth_report.md` | ✅ Both mismatches resolved (human-approved 2026-07-07): count 48→**49** across all docs; `ticker`/`sector` erd.md → VARCHAR(255) to match dump. Open (separate, not approved): missing-year system-prompt rule (BlackRock/Shopify). |
| **1 — Infra** | Docker Compose (PG + Redis + init SQL + `llm_reader`), NestJS scaffold, Config, Health | ✅ | **All DoD met.** Build: `nest build` clean; unit 5/5; app-level fail-fast (empty-env boot lists all 11 required vars). **Runtime (human-run w/ Docker 2026-07-07):** `docker compose ps` → both containers `healthy`; `SELECT count(*) FROM financial_data` → **192**; as `llm_reader` SELECT ok **and** INSERT → `permission denied for table financial_data`; `npm run test:e2e` → `Health (e2e)` passed (postgres+redis `up`). | Ready for human ✅ + commit. Fixed supertest default import in `health.e2e-spec.ts`. |
| **2 — Auth** | Register/login/refresh(rotation)/logout, bcrypt, JWT guard, throttler, httpOnly cookie, Redis token store | ✅ | **2.1 done (human-verified 2026-07-07):** `nest build` + migration `tsc` clean; `migration:run` created `users`; `\d users` matches erd.md (uuid `gen_random_uuid()`, email/password_hash/display_name, timestamps, deleted_at nullable, PK, unique `idx_users_email`); `migration:revert`+re-run clean; `llm_reader` SELECT on `users` → `permission denied`. **2.2 done (human-verified 2026-07-07):** build clean; unit 10/10 (auth: register, dup→409, login, wrong-pass→401, unknown→401); `test:e2e` green — register→201 (no `passwordHash` in body), login→200, `/auth/me` 200 w/ Bearer & 401 without/bad token, invalid body→400. **2.3 done (human-verified 2026-07-07):** unit 15/15 (refresh-token: issue-stores-hash, rotate single-use, reuse-revokes-family, invalid→401, revoke); `test:e2e` green — register/login set HttpOnly refresh cookie (no token in body); `/auth/refresh` rotates + new access token; **replay old cookie→401 AND latest cookie→401 (family revoked)**; logout clears cookie (Max-Age=0) + token dead. **2.4 done (human-verified 2026-07-07):** @nestjs/throttler v6 on register/login from THROTTLE_TTL/LIMIT; curl 12× POST /auth/login → ten `401` then `429 429` (limit 10/60s); all three e2e suites still green with throttler active (e2e split per-file to isolate throttle counters). | Sub-steps: **2.1 ✅ · 2.2 ✅ · 2.3 ✅ · 2.4 ✅** — Phase 2 human-reviewed & signed off ✅ 2026-07-07. |
| **3 — Chat CRUD + isolation** | Entities + migrations, CRUD per OpenAPI, soft-delete, ownership → 404 | 🔍 | **3.1 done (human-verified 2026-07-07):** `nest build` + migration `tsc` clean; `migration:run` created `conversations`/`messages`/`audit_logs`; `\d` on each matches erd.md (FKs: conversations→users CASCADE, messages→conversations CASCADE, audit_logs→users SET NULL; `numeric(10,6)` cost; soft-delete `deleted_at`; all indexes); `migration:revert`+re-run clean; `llm_reader` SELECT on all three → `permission denied`. **3.2 done (human-verified 2026-07-07):** build clean; unit 20/20 (chat: list scoping, getOne/getMessages/softDelete→404 on foreign id, owned delete); `test:e2e` green — CRUD (create 201 'New Chat' → paginated list → get empty messages → delete 200 {message} → gone + 404); **cross-user isolation: B gets 404 on A's conv for get/messages/delete, absent from B's list**; message ordering (seeded out-of-order → first/second/third, NFR-008). **3.3 done (human-verified 2026-07-07):** append-only AuditService (insert-only, unit-tested for no update/delete) + `@Audit` decorator + AuditInterceptor (logs on success only); delete route audited. unit 22/22; `test:e2e` S6 green — delete→200 → `delete_conversation` audit row (userId + metadata.messageCount=2) → conversation 404/hidden → **messages RETAINED** (soft-delete, no cascade); cross-user delete → 404 + NO audit row. | Sub-steps: **3.1 ✅ · 3.2 ✅ · 3.3 ✅** — Phase 3 complete, awaiting human ✅. |
| **4a — SQL guardrails** | `SqlValidatorService` + FinancialModule via `llm_reader` | ⬜ | — | DoD: attack-case unit tests pass (multi-stmt, comments, `pg_`, UNION) |
| **4b — LLM streaming** | OpenAI stream + tool loop, SSE protocol, save message/cost/audit | ⬜ | — | DoD: S1 + S2 against real API |
| **5 — Usage + interruption** | Redis usage + guard, partial-save on abort | ⬜ | — | DoD: S3, S4, S5 (kill connection mid-stream for real) |
| **6 — Frontend** | Auth pages, chat + `useStreamChat`, ToolCallWidget, Markdown/charts, sidebar, usage badge | ⬜ | — | DoD: human clicks through every scenario in a browser |
| **7 — Polish** | README, full S1–S6 e2e, Helmet, audit review | ⬜ | — | README = 10% of grade |

**Overall:** `3 / 9` phases done (Phase 0 ✅; Phase 1 ✅; Phase 2 ✅; Phase 3 🔍 — all sub-steps done, awaiting human sign-off)

---

## 2. Scenario Coverage (S1–S6 from the assignment)

| Scenario | Description | Covered by Phase | Status | Evidence |
|----------|-------------|------------------|--------|----------|
| S1 | Successful query → grounded, streamed answer | 4b | ⬜ | — |
| S2 | Data not available → clearly stated, no fabrication | 4b | ⬜ | — |
| S3 | Stop mid-generation → partial saved, cost charged | 5 | ⬜ | — |
| S4 | Usage limit exceeded → friendly 429 | 5 | ⬜ | — |
| S5 | Browser refresh mid-stream → history intact, no dup/loss | 5, 6 | ⬜ | — |
| S6 | Delete conversation → confirmation, ownership, audit | 3, 6 | 🔍 | audit.e2e-spec.ts: delete→200→audit row→404/hidden→messages retained; cross-user→404+no audit (backend; confirmation dialog is Phase 6) |

---

## 3. Requirement Checklist

> Mirror of the Status columns in `docs/*.md`. This table is the one that gets updated;
> sync back to the docs is optional.

### Functional (FR)

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| FR-001 | Chat application | 3, 6 | 🚧 |
| FR-002 | React + TypeScript frontend | 6 | ⬜ |
| FR-003 | NestJS backend | 1 | ✅ |
| FR-004 | Token-by-token streaming | 4b | ⬜ |
| FR-005 | SQL tool call visible in UI | 4b, 6 | ⬜ |
| FR-006 | Markdown render (tables, charts) | 6 | ⬜ |
| FR-007 | Grounding — DB only, no hallucination | 4a, 4b | ⬜ |
| FR-008 | Missing data stated clearly | 4b | ⬜ |
| FR-009 | Spending limit per user (default $1) | 5 | ⬜ |
| FR-010 | Limit reset on fixed interval | 5 | ⬜ |
| FR-011 | Configurable limit & interval | 5 | ⬜ |
| FR-012 | User registration | 2 | ✅ |
| FR-013 | User login | 2 | ✅ |
| FR-014 | User isolation | 3 | 🔍 |
| FR-015 | Stop mid-generation | 5 | ⬜ |
| FR-016 | Partial message saved | 5 | ⬜ |
| FR-017 | Partial cost deducted | 5 | ⬜ |
| FR-018 | Revisit past conversations | 3, 6 | 🔍 |
| FR-019 | Delete with confirmation | 3, 6 | 🔍 |
| FR-020 | Refresh → correct history | 5, 6 | ⬜ |
| FR-021 | Friendly limit-exceeded message | 5, 6 | ⬜ |
| FR-022 | PostgreSQL + financial_data.sql | 0, 1 | ✅ |

### Non-Functional (NFR)

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| NFR-001 | Low-latency streaming | 4b | ⬜ |
| NFR-002 | Polished UI | 6 | ⬜ |
| NFR-003 | Well-separated modules | 1–5 | ⬜ |
| NFR-004 | Docker Compose | 1 | ✅ |
| NFR-005 | Redis for cache/usage | 1, 5 | 🚧 |
| NFR-006 | Complete README | 7 | ⬜ |
| NFR-007 | No dup/missing messages on refresh | 5 | ⬜ |
| NFR-008 | History in correct order | 3 | 🔍 |
| NFR-009 | Extensible architecture | 1 | ✅ |
| NFR-010 | Graceful error handling | 1, 4b | ⬜ |
| NFR-011 | Input validation / SQL injection | 2, 4a | 🚧 |
| NFR-012 | bcrypt password hashing | 2 | ✅ |
| NFR-013 | API key via config | 1 | ✅ |
| NFR-014 | Rate limiting | 2 | ✅ |

### Compliance (CR) — key items

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| CR-001/003/012 | Financial data accuracy / grounding | 4a, 4b | ⬜ |
| CR-002/018 | Append-only audit trail | 3, 4b | 🔍 |
| CR-004 | Access control on financial queries | 2, 4a | ⬜ |
| CR-005–008 | PDPA (consent, disclosure, erasure, breach) | 2, 3, 7 | ⬜ |
| CR-009–011 | GDPR (by design, erasure, portability) | 2, 3 | ⬜ |
| CR-013 | Disclose data source & coverage | 4b | ⬜ |
| CR-014 | OpenAI key never exposed | 1 | ✅ |
| CR-015 | Spend tracking within $10 budget | 5 | ⬜ |
| CR-016 | Hybrid token storage + rotation | 2 | ✅ |
| CR-017 | CORS allowlist + credentials | 1 | ✅ |

### Gaps (GAP)

| ID | Summary | Phase | Status |
|----|---------|-------|--------|
| GAP-001 | SQL injection prevention | 4a | ⬜ |
| GAP-002 | Authentication | 2 | ✅ |
| GAP-003 | Password storage | 2 | ✅ |
| GAP-004 | Data accuracy verification | 4a | ⬜ |
| GAP-005 | OpenAI failure handling | 4b | ⬜ |
| GAP-006 | API key management | 1 | ✅ |
| GAP-007 | Auth rate limiting | 2 | ✅ |
| GAP-008 | Audit logging | 3 | 🔍 |
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

---

## 6. Session Log

> Append one entry per working session. Newest first. Failed sessions count — record blockers.

| Date | Who | Phase | What happened | Blockers / follow-ups |
|------|-----|-------|---------------|----------------------|
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
