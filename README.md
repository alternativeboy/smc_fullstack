# 💬 Financial Data Chat Assistant

An AI-powered chat application where users ask natural-language questions about the
income-statement data of **49 U.S. public companies (2022–2025)**. An LLM (OpenAI GPT-4o)
answers **only** from a PostgreSQL database by generating SQL through a single `execute_sql`
tool. Responses stream token-by-token, with authentication, per-user spending limits, and
persistent conversation history.

> **Grounding guarantee:** the assistant answers strictly from query results. If the data
> isn't there, it says so — it never invents numbers.

---

## ✨ Features

- **Natural-language → SQL** over income-statement data via a single `execute_sql` tool
- **Token-by-token streaming** (`fetch()` + `ReadableStream` over POST, SSE wire format)
- **Visible tool calls** — the generated SQL and its results are shown inline (FR-005)
- **Grounded answers only** — no hallucinated figures; missing data stated clearly
- **Auth** — register / login / refresh (rotation) / logout with a hybrid token model
- **Per-user spending limits** — Redis-backed usage tracking with TTL-based reset
- **Conversation history** — revisit, soft-delete (with confirmation), user-isolated
- **Stop / interrupt** mid-generation — partial message saved, partial cost charged

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui, Zustand, Recharts |
| Backend | NestJS 10+ (feature modules), Passport + JWT, class-validator |
| ORM | TypeORM 0.3+ (migrations, parameterized queries) |
| Database | PostgreSQL 15+ |
| Cache / usage / refresh tokens | Redis 7+ |
| LLM | OpenAI GPT-4o (streaming + tool-calling) |
| Infra | Docker Compose (PostgreSQL + Redis) |
| Testing | Jest (unit) + Supertest (e2e) |

See [`docs/tech_stack.md`](docs/tech_stack.md) for the full rationale and alternatives considered.

---

## 🏗️ Architecture

```
React (Vite) ──HTTP + fetch-stream SSE (Bearer)──▶ NestJS API
                                                      │
      ┌───────────────┬───────────────┬──────────────┼───────────────┐
    AuthModule     ChatModule      LlmModule     UsageModule      HealthModule
      │                │               │              │
   Postgres+Redis   Postgres      OpenAI GPT-4o    Redis
                                     │
                              FinancialModule ──SELECT only (llm_reader)──▶ Postgres
```

- **Streaming** uses `fetch()` + `ReadableStream` (not `EventSource`) because the stream is on
  a **POST** and must carry an `Authorization: Bearer` header.
- **LLM-generated SQL** passes `SqlValidatorService` (Layer 2) **and** executes as the
  SELECT-only **`llm_reader`** Postgres user (Layer 3) — defense in depth.
- **Tokens:** short-lived access JWT kept **in memory only**; long-lived refresh token in an
  **httpOnly, Secure, SameSite=Strict cookie** with single-use rotation tracked in Redis.

Full diagrams and data flows: [`docs/architecture_overview.md`](docs/architecture_overview.md).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ and **npm**
- **Docker** + **Docker Compose**
- An **OpenAI API key**

### 1. Clone & configure environment

```bash
git clone <repo-url> siametrics-chat
cd siametrics-chat
cp .env.example .env      # then fill in the values below
```

Required environment variables (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key (never commit this) |
| `OPENAI_MODEL` | `gpt-4o-mini` for dev, `gpt-4o` for final |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_ACCESS_TTL` | Access-token lifetime (e.g. `15m`) |
| `JWT_REFRESH_TTL` | Refresh-token lifetime (e.g. `7d`) |
| `DATABASE_URL` | Postgres connection string (app user) |
| `LLM_READER_URL` | Postgres connection string for the SELECT-only `llm_reader` |
| `REDIS_URL` | Redis connection string |
| `USAGE_LIMIT_USD` | Default per-user spending limit (e.g. `1.00`) |
| `USAGE_RESET_INTERVAL` | Usage reset window (e.g. `24h`) |
| `CORS_ORIGIN` | Frontend origin allowlist (e.g. `http://localhost:5173`) |

### 2. Start the data layer

```bash
docker compose up -d       # PostgreSQL 15 + Redis 7
```

This provisions PostgreSQL (loading `data/financial_data.sql`), creates the SELECT-only
`llm_reader` role, and starts Redis.

### 3. Run the backend

```bash
cd backend
npm install
npm run migration:run      # apply TypeORM migrations
npm run start:dev          # http://localhost:3000
```

Verify: `curl http://localhost:3000/api/health` should return a green status.

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Open **http://localhost:5173**, register an account, and start asking questions.

---

## 🧪 Testing

```bash
# Backend — from ./backend
npm run test               # unit tests (Jest)
npm run test:e2e           # e2e tests (Supertest)
npm run test:cov           # coverage
```

The highest-value tests are the **SQL guardrail** unit tests (multi-statement, comment bypass,
`pg_`/other-table access, UNION exfiltration) and the **auth e2e** (cookie rotation + reuse
detection).

---

## 📁 Project Structure

```
siametrics-chat/
├── docker-compose.yml     # PostgreSQL + Redis
├── .env.example           # Environment template
├── backend/               # NestJS API (feature modules: auth, chat, llm,
│   │                      #   financial, usage, health, common, config)
│   ├── src/
│   ├── test/              # e2e tests
│   └── migrations/        # TypeORM migrations
├── frontend/              # React + Vite app
│   └── src/               # pages, components, hooks, services, stores
├── data/
│   └── financial_data.sql # Provided SQL dump
└── docs/                  # Authoritative specs (see below)
```

Full layout: [`docs/folder_structure.md`](docs/folder_structure.md).

---

## 📚 Documentation

The `docs/` folder is the source of truth. Start here:

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

Project conventions and locked decisions live in [`CLAUDE.md`](CLAUDE.md); current build status
is tracked in [`PROGRESS.md`](PROGRESS.md).

---

## 🔒 Security Notes

- Secrets come from env via `@nestjs/config` only — never hardcoded, never logged. `.env` is
  gitignored; keep `.env.example` current.
- LLM SQL is never trusted: it is validated **and** executed as the read-only `llm_reader` role.
- Passwords are hashed with **bcrypt** (cost ≥ 12); `password_hash` is `select: false`.
- Every conversation/message query is scoped by `user_id` from the JWT — a foreign or
  non-existent id returns **404**, never another user's data.
- Audit logs are **append-only** (never updated or deleted).
- CORS uses an explicit origin allowlist with `credentials: true` (required for the refresh
  cookie).

> **HTTPS note:** the `Secure` refresh cookie requires a secure context. `http://localhost` is
> treated as secure by browsers for local dev; any deployed environment must sit behind TLS.

---

## 📄 License

See [`LICENSE`](LICENSE).
