# 💬 Financial Data Chat Assistant

An AI-powered chat app where users ask natural-language questions about the income-statement
data of **49 U.S. public companies (2022–2025)**. An LLM (OpenAI GPT-4o) answers **only** from a
PostgreSQL database by generating SQL through a single `execute_sql` tool. Responses stream
token-by-token, with authentication, per-user spending limits, and persistent conversation history.

> **Grounding guarantee:** the assistant answers strictly from query results. If the data isn't
> there, it says so — it never invents numbers. Every figure is traceable to a SQL result.

---

## 🚦 Status

Built in verifiable phases (see [`PROGRESS.md`](PROGRESS.md)). **Backend + frontend feature-complete**;
all six assignment scenarios (S1–S6) verified end-to-end.

| Phase | Scope | Status |
|-------|-------|--------|
| 0–1 | Ground truth · Docker infra (PG + Redis + `llm_reader`) · NestJS scaffold | ✅ |
| 2 | Auth — register/login, JWT, refresh rotation + reuse detection, throttler | ✅ |
| 3 | Chat CRUD + user isolation (404) + append-only audit | ✅ |
| 4a / 4b | SQL guardrails (validator + `llm_reader`) · LLM streaming + tool loop | ✅ |
| 5 | Usage limits + mid-stream interruption (partial save) | ✅ |
| 6 | React frontend — auth, streaming chat, SQL widget, tables/charts, sidebar, usage | 🔍 |
| 7 | Polish (README, Helmet, audit sweep, fresh-clone) | 🔍 (fresh-clone acceptance passed) |

---

## ✨ Features

- **Natural-language → SQL** over income-statement data via a single `execute_sql` tool
- **Token-by-token streaming** (`fetch()` + `ReadableStream` over POST, SSE) with a Stop button
- **Grounded answers only** — no hallucinated figures; missing data stated clearly
- **Visible SQL** — the generated query is shown in the UI while it runs (collapsible), with row count
- **Markdown tables + charts** (Recharts) for multi-company/year comparisons
- **Auth** — register/login, short-lived access JWT (in memory), httpOnly refresh cookie with
  single-use rotation + reuse detection
- **User isolation** — every conversation/message scoped by JWT; a foreign id returns 404
- **SQL guardrails (defense in depth)** — a code validator **and** a SELECT-only `llm_reader` DB role
- **Per-user spending limits** (Redis, TTL reset) with a friendly 429; **fair partial billing** on abort
- **Append-only audit trail** for query / login / register / delete

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10 (feature modules), Passport + JWT, class-validator, @nestjs/throttler, Helmet |
| ORM | TypeORM 0.3 (migrations, parameterized queries) |
| Database | PostgreSQL 15 |
| Cache / usage / refresh tokens | Redis 7 (ioredis) |
| LLM | OpenAI GPT-4o (streaming + tool-calling), `openai` SDK |
| Frontend | React 18 + Vite + TypeScript, Tailwind + shadcn-style UI, Zustand, react-markdown, Recharts |
| Infra | Docker Compose (PostgreSQL + Redis) |
| Testing | Jest (unit) + Supertest (e2e) |

Full rationale: [`docs/tech_stack.md`](docs/tech_stack.md).

---

## 🚀 Quick Start (fresh clone → running app)

### Prerequisites
- **Node.js 20+** and **npm**
- **Docker** + **Docker Compose**
- An **OpenAI API key** (only needed for live LLM answers; the app boots without it, but chat needs it)

### 1. Configure environment
```bash
git clone <repo-url> smc_fullstack
cd smc_fullstack
cp .env.example .env
```
Edit `.env` and set these (everything else has working defaults for local Docker):

| Must set | What |
|----------|------|
| `OPENAI_API_KEY` | Your OpenAI key. Use `OPENAI_MODEL=gpt-4o-mini` for dev, `gpt-4o` for final. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Any two strong random strings. |
| `LLM_READER_PASSWORD` | Password for the SELECT-only DB role (Docker creates it; the app connects with it). |

For local http dev, keep `COOKIE_SECURE=false` and `CORS_ORIGIN=http://localhost:5173`.

### 2. Start the data layer
```bash
docker compose up -d
```
Provisions PostgreSQL (loading `data/financial_data.sql` → **192 rows**), creates the SELECT-only
`llm_reader` role + indexes, and starts Redis. Wait a few seconds for both to be `healthy`.

### 3. Backend
```bash
cd backend
npm ci
npm run migration:run     # creates users, conversations, messages, audit_logs
npm run start:dev         # http://localhost:3000
```
Verify: `curl http://localhost:3000/api/health` → `{"status":"ok", ... postgres up, redis up}`.

### 4. Frontend
```bash
cd frontend
npm ci
npm run dev               # http://localhost:5173
```
Open **http://localhost:5173**, register an account, and start chatting. (The frontend proxies
`/api` → `:3000`, so it's same-origin in dev — the refresh cookie works with no CORS fuss.)

---

## 🔧 Environment Variables

Derived from [`.env.example`](.env.example). Defaults shown work with local Docker.

### Backend (root `.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime mode |
| `PORT` | `3000` | Backend port |
| `DATABASE_HOST/PORT/USER/PASSWORD/NAME` | `localhost/5432/postgres/postgres/financial_db` | App DB connection |
| `DATABASE_POOL_SIZE` | `10` | TypeORM pg pool max |
| `LLM_READER_USER` / `LLM_READER_PASSWORD` | `llm_reader` / — | **SELECT-only** role that runs LLM SQL (Guardrail Layer 3) |
| `REDIS_HOST/PORT/PASSWORD` | `localhost/6379/` | Redis (usage + refresh tokens) |
| `OPENAI_API_KEY` | — | OpenAI key (required for chat) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model (`gpt-4o` for final grounding) |
| `JWT_SECRET` / `JWT_ACCESS_EXPIRES` | — / `15m` | Access-token secret + lifetime |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES` | — / `7d` | Refresh-token secret + lifetime |
| `REFRESH_TOKEN_TTL` | `604800` | Refresh-token Redis TTL (seconds) |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` / `COOKIE_PATH` | `false` / `strict` / `/api/auth/refresh` | Refresh-cookie attributes |
| `BCRYPT_COST` | `12` | bcrypt cost (min 12) |
| `USAGE_LIMIT` | `1.0` | Per-user spend cap (USD) |
| `USAGE_RESET_INTERVAL` | `3600` | Usage reset window (seconds; TTL-based, no cron) |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | `60` / `10` | Auth rate-limit window / max requests |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | *(empty)* | Leave empty in dev → relative `/api` via the Vite proxy (same-origin). Set to the backend URL only for a cross-origin prod build. |

---

## 🧪 Testing

```bash
cd backend
npm test              # unit (79): env, auth, refresh rotation, chat, audit, SQL validator, financial, usage, messages
npm run test:e2e      # e2e (needs docker): health, auth ×2, chat, S6/audit, financial/llm_reader, usage (S4), interruption (S3/S5), messages
```

**Live grounding check** (real OpenAI — spends a few cents). With the stack up + server running:
```bash
cd backend
npx ts-node scripts/live-grounding.ts     # runs S1/S2 scenarios, prints prompt → SQL → rows → answer → cost
```
Highest-value tests: the **SQL validator** attack matrix (`sql-validator.service.spec.ts`) and the
**`llm_reader` Layer-3** integration (`financial.e2e-spec.ts` — raw writes → `permission denied`).

---

## 🏗️ Architecture

```
React (Vite, :5173) ──/api proxy──▶ NestJS API (:3000)
                                        │
   ┌──────────┬──────────┬─────────────┼───────────┬──────────┐
 AuthModule ChatModule FinancialModule LlmModule UsageModule HealthModule
   │            │           │             │          │
 PG + Redis   PG (scoped)  PG via llm_reader   OpenAI    Redis
                           (SELECT-only)      GPT-4o
```

- **Streaming** uses `fetch()` + `ReadableStream` on POST (not `EventSource`) because the stream is a
  POST carrying `Authorization: Bearer`. Stop / refresh abort via `AbortController`; the server sees
  it on `res.on('close')` and saves the partial.
- **SQL guardrails:** every LLM query passes `SqlValidatorService` (Layer 2) **and** runs as the
  SELECT-only `llm_reader` role (Layer 3). Layer 3 is the real guarantee.
- **Tokens:** short-lived access JWT kept **in memory** on the client; long-lived refresh token in an
  **httpOnly, Secure, SameSite=Strict cookie** with single-use rotation tracked in Redis.

Full diagrams & decisions: [`docs/architecture_overview.md`](docs/architecture_overview.md).

---

## 🎬 Trying the scenarios (S1–S6)

All in the browser at http://localhost:5173 (logged in). Use `OPENAI_MODEL=gpt-4o` for the sharpest answers.

| # | What | How to try |
|---|------|-----------|
| **S1** | Grounded answer, streamed | Ask **"What was Apple's net income in 2023?"** (single value) and **"Compare the revenue of all technology companies in 2024, sorted by highest revenue."** (table + chart). The SQL widget shows the query; the answer streams token-by-token. |
| **S2** | Data not available, no fabrication | **"What was Toyota's revenue?"** → "I don't have data for Toyota." · **"Apple's revenue in 2020?"** → "only 2022–2025." · **"Apple's EBITDA?"** → lists the 4 available metrics. |
| **S3** | Stop mid-generation | Send a query, click **Stop** while it streams → the partial is kept with an "interrupted" note; the partial cost is charged. |
| **S4** | Usage limit → friendly 429 | Set `USAGE_LIMIT=0.00001` in `.env`, **restart the backend**, send a message → the composer shows a friendly limit banner and disables Send. **Revert to `1.0` and restart** afterward. |
| **S5** | Refresh mid-stream | Stop mid-stream (S3), then **reload the page** → the conversation + partial are intact, in order, no duplicates. |
| **S6** | Delete conversation | Hover a conversation in the sidebar → trash → **confirm dialog** → it's removed (active → empty chat); an audit row is written on the backend. |

---

## 🔒 Security & Known Trade-offs

- **Hybrid token storage** — access token **in memory** (not localStorage → XSS can't read it; it's
  short-lived), refresh token in an **httpOnly** cookie (JS can't read it) scoped to
  `/api/auth/refresh` with `SameSite=Strict` + single-use rotation. Trade-off: a page reload loses the
  in-memory token and does a silent refresh on mount (one extra request).
- **Layer-2 validator is a detective control, not the guarantee** — it's a keyword/table regex (with
  string-literal-aware scanning to avoid false positives). It can't catch every trick; **Layer 3 (the
  `llm_reader` SELECT-only role) is the real guarantee** — Postgres rejects any write regardless.
- **Abort-on-refresh** — the client aborts the fetch; the server detects it via `res.on('close')`,
  cancels the OpenAI stream, and persists a partial (`is_partial=true`). No orphaned streams.
- **Cost is billed at gpt-4o pricing** ($2.50/$10 per 1M) even when running gpt-4o-mini for dev — so
  the recorded cost is conservative (overstates real mini spend ~16×). Simplifies budget tracking.
- **Partial cost on abort is an estimate** — OpenAI's usage only arrives at a stream's end, so a
  mid-stream abort estimates produced tokens at ~4 chars/token; the (already-sent) prompt dominates
  the fair charge.
- **HTTPS** — the `Secure` refresh cookie needs a secure context. `localhost` is treated as secure for
  dev; a real deployment must sit behind TLS (reverse proxy). `COOKIE_SECURE` toggles this; Helmet
  adds HSTS.

---

## 📁 Project Structure

```
smc_fullstack/
├── docker-compose.yml          # PostgreSQL + Redis + init (llm_reader, indexes)
├── docker/postgres/            # init SQL + llm_reader role script
├── .env.example                # backend env template
├── backend/                    # NestJS API
│   ├── src/{config,health,redis,common,auth,chat,financial,llm,usage}/
│   ├── migrations/             # TypeORM migrations
│   ├── scripts/live-grounding.ts
│   └── test/                   # e2e specs
├── frontend/                   # React + Vite
│   └── src/{components,pages,hooks,services,stores,types}/
├── data/financial_data.sql     # provided dump (49 companies × 2022–2025 = 192 rows)
└── docs/                       # authoritative specs (source of truth)
```

---

## 📚 Documentation

| Document | Contents |
|----------|----------|
| [`functional_requirements.md`](docs/functional_requirements.md) · [`non_functional_requirements.md`](docs/non_functional_requirements.md) | FR / NFR |
| [`compliance_requirements.md`](docs/compliance_requirements.md) · [`identified_gaps.md`](docs/identified_gaps.md) | CR / GAP |
| [`architecture_overview.md`](docs/architecture_overview.md) · [`erd.md`](docs/erd.md) | Diagrams · data model |
| [`openapi_spec.yaml`](docs/openapi_spec.yaml) | API contract (binding) |
| [`prompt_spec.md`](docs/prompt_spec.md) | System prompt, tool def, 5-layer guardrails, scenarios S1–S6 |

Conventions & locked decisions: [`CLAUDE.md`](CLAUDE.md). Live status: [`PROGRESS.md`](PROGRESS.md).

---

## 📄 License

See [`LICENSE`](LICENSE).
