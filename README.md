# 💬 Financial Data Chat Assistant

An AI-powered chat application where users ask natural-language questions about the
income-statement data of **49 U.S. public companies (2022–2025)**. An LLM (OpenAI GPT-4o)
answers **only** from a PostgreSQL database by generating SQL through a single `execute_sql`
tool. Responses stream token-by-token, with authentication, per-user spending limits, and
persistent conversation history.

> **Grounding guarantee:** the assistant answers strictly from query results. If the data
> isn't there, it says so — it never invents numbers.

---

## 🚦 Build status

Backend is built in verifiable phases (see [`PROGRESS.md`](PROGRESS.md)). **6 / 9 phases done.**

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Ground truth (repo, docs, dump verified) | ✅ |
| 1 | Infra — Docker (PG + Redis + `llm_reader`), NestJS scaffold, config, health | ✅ |
| 2 | Auth — register/login, JWT, refresh rotation + reuse detection, throttler | ✅ |
| 3 | Chat CRUD + user isolation (404) + append-only audit | ✅ |
| 4a | SQL guardrails — validator (Layer 2) + `llm_reader` execution (Layer 3) | ✅ |
| 4b | LLM streaming — OpenAI + `execute_sql` tool loop + SSE (grounding verified live on gpt-4o) | ✅ |
| 5 | Usage limits + interruption (partial-save) | ⬜ next |
| 6 | Frontend (React) | ⬜ |
| 7 | Polish | ⬜ |

The full backend answer pipeline (auth, isolation, audit, both SQL guardrail layers, and grounded
LLM streaming) is complete and test-verified — including a live gpt-4o grounding pass. Remaining:
per-user usage limits + mid-stream interruption (Phase 5) and the React frontend (Phase 6).

---

## ✨ Features

- **Natural-language → SQL** over income-statement data via a single `execute_sql` tool ✅
- **Token-by-token streaming** (`fetch()` + `ReadableStream` over POST, SSE) ✅
- **Grounded answers only** — no hallucinated figures; missing data stated clearly ✅ (verified live)
- **Auth** — register / login / refresh (single-use rotation + reuse detection) / logout ✅
- **User isolation** — every conversation/message scoped by JWT; foreign id → 404 ✅
- **SQL guardrails** — code validator **and** SELECT-only `llm_reader` DB role ✅
- **Append-only audit trail** ✅
- **Per-user spending limits** *(5)* · **conversation history + soft-delete** ✅

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10 (feature modules), Passport + JWT, class-validator, @nestjs/throttler |
| ORM | TypeORM 0.3 (migrations, parameterized queries) |
| Database | PostgreSQL 15 |
| Cache / usage / refresh tokens | Redis 7 (ioredis) |
| LLM | OpenAI GPT-4o (streaming + tool-calling) |
| Frontend | React 18 + Vite + Tailwind + shadcn/ui *(6)* |
| Infra | Docker Compose (PostgreSQL + Redis) |
| Testing | Jest (unit) + Supertest (e2e) |

See [`docs/tech_stack.md`](docs/tech_stack.md) for the full rationale.

---

## 🏗️ Architecture

```
React (Vite) ──HTTP + fetch-stream SSE (Bearer)──▶ NestJS API   [frontend: Phase 6]
                                                      │
   ┌────────────┬────────────┬────────────┬──────────┼───────────┐
 AuthModule  ChatModule  FinancialModule  LlmModule          HealthModule
   │             │            │
 PG + Redis    PG (scoped)   PG via llm_reader (SELECT-only)
```

- **SQL guardrails (defense in depth):** LLM SQL passes `SqlValidatorService` (Layer 2) **and**
  runs as the SELECT-only **`llm_reader`** Postgres role (Layer 3). Even if the validator is
  bypassed, Postgres rejects every write.
- **Tokens:** short-lived access JWT (in memory on the client); long-lived refresh token in an
  **httpOnly, Secure, SameSite=Strict cookie** with single-use rotation tracked in Redis.

Full diagrams: [`docs/architecture_overview.md`](docs/architecture_overview.md).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ and **npm**
- **Docker** + **Docker Compose**
- An **OpenAI API key** (only needed once Phase 4b lands; a placeholder is fine before that)

### 1. Configure environment

```bash
cp .env.example .env
```

`.env` is the single source of truth for both Docker Compose and the backend. See
[`.env.example`](.env.example) for the full list; at minimum set:

| Variable | Notes |
|----------|-------|
| `LLM_READER_PASSWORD` | Password for the SELECT-only role (Compose creates it + the app connects with it) |
| `OPENAI_API_KEY` | Placeholder OK until Phase 4b; must be non-empty (validated at boot) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Any strong secrets |

Sensible defaults are provided for `DATABASE_*` (host `localhost`, db `financial_db`,
user/pass `postgres`), `REDIS_*`, `BCRYPT_COST=12`, `USAGE_LIMIT`, `THROTTLE_*`, and
`CORS_ORIGIN=http://localhost:5173`.

### 2. Start the data layer

```bash
docker compose up -d
```

Provisions PostgreSQL (loading `data/financial_data.sql` → **192 rows**), creates the
SELECT-only `llm_reader` role, and starts Redis.

### 3. Run the backend

```bash
cd backend
npm install
npm run migration:run      # apply TypeORM migrations (users, conversations, messages, audit_logs)
npm run start:dev          # http://localhost:3000
```

Verify: `curl http://localhost:3000/api/health` → `{"status":"ok", ... postgres up, redis up}`.

### 4. Frontend

Not yet implemented — arrives in **Phase 6** (`frontend/`, React + Vite).

---

## 🧪 Testing

```bash
cd backend
npm test          # unit tests (66 green: env, auth, refresh rotation, chat, audit, SQL validator, financial)
npm run test:e2e  # e2e (needs docker stack): health, auth, auth-refresh, chat, S6/audit, financial/llm_reader
```

The highest-value tests: the **SQL validator** attack matrix (`sql-validator.service.spec.ts`,
41 cases) and the **`llm_reader` Layer-3** integration (`financial.e2e-spec.ts` — raw writes →
`permission denied`).

---

## 📁 Project Structure

```
smc_fullstack/
├── docker-compose.yml         # PostgreSQL + Redis + init (llm_reader, indexes)
├── docker/postgres/           # init SQL + llm_reader role script
├── .env.example               # single-source env template
├── backend/                   # NestJS API
│   ├── src/
│   │   ├── config/            # ConfigModule + Joi validation + TypeORM data-source
│   │   ├── health/            # GET /api/health (terminus + redis indicator)
│   │   ├── redis/             # shared ioredis client
│   │   ├── common/            # base entity, audit (service/interceptor/@Audit), decorators
│   │   ├── auth/              # register/login/refresh/logout, JWT, refresh-token store
│   │   ├── chat/              # conversations/messages CRUD + isolation
│   │   ├── financial/         # llm_reader execution (Layer 3) + FinancialData entity
│   │   └── llm/               # SqlValidatorService (Layer 2) + OpenAI streaming tool loop
│   ├── migrations/            # TypeORM migrations
│   └── test/                  # e2e specs
├── data/financial_data.sql    # provided dump (49 companies × 2022–2025 = 192 rows)
└── docs/                      # authoritative specs (source of truth)
```

---

## 📚 Documentation

| Document | Contents |
|----------|----------|
| [`functional_requirements.md`](docs/functional_requirements.md) | FR-001…FR-022 |
| [`non_functional_requirements.md`](docs/non_functional_requirements.md) | NFR-001…NFR-014 |
| [`compliance_requirements.md`](docs/compliance_requirements.md) | CR-001…CR-018 |
| [`identified_gaps.md`](docs/identified_gaps.md) | GAP-001…GAP-014 |
| [`architecture_overview.md`](docs/architecture_overview.md) | Diagrams, data flows, decisions |
| [`erd.md`](docs/erd.md) | Data model (Postgres tables + Redis keys) |
| [`openapi_spec.yaml`](docs/openapi_spec.yaml) | The API contract (binding) |
| [`prompt_spec.md`](docs/prompt_spec.md) | System prompt, tool def, 5-layer guardrails, scenarios S1–S6 |
| [`phase0_ground_truth_report.md`](docs/phase0_ground_truth_report.md) | Dump-vs-spec verification report |

Conventions and locked decisions: [`CLAUDE.md`](CLAUDE.md). Live status: [`PROGRESS.md`](PROGRESS.md).

---

## 🔒 Security Notes

- Secrets come from env via `@nestjs/config` only (validated at boot) — never hardcoded/logged.
  `.env` is gitignored; keep `.env.example` current.
- LLM SQL is never trusted: validated **and** executed as the read-only `llm_reader` role, with a
  statement timeout and a 200-row cap.
- Passwords hashed with **bcrypt** (cost ≥ 12); `password_hash` is `select: false`.
- Every conversation/message query is scoped by `user_id` from the JWT — foreign/unknown id → **404**.
- Audit logs are **append-only** (insert-only service; no update/delete path).
- CORS uses an explicit origin allowlist with `credentials: true` (for the refresh cookie).

> **HTTPS note:** the `Secure` refresh cookie requires a secure context. `localhost` is treated
> as secure for dev; any deployment must sit behind TLS.

---

## 📄 License

See [`LICENSE`](LICENSE).
