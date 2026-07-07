# CLAUDE.md — Financial Data Chat Assistant

> Agent operating guide. Read this fully before touching any code.
> The authoritative specs live in `docs/`. When this file and a spec disagree, **stop and ask** — do not guess.

---

## 1. What we're building

An AI-powered chat app where users ask natural-language questions about the income-statement
data of 48 U.S. public companies (2022–2025). An LLM (OpenAI GPT-4o) answers **only** from a
PostgreSQL database by generating SQL through a single `execute_sql` tool. Responses stream
token-by-token. There is auth, per-user spending limits, and conversation history.

**Source of truth documents (in `docs/`):**
- `functional_requirements.md` — FR-001…FR-022
- `non_functional_requirements.md` — NFR-001…NFR-014
- `compliance_requirements.md` — CR-001…CR-018
- `identified_gaps.md` — GAP-001…GAP-014
- `architecture_overview.md` — diagrams, data flows, key decisions
- `erd.md` — data model (Postgres tables + Redis keys)
- `openapi_spec.yaml` — the API contract (treat as binding)
- `prompt_spec.md` — system prompt, tool def, 5-layer guardrails, scenarios S1–S6
- `tech_stack.md`, `folder_structure.md` — stack versions and file layout

---

## 2. Locked decisions — do NOT re-litigate

These were decided deliberately. Do not swap them out for "simpler" or "more modern" options
without asking.

| Area | Decision | Never do instead |
|---|---|---|
| Backend | NestJS 10+ (feature modules) | Express/Fastify bare |
| ORM | TypeORM 0.3+, migrations (never `synchronize: true`) | Prisma; auto-sync in any env |
| DB | PostgreSQL 15+ | SQLite, Mongo |
| Cache/usage/refresh-tokens | Redis 7+ | in-memory maps, cron jobs |
| LLM | OpenAI GPT-4o, streaming + tool-calling | mini for final build (mini OK for dev only) |
| Streaming transport | **`fetch()` + `ReadableStream`** on POST | native `EventSource`; WebSocket |
| Access token | Short-lived JWT (~15 min), **in memory only** on client | localStorage / sessionStorage |
| Refresh token | Long-lived, **httpOnly + Secure + SameSite=Strict cookie**, `Path=/api/auth/refresh`, single-use rotation, hash tracked in Redis | putting refresh token in any JSON body; readable cookie |
| SQL execution | Runs as the **`llm_reader`** Postgres user (SELECT-only grant) | running LLM SQL as the app/superuser |
| Primary keys | UUID | auto-increment ints |
| Conversation delete | Soft-delete (`deleted_at`) | hard delete |

If a task seems to require breaking one of these, that's a signal to stop and confirm — not proceed.

---

## 3. Hard rules (security & correctness — non-negotiable)

1. **No secrets in code.** OpenAI key, JWT secret, DB/Redis creds come from env via
   `@nestjs/config` only. Never hardcode, never log them. `.env` is gitignored; keep
   `.env.example` current.
2. **LLM SQL is never trusted.** Every generated query passes `SqlValidatorService`
   (Layer 2) **and** executes as `llm_reader` (Layer 3). Both. Layer 3 is the real guarantee;
   never rely on the regex blocklist alone.
3. **Grounding (FR-007/FR-008).** The assistant answers only from query results. If data is
   missing, it says so — it never invents numbers. Don't weaken the system prompt rules in
   `prompt_spec.md`.
4. **User isolation (FR-014).** Every conversation/message query is scoped by `user_id` from
   the JWT. A foreign or non-existent id returns **404**, never another user's data.
5. **Passwords** hashed with bcrypt, cost ≥ 12. `password_hash` uses `select: false`.
6. **Parameterized queries only** for app tables. No string concatenation into SQL.
7. **Audit log is append-only** (CR-002/SOX §802). Never UPDATE/DELETE `audit_logs`.
8. **Money math uses the documented pricing** ($2.50/1M in, $10/1M out). Partial responses
   are billed for tokens actually produced (FR-016/FR-017).
9. **CORS** uses an explicit origin allowlist with `credentials: true` (never `*` with
   credentials) — required for the refresh cookie (GAP-011).

---

## 4. Folder & naming conventions

Follow `docs/folder_structure.md` exactly — feature-based NestJS modules, one concern per file.
- Backend modules: `auth`, `chat`, `llm`, `financial`, `usage`, `health`, `common`, `config`.
- Frontend: React 18 + Vite + TypeScript, Tailwind + shadcn/ui, Zustand stores, `useStreamChat`
  hook for streaming.
- Keep the access token in the Zustand `auth.store` in memory; the refresh cookie is handled by
  the browser — never read/write it from JS.
- DTOs validated with `class-validator`. Entities extend the shared `base.entity.ts` where noted.

---

## 5. Build in verifiable phases

Do one phase per working session. **Definition of done for every phase: it runs, and its tests
pass.** Do not start the next phase until the current one is green. Commit at each phase boundary.

- **Phase 0 — Ground truth:** repo, `docs/`, `.env.example`, confirm `financial_data.sql`
  column/table names match `erd.md` exactly (the system prompt depends on this).
- **Phase 1 — Infra:** Docker Compose (Postgres + Redis + init SQL + create `llm_reader`),
  NestJS scaffold, ConfigModule, HealthModule.
  *Verify:* `docker compose up` → `/api/health` green; `llm_reader` INSERT is rejected.
- **Phase 2 — Auth:** register/login/refresh(rotation)/logout, bcrypt, JWT guard, throttler on
  auth routes, httpOnly refresh cookie, Redis refresh store.
  *Verify:* auth e2e incl. cookie rotation + reuse detection; 401/429 by curl.
- **Phase 3 — Chat CRUD + isolation:** conversation/message entities + migrations, CRUD per
  OpenAPI, soft-delete + confirmation, ownership → 404.
  *Verify:* S6 e2e + cross-user isolation test.
- **Phase 4a — SQL guardrails:** `SqlValidatorService` + `FinancialModule` executing via
  `llm_reader`.
  *Verify:* unit tests with attack cases (multi-statement, comment bypass, `pg_`/other-table
  access, UNION exfiltration).
- **Phase 4b — LLM streaming:** OpenAI stream + tool loop, SSE event protocol, save
  message/cost/audit.
  *Verify:* S1 + S2 against real API (use mini during dev to save budget, switch to 4o at the end).
- **Phase 5 — Usage + interruption:** Redis usage tracking + guard, partial-save on abort.
  *Verify:* S3, S4, S5 — S5 by killing the connection mid-stream for real.
- **Phase 6 — Frontend:** auth pages → chat page + `useStreamChat` → ToolCallWidget (FR-005) →
  Markdown/table/chart → sidebar + delete confirm + usage badge.
  *Verify:* open a browser and click through every scenario. UI is 25% of the grade — don't
  verify it with tests alone.
- **Phase 7 — Polish:** README (NFR-006, 10% of grade), full S1–S6 e2e, Helmet, audit review.

**If time runs short**, cut in this order: refresh rotation → long-lived access token; Layer-4
output validator; charts → tables only; terminus → plain health endpoint. **Never cut:**
streaming + visible tool call, grounding, usage limit, user isolation, S5 partial save.

---

## 6. Testing

- Jest for unit, Supertest for e2e. Co-locate `*.spec.ts`; e2e in `backend/test/`.
- Write tests alongside (or before) the implementation in each phase; a phase isn't done until
  they pass.
- Guardrail tests (Phase 4a) are the highest-value tests in the repo — cover the attack cases
  above explicitly.

---

## 7. How to work with me (the human)

- Explain the plan before writing code for anything non-trivial; wait for confirmation on
  design decisions that aren't already locked in §2.
- Prefer small, reviewable diffs. One phase = one PR/commit.
- When you hit ambiguity or a spec conflict, ask a specific question — don't silently pick a path.
- Don't attribute behavior to "the instructions" in code comments; explain the actual reason.
- Keep `docs/` and `.env.example` in sync if an implementation detail changes; note the change
  in the commit message.
- **Update `PROGRESS.md` before every commit that changes status.** You may mark items up to
  🔍 (ready for review) only, and every 🔍 must name its evidence (passing tests, command run,
  or manual check). Only the human moves items to ✅. Append a Session Log entry every session,
  including failed ones.

---

## 8. New feature workflow

**Docs lead, code follows.** When a new feature request comes in, do these in order —
steps 1–3 happen **before any code is written**:

1. **Record the requirement** — add a new FR-0XX row to `docs/functional_requirements.md`
   (1–2 lines + priority).
2. **Impact check** — does it conflict with a locked decision (§2)? Does it change
   `docs/erd.md` or `docs/openapi_spec.yaml`? If so, update those docs first and flag the
   change to the human.
3. **Register in `PROGRESS.md`** — new checklist row, assign a phase (or a new phase), and
   state the DoD (how it will be verified).
4. **Implement as a single scoped task** — reference the relevant docs; stay within the DoD.
5. **Write tests alongside** — then mark 🔍 with evidence in `PROGRESS.md`.
6. **Human reviews and verifies** — only the human moves 🔍 → ✅.
7. **Commit code + docs + PROGRESS together** in one commit.

Exception: trivial changes (copy tweaks, styling) may skip steps 1–3 — just note them in the
Session Log.
