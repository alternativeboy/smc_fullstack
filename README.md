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
| 6 | React frontend — auth, streaming chat, SQL widget, tables/charts, sidebar, usage | ✅ |
| 7 | Polish (README, Helmet, audit sweep, fresh-clone) | ✅ |

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
- **Auto-generated conversation titles** — set from the first message, never overwritten

---

## 🧱 Tech Stack

| Layer | Technology |
|-------| -----------|
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

## 🚀 Quick Start (fresh clone → running app in ~5 minutes)

### Prerequisites

- **Node.js 20+** and **npm** (`node --version`, `npm --version`)
- **Docker Desktop** (or Docker Engine + Compose v2) — `docker --version`, `docker compose version`
- An **OpenAI API key** (needed only for live chat; the app boots and all non-LLM tests pass without it)

### Step 1 — Clone and configure

```bash
git clone <repo-url> smc_fullstack
cd smc_fullstack
cp .env.example .env
```

Open `.env` and fill in **these three values** (everything else has safe local defaults):

| Variable | What to set |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI key (`sk-…`). Use `gpt-4o-mini` for dev; `gpt-4o` for final. |
| `JWT_SECRET` | Any long random string, e.g. `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | A **different** long random string |

All other variables (`DATABASE_*`, `REDIS_*`, `LLM_READER_*`, `COOKIE_*`, `USAGE_*`) work
out-of-the-box with local Docker — **no changes needed** unless you want to customise.

> **`LLM_READER_PASSWORD`** defaults to `change_me_llm_reader` in both `.env.example` and
> `docker-compose.yml`. Leave it matching (or set both to the same value) — the Docker init script
> reads it from the same `.env`.

### Step 2 — Start Postgres + Redis

```bash
# From the repo root (where docker-compose.yml lives)
docker compose up -d
```

Docker will:
1. Pull `postgres:15-alpine` and `redis:7-alpine`
2. Mount `data/financial_data.sql` as init script `01` → creates and populates `financial_data` (**192 rows**)
3. Run `docker/postgres/02-indexes.sql` → adds 3 indexes on `(company, year)`, `sector`, `ticker`
4. Run `docker/postgres/03-llm-reader.sh` → creates the SELECT-only `llm_reader` role (Guardrail Layer 3)
5. Start Redis on port 6379

**Wait for healthy status** (~10–15 s):

```bash
docker compose ps
# Both containers should show: Status = healthy
# postgres  smc_postgres   running (healthy)
# redis     smc_redis      running (healthy)
```

**Verify Postgres** (optional sanity check):

```bash
docker exec -it smc_postgres psql -U postgres -d financial_db -c "SELECT count(*) FROM financial_data;"
#  count
# -------
#    192
```

**Verify Redis**:

```bash
docker exec -it smc_redis redis-cli ping
# PONG
```

### Step 3 — Backend

```bash
cd backend
npm ci                    # install deps (~30 s first time)
npm run migration:run     # creates: users, conversations, messages, audit_logs
npm run start:dev         # hot-reload dev server → http://localhost:3000
```

**Verify the backend is up**:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","info":{"postgres":{"status":"up"},"redis":{"status":"up"}},...}
```

Both `postgres` and `redis` must show `"status":"up"`. If either says `"down"`, re-run
`docker compose ps` to check container health.

### Step 4 — Frontend

```bash
# Open a new terminal; leave the backend running
cd frontend
npm ci                    # install deps (~30 s)
npm run dev               # Vite dev server → http://localhost:5173
```

Open **http://localhost:5173**, register an account, and start chatting.

> **How the proxy works:** Vite proxies `/api → http://localhost:3000` so every request is
> same-origin in dev. The httpOnly refresh cookie is set and sent automatically — no CORS
> configuration needed, and `COOKIE_SECURE=false` is correct for `http://localhost`.

---

## 🗄️ Postgres — connecting, inspecting, and changing data

### Connect to Postgres

```bash
# Interactive psql inside the container (easiest)
docker exec -it smc_postgres psql -U postgres -d financial_db

# Or connect from your host if you have psql installed
psql -h localhost -p 5432 -U postgres -d financial_db
# Password: postgres  (from DATABASE_PASSWORD in .env)
```

### Inspect the financial data

```sql
-- Row count
SELECT count(*) FROM financial_data;

-- Schema (columns + types)
\d financial_data

-- All distinct companies
SELECT DISTINCT company, ticker, sector FROM financial_data ORDER BY company;

-- Preview one company
SELECT * FROM financial_data WHERE company = 'Apple' ORDER BY year;

-- All years available
SELECT DISTINCT year FROM financial_data ORDER BY year;
```

### Inspect app tables (created by migrations)

```sql
\dt                         -- list all tables
\d users                    -- users schema
\d conversations            -- conversations (soft-deleted via deleted_at)
\d messages                 -- messages (is_partial, cost, tool_calls jsonb)
\d audit_logs               -- audit trail (append-only)

-- Recent audit events
SELECT action, resource, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;

-- Active conversations per user
SELECT u.email, count(c.id) AS conversations
FROM users u LEFT JOIN conversations c ON c.user_id = u.id AND c.deleted_at IS NULL
GROUP BY u.email;
```

### Change the financial data

The dataset ships as `data/financial_data.sql`. After the first `docker compose up` the volume is
populated. You can modify the data at any time **without restarting Docker**:

**Option A — replace all rows** (swap the whole dataset):

```bash
docker exec -it smc_postgres psql -U postgres -d financial_db
```

```sql
TRUNCATE financial_data;

-- Then re-insert. For a file inside the container use \i, or pipe from host:
-- Paste INSERT statements, or use \copy / COPY for CSV.
-- Example single row:
INSERT INTO financial_data (company, ticker, sector, year, revenue, net_income, operating_income, gross_profit)
VALUES ('Acme Corp', 'ACME', 'Technology', 2024, 5000000000, 800000000, 1000000000, 2000000000);
```

**Option B — add or update specific rows** (upsert — keep existing rows):

```sql
INSERT INTO financial_data (company, ticker, sector, year, revenue, net_income, operating_income, gross_profit)
VALUES ('Apple', 'AAPL', 'Technology', 2025, 420000000000, 110000000000, 130000000000, 180000000000)
ON CONFLICT (company, year) DO UPDATE SET
  revenue          = EXCLUDED.revenue,
  net_income       = EXCLUDED.net_income,
  operating_income = EXCLUDED.operating_income,
  gross_profit     = EXCLUDED.gross_profit;
```

**Option C — delete specific rows**:

```sql
DELETE FROM financial_data WHERE company = 'Apple' AND year = 2022;
```

**Option D — replace all data from a new SQL file** (same structure, different companies/rows):

If you have a new dump file (e.g. `new_financial_data.sql`) with the **same 8 columns**, you can
load it in one go without touching the Docker volume.

**D1 — file is in the repo's `data/` folder** *(easiest — run from the repo root)*:

```bash
# Drop your file into data/, then pipe it from the repo root:
# data/
# ├── financial_data.sql   ← original
# └── new_financial_data.sql   ← your new file

docker exec -i smc_postgres psql -U postgres -d financial_db \
  -c "TRUNCATE financial_data;" \
  < data/new_financial_data.sql
```

**D2 — file is anywhere on your host machine**:

```bash
docker exec -i smc_postgres psql -U postgres -d financial_db \
  -c "TRUNCATE financial_data;" \
  < /path/to/new_financial_data.sql
```

**D3 — copy the file into the container first, then load it**:

```bash
docker cp /path/to/new_financial_data.sql smc_postgres:/tmp/new_data.sql
docker exec -it smc_postgres psql -U postgres -d financial_db \
  -c "TRUNCATE financial_data;" \
  -c "\i /tmp/new_data.sql"
```

Verify the load succeeded:

```bash
docker exec -it smc_postgres psql -U postgres -d financial_db \
  -c "SELECT count(*), count(DISTINCT company) AS companies, min(year), max(year) FROM financial_data;"
#  count | companies | min  | max
# -------+-----------+------+------
#    192 |        49 | 2022 | 2025
```

> The file must contain plain SQL `INSERT` statements (the same format as `data/financial_data.sql`).
> CSV or other formats need `\copy` instead — see the Postgres docs for `\copy from`. The
> `TRUNCATE` runs first so you don't end up with a mix of old and new rows.

**After any data change, restart the backend** so the auto-generated system prompt picks up the
new companies/years (FR-023):

```bash
# Ctrl-C the backend, then:
cd backend && npm run start:dev
# Boot log will show: System-prompt coverage: N companies, M sectors, years YYYY-YYYY (T rows).
```

> **Schema must stay the same.** The 8 columns (`company`, `ticker`, `sector`, `year`, `revenue`,
> `net_income`, `operating_income`, `gross_profit`) are enforced by a startup schema guard — adding
> or renaming a column will **crash the backend on boot** with a clear error message naming the
> offending column.

### Reset Postgres completely (nuke + reload)

If the volume is corrupted or you want a clean slate:

```bash
docker compose down -v        # stops containers AND deletes volumes (pgdata + redisdata)
docker compose up -d          # re-provisions everything from scratch (init scripts re-run)
```

Then re-run migrations:

```bash
cd backend && npm run migration:run
```

---

## 🔴 Redis — inspecting and resetting

### Connect to Redis

```bash
docker exec -it smc_redis redis-cli
```

### Useful Redis commands

```bash
# Check connection
ping                      # → PONG

# List all keys (use sparingly in prod; fine for local dev)
keys *

# Usage keys (per-user spend tracking)
keys usage:*              # e.g. usage:<userId>
get usage:<userId>        # current spend in USD (string)
ttl usage:<userId>        # seconds until reset (-1 = no TTL, -2 = expired/gone)

# Refresh token keys
keys refresh:*
ttl refresh:<tokenId>

# Manually reset a user's usage (forces a fresh window immediately)
del usage:<userId>
```

### Reset all Redis state

```bash
docker exec -it smc_redis redis-cli flushall
# OK — all keys deleted (usage counters, refresh tokens)
```

> **Warning:** `flushall` logs out all users (refresh tokens gone) and resets all usage counters.
> Safe for local dev; do not run in production.

---

## 💸 Configuring Usage Limits

Per-user spending is tracked in Redis under the key `usage:<userId>`. Two variables in `.env`
control the behaviour — both take effect **immediately on the next backend restart** (no migration
needed):

| Variable | Default | What it does |
|----------|---------|--------------|
| `USAGE_LIMIT` | `1.0` | Maximum cumulative USD a single user may spend inside one reset window. The pre-flight guard returns a friendly `429` once this is reached. |
| `USAGE_RESET_INTERVAL` | `3600` | Length of the reset window in **seconds**. The Redis key TTL is set to this value the first time a user is charged in a new window; when the key expires the counter resets automatically — no cron job. |

### Common presets

```bash
# Very tight — hit the limit almost immediately (useful for testing S4)
USAGE_LIMIT=0.00001
USAGE_RESET_INTERVAL=3600      # 1 hour

# Comfortable daily budget
USAGE_LIMIT=2.0
USAGE_RESET_INTERVAL=86400     # 24 hours

# Default — $1 per hour (assignment spec)
USAGE_LIMIT=1.0
USAGE_RESET_INTERVAL=3600

# Monthly / evaluation budget
USAGE_LIMIT=10.0
USAGE_RESET_INTERVAL=2592000   # 30 days
```

### How to apply a change

1. Edit `USAGE_LIMIT` and/or `USAGE_RESET_INTERVAL` in `.env`
2. Restart the backend (`Ctrl-C` → `npm run start:dev`)
3. The new limit applies to **all future charges** immediately.

> **Already-running windows are not retroactively shortened.** If a user's Redis key already has a
> TTL, that window plays out at the old interval; the new interval takes effect the next time the
> key is created (i.e. after the current window expires or you delete the key manually).

### Verify the current limit

The `/api/usage/status` endpoint returns the live state for the authenticated user:

```bash
# Requires a valid access token (replace <TOKEN> with one from login)
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/usage/status
```

```json
{
  "currentSpend": 0.0012,
  "limit": 1.0,
  "remaining": 0.9988,
  "resetAt": "2026-07-09T12:00:00.000Z",
  "resetIntervalSeconds": 3600
}
```

The frontend polls this endpoint every 20 seconds and shows a **usage badge** in the sidebar.

### Manually reset a user's counter (without restarting)

Find the user's ID in Postgres, then delete the Redis key:

```bash
# Step 1 — get the userId
docker exec -it smc_postgres psql -U postgres -d financial_db \
  -c "SELECT id, email FROM users WHERE email = 'user@example.com';"

# Step 2 — delete the usage key (counter resets to $0 immediately)
docker exec -it smc_redis redis-cli del "usage:<userId>"
# (integer) 1  — key deleted; user may send messages again right away
```

To reset **all** users at once:

```bash
docker exec -it smc_redis redis-cli --scan --pattern "usage:*" | \
  xargs docker exec -i smc_redis redis-cli del
```

---

## 🔧 Environment Variables

All variables are in the root `.env` (copied from [`.env.example`](.env.example)).
Docker Compose and the NestJS backend both read this file.

### Backend (root `.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime mode |
| `PORT` | `3000` | Backend HTTP port |
| `DATABASE_HOST` | `localhost` | Postgres host |
| `DATABASE_PORT` | `5432` | Postgres port |
| `DATABASE_USER` | `postgres` | App DB user |
| `DATABASE_PASSWORD` | `postgres` | App DB password |
| `DATABASE_NAME` | `financial_db` | Database name |
| `DATABASE_POOL_SIZE` | `10` | TypeORM connection pool max |
| `LLM_READER_USER` | `llm_reader` | SELECT-only role name (Guardrail Layer 3) |
| `LLM_READER_PASSWORD` | `change_me_llm_reader` | Password for `llm_reader` — must match Docker init |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | *(empty)* | Redis password (empty = no auth, fine for local) |
| `OPENAI_API_KEY` | — | **Required for chat** — your `sk-…` key |
| `OPENAI_MODEL` | `gpt-4o-mini` | LLM model; use `gpt-4o` for final answers |
| `JWT_SECRET` | — | **Required** — any long random string |
| `JWT_ACCESS_EXPIRES` | `15m` | Access token lifetime |
| `JWT_REFRESH_SECRET` | — | **Required** — different from `JWT_SECRET` |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh token lifetime |
| `REFRESH_TOKEN_TTL` | `604800` | Redis TTL for refresh keys (seconds = 7 days) |
| `COOKIE_SECURE` | `false` | `false` for http localhost; `true` in production |
| `COOKIE_SAMESITE` | `strict` | SameSite attribute |
| `COOKIE_PATH` | `/api/auth/refresh` | Cookie scope path |
| `BCRYPT_COST` | `12` | bcrypt rounds (min 12) |
| `USAGE_LIMIT` | `1.0` | Per-user spend cap in USD |
| `USAGE_RESET_INTERVAL` | `3600` | Usage window in seconds (default 1 hour) |
| `THROTTLE_TTL` | `60` | Auth rate-limit window (seconds) |
| `THROTTLE_LIMIT` | `10` | Max auth requests per window |
| `CORS_ORIGIN` | `http://localhost:5173` | Frontend origin for CORS |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | *(empty)* | Leave **empty** in dev — the Vite proxy handles `/api → :3000`. Set to the backend URL only for cross-origin production builds. |

---

## 🧪 Testing

### Unit tests (no Docker needed)

```bash
cd backend
npm test
# 83 tests across 11 suites: env, auth, refresh tokens, chat, audit, SQL validator, LLM, financial, usage, messages
```

### E2E tests (Docker must be running + migrations applied)

```bash
cd backend
npm run test:e2e
# 41 tests across 9 suites: health, auth, refresh, chat, S6/audit, financial/llm_reader, usage (S4), interruption (S3/S5), messages
```

Key suites:
- **`sql-validator.service.spec.ts`** — 41-case attack matrix (injection, exfil, DDL, system tables)
- **`financial.e2e-spec.ts`** — raw `INSERT`/`UPDATE`/`DELETE` via `llm_reader` → `permission denied`
- **`interruption.e2e-spec.ts`** — real `req.destroy()` severs mid-stream → partial saved, usage charged

### Live grounding check (spends a few cents of OpenAI budget)

With the full stack running:

```bash
cd backend
npx ts-node scripts/live-grounding.ts
# Runs S1/S2 against the live endpoint: prompt → SQL → rows → streamed answer → cost
```

---

## 🎬 Trying the scenarios (S1–S6)

All in the browser at **http://localhost:5173** (logged in). Use `OPENAI_MODEL=gpt-4o` in `.env`
(and restart the backend) for the sharpest answers.

| # | What | How to try |
|---|------|------------|
| **S1** | Grounded answer, streamed | Ask **"What was Apple's net income in 2023?"** (single value, SQL widget visible). Then **"Compare the revenue of all technology companies in 2024, sorted by highest."** — answer streams, table renders, Recharts bar chart appears. |
| **S2** | Data not available, no fabrication | **"Toyota's revenue?"** → "no data for Toyota." · **"Apple's revenue in 2020?"** → "only 2022–2025." · **"Apple's EBITDA?"** → lists only the 4 available metrics. |
| **S3** | Stop mid-generation | Start a query, click **Stop** while streaming → partial message kept with "interrupted" note; partial cost is charged. |
| **S4** | Usage limit → friendly 429 | In `.env` set `USAGE_LIMIT=0.00001`, **restart the backend**, send a message → composer shows a friendly banner and disables Send. **Revert to `1.0`** and restart afterward. |
| **S5** | Refresh mid-stream | Do S3 (Stop mid-stream), then **reload the page** → conversation + partial are intact, in order, no duplicates. |
| **S6** | Delete conversation | Hover a conversation in the sidebar → trash icon → **confirm dialog** → conversation removed (active chat → empty); an audit row is written on the backend. |

---

## 🔒 Security & Known Trade-offs

- **Hybrid token storage** — access token in **memory** (not localStorage → XSS-safe; short-lived);
  refresh token in an **httpOnly, SameSite=Strict cookie** scoped to `/api/auth/refresh` with
  single-use rotation in Redis. Trade-off: page reload triggers a silent refresh (one extra request).
- **SQL guardrails are defense-in-depth** — `SqlValidatorService` (Layer 2) is a keyword/table
  regex with string-literal-aware scanning. It can't catch every trick; **Layer 3 (`llm_reader`
  SELECT-only Postgres role) is the real guarantee** — Postgres rejects any write unconditionally.
- **Abort handling** — the client's `AbortController` severs the `fetch`; the server detects it via
  `res.on('close')`, cancels the OpenAI stream, and persists a partial (`is_partial=true`). No orphaned streams.
- **Cost is billed at gpt-4o rates** (even when running `gpt-4o-mini`) — the app always applies
  `$2.50/$10 per 1M` pricing, so recorded costs overstate real mini spend ~16×. Intentional for
  conservative budget tracking.
- **Partial cost on abort is an estimate** — OpenAI usage only arrives at stream end; a mid-stream
  abort estimates produced tokens at ~4 chars/token. Prompt tokens (already sent) dominate the fair charge.
- **HTTPS** — `Secure` cookie requires a secure context. `localhost` qualifies for dev; production
  must sit behind TLS (reverse proxy). `COOKIE_SECURE` toggles this; Helmet adds `HSTS`.

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

- **Streaming** uses `fetch()` + `ReadableStream` on POST (not `EventSource`) because the stream
  carries `Authorization: Bearer`. Stop / refresh abort via `AbortController`; the server detects
  it on `res.on('close')` and saves the partial message.
- **SQL guardrails:** every LLM query passes `SqlValidatorService` (Layer 2) **and** runs as the
  SELECT-only `llm_reader` role (Layer 3). Layer 3 is the real guarantee.
- **Tokens:** short-lived access JWT kept **in memory** on the client; long-lived refresh token in
  an **httpOnly, Secure, SameSite=Strict cookie** with single-use rotation tracked in Redis.

Full diagrams & decisions: [`docs/architecture_overview.md`](docs/architecture_overview.md).

---

## 📁 Project Structure

```
smc_fullstack/
├── docker-compose.yml          # PostgreSQL + Redis + init (financial data, indexes, llm_reader)
├── docker/postgres/
│   ├── 02-indexes.sql          # financial_data indexes
│   └── 03-llm-reader.sh        # creates the SELECT-only llm_reader role
├── data/
│   └── financial_data.sql      # provided dump — 49 companies × 4 years = 192 rows
├── .env.example                # copy to .env and fill in OPENAI_API_KEY + JWT secrets
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── config/             # Joi env validation, ConfigModule
│   │   ├── health/             # GET /api/health (PG + Redis checks)
│   │   ├── auth/               # register, login, refresh, logout, JWT guards, throttler
│   │   ├── chat/               # conversation CRUD, messages/streaming, MessagesService
│   │   ├── financial/          # llm_reader DataSource + SqlValidatorService
│   │   ├── llm/                # OpenAI tool loop, PromptBuilderService, cost helper
│   │   ├── usage/              # Redis spend tracking, UsageLimitGuard
│   │   ├── common/             # AuditService, interceptors, decorators
│   │   └── redis/              # shared ioredis client module
│   ├── migrations/             # TypeORM migrations (users, conversations, messages, audit_logs)
│   ├── scripts/
│   │   └── live-grounding.ts   # smoke-test the live SSE endpoint
│   └── test/                   # e2e specs (supertest)
├── frontend/                   # React 18 + Vite + TypeScript
│   └── src/
│       ├── components/         # ChatMessage, ToolCallWidget, MarkdownRenderer, ResultChart, …
│       ├── hooks/              # useStreamChat, useUsage, useAuthBootstrap
│       ├── pages/              # ChatPage, LoginPage, RegisterPage
│       ├── services/           # api client (Bearer + silent refresh), auth.service, chat.service
│       ├── stores/             # auth.store, chat.store, usage.store (Zustand)
│       └── types/              # chat.types, auth.types
└── docs/                       # authoritative specs (source of truth for every decision)
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
