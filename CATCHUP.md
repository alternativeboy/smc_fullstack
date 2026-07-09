# 🧭 CATCHUP — Understand this project fast

> A plain-language orientation to the **Financial Data Chat Assistant**. Read this to "get" the
> whole thing in ~10 minutes, then dive into `docs/` for detail. Written 2026-07-09.
> Authoritative status always lives in [`PROGRESS.md`](PROGRESS.md); the binding specs live in `docs/`.

---

## 1. TL;DR — what this is

An AI chat app where a user asks natural-language questions about the **income-statement data of
49 U.S. public companies (2022–2025)**. An LLM (OpenAI GPT-4o) answers **only** from a PostgreSQL
database by writing SQL through a single `execute_sql` tool. Answers **stream token-by-token**, the
**generated SQL is shown**, results render as **tables/charts**, and there's **auth, per-user spending
limits, and conversation history**.

The whole design goal: **grounded answers, never invented numbers.** Everything else (guardrails,
auth, usage limits) exists to make that safe and multi-user.

**Status:** v1 complete and verified end-to-end; a few post-v1 features added. All merged to `main`.

---

## 2. How it works (the request flow)

```
Browser (React, :5173)                         NestJS API (:3000)
  │  fetch() + ReadableStream (POST, SSE)         │
  │  Authorization: Bearer <access JWT>           │
  ▼                                               ▼
ChatPage / useStreamChat  ───────────────▶  MessagesController (JWT + UsageLimit guards)
  ▲   token / tool_call / tool_result /            │
  │   usage / done / error  (SSE events)           ▼
  │                                          LlmService (OpenAI stream + tool loop)
  │                                               │  model asks to run SQL
  │                                               ▼
  │                                          FinancialService
  │                                          ├─ Layer 2: SqlValidatorService (regex allowlist)
  │                                          └─ Layer 3: run as `llm_reader` (SELECT-only role)
  │                                               ▼
  │                                          PostgreSQL  financial_data  (192 rows)
  └───────────  stream answer back  ◀───────  save message + cost + audit
```

**Key idea — defense in depth on the LLM's SQL (5 layers):**
1. **Prompt** tells the model: SELECT-only, no hallucination, cite source.
2. **`SqlValidatorService`** (code): blocks non-SELECT, multi-statement, comments, system/app tables.
3. **`llm_reader`** DB role: a *separate Postgres user with only SELECT grant* — even if layers 1–2
   were bypassed, the database itself rejects any write. **This is the real guarantee.**
4. **Output validator** (light): sanity-checks the answer.
5. **Audit log**: every query/login/register/delete is recorded (append-only).

---

## 3. The six baseline scenarios (S1–S6) — the correctness bar

These are the graded behaviors. All pass end-to-end (e2e + live gpt-4o + browser walkthrough).

| # | Scenario | What it proves |
|---|----------|----------------|
| **S1** | Ask a question → grounded, streamed answer | SQL runs, answer streams, tables/charts render |
| **S2** | Ask for data we don't have | Declines cleanly ("no data for X" / "only 2022–2025") — **never fabricates** |
| **S3** | **Stop** mid-answer | Partial answer is saved + its cost charged |
| **S4** | Exceed the usage limit | Friendly 429 (not a raw error), send blocked |
| **S5** | Reload mid-stream | History intact, the partial survives, no dupes |
| **S6** | Delete a conversation | Confirm dialog → **soft-delete** (`deleted_at`, messages retained) → audit row; foreign id → 404 |

Try them in the UI using the prompts in the README's "Trying the scenarios" section.

---

## 4. Locked decisions (the "why", so you don't re-litigate)

These were chosen deliberately (see `CLAUDE.md` §2). The rationale in one line each:

| Decision | Why |
|---|---|
| Access token **in memory** (Zustand), refresh token in **httpOnly cookie** | XSS can't read either; short-lived access + rotating refresh limits blast radius |
| Streaming = **`fetch()` + `ReadableStream`** (not `EventSource`) | The stream is a POST carrying a Bearer token; EventSource can't do that |
| LLM SQL runs as **`llm_reader`** (SELECT-only) | The database is the last line of defense — regex blocklists can be fooled, grants can't |
| **Soft-delete** conversations (`deleted_at`) | Keeps the audit trail intact; messages retained |
| **TypeORM migrations** (never `synchronize`) | Deterministic schema; the schema is a contract |
| **Redis** for usage + refresh tokens | Atomic counters + TTL expiry, no cron |
| Cost billed at **gpt-4o pricing** even on mini | Conservative budget accounting |

If a change seems to require breaking one of these → stop and ask.

---

## 5. Codebase map

```
smc_fullstack/
├── CLAUDE.md            ← agent/dev operating guide + locked decisions (READ FIRST)
├── PROGRESS.md          ← single source of truth for status (phases, requirements, decisions, session log)
├── README.md            ← how to run from a fresh clone (setup, env, tests, scenarios)
├── docs/                ← BINDING specs (source of truth)
│   ├── functional_requirements.md     FR-001…FR-025
│   ├── non_functional_requirements.md NFR-001…
│   ├── compliance_requirements.md     CR-001…   ·  identified_gaps.md  GAP-001…
│   ├── architecture_overview.md       diagrams + data flows
│   ├── erd.md                         data model (Postgres tables + Redis keys)
│   ├── openapi_spec.yaml              the API contract (binding)
│   ├── prompt_spec.md                 system prompt + tool def + 5-layer guardrails + S1–S6 diagrams
│   └── design/                        the UI mockups the frontend was built from
├── data/financial_data.sql            the provided dump (49 companies × 2022–2025 = 192 rows)
├── docker-compose.yml + docker/postgres/  Postgres (loads dump + creates llm_reader + indexes) + Redis
├── backend/   (NestJS)
│   └── src/
│       ├── config/      ConfigModule (env + Joi validation), TypeORM data-source
│       ├── auth/        register/login/refresh(rotation)/logout, JWT guard, throttler
│       ├── chat/        conversations + messages CRUD, the SSE messages endpoint, isolation
│       ├── financial/   SqlValidatorService (Layer 2) + llm_reader DataSource (Layer 3)
│       ├── llm/         OpenAI client, streamChat tool loop, prompt-builder (dynamic coverage), system-prompt
│       ├── usage/       Redis usage tracking + pre-flight UsageLimitGuard
│       ├── common/      audit service + @Audit decorator/interceptor, base entity
│       └── health/      /api/health (Postgres + Redis)
│       └── migrations/  TypeORM migrations (users, conversations, messages, audit_logs)
│   └── test/            e2e suites (health, auth, chat, S6/audit, financial, usage, interruption, messages)
└── frontend/  (React + Vite + TS + Tailwind)
    └── src/
        ├── pages/       LoginPage, RegisterPage (dark split-screen), ChatPage (dark sidebar + light chat)
        ├── components/  chat/ (ChatMessage, ChatInput, ToolCallWidget, MarkdownRenderer, ResultChart,
        │                 StreamingIndicator), sidebar/, layout/ (AuthLayout, UsageBadge), ui/ (shadcn-style)
        ├── hooks/        useAuth (silent refresh), useStreamChat (fetch+ReadableStream), useUsage
        ├── services/     api.ts (Bearer + auto-refresh), auth/chat/usage services
        └── stores/       Zustand: auth (token in memory), chat, usage
```

**Two mental anchors:** `CLAUDE.md` = the rules; `PROGRESS.md` = the status. Everything else follows.

---

## 6. What's built (feature ledger)

Built in **verifiable phases** — each phase runs + its tests pass before the next.

| Phase | What | State |
|---|---|---|
| 0 | Ground truth (docs, verify the data dump) | ✅ |
| 1 | Docker infra (Postgres + Redis + `llm_reader`) + NestJS scaffold + health | ✅ |
| 2 | Auth — register/login, JWT, refresh rotation + **reuse detection**, throttler, bcrypt | ✅ |
| 3 | Chat CRUD + **user isolation (→404)** + append-only audit | ✅ |
| 4a / 4b | SQL guardrails (validator + `llm_reader`) · LLM streaming + tool loop | ✅ |
| 5 | Usage limits (Redis) + mid-stream interruption (partial save) | ✅ |
| 6 | React frontend — auth, streaming chat, SQL widget, tables/charts, sidebar, usage | ✅ |
| 7 | Polish — README, Helmet, audit sweep, **fresh-clone acceptance passed** | ✅ |

**Post-v1 (also merged to `main`):**
- **FR-023** — the system prompt's coverage (company list, sectors, year range) is generated **at
  boot from the live DB**, so it doesn't go stale when data changes; plus a **schema guard** that
  refuses to start if `financial_data`'s columns drift.
- **FR-024** — full **UI/UX redesign** (dark navy-teal sidebar + light chat, emerald/teal gradients,
  animations, streaming caret, shimmer loader) and a **dark split-screen login/register**.
- **FR-025** — conversations **auto-title from the first user message** (instead of "New Chat").

---

## 7. What's verified vs. not (be honest with yourself here)

| Area | Verified? |
|---|---|
| **Backend correctness** | ✅ Strongly. e2e suites green; **live grounding on gpt-4o** (all S1/S2 correct, no fabrication, missing-year handled); **fresh-clone acceptance passed** (clone → README → working app + e2e). |
| **All six scenarios S1–S6** | ✅ End-to-end (e2e + browser). |
| **Core chat UX** (streaming, tables, charts, visible SQL) | ✅ Browser-verified in Phase 6. |
| **The latest UI look** (v3 dark sidebar + dark login) | ⚠️ **Builds clean, but not yet clicked-through in a browser** in its newest form. The earlier (light) redesign was walked through S1–S6; the dark iterations are newer. **This is the one thing worth verifying.** |

---

## 8. How to run it (short version — full detail in README)

```bash
cp .env.example .env          # set OPENAI_API_KEY, JWT_SECRET, JWT_REFRESH_SECRET, LLM_READER_PASSWORD
docker compose up -d          # Postgres (loads dump + llm_reader) + Redis
cd backend && npm ci && npm run migration:run && npm run start:dev    # → http://localhost:3000/api/health
cd frontend && npm ci && npm run dev                                  # → http://localhost:5173
```
Tests: `cd backend && npm test` (unit) and `npm run test:e2e` (needs Docker up).
Use `OPENAI_MODEL=gpt-4o-mini` for dev, `gpt-4o` for the final/demo. Budget so far: well under the $10 cap.

---

## 9. Git state (as of this writing)

**Everything is merged into `main`** — Phases 0–7 + FR-023 + FR-024 (incl. dark UI + dark login) +
FR-025. Working tree is clean. The many `feat/*` branches are historical (one per phase/feature) and
already merged; you can safely branch new work off `main`.

---

## 10. Known limits / deliberately deferred (3 items)

These are documented gaps, **not oversights** — reasonable scoping for a local take-home:
- **HTTPS/TLS** — deferred to deployment (a reverse proxy terminates TLS); `COOKIE_SECURE` + Helmet
  HSTS are ready. The app runs on http locally.
- **Data retention/cleanup** — no purge policy; audit logs are intentionally append-only; Redis keys
  self-expire via TTL.
- **PDPA consent + breach-notification** — out of scope (erasure via soft-delete + disclosure are done).

Also: the frontend bundle is ~750KB (Recharts) — a lazy-load candidate, not a correctness issue.

---

## 11. Honest grade (self-assessment vs the rubric)

| Criterion | Weight | ~Score | Note |
|---|---|---|---|
| Correctness & baseline | 40% | 37/40 | Strongest — grounding verified live, all S1–S6 pass e2e |
| Engineering & code quality | 25% | 23/25 | Visible tool-call, clean auth/isolation, usage limits, guardrails, tests |
| UI/UX & chat experience | 25% | ~21/25 | Polished + core UX verified; **latest dark UI not yet browser-verified** |
| Setup & documentation | 10% | 9.5/10 | Fresh-clone acceptance passed |
| **Total** | | **≈ 90/100** | Biggest lever: click through the current UI to lock in the UI score |

---

## 12. Where to go deeper

- **Rules & decisions:** `CLAUDE.md`
- **Status & full history:** `PROGRESS.md` (Phase table, requirement ledger, Decision Log, Session Log)
- **How it answers safely:** `docs/prompt_spec.md` (system prompt, tool, 5 layers, S1–S6 diagrams)
- **Data model & API:** `docs/erd.md`, `docs/openapi_spec.yaml`
- **Big picture:** `docs/architecture_overview.md`
- **Run it:** `README.md`

**If you read only two files:** `CLAUDE.md` (why it's built this way) and `PROGRESS.md` (where it stands).
